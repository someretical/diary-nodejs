/* eslint-disable no-console */
import * as p from './prompts';
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
import { GaxiosResponse } from 'gaxios';
import { OAuth2Client } from 'google-auth-library';
import clipboardy from 'clipboardy';
/**
 * client_secret.json is not actually secret in this case
 * See https://developers.google.com/identity/protocols/oauth2
 */
import credentials from './details.json';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { google } from 'googleapis';
import { info } from './cli';
import inquirer from 'inquirer';
import path from 'path';
import { promisify } from 'util';
import stream from 'stream';

const _pipe = promisify(stream.pipeline);

/**
 * Check if all of the the oauth2client's scopes are available
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
 * Setup an oauth2 client
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
 * Prompt the user for an access token
 */
export const get_access_token = async (
	oauth2client: OAuth2Client
): Promise<OAuth2Client> => {
	const auth_url = oauth2client.generateAuthUrl({
		access_type: 'offline',
		scope: SCOPES,
	});

	info({ changes_made: false }, p.AUTH_CONFIRM[0] + auth_url);
	info({ changes_made: false }, p.AUTH_CONFIRM[1]);

	await clipboardy.write(auth_url);

	const { code } = await inquirer.prompt([
		{
			type: 'password',
			name: 'code',
			message: '[>]',
			mask: '*',
			prefix: '',
			suffix: '',
		},
	]);

	const data = await oauth2client.getToken({ code });

	oauth2client.setCredentials(data.tokens);
	await fsp.writeFile(TOKEN_PATH, JSON.stringify(data));

	return oauth2client;
};

/**
 * List up to 100 files in the app folder on google drive
 */
export const list_files = async (oauth2client: OAuth2Client): Promise<void> => {
	const drive = google.drive({ version: 'v3', auth: oauth2client });
	const res = await drive.files.list({
		pageSize: 100,
		fields: 'files(id, name)',
		spaces: 'appDataFolder',
	});

	const files = res.data.files;
	if (files?.length) {
		console.log('Files on google drive:');
		files.map(file => {
			console.log(`${file.name} (${file.id})`);
		});
		console.log('\n');
	} else {
		console.log('No files found.\n');
	}
};

/**
 * Imports a diary from the app folder on google drive
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
		fields: 'files(id)',
		spaces: 'appDataFolder',
		pageSize: 1,
	});

	if (diary_dat_list.files?.[0].id) {
		const dest = fs.createWriteStream(DIARY_PATH);
		const source = await drive.files.get(
			{
				fileId: diary_dat_list.files[0].id,
				alt: 'media',
			},
			{ responseType: 'stream' }
		);

		await _pipe(source.data, dest);

		settings.backup1_id = diary_dat_list.files[0].id;
		successful = true;
	}

	const { data: diary_bak_list } = await drive.files.list({
		q: `name = '${BACKUP_NAME}'`,
		fields: 'files(id)',
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
				alt: 'media',
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
 * Upload diary.dat to the app folder on google drive
 */
const direct_diary_upload = async (
	drive: drive_v3.Drive
): GaxiosPromise<drive_v3.Schema$File> =>
	drive.files.create({
		requestBody: {
			name: DIARY_NAME,
			parents: ['appDataFolder'],
		},
		/**
		 * I literally cannot find any documentation on what media is supposed to be
		 * Got this from https://www.section.io/engineering-education/google-drive-api-nodejs/#upload-file-to-google-drive
		 * Relevant google docs section is empty https://googleapis.dev/nodejs/googleapis/85.0.0/drive/interfaces/Params$Resource$Files$Create.html#media
		 */
		media: {
			body: fs.createReadStream(DIARY_PATH),
		},
	});

/**
 * Uploads diary.dat to the app folder on google drive AND sets up backups as well
 *
 * if diary.dat exists on the drive,
 * - delete diary.dat.bak on the drive if it exists
 * - copy diary.dat and rename it to diary.dat.bak on the drive
 * - delete diary.dat from the drive
 * - upload the local copy of the diary.dat to the drive
 *   - I am not using the drive.files.update() method here since an extra
 *     API call is negligible as the deleting happens on Google's end
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
		 * If any of the code in this try block fails,
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
		await wipe_drive_files(drive);
	}

	const { data: new_diary_dat } = await direct_diary_upload(drive);
	settings.backup1_id = new_diary_dat.id;

	await fsp.writeFile(SETTINGS_PATH, JSON.stringify(settings));
};

/**
 * Deletes up to 100 files from the app folder on google drive
 *
 * TODO replace with a batch system once the googleapis library supports it
 */
export const wipe_drive_files = async (
	drive: drive_v3.Drive
): Promise<GaxiosResponse<void>[]> => {
	const { data } = await drive.files.list({
		fields: 'files(id)',
		spaces: 'appDataFolder',
		pageSize: 100,
	});

	/**
	 * Don't want to put await in loop here so some technical typescript stuff is needed
	 * to override the default non async signature of drive.files.delete()
	 */
	const _delete = drive.files.delete() as unknown as (
		params?: drive_v3.Params$Resource$Files$Delete,
		options?: MethodOptions
	) => GaxiosPromise<void>;

	const promises = [];

	if (data.files) {
		for (const file of data.files) {
			promises.push(
				_delete({
					/**
					 * drive_v3.Params$Resource$Files$Delete.fileId?: string | undefined
					 * drive_v3.Schema$File.id?: string | null | undefined
					 * that's why the || undefined is needed :(
					 */
					fileId: file.id || undefined,
				})
			);
		}
	}

	return Promise.all(promises);
};

/**
 * Download whatever is in the app folder on google drive
 */
export const dump_drive_files = async (
	oauth2client: OAuth2Client,
	location: string
): Promise<void> => {
	const drive = google.drive({ version: 'v3', auth: oauth2client });
	const { data } = await drive.files.list({
		fields: 'files(name, id)',
		spaces: 'appDataFolder',
		pageSize: 100,
	});

	if (data.files) {
		for (const file of data.files) {
			const dest_location = path.join(location, `${file.id}_${file.name}`);
			const dest = fs.createWriteStream(dest_location);

			const source = await drive.files.get(
				{
					// The || '' is just to shut typescript up
					fileId: file.id || '',
					alt: 'media',
				},
				{ responseType: 'stream' }
			);
			await _pipe(source.data, dest);
		}
	}
};
