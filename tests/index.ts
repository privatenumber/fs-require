import { describe } from 'manten';
import getNode from 'get-node';
import { packageSpec } from './specs/package.ts';

describe('fs-require', () => {
	import('./specs/fs-require.ts');
	import('./specs/resolve.ts');

	describe(`Node.js ${process.version}`, () => {
		packageSpec(process.execPath);
	});

	// The oldest version in package.json#engines. CI only, because Node.js
	// has no darwin-arm64 binaries before v16
	if (process.env.CI) {
		describe('Node.js 12.22.12', async () => {
			const node = await getNode('12.22.12');
			packageSpec(node.path);
		});
	}
});
