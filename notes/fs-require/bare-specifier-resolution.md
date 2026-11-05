# Bare specifier resolution

A bare specifier such as `require('lodash')` inside a virtual module resolves from the file that called `createFsRequire()`, through `createRequire(callerFilename)`. That is the same base that [caller-relative-resolution.md](./caller-relative-resolution.md) uses for relative paths. When the caller has no file, such as `node -e`, it resolves from fs-require's own location. The `fs` shim (`require('fs')` and `require('fs/promises')`) is handled before this step.

- Implementation: `createCallerRequire()` in [`src/resolve-bare-specifier.ts`](../../src/resolve-bare-specifier.ts), created once per `createFsRequire()` call in [`src/index.ts`](../../src/index.ts).
- Contract: the "bare specifiers resolve from the caller" test in [`tests/specs/package.ts`](../../tests/specs/package.ts), for CommonJS and ESM callers, on the current Node.js version and on Node.js 12.22.12 in CI.
- [`module.createRequire()`](https://github.com/nodejs/node/blob/v26.13.0/doc/api/module.md#L54-L72) was added in Node.js v12.2.0, below the 12.22 floor.

Last verified 2026-11-05 on Node.js v26.13.0 (macOS arm64).

## Why not fs-require's own location

fs-require used its own `require` up to v1.6.0, which resolves from the directory fs-require is installed in. Node.js resolves bare specifiers by walking up the `node_modules` directories of the resolving file's real path, so a project's dependencies are only visible when fs-require's real path is inside that project.

That fails when fs-require's real path is elsewhere: a symlinked install, as with `npm link`, `pnpm link`, or a `file:` dependency, and likely pnpm with hoisting disabled or Yarn Plug'n'Play (not tested). Reproduction on `develop` before this change (the bare specifier code was unchanged since v1.6.0), with fs-require linked into a project, Node.js v26.13.0:

```text
node_modules/fs-require   symlink to the fs-require checkout
node_modules/dep/index.js module.exports = 'dep'
virtual.js                module.exports = require('dep')
index.cjs                 console.log(require('dep'))
                          createFsRequire(require('fs'))('./virtual')
```

```text
$ node index.cjs
caller require: dep
virtual require failed: Cannot find module 'dep' MODULE_NOT_FOUND
```

The caller could load `dep`, but the virtual module couldn't.

## Alternatives considered

- **The virtual module's own path**, `createRequire(module.filename)`. This is exactly what Node.js does, and it is equivalent to the caller when the virtual files are on the real disk. Rejected because virtual paths usually aren't on disk: with memfs, `/index.js` would resolve from `/node_modules`, so `require('lodash')` would stop working in the main use case.
- **`process.cwd()`.** Rejected because it depends on where the process was started, not on the code that created the `fsRequire`.

## Known limitation

When virtual files are on the real disk and come from another project than the caller, their dependencies resolve from the caller's project, not their own.
