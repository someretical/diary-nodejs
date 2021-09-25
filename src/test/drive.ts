/* eslint-disable no-console */
import {
	authorize,
	check_scopes,
	dump_drive_files,
	import_diary,
	list_files,
} from '../google_driver';
import { get_settings, open_diary, save_diary } from '../file_system';
import { promises as fsp } from 'fs';

/**
 * Test various google drive related functions
 */
export default async (): Promise<void> => {
	const settings = await get_settings();

	const opened_diary = await open_diary();
	console.log('---\nOpened existing diary:', opened_diary, '\n');

	const oauth2client = await authorize();
	console.log('---\nLoaded oauth2client.\n');

	if (!(await check_scopes(oauth2client)))
		return console.log(
			'---\nMissing scopes! You will know if this is expected or not.\n'
		);

	await list_files(oauth2client);

	settings.sync = false;
	await save_diary(opened_diary, settings, oauth2client);
	console.log('---\nSaved diary without syncing.\n');
	settings.sync = true;

	await save_diary(opened_diary, settings, oauth2client);
	console.log('---\nSaved diary to google drive\n');
	await list_files(oauth2client);
	console.log('Settings:', settings, '\n');

	try {
		await fsp.rm('./data/dump', { recursive: true, force: true });
		await fsp.mkdir('./data/dump');
		// eslint-disable-next-line no-empty
	} catch (err) {}
	await dump_drive_files(oauth2client, './data/dump');
	console.log('---\nDumped files to ./data/dump\n');

	const status = await import_diary(oauth2client, settings);
	console.log('---\nImport diary status:', status, '\n');
	const opened_diary2 = await open_diary();
	console.log('Opened imported diary:', opened_diary2, '\n');
	console.log('Settings:', settings, '\n');
};
