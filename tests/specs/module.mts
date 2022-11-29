import { testSuite, expect } from 'manten';
import { Volume } from 'memfs';
import { createFsRequire } from '../../dist/index.mjs';

export default testSuite(({ describe }) => {
	describe('module', ({ test }) => {
		test('Nested, relative, & absolute paths', () => {
			const randomNumber = Math.random();
			const vol = Volume.fromJSON({
				'/root-file-d.js': `module.exports = function () { return ${randomNumber}; };`,
				'/directory/nested/nested/file-c.js': 'module.exports = require(\'/root-file-d\')',
				'/directory/file-b.js': 'module.exports = require(\'./nested/nested/file-c\')',
				'/file-a.js': 'const fn = require(\'./directory/file-b\'); module.exports = fn();',
				'/index.js': 'module.exports = require(\'./file-a\');',
			});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire('/index')).toBe(randomNumber);
		});
	});
});

// 			import { Volume } from 'memfs';
// import { createFsRequire } from '../../dist/index.mjs';

// const vol = Volume.fromJSON({
// 	'/index.js': `module.exports = 123`,
// });
// const fsReq = createFsRequire(vol);

// console.log(fsReq('/index'));
