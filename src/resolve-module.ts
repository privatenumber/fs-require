import path from 'path';
import {
	type FileSystemLike,
	type LoaderExtension,
	implicitExtensions,
} from './types.ts';

type Resolved = {
	extension: LoaderExtension;
	filePath: string;
};

const implicitExtensionPattern = new RegExp(
	`(${
		implicitExtensions
			.map(extension => extension.replace(/\./g, String.raw`\$&`))
			.join('|')
	})$`,
);

const resolveModuleSafe = (
	mfs: FileSystemLike,
	modulePath: string,
	parentFilename?: string,
): Resolved | null => {
	if (!path.isAbsolute(modulePath) && parentFilename) {
		modulePath = path.resolve(path.dirname(parentFilename), modulePath);
	}

	// Exact match
	if (mfs.existsSync(modulePath)) {
		if (mfs.lstatSync(modulePath).isDirectory()) {
			return (
				resolveModuleSafe(mfs, path.join(modulePath, 'index.js'))
				|| resolveModuleSafe(mfs, path.join(modulePath, 'index.json'))
			);
		}

		const extension = (modulePath.match(implicitExtensionPattern)?.[0] ?? '') as LoaderExtension;
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
};

export const resolveModule = (
	mfs: FileSystemLike,
	modulePath: string,
	parentFilename?: string,
) => {
	const resolved = resolveModuleSafe(mfs, modulePath, parentFilename);

	if (!resolved) {
		throw new Error(`Cannot find module '${modulePath}'`);
	}

	return resolved;
};
