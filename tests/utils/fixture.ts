import path from 'node:path';
import { createFixture, type FileTree } from 'fs-fixture';

const packageRoot = path.resolve(import.meta.dirname, '../..');

/**
 * Creates a project that depends on fs-require, so fixtures load it
 * through package.json#exports like a published install
 */
export const createProject = (fileTree: FileTree) => createFixture({
	...fileTree,
	'node_modules/fs-require': ({ symlink }) => symlink(packageRoot),
});
