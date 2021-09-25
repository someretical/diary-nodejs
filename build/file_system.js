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
Object.defineProperty(exports, "__esModule", { value: true });
exports.save_diary = exports.open_diary = exports.get_settings = void 0;
const fs = __importStar(require("fs"));
const inquirer = __importStar(require("inquirer"));
const types_1 = require("./types");
const encryptor_1 = require("./encryptor");
const zipper_1 = require("./zipper");
const fs_1 = require("fs");
const stream_1 = require("stream");
const util_1 = require("util");
const _pipe = (0, util_1.promisify)(stream_1.pipeline);
const get_settings = async () => {
    try {
        const settings = await fs_1.promises.readFile(types_1.SETTINGS_PATH);
        return JSON.parse(settings.toString('utf8'));
    }
    catch (err) {
        const settings = {
            sync: false,
            backup1_id: null,
            backup2_id: null,
        };
        await fs_1.promises.writeFile(types_1.SETTINGS_PATH, JSON.stringify(settings));
        return settings;
    }
};
exports.get_settings = get_settings;
const open_diary = async () => {
    let unzipped = null, pwd = null;
    const parsed = {
        years: [],
        settings: {},
        metadata: {
            version: types_1.FILE_VERSION,
            last_updated: Date.now(),
        },
    };
    try {
        unzipped = await (0, zipper_1.unzip)(types_1.DIARY_PATH);
        console.log('[*] Local diary found. Opening...');
    }
    catch (err) {
        try {
            unzipped = await (0, zipper_1.unzip)(types_1.BACKUP_PATH);
            console.log('[*] Local diary found. Opening...');
        }
        catch (err) {
            console.log('[*] No existing diary was found. A new one will be created.');
        }
    }
    const prompt_pwd = async () => {
        const answer = await inquirer.prompt([
            {
                type: 'password',
                message: '[>]',
                name: 'pwd',
                mask: '*',
                prefix: '',
                suffix: '',
            },
        ]);
        if (!answer.pwd)
            throw new Error();
        pwd = (0, encryptor_1.hash_key)(answer.pwd);
        try {
            const tmp = (0, encryptor_1.decrypt)(unzipped || Buffer.from(''), pwd);
            return { diary: JSON.parse(tmp.toString('utf8')), key: pwd };
        }
        catch (err) {
            console.log('[!] Wrong password. To overwrite the local diary, abort this command and type `new`');
            return prompt_pwd();
        }
    };
    if (unzipped !== null) {
        try {
            const tmp = JSON.parse(unzipped.toString('utf8'));
            return { diary: tmp, key: pwd };
        }
        catch (err) {
            console.log('[*] Please enter the password. To abort this command, simply type nothing and press enter.');
            return prompt_pwd();
        }
    }
    else {
        return { diary: parsed, key: pwd };
    }
};
exports.open_diary = open_diary;
const save_diary = async (open_diary) => {
    try {
        const src = fs.createReadStream(types_1.DIARY_PATH);
        const dest = fs.createWriteStream(types_1.BACKUP_PATH);
        await _pipe(src, dest);
    }
    catch (err) { }
    let encrypted = Buffer.from(JSON.stringify(open_diary.diary));
    if (open_diary.key !== null)
        encrypted = (0, encryptor_1.encrypt)(encrypted, open_diary.key);
    await (0, zipper_1.gzip)(types_1.DIARY_PATH, encrypted);
};
exports.save_diary = save_diary;
