import { FileSystemLike, implicitExtensions } from './types';

export const isFilePathPattern = /^[./]/;
export const hasValidExtensionPattern = new RegExp(
	`(${
		implicitExtensions
			.map(extension => extension.replace(/\./g, '\\$&'))
			.join('|')
	})$`,
);

export const isDirectory = (
	fs: FileSystemLike,
	directoryPath: string,
) => (
	fs.lstatSync(directoryPath).isDirectory()
);

const specifierPattern = /^(?:node:)?((?:@[\da-z][\w.-]+\/)?[\da-z][\w.-]+)(\/.+)?$/;
export const getBareSpecifier = (
	modulePath: string,
) => modulePath.match(specifierPattern)?.slice(1, 3);
