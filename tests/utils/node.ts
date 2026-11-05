import spawn, { type Options } from 'nano-spawn';

/**
 * Runs files with a Node.js binary. The binary is resolved on the first run,
 * so skipped groups don't download it
 */
export const createNode = (
	getNodePath: () => string | Promise<string>,
) => {
	let nodePath: Promise<string> | undefined;

	return async (
		filePath: string,
		options?: Options,
	) => {
		nodePath ??= Promise.resolve(getNodePath());
		return spawn(await nodePath, [filePath], options);
	};
};

export type Node = ReturnType<typeof createNode>;
