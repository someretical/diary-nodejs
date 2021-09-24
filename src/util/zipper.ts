import * as fs from 'fs';
import * as stream from 'stream';
import * as zlib from 'zlib';
import { promises as fsp } from 'fs';
import { promisify } from 'util';

const _pipe = promisify(stream.pipeline);
const _unzip = promisify(zlib.unzip);

/**
 * unzips a gzipped file
 */
export const unzip = async (location: string): Promise<Buffer> =>
	_unzip(await fsp.readFile(location));

/**
 * saves a file with gzip compression
 */
export const gzip = async (
	location: string,
	source: Buffer,
	encoding: BufferEncoding = 'utf8'
): Promise<void> => {
	const gzip = zlib.createGzip();
	const destination = fs.createWriteStream(location, encoding);

	// buffer !== readable stream so Readable is needed to convert the provided buffer
	// https://stackoverflow.com/q/13230487
	return _pipe(stream.Readable.from(source), gzip, destination);
};
