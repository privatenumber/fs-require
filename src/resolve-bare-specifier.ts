import type { Options, FileSystemLike } from './types.ts';
import { createModuleNotFoundError } from './utils/module-not-found-error.ts';

const isFilePathPattern = /^[./]/;
export const isBareSpecifier = (modulePath: string) => !isFilePathPattern.test(modulePath);

const specifierPattern = /^(?:node:)?((?:@[\da-z][\w.-]+\/)?[\da-z][\w.-]+)(\/.+)?$/;
const parseBareSpecifier = (
	modulePath: string,
) => modulePath.match(specifierPattern)?.slice(1, 3);

const realRequire = require;

export const resolveBareSpecifier = (
	mfs: FileSystemLike,
	modulePath: string,
	options: Options | undefined,
	stackStartFunction: (...arguments_: never[]) => unknown,
) => {
	const [moduleName, moduleSubpath] = parseBareSpecifier(modulePath) ?? [];

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

			throw createModuleNotFoundError(modulePath, stackStartFunction);
		}
	}

	return realRequire(modulePath);
};
