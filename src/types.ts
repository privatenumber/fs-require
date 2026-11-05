import type Module from 'module';

export type Options = {
	fs?: boolean | FileSystemLike;
};

type Stats = {
	isDirectory: () => boolean;
};

// These are the only methods fs-require needs to use
export type FileSystemLike = {
	readFileSync: (
		path: string,
		options?: Record<string, unknown>,
	) => string | Buffer;
	existsSync: (path: string) => boolean;
	lstatSync: (path: string) => Stats;
	promises?: unknown;
};

export type ModuleCache = Record<string, Module>;
export type fsRequire = {
	// Matches the return type of Node.js require()
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(modulePath: string): any;
	resolve: (modulePath: string) => string;
	id: number;
	cache: ModuleCache;
};
