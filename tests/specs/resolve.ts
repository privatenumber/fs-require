import { describe, test, expect } from 'manten';
import { Volume } from 'memfs';
import { createFsRequire } from '#fs-require';

describe('resolve', () => {
	describe('resolve js', () => {
		test('explicit extension', () => {
			const vol = Volume.fromJSON({
				'/index.js': '',
			});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire.resolve('/index.js')).toBe('/index.js');
		});

		test('implicit extension', () => {
			const vol = Volume.fromJSON({
				'/index.js': '',
			});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire.resolve('/index')).toBe('/index.js');
		});

		test('extensionless file', () => {
			const vol = Volume.fromJSON({
				'/index': '',
			});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire.resolve('/index')).toBe('/index');
		});

		test('extensionless file with invalid extension', () => {
			const vol = Volume.fromJSON({
				'/index.asdf': '',
			});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire.resolve('/index.asdf')).toBe('/index.asdf');
		});

		test('Prefer exact match over implicit extension', () => {
			const vol = Volume.fromJSON({
				'/index': '',
				'/index.js': '',
			});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire.resolve('/index')).toBe('/index');
		});
	});

	describe('resolve json', () => {
		test('explicit extension', () => {
			const vol = Volume.fromJSON({
				'/index.json': '',
			});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire.resolve('/index.json')).toBe('/index.json');
		});

		test('implicit extension', () => {
			const vol = Volume.fromJSON({
				'/index.json': '',
			});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire.resolve('/index')).toBe('/index.json');
		});
	});

	describe('resolve directory', () => {
		test('implicit index.js', () => {
			const vol = Volume.fromJSON({
				'/directory/index.js': '',
			});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire.resolve('/directory')).toBe('/directory/index.js');
		});

		test('Prefer index.js in implicit directory', () => {
			const vol = Volume.fromJSON({
				'/directory/index': '',
				'/directory/index.js': '',
				'/directory/index.json': '',
			});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire.resolve('/directory')).toBe('/directory/index.js');
		});

		test('Prefer index.json in implicit directory', () => {
			const vol = Volume.fromJSON({
				'/directory/index': '',
				'/directory/index.json': '',
			});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire.resolve('/directory')).toBe('/directory/index.json');
		});

		test('should not match extensionless in implicit directory', () => {
			const vol = Volume.fromJSON({
				'/directory/index': '',
			});
			const fsRequire = createFsRequire(vol);

			expect(() => fsRequire.resolve('/directory')).toThrow('Cannot find module \'/directory\'');
		});
	});

	describe('resolve fs', () => {
		test('fs', () => {
			const vol = Volume.fromJSON({});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire.resolve('fs')).toBe('fs');
		});

		test('native fs', () => {
			const vol = Volume.fromJSON({});
			const fsRequire = createFsRequire(vol, {
				fs: true,
			});

			expect(fsRequire.resolve('fs')).toBe('fs');
		});
	});

	describe('resolve package', () => {
		// A resolved path would be read from the virtual file-system, so the
		// specifier is the ID that loads the package
		test('returns the specifier, which fsRequire() loads', () => {
			const vol = Volume.fromJSON({});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire.resolve('memfs')).toBe('memfs');
			expect(fsRequire(fsRequire.resolve('memfs'))).toBe(fsRequire('memfs'));
		});

		test('missing package throws MODULE_NOT_FOUND', () => {
			const vol = Volume.fromJSON({});
			const fsRequire = createFsRequire(vol);

			expect(() => fsRequire.resolve('missing-package')).toThrow(expect.objectContaining({
				code: 'MODULE_NOT_FOUND',
			}));
		});

		test('fs subpath the shim does not provide', () => {
			const vol = Volume.fromJSON({});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire.resolve('node:fs')).toBe('node:fs');
			expect(fsRequire.resolve('fs/promises')).toBe('fs/promises');
			expect(() => fsRequire.resolve('fs/missing')).toThrow(expect.objectContaining({
				code: 'MODULE_NOT_FOUND',
			}));
		});
	});
});
