import { createRequire } from 'module';
import type { Options, FileSystemLike } from './types.ts';
import { createModuleNotFoundError } from './utils/module-not-found-error.ts';

const isFilePathPattern = /^[./]/;
export const isBareSpecifier = (modulePath: string) => !isFilePathPattern.test(modulePath);

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
	const { fs } = options ?? {};

	// `fs: true` loads the real fs module
	if (fs !== true) {
		const shimFs = fs || mfs;
		const moduleName = modulePath.replace(/^node:/, '');

		if (moduleName === 'fs') {
			return shimFs;
		}

		if (moduleName === 'fs/promises' && ('promises' in shimFs)) {
			return shimFs.promises;
		}

		if (moduleName.startsWith('fs/')) {
			throw createModuleNotFoundError(modulePath, stackStartFunction);
		}
	}

	return callerRequire(modulePath);
};
