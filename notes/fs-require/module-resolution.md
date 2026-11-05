# File and directory resolution

For a relative or absolute file request, fs-require tries a file before a directory. It resolves relative requests from the parent file's directory when a parent is available. The implementation is in [`src/resolve-module.ts`](../../src/resolve-module.ts); the observable cases are in [`tests/specs/resolve.ts`](../../tests/specs/resolve.ts).

The resolver follows the file and directory parts of the [Node.js v26.13.0 CommonJS algorithm](https://github.com/nodejs/node/blob/v26.13.0/doc/api/modules.md#L368-L400), with the limitations below:

1. Try the exact path, then the path with `.js` and `.json` appended, in that order. A candidate must exist and not be a directory.
2. If the path is a directory, parse its `package.json` if that is a file. For a non-empty string `main`, try the main path as a file, then its exact `index.js` and `index.json` files. Other `main` values are ignored.
3. If there is no matching main, try the original directory's exact `index.js` and `index.json` files. Node.js documents the fallback after an unresolved main as deprecated. An invalid `package.json` parse error propagates.

Index names are exact: `index.js.json` is not an index. Bare requests continue to use the behavior documented in [bare-specifier-resolution.md](./bare-specifier-resolution.md). Requests beginning with `.` or `/`, and platform-absolute requests detected by `path.isAbsolute()`, use the supplied file-system. Windows absolute-path classification is not covered by CI.

## Scope and limitations

- The resolver does not try native `.node` addons or detect ESM. fs-require runs non-JSON files as CommonJS.
- It does not apply `package.json` `exports` to relative paths.
- File checks use `lstatSync`, not `statSync`; symlinks are not followed for file classification. Full Node.js symlink resolution is not supported.
- A `package.json` containing JSON `null` throws a `TypeError`, while Node.js throws `ERR_INVALID_PACKAGE_CONFIG` for the same input.

## Real-disk comparison

On Node.js v26.13.0, macOS arm64, each scenario below was created in a separate real directory. Both Node.js `require.resolve(absolutePath)` and `createFsRequire(require('fs')).resolve(absolutePath)` resolved each request. Successful results were normalized with `fs.realpathSync` and shown relative to the scenario directory. Both implementations produced the same result except for the `null` package configuration error.

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
| `pkg/package.json` with `null`, `pkg/index.js`; resolve `pkg` | `ERR_INVALID_PACKAGE_CONFIG` | `TypeError` |
| `pkg/package.json` with `{"main":null}`, `pkg/index.js`; resolve `pkg` | `pkg/index.js` | `pkg/index.js` |

## Observed behavior before and after the fix

The following memfs cases were run on Node.js v26.13.0 on macOS. Before the fix, the new tests failed with the shown results; after the fix, they passed. Each request is `fsRequire.resolve('/a')`.

| memfs input | Before | After |
| --- | --- | --- |
| `/a.js` and `/a/index.js` files | `/a/index.js` | `/a.js` |
| `/a.js/child` and `/a.json` files | `/a.js` (a directory) | `/a.json` |
| `/a/package.json` containing `{"main":"entry.js"}` and `/a/entry.js` | `MODULE_NOT_FOUND` | `/a/entry.js` |

When `/a.js/child` is the only file, the old resolver returned `/a.js`; the fixed resolver throws `MODULE_NOT_FOUND`. The regression test for that case confirms resolution, not the earlier loading error.
