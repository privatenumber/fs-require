import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Returns the path of the file that called `function_`, or `undefined` when
 * the caller has no file (e.g. `node -e`, the REPL, or a vm script).
 *
 * `module.parent` can't be used because it's the first module that loaded
 * fs-require, not the caller, and it's `undefined` when loaded from ESM.
 * See notes/fs-require/caller-relative-resolution.md
 */
export const getCallerFilename = (
	function_: (...arguments_: never[]) => unknown,
) => {
	const { prepareStackTrace, stackTraceLimit } = Error;
	let fileName: string | null | undefined;
	try {
		Error.prepareStackTrace = (_, callSites) => callSites;
		Error.stackTraceLimit = 1;

		const holder = {} as { stack: NodeJS.CallSite[] };
		Error.captureStackTrace(holder, function_);

		// Reading `stack` invokes `prepareStackTrace`, so it must happen before restoring it
		fileName = holder.stack[0]?.getFileName();
	} finally {
		Error.prepareStackTrace = prepareStackTrace;
		Error.stackTraceLimit = stackTraceLimit;
	}

	// ESM callers report file URLs
	if (fileName?.startsWith('file:')) {
		return fileURLToPath(fileName);
	}

	// Non-file callers report names like `[eval]` or a vm script's filename
	if (fileName && path.isAbsolute(fileName)) {
		return fileName;
	}
};
