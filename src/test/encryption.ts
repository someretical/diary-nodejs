/* eslint-disable no-console */
import { BACKUP_PATH, DIARY_PATH, FILE_VERSION, JSONDiary } from '../types';
import { decrypt, encrypt, hash_key } from '../encryptor';
import { gzip, unzip } from '../zipper';
import { assert } from 'console';
import { promises as fsp } from 'fs';
import { migratev1 } from '../moodflow_migrator';

/**
 * Tests the encryption and decryption of files
 */
export default async (pwd: string): Promise<void> => {
	try {
		await fsp.mkdir('./data');
		// eslint-disable-next-line no-empty
	} catch (err) {}

	const diary: JSONDiary = await migratev1('./data/moodflow_backup.json');
	// {
	// 	years: [],
	// 	settings: {},
	// 	metadata: {
	// 		version: FILE_VERSION,
	// 		last_updated: Date.now(),
	// 	},
	// };

	// Encrypted diary
	const test_wrong_key = 'a wrong secret key';

	const encrypted = encrypt(Buffer.from(JSON.stringify(diary)), hash_key(pwd));
	await gzip(DIARY_PATH, encrypted);

	const unzipped = await unzip(DIARY_PATH);
	const unencrypted = decrypt(unzipped, hash_key(pwd)).toString('utf8');

	assert(JSON.stringify(diary) === unencrypted, 'original !== unencrypted');

	try {
		decrypt(unzipped, hash_key(test_wrong_key));

		console.log(
			'Somehow the wrong key managed to decrypt the encrypted message!'
		);
		// eslint-disable-next-line no-empty
	} catch (err) {}

	// Compare saved and backup versions
	// const unzipped1 = decrypt(await unzip(DIARY_PATH), hash_key(pwd)).toString(
	// 	'utf8'
	// );
	// const unzipped2 = decrypt(await unzip(BACKUP_PATH), hash_key(pwd)).toString(
	// 	'utf8'
	// );
	// console.log('Backups:', unzipped1, unzipped2);

	// Unencrypted diary
	// await gzip(DIARY_PATH, Buffer.from(JSON.stringify(diary)));

	// const unzipped = await unzip(DIARY_PATH);
	// console.log('Unzipped:', JSON.parse(unzipped.toString('utf8')));

	// // Compare saved and backup versions
	// const unzipped1 = (await unzip(DIARY_PATH)).toString('utf8');
	// const unzipped2 = (await unzip(BACKUP_PATH)).toString('utf8');
	// console.log('Backups:', unzipped1, unzipped2);
};
