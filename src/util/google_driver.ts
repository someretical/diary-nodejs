/* eslint-disable no-console */
import * as fs from 'fs';
import * as readline from 'readline';
import * as stream from 'stream';
import {
	BACKUP_NAME,
	DIARY_NAME,
	DIARY_PATH,
	SCOPES,
	SETTINGS_PATH,
	Settings,
	TOKEN_PATH,
} from './types';
import {
	GaxiosPromise,
	MethodOptions,
	drive_v3,
} from 'googleapis/build/src/apis/drive';
import { OAuth2Client } from 'google-auth-library';

/**
 * client_secret.json is not actually secret in this case
 * see https://developers.google.com/identity/protocols/oauth2
 */
import credentials from '../client_secret.json';

import { promises as fsp } from 'fs';
import { google } from 'googleapis';
import { promisify } from 'util';

const _pipe = promisify(stream.pipeline);

/**
 * check if all of the the oauth2client's scopes are available
 */
export const check_scopes = async (
	oauth2client: OAuth2Client,
	cmp_scopes = SCOPES
): Promise<boolean> => {
	const { token } = await oauth2client.getAccessToken();

	if (!token) return false;

	const { scopes } = await oauth2client.getTokenInfo(token);

	return cmp_scopes.every(s => scopes.includes(s));
};

/**
 * setup an oauth2 client
 */
export const authorize = async (): Promise<OAuth2Client> => {
	const { client_secret, client_id, redirect_uris } = credentials.installed;
	const oauth2client = new google.auth.OAuth2(
		client_id,
		client_secret,
		redirect_uris[0]
	);

	try {
		const data = await fsp.readFile(TOKEN_PATH);

		oauth2client.setCredentials(JSON.parse(data.toString('utf8')).tokens);

		return oauth2client;
	} catch (err) {
		return get_access_token(oauth2client);
	}
};

/**
 * prompt the user for an access token
 */
export const get_access_token = async (
	oauth2client: OAuth2Client
): Promise<OAuth2Client> => {
	const authUrl = oauth2client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
	});

	console.log('auth url:', authUrl);

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	/**
	 * begin copy pasted code to promisify rl.question
	 * I don't believe this implementation supports aborting
	 * see https://nodejs.org/api/readline.html#readline_rl_question_query_options_callback
	 * code taken from https://gist.github.com/januswel/c1634511a88ed2ce4c32d1763a8b0402
	 */
	const q = rl.question as unknown as {
		[promisify.custom]: (question: string) => Promise<string>;
	};

	q[promisify.custom] = (question: string) =>
		new Promise<string>(resolve => {
			rl.question(question, input => {
				resolve(input);
			});
		}).finally(() => {
			rl.close();
		});

	const question = promisify(rl.question) as unknown as (
		q: string
	) => Promise<string>;
	// end copy pasted code to promisify rl.question

	const code = await question('code: ');

	const data = await oauth2client.getToken({ code });

	oauth2client.setCredentials(data.tokens);
	await fsp.writeFile(TOKEN_PATH, JSON.stringify(data));

	return oauth2client;
};

/**
 * list up to 100 files in the app folder on google drive
 */
export const list_files = async (oauth2client: OAuth2Client): Promise<void> => {
	const drive = google.drive({ version: 'v3', auth: oauth2client });
	const res = await drive.files.list({
		pageSize: 100,
		fields: 'nextPageToken, files(id, name)',
		spaces: 'appDataFolder',
	});

	const files = res.data.files;
	if (files?.length) {
		console.log('Files:');
		files.map(file => {
			console.log(`${file.name} (${file.id})`);
		});
	} else {
		console.log('no files found');
	}
};

/**
 * imports a diary from the app folder on google drive
 *
 * check to see if the app folder contains a file named diary.dat
 * - if yes, download the file and store its id
 *
 * check for diary.dat.bak
 * - if there is a diary.dat.bak but no diary.dat,
 *   - rename the file to diary.dat on the drive
 *   - download the file and store it as diary.dat and its id as backup1
 *
 * - if there is and there is already a diary.dat, store its id as backup2
 *
 * return true if a file was downloaded, otherwise false
 */
