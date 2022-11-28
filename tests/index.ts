import { describe } from 'manten';

describe('fs-require', ({ runTestSuite }) => {
	runTestSuite(import('./specs/fs-require'));
	runTestSuite(import('./specs/resolve'));
});
