import { describe, test, expect } from 'manten';
import spawn from 'nano-spawn';
import { createFixture } from 'fs-fixture';
import { installFsRequire } from '../utils/fixture.ts';

/**
 * Loads the built package through package.json#exports in a child process,
 * so each entry point runs on the given Node.js version.
 *
 * Fixture code runs on the oldest supported Node.js version, so it avoids
 * `node:` specifiers in require() (added in v14.18.0)
 */
export const packageSpec = (nodePath: string) => describe('package', () => {
	test('require() entry point', async () => {
		await using fixture = await createFixture({
			'index.cjs': `
				const fs = require('fs');
				const { createFsRequire } = require('fs-require');

				const fsRequire = createFsRequire(fs);
				const result = fsRequire('./virtual');
				process.stdout.write(JSON.stringify({
					json: result.json,
					builtin: result.builtin,
					filename: result.filename,
					sharesFs: result.fs === fs,
				}));
			`,
			'virtual/index.js': `
				module.exports = {
					json: require('./data.json'),
					builtin: typeof require('path').join,
					fs: require('fs'),
					filename: __filename,
				};
			`,
			'virtual/data.json': '{"value":1}',
			...installFsRequire(),
		});

		const { stdout } = await spawn(nodePath, [fixture.getPath('index.cjs')]);
		expect(JSON.parse(stdout)).toStrictEqual({
			json: { value: 1 },
			builtin: 'function',
			filename: 'index.js',
			sharesFs: true,
		});
	});

	test('import entry point', async () => {
		await using fixture = await createFixture({
			'index.mjs': `
				import fs from 'fs';
				import { createFsRequire } from 'fs-require';

				process.stdout.write(createFsRequire(fs)('./file'));
			`,
			'file.js': 'module.exports = "esm caller";',
			...installFsRequire(),
		});

		const { stdout } = await spawn(nodePath, [fixture.getPath('index.mjs')]);
		expect(stdout).toBe('esm caller');
	});

	// https://github.com/privatenumber/fs-require/issues/10
	test('relative paths resolve from the caller, not the first importer', async () => {
		await using fixture = await createFixture({
			'a/index.cjs': 'require("fs-require");',
			'b/index.cjs': `
				const fs = require('fs');
				const { createFsRequire } = require('fs-require');
				module.exports = createFsRequire(fs)('./file');
			`,
			'b/file.js': 'module.exports = "b/file";',
			'main.cjs': `
				require('./a/index.cjs');
				process.stdout.write(require('./b/index.cjs'));
			`,
			...installFsRequire(),
		});

		const { stdout } = await spawn(nodePath, [fixture.getPath('main.cjs')]);
		expect(stdout).toBe('b/file');
	});

	// fs-require is a symlink here, as in pnpm, `npm link`, and file: installs,
	// so its own location can't see the project's dependencies
	test('bare specifiers resolve from the caller', async () => {
		await using fixture = await createFixture({
			'index.cjs': `
				const fs = require('fs');
				const { createFsRequire } = require('fs-require');
				process.stdout.write(createFsRequire(fs)('./virtual'));
			`,
			'index.mjs': `
				import fs from 'fs';
				import { createFsRequire } from 'fs-require';
				process.stdout.write(createFsRequire(fs)('./virtual'));
			`,
			'virtual.js': 'module.exports = require("dependency");',
			'node_modules/dependency/index.js': 'module.exports = "dependency";',
			...installFsRequire(),
		});

		const cjs = await spawn(nodePath, [fixture.getPath('index.cjs')]);
		expect(cjs.stdout).toBe('dependency');

		const esm = await spawn(nodePath, [fixture.getPath('index.mjs')]);
		expect(esm.stdout).toBe('dependency');
	});
});
