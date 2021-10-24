import Module from 'module';

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

export type fsRequire = {
	(modulePath: string): any;
	id: number;
};

export const loaderTypes = ['', '.js', '.json'] as const;

export type Loaders = {
	[key in typeof loaderTypes[number]]: undefined | ((
		newModule: Module,
		sourceCode: string,
		makeRequire?: (parentModule: Module) => fsRequire,
		filename?: string,
		id?: number,
	) => void);
};
