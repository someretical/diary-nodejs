/* eslint-disable no-console */
import * as p from './prompts';
import {
	DIARY_PATH,
	DataContainer,
	FILE_VERSION,
	OpenDiary,
	SETTINGS_PATH,
	TOKEN_PATH,
	DATA_PATH,
	DUMP_PATH,
} from './types';
import {
	authorize,
	check_scopes,
	dump_drive_files,
	import_diary,
	upload_diary,
} from './google_driver';
import { critical, err, info, success, warn } from './cli';
import { get_settings, open_diary, save_diary } from './file_system';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { hash_key } from './encryptor';
import inquirer from 'inquirer';

const default_cli = (d: DataContainer) => warn(d, p.UNKNOWN_CMD);

const make_new_diary = (d: DataContainer): OpenDiary => {
	d.changes_made = true;
	info(d, p.DIARY_CREATE);
	return {
		key: null,
		diary: {
			years: [],
			settings: {},
			metadata: {
				version: FILE_VERSION,
				last_updated: Date.now(),
			},
		},
	};
};

const help_cli = (d: DataContainer) => {
	if (!d.opened_diary) info(d, p.HELP_DIARY_CLOSED);
	else info(d, p.HELP_DIARY_OPEN);
};

const open_cli = async (d: DataContainer) => {
	if (d.opened_diary) return default_cli(d);

	try {
		d.opened_diary = await open_diary();
		success(d, p.OPENED_DIARY);
		// eslint-disable-next-line no-empty
	} catch (err) {
		success(d, p.ABORTED);
	}
};

const new_diary_cli = async (d: DataContainer) => {
	if (d.opened_diary) return default_cli(d);

	let exists;
	try {
		await fsp.access(DIARY_PATH, fs.constants.F_OK);
		exists = true;
	} catch (err) {
		exists = false;
	}

	if (exists) {
		info(d, p.ASK_OVERWRITE);
		const { proceed } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'proceed',
				message: '[>]',
				default: false,
				prefix: '',
				suffix: '',
			},
		]);

		if (proceed) d.opened_diary = make_new_diary(d);
		else success(d, p.ABORTED);
	} else {
		d.opened_diary = make_new_diary(d);
	}
};

const real_import_diary = async (d: DataContainer) => {
	try {
		d.client = await authorize();
		// eslint-disable-next-line no-empty
	} catch (err) {}

	if (!d.client || !(await check_scopes(d.client))) {
		err(d, p.GAPI_ERR, 'Failed at authorize() in real_import_diary.');
	} else {
		let imported = false;
		// This will always be true
		if (d.settings) {
			d.settings.sync = true;
			try {
				imported = await import_diary(d.client, d.settings);
				// eslint-disable-next-line no-empty
			} catch (err) {}
		}
		if (!imported) {
			warn(d, p.DOWNLOAD_FAIL);
		} else {
			success(d, p.DOWNLOAD_SUCCESS);
			await open_cli(d);
		}
	}
};

const import_diary_cli = async (d: DataContainer) => {
	if (d.opened_diary) return default_cli(d);

	let exists;
	try {
		await fsp.access(DIARY_PATH, fs.constants.F_OK);
		exists = true;
	} catch (err) {
		exists = false;
	}

	if (exists) {
		info(d, p.ASK_OVERWRITE);
		const { proceed } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'proceed',
				message: '[>]',
				default: false,
				prefix: '',
				suffix: '',
			},
		]);

		if (proceed) await real_import_diary(d);
		else success(d, p.ABORTED);
	} else {
		await real_import_diary(d);
	}
};

const sync_cli = async (d: DataContainer) => {
	if (!d.settings || !d.opened_diary) return default_cli(d);

	const prev = d.settings.sync;

	info(d, prev ? p.ASK_SYNC_ENABLE : p.ASK_SYNC_DISABLE);

	const { status } = await inquirer.prompt([
		{
			type: 'confirm',
			name: 'status',
			message: `[>D]`,
			default: false,
			prefix: '',
			suffix: '',
		},
	]);

	/**
	 * prev && status -> disabled
	 * prev && !status -> enabled
	 * !prev && status -> enabled
	 * !prev && status -> disabled
	 */
	d.settings.sync = (prev && !status) || (!prev && status);

	try {
		if (d.settings.sync) d.client = await authorize();
		// eslint-disable-next-line no-empty
	} catch (err) {}

	if (d.settings.sync && (!d.client || !(await check_scopes(d.client)))) {
		d.settings.sync = false;

		if (!d.client) err(d, p.GAPI_ERR, 'Failed at authorize() in sync_cli.');
		else err(d, p.GAPI_ERR, 'Failed at check_scopes() in sync_cli.');
	}

	if (prev !== d.settings.sync && d.client)
		await fsp.writeFile(SETTINGS_PATH, JSON.stringify(d.settings));

	if (d.settings.sync && !prev) d.changes_made = true;

	success(d, d.settings.sync ? p.SYNC_ENABLED : p.SYNC_DISABLED);
};

