import path from 'path';
import type { FileSystemLike } from './types.ts';

const implicitExtensions = ['.js', '.json'];

/**
 * Resolves a relative or absolute path to an exact file, a directory's
 * index.js or index.json, or the path with an implicit .js or .json extension,
 * in that order
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
