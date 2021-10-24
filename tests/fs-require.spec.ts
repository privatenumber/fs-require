import fs from 'fs';
import path from 'path';
import { Volume } from 'memfs';
import { createFsRequire } from '../src/fs-require';

describe('require js', () => {
	test('explicit extension', () => {
		const randomNumber = Math.random();
		const vol = Volume.fromJSON({
			'/index.js': `module.exports = ${randomNumber};`,
		});
		const fsRequire = createFsRequire(vol);
	
		expect(fsRequire('/index.js')).toBe(randomNumber);
	});

	test('implicit extension', () => {
		const randomNumber = Math.random();
		const vol = Volume.fromJSON({
			'/index.js': `module.exports = ${randomNumber};`,
		});
		const fsRequire = createFsRequire(vol);
	
		expect(fsRequire('/index')).toBe(randomNumber);
	});

	test('extensionless', () => {
		const randomNumber = Math.random();
		const vol = Volume.fromJSON({
			'/index': `module.exports = ${randomNumber};`,
		});
		const fsRequire = createFsRequire(vol);
	
		expect(fsRequire('/index')).toBe(randomNumber);
	});
	
	test('extensionless with invalid extension', () => {
		const randomNumber = Math.random();
		const vol = Volume.fromJSON({
			'/index.asdf': `module.exports = ${randomNumber};`,
		});
		const fsRequire = createFsRequire(vol);
	
		expect(fsRequire('/index.asdf')).toBe(randomNumber);
	});

	test('Prefer exact match over implicit extension', () => {
		const vol = Volume.fromJSON({
			'/index': 'module.exports = 1;',
			'/index.js': 'module.exports = 2;',
		});
		const fsRequire = createFsRequire(vol);
	
		expect(fsRequire('/index')).toBe(1);
	});
});


describe('require json', () => {
	test('explicit extension', () => {
		const randomNumber = Math.random();
		const vol = Volume.fromJSON({
			'/index.json': JSON.stringify({ value: randomNumber }),
		});
		const fsRequire = createFsRequire(vol);
	
		expect(fsRequire('/index.json').value).toBe(randomNumber);
	});
	
	test('implicit extension', () => {
		const randomNumber = Math.random();
		const vol = Volume.fromJSON({
			'/index.json': JSON.stringify({ value: randomNumber }),
		});
		const fsRequire = createFsRequire(vol);
	
		expect(fsRequire('/index').value).toBe(randomNumber);
	});
});

describe('require directory', () => {
	test('implicit index.js', () => {
		const randomNumber = Math.random();
		const vol = Volume.fromJSON({
			'/directory/index.js': `module.exports = ${randomNumber};`,
		});
		const fsRequire = createFsRequire(vol);

		expect(fsRequire('/directory')).toBe(randomNumber);
	});

	test('Prefer index.js in implicit directory', () => {
		const vol = Volume.fromJSON({
			'/directory/index': 'module.exports = 0;',
			'/directory/index.js': 'module.exports = 1;',
			'/directory/index.json': 'module.exports = 2;',
		});
		const fsRequire = createFsRequire(vol);

		expect(fsRequire('/directory')).toBe(1);
	});

	test('Prefer index.json in implicit directory', () => {
		const vol = Volume.fromJSON({
			'/directory/index': 'module.exports = 0;',
			'/directory/index.json': '2',
		});
		const fsRequire = createFsRequire(vol);

		expect(fsRequire('/directory')).toBe(2);
	});

	test('should not match extensionless in implicit directory', () => {
		const vol = Volume.fromJSON({
			'/directory/index': 'module.exports = 0;',
		});
		const fsRequire = createFsRequire(vol);

		expect(() => fsRequire('/directory')).toThrow('Cannot find module \'/directory\'');
	});
});

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

test('__dirname, __filename', () => {
	const vol = Volume.fromJSON({
		'/some/nested/directory/file.js': `module.exports = {
			dirname: __dirname,
			filename: __filename,
		}`,
		'/index.js': `module.exports = [
			{
				dirname: __dirname,
				filename: __filename,
			},
			require('./some/nested/directory/file'),
		];`,
	});

	const fsRequire = createFsRequire(vol);
	expect(fsRequire('/index')).toEqual([
		{
			dirname: '/',
			filename: 'index.js',
		},
		{
			dirname: '/some/nested/directory',
			filename: 'file.js',
		},
	]);
});

