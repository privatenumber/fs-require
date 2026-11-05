# Contributing

## Setup

```sh
pnpm install
```

`pnpm install` also downloads the development Node.js version pinned in `devEngines.runtime` in `package.json`, and `pnpm run` scripts use it. A separate Node.js version manager is not necessary.

## Scripts

| Script | Description |
| --- | --- |
| `pnpm build` | Bundle `src/` to `dist/` with pkgroll |
| `pnpm lint` | Lint tracked files with lintroll |
| `pnpm type-check` | Type-check with `tsc` |
| `pnpm test` | Build, then run the tests with Node.js native TypeScript support |
| `pnpm prepack` | Build and clean `package.json` for publishing |

## Supported Node.js versions

The published package supports Node.js 12.22 and newer. The build targets that version, but esbuild doesn't remove `node:` specifiers or polyfill built-in methods, so `src/` imports built-ins without the `node:` prefix and avoids methods newer than the floor. See [notes/fs-require/node-12-support.md](notes/fs-require/node-12-support.md).

Tests and tooling use the development Node.js version, so `tests/` can use modern APIs.

## Tests

`pnpm test` builds first, because the tests run the built package:

- `tests/specs/fs-require.ts` and `tests/specs/resolve.ts` run in-process with [memfs](https://github.com/streamich/memfs). They import `#fs-require`, which resolves to `dist/index.cjs` at runtime and to `src/index.ts` for type-checking.
- `tests/specs/package.ts` runs fixture projects in child processes. Each project loads fs-require through `package.json#exports`, on every Node.js version listed in `tests/index.ts`. Use it for behavior that depends on the module system, the caller's file, or the Node.js version.

Fixture code in `tests/specs/package.ts` runs on Node.js 12.22, so it must not use `require('node:*')` or newer syntax.

On Apple Silicon, Node.js versions before 16 have no binaries, so those groups show as skipped. CI runs them on Linux.

## Engineering notes

[`notes/`](notes/README.md) holds maintainer references with evidence, such as pinned source links and reproducible commands. Read the relevant note before changing a decision it covers, and add a note when work produces something the next contributor would otherwise have to rediscover.