export const import_diary = async (
	oauth2client: OAuth2Client,
	settings: Settings
): Promise<boolean> => {
	const drive = google.drive({ version: 'v3', auth: oauth2client });
	let successful = false;

	const { data: diary_dat_list } = await drive.files.list({
		q: `name = '${DIARY_NAME}'`,
		fields: 'nextPageToken, files(id)',
		spaces: 'appDataFolder',
		pageSize: 1,
	});

	if (diary_dat_list.files?.[0].id) {
		const dest = fs.createWriteStream(DIARY_PATH);
		const source = await drive.files.get(
			{
				fileId: diary_dat_list.files[0].id,
			},
			{ responseType: 'stream' }
		);

		await _pipe(source.data, dest);

		settings.backup1_id = diary_dat_list.files[0].id;
		successful = true;
	}

	const { data: diary_bak_list } = await drive.files.list({
		q: `name = '${BACKUP_NAME}'`,
		fields: 'nextPageToken, files(id)',
		spaces: 'appDataFolder',
		pageSize: 1,
	});

	if (diary_bak_list.files?.[0].id && !diary_dat_list.files?.[0].id) {
		await drive.files.update({
			fileId: diary_bak_list.files[0].id,
			requestBody: {
				name: DIARY_NAME,
			},
		});

		const dest = fs.createWriteStream(DIARY_PATH);
		const source = await drive.files.get(
			{
				fileId: diary_bak_list.files[0].id,
			},
			{ responseType: 'stream' }
		);

		await _pipe(source.data, dest);

		settings.backup1_id = diary_bak_list.files[0].id;
		successful = true;
	} else if (diary_bak_list.files?.[0].id) {
		settings.backup2_id = diary_bak_list.files[0].id;
	}

	if (successful) await fsp.writeFile(SETTINGS_PATH, JSON.stringify(settings));

	return successful;
};

/**
 * upload diary.dat to the app folder on google drive
 */
const direct_diary_upload = async (
	drive: drive_v3.Drive
): GaxiosPromise<drive_v3.Schema$File> =>
	drive.files.create({
		requestBody: {
			name: DIARY_NAME,
			parents: ['appDataFolder'],
		},
		// I literally cannot find any documentation on what media is supposed to be
		// got this from https://www.section.io/engineering-education/google-drive-api-nodejs/#upload-file-to-google-drive
		// relevant google docs section is empty https://googleapis.dev/nodejs/googleapis/85.0.0/drive/interfaces/Params$Resource$Files$Create.html#media
		media: {
			body: fs.createReadStream(DIARY_PATH),
		},
	});

/**
 * uploads diary.dat to the app folder on google drive AND sets up backups as well
 *
 * if diary.dat exists on the drive,
 * - delete diary.dat.bak on the drive if it exists
 * - copy diary.dat and rename it to diary.dat.bak on the drive
 * - delete diary.dat from the drive
 * - upload the local copy of the diary.dat to the drive
 * - set backup2 to the id of the new copy of diary.dat.bak
 * - set backup1 to the id of the newly uploaded diary.dat
 *
 * otherwise, directly upload the local copy to the drive
 * set backup1 to the id of the newly uploaded diary.dat
 */
export const upload_diary = async (
	oauth2client: OAuth2Client,
	settings: Settings
): Promise<void> => {
	const drive = google.drive({ version: 'v3', auth: oauth2client });

	try {
		/**
		 * if any of the code in this try block fails,
		 * I might as well just wipe the entire drive app folder since
		 * the latest version *should* be the one currently stored locally.
		 * the local version is *always* uploaded last
		 */
		if (settings.backup1_id) {
			if (settings.backup2_id) {
				await drive.files.delete({
					fileId: settings.backup2_id,
				});
			}

			const { data: new_diary_bak } = await drive.files.copy({
				fileId: settings.backup1_id,
				requestBody: {
					name: BACKUP_NAME,
					parents: ['appDataFolder'],
				},
			});

			await drive.files.delete({
				fileId: settings.backup1_id,
			});

			settings.backup2_id = new_diary_bak.id;
		}
	} catch (err) {
		// TODO replace with a batch system once the googleapis library supports it

		const { data } = await drive.files.list({
			fields: 'nextPageToken, files(id)',
			spaces: 'appDataFolder',
			pageSize: 10,
		});

		if (data.files) {
			/**
			 * don't want to put await in loop here so some janky typescript stuff is needed
			 * to override the default non async signature of drive.files.delete()
			 */
			const _delete = drive.files.delete() as unknown as (
				params?: drive_v3.Params$Resource$Files$Delete,
				options?: MethodOptions
			) => GaxiosPromise<void>;

			const promises = [];
			for (const file of data.files) {
				promises.push(
					_delete({
						fileId: file.id || undefined,
					})
				);
			}

			await Promise.all(promises);
		}
	}

	const { data: new_diary_dat } = await direct_diary_upload(drive);
	settings.backup1_id = new_diary_dat.id;

	await fsp.writeFile(SETTINGS_PATH, JSON.stringify(settings));
};
