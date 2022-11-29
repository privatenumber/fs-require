import { describe } from 'manten';

describe('fs-require', ({ runTestSuite }) => {
	runTestSuite(import('./specs/fs-require.js'));
	runTestSuite(import('./specs/resolve.js'));

	// eslint-disable-next-line import/extensions
	runTestSuite(import('./specs/module.mjs'));
});
