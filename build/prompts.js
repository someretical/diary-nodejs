"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AUTH_CONFIRM = exports.ENTER_PWD = exports.WRONG_PWD = exports.LOCAL_DIARY_NOT_FOUND = exports.LOCAL_DIARY_FOUND = exports.DUMP_FAIL = exports.DUMP_SUCCESS = exports.START_DUMP = exports.MISSING_OAUTH2 = exports.CREDENTIALS_DELETED = exports.WELCOME = exports.FATAL_ERR = exports.QUIT = exports.UNSAVED_CHANGES = exports.UPLOAD_FAIL = exports.UPLOAD_SUCCESS = exports.LOCAL_SAVE_ERR = exports.LOCAL_SAVED = exports.NEW_PWD_SET = exports.NEW_PWD_FAIL = exports.NEW_PWD_CONFIRM = exports.NEW_PWD = exports.SYNC_DISABLED = exports.SYNC_ENABLED = exports.ASK_SYNC_DISABLE = exports.ASK_SYNC_ENABLE = exports.DOWNLOAD_SUCCESS = exports.DOWNLOAD_FAIL = exports.GAPI_ERR = exports.ASK_OVERWRITE = exports.ABORTED = exports.OPENED_DIARY = exports.HELP_DIARY_OPEN = exports.HELP_DIARY_CLOSED = exports.DIARY_CREATE = exports.UNKNOWN_CMD = void 0;
const types_1 = require("./types");
const chalk_1 = __importDefault(require("chalk"));
exports.UNKNOWN_CMD = `Unknown command. Type {help} to view all available commands in the current context.`;
exports.DIARY_CREATE = `A new diary was created. Type {help} to see new commands.`;
exports.HELP_DIARY_CLOSED = 'Commands: {dump} {flush} {help} {import} {new} {open} {quit}';
exports.HELP_DIARY_OPEN = 'Commands: {close} {help} {pwd} {quit} {sync}';
exports.OPENED_DIARY = 'Diary opened. Type {help} to see new commands.';
exports.ABORTED = 'Aborted.';
exports.ASK_OVERWRITE = `Are you sure you want to ${chalk_1.default.bold('overwrite')} the existing diary?`;
exports.GAPI_ERR = `Failed to retrieve an access token. If this was not intentional, make sure you check ${chalk_1.default.bold('all')} permissions needed by the app during the authorization process.`;
exports.DOWNLOAD_FAIL = 'Failed to download the diary. This could be because there were no files in Google Drive. Type {new} to create a new diary.';
exports.DOWNLOAD_SUCCESS = 'Successfully downloaded diary from Google Drive.';
exports.ASK_SYNC_ENABLE = `Google Drive sync is currently ${chalk_1.default.bold('enabled')}. Would you like to ${chalk_1.default.bold('disable')} it?`;
exports.ASK_SYNC_DISABLE = `Google Drive sync is currently ${chalk_1.default.bold('disabled')}. Would you like to ${chalk_1.default.bold('enable')} it?`;
exports.SYNC_ENABLED = `Google Drive sync has been ${chalk_1.default.bold('enabled')}.`;
exports.SYNC_DISABLED = `Google Drive sync has been ${chalk_1.default.bold('disabled')}.`;
exports.NEW_PWD = 'Please enter a new password. Entering nothing will remove the password.';
exports.NEW_PWD_CONFIRM = 'Please repeat the new password.';
exports.NEW_PWD_FAIL = `The two passwords did not ${chalk_1.default.bold('match')}.`;
exports.NEW_PWD_SET = `The password has been ${chalk_1.default.bold('updated')}.`;
exports.LOCAL_SAVED = `The diary has been ${chalk_1.default.bold('saved')} locally.`;
exports.LOCAL_SAVE_ERR = 'The diary was unable to be saved locally.';
exports.UPLOAD_SUCCESS = 'The diary has been succesfully backed up on Google Drive.';
exports.UPLOAD_FAIL = 'Failed to upload diary to Google Drive.';
exports.UNSAVED_CHANGES = `You have ${chalk_1.default.bold('unsaved')} changes. To save them, type {no}, then {close}. Are you sure you want to quit?`;
exports.QUIT = 'Quitting...';
exports.FATAL_ERR = `It seems a ${chalk_1.default.bold('fatal')} error has occurred. The program will shut down ${chalk_1.default.bold('immediately')}.`;
exports.WELCOME = [
    `Welcome to the CLI for ${chalk_1.default.blue('online-diary')} (v${types_1.VERSION})`,
    'Type {help} to see all available commands.',
    'If this is your first time on another device, type {import} first to sync your diary.',
];
exports.CREDENTIALS_DELETED = 'The Google OAuth2 access token was deleted.';
exports.MISSING_OAUTH2 = 'This command requires access to your Google Drive.';
exports.START_DUMP = 'Started downloading all diary files from Google Drive...';
exports.DUMP_SUCCESS = `Finished downloading all diary files from Google Drive to ${types_1.DUMP_PATH}`;
exports.DUMP_FAIL = 'Failed to download all diary files from Google Drive. ';
exports.LOCAL_DIARY_FOUND = 'Local diary found. Opening...';
exports.LOCAL_DIARY_NOT_FOUND = 'No existing diary was found. A new one will be created.';
exports.WRONG_PWD = 'Wrong password. To overwrite the local diary, abort this command and type {new}';
exports.ENTER_PWD = 'Please enter the password. To abort this command, simply type nothing and press enter.';
exports.AUTH_CONFIRM = [
    'Authorization URL (paste into browser): ',
    'Please paste the access code below.',
];
