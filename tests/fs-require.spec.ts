import fs from 'fs';
import path from 'path';
import { Volume } from 'memfs';
import { createFsRequire } from '../src/fs-require';

test('Require JS', () => {
	const randomNumber = Math.random();
	const vol = Volume.fromJSON({
		'/index.js': `module.exports = ${randomNumber};`,
	});
	const fsRequire = createFsRequire(vol);

	expect(fsRequire('/index.js')).toBe(randomNumber);
});

test('Require JS - implicit extension', () => {
	const randomNumber = Math.random();
	const vol = Volume.fromJSON({
		'/index.js': `module.exports = ${randomNumber};`,
	});
	const fsRequire = createFsRequire(vol);

	expect(fsRequire('/index')).toBe(randomNumber);
});

test('Require JS - extensionless', () => {
	const randomNumber = Math.random();
	const vol = Volume.fromJSON({
		'/index': `module.exports = ${randomNumber};`,
	});
	const fsRequire = createFsRequire(vol);

	expect(fsRequire('/index')).toBe(randomNumber);
});

test('Require JSON', () => {
	const randomNumber = Math.random();
	const vol = Volume.fromJSON({
		'/data.json': JSON.stringify({ value: randomNumber }),
		'/index.js': 'module.exports = require(\'./data.json\');',
	});
	const fsRequire = createFsRequire(vol);

	expect(fsRequire('/index').value).toBe(randomNumber);
});

test('Require JSON - implicit extension', () => {
	const randomNumber = Math.random();
	const vol = Volume.fromJSON({
		'/data.json': JSON.stringify({ value: randomNumber }),
		'/index.js': 'module.exports = require(\'./data\');',
	});
	const fsRequire = createFsRequire(vol);

	expect(fsRequire('/index').value).toBe(randomNumber);
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

test('implicit index', () => {
	const randomNumber = Math.random();
	const vol = Volume.fromJSON({
		'/lib/index.js': `module.exports = ${randomNumber};`,
		'/index.js': 'module.exports = require(\'./lib\');',
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

test('mock fs - fs/promises fails', () => {
	const vol = Volume.fromJSON({
		'/index.js': `
			const fs = require('fs/promises');
		`,
	});
	const fsRequire = createFsRequire(vol);

	expect(() => fsRequire('/index')).toThrow('Cannot find module \'fs/promises\'');
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
