# Module lifecycle

fs-require caches, loads, and cleans up a virtual module in the same order as Node.js's CommonJS loader:

1. Create the `Module` with its parent, which adds it to the parent's `module.children`.
2. Store it in `fsRequire.cache` before running it.
3. Read and run the file. On success, set `module.loaded = true`.
4. If reading or running throws, delete the cache entry and remove the module from the parent's `children`, then rethrow.

- Implementation: the `require` closure in [`src/index.ts`](../../src/index.ts).
- Contract: the "Circular requires get the partial exports" and "Failed loads are not cached" tests in [`tests/specs/fs-require.ts`](../../tests/specs/fs-require.ts).

Last verified 2026-11-06 on Node.js v26.13.0.

## Node.js behavior

`Module._load` creates the module, caches it, loads it, and on failure deletes the cache entry and splices the module out of `parent.children` ([`loader.js` L1431-L1497 at v26.13.0](https://github.com/nodejs/node/blob/v26.13.0/lib/internal/modules/cjs/loader.js#L1431-L1497)).

Observed with plain Node.js v26.13.0 and two files on disk:

```text
a.js  exports.a = 1; require("./b"); exports.done = true;
b.js  module.exports = { fromA: { ...require("./a") }, aLoaded: require.cache[require.resolve("./a")].loaded };

require('./b.js')  -> {"fromA":{"a":1},"aLoaded":false}
a's module.loaded after loading -> true
```

A parent that catches a failed `require('./bad')` has `module.children` equal to `[]` afterwards.

## Behavior before v2

Up to and including v1.6.0, fs-require stored a module in the cache only after it finished running, and never set `module.loaded`:

- A circular require ran the first module again, recursively, until it threw `RangeError: Maximum call stack size exceeded`.
- A module that threw while running stayed in its parent's `children`.
