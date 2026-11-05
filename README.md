# fs-require [![Latest version](https://badgen.net/npm/v/fs-require)](https://npm.im/fs-require) [![Monthly downloads](https://badgen.net/npm/dm/fs-require)](https://npm.im/fs-require) [![Install size](https://packagephobia.now.sh/badge?p=fs-require)](https://packagephobia.now.sh/result?p=fs-require) [![Bundle size](https://badgen.net/bundlephobia/minzip/fs-require)](https://bundlephobia.com/result?p=fs-require)

Create a `require()` function from any file-system.

Pass in a [virtual file-system](https://github.com/streamich/memfs) for in-memory testing without writing to disk.

### Features
- 💞 Works well with [memfs](https://github.com/streamich/memfs)!
- 🪄 Resolves implicit entry `index` and implicit extensions `js` and `json`
- 🗺 Resolves relative and absolute paths
- 📍 `__dirname` & `__filename`
- ✅ `require.resolve()` & `require.cache`
- 👻 Mocks `fs` within fsRequire
- 👣 Call stack shows paths with `fs-require://` protocol

<sub>Support this project by ⭐️ starring and sharing it. [Follow me](https://github.com/privatenumber) to see what other cool projects I'm working on! ❤️</sub>

## 🚀 Install

```bash
npm i fs-require
```

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

## ⚙️ API

### createFsRequire(fs, options?)
Returns a `fsRequire(modulePath)` function that resolves from the file-system passed in.

#### fs
Type: `FileSystem`

Required

The file-system to resolve requires from.

#### options
##### options.fs

Type: `boolean | FileSystem`

Code executed the virtual file-system may `require('fs')` and this may either pose as a security concern or yield inconsistent results as the virtual file won't not accessible through the actual `fs` module.

By default `require('fs')` is shimmed to the file-system passed into `createFsRequire`.

To disable this behavior and resolve to the real `fs` module, set this to `true`.

You can also pass in a different file-system too.


### fsRequire(modulePath)

#### modulePath
Type: `string`

Required

Path to the module you want to "require". Mocks Node.js [`require`](https://nodejs.org/api/modules.html#requireid).

Relative paths and bare specifiers (package names) resolve from the file that called `createFsRequire()`, like `require` resolves from the file it's used in. If the caller isn't a file (e.g. `node -e` or the REPL), relative paths are passed to the file-system as-is, and bare specifiers resolve from fs-require's own location.

### fsRequire.resolve(modulePath)

#### modulePath
Type: `string`

Required

Path to the module you want to "resolve". Mocks Node.js [`require.resolve`](https://nodejs.org/api/modules.html#requireresolverequest-options): it returns the path of a file in the file-system, and throws a `MODULE_NOT_FOUND` error when the module can't be found. A package name is returned unchanged, because `fsRequire()` reads absolute paths from the file-system.

### fsRequire.cache

Type: `Record<string, Module>`

An object that contains the cache for modules that have been loaded so far. The key is the absolute path to the module, and the value is the module instance. Mocks Node.js [`require.cache`](https://nodejs.org/api/modules.html#requirecache).

To re-load a module that has already been loaded, you can delete the cache the same way you would in Node.js:

```js
delete fsRequire.cache[fsRequire.resolve('/some-module.js')]
```

## 💁‍♂️ FAQ
### Can it resolve case insensitive paths?
Case sensitivity in paths is a file-system concern so it would depend on the `fs` passed in. For example, [macOS (native fs) is case insensitive](https://discussions.apple.com/thread/251191099#:~:text=No.,have%20two%20files%20named%20File.). [memfs is case sensitive](https://github.com/streamich/memfs/issues/533).


## 👨‍👩‍👧 Related
- [fs-monkey](https://github.com/streamich/fs-monkey) - By the same author of [memfs](https://github.com/streamich/memfs). Patches the global `require` to access a virtual fs.
