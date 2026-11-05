# Bare specifier resolution

A bare specifier such as `require('lodash')` inside a virtual module resolves from the file that called `createFsRequire()`, through `createRequire(callerFilename)`. That is the same base that [caller-relative-resolution.md](./caller-relative-resolution.md) uses for relative paths. When the caller has no file, such as `node -e`, it resolves from fs-require's own location. The `fs` shim (`require('fs')` and `require('fs/promises')`) is handled before this step. `fsRequire.resolve()` returns a bare specifier unchanged; see [`fsRequire.resolve()`](#fsrequireresolve).

- Implementation: `createCallerRequire()` in [`src/resolve-bare-specifier.ts`](../../src/resolve-bare-specifier.ts), created once per `createFsRequire()` call in [`src/index.ts`](../../src/index.ts).
- Contract: the "bare specifiers resolve from the caller" test in [`tests/specs/package.ts`](../../tests/specs/package.ts), for CommonJS and ESM callers, on the current Node.js version and on Node.js 12.22.12 in CI. The "resolve package" tests in [`tests/specs/resolve.ts`](../../tests/specs/resolve.ts) cover `fsRequire.resolve()`.
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

## `fsRequire.resolve()`

For a bare specifier, `fsRequire.resolve()` returns the specifier unchanged and doesn't check that it resolves. This has been the behavior since `resolve()` was added in v1.4.0.

Decided 2026-11-06, verified on Node.js v26.13.0 (macOS arm64). Contract: the "resolve package" tests in [`tests/specs/resolve.ts`](../../tests/specs/resolve.ts).

### Why not return the resolved path, like Node.js

Node.js documents `require.resolve()` as using "the internal `require()` machinery to look up the location of a module, but rather than loading the module, just return the resolved filename" ([`modules.md` L996-L1019 at v26.13.0](https://github.com/nodejs/node/blob/v26.13.0/doc/api/modules.md#L996-L1019)). So the returned value is an ID that `require()` loads as the same module. fs-require keeps that invariant for bare specifiers: `fsRequire(fsRequire.resolve(x))` loads what `fsRequire(x)` loads.

fs-require has two namespaces: a request that starts with `/` or `.` names a file in the virtual file-system, and any other request, a bare specifier, is loaded by Node.js, except the `fs` specifiers that the shim provides. The resolved path of a real package is an absolute path, so `fsRequire()` reads it from the virtual file-system. Observed with a build that returned the resolved path:

- With memfs, the file doesn't exist there:

  ```text
  resolve: <repo>/node_modules/.pnpm/memfs@4.80.0/node_modules/memfs/lib/index.js
  round trip failed: Cannot find module '<repo>/node_modules/.pnpm/memfs@4.80.0/node_modules/memfs/lib/index.js'
  ```

- With the real `fs`, the file exists, so fs-require ran the package's entry file as a virtual module. Its own `require('@jsonjoy.com/fs-node')` then resolved from the caller instead of from memfs, and failed with `Cannot find module '@jsonjoy.com/fs-node'`. When it doesn't fail, it creates a second instance of the package outside Node.js's module cache.

A union file-system that includes the real disk, as [anansi's `createHybridRequire()`](https://github.com/ntucker/anansi/blob/136bcb5a2a3a895931200f16eeccd7c3b071b11b/packages/core/src/scripts/createHybridRequire.ts) passes to fs-require, has the second behavior.

### Why not check that the package resolves

Node.js throws `MODULE_NOT_FOUND` from `require.resolve()` for a missing module, so checking with `callerRequire.resolve()` would match it more closely. It was implemented and rejected:

- **It breaks a known consumer.** anansi wraps fs-require with a `require` that falls back to the project's `node_modules`, and forwards `fsRequire.resolve` as its own `resolve`. Its test expects `hybridRequire.resolve('some-module')` not to throw for a package that doesn't exist ([`hybridRequire.test.ts` L172-L193](https://github.com/ntucker/anansi/blob/136bcb5a2a3a895931200f16eeccd7c3b071b11b/packages/core/src/scripts/__tests__/hybridRequire.test.ts#L172-L193)). A check from the caller would throw for packages that the wrapper can load.
- **It added edge cases.** The `fs` shim must skip Node.js resolution, because Node.js 12.22 can't resolve `node:fs` or `fs/promises` (added in v14.18.0 and v14.0.0). Telling `fs/promises` apart without reading the shim's `promises` property, which can be a lazy getter or `null`, needed more code than the check was worth.

Re-evaluate if a consumer needs `resolve()` to detect missing packages.
