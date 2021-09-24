import * as fs from 'fs';
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
import { OAuth2Client } from 'google-auth-library';
import { promises as fsp } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';
import { prompt_pwd } from '..';
import { upload_diary } from './google_driver';

const _pipe = promisify(pipeline);

/**
 * initilizes settings.json
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
 * opens the local diary AND reads from local backups if necessary
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
	} catch (err) {
		try {
			unzipped = await unzip(BACKUP_PATH);
			// eslint-disable-next-line no-empty
		} catch (err) {}
	}

	const prompt = async (): Promise<OpenDiary> => {
		pwd = await prompt_pwd();

		try {
			/**
			 * unzipped will always be truthy
			 * the || Buffer.from('') is just there to shut typescript up :^)
			 */
			const tmp = decrypt(unzipped || Buffer.from(''), hash_key(pwd));

			return { diary: JSON.parse(tmp.toString('utf8')), key: pwd };
		} catch (err) {
			return prompt();
		}
	};

	if (unzipped !== null) {
		try {
			const tmp = JSON.parse(unzipped.toString('utf8'));
			return { diary: tmp, key: pwd };
		} catch (err) {
			return prompt();
		}
	} else {
		return { diary: parsed, key: pwd };
	}
};

/**
 * saves the currently open diary AND uploads to google drive if sync is enabled
 *
 * copy diary.dat to diary.dat.bak
 * save current version as diary.dat
 *
 * if sync is enabled, upload it
 */
export const save_diary = async (
	open_diary: OpenDiary,
	settings: Settings,
	oauth2client: OAuth2Client
): Promise<void> => {
	const src = fs.createReadStream(DIARY_PATH);
	const dest = fs.createWriteStream(BACKUP_PATH);

	await _pipe(src, dest);

	let encrypted = Buffer.from(JSON.stringify(open_diary.diary));
	if (open_diary.key !== null)
		encrypted = encrypt(encrypted, hash_key(open_diary.key));

	await gzip(DIARY_PATH, encrypted);

	if (settings.sync) {
		await upload_diary(oauth2client, settings);
	}
};
