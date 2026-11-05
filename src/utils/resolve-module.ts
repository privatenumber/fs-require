import path from 'path';
import {
	type FileSystemLike,
	implicitExtensions,
	type loaderTypes,
} from '../types.ts';
import {
	hasValidExtensionPattern,
	isDirectory,
} from './index.ts';

type Resolved = {
	extension: (typeof loaderTypes)[number];
	filePath: string;
}

function resolveModuleSafe(
	mfs: FileSystemLike,
	modulePath: string,
	parentFilename?: string,
): Resolved | null {
	if (!path.isAbsolute(modulePath) && parentFilename) {
		modulePath = path.resolve(path.dirname(parentFilename), modulePath);
	}

	// Exact match
	if (mfs.existsSync(modulePath)) {
		if (isDirectory(mfs, modulePath)) {
			return (
				resolveModuleSafe(mfs, path.join(modulePath, 'index.js'), parentFilename)
				|| resolveModuleSafe(mfs, path.join(modulePath, 'index.json'), parentFilename)
			);
		}

		const extension = (modulePath.match(hasValidExtensionPattern)?.[0] ?? '') as Resolved['extension'];
		return {
			extension,
			filePath: modulePath,
		};
	}

	// Try extensions
	for (const extension of implicitExtensions) {
		const filePathWithExtension = modulePath + extension;
		if (mfs.existsSync(filePathWithExtension)) {
			return {
				extension,
				filePath: filePathWithExtension,
			};
		}
	}

	return null;
}

export function resolveModule(
	mfs: FileSystemLike,
	modulePath: string,
	parentFilename?: string,
) {
	const resolved = resolveModuleSafe(mfs, modulePath, parentFilename);

	if (!resolved) {
		throw new Error(`Cannot find module '${modulePath}'`);
	}

	return resolved;
}
