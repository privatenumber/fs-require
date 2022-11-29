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
	modulePath: string,
	parentModule?: Module | null,
): Resolved | null {
	// Absolute path
	if (!path.isAbsolute(modulePath) && parentModule) {
		modulePath = path.resolve(path.dirname(parentModule.filename), modulePath);
	}

	// Exact match
	if (mfs.existsSync(modulePath)) {
		if (isDirectory(mfs, modulePath)) {
			return (
				resolveModuleSafe(mfs, path.join(modulePath, 'index.js'), parentModule)
				|| resolveModuleSafe(mfs, path.join(modulePath, 'index.json'), parentModule)
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
	parentModule?: Module | null,
) {
	const resolved = resolveModuleSafe(mfs, modulePath, parentModule);

	if (!resolved) {
		throw new Error(`Cannot find module '${modulePath}'`);
	}

	return resolved;
}
