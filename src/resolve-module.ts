import path from 'path';
import type { FileSystemLike } from './types.ts';

const implicitExtensions = ['.js', '.json'];

/**
 * Resolves a relative or absolute path. An existing file resolves to itself,
 * and an existing directory to its index.js or index.json, each resolved by
 * these rules. Otherwise, the path with .js or .json appended
 */
export const resolveModule = (
	mfs: FileSystemLike,
	modulePath: string,
	parentFilename?: string,
): string | undefined => {
	if (!path.isAbsolute(modulePath) && parentFilename) {
		modulePath = path.resolve(path.dirname(parentFilename), modulePath);
	}

	if (mfs.existsSync(modulePath)) {
		if (mfs.lstatSync(modulePath).isDirectory()) {
			return (
				resolveModule(mfs, path.join(modulePath, 'index.js'))
				?? resolveModule(mfs, path.join(modulePath, 'index.json'))
			);
		}

		return modulePath;
	}

	for (const extension of implicitExtensions) {
		const filePath = modulePath + extension;
		if (mfs.existsSync(filePath)) {
			return filePath;
		}
	}
};
