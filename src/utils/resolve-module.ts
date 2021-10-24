import path from 'path';
import Module from 'module';
import {
	FileSystemLike,
	implicitExtensions,
	loaderTypes,
} from '../types';
import {
	hasValidExtensionPattern,
	isDirectory,
} from '.';

type Resolved = {
	extension: (typeof loaderTypes)[number];
	filePath: string;
}

function resolveModuleSafe(
	mfs: FileSystemLike,
	parentModule: Module,
	modulePath: string,
): Resolved | null {
	// Absolute path
	modulePath = path.resolve(path.dirname(parentModule.filename), modulePath);

	// Exact match
	if (mfs.existsSync(modulePath)) {
		if (isDirectory(mfs, modulePath)) {
			return (
				resolveModuleSafe(mfs, parentModule, path.join(modulePath, 'index.js'))
				|| resolveModuleSafe(mfs, parentModule, path.join(modulePath, 'index.json'))
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
	parentModule: Module,
	modulePath: string,
) {
	const resolved = resolveModuleSafe(mfs, parentModule, modulePath);

	if (!resolved) {
		throw new Error(`Cannot find module '${modulePath}'`);
	}

	return resolved;
}
