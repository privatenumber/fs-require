import { FileSystemLike, implicitExtensions } from '../types';

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
) => fs.lstatSync(directoryPath).isDirectory();
