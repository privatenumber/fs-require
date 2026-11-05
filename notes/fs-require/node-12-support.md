# Node.js 12.22 support

The published build supports Node.js 12.22 and newer, as `package.json#engines` declares. `pkgroll --target=node12.22.12` in `package.json#scripts.build` builds for that floor, and the test suite runs the built package on Node.js 12.22.12 and every later LTS major in CI. Development and the rest of the toolchain use the version in `package.json#devEngines.runtime`.

Last verified 2026-11-05 with pkgroll 2.29.0 (esbuild 0.28.2) on Node.js v26.13.0.

## What the build target does and doesn't cover

esbuild lowers syntax, such as optional chaining, to the target. It does not change two things that also break old Node.js versions, so `src/` must avoid them itself:

- **`node:` specifiers.** `require('node:*')` was added in Node.js v16.0.0 and v14.18.0 ([`modules.md` L512-L523 at v26.13.0](https://github.com/nodejs/node/blob/v26.13.0/doc/api/modules.md#L512-L523)). esbuild keeps the prefix. With `import path from 'node:path'` in a source file, the build contained `require("node:path")` in `dist/index.cjs` and `from"node:path"` in `dist/index.mjs`. So `src/` imports built-ins without the prefix, and [`eslint.config.ts`](../../eslint.config.ts) turns off `n/prefer-node-protocol` for `src/`.
- **Built-in methods.** esbuild doesn't polyfill methods such as `String#replaceAll()` (Node.js v15.0.0), so `eslint.config.ts` also turns off `unicorn/prefer-string-replace-all` for `src/`. Other methods newer than the floor are caught by the Node.js 12.22.12 tests, not by lint.

The ESM build imports `createRequire` from `node:module`, which pkgroll injects so `require` works in `dist/index.mjs`. That is supported: `node:` URLs in `import` were added in Node.js v14.13.1 and v12.20.0 ([`esm.md` L243-L260 at v26.13.0](https://github.com/nodejs/node/blob/v26.13.0/doc/api/esm.md#L243-L260)).

## How the floor is tested

[`tests/specs/package.ts`](../../tests/specs/package.ts) creates projects with [fs-fixture](https://github.com/privatenumber/fs-fixture) that link `node_modules/fs-require` to the repository. Each project loads the package through `package.json#exports`, the same way an installed copy loads it, and runs in a child process on each version listed in [`tests/index.ts`](../../tests/index.ts). [get-node](https://github.com/ehmicky/get-node) downloads the binaries.

The test runner itself runs on the development Node.js version. Only the fixture code runs on old versions, so fixtures use `require('fs')`, not `require('node:fs')`.

Node.js has no darwin-arm64 binaries before v16. get-node reported `No Node.js binaries available for 14.21.3 on darwin arm64`, and the same for 12.22.12. On Apple Silicon, `tests/index.ts` skips those versions, and they show as skipped (`○`) in the output. CI runs on Linux x64, where every version runs.

A temporary change that made `getCallerFilename()` return `undefined` failed the package tests on every version that ran (18 failures on macOS arm64). So the matrix detects a regression in caller resolution, not only load errors.

## Re-evaluate when

- The floor is raised. Then update `engines.node`, the build target, the oldest entry in `tests/index.ts`, and the two lint overrides.
- esbuild adds an option to strip `node:` for old targets, which would make the `n/prefer-node-protocol` override unnecessary.
