import Module from 'module';

type Options = {
    fs?: boolean | FileSystemLike;
};
interface FileSystemLike {
    readFileSync: (path: string, options?: Record<string, unknown>) => string | Buffer;
    existsSync: (path: string) => boolean;
    lstatSync: (path: string) => {
        isDirectory: () => boolean;
    };
    promises?: unknown;
}
type ModuleCache = Record<string, Module>;
type fsRequire = {
    (modulePath: string): any;
    resolve: (modulePath: string) => string;
    id: number;
    cache: ModuleCache;
};

declare const createFsRequire: (mfs: FileSystemLike, options?: Options) => fsRequire;

export { FileSystemLike as FileSystem, createFsRequire, fsRequire };
