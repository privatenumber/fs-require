import path from 'node:path';
import vm from 'node:vm';
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
		test('file extension takes precedence over directory index', () => {
			const vol = Volume.fromJSON({
				'/a.js': '',
				'/a/index.js': '',
			});
			const fsRequire = createFsRequire(vol);
			expect(fsRequire.resolve('/a')).toBe('/a.js');
		});

		test('skip directory with implicit extension and use json', () => {
			const vol = Volume.fromJSON({
				'/a.js/child': '',
				'/a.json': '{}',
			});
			const fsRequire = createFsRequire(vol);
			expect(fsRequire.resolve('/a')).toBe('/a.json');
			expect(fsRequire('/a')).toStrictEqual({});
		});

		test('directory with implicit extension is not a match', () => {
			const vol = Volume.fromJSON({ '/a.js/child': '' });
			const fsRequire = createFsRequire(vol);
			expect(() => fsRequire.resolve('/a')).toThrow('Cannot find module \'/a\'');
		});

		test('package main points to a file', () => {
			const vol = Volume.fromJSON({
				'/a/package.json': '{"main":"entry.js"}',
				'/a/entry.js': '',
			});
			const fsRequire = createFsRequire(vol);
			expect(fsRequire.resolve('/a')).toBe('/a/entry.js');
		});

		test('package main resolves an implicit extension', () => {
			const vol = Volume.fromJSON({
				'/a/package.json': '{"main":"lib/entry"}',
				'/a/lib/entry.js': '',
			});
			const fsRequire = createFsRequire(vol);
			expect(fsRequire.resolve('/a')).toBe('/a/lib/entry.js');
		});

		test('package main resolves a directory index', () => {
			const vol = Volume.fromJSON({
				'/a/package.json': '{"main":"lib"}',
				'/a/lib/index.js': '',
			});
			const fsRequire = createFsRequire(vol);
			expect(fsRequire.resolve('/a')).toBe('/a/lib/index.js');
		});

		test('falsy package main falls back to index', () => {
			const vol = Volume.fromJSON({
				'/a/package.json': '{"main":""}',
				'/a/index.js': '',
			});
			const fsRequire = createFsRequire(vol);
			expect(fsRequire.resolve('/a')).toBe('/a/index.js');
		});

		test('non-string package main falls back to index', () => {
			const vol = Volume.fromJSON({
				'/a/package.json': '{"main":5}',
				'/a/index.js': '',
			});
			const fsRequire = createFsRequire(vol);
			expect(fsRequire.resolve('/a')).toBe('/a/index.js');
		});

		test('missing package main falls back to index', () => {
			const vol = Volume.fromJSON({
				'/a/package.json': '{"main":"missing"}',
				'/a/index.js': '',
			});
			const fsRequire = createFsRequire(vol);
			expect(fsRequire.resolve('/a')).toBe('/a/index.js');
		});

		test('missing package main and index are not found', () => {
			const vol = Volume.fromJSON({ '/a/package.json': '{"main":"missing"}' });
			const fsRequire = createFsRequire(vol);
			expect(() => fsRequire.resolve('/a')).toThrow('Cannot find module \'/a\'');
		});

		test('index resolution does not append extensions', () => {
			const vol = Volume.fromJSON({ '/a/index.js.json': '{}' });
			const fsRequire = createFsRequire(vol);
			expect(() => fsRequire.resolve('/a')).toThrow('Cannot find module \'/a\'');
		});

		test('invalid package json throws ERR_INVALID_PACKAGE_CONFIG', () => {
			const vol = Volume.fromJSON({
				'/a/package.json': '{',
				'/a/index.js': '',
			});
			const fsRequire = createFsRequire(vol);
			expect(() => fsRequire.resolve('/a')).toThrow(expect.objectContaining({
				code: 'ERR_INVALID_PACKAGE_CONFIG',
				cause: expect.any(SyntaxError),
			}));
		});

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

	// Like Node.js, a request ending in /, /., or /.. names a directory
	test('directory requests skip files', () => {
		const vol = Volume.fromJSON({
			'/a.js': '',
			'/a/index.js': '',
		});
		const fsRequire = createFsRequire(vol);

		expect(fsRequire.resolve('/a')).toBe('/a.js');
		expect(fsRequire.resolve('/a/')).toBe('/a/index.js');
		expect(fsRequire.resolve('/a/.')).toBe('/a/index.js');
		expect(fsRequire.resolve('/a/index.js/..')).toBe('/a/index.js');
	});

	test('package.json with a byte order mark', () => {
		const vol = Volume.fromJSON({
			'/pkg/package.json': '\uFEFF{"main":"entry.js"}',
			'/pkg/entry.js': '',
		});
		const fsRequire = createFsRequire(vol);

		expect(fsRequire.resolve('/pkg')).toBe('/pkg/entry.js');
	});

	test('package.json that is not an object', () => {
		for (const config of ['null', '5', 'false', '"main"', '[]']) {
			const vol = Volume.fromJSON({
				'/pkg/package.json': config,
				'/pkg/index.js': '',
			});
			const fsRequire = createFsRequire(vol);

			expect(() => fsRequire.resolve('/pkg')).toThrow(expect.objectContaining({
				code: 'ERR_INVALID_PACKAGE_CONFIG',
			}));
		}
	});

	// Node.js normalizes main with path.resolve(), which removes a trailing slash
	test('package main with a trailing slash', () => {
		const vol = Volume.fromJSON({
			'/pkg/package.json': '{"main":"lib/"}',
			'/pkg/lib.js': '',
			'/pkg/lib/index.js': '',
		});
		const fsRequire = createFsRequire(vol);

		expect(fsRequire.resolve('/pkg')).toBe('/pkg/lib.js');
	});

	test('unreadable package.json throws ERR_INVALID_PACKAGE_CONFIG', () => {
		const vol = Volume.fromJSON({
			'/pkg/package.json': '{}',
			'/pkg/index.js': '',
		});
		const mfs = Object.assign(Object.create(vol), {
			existsSync: vol.existsSync.bind(vol),
			lstatSync: vol.lstatSync.bind(vol),
			readFileSync: (filePath: string) => {
				if (filePath === '/pkg/package.json') {
					throw Object.assign(new Error('EACCES'), { code: 'EACCES' });
				}
				return vol.readFileSync(filePath);
			},
		});
		const fsRequire = createFsRequire(mfs);

		expect(() => fsRequire.resolve('/pkg')).toThrow(expect.objectContaining({
			code: 'ERR_INVALID_PACKAGE_CONFIG',
		}));
	});

	// Without a caller file, relative requests stay relative to the file-system's
	// own working directory, so a package's main must not become absolute
	test('relative package main without a caller file', () => {
		const vol = Volume.fromJSON({
			'./pkg/package.json': '{"main":"entry.js"}',
			'./pkg/entry.js': 'module.exports = {};',
		});
		const createWithoutCaller = vm.runInThisContext('(create, fs) => create(fs)');
		const fsRequire = createWithoutCaller(createFsRequire, vol);

		const resolved = fsRequire.resolve('./pkg');
		expect(resolved).toBe(`.${path.sep}${path.join('pkg', 'entry.js')}`);
		expect(fsRequire('./pkg')).toBe(fsRequire('./pkg/entry.js'));

		// A relative result keeps its ./ prefix, so it isn't read as a package name
		expect(fsRequire(resolved)).toBe(fsRequire('./pkg'));
	});

	test('relative directory index without a caller file', () => {
		const vol = Volume.fromJSON({
			'./pkg/index.js': 'module.exports = {};',
		});
		const createWithoutCaller = vm.runInThisContext('(create, fs) => create(fs)');
		const fsRequire = createWithoutCaller(createFsRequire, vol);

		const resolved = fsRequire.resolve('./pkg');
		expect(resolved).toBe(`.${path.sep}${path.join('pkg', 'index.js')}`);
		expect(fsRequire(resolved)).toBe(fsRequire('./pkg/index.js'));
		expect(fsRequire('./pkg')).toBe(fsRequire('./pkg/index.js'));
	});

	// A module loaded from a relative path has a relative filename, so its own
	// relative requires must stay in the same relative namespace
	test('relative requests from a relative parent stay relative', () => {
		const vol = Volume.fromJSON({
			'./dir/a.js': 'module.exports = require.resolve("./b");',
			'./dir/b.js': '',
		});
		const createWithoutCaller = vm.runInThisContext('(create, fs) => create(fs)');
		const fsRequire = createWithoutCaller(createFsRequire, vol);

		expect(fsRequire('./dir/a')).toBe(`.${path.sep}${path.join('dir', 'b.js')}`);
	});

	// The resolved path is the cache key, so aliases of one file must match
	test('absolute paths are normalized', () => {
		const vol = Volume.fromJSON({
			'/a.js': 'module.exports = {};',
			'/sub/index.js': '',
		});
		const fsRequire = createFsRequire(vol);

		expect(fsRequire.resolve('/sub/../a')).toBe('/a.js');
		expect(fsRequire('/sub/../a')).toBe(fsRequire('/a'));
	});

	describe('resolve package', () => {
		// fsRequire() reads absolute paths from the file-system, so a package's
		// resolved path may be missing there, or run there as a separate instance.
		// The specifier loads the package through Node.js
		test('returns the specifier, which fsRequire() loads', () => {
			const vol = Volume.fromJSON({});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire.resolve('memfs')).toBe('memfs');
			expect(fsRequire(fsRequire.resolve('memfs'))).toBe(fsRequire('memfs'));
		});

		// Wrappers that load packages from elsewhere forward resolve()
		test('does not check that the package exists', () => {
			const vol = Volume.fromJSON({});
			const fsRequire = createFsRequire(vol);

			expect(fsRequire.resolve('missing-package')).toBe('missing-package');
		});
	});
});
