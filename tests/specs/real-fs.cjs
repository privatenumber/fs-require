const fs = require('fs');
const { createFsRequire } = require('#fs-require');

const fsRequire = createFsRequire(fs);
const testFile = fsRequire('../fixtures/test-file');
process.stdout.write(testFile());
