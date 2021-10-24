import vm from 'vm';
import path from 'path';
import Module from 'module';
import {
	FileSystemLike,
	fsRequire,
	Loaders,
	implicitExtensions,
	loaderTypes,
} from './types';
import {
	isFilePathPattern,
	hasValidExtensionPattern,
	getBareSpecifier,
	isDirectory,
} from './utils';

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

type Resolved = {
	extension: (typeof loaderTypes)[number];
	filePath: string;
}

function resolve(
	fs: FileSystemLike,
	filePath: string,
): Resolved | null {
	// Exact match
	if (fs.existsSync(filePath)) {
		if (isDirectory(fs, filePath)) {
			return (
				resolve(fs, path.join(filePath, 'index.js'))
				|| resolve(fs, path.join(filePath, 'index.json'))
			);
		}

		const extension = (filePath.match(hasValidExtensionPattern)?.[0] ?? '') as Resolved['extension'];
		return {
			extension,
			filePath,
		};
	}

	// Try extensions
	for (const extension of implicitExtensions) {
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

type Options = {
	fs?: boolean | FileSystemLike;
};

export const createFsRequire = (
	mfs: FileSystemLike,
	options?: Options,
) => {
	idCounter += 1;
	const fsRequireId = idCounter;
	const moduleCache = new Map<string, Module>();

	function makeRequireFunction(parentModule: Module): fsRequire {
		const require = (modulePath: string) => {
			if (!isFilePathPattern.test(modulePath)) {
				const [moduleName, moduleSubpath] = getBareSpecifier(modulePath) ?? [];

				if (moduleName === 'fs') {
					const { fs } = options ?? {};

					// If true, use native fs (can still be truthy)
					if (fs !== true) {
						const shimFs = fs || mfs;

						if (!moduleSubpath) {
							return shimFs;
						}

						if (moduleSubpath === '/promises' && ('promises' in shimFs)) {
							return shimFs.promises;
						}

						throw new Error(`Cannot find module '${modulePath}'`);
					}
				}

				return realRequire(modulePath);
			}

			let filePath = path.resolve(path.dirname(parentModule.filename), modulePath);

			const resolvedPath = resolve(mfs, filePath);

			if (!resolvedPath) {
				throw new Error(`Cannot find module '${modulePath}'`);
			}

			filePath = resolvedPath.filePath;

			if (moduleCache.has(filePath)) {
				return moduleCache.get(filePath)!.exports;
			}

			const newModule = new Module(filePath, parentModule);
			newModule.filename = filePath;

			const sourceCode = mfs.readFileSync(filePath).toString();
			loaders[resolvedPath.extension]?.(
				newModule,
				sourceCode,
				makeRequireFunction,
				filePath,
				fsRequireId,
			);

			moduleCache.set(filePath, newModule);

			return newModule.exports;
		};

		require.id = fsRequireId;

		return require;
	}

	// @ts-expect-error parent is deprecated
	return makeRequireFunction(module.parent);
};
