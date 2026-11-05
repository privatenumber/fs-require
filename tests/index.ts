import { describe, skip } from 'manten';
import getNode from 'get-node';
import { createNode } from './utils/node.ts';
import { packageSpec } from './specs/package.ts';

// The oldest version is the build target in package.json#scripts.build
const nodeVersions = ['12.22.12', '14', '16', '18', '20', '22', '24'];

describe('fs-require', () => {
	import('./specs/fs-require.ts');
	import('./specs/resolve.ts');

	describe(`Node.js ${process.version}`, () => {
		packageSpec(createNode(() => process.execPath));
	});

	for (const version of nodeVersions) {
		describe(`Node.js ${version}`, () => {
			if (
				process.platform === 'darwin'
				&& process.arch === 'arm64'
				&& Number.parseInt(version, 10) < 16
			) {
				skip('Node.js has no darwin-arm64 build before v16');
			}

			packageSpec(createNode(async () => {
				const node = await getNode(version);
				return node.path;
			}));
		});
	}
});
