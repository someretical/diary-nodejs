"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gzip = exports.unzip = void 0;
const fs = require("fs");
const stream = require("stream");
const zlib = require("zlib");
const util_1 = require("util");
const _pipe = (0, util_1.promisify)(stream.pipeline);
const _unzip = (0, util_1.promisify)(zlib.unzip);
const unzip = async (location) => {
    const chunks = [];
    const data = fs.createReadStream(location);
    for await (const chunk of data) {
        chunks.push(chunk);
    }
    return _unzip(Buffer.concat(chunks));
};
exports.unzip = unzip;
const gzip = async (location, source, encoding = 'utf8') => {
    const gzip = zlib.createGzip();
    const destination = fs.createWriteStream(location, encoding);
    await _pipe(stream.Readable.from(source), gzip, destination);
};
exports.gzip = gzip;
