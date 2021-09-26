"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.gzip = exports.unzip = void 0;
const fs_1 = __importDefault(require("fs"));
const fs_2 = require("fs");
const util_1 = require("util");
const stream_1 = __importDefault(require("stream"));
const zlib_1 = __importDefault(require("zlib"));
const _pipe = (0, util_1.promisify)(stream_1.default.pipeline);
const _unzip = (0, util_1.promisify)(zlib_1.default.unzip);
const unzip = async (location) => _unzip(await fs_2.promises.readFile(location));
exports.unzip = unzip;
const gzip = async (location, source, encoding = 'utf8') => {
    const gzip = zlib_1.default.createGzip();
    const destination = fs_1.default.createWriteStream(location, encoding);
    return _pipe(stream_1.default.Readable.from(source), gzip, destination);
};
exports.gzip = gzip;
