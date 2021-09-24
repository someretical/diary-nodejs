/* eslint-disable no-console */
import { authorize, check_scopes, list_files } from '../util/google_driver';
import { get_settings, open_diary } from '../util/file';
import { TOKEN_PATH } from '../util/types';
import { promises as fsp } from 'fs';

/**
 * test various google drive related functions
 */
export const main = async (): Promise<void> => {
	const settings = await get_settings();

	const opened_diary = await open_diary();
	console.log(opened_diary);

	const oauth2client = await authorize();
	console.log(oauth2client);

	if (!(await check_scopes(oauth2client)))
		console.log('missing scopes!!! (you will know if this is expected or not)');

	await list_files(oauth2client);
};
