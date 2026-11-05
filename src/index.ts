import vm from 'vm';
import path from 'path';
import Module from 'module';
import type {
	Options,
	FileSystemLike,
	fsRequire,
	ModuleCache,
} from './types.ts';
import {
	isBareSpecifier,
	createCallerRequire,
	resolveBareSpecifier,
} from './resolve-bare-specifier.ts';
import { resolveModule } from './resolve-module.ts';
import { getCallerFilename } from './utils/get-caller-filename.ts';
import { createModuleNotFoundError } from './utils/module-not-found-error.ts';

export type {
	FileSystemLike as FileSystem,
	fsRequire,
};

let idCounter = 0;

export const createFsRequire = (
	mfs: FileSystemLike,
	options?: Options,
) => {
	idCounter += 1;
	const fsRequireId = idCounter;
	const moduleCache: ModuleCache = Object.create(null);
	const callerFilename = getCallerFilename(createFsRequire);
	const callerRequire = createCallerRequire(callerFilename);

	const makeRequire = (
		parentFilename: string | undefined,
		parentModule?: Module,
	): fsRequire => {
		// Missing-file errors start their stack at the caller of stackStartFunction.
		// Resolution runs inline in each caller so file-system errors stay close to it
		const resolve = (modulePath: string) => {
			if (isBareSpecifier(modulePath)) {
				return modulePath;
			}

			const filePath = resolveModule(mfs, modulePath, parentFilename);
			if (!filePath) {
				throw createModuleNotFoundError(modulePath, resolve);
			}
			return filePath;
		};

		const require: fsRequire = (modulePath: string) => {
			if (isBareSpecifier(modulePath)) {
				return resolveBareSpecifier(mfs, modulePath, options, callerRequire, require);
			}

			const filePath = resolveModule(mfs, modulePath, parentFilename);
			if (!filePath) {
				throw createModuleNotFoundError(modulePath, require);
			}

			const cachedModule = moduleCache[filePath];
			if (cachedModule) {
				return cachedModule.exports;
			}

			// Like Node.js, the module is cached before it runs, so a circular require
			// gets its partial exports, and is uncached if it fails to load
			// Reference: https://github.com/nodejs/node/blob/v26.13.0/lib/internal/modules/cjs/loader.js#L1431-L1497
			const newModule = new Module(filePath, parentModule);
			newModule.filename = filePath;
			moduleCache[filePath] = newModule;

			try {
				// Read here, not in runModule(), to keep file-system errors one frame from the caller
				runModule(newModule, mfs.readFileSync(filePath).toString());
			} catch (error) {
				delete moduleCache[filePath];

				const children = parentModule?.children;
				if (children) {
					const index = children.indexOf(newModule);
					if (index !== -1) {
						children.splice(index, 1);
					}
				}

				throw error;
			}

			newModule.loaded = true;
			return newModule.exports;
		};

		require.id = fsRequireId;
		require.resolve = resolve;
		require.cache = moduleCache;

		return require;
	};

	const runModule = (
		newModule: Module,
		sourceCode: string,
	) => {
		const { filename: filePath } = newModule;

		// Any path that doesn't end in .json loads as JavaScript
		if (filePath.endsWith('.json')) {
			newModule.exports = JSON.parse(sourceCode);
		} else {
			// Reference: https://github.com/nodejs/node/blob/v26.13.0/lib/internal/modules/cjs/loader.js#L1954-L1968
			vm.runInThisContext(Module.wrap(sourceCode), {
				filename: `fs-require://${fsRequireId}${filePath}`,
				lineOffset: 0,
				displayErrors: true,
			})(
				newModule.exports,
				makeRequire(filePath, newModule),
				newModule,
				filePath,
				path.dirname(filePath),
			);
		}
	};

	// Relative paths passed to the returned function resolve from the caller's file
	return makeRequire(callerFilename);
};
