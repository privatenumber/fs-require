import path from 'path';
import type { FileSystemLike } from './types.ts';

const implicitExtensions = ['.js', '.json'];

const isFile = (mfs: FileSystemLike, filePath: string) => (
	mfs.existsSync(filePath) && !mfs.lstatSync(filePath).isDirectory()
);

const loadAsFile = (mfs: FileSystemLike, filePath: string): string | undefined => {
	if (isFile(mfs, filePath)) {
		return filePath;
	}

	for (const extension of implicitExtensions) {
		const candidate = filePath + extension;
		if (isFile(mfs, candidate)) {
			return candidate;
		}
	}
};

const loadIndex = (mfs: FileSystemLike, directory: string): string | undefined => {
	for (const extension of implicitExtensions) {
		const candidate = path.join(directory, `index${extension}`);
		if (isFile(mfs, candidate)) {
			return candidate;
		}
	}
};

// Like Node.js, a leading byte order mark is ignored, and a configuration that
// isn't an object is rejected
// Reference: https://github.com/nodejs/node/blob/v26.13.0/src/node_modules.cc#L128-L130
const readPackageConfig = (mfs: FileSystemLike, packagePath: string) => {
	const config: unknown = JSON.parse(mfs.readFileSync(packagePath).toString().replace(/^\uFEFF/, ''));
	if (typeof config !== 'object' || config === null || Array.isArray(config)) {
		throw Object.assign(
			new Error(`Invalid package config ${packagePath}.`),
			{ code: 'ERR_INVALID_PACKAGE_CONFIG' },
		);
	}

	return config as { main?: unknown };
};

// A non-string or empty package.json#main is ignored, like Node.js v26.
// Node.js 12 throws for a non-string main; fs-require keeps one behavior
const loadAsDirectory = (mfs: FileSystemLike, directory: string): string | undefined => {
	const packagePath = path.join(directory, 'package.json');
	if (isFile(mfs, packagePath)) {
		const { main } = readPackageConfig(mfs, packagePath);
		if (typeof main === 'string' && main) {
			const mainPath = path.resolve(directory, main);
			return loadAsFile(mfs, mainPath) ?? loadIndex(mfs, mainPath) ?? loadIndex(mfs, directory);
		}
	}

	return loadIndex(mfs, directory);
};

// A request ending in /, /., or /.. names a directory, so it skips files.
// Checked before normalizing, which removes the trailing separator
// Reference: https://github.com/nodejs/node/blob/v26.13.0/lib/internal/modules/cjs/loader.js#L799-L810
const directoryRequestPattern = /(?:^|\/)\.{0,2}$/;

export const resolveModule = (
	mfs: FileSystemLike,
	modulePath: string,
	parentFilename?: string,
): string | undefined => {
	const isDirectoryRequest = modulePath !== '' && directoryRequestPattern.test(modulePath);

	// Like Node.js, absolute paths are normalized, so aliases such as /a/../b
	// share one cache entry
	if (path.isAbsolute(modulePath)) {
		modulePath = path.resolve(modulePath);
	} else if (parentFilename) {
		modulePath = path.resolve(path.dirname(parentFilename), modulePath);
	}

	if (!isDirectoryRequest) {
		const file = loadAsFile(mfs, modulePath);
		if (file) {
			return file;
		}
	}

	if (mfs.existsSync(modulePath) && mfs.lstatSync(modulePath).isDirectory()) {
		return loadAsDirectory(mfs, modulePath);
	}
};
