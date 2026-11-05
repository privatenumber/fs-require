# Module wrapper arguments

fs-require runs a virtual module the same way Node.js runs a CommonJS module: it wraps the source with `Module.wrap()` and calls the wrapper with `exports`, `require`, `module`, `__filename`, and `__dirname`. These arguments match Node.js:

| Argument | Value |
| --- | --- |
| `__filename` | The module's full path in the virtual file-system, such as `/some/directory/file.js` |
| `__dirname` | `path.dirname()` of that path |
| `module.filename` | The same full path as `__filename` |

- Implementation: `runModule()` in [`src/index.ts`](../../src/index.ts).
- Contract: the "__dirname, __filename" test in [`tests/specs/fs-require.ts`](../../tests/specs/fs-require.ts), and the "require() entry point" test in [`tests/specs/package.ts`](../../tests/specs/package.ts) for a real file-system.

Last verified 2026-11-05 against Node.js v26.13.0.

## Node.js behavior

- Node.js documents `__filename` as "the current module file's absolute path with symlinks resolved" ([`modules.md` L808-L822 at v26.13.0](https://github.com/nodejs/node/blob/v26.13.0/doc/api/modules.md#L808-L822)).
- `Module.prototype._compile` passes the full `filename` and `path.dirname(filename)` to the wrapper ([`loader.js` L1954-L1968 at v26.13.0](https://github.com/nodejs/node/blob/v26.13.0/lib/internal/modules/cjs/loader.js#L1954-L1968)):

  ```text
  result = FunctionPrototypeCall(compiledWrapper, thisValue, exports, require, module, filename, dirname);
  ```

fs-require passes the path it resolved in the virtual file-system. It doesn't resolve symlinks, because the `FileSystemLike` interface has no `realpathSync`.

## History: basename before v2

From the first commit (`feat: init`) through v1.x, fs-require passed `path.basename(filename)` as `__filename`, and the original test asserted `filename: 'index.js'`. No commit, issue, or comment gives a reason. The basename disagreed with Node.js and with fs-require's own `module.filename`, and broke code that uses `__filename` as a path. For example, `fs.readFileSync(__filename)` inside a virtual module read `index.js` relative to `process.cwd()`.

Passing the full path changes a released behavior, so it ships as a major version.
