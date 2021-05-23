"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBareSpecifier = exports.isDirectory = exports.hasExtensionPattern = exports.isFilePathPattern = void 0;
exports.isFilePathPattern = /^[./]/;
exports.hasExtensionPattern = /\.\w+$/;
const isDirectory = (fs, directoryPath) => (fs.existsSync(directoryPath)
    && fs.lstatSync(directoryPath).isDirectory());
exports.isDirectory = isDirectory;
const specifierPattern = /^((?:@[\da-z][\w.-]+\/)?[\da-z][\w.-]+)(\/.+)?$/;
const getBareSpecifier = (modulePath) => { var _a; return (_a = modulePath.match(specifierPattern)) === null || _a === void 0 ? void 0 : _a.slice(1, 3); };
exports.getBareSpecifier = getBareSpecifier;