const pwd_cli = async (d: DataContainer) => {
	if (!d.opened_diary) return default_cli(d);

	info(d, p.NEW_PWD);
	const { pwd } = await inquirer.prompt([
		{
			type: 'password',
			message: '[>D]',
			name: 'pwd',
			mask: '*',
			prefix: '',
			suffix: '',
		},
	]);
	const first_time = pwd ? hash_key(pwd) : null;

	info(d, p.NEW_PWD_CONFIRM);
	const { pwd2 } = await inquirer.prompt([
		{
			type: 'password',
			message: '[>D]',
			name: 'pwd2',
			mask: '*',
			prefix: '',
			suffix: '',
		},
	]);
	const second_time = pwd2 ? hash_key(pwd2) : null;

	if (first_time === second_time) {
		d.opened_diary.key = first_time;
		success(d, p.NEW_PWD_SET);
		d.changes_made = true;
	} else {
		warn(d, p.NEW_PWD_FAIL);
	}
};

const close_cli = async (d: DataContainer) => {
	if (!d.settings || !d.opened_diary) return default_cli(d);

	let fail_save = false;

	try {
		await save_diary(d.opened_diary);
		success(d, p.LOCAL_SAVED);
		delete d.opened_diary;
	} catch (e) {
		err(d, p.LOCAL_SAVE_ERR, String(e));
		fail_save = true;
	}

	try {
		if (!d.client && d.settings.sync) d.client = await authorize();
		// eslint-disable-next-line no-empty
	} catch (err) {}

	if (d.settings.sync && d.client) {
		if (!(await check_scopes(d.client))) {
			err(d, p.GAPI_ERR, 'Failed at check_scopes() in close_cli.');
		} else {
			try {
				await upload_diary(d.client, d.settings);
				success(d, p.UPLOAD_SUCCESS);
			} catch (e) {
				fail_save = true;
				err(d, p.UPLOAD_FAIL, String(e));
			}
		}
	} else if (d.settings.sync) {
		err(d, p.GAPI_ERR, 'Failed at authorize() in close_cli.');
	}

	if (!fail_save) d.changes_made = false;
};

const quit_cli = async (d: DataContainer) => {
	if (d.changes_made && d.opened_diary) {
		warn(d, p.UNSAVED_CHANGES);
		const { status } = await inquirer.prompt([
			{
				type: 'confirm',
				name: 'status',
				message: '[>D]',
				default: false,
				prefix: '',
				suffix: '',
			},
		]);

		if (!status) {
			success(d, p.ABORTED);
		} else {
			info(d, p.QUIT);
			process.exit(0);
		}
	} else {
		info(d, p.QUIT);
		process.exit(0);
	}
};

const flush_cli = async (d: DataContainer) => {
	if (d.opened_diary) return default_cli(d);

	try {
		await fsp.unlink(TOKEN_PATH);
		// eslint-disable-next-line no-empty
	} catch (err) {}

	info(d, p.CREDENTIALS_DELETED);
};

const dump_cli = async (d: DataContainer) => {
	if (d.opened_diary) return default_cli(d);

	if (!d.client) return warn(d, p.MISSING_OAUTH2);

	if (!(await check_scopes(d.client))) {
		err(d, p.GAPI_ERR, 'Failed at check_scopes() in close_cli.');
	} else {
		try {
			await fsp.mkdir(DUMP_PATH);
			// eslint-disable-next-line no-empty
		} catch (err) {}

		try {
			info(d, p.START_DUMP);
			await dump_drive_files(d.client, DUMP_PATH);
			success(d, p.DUMP_SUCCESS);
		} catch (e) {
			err(d, p.DUMP_FAIL, String(e));
		}
	}
};

const loop = async (d: DataContainer): Promise<void> => {
	const { cmd } = await inquirer.prompt([
		{
			name: 'cmd',
			message: d.opened_diary ? '[>D]' : '[>]',
			prefix: '',
			suffix: '',
		},
	]);

	try {
		switch (cmd) {
			case 'help':
				help_cli(d);
				break;
			case 'open':
				await open_cli(d);
				break;
			case 'new':
				await new_diary_cli(d);
				break;
			case 'import':
				await import_diary_cli(d);
				break;
			case 'sync':
				await sync_cli(d);
				break;
			case 'pwd':
				await pwd_cli(d);
				break;
			case 'close':
				await close_cli(d);
				break;
			case 'flush':
				await flush_cli(d);
				break;
			case 'dump':
				await dump_cli(d);
				break;
			case 'debug':
				console.log('[DEBUG]', d.settings);
				console.log('[DEBUG]', d.opened_diary);
				console.log(
					'[DEBUG]',
					d.client ? 'oauth2client exists' : 'oauth2client does not exist'
				);
				console.log('[DEBUG] changes_made', d.changes_made);
				break;
			case 'quit':
				await quit_cli(d);
				break;
			default:
				default_cli(d);
				break;
		}
		// eslint-disable-next-line no-empty
	} catch (e) {
		err(d, 'Failed at try, switch in loop.', String(e));
	}

	loop(d);
};

const main = async () => {
	try {
		await fsp.mkdir(DATA_PATH);
		// eslint-disable-next-line no-empty
	} catch (err) {}

	const d: DataContainer = { changes_made: false };
	d.settings = await get_settings();

	info(d, p.WELCOME);

	try {
		loop(d);
	} catch (err) {
		critical(d, p.FATAL_ERR, String(err));
		process.exit(1);
	}
};

main();
