"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const p = __importStar(require("./prompts"));
const types_1 = require("./types");
const google_driver_1 = require("./google_driver");
const cli_1 = require("./cli");
const file_system_1 = require("./file_system");
const fs_1 = __importDefault(require("fs"));
const fs_2 = require("fs");
const encryptor_1 = require("./encryptor");
const inquirer_1 = __importDefault(require("inquirer"));
const default_cli = (d) => (0, cli_1.warn)(d, p.UNKNOWN_CMD);
const make_new_diary = (d) => {
    d.changes_made = true;
    (0, cli_1.info)(d, p.DIARY_CREATE);
    return {
        key: null,
        diary: {
            years: [],
            settings: {},
            metadata: {
                version: types_1.FILE_VERSION,
                last_updated: Date.now(),
            },
        },
    };
};
const help_cli = (d) => {
    if (!d.opened_diary)
        (0, cli_1.info)(d, p.HELP_DIARY_CLOSED);
    else
        (0, cli_1.info)(d, p.HELP_DIARY_OPEN);
};
const open_cli = async (d) => {
    if (d.opened_diary)
        return default_cli(d);
    try {
        d.opened_diary = await (0, file_system_1.open_diary)();
        (0, cli_1.success)(d, p.OPENED_DIARY);
    }
    catch (err) {
        (0, cli_1.success)(d, p.ABORTED);
    }
};
const new_diary_cli = async (d) => {
    if (d.opened_diary)
        return default_cli(d);
    let exists;
    try {
        await fs_2.promises.access(types_1.DIARY_PATH, fs_1.default.constants.F_OK);
        exists = true;
    }
    catch (err) {
        exists = false;
    }
    if (exists) {
        (0, cli_1.info)(d, p.ASK_OVERWRITE);
        const { proceed } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: '[>]',
                default: false,
                prefix: '',
                suffix: '',
            },
        ]);
        if (proceed)
            d.opened_diary = make_new_diary(d);
        else
            (0, cli_1.success)(d, p.ABORTED);
    }
    else {
        d.opened_diary = make_new_diary(d);
    }
};
const real_import_diary = async (d) => {
    try {
        d.client = await (0, google_driver_1.authorize)();
    }
    catch (err) { }
    if (!d.client || !(await (0, google_driver_1.check_scopes)(d.client))) {
        (0, cli_1.err)(d, p.GAPI_ERR, 'Failed at authorize() in real_import_diary.');
    }
    else {
        let imported = false;
        if (d.settings) {
            d.settings.sync = true;
            try {
                imported = await (0, google_driver_1.import_diary)(d.client, d.settings);
            }
            catch (err) { }
        }
        if (!imported) {
            (0, cli_1.warn)(d, p.DOWNLOAD_FAIL);
        }
        else {
            (0, cli_1.success)(d, p.DOWNLOAD_SUCCESS);
            await open_cli(d);
        }
    }
};
const import_diary_cli = async (d) => {
    if (d.opened_diary)
        return default_cli(d);
    let exists;
    try {
        await fs_2.promises.access(types_1.DIARY_PATH, fs_1.default.constants.F_OK);
        exists = true;
    }
    catch (err) {
        exists = false;
    }
    if (exists) {
        (0, cli_1.info)(d, p.ASK_OVERWRITE);
        const { proceed } = await inquirer_1.default.prompt([
            {
                type: 'confirm',
                name: 'proceed',
                message: '[>]',
                default: false,
                prefix: '',
                suffix: '',
            },
        ]);
        if (proceed)
            await real_import_diary(d);
        else
            (0, cli_1.success)(d, p.ABORTED);
    }
    else {
        await real_import_diary(d);
    }
};
const sync_cli = async (d) => {
    if (!d.settings || !d.opened_diary)
        return default_cli(d);
    const prev = d.settings.sync;
    (0, cli_1.info)(d, prev ? p.ASK_SYNC_ENABLE : p.ASK_SYNC_DISABLE);
    const { status } = await inquirer_1.default.prompt([
        {
            type: 'confirm',
            name: 'status',
            message: `[>D]`,
            default: false,
            prefix: '',
            suffix: '',
        },
    ]);
    d.settings.sync = (prev && !status) || (!prev && status);
    try {
        if (d.settings.sync)
            d.client = await (0, google_driver_1.authorize)();
    }
    catch (err) { }
    if (d.settings.sync && (!d.client || !(await (0, google_driver_1.check_scopes)(d.client)))) {
        d.settings.sync = false;
        if (!d.client)
            (0, cli_1.err)(d, p.GAPI_ERR, 'Failed at authorize() in sync_cli.');
        else
            (0, cli_1.err)(d, p.GAPI_ERR, 'Failed at check_scopes() in sync_cli.');
    }
    if (prev !== d.settings.sync && d.client)
        await fs_2.promises.writeFile(types_1.SETTINGS_PATH, JSON.stringify(d.settings));
    if (d.settings.sync && !prev)
        d.changes_made = true;
    (0, cli_1.success)(d, d.settings.sync ? p.SYNC_ENABLED : p.SYNC_DISABLED);
};
const pwd_cli = async (d) => {
    if (!d.opened_diary)
        return default_cli(d);
    (0, cli_1.info)(d, p.NEW_PWD);
    const { pwd } = await inquirer_1.default.prompt([
        {
            type: 'password',
            message: '[>D]',
            name: 'pwd',
            mask: '*',
            prefix: '',
            suffix: '',
        },
    ]);
    const first_time = pwd ? (0, encryptor_1.hash_key)(pwd) : null;
    (0, cli_1.info)(d, p.NEW_PWD_CONFIRM);
    const { pwd2 } = await inquirer_1.default.prompt([
        {
            type: 'password',
            message: '[>D]',
            name: 'pwd2',
            mask: '*',
            prefix: '',
            suffix: '',
        },
    ]);
    const second_time = pwd2 ? (0, encryptor_1.hash_key)(pwd2) : null;
    if (first_time === second_time) {
        d.opened_diary.key = first_time;
        (0, cli_1.success)(d, p.NEW_PWD_SET);
        d.changes_made = true;
    }
    else {
        (0, cli_1.warn)(d, p.NEW_PWD_FAIL);
    }
};
const close_cli = async (d) => {
    if (!d.settings || !d.opened_diary)
        return default_cli(d);
    let fail_save = false;
    try {
        await (0, file_system_1.save_diary)(d.opened_diary);
        (0, cli_1.success)(d, p.LOCAL_SAVED);
        delete d.opened_diary;
    }
    catch (e) {
        (0, cli_1.err)(d, p.LOCAL_SAVE_ERR, String(e));
        fail_save = true;
    }
    try {
        if (!d.client && d.settings.sync)
            d.client = await (0, google_driver_1.authorize)();
    }
    catch (err) { }
    if (d.settings.sync && d.client) {
        if (!(await (0, google_driver_1.check_scopes)(d.client))) {
            (0, cli_1.err)(d, p.GAPI_ERR, 'Failed at check_scopes() in close_cli.');
        }
        else {
            try {
                await (0, google_driver_1.upload_diary)(d.client, d.settings);
                (0, cli_1.success)(d, p.UPLOAD_SUCCESS);
            }
            catch (e) {
                fail_save = true;
                (0, cli_1.err)(d, p.UPLOAD_FAIL, String(e));
            }
        }
    }
    else if (d.settings.sync) {
        (0, cli_1.err)(d, p.GAPI_ERR, 'Failed at authorize() in close_cli.');
    }
    if (!fail_save)
        d.changes_made = false;
};
const quit_cli = async (d) => {
    if (d.changes_made && d.opened_diary) {
        (0, cli_1.warn)(d, p.UNSAVED_CHANGES);
        const { status } = await inquirer_1.default.prompt([
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
            (0, cli_1.success)(d, p.ABORTED);
        }
        else {
            (0, cli_1.info)(d, p.QUIT);
            process.exit(0);
        }
    }
    else {
        (0, cli_1.info)(d, p.QUIT);
        process.exit(0);
    }
};
const flush_cli = async (d) => {
    if (d.opened_diary)
        return default_cli(d);
    try {
        await fs_2.promises.unlink(types_1.TOKEN_PATH);
    }
    catch (err) { }
    (0, cli_1.info)(d, p.CREDENTIALS_DELETED);
};
const dump_cli = async (d) => {
    if (d.opened_diary)
        return default_cli(d);
    if (!d.client)
        return (0, cli_1.warn)(d, p.MISSING_OAUTH2);
    if (!(await (0, google_driver_1.check_scopes)(d.client))) {
        (0, cli_1.err)(d, p.GAPI_ERR, 'Failed at check_scopes() in close_cli.');
    }
    else {
        try {
            await fs_2.promises.mkdir(types_1.DUMP_PATH);
        }
        catch (err) { }
        try {
            (0, cli_1.info)(d, p.START_DUMP);
            await (0, google_driver_1.dump_drive_files)(d.client, types_1.DUMP_PATH);
            (0, cli_1.success)(d, p.DUMP_SUCCESS);
        }
        catch (e) {
            (0, cli_1.err)(d, p.DUMP_FAIL, String(e));
        }
    }
};
const loop = async (d) => {
    const { cmd } = await inquirer_1.default.prompt([
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
                console.log('[DEBUG]', d.client ? 'oauth2client exists' : 'oauth2client does not exist');
                console.log('[DEBUG] changes_made', d.changes_made);
                break;
            case 'quit':
                await quit_cli(d);
                break;
            default:
                default_cli(d);
                break;
        }
    }
    catch (e) {
        (0, cli_1.err)(d, 'Failed at try, switch in loop.', String(e));
    }
    loop(d);
};
const main = async () => {
    try {
        await fs_2.promises.mkdir(types_1.DATA_PATH);
    }
    catch (err) { }
    const d = { changes_made: false };
    d.settings = await (0, file_system_1.get_settings)();
    (0, cli_1.info)(d, p.WELCOME);
    try {
        loop(d);
    }
    catch (err) {
        (0, cli_1.critical)(d, p.FATAL_ERR, String(err));
        process.exit(1);
    }
};
main();
