import vm from 'vm';
import path from 'path';
import Module from 'module';
import {
	FileSystem,
	fsRequire,
	Loaders,
	loaderTypes,
} from './types';
import {
	isFilePathPattern,
	hasExtensionPattern,
	getBareSpecifier,
	isDirectory,
} from './utils';

export type { FileSystem };

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
 * Takes priority over .js file
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

function resolveImplicitExtension(
	fs: FileSystem,
	filePath: string,
) {
	for (const extension of loaderTypes) {
		const filePathWithExtension = filePath + extension;
		if (fs.existsSync(filePathWithExtension)) {
			return {
				extension,
				filePath: filePathWithExtension,
			};
		}
	}
	return null;
}

const realRequire = require;

let idCounter = 0;

export const createFsRequire = (mfs: FileSystem) => {
	idCounter += 1;
	const fsRequireId = idCounter;
	const moduleCache = new Map<string, Module>();

	function makeRequireFunction(parentModule: Module): fsRequire {
		const require = (modulePath: string) => {
			if (!isFilePathPattern.test(modulePath)) {
				const [moduleName, moduleSubpath] = getBareSpecifier(modulePath) ?? [];
				if (moduleName === 'fs') {
					if (moduleSubpath) {
						throw new Error(`Cannot find module '${modulePath}'`);
					}
					return mfs;
				}

				return realRequire(modulePath);
			}

			let filename = path.resolve(path.dirname(parentModule.filename), modulePath);
			let pathExtension = filename.match(hasExtensionPattern)?.[0];

			if (!pathExtension) {
				const resolvedPath = isDirectory(mfs, filename)
					? resolveImplicitExtension(mfs, path.join(filename, 'index'))
					: resolveImplicitExtension(mfs, filename);

				if (!resolvedPath) {
					throw new Error(`Cannot find module '${modulePath}'`);
				}

				filename = resolvedPath.filePath;
				pathExtension = resolvedPath.extension;
			}

			if (moduleCache.has(filename)) {
				return moduleCache.get(filename)!.exports;
			}

			const newModule = new Module(filename, parentModule);
			newModule.filename = filename;

			const sourceCode = mfs.readFileSync(filename).toString();
			loaders[pathExtension](newModule, sourceCode, makeRequireFunction, filename, fsRequireId);

			moduleCache.set(filename, newModule);

			return newModule.exports;
		};

		require.id = fsRequireId;

		return require;
	}

	// @ts-expect-error parent is deprecated
	return makeRequireFunction(module.parent);
};
