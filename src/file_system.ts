import * as fs from 'fs';
import * as inquirer from 'inquirer';
import {
	BACKUP_PATH,
	DIARY_PATH,
	FILE_VERSION,
	JSONDiary,
	OpenDiary,
	SETTINGS_PATH,
	Settings,
} from './types';
import { decrypt, encrypt, hash_key } from './encryptor';
import { gzip, unzip } from './zipper';
import { promises as fsp } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

const _pipe = promisify(pipeline);

/**
 * Initilizes settings.json
 */
export const get_settings = async (): Promise<Settings> => {
	try {
		const settings = await fsp.readFile(SETTINGS_PATH);

		return JSON.parse(settings.toString('utf8'));
	} catch (err) {
		const settings: Settings = {
			sync: false,
			backup1_id: null,
			backup2_id: null,
		};
		await fsp.writeFile(SETTINGS_PATH, JSON.stringify(settings));

		return settings;
	}
};

/**
 * Opens the local diary AND reads from local backups if necessary
 *
 * try to open diary.dat
 * try to open diary.bak.dat
 *
 * if any of the above are opened, unzip them and
 * - parse them directly
 * - then try and decrypt them
 * else construct a brand new diary
 *
 * return the diary and the key if applicable
 */
export const open_diary = async (): Promise<OpenDiary> => {
	let unzipped: Buffer | null = null,
		pwd: string | null = null;
	const parsed: JSONDiary = {
		years: [],
		settings: {},
		metadata: {
			version: FILE_VERSION,
			last_updated: Date.now(),
		},
	};

	try {
		unzipped = await unzip(DIARY_PATH);
		console.log('[*] Local diary found. Opening...');
	} catch (err) {
		try {
			unzipped = await unzip(BACKUP_PATH);
			console.log('[*] Local diary found. Opening...');
			// eslint-disable-next-line no-empty
		} catch (err) {
			console.log(
				'[*] No existing diary was found. A new one will be created.'
			);
		}
	}

	const prompt_pwd = async (): Promise<OpenDiary> => {
		const answer = await inquirer.prompt([
			{
				type: 'password',
				message: '[>]',
				name: 'pwd',
				mask: '*',
				prefix: '',
				suffix: '',
			},
		]);

		if (!answer.pwd) throw new Error();

		pwd = hash_key(answer.pwd);

		try {
			/**
			 * unzipped will always be truthy
			 * The || Buffer.from('') is just there to shut typescript up :^)
			 */
			const tmp = decrypt(unzipped || Buffer.from(''), pwd);

			return { diary: JSON.parse(tmp.toString('utf8')), key: pwd };
		} catch (err) {
			console.log(
				'[!] Wrong password. To overwrite the local diary, abort this command and type `new`'
			);
			return prompt_pwd();
		}
	};

	if (unzipped !== null) {
		try {
			const tmp = JSON.parse(unzipped.toString('utf8'));
			return { diary: tmp, key: pwd };
		} catch (err) {
			console.log(
				'[*] Please enter the password. To abort this command, simply type nothing and press enter.'
			);
			return prompt_pwd();
		}
	} else {
		return { diary: parsed, key: pwd };
	}
};

/**
 * Saves the currently open diary
 *
 * copy diary.dat to diary.dat.bak
 * save current version as diary.dat
 */
export const save_diary = async (open_diary: OpenDiary): Promise<void> => {
	// if there is no diary.dat the first time around, this will pass to the empty catch block
	try {
		const src = fs.createReadStream(DIARY_PATH);
		const dest = fs.createWriteStream(BACKUP_PATH);

		await _pipe(src, dest);
		// eslint-disable-next-line no-empty
	} catch (err) {}

	let encrypted = Buffer.from(JSON.stringify(open_diary.diary));
	if (open_diary.key !== null) encrypted = encrypt(encrypted, open_diary.key);

	await gzip(DIARY_PATH, encrypted);
};