test('native module', () => {
	const vol = Volume.fromJSON({
		'/index.js': 'module.exports = require(\'path\');',
	});
	const fsRequire = createFsRequire(vol);

	expect(fsRequire('/index')).toBe(path);
});

describe('mock fs', () => {
	test('mock fs', () => {
		const randomNumber = Math.random().toString();
		const vol = Volume.fromJSON({
			'/index.js': `
				const fs = require('fs');
				fs.writeFileSync('/test-write', '${randomNumber}');
			`,
		});
		const fsRequire = createFsRequire(vol);

		fsRequire('/index');
		expect(vol.readFileSync('/test-write').toString()).toBe(randomNumber);
	});

	test('mock fs - fs/promises to access fs.promises', () => {
		const vol = Volume.fromJSON({
			'/index.js': `
				module.exports = require('fs/promises');
			`,
		});
		const fsRequire = createFsRequire(vol);

		expect(fsRequire('/index')).toBe(vol.promises);
	});

	test('native fs', () => {
		const vol = Volume.fromJSON({
			'/index.js': `
				const fs = require('fs');
				module.exports = fs.readdirSync('${__dirname}');
			`,
		});

		const fsRequire = createFsRequire(vol, {
			fs: true,
		});

		const files = fsRequire('/index');
		expect(files.includes('fs-require.spec.ts')).toBe(true);
	});

	if (process.version.startsWith('v14.')) {
		test('native fs promises', async () => {
			const vol = Volume.fromJSON({
				'/index.js': `
					const fs = require('fs/promises');
					module.exports = fs.readdir('${__dirname}');
				`,
			});

			const fsRequire = createFsRequire(vol, {
				fs: true,
			});

			const files = await fsRequire('/index');
			expect(files.includes('fs-require.spec.ts')).toBe(true);
		});
	}

	test('custom fs', () => {
		const randomNumber = Math.random().toString();
		const customFs = Volume.fromJSON({
			'/some-file': randomNumber,
		});
		const vol = Volume.fromJSON({
			'/index.js': `
				const fs = require('fs');
				module.exports = fs.readFileSync('/some-file').toString();
			`,
		});

		const fsRequire = createFsRequire(vol, {
			fs: customFs,
		});

		expect(fsRequire('/index')).toBe(randomNumber);
	});

	// https://github.com/sindresorhus/eslint-plugin-unicorn/blob/8d8411b/docs/rules/prefer-node-protocol.md
	// https://nodejs.org/api/esm.html#node-imports
	// With native FS, only works from Node.js v16
	test('node protocol', () => {
		const randomNumber = Math.random().toString();
		const vol = Volume.fromJSON({
			'/index.js': `
				const fs = require('node:fs');
				fs.writeFileSync('/test-write', '${randomNumber}');
			`,
		});
		const fsRequire = createFsRequire(vol);

		fsRequire('/index');
		expect(vol.readFileSync('/test-write').toString()).toBe(randomNumber);
	});
});

test('Works with real fs', () => {
	const fsRequire = createFsRequire(fs);

	const testFile = fsRequire('./test-file');
	expect(testFile()).toBe('hello world');
});

test('Modules are cached', () => {
	const vol = Volume.fromJSON({
		'/test-module.js': 'module.exports = Math.random();',
		'/reimport.js': 'module.exports = require(\'./test-module\')',
		'/index.js': 'module.exports = [require(\'./test-module.js\'), require(\'./reimport\')];',
	});
	const fsRequire = createFsRequire(vol);

	const values = fsRequire('/index');
	expect(values[0]).toBe(values[1]);
});

test('Error stack', () => {
	const vol = Volume.fromJSON({
		'/index.js': 'module.exports = new Error(\'some error\');',
	});
	const fsRequire = createFsRequire(vol);

	const error = fsRequire('/index');
	const stack = error.stack.split('\n');

	expect(stack[1]).toMatch(`fs-require://${fsRequire.id}/index.js:1:80`);
});
