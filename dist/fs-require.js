"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFsRequire = void 0;
const vm_1 = __importDefault(require("vm"));
const path_1 = __importDefault(require("path"));
const module_1 = __importDefault(require("module"));
const types_1 = require("./types");
const utils_1 = require("./utils");
const loaders = {
    '': undefined,
    '.js': undefined,
    '.json': undefined,
};
/**
 * Extensionless JS files
 * Takes priority over .js file
 */
loaders[''] = function (newModule, sourceCode, makeRequire, filename, id) {
    const moduleWrappedSourceCode = module_1.default.wrap(sourceCode);
    // Reference: https://github.com/nodejs/node/blob/master/lib/internal/modules/cjs/loader.js#L1028
    vm_1.default.runInThisContext(moduleWrappedSourceCode, {
        filename: `fs-require://${id}${filename}`,
        lineOffset: 0,
        displayErrors: true,
    })(newModule.exports, makeRequire(newModule), newModule, path_1.default.basename(filename), path_1.default.dirname(filename));
};
loaders['.js'] = loaders[''];
loaders['.json'] = function (newModule, sourceCode) {
    newModule.exports = JSON.parse(sourceCode);
};
function resolveImplicitExtension(fs, filePath) {
    for (const extension of types_1.loaderTypes) {
        const filePathWithExtension = filePath + extension;
        if (fs.existsSync(filePathWithExtension)) {
            return {
                extension,
                filePath: filePathWithExtension,
            };
        }
    }
    return null;
}
const realRequire = require;
let idCounter = 0;
const createFsRequire = (mfs) => {
    idCounter += 1;
    const fsRequireId = idCounter;
    const moduleCache = new Map();
    function makeRequireFunction(parentModule) {
        const require = (modulePath) => {
            var _a, _b;
            if (!utils_1.isFilePathPattern.test(modulePath)) {
                const [moduleName, moduleSubpath] = (_a = utils_1.getBareSpecifier(modulePath)) !== null && _a !== void 0 ? _a : [];
                if (moduleName === 'fs') {
                    if (moduleSubpath) {
                        throw new Error(`Cannot find module '${modulePath}'`);
                    }
                    return mfs;
                }
                return realRequire(modulePath);
            }
            let filename = path_1.default.resolve(path_1.default.dirname(parentModule.filename), modulePath);
            let pathExtension = (_b = filename.match(utils_1.hasExtensionPattern)) === null || _b === void 0 ? void 0 : _b[0];
            if (!pathExtension) {
                const resolvedPath = utils_1.isDirectory(mfs, filename)
                    ? resolveImplicitExtension(mfs, path_1.default.join(filename, 'index'))
                    : resolveImplicitExtension(mfs, filename);
                if (!resolvedPath) {
                    throw new Error(`Cannot find module '${modulePath}'`);
                }
                filename = resolvedPath.filePath;
                pathExtension = resolvedPath.extension;
            }
            if (moduleCache.has(filename)) {
                return moduleCache.get(filename).exports;
            }
            const newModule = new module_1.default(filename, parentModule);
            newModule.filename = filename;
            const sourceCode = mfs.readFileSync(filename).toString();
            loaders[pathExtension](newModule, sourceCode, makeRequireFunction, filename, fsRequireId);
            moduleCache.set(filename, newModule);
            return newModule.exports;
        };
        require.id = fsRequireId;
        return require;
    }
    // @ts-expect-error parent is deprecated
    return makeRequireFunction(module.parent);
};
exports.createFsRequire = createFsRequire;
