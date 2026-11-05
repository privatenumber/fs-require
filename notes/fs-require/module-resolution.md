# File and directory resolution

For a relative or absolute file request, fs-require tries a file before a directory. It resolves relative requests from the parent file's directory when a parent is available. Absolute requests are normalized with `path.resolve()`, as Node.js does, so an alias such as `/sub/../a` resolves to `/a.js` and shares its cache entry. On Windows, this also unifies `/` and `\\` separators. A request ending in `/`, `/.`, or `/..` names a directory and skips the file step, matching Node.js's check before normalization ([`loader.js` L799-L810](https://github.com/nodejs/node/blob/v26.13.0/lib/internal/modules/cjs/loader.js#L799-L810)). A `package.json` may start with a UTF-8 byte order mark, and one that isn't a JSON object throws `ERR_INVALID_PACKAGE_CONFIG` ([`node_modules.cc` L128-L130](https://github.com/nodejs/node/blob/v26.13.0/src/node_modules.cc#L128-L130)). Before this, `require('/sub/../a.js')` and `require('/a.js')` created two instances of the same file. The implementation is in [`src/resolve-module.ts`](../../src/resolve-module.ts); the observable cases are in [`tests/specs/resolve.ts`](../../tests/specs/resolve.ts).

The resolver follows the file and directory parts of the [Node.js v26.13.0 CommonJS algorithm](https://github.com/nodejs/node/blob/v26.13.0/doc/api/modules.md#L368-L400), with the limitations below:

1. Try the exact path, then the path with `.js` and `.json` appended, in that order. A candidate must exist and not be a directory.
2. If the path is a directory, parse its `package.json` if that is a file. For a non-empty string `main`, try the main path as a file, then its exact `index.js` and `index.json` files. Other `main` values are ignored.
3. If there is no matching main, try the original directory's exact `index.js` and `index.json` files. Node.js documents the fallback after an unresolved main as deprecated. Malformed JSON in `package.json` throws `ERR_INVALID_PACKAGE_CONFIG`, with the `SyntaxError` as its `cause`.

Index names are exact: `index.js.json` is not an index. Bare requests continue to use the behavior documented in [bare-specifier-resolution.md](./bare-specifier-resolution.md). Requests beginning with `.` or `/`, and platform-absolute requests detected by `path.isAbsolute()`, use the supplied file-system. Windows absolute-path classification is not covered by CI.

## Scope and limitations

- Resolution isn't cached: every `fsRequire()` call resolves its request again, including reading `package.json`. Node.js caches resolutions per request. fs-require re-resolves so that a test can change the virtual file-system, delete the entry from `fsRequire.cache`, and require again. As a result, a `package.json` that becomes malformed after its module is cached makes the next `fsRequire()` of that directory throw.
- Only `main` is read from `package.json`. Node.js v26 also rejects invalid `name` and `type` values ([`node_modules.cc` L148-L156](https://github.com/nodejs/node/blob/v26.13.0/src/node_modules.cc#L148-L156)); fs-require doesn't use those fields, so it doesn't validate them.
- Without a caller file, the entry, the modules it loads, and a relative package's `main` keep relative filenames, joined with `path.join()`, so the file-system resolves them from its own working directory and each file has one cache key.

- The resolver does not try native `.node` addons or detect ESM. fs-require runs non-JSON files as CommonJS.
- It does not apply `package.json` `exports` to relative paths.
- File checks use `lstatSync`, not `statSync`; symlinks are not followed for file classification. Full Node.js symlink resolution is not supported.
- A non-string `main`, such as `5`, is ignored, as in Node.js v26. Node.js 12.22 throws for it instead. fs-require keeps the v26 behavior on every supported runtime.

## Real-disk comparison

On Node.js v26.13.0, macOS arm64, each scenario below was created in a separate real directory. Both Node.js `require.resolve(absolutePath)` and `createFsRequire(require('fs')).resolve(absolutePath)` resolved each request. Successful results were normalized with `fs.realpathSync` and shown relative to the scenario directory. Both implementations produced the same result in every scenario.

| Files and request | Node.js | fs-require |
| --- | --- | --- |
| `a.js`, `a/index.js`; resolve `a` | `a.js` | `a.js` |
| `a.js/child`, `a.json`; resolve `a` | `a.json` | `a.json` |
| `a.js/child`; resolve `a` | `MODULE_NOT_FOUND` | `MODULE_NOT_FOUND` |
| `pkg/package.json` with `{"main":"lib/entry.js"}`, `pkg/lib/entry.js`; resolve `pkg` | `pkg/lib/entry.js` | `pkg/lib/entry.js` |
| `pkg/package.json` with `{"main":"lib/entry"}`, `pkg/lib/entry.js`; resolve `pkg` | `pkg/lib/entry.js` | `pkg/lib/entry.js` |
| `pkg/package.json` with `{"main":"sub"}`, `pkg/sub/index.js`; resolve `pkg` | `pkg/sub/index.js` | `pkg/sub/index.js` |
| `pkg/package.json` with `{"main":""}`, `pkg/index.js`; resolve `pkg` | `pkg/index.js` | `pkg/index.js` |
| `pkg/package.json` with `{"main":"missing.js"}`, `pkg/index.js`; resolve `pkg` | `pkg/index.js` | `pkg/index.js` |
| `pkg/package.json` with `{"main":"missing.js"}`; resolve `pkg` | `MODULE_NOT_FOUND` | `MODULE_NOT_FOUND` |
| `dir/index.js.json`; resolve `dir` | `MODULE_NOT_FOUND` | `MODULE_NOT_FOUND` |
| `pkg/package.json` with `{"main":5}`, `pkg/index.js`; resolve `pkg` | `pkg/index.js` | `pkg/index.js` |
| `pkg/package.json` with `null`, `pkg/index.js`; resolve `pkg` | `ERR_INVALID_PACKAGE_CONFIG` | `ERR_INVALID_PACKAGE_CONFIG` |
| `pkg/package.json` with `[]` or `5`, `pkg/index.js`; resolve `pkg` | `ERR_INVALID_PACKAGE_CONFIG` | `ERR_INVALID_PACKAGE_CONFIG` |
| `pkg/package.json` with malformed JSON (`{`), `pkg/index.js`; resolve `pkg` | `ERR_INVALID_PACKAGE_CONFIG` | `ERR_INVALID_PACKAGE_CONFIG` |
| `pkg/package.json` with a UTF-8 byte order mark before `{"main":"entry.js"}`, `pkg/entry.js`; resolve `pkg` | `pkg/entry.js` | `pkg/entry.js` |
| `a.js` and `a/index.js`; resolve `a/` and `a/.` | `a/index.js` | `a/index.js` |
| `pkg/package.json` with `{"main":null}`, `pkg/index.js`; resolve `pkg` | `pkg/index.js` | `pkg/index.js` |

## Observed behavior before and after the fix

The following memfs cases were run on Node.js v26.13.0 on macOS. Before the fix, the new tests failed with the shown results; after the fix, they passed. Each request is `fsRequire.resolve('/a')`.

| memfs input | Before | After |
| --- | --- | --- |
| `/a.js` and `/a/index.js` files | `/a/index.js` | `/a.js` |
| `/a.js/child` and `/a.json` files | `/a.js` (a directory) | `/a.json` |
| `/a/package.json` containing `{"main":"entry.js"}` and `/a/entry.js` | `MODULE_NOT_FOUND` | `/a/entry.js` |

When `/a.js/child` is the only file, the old resolver returned `/a.js`; the fixed resolver throws `MODULE_NOT_FOUND`. The regression test for that case confirms resolution, not the earlier loading error.
