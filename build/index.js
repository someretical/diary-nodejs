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
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const fs_2 = require("fs");
const encryptor_1 = require("./encryptor");
const inquirer_1 = __importDefault(require("inquirer"));
const zero_pad = (num, places) => {
    let str = num.toString();
    while (str.length < places)
        str = '0' + str;
    return str;
};
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
const get_date_prompt = async () => {
    const { date_input } = await inquirer_1.default.prompt([
        {
            name: 'date_input',
            message: '[>D]',
            prefix: '',
            suffix: '',
        },
    ]);
    const date = [0, 0, 0];
    if (!date_input) {
        const _ = new Date();
        date[0] = _.getFullYear();
        date[1] = _.getMonth() + 1;
        date[2] = _.getDate();
    }
    else if (date_input === 'cancel') {
        return [-1, -1, -1];
    }
    else {
        const [one, two, three] = date_input.split(' ');
        let date_obj;
        if (one && two && three) {
            date_obj = new Date(parseInt(one), parseInt(two) - 1, parseInt(three));
        }
        else if (one && two) {
            const now = new Date();
            date_obj = new Date(now.getFullYear(), parseInt(one) - 1, parseInt(two));
        }
        else {
            const now = new Date();
            date_obj = new Date(now.getFullYear(), now.getMonth(), parseInt(one));
        }
        if (date_obj.toString() === 'Invalid Date')
            throw new Error();
        date[0] = date_obj.getFullYear();
        date[1] = date_obj.getMonth() + 1;
        date[2] = date_obj.getDate();
    }
    return date;
};
const get_rating_prompt = async () => {
    const { rating } = await inquirer_1.default.prompt([
        {
            name: 'rating',
            message: '[>D]',
            prefix: '',
            suffix: '',
            validate: input => {
                const num = parseInt(String(input));
                if (Number.isNaN(num) || num < 1 || num > 5)
                    return p.INVALID_RATING;
                return true;
            },
        },
    ]);
    return parseInt(rating);
};
const get_message_prompt = async () => {
    const { message } = await inquirer_1.default.prompt([
        {
            name: 'message',
            message: '[>D]',
            prefix: '',
            suffix: '',
            validate: input => {
                if (String(input).length > 1000)
                    return p.INVALID_MESSAGE;
                return true;
            },
        },
    ]);
    return message;
};
const get_special_prompt = async () => {
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
    return status;
};
const confirm_entry_prompt = async (d, rating, msg, special) => {
    (0, cli_1.info)(d, [
        p.CONFIRM_ENTRY[0],
        p.CONFIRM_ENTRY[1] + rating.toString(),
        p.CONFIRM_ENTRY[2] + (msg || 'None'),
        p.CONFIRM_ENTRY[3] + (special ? p.YES : p.NO),
    ]);
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
    return status;
};
const check_entry_exists = (d, date) => {
    if (!d.opened_diary)
        return false;
    const y_index = d.opened_diary.diary.years.findIndex(y => y.year === date[0]);
    if (y_index === -1)
        return false;
    const m_index = d.opened_diary.diary.years[y_index].months.findIndex(m => m.month === date[1]);
    if (m_index === -1)
        return false;
    const d_index = d.opened_diary.diary.years[y_index].months[m_index].days.findIndex(d => d.day === date[2]);
    if (d_index === -1)
        return false;
    return true;
};
const save_entry = (d, date, rating, msg, special) => {
    if (!d.opened_diary)
        return;
    let y_index = d.opened_diary.diary.years.findIndex(y => y.year === date[0]);
    if (y_index === -1) {
        d.opened_diary.diary.years.push({ year: date[0], months: [] });
        y_index = d.opened_diary.diary.years.length - 1;
    }
    let m_index = d.opened_diary.diary.years[y_index].months.findIndex(m => m.month === date[1]);
    if (m_index === -1) {
        d.opened_diary.diary.years[y_index].months.push({
            month: date[1],
            days: [],
        });
        m_index = d.opened_diary.diary.years[y_index].months.length - 1;
    }
    const d_index = d.opened_diary.diary.years[y_index].months[m_index].days.findIndex(d => d.day === date[2]);
    if (d_index !== -1) {
        d.opened_diary.diary.years[y_index].months[m_index].days[d_index] = {
            day: date[2],
            last_updated: Date.now(),
            rating,
            description: msg,
            is_important: special,
        };
    }
    else {
        d.opened_diary.diary.years[y_index].months[m_index].days.push({
            day: date[2],
            last_updated: Date.now(),
            rating,
            description: msg,
            is_important: special,
        });
    }
    (0, cli_1.success)(d, p.ENTRY_ADDED);
    d.changes_made = true;
};
const add_cli = async (d) => {
    if (!d.opened_diary)
        return default_cli(d);
    const date = [0, 0, 0];
    (0, cli_1.info)(d, p.DATE_PROMPT);
    try {
        const [y, m, _d] = await get_date_prompt();
        if (y === -1 && m === -1 && _d === -1)
            return (0, cli_1.success)(d, p.ABORTED);
        date[0] = y;
        date[1] = m;
        date[2] = _d;
    }
    catch (err) {
        return (0, cli_1.warn)(d, p.INVALID_DATE);
    }
    if (check_entry_exists(d, date))
        return (0, cli_1.warn)(d, p.ENTRY_EXISTS);
    const _date = new Date(date[0], date[1] - 1, date[2]);
    const header_text = chalk_1.default.bold `${types_1.Day[_date.getDay()]} ${_date.getFullYear()}/${zero_pad(_date.getMonth() + 1, 2)}/${zero_pad(_date.getDate(), 2)}`;
    (0, cli_1.info)(d, p.NOW_EDITING + header_text);
    (0, cli_1.info)(d, p.PROMPT_RATING);
    const rating = await get_rating_prompt();
    (0, cli_1.info)(d, p.PROMPT_MESSAGE);
    const message = await get_message_prompt();
    (0, cli_1.info)(d, p.PROMPT_IS_SPECIAL);
    const is_special = await get_special_prompt();
    if (await confirm_entry_prompt(d, rating, message, is_special))
        save_entry(d, date, rating, message, is_special);
    else
        (0, cli_1.success)(d, p.ABORTED);
};
const del_cli = async (d) => {
    if (!d.opened_diary)
        return default_cli(d);
};
const edit_cli = async (d) => {
    if (!d.opened_diary)
        return default_cli(d);
};
const get_month_prompt = async () => {
    const { date_input } = await inquirer_1.default.prompt([
        {
            name: 'date_input',
            message: '[>D]',
            prefix: '',
            suffix: '',
        },
    ]);
    const date_values = [0, 0, 0];
    if (!date_input) {
        const _ = new Date();
        date_values[0] = _.getFullYear();
        date_values[1] = _.getMonth() + 1;
    }
    else if (date_input === 'cancel') {
        return [-1, -1];
    }
    else {
        const [one, two] = date_input.split(' ');
        let date_obj;
        if (one && two) {
            date_obj = new Date(parseInt(one), parseInt(two) - 1);
        }
        else if (one) {
            const now = new Date();
            date_obj = new Date(now.getFullYear(), parseInt(one) - 1);
        }
        else {
            const now = new Date();
            date_obj = new Date(now.getFullYear(), now.getMonth());
        }
        if (date_obj.toString() === 'Invalid Date')
            throw new Error();
        date_values[0] = date_obj.getFullYear();
        date_values[1] = date_obj.getMonth() + 1;
    }
    return date_values;
};
const view_cli = async (d) => {
    if (!d.opened_diary)
        return default_cli(d);
    const date_values = [0, 0];
    (0, cli_1.info)(d, p.MONTH_PROMPT);
    try {
        const [y, m] = await get_month_prompt();
        if (y === -1 && m === -1)
            return (0, cli_1.success)(d, p.ABORTED);
        date_values[0] = y;
        date_values[1] = m;
    }
    catch (err) {
        return (0, cli_1.warn)(d, p.INVALID_DATE);
    }
    const date = new Date(date_values[0], date_values[1] - 1);
    let days = [];
    const y_index = d.opened_diary.diary.years.findIndex(y => y.year === date.getFullYear());
    if (y_index !== -1) {
        const m_index = d.opened_diary.diary.years[y_index].months.findIndex(m => m.month === date.getMonth() + 1);
        if (m_index !== -1)
            days = d.opened_diary.diary.years[y_index].months[m_index].days;
    }
    const day_count = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    let first_day_index = new Date(date.getFullYear(), date.getMonth(), 1).getDay();
    first_day_index = first_day_index === 0 ? 6 : first_day_index - 1;
    const display_calender = [[]];
    let current_row = 0;
    for (let i = 0; i < first_day_index; i++)
        display_calender[0].push('     ');
    for (let i = 0; i < day_count; i++) {
        if (display_calender[current_row].length === 7) {
            current_row++;
            display_calender.push([]);
        }
        const day = days.find(_ => _.day === i + 1);
        if (!day) {
            display_calender[current_row].push(` ${chalk_1.default.bold('?')}${zero_pad(i + 1, 2)} `);
        }
        else {
            const special = day.is_important ? '+' : ' ';
            const text = ` ${special}${zero_pad(i + 1, 2)} `;
            display_calender[current_row].push(day.rating === 1
                ? chalk_1.default.bgRedBright(text)
                : day.rating === 2
                    ? chalk_1.default.bgYellowBright.black(text)
                    : day.rating === 3
                        ? chalk_1.default.inverse(text)
                        : day.rating === 4
                            ? chalk_1.default.bgCyanBright.black(text)
                            : chalk_1.default.bgGreenBright(text));
        }
    }
    while (display_calender[display_calender.length - 1].length < 7)
        display_calender[display_calender.length - 1].push('     ');
    const header_text = `${types_1.Month[date.getMonth() + 1]} ${date.getFullYear()}`;
    (0, cli_1.info)(d, [
        '┌───────────────────────────────────┐',
        `│ ${header_text}${' '.repeat(34 - header_text.length)}│`,
        '├───────────────────────────────────┤',
        '│ Mon  Tue  Wed  Thu  Fri  Sat  Sun │',
    ]);
    display_calender.map(row => (0, cli_1.info)(d, `│${row.join('')}│`));
    (0, cli_1.info)(d, '└───────────────────────────────────┘');
};
const list_cli = async (d) => {
    if (!d.opened_diary)
        return default_cli(d);
    const date_values = [0, 0];
    (0, cli_1.info)(d, p.MONTH_PROMPT);
    try {
        const [y, m] = await get_month_prompt();
        if (y === -1 && m === -1)
            return (0, cli_1.success)(d, p.ABORTED);
        date_values[0] = y;
        date_values[1] = m;
    }
    catch (err) {
        return (0, cli_1.warn)(d, p.INVALID_DATE);
    }
    const date = new Date(date_values[0], date_values[1] - 1);
    const y_index = d.opened_diary.diary.years.findIndex(y => y.year === date.getFullYear());
    if (y_index === -1)
        return;
    const m_index = d.opened_diary.diary.years[y_index].months.findIndex(m => m.month === date.getMonth() + 1);
    if (m_index === -1)
        return;
    const days = d.opened_diary.diary.years[y_index].months[m_index].days;
    if (!days.length)
        return;
    days.sort((a, b) => a.day - b.day);
    (0, cli_1.info)(d, `┏${'━'.repeat(process.stdout.columns - 6)}`);
    const header_text = `${p.LIST_INFO}${chalk_1.default.bold `${types_1.Month[d.opened_diary.diary.years[y_index].months[m_index].month]} ${d.opened_diary.diary.years[y_index].year}`}`;
    (0, cli_1.info)(d, `┃ ${header_text}`);
    (0, cli_1.info)(d, `┣${'━'.repeat(process.stdout.columns - 6)}`);
    days.map((_, i) => {
        const date_obj = new Date(date.getFullYear(), date.getMonth(), _.day);
        const fmt_day = chalk_1.default.bold `${types_1.Day[date_obj.getDay()]} ${date.getFullYear()}/${zero_pad(date.getMonth() + 1, 2)}/${zero_pad(_.day, 2)}`;
        const fmt_rating = _.rating === 1
            ? chalk_1.default.bgRedBright('1')
            : _.rating === 2
                ? chalk_1.default.bgYellowBright.black('2')
                : _.rating === 3
                    ? chalk_1.default.inverse('3')
                    : _.rating === 4
                        ? chalk_1.default.bgCyanBright.black('4')
                        : chalk_1.default.bgGreenBright('5');
        (0, cli_1.info)(d, `┃ ${fmt_day}${' '.repeat(30 - fmt_day.length)}(${fmt_rating}/5)`);
        if (_.description) {
            (0, cli_1.info)(d, `┠─Notes${'─'.repeat(process.stdout.columns - 12)}`);
            (0, cli_1.info)(d, _.description.split('\n').map(t => '┃ ' + t));
        }
        (0, cli_1.info)(d, `${i + 1 === days.length ? '┗' : '┣'}${'━'.repeat(process.stdout.columns - 6)}`);
    });
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
            case 'quit':
                await quit_cli(d);
                break;
            case 'debug':
                console.log('[DEBUG]', d.settings);
                console.log('[DEBUG]', d.opened_diary);
                console.log('[DEBUG]', d.client ? 'oauth2client exists' : 'oauth2client does not exist');
                console.log('[DEBUG] changes_made', d.changes_made);
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
