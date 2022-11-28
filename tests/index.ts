import { describe } from 'manten';

describe('fs-require', ({ runTestSuite }) => {
	runTestSuite(import('./specs/fs-require.js'));
	runTestSuite(import('./specs/resolve.js'));
});
