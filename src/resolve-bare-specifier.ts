import { createRequire } from 'module';
import type { Options, FileSystemLike } from './types.ts';
import { createModuleNotFoundError } from './utils/module-not-found-error.ts';

const isFilePathPattern = /^[./]/;
export const isBareSpecifier = (modulePath: string) => !isFilePathPattern.test(modulePath);

// fs, node:fs, and their subpaths, such as fs/promises
const fsSpecifierPattern = /^(?:node:)?fs(\/.+)?$/;

/**
 * Bare specifiers resolve from the createFsRequire() caller, like relative
 * paths. Without a caller file, they resolve from fs-require itself
 */
export const createCallerRequire = (
	callerFilename: string | undefined,
) => (callerFilename ? createRequire(callerFilename) : require);

/**
 * Returns the fs shim module for an fs specifier: the file-system itself, or
 * its `promises`. Returns `null` for a specifier that isn't shimmed, and
 * `undefined` for an fs subpath the shim doesn't provide
 */
const getFsShim = (
	mfs: FileSystemLike,
	modulePath: string,
	options: Options | undefined,
) => {
	const fsSpecifier = modulePath.match(fsSpecifierPattern);

	// `fs: true` loads the real fs module
	if (!fsSpecifier || options?.fs === true) {
		return null;
	}

	const shimFs = options?.fs || mfs;
	const subpath = fsSpecifier[1];

	if (!subpath) {
		return shimFs;
	}

	if (subpath === '/promises' && ('promises' in shimFs)) {
		return shimFs.promises;
	}
};

export const requireBareSpecifier = (
	mfs: FileSystemLike,
	modulePath: string,
	options: Options | undefined,
	callerRequire: NodeJS.Require,
	stackStartFunction: (...arguments_: never[]) => unknown,
) => {
	const fsShim = getFsShim(mfs, modulePath, options);
	if (fsShim === null) {
		return callerRequire(modulePath);
	}

	if (fsShim === undefined) {
		throw createModuleNotFoundError(modulePath, stackStartFunction);
	}

	return fsShim;
};

/**
 * Checks that a bare specifier resolves, and returns it unchanged.
 * The resolved path can't be returned, because fsRequire() reads absolute
 * paths from the virtual file-system instead of loading the real package.
 * See notes/fs-require/bare-specifier-resolution.md
 */
export const resolveBareSpecifier = (
	mfs: FileSystemLike,
	modulePath: string,
	options: Options | undefined,
	callerRequire: NodeJS.Require,
	stackStartFunction: (...arguments_: never[]) => unknown,
) => {
	const fsShim = getFsShim(mfs, modulePath, options);
	if (fsShim === null) {
		callerRequire.resolve(modulePath);
	} else if (fsShim === undefined) {
		throw createModuleNotFoundError(modulePath, stackStartFunction);
	}

	return modulePath;
};
