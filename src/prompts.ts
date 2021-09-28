import { DIARY_NAME, DUMP_PATH, EXPORT_PATH, VERSION } from './types';
import chalk from 'chalk';

/**
 * index.ts
 */
export const UNKNOWN_CMD =
	'Unknown command. Type {help} to view all available commands in the current context.';

export const DIARY_CREATE =
	'A new diary was created. Type {help} to see new commands.';

export const HELP_DIARY_CLOSED =
	'Commands: {download} {dump} {flush} {help} {import} {new} {open} {quit}';

export const HELP_DIARY_OPEN =
	'Commands: {add} {close} {del} {edit} {export} {help} {list} {pwd} {quit} {sync} {view}';

export const OPENED_DIARY = 'Diary opened. Type {help} to see new commands.';

export const ABORTED = 'Aborted.';

export const ASK_OVERWRITE = `Are you sure you want to ${chalk.bold(
	'overwrite'
)} the existing diary?`;

export const GAPI_ERR = `Failed to retrieve an access token. If this was not intentional, make sure you check ${chalk.bold(
	'all'
)} permissions needed by the app during the authorization process.`;

export const DOWNLOAD_FAIL =
	'Failed to download the diary. This could be because there were no files in Google Drive. Type {new} to create a new diary.';

export const DOWNLOAD_SUCCESS =
	'Successfully downloaded diary from Google Drive.';

export const ASK_SYNC_ENABLE = `Google Drive sync is currently ${chalk.bold(
	'enabled'
)}. Would you like to ${chalk.bold('disable')} it?`;

export const ASK_SYNC_DISABLE = `Google Drive sync is currently ${chalk.bold(
	'disabled'
)}. Would you like to ${chalk.bold('enable')} it?`;

export const SYNC_ENABLED = `Google Drive sync has been ${chalk.bold(
	'enabled'
)}.`;

export const SYNC_DISABLED = `Google Drive sync has been ${chalk.bold(
	'disabled'
)}.`;

export const NEW_PWD =
	'Please enter a new password. Entering nothing will remove the password.';

export const NEW_PWD_CONFIRM = 'Please repeat the new password.';

export const NEW_PWD_FAIL = `The two passwords did not ${chalk.bold('match')}.`;

export const NEW_PWD_SET = `The password has been ${chalk.bold('updated')}.`;

export const LOCAL_SAVED = `The diary has been ${chalk.bold('saved')} locally.`;

export const LOCAL_SAVE_ERR = 'The diary was unable to be saved locally.';

export const UPLOAD_SUCCESS =
	'The diary has been succesfully backed up on Google Drive.';

export const UPLOAD_FAIL = 'Failed to upload diary to Google Drive.';

export const UNSAVED_CHANGES = `You have ${chalk.bold(
	'unsaved'
)} changes. To save them, type {no}, then {close}. Are you sure you want to quit?`;

export const QUIT = 'Quitting...';

export const FATAL_ERR = `It seems a ${chalk.bold(
	'fatal'
)} error has occurred. The program will shut down ${chalk.bold(
	'immediately'
)}.`;

export const WELCOME = [
	`Welcome to the CLI for ${chalk.blue('online-diary')} (v${VERSION})`,
	'Type {help} to see all available commands.',
	'If this is your first time on another device, type {download} first to sync your diary.',
];

export const CREDENTIALS_DELETED =
	'The Google OAuth2 access token was deleted.';

export const MISSING_OAUTH2 =
	'This command requires access to your Google Drive.';

export const START_DUMP =
	'Started downloading all diary files from Google Drive...';

export const DUMP_SUCCESS = `Finished downloading all diary files from Google Drive to ${DUMP_PATH}`;

export const DUMP_FAIL =
	'Failed to download all diary files from Google Drive.';

export const DATE_PROMPT = [
	`Please type a valid date in ${chalk.bold('YYYY MM DD')} format.`,
	`If ${chalk.bold(
		'YYYY'
	)} is excluded, it will be assumed from the system clock.`,
	`If ${chalk.bold(
		'YYYY MM'
	)} are excluded, they will be assumed from the system clock.`,
	`To completely assume the current time, enter nothing.`,
	`To abort this command, type {cancel}.`,
];

export const MONTH_PROMPT = [
	`Please type a valid date in ${chalk.bold('YYYY MM')} format.`,
	`If ${chalk.bold(
		'YYYY'
	)} is excluded, it will be assumed from the system clock.`,
	`To completely assume the current time, enter nothing.`,
	`To abort this command, type {cancel}.`,
];

export const INVALID_DATE =
	'The app was unable to parse the date you provided.';

export const NOW_EDITING = 'Now editing ';

export const PROMPT_RATING = 'Please rate this day on the scale of 1-5.';

export const INVALID_RATING = 'Invalid rating.';

export const PROMPT_MESSAGE =
	'Please provide a message for this day. You can enter nothing to skip this step.';

export const INVALID_MESSAGE =
	'The message has a maximum length of 1000 characters.';

export const PROMPT_IS_SPECIAL = 'Do you want to make this day as important?';

export const CONFIRM_ENTRY = [
	`Please ${chalk.bold`confirm`} the following details:`,
	`${chalk.bold`Day:`}       `,
	`${chalk.bold`Rating:`}    `,
	`${chalk.bold`Message:`}   `,
	`${chalk.bold`Important?`} `,
];

export const YES = 'yes';

export const NO = 'no';

export const ENTRY_EXISTS =
	'An entry already exists. Type {edit} to modify an existing entry.';

export const ENTRY_ADDED = 'The entry has been added to the diary.';

export const LIST_INFO = 'Listing all entries for ';

export const EXPORT_SUCCESS = 'The diary has been exported to ';

export const EXPORT_FAIL = 'Failed to export the diary.';

export const IMPORT_SUCCESS =
	'The diary has been successfully imported. Type {help} to see new commands.';

export const IMPORT_FAIL = `Failed to import the diary. Make sure there is a file named ${DIARY_NAME}.json in ${EXPORT_PATH}`;

export const UNKNOWN_ENTRY = 'No entry for this date exists.';

export const ASK_DELETE = 'Are you sure you want to delete this entry?';

export const ENTRY_DELETED = 'The entry was deleted.';

export const ORIGINAL = 'Original:';

/**
 * file_system.ts
 */
export const LOCAL_DIARY_FOUND = 'Local diary found. Opening...';

export const LOCAL_DIARY_NOT_FOUND =
	'No existing diary was found. A new one will be created.';

export const WRONG_PWD =
	'Wrong password. To overwrite the local diary, abort this command and type {new}';

export const ENTER_PWD =
	'Please enter the password. To abort this command, simply type nothing and press enter.';

/**
 * google_driver.ts
 */
export const AUTH_CONFIRM = [
	'Authorization URL (paste into browser): ',
	'Please paste the access code below.',
];
