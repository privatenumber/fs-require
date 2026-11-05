import path from 'path';
import type { FileSystemLike } from './types.ts';

const implicitExtensions = ['.js', '.json'];

const trailingSeparatorPattern = path.sep === '\\' ? /[/\\]+$/ : /\/+$/;

/**
 * Like path.resolve(), but a relative base stays relative, so the file-system
 * resolves the result from its own working directory. A relative result keeps
 * a ./ prefix, so passing it back to fsRequire() isn't read as a package name
 */
const resolvePath = (base: string, request: string) => {
	if (path.isAbsolute(base) || path.isAbsolute(request)) {
		return path.resolve(base, request);
	}

	// path.join() keeps a trailing separator that path.resolve() removes
	const joined = path.join(base, request).replace(trailingSeparatorPattern, '');
	return joined.startsWith('.') ? joined : `.${path.sep}${joined}`;
};

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

const createInvalidPackageConfigError = (
	packagePath: string,
	cause?: unknown,
) => Object.assign(
	new Error(`Invalid package config ${packagePath}.`),
	{
		code: 'ERR_INVALID_PACKAGE_CONFIG',
		cause,
	},
);

// Like Node.js, a read failure is also an invalid package config
// Reference: https://github.com/nodejs/node/blob/v26.13.0/src/node_modules.cc#L250-L263
const parsePackageConfig = (mfs: FileSystemLike, packagePath: string): unknown => {
	try {
		return JSON.parse(mfs.readFileSync(packagePath).toString().replace(/^\uFEFF/, ''));
	} catch (error) {
		throw createInvalidPackageConfigError(packagePath, error);
	}
};

// Like Node.js, a leading byte order mark is ignored, and malformed JSON or a
// configuration that isn't an object throws ERR_INVALID_PACKAGE_CONFIG.
// Unlike Node.js, fields other than main, such as name and type, aren't validated
// Reference: https://github.com/nodejs/node/blob/v26.13.0/src/node_modules.cc#L128-L130
const readPackageConfig = (mfs: FileSystemLike, packagePath: string) => {
	const config = parsePackageConfig(mfs, packagePath);
	if (typeof config !== 'object' || config === null || Array.isArray(config)) {
		throw createInvalidPackageConfigError(packagePath);
	}

	return config as { main?: unknown };
};

// A non-string or empty package.json#main is ignored, like Node.js v26.
// Node.js 12 also ignores a falsy main, but throws for a truthy non-string
// one, such as 5. fs-require keeps the v26 behavior on every runtime
const loadAsDirectory = (mfs: FileSystemLike, directory: string): string | undefined => {
	const packagePath = path.join(directory, 'package.json');
	if (isFile(mfs, packagePath)) {
		const { main } = readPackageConfig(mfs, packagePath);
		if (typeof main === 'string' && main) {
			const mainPath = resolvePath(directory, main);
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

	// Like Node.js, paths are normalized, so aliases such as /a/../b share one
	// cache entry. Without a caller file, the entry and the modules it loads have
	// relative filenames, which stay relative
	modulePath = resolvePath(parentFilename ? path.dirname(parentFilename) : '', modulePath);

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
