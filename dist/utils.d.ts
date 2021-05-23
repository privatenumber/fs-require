import { FileSystem } from './types';
export declare const isFilePathPattern: RegExp;
export declare const hasExtensionPattern: RegExp;
export declare const isDirectory: (fs: FileSystem, directoryPath: string) => boolean;
export declare const getBareSpecifier: (modulePath: string) => string[] | undefined;
