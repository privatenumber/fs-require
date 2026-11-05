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
		const resolveFilePath = (
			modulePath: string,
			stackStartFunction: (...arguments_: never[]) => unknown,
		) => {
			const filePath = resolveModule(mfs, modulePath, parentFilename);
			if (!filePath) {
				throw createModuleNotFoundError(modulePath, stackStartFunction);
			}
			return filePath;
		};

		const resolve = (modulePath: string) => (
			isBareSpecifier(modulePath)
				? modulePath
				: resolveFilePath(modulePath, resolve)
		);

		const require: fsRequire = (modulePath: string) => {
			if (isBareSpecifier(modulePath)) {
				return resolveBareSpecifier(mfs, modulePath, options, callerRequire, require);
			}

			const filePath = resolveFilePath(modulePath, require);
			let cachedModule = moduleCache[filePath];
			if (!cachedModule) {
				// Read here, not in loadModule(), to keep file-system errors one frame from the caller
				const sourceCode = mfs.readFileSync(filePath).toString();
				cachedModule = loadModule(filePath, sourceCode, parentModule);
				moduleCache[filePath] = cachedModule;
			}

			return cachedModule.exports;
		};

		require.id = fsRequireId;
		require.resolve = resolve;
		require.cache = moduleCache;

		return require;
	};

	const loadModule = (
		filePath: string,
		sourceCode: string,
		parentModule?: Module,
	) => {
		const newModule = new Module(filePath, parentModule);
		newModule.filename = filePath;

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

		return newModule;
	};

	// Relative paths passed to the returned function resolve from the caller's file
	return makeRequire(callerFilename);
};
