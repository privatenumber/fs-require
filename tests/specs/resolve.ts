import { testSuite, expect } from 'manten';
import { Volume } from 'memfs';
import { createFsRequire } from '../../src/fs-require';

export default testSuite(({ describe }) => {
	describe('resolve', ({ describe }) => {
		describe('resolve js', ({ test }) => {
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

		describe('resolve json', ({ test }) => {
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

		describe('resolve directory', ({ test }) => {
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

		describe('resolve fs', ({ test }) => {
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
	});
});
