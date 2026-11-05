// `a` loads fs-require first, so `module.parent` of fs-require is `a`
require('./a/index.cjs');
process.stdout.write(require('./b/index.cjs'));
