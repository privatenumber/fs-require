import { FileSystemLike } from './types';

export const isFilePathPattern = /^[./]/;
export const hasExtensionPattern = /\.\w+$/;

export const isDirectory = (
	fs: FileSystemLike,
	directoryPath: string,
) => (
	fs.existsSync(directoryPath)
	&& fs.lstatSync(directoryPath).isDirectory()
);

const specifierPattern = /^(?:node:)?((?:@[\da-z][\w.-]+\/)?[\da-z][\w.-]+)(\/.+)?$/;
export const getBareSpecifier = (
	modulePath: string,
) => modulePath.match(specifierPattern)?.slice(1, 3);
