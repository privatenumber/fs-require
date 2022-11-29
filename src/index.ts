import vm from 'vm';
import path from 'path';
import Module from 'module';
import {
	Options,
	FileSystemLike,
	fsRequire,
	Loaders,
	ModuleCache,
} from './types';
import { isBareSpecifier, resolveBareSpecifier } from './utils/resolve-bare-specifier';
import { resolveModule } from './utils/resolve-module';

export type { FileSystemLike as FileSystem };

const loaders: Loaders = { /*
	loaderes are organized like this to keep them anonymous
	in the call stack, like how the native loders behave.
*/
	'': undefined,
	'.js': undefined,
	'.json': undefined,
};

/**
 * Extensionless JS files
 */
loaders[''] = function (newModule, sourceCode, makeRequire, filename, id) {
	const moduleWrappedSourceCode = Module.wrap(sourceCode);

	// Reference: https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js#L1028
	vm.runInThisContext(moduleWrappedSourceCode, {
		filename: `fs-require://${id}${filename}`,
		lineOffset: 0,
		displayErrors: true,
	})(
		newModule.exports,
		makeRequire!(newModule),
		newModule,
		path.basename(filename!),
		path.dirname(filename!),
	);
};

loaders['.js'] = loaders[''];

loaders['.json'] = function (newModule, sourceCode) {
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

	function makeRequireFunction(parentModule?: Module | null): fsRequire {
		const resolve = (modulePath: string) => {
			if (isBareSpecifier(modulePath)) {
				return modulePath;
			}
			const resolved = resolveModule(mfs, modulePath, parentModule);
			return resolved.filePath;
		};

		const require: fsRequire = (modulePath: string) => {
			if (isBareSpecifier(modulePath)) {
				return resolveBareSpecifier(mfs, modulePath, options);
			}

			const resolvedPath = resolveModule(mfs, modulePath, parentModule);
			const { filePath } = resolvedPath;

			let importedModule = moduleCache[filePath];

			if (!importedModule) {
				importedModule = new Module(filePath, parentModule || undefined);
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
	}

	return makeRequireFunction(typeof module === 'undefined' ? undefined : module.parent);
};
