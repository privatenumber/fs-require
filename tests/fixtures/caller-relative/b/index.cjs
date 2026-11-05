const fs = require('fs');
const { createFsRequire } = require('#fs-require');

module.exports = createFsRequire(fs)('./file');
