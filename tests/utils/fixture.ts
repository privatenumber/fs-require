import path from 'node:path';
import type { FileTree } from 'fs-fixture';

const packageRoot = path.resolve(import.meta.dirname, '../..');

/**
 * Links fs-require into a fixture's node_modules, so the fixture loads it
 * through package.json#exports like a published install
 */
export const installFsRequire = (): FileTree => ({
	'node_modules/fs-require': ({ symlink }) => symlink(packageRoot),
});
