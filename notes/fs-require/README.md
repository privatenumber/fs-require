# fs-require

Project decisions for fs-require.

- [caller-relative-resolution.md](./caller-relative-resolution.md): How `createFsRequire()` finds the file that relative paths resolve from, and why it reads the call stack instead of `module.parent`.
