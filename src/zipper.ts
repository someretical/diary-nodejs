import fs from 'fs';
import { promises as fsp } from 'fs';
import { promisify } from 'util';
import stream from 'stream';
import zlib from 'zlib';

const _pipe = promisify(stream.pipeline);
const _unzip = promisify(zlib.unzip);

/**
 * Unzips a gzipped file
 */
export const unzip = async (location: string): Promise<Buffer> =>
	_unzip(await fsp.readFile(location));

/**
 * Saves a file with gzip compression
 */
export const gzip = async (
	location: string,
	source: Buffer,
	encoding: BufferEncoding = 'utf8'
): Promise<void> => {
	const gzip = zlib.createGzip();
	const destination = fs.createWriteStream(location, encoding);

	/**
	 * buffer !== readable stream so Readable is needed to convert the provided buffer
	 * https://stackoverflow.com/q/13230487
	 */
	return _pipe(stream.Readable.from(source), gzip, destination);
};
