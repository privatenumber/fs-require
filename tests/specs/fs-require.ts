import path from 'node:path';
import { describe, test, expect } from 'manten';
import { createFixture } from 'fs-fixture';
import { Volume } from 'memfs';
import { createFsRequire } from '#fs-require';

describe('fs-require', () => {
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

		test('native fs', async () => {
			await using fixture = await createFixture({
				'real-file': '',
			});
			const vol = Volume.fromJSON({
				'/index.js': `
					const fs = require('fs');
					module.exports = fs.readdirSync(${JSON.stringify(fixture.path)});
				`,
			});

			const fsRequire = createFsRequire(vol, {
				fs: true,
			});

			expect(fsRequire('/index')).toStrictEqual(['real-file']);
		});

		test('native fs promises', async () => {
			await using fixture = await createFixture({
				'real-file': '',
			});
			const vol = Volume.fromJSON({
				'/index.js': `
					const fs = require('fs/promises');
					module.exports = fs.readdir(${JSON.stringify(fixture.path)});
				`,
			});

			const fsRequire = createFsRequire(vol, {
				fs: true,
			});

			expect(await fsRequire('/index')).toStrictEqual(['real-file']);
		});

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

		// https://nodejs.org/api/esm.html#node-imports
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

	// Code that requires optional modules checks this code, like Node.js require()
	test('Missing modules throw MODULE_NOT_FOUND', () => {
		const vol = Volume.fromJSON({
			'/index.js': `
				const getCode = (request) => {
					try {
						require(request);
					} catch (error) {
						return error.code;
					}
				};
				module.exports = [getCode('./missing'), getCode('fs/missing')];
			`,
		});
		const fsRequire = createFsRequire(vol);

		expect(fsRequire('/index')).toStrictEqual(['MODULE_NOT_FOUND', 'MODULE_NOT_FOUND']);
	});

	test('Missing module stack starts at the require() call', () => {
		const vol = Volume.fromJSON({
			'/index.js': `
				const getStack = (request) => {
					try {
						require(request);
					} catch (error) {
						return error.stack;
					}
				};
				module.exports = [getStack('./missing'), getStack('fs/missing')];
			`,
		});
		const fsRequire = createFsRequire(vol);

		for (const stack of fsRequire('/index')) {
			expect(stack.split('\n', 2)[1]).toMatch(`fs-require://${fsRequire.id}/index.js:`);
		}

		const getTopLevelStack = (request: () => unknown) => {
			try {
				request();
			} catch (error) {
				return (error as Error).stack!.split('\n', 2)[1];
			}
		};
		expect(getTopLevelStack(() => fsRequire('./missing'))).toMatch(import.meta.filename);
		expect(getTopLevelStack(() => fsRequire.resolve('./missing'))).toMatch(import.meta.filename);
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

	test('Cache API', () => {
		const vol = Volume.fromJSON({
			'/index.js': 'module.exports = Math.random();',
		});
		const fsRequire = createFsRequire(vol);

		const value1 = fsRequire('/index');
		const value2 = fsRequire('/index');
		expect(value1).toBe(value2);

		delete fsRequire.cache['/index.js'];
		const value3 = fsRequire('/index');

		expect(value2).not.toBe(value3);
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
});
