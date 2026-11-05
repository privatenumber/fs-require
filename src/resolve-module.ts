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

// A non-string or empty package.json#main is ignored, like Node.js does
const loadAsDirectory = (mfs: FileSystemLike, directory: string): string | undefined => {
	const packagePath = path.join(directory, 'package.json');
	if (isFile(mfs, packagePath)) {
		const { main } = JSON.parse(mfs.readFileSync(packagePath).toString());
		if (typeof main === 'string' && main) {
			const mainPath = path.resolve(directory, main);
			return loadAsFile(mfs, mainPath) ?? loadIndex(mfs, mainPath) ?? loadIndex(mfs, directory);
		}
	}

	return loadIndex(mfs, directory);
};

export const resolveModule = (
	mfs: FileSystemLike,
	modulePath: string,
	parentFilename?: string,
): string | undefined => {
	if (!path.isAbsolute(modulePath) && parentFilename) {
		modulePath = path.resolve(path.dirname(parentFilename), modulePath);
	}

	const file = loadAsFile(mfs, modulePath);
	if (file) {
		return file;
	}

	if (mfs.existsSync(modulePath) && mfs.lstatSync(modulePath).isDirectory()) {
		return loadAsDirectory(mfs, modulePath);
	}
};
