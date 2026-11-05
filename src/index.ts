import vm from 'vm';
import path from 'path';
import Module from 'module';
import type {
	Options,
	FileSystemLike,
	fsRequire,
	Loaders,
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

// Loaders are assigned after creation to keep them anonymous in stack traces
const loaders: Loaders = {
	'': undefined,
	'.js': undefined,
	'.json': undefined,
};

/**
 * Extensionless JS files
 */
// eslint-disable-next-line unicorn/no-immediate-mutation -- Keeps the function anonymous
loaders[''] = (newModule, sourceCode, makeRequire, filename, id) => {
	const moduleWrappedSourceCode = Module.wrap(sourceCode);

	// Reference: https://github.com/nodejs/node/blob/v26.13.0/lib/internal/modules/cjs/loader.js#L1954-L1968
	vm.runInThisContext(moduleWrappedSourceCode, {
		filename: `fs-require://${id}${filename}`,
		lineOffset: 0,
		displayErrors: true,
	})(
		newModule.exports,
		makeRequire(newModule),
		newModule,
		path.basename(filename),
		path.dirname(filename),
	);
};

loaders['.js'] = loaders[''];

loaders['.json'] = (newModule, sourceCode) => {
	newModule.exports = JSON.parse(sourceCode);
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

	const makeRequireFunction = (
		parentModule?: Module,
		parentFilename = parentModule?.filename,
	): fsRequire => {
		const resolve = (modulePath: string) => {
			if (isBareSpecifier(modulePath)) {
				return modulePath;
			}
			const resolved = resolveModule(mfs, modulePath, parentFilename);
			if (!resolved) {
				throw createModuleNotFoundError(modulePath, resolve);
			}
			return resolved.filePath;
		};

		const require: fsRequire = (modulePath: string) => {
			if (isBareSpecifier(modulePath)) {
				return resolveBareSpecifier(mfs, modulePath, options, callerRequire, require);
			}

			const resolvedPath = resolveModule(mfs, modulePath, parentFilename);
			if (!resolvedPath) {
				throw createModuleNotFoundError(modulePath, require);
			}
			const { filePath } = resolvedPath;

			let importedModule = moduleCache[filePath];

			if (!importedModule) {
				importedModule = new Module(filePath, parentModule);
				importedModule.filename = filePath;

				const sourceCode = mfs.readFileSync(filePath).toString();
				loaders[resolvedPath.extension]?.(
					importedModule,
					sourceCode,
					makeRequireFunction,
					filePath,
					fsRequireId,
				);

				moduleCache[filePath] = importedModule;
			}

			return importedModule.exports;
		};

		require.id = fsRequireId;
		require.resolve = resolve;
		require.cache = moduleCache;

		return require;
	};

	// Relative paths passed to the returned function resolve from the caller's file
	return makeRequireFunction(undefined, callerFilename);
};
