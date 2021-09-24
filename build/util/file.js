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
const types_1 = require("./types");
const encryptor_1 = require("./encryptor");
const zipper_1 = require("./zipper");
const fs_1 = require("fs");
const stream_1 = require("stream");
const util_1 = require("util");
const __1 = require("..");
const google_driver_1 = require("./google_driver");
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
    }
    catch (err) {
        try {
            unzipped = await (0, zipper_1.unzip)(types_1.BACKUP_PATH);
        }
        catch (err) { }
    }
    const prompt = async () => {
        pwd = await (0, __1.prompt_pwd)();
        try {
            const tmp = (0, encryptor_1.decrypt)(unzipped || Buffer.from(''), (0, encryptor_1.hash_key)(pwd));
            return { diary: JSON.parse(tmp.toString('utf8')), key: pwd };
        }
        catch (err) {
            return prompt();
        }
    };
    if (unzipped !== null) {
        try {
            const tmp = JSON.parse(unzipped.toString('utf8'));
            return { diary: tmp, key: pwd };
        }
        catch (err) {
            return prompt();
        }
    }
    else {
        return { diary: parsed, key: pwd };
    }
};
exports.open_diary = open_diary;
const save_diary = async (open_diary, settings, oauth2client) => {
    const src = fs.createReadStream(types_1.DIARY_PATH);
    const dest = fs.createWriteStream(types_1.BACKUP_PATH);
    await _pipe(src, dest);
    let encrypted = Buffer.from(JSON.stringify(open_diary.diary));
    if (open_diary.key !== null)
        encrypted = (0, encryptor_1.encrypt)(encrypted, (0, encryptor_1.hash_key)(open_diary.key));
    await (0, zipper_1.gzip)(types_1.DIARY_PATH, encrypted);
    if (settings.sync) {
        await (0, google_driver_1.upload_diary)(oauth2client, settings);
    }
};
exports.save_diary = save_diary;
