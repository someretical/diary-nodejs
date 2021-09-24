/* eslint-disable no-console */
import { DIARY_PATH, FILE_VERSION, JSONDiary } from '../util/types';
import { decrypt, encrypt, hash_key } from '../util/encryptor';
import { gzip, unzip } from '../util/zipper';
import { assert } from 'console';
import { promises as fsp } from 'fs';

/**
 * tests the encryption and decryption of files
 */
export const main = async (): Promise<void> => {
	try {
		await fsp.mkdir('./data');
		// eslint-disable-next-line no-empty
	} catch (err) {}

	const diary: JSONDiary = {
		years: [],
		settings: {},
		metadata: {
			version: FILE_VERSION,
			last_updated: 1376187489,
		},
	};
	const test_key = 'a very secret key';
	const test_wrong_key = 'a wrong secret key';

	const encrypted = encrypt(
		Buffer.from(JSON.stringify(diary)),
		hash_key(test_key)
	);
	await gzip(DIARY_PATH, encrypted);

	const unzipped = await unzip(DIARY_PATH);
	const unencrypted = decrypt(unzipped, hash_key(test_key)).toString('utf8');

	console.log(
		`Original: ${JSON.stringify(diary)}, unencrypted: ${unencrypted}`
	);
	assert(JSON.stringify(diary) === unencrypted, 'original !== unencrypted');

	try {
		decrypt(unzipped, hash_key(test_wrong_key));

		console.log(
			'somehow the wrong key managed to decrypt the encrypted message'
		);
		// eslint-disable-next-line no-empty
	} catch (err) {}
};
