import Module from 'module';

export type Options = {
	fs?: boolean | FileSystemLike;
};

// These are the only methods fs-require needs to use
export interface FileSystemLike {
	readFileSync: (
		path: string,
		options?: Record<string, unknown>,
	) => string | Buffer;
	existsSync: (path: string) => boolean;
	lstatSync: (path: string) => {
		isDirectory: () => boolean;
	};
	promises?: unknown;
}

export type ModuleCache = Record<string, Module>;
export type fsRequire = {
	(modulePath: string): any;
	resolve: (modulePath: string) => string;
	id: number;
	cache: ModuleCache;
};

export const implicitExtensions = ['.js', '.json'] as const;
export const loaderTypes = ['', ...implicitExtensions] as const;

export type Loaders = {
	[key in typeof loaderTypes[number]]: undefined | ((
		newModule: Module,
		sourceCode: string,
		makeRequire?: (parentModule: Module) => fsRequire,
		filename?: string,
		id?: number,
	) => void);
};
