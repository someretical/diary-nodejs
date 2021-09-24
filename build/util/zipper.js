"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gzip = exports.unzip = void 0;
const fs = __importStar(require("fs"));
const stream = __importStar(require("stream"));
const zlib = __importStar(require("zlib"));
const fs_1 = require("fs");
const util_1 = require("util");
const _pipe = (0, util_1.promisify)(stream.pipeline);
const _unzip = (0, util_1.promisify)(zlib.unzip);
const unzip = async (location) => _unzip(await fs_1.promises.readFile(location));
exports.unzip = unzip;
const gzip = async (location, source, encoding = 'utf8') => {
    const gzip = zlib.createGzip();
    const destination = fs.createWriteStream(location, encoding);
    return _pipe(stream.Readable.from(source), gzip, destination);
};
exports.gzip = gzip;
