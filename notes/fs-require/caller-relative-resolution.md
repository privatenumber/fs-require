# Caller-relative resolution

Relative paths passed to the function that `createFsRequire()` returns resolve from the directory of the file that called `createFsRequire()`. fs-require finds that file by reading the call stack with the V8 stack trace API. It does not use `module.parent`.

- Implementation: [`src/utils/get-caller-filename.ts`](../../src/utils/get-caller-filename.ts), used at the end of `createFsRequire()` in [`src/index.ts`](../../src/index.ts).
- Contract: the "Relative paths resolve from the caller" tests in [`tests/specs/fs-require.ts`](../../tests/specs/fs-require.ts), with fixtures in [`tests/fixtures/caller-relative/`](../../tests/fixtures/caller-relative/).
- Relative requires inside virtual modules are unaffected. They resolve from the requiring virtual module's `filename`.

Last verified 2026-11-05 on Node.js v26.13.0 (macOS arm64). CI also runs the suite on Node.js 12.22.12, the build target.

## Why not `module.parent`

fs-require used `module.parent` up to v1.6.0. That broke in two ways ([#10](https://github.com/privatenumber/fs-require/issues/10)):

1. **It is the first importer, not the caller.** Node.js stores the parent once, when it constructs the `Module` ([`loader.js` L382-L388 at v26.13.0](https://github.com/nodejs/node/blob/v26.13.0/lib/internal/modules/cjs/loader.js#L382-L388)). A later `require()` of the cached module only calls `updateChildren()` ([L1357](https://github.com/nodejs/node/blob/v26.13.0/lib/internal/modules/cjs/loader.js#L1357), [L1398](https://github.com/nodejs/node/blob/v26.13.0/lib/internal/modules/cjs/loader.js#L1398)) and does not change `parent`. So when `a/index.js` loads fs-require first, `b/index.js` gets relative paths resolved from `a/`.
2. **It is missing when the caller is ESM.** The docs say `module.parent` is `undefined` "if the module was loaded by something that is not a CommonJS module (E.G.: REPL or `import`)" ([`modules.md` L1206-L1222 at v26.13.0](https://github.com/nodejs/node/blob/v26.13.0/doc/api/modules.md#L1206-L1222)). In the ESM build, `module` itself is undefined. In both cases, relative paths fell through to the file-system unchanged and resolved from `process.cwd()`.

`module.parent` is also deprecated as [DEP0144](https://github.com/nodejs/node/blob/v26.13.0/doc/api/deprecations.md#L3249-L3265) "because it does not work consistently in the presence of ECMAScript modules and because it gives an inaccurate representation of the CommonJS module graph."

Reproduction (before the fix, fs-require v1.6.0, Node.js v26.13.0):

```text
a/index.js   require('fs-require')
b/index.js   console.log(require('fs-require').createFsRequire(require('fs'))('./file'))
b/file.js    module.exports = 'b/file'
main.js      require('./a'); require('./b')
c/index.mjs  import fs from 'fs'; import { createFsRequire } from 'fs-require'; console.log(createFsRequire(fs)('./file'))
c/file.js    module.exports = 'c/file'
```

```text
$ node b/index.js      -> b/file
$ node main.js         -> Error: Cannot find module './file'
$ node c/index.mjs     -> Error: Cannot find module './file'   (cwd is the parent of c/)
$ cd c && node index.mjs -> c/file
```

## How the caller is found

`getCallerFilename()` temporarily replaces `Error.prepareStackTrace` so the stack is an array of V8 `CallSite` objects, and calls `Error.captureStackTrace(holder, createFsRequire)`. Node.js documents that frames "above `constructorOpt`, including `constructorOpt`" are omitted ([`errors.md` L180-L201 at v26.13.0](https://github.com/nodejs/node/blob/v26.13.0/doc/api/errors.md#L180-L201)), so the first frame is the direct caller. The `CallSite` API is described in the [V8 stack trace API docs](https://v8.dev/docs/stack-trace-api).

- `Error.stackTraceLimit` is set to `1` during the capture. This only needs one frame, and it also works when the user set the limit to `0`.
- Both globals are restored in a `finally` block. The `stack` getter calls `prepareStackTrace`, so the code reads `stack` before restoring it. A user's `prepareStackTrace`, such as source-map-support's, is never called.
- `createFsRequire` is passed by reference, so minification does not affect the frame lookup.

Observed `CallSite.getFileName()` values for the direct caller (Node.js v26.13.0):

| Caller | `getFileName()` | Result |
| --- | --- | --- |
| CommonJS file | `/abs/path/a.cjs` | Used as is |
| ESM file | `file:///abs/path/b.mjs` | Converted with `fileURLToPath()` |
| `node -e` | `[eval]` | Not absolute, so no caller file |
| `node --input-type=module -e` | `file:///<cwd>/[eval1]` | Converts to a path in the cwd, so the result is the same as the fallback |
| `vm` script, such as a virtual module | its `filename` option, such as `fs-require://1/x.js` | Not absolute, so no caller file |
| `Error.stackTraceLimit = 0` set by the user | `[eval]` (frame still captured) | The temporary limit of `1` applies |

Without a caller file, relative paths go to the file-system unchanged. Node.js `fs` and memfs then resolve them from `process.cwd()`.

## Alternatives considered

- **`util.getCallSites()`.** This is the same information through a public API. It was added in Node.js v22.9.0 and is "Stability: 1.1 - Active development" ([`util.md` L788-L810 at v26.13.0](https://github.com/nodejs/node/blob/v26.13.0/doc/api/util.md#L788-L810)). Rejected because the build targets Node.js 12.22.12. Re-evaluate when the minimum supported Node.js version has a stable `util.getCallSites()`.
- **Require an explicit base path**, like [`module.createRequire(filename)`](https://github.com/nodejs/node/blob/v26.13.0/doc/api/module.md#L54). This removes the stack lookup, but every caller would have to pass `__filename` or `import.meta.url`, which is a breaking change. It could be added later as an option that overrides the inferred caller.
- **Remove fs-require from `require.cache` so every importer gets a fresh `module.parent`.** Rejected without an experiment: it does nothing for ESM callers, and it would reset the module-level `idCounter` that makes `fs-require://<id>/` stack trace names unique.

## Known limitation

The caller is the frame that directly calls `createFsRequire()`. If a project wraps `createFsRequire()` in its own helper, relative paths resolve from the helper's file, not from the helper's caller.
