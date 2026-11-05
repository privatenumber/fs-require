// Matches the error that Node.js require() throws for a missing module
export const createModuleNotFoundError = (request: string) => Object.assign(
	new Error(`Cannot find module '${request}'`),
	{ code: 'MODULE_NOT_FOUND' },
);
