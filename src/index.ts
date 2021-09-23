/* eslint-disable no-console */
import { decrypt, encrypt, hash_key } from './util/encryptor';
import { gzip, unzip } from './util/zipper';

const main = async (): Promise<void> => {
	// const string = 'this is a test string';
	const key = 'super duper secret key';

	const hashed_key = hash_key(key);
	// const encrypted = encrypt(Buffer.from(string), hashed_key);

	// console.log('encrypted');

	// await gzip('data/diary.dat', encrypted);

	// console.log('gzipped');

	const unzipped = await unzip('data/diary.dat');

	console.log('unzipped');

	// let decrypted: Buffer;
	//
	// try {
	// 	decrypted = decrypt(unzipped, hash_key('not the right secret key'));
	// } catch (err) {
	// 	return console.log('failed to decrypt');
	// }

	const decrypted = decrypt(unzipped, hashed_key).toString('utf8');

	console.log(JSON.parse(decrypted));
};

main();
