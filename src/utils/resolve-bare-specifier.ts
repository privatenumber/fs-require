import { Options, FileSystemLike } from '../types';

const isFilePathPattern = /^[./]/;
export const isBareSpecifier = (modulePath: string) => !isFilePathPattern.test(modulePath);

const specifierPattern = /^(?:node:)?((?:@[\da-z][\w.-]+\/)?[\da-z][\w.-]+)(\/.+)?$/;
const parseBareSpecifier = (
	modulePath: string,
) => modulePath.match(specifierPattern)?.slice(1, 3);

const realRequire = require;

export function resolveBareSpecifier(
	mfs: FileSystemLike,
	modulePath: string,
	options?: Options,
) {
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

			throw new Error(`Cannot find module '${modulePath}'`);
		}
	}

	return realRequire(modulePath);
}
