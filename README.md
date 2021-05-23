# fs-require [![Latest version](https://badgen.net/npm/v/fs-require)](https://npm.im/fs-require) <!-- [![Monthly downloads](https://badgen.net/npm/dm/fs-require)](https://npm.im/fs-require) -->[![Install size](https://packagephobia.now.sh/badge?p=fs-require)](https://packagephobia.now.sh/result?p=fs-require) [![Bundle size](https://badgen.net/bundlephobia/minzip/fs-require)](https://bundlephobia.com/result?p=fs-require)

Create a `require()` function from any file-system.

### Features
- 💞 Works well with [memfs](https://github.com/streamich/memfs)!
- 🪄 Resolves implicit entry `index` and implicit extensions `js` and `json`
- 🗺 Resolves relative and absolute paths
- 📍 `__dirname` & `__filename`
- 👻 Mocks `fs` within fsRequire
- 👣 Call stack shows paths with `fs-require://` protocol

## 🙋‍♀️ Why?
Using fs-require with [memfs](https://github.com/streamich/memfs) is a great combination for writing tests that interact with the file-system.

Testing functionality that interacts with the file-system can be brittle because they expect a clean slate and can also be dangerous if the path is wrong. Creating a virtual file-system with `memfs` and testing its contents with `fsRequire` makes it secure and fast!

## 👨‍🏫 Usage

```js
import { Volume } from 'memfs'
import { createFsRequire } from 'fs-require'

// Create a virtual fs from JSON
const virtualFs = Volume.fromJSON({
    '/hello-world.js': `
        module.exports = function () {
            return 'Hello world!'
        }
    `
})

// Create fsRequire
const fsRequire = createFsRequire(virtualFs)

// Import virtual module
const helloWorld = fsRequire('/hello-world')

console.log(helloWorld()) // Hello world!
```

## 👨‍👩‍👧 Related
- [fs-monkey](https://github.com/streamich/fs-monkey) - By the same author of [memfs](https://github.com/streamich/memfs). Patches the global `require` to access a virtual fs.
