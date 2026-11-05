# fs-require

Project decisions for fs-require.

- [caller-relative-resolution.md](./caller-relative-resolution.md): How `createFsRequire()` finds the file that relative paths resolve from, and why it reads the call stack instead of `module.parent`.
- [node-12-support.md](./node-12-support.md): What the Node.js 12.22 build target requires from `src/`, and how the tests run the built package on Node.js 12.22.
- [bare-specifier-resolution.md](./bare-specifier-resolution.md): Where `require('package')` inside a virtual module resolves from, and why it uses the `createFsRequire()` caller.
- [module-wrapper.md](./module-wrapper.md): What `__filename`, `__dirname`, and `module.filename` are inside a virtual module, and why they match Node.js.
