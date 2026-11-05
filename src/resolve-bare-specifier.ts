import { createRequire } from 'module';
import path from 'path';
import type { Options, FileSystemLike } from './types.ts';
import { createModuleNotFoundError } from './utils/module-not-found-error.ts';

const isFilePathPattern = /^[./]/;
export const isBareSpecifier = (modulePath: string) => (
	!isFilePathPattern.test(modulePath) && !path.isAbsolute(modulePath)
);

// fs, node:fs, and their subpaths, such as fs/promises
const fsSpecifierPattern = /^(?:node:)?fs(\/.+)?$/;

/**
 * Bare specifiers resolve from the createFsRequire() caller, like relative
 * paths. Without a caller file, they resolve from fs-require itself
 */
export const createCallerRequire = (
	callerFilename: string | undefined,
) => (callerFilename ? createRequire(callerFilename) : require);

export const resolveBareSpecifier = (
	mfs: FileSystemLike,
	modulePath: string,
	options: Options | undefined,
	callerRequire: NodeJS.Require,
	stackStartFunction: (...arguments_: never[]) => unknown,
) => {
	const fsSpecifier = modulePath.match(fsSpecifierPattern);
	const fsOption = fsSpecifier ? options?.fs : undefined;

	// `fs: true` loads the real fs module
	if (fsSpecifier && fsOption !== true) {
		const shimFs = fsOption || mfs;
		const subpath = fsSpecifier[1];

		if (!subpath) {
			return shimFs;
		}

		if (subpath === '/promises' && ('promises' in shimFs)) {
			return shimFs.promises;
		}

		throw createModuleNotFoundError(modulePath, stackStartFunction);
	}

	return callerRequire(modulePath);
};
