/* eslint-disable no-console */
import * as fs from 'fs';
import * as inquirer from 'inquirer';
import {
	DIARY_PATH,
	DataContainer,
	FILE_VERSION,
	OpenDiary,
	SETTINGS_PATH,
} from './types';
import {
	authorize,
	check_scopes,
	import_diary,
	upload_diary,
} from './google_driver';
import { get_settings, open_diary, save_diary } from './file_system';
import { promises as fsp } from 'fs';
import { hash_key } from './encryptor';

/**
 * TODO:
 *
 * - add flush credentials command
 * - customize terminal colours with chalk
 * - add dump google drive command
 */

const default_cli = (d: DataContainer) =>
	console.log(d.opened_diary ? '[!D]' : '[!]', 'Unknown command.');

const make_new_diary = (d: DataContainer): OpenDiary => {
	d.changes_made = true;
	console.log('[*] A new diary was created. Type `help` to see new commands.');
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
	if (!d.opened_diary) {
		console.log('[*] Commands: `help` `import` `new` `open` `quit`');
	} else {
		console.log('[*D] Commands: `close` `help` `pwd` `quit` `sync`');
	}
};

const open_cli = async (d: DataContainer) => {
	if (d.opened_diary) return default_cli(d);

	try {
		console.log('[*] Finding local diary...');
		d.opened_diary = await open_diary();
		console.log('[*] Diary opened. Type `help` to see new commands.');
		// eslint-disable-next-line no-empty
	} catch (err) {
		console.log('[*] Aborted.');
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
		console.log('[*] Are you sure you want to overwrite the existing diary?');
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

		if (proceed) {
			d.opened_diary = make_new_diary(d);
		} else {
			console.log('[*] No new diary was created.');
		}
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
		console.log(
			'[!] Failed to retrieve an access token. If this was not intentional, make sure you check all permissions needed by the app during the authorization process.'
		);
	} else {
		console.log('[*] Authorization confirmed. Downloading diary...');
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
			console.log(
				'[!] Failed to download the diary. This could be because there were no files in Google Drive. Type `new` to create a new diary.'
			);
		} else {
			console.log('[*] Successfully downloaded diary from Google Drive.');
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
		console.log('[*] Are you sure you want to overwrite the existing diary?');
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

		if (proceed) {
			await real_import_diary(d);
		} else {
			console.log('[*] No diary was imported.');
		}
	} else {
		await real_import_diary(d);
	}
};

const sync_cli = async (d: DataContainer) => {
	if (!d.settings || !d.opened_diary) return default_cli(d);

	const prev = d.settings.sync;
	console.log(
		`[*D] Google Drive sync is currently ${
			prev ? 'enabled' : 'disabled'
		}. Would you like to ${prev ? 'disable' : 'enable'} it?`
	);

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
		console.log(
			'[!D] Failed to retrieve an access token. If this was not intentional, make sure you check all permissions needed by the app during the authorization process.'
		);
	}

	if (prev !== d.settings.sync && d.client)
		await fsp.writeFile(SETTINGS_PATH, JSON.stringify(d.settings));

	if (d.settings.sync && !prev) d.changes_made = true;

	console.log(
		`[*D] Google Drive sync has been ${
			d.settings.sync ? 'enabled' : 'disabled'
		}.`
	);
};

const pwd_cli = async (d: DataContainer) => {
	if (!d.opened_diary) return default_cli(d);

	console.log(
		'[*D] Please enter a new password. Entering nothing will remove the password.'
	);
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

	console.log('[*D] Please repeat the new password.');
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
		console.log('[*D] The password has been updated.');
		d.changes_made = true;
	} else {
		console.log(`[!D] The two passwords did not match.`);
	}
};

const close_cli = async (d: DataContainer) => {
	if (!d.settings || !d.opened_diary) return default_cli(d);

	let saved_to_drive = false;

	try {
		await save_diary(d.opened_diary);
		console.log('[*D] The diary has been saved locally.');
		delete d.opened_diary;
	} catch (err) {
		console.log('[!D] The diary was unable to be saved locally. Error:', err);
	}

	try {
		if (!d.client && d.settings.sync) d.client = await authorize();
		// eslint-disable-next-line no-empty
	} catch (err) {}

	if (d.settings.sync && d.client) {
		if (!(await check_scopes(d.client))) {
			console.log(
				'[!D] Failed to retrieve an access token. If this was not intentional, make sure you check all permissions needed by the app during the authorization process.'
			);
		} else {
			try {
				await upload_diary(d.client, d.settings);
				console.log(
					'[*D] The diary has been succesfully backed up on Google Drive.'
				);
			} catch (err) {
				console.log('[!D] Failed to upload diary to Google Drive. Error:', err);

				d.changes_made = false;
				saved_to_drive = true;
			}
		}
	} else if (d.settings.sync) {
		console.log(
			'[!D] Failed to retrieve an access token. If this was not intentional, make sure you check all permissions needed by the app during the authorization process.'
		);
	}

	if (!d.settings.sync && !saved_to_drive) d.changes_made = false;
};

const quit_cli = async (d: DataContainer) => {
	if (d.changes_made && d.opened_diary) {
		console.log(
			d.opened_diary ? `[>D]` : '[>]',
			'You have unsaved changes. To save them, type `no`, then `close`. Are you sure you want to quit?'
		);
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
			console.log('[*D] Aborted qutting.');
		} else {
			console.log('[*D] Qutting...');
			process.exit(0);
		}
	} else {
		console.log('[*] Qutting...');
		process.exit(0);
	}
};

const loop = async (d: DataContainer): Promise<void> => {
	try {
		const { cmd } = await inquirer.prompt([
			{
				name: 'cmd',
				message: d.opened_diary ? '[>D]' : '[>]',
				prefix: '',
				suffix: '',
			},
		]);

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
	} catch (err) {
		if (!d.opened_diary) console.log(`[!] Error`, err);
		else console.log(`[!D] Error`, err);
	}

	loop(d);
};

const main = async () => {
	console.log(
		`[*] Welcome to the CLI for online-diary (v${process.env.npm_package_version})`
	);
	console.log('[*] Type `help` to see all available commands.');
	console.log(
		'[*] If this is your first time on another device, type `import` first to sync your diary!'
	);

	const d: DataContainer = { changes_made: false };

	d.settings = await get_settings();

	try {
		loop(d);
	} catch (err) {
		console.log(
			'[!!!] It seems a fatal error has occurred. The program will shut down immediately.'
		);

		process.exit(1);
	}
};

main();
