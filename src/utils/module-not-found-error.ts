/**
 * Matches the error that Node.js require() throws for a missing module.
 * The stack starts at the caller of `stackStartFunction`, so it points to the
 * require() call instead of fs-require's internals
 */
export const createModuleNotFoundError = (
	request: string,
	stackStartFunction: (...arguments_: never[]) => unknown,
) => {
	const error = Object.assign(
		new Error(`Cannot find module '${request}'`),
		{ code: 'MODULE_NOT_FOUND' },
	);
	Error.captureStackTrace(error, stackStartFunction);
	return error;
};
