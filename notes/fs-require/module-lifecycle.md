# Module lifecycle

fs-require caches, loads, and cleans up a virtual module in the same order as Node.js's CommonJS loader:

1. On a cache hit, add the cached module to the requiring parent's `module.children` if it isn't there yet, and return its exports. This records the edge of a circular require.
2. Otherwise, create the `Module` with its parent, which adds it to the parent's `children`.
3. Store it in `fsRequire.cache` before running it.
4. Read and run the file, set `module.loaded = true`, and read `module.exports`.
5. If any part of step 4 throws, delete the cache entry and remove the failed module from the parent's `children` (when `children` is still an array), then rethrow the original error.

The `children` updates use `Array.isArray` and the `Array.prototype` methods `includes`, `indexOf`, `push`, and `splice`, captured when fs-require loads, like Node.js's primordials. They work when a module replaces `module.children` with another object or stubs one of those methods. Other built-ins, such as the array iterator, aren't captured.

Cleanup can still fail when a module freezes what it modifies, as in Node.js. If a module freezes `module.parent.children` and then throws, removing it throws a `TypeError` that replaces the original error, and the module stays in `children`. If it freezes `fsRequire.cache`, its entry can't be deleted.

- Implementation: the `require` closure in [`src/index.ts`](../../src/index.ts).
- Contract: the "Circular requires get the partial exports", "Failed loads are not cached", "A module that cannot be marked loaded is not cached", and "A failed load keeps its error after replacing module.parent.children", "A module whose exports getter throws is not cached", and "Replaced or modified module.children still records children", "Circular requires without a caller file run each module once", and "Cached requires work while Array.prototype.includes is stubbed" tests in [`tests/specs/fs-require.ts`](../../tests/specs/fs-require.ts).

Last verified 2026-11-06 on Node.js v26.13.0.

## Node.js behavior

`Module._load` creates the module, caches it, loads it, and on failure deletes the cache entry and splices the module out of `parent.children` after checking that it is an array ([`loader.js` L1431-L1497 at v26.13.0](https://github.com/nodejs/node/blob/v26.13.0/lib/internal/modules/cjs/loader.js#L1431-L1497)). `Module.prototype.load` sets `loaded` inside that guarded call. On a cache hit, `updateChildren()` adds the module to the parent's `children` unless it is already there ([L324-L329](https://github.com/nodejs/node/blob/v26.13.0/lib/internal/modules/cjs/loader.js#L324-L329)).

Observed with plain Node.js v26.13.0 and files on disk, loading `a.js` first:

```text
a.js  exports.a = 1; require("./b"); exports.done = true;
b.js  module.exports = { fromA: { ...require("./a") }, aLoaded: require.cache[require.resolve("./a")].loaded };

require('./a.js'), then reading b's exports -> {"fromA":{"a":1},"aLoaded":false}
a's module.loaded after loading -> true
```

Also observed:

- A parent with no other children that catches a failed `require('./bad')` has `module.children` equal to `[]` afterwards. Only the failed module is removed.
- When `b.js` requires the still-loading `a.js`, `b`'s `module.children` contains `a.js`.
- A module that runs `Object.freeze(module)` throws a `TypeError` on every `require()`, and isn't left in `require.cache`.
- A module that sets `module.parent.children = {}` and then throws surfaces its own error.
- A module whose `module.exports` is a getter that throws while it loads runs again on the next `require()`, and isn't left in `require.cache`. fs-require reads `module.exports` once, inside the guarded load. Node.js reads it again after the load succeeds, so a getter that returns on the first read and throws on the second stays cached in Node.js; fs-require doesn't match that case.
- After `module.children = {}`, requiring a cached module still records it: `children.length` becomes `1`. Node.js uses the generic `Array.prototype` methods, so this works on an object, and on an array whose prototype was removed. fs-require uses the same methods.

## Behavior before v2

Up to and including v1.6.0, fs-require stored a module in the cache only after it finished running, and never set `module.loaded`:

- A circular require ran the first module again, recursively, until it threw `RangeError: Maximum call stack size exceeded`.
- A module that threw while running stayed in its parent's `children`.
