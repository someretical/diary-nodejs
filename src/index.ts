/* eslint-disable no-console */
import * as p from './prompts';
import {
	DATA_PATH,
	DIARY_PATH,
	DUMP_PATH,
	DailyEntry,
	DataContainer,
	Day,
	EXPORT_NAME,
	EXPORT_PATH,
	FILE_VERSION,
	IMPORT_PATH,
	Month,
	OpenDiary,
	SETTINGS_PATH,
	TOKEN_PATH,
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
import chalk from 'chalk';
import fs from 'fs';
import { promises as fsp } from 'fs';
import { hash_key } from './encryptor';
import inquirer from 'inquirer';

/**
 * Pads a number with leading zeroes
 */
const zero_pad = (num: number, places: number) => {
	let str = num.toString();
	while (str.length < places) str = '0' + str;
	return str;
};

/**
 * Highlights text based on rating
 */
const colour_rating = (rating: number, text: string) =>
	rating === 1
		? chalk.bgRedBright(text)
		: rating === 2
		? chalk.bgYellowBright.black(text)
		: rating === 3
		? chalk.inverse(text)
		: rating === 4
		? chalk.bgCyanBright.black(text)
		: chalk.bgGreenBright(text);

/**
 * Returns a date in WEEKDAY YYYY/MM/DD format
 */
const readable_date = (date = new Date()) =>
	chalk.bold`${Day[date.getDay()]} ${date.getFullYear()}/${zero_pad(
		date.getMonth() + 1,
		2
	)}/${zero_pad(date.getDate(), 2)}`;

/**
 * Unrecognised command response
 */
const default_cli = (d: DataContainer) => warn(d, p.UNKNOWN_CMD);

/**
 * Returns an empty diary
 */
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

/**
 * Displays help message
 */
const help_cli = (d: DataContainer) => {
	const arr = d.opened_diary ? p.HELP_DIARY_OPEN : p.HELP_DIARY_CLOSED;
	const tab_len = 20;
	const first = arr[0];
	const [cmd, txt] = first.split('%%%');

	info(d, `${cmd}${' '.repeat(tab_len + 9 - cmd.length)}${txt}`);

	arr.slice(1).map(str => {
		const [cmd, txt] = str.split('%%%');

		info(d, `${cmd}${' '.repeat(tab_len - cmd.length)}${txt}`);
	});
};

/**
 * Open command
 */
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

/**
 * New command
 */
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

/**
 * Second half of download command
 * Extracted because it is called twice in the first half
 */
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

/**
 * Download command
 */
const download_diary_cli = async (d: DataContainer) => {
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

/**
 * Sync command
 */
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

/**
 * Pwd command
 */
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

/**
 * Close command
 */
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

/**
 * Quit command
 */
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

/**
 * Flush command
 */
const flush_cli = async (d: DataContainer) => {
	if (d.opened_diary) return default_cli(d);

	try {
		await fsp.unlink(TOKEN_PATH);
		// eslint-disable-next-line no-empty
	} catch (err) {}

	info(d, p.CREDENTIALS_DELETED);
};

/**
 * Dump command
 */
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

/**
 * Gets a date from the user
 * Returns undefined upon cancelling
 * Returns null if the date is invalid
 */
const get_date_prompt = async (
	d: DataContainer,
	month_only = false
): Promise<Date | undefined | null> => {
	const { date_input } = await inquirer.prompt([
		{
			name: 'date_input',
			message: '[>D]',
			prefix: '',
			suffix: '',
		},
	]);

	if (date_input === 'cancel') {
		return undefined;
	} else {
		const [one, two, three] = date_input.split(' ');
		const now = new Date();
		let date_obj: Date;

		if (month_only) {
			date_obj =
				one && two
					? new Date(parseInt(one), parseInt(two) - 1)
					: one
					? new Date(now.getFullYear(), parseInt(one) - 1)
					: now;
		} else {
			date_obj =
				one && two && three
					? new Date(parseInt(one), parseInt(two) - 1, parseInt(three))
					: one && two
					? new Date(now.getFullYear(), parseInt(one) - 1, parseInt(two))
					: one
					? new Date(now.getFullYear(), now.getMonth(), parseInt(one))
					: now;
		}

		if (date_obj.toString() === 'Invalid Date') {
			warn(d, p.INVALID_DATE);
			return null;
		}

		return date_obj;
	}
};

/**
 * Gets a rating (1-5) from the user
 */
const get_rating_prompt = async (): Promise<number> => {
	const { rating } = await inquirer.prompt([
		{
			name: 'rating',
			message: '[>D]',
			prefix: '',
			suffix: '',
			validate: input => {
				const num = parseInt(String(input));

				if (Number.isNaN(num) || num < 1 || num > 5) return p.INVALID_RATING;

				return true;
			},
		},
	]);

	return parseInt(rating);
};

/**
 * Gets a message from the user (max length 1000)
 */
const get_message_prompt = async (): Promise<string> => {
	const { message } = await inquirer.prompt([
		{
			name: 'message',
			message: '[>D]',
			prefix: '',
			suffix: '',
			validate: input => {
				if (String(input).length > 1000) return p.INVALID_MESSAGE;

				return true;
			},
		},
	]);

	return message;
};

/**
 * Asks the user if the day is special
 */
const get_special_prompt = async (): Promise<boolean> => {
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

	return status;
};

/**
 * Asks the user to confirm the entry details
 */
const confirm_entry_prompt = async (
	d: DataContainer,
	rating: number,
	msg: string,
	special: boolean,
	date: Date
): Promise<boolean> => {
	info(d, [
		p.CONFIRM_ENTRY[0],
		p.CONFIRM_ENTRY[1] + readable_date(date),
		p.CONFIRM_ENTRY[2] + colour_rating(rating, rating.toString()),
		p.CONFIRM_ENTRY[3] + (msg || 'None'),
		p.CONFIRM_ENTRY[4] + (special ? p.YES : p.NO),
	]);

	const { status } = await inquirer.prompt([
		{
			type: 'confirm',
			name: 'status',
			message: '[>D]',
			default: true,
			prefix: '',
			suffix: '',
		},
	]);

	return status;
};

/**
 * Check if an entry exists given a date
 * Returns an array containing indexes to the entry in the diary if it exists
 * [year_index, month_index, day_index]
 */
const check_entry_exists = (d: DataContainer, date: Date): false | number[] => {
	if (!d.opened_diary) return false;

	const y_index = d.opened_diary.diary.years.findIndex(
		y => y.year === date.getFullYear()
	);
	if (y_index === -1) return false;

	const m_index = d.opened_diary.diary.years[y_index].months.findIndex(
		m => m.month === date.getMonth() + 1
	);
	if (m_index === -1) return false;

	const d_index = d.opened_diary.diary.years[y_index].months[
		m_index
	].days.findIndex(d => d.day === date.getDate());
	if (d_index === -1) return false;

	return [y_index, m_index, d_index];
};

/**
 * Creates an entry in the diary
 */
const save_entry = (
	d: DataContainer,
	date: Date,
	rating: number,
	msg: string,
	special: boolean
) => {
	if (!d.opened_diary) return;

	let y_index = d.opened_diary.diary.years.findIndex(
		y => y.year === date.getFullYear()
	);
	if (y_index === -1) {
		d.opened_diary.diary.years.push({ year: date.getFullYear(), months: [] });
		y_index = d.opened_diary.diary.years.length - 1;
	}

	let m_index = d.opened_diary.diary.years[y_index].months.findIndex(
		m => m.month === date.getMonth() + 1
	);
	if (m_index === -1) {
		d.opened_diary.diary.years[y_index].months.push({
			month: date.getMonth() + 1,
			days: [],
		});
		m_index = d.opened_diary.diary.years[y_index].months.length - 1;
	}

	const d_index = d.opened_diary.diary.years[y_index].months[
		m_index
	].days.findIndex(d => d.day === date.getDate());
	if (d_index !== -1) {
		d.opened_diary.diary.years[y_index].months[m_index].days[d_index] = {
			day: date.getDate(),
			last_updated: Date.now(),
			rating,
			description: msg,
			is_important: special,
		};
	} else {
		d.opened_diary.diary.years[y_index].months[m_index].days.push({
			day: date.getDate(),
			last_updated: Date.now(),
			rating,
			description: msg,
			is_important: special,
		});
	}

	success(d, p.ENTRY_ADDED);
	d.changes_made = true;
};

/**
 * Add command
 */
const add_cli = async (d: DataContainer) => {
	if (!d.opened_diary) return default_cli(d);

	info(d, p.DATE_PROMPT);

	const date_obj = await get_date_prompt(d);
	if (date_obj === null) return;
	if (date_obj === undefined) return success(d, p.ABORTED);

	if (check_entry_exists(d, date_obj))
		return warn(d, `${p.ENTRY_EXISTS} (${readable_date(date_obj)})`);

	info(d, p.NOW_EDITING + readable_date(date_obj));

	info(d, p.PROMPT_RATING);
	const rating = await get_rating_prompt();

	info(d, p.PROMPT_MESSAGE);
	const message = await get_message_prompt();

	info(d, p.PROMPT_IS_SPECIAL);
	const is_special = await get_special_prompt();

	if (await confirm_entry_prompt(d, rating, message, is_special, date_obj))
		save_entry(d, date_obj, rating, message, is_special);
	else success(d, p.ABORTED);
};

/**
 * Delete command
 */
const del_cli = async (d: DataContainer) => {
	if (!d.opened_diary) return default_cli(d);

	info(d, p.DATE_PROMPT);

	const date_obj = await get_date_prompt(d);
	if (date_obj === null) return;
	if (date_obj === undefined) return success(d, p.ABORTED);

	const status = check_entry_exists(d, date_obj);
	if (status === false)
		return warn(d, `${p.UNKNOWN_ENTRY} (${readable_date(date_obj)})`);

	info(d, `${p.ASK_DELETE} (${readable_date(date_obj)}})`);
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
		d.opened_diary.diary.years[status[0]].months[status[1]].days.splice(
			status[2],
			1
		);

		success(d, `${p.ENTRY_DELETED} (${readable_date(date_obj)})`);
		d.changes_made = true;
	} else {
		success(d, p.ABORTED);
	}
};

/**
 * Edit command
 */
const edit_cli = async (d: DataContainer) => {
	if (!d.opened_diary) return default_cli(d);

	info(d, p.DATE_PROMPT);

	const date_obj = await get_date_prompt(d);
	if (date_obj === null) return;
	if (date_obj === undefined) return success(d, p.ABORTED);

	const status = check_entry_exists(d, date_obj);
	if (status === false)
		return warn(d, `${p.UNKNOWN_ENTRY} (${readable_date(date_obj)})`);

	const before =
		d.opened_diary.diary.years[status[0]].months[status[1]].days[status[2]];

	info(d, p.NOW_EDITING + readable_date(date_obj));
	info(d, p.PROMPT_RATING);
	info(
		d,
		`${p.ORIGINAL} ${colour_rating(before.rating, before.rating.toString())}`
	);

	const rating = await get_rating_prompt();

	info(d, p.PROMPT_MESSAGE);
	info(d, p.ORIGINAL);

	if (before.description) {
		info(d, before.description.split('\n'));
	} else {
		info(d, 'None');
	}

	const message = await get_message_prompt();

	info(d, p.PROMPT_IS_SPECIAL);
	info(d, `${p.ORIGINAL} ${before.is_important ? p.YES : p.NO}`);

	const is_special = await get_special_prompt();

	if (await confirm_entry_prompt(d, rating, message, is_special, date_obj))
		save_entry(d, date_obj, rating, message, is_special);
	else success(d, p.ABORTED);
};

/**
 * View command
 */
const view_cli = async (d: DataContainer) => {
	if (!d.opened_diary) return default_cli(d);

	info(d, p.MONTH_PROMPT);

	const date_obj = await get_date_prompt(d, true);
	if (date_obj === null) return;
	if (date_obj === undefined) return success(d, p.ABORTED);

	let days: Array<DailyEntry> = [];

	const y_index = d.opened_diary.diary.years.findIndex(
		y => y.year === date_obj.getFullYear()
	);
	if (y_index !== -1) {
		const m_index = d.opened_diary.diary.years[y_index].months.findIndex(
			m => m.month === date_obj.getMonth() + 1
		);
		if (m_index !== -1)
			days = d.opened_diary.diary.years[y_index].months[m_index].days;
	}

	/**
	 *   1  2  3  4  5  6  0 - original getDay()
	 *   0  1  2  3  4  5  6 - modified
	 * ┌───────────────────────────────────┐
	 * │ Mon  Tue  Wed  Thu  Fri  Sat  Sun │
	 * │  ?    02   03   04   05   06   07 │
	 * └───────────────────────────────────┘
	 */

	// number of days in month
	const day_count = new Date(
		date_obj.getFullYear(),
		date_obj.getMonth() + 1,
		0
	).getDate();

	// what weekday the first day of the month is
	let first_day_index = new Date(
		date_obj.getFullYear(),
		date_obj.getMonth(),
		1
	).getDay();
	first_day_index = first_day_index === 0 ? 6 : first_day_index - 1;

	const display_calender: Array<Array<string>> = [[]];
	let current_row = 0;

	for (let i = 0; i < first_day_index; i++) display_calender[0].push('     ');

	for (let i = 0; i < day_count; i++) {
		if (display_calender[current_row].length === 7) {
			current_row++;
			display_calender.push([]);
		}

		const day = days.find(_ => _.day === i + 1);

		if (!day) {
			display_calender[current_row].push(
				` ${chalk.bold('?')}${zero_pad(i + 1, 2)} `
			);
		} else {
			const special = day.is_important ? '+' : ' ';
			const text = ` ${special}${zero_pad(i + 1, 2)} `;

			display_calender[current_row].push(colour_rating(day.rating, text));
		}
	}

	while (display_calender[display_calender.length - 1].length < 7)
		display_calender[display_calender.length - 1].push('     ');

	const header_text = `${
		Month[date_obj.getMonth() + 1]
	} ${date_obj.getFullYear()}`;

	info(d, [
		'┌───────────────────────────────────┐',
		`│ ${header_text}${' '.repeat(34 - header_text.length)}│`,
		'├───────────────────────────────────┤',
		'│ Mon  Tue  Wed  Thu  Fri  Sat  Sun │',
	]);

	display_calender.map(row => info(d, `│${row.join('')}│`));

	info(d, '└───────────────────────────────────┘');
};

/**
 * List command
 */
const list_cli = async (d: DataContainer) => {
	if (!d.opened_diary) return default_cli(d);

	info(d, p.MONTH_PROMPT);
	const date_obj = await get_date_prompt(d, true);

	if (date_obj === null) return;
	if (date_obj === undefined) return success(d, p.ABORTED);

	const y_index = d.opened_diary.diary.years.findIndex(
		y => y.year === date_obj.getFullYear()
	);
	if (y_index === -1) return;

	const m_index = d.opened_diary.diary.years[y_index].months.findIndex(
		m => m.month === date_obj.getMonth() + 1
	);
	if (m_index === -1) return;

	const days = d.opened_diary.diary.years[y_index].months[m_index].days;
	if (!days.length) return;

	days.sort((a, b) => a.day - b.day);

	info(d, `┏${'━'.repeat(process.stdout.columns - 6)}`);
	const header_text = `${p.LIST_INFO}${chalk.bold`${
		Month[d.opened_diary.diary.years[y_index].months[m_index].month]
	} ${d.opened_diary.diary.years[y_index].year}`}`;
	info(d, `┃ ${header_text}`);
	info(d, `┣${'━'.repeat(process.stdout.columns - 6)}`);

	days.map((_, i) => {
		const date_text = readable_date(
			new Date(date_obj.getFullYear(), date_obj.getMonth(), _.day)
		);

		info(
			d,
			`┃ ${date_text}${' '.repeat(30 - date_text.length)}(${colour_rating(
				_.rating,
				_.rating.toString()
			)}/5)`
		);

		if (_.description) {
			info(d, `┠─Notes${'─'.repeat(process.stdout.columns - 12)}`);
			info(
				d,
				_.description.split('\n').map(t => '┃ ' + t)
			);
		}

		info(
			d,
			`${i + 1 === days.length ? '┗' : '┣'}${'━'.repeat(
				process.stdout.columns - 6
			)}`
		);
	});
};

/**
 * Export command
 */
const export_cli = async (d: DataContainer) => {
	if (!d.opened_diary) return default_cli(d);

	try {
		await fsp.mkdir(EXPORT_PATH);
		// eslint-disable-next-line no-empty
	} catch (err) {}

	try {
		const file_path = `${EXPORT_PATH}/${EXPORT_NAME}`;
		await fsp.writeFile(file_path, JSON.stringify(d.opened_diary.diary));

		info(d, p.EXPORT_SUCCESS + file_path);
	} catch (e) {
		err(d, p.EXPORT_FAIL, String(e));
	}
};

/**
 * Second half of import command
 * Extracted because it is called twice in the first half
 */
const real_import_json_diary = async (d: DataContainer) => {
	try {
		const file_contents = await fsp.readFile(`${IMPORT_PATH}/${EXPORT_NAME}`);

		d.opened_diary = {
			diary: JSON.parse(file_contents.toString('utf8')),
			key: null,
		};

		success(d, p.IMPORT_SUCCESS);
		d.changes_made = true;
	} catch (e) {
		err(d, p.IMPORT_FAIL, String(e));
	}
};

/**
 * Import command
 */
const import_cli = async (d: DataContainer) => {
	if (!d.opened_diary) return default_cli(d);

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

		if (proceed) await real_import_json_diary(d);
		else success(d, p.ABORTED);
	} else {
		await real_import_json_diary(d);
	}
};

/**
 * Main loop of the program
 * Prompts the user for input
 */
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
			case 'download':
				await download_diary_cli(d);
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
			case 'add':
				await add_cli(d);
				break;
			case 'del':
				await del_cli(d);
				break;
			case 'edit':
				await edit_cli(d);
				break;
			case 'view':
				await view_cli(d);
				break;
			case 'list':
				await list_cli(d);
				break;
			case 'export':
				await export_cli(d);
				break;
			case 'import':
				await import_cli(d);
				break;
			case 'quit':
				await quit_cli(d);
				break;
			// case 'debug':
			// 	console.log('[DEBUG]', d.settings);
			// 	console.log('[DEBUG]', d.opened_diary);
			// 	console.log(
			// 		'[DEBUG]',
			// 		d.client ? 'oauth2client exists' : 'oauth2client does not exist'
			// 	);
			// 	console.log('[DEBUG] changes_made', d.changes_made);
			// 	break;
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

/**
 * main is main
 */
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
