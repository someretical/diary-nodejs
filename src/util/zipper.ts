import * as fs from 'fs';
import * as stream from 'stream';
import * as zlib from 'zlib';
import { promisify } from 'util';

const _pipe = promisify(stream.pipeline);
const _unzip = promisify(zlib.unzip);

export const unzip = async (location: string): Promise<Buffer> => {
	// read readablestream into a buffer
	// https://github.com/nodejs/readable-stream/issues/403#issuecomment-479069043

	const chunks = [];
	const data = fs.createReadStream(location);

	for await (const chunk of data) {
		chunks.push(chunk);
	}

	return _unzip(Buffer.concat(chunks));
};

export const gzip = async (
	location: string,
	source: Buffer,
	encoding: BufferEncoding = 'utf8'
): Promise<void> => {
	const gzip = zlib.createGzip();
	const destination = fs.createWriteStream(location, encoding);

	// buffer !== readable stream so Readable is needed to convert the provided buffer
	// https://stackoverflow.com/q/13230487
	await _pipe(stream.Readable.from(source), gzip, destination);
};
