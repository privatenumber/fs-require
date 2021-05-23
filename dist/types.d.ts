/// <reference types="node" />
import Module from 'module';
export interface FileSystem {
    readFileSync: (path: string, options?: Record<string, unknown>) => string | Buffer;
    existsSync: (path: string) => boolean;
    lstatSync: (path: string) => {
        isDirectory: () => boolean;
    };
}
export declare type fsRequire = {
    (modulePath: string): any;
    id: number;
};
export declare const loaderTypes: readonly ["", ".js", ".json"];
export declare type Loaders = {
    [key in typeof loaderTypes[number]]: undefined | ((newModule: Module, sourceCode: string, makeRequire?: (parentModule: Module) => fsRequire, filename?: string, id?: number) => void);
};
