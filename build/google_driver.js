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
exports.dump_drive_files = exports.wipe_drive_files = exports.upload_diary = exports.import_diary = exports.list_files = exports.get_access_token = exports.authorize = exports.check_scopes = void 0;
const p = __importStar(require("./prompts"));
const types_1 = require("./types");
const clipboardy_1 = __importDefault(require("clipboardy"));
const details_json_1 = __importDefault(require("./details.json"));
const fs_1 = __importDefault(require("fs"));
const fs_2 = require("fs");
const googleapis_1 = require("googleapis");
const cli_1 = require("./cli");
const inquirer_1 = __importDefault(require("inquirer"));
const path_1 = __importDefault(require("path"));
const util_1 = require("util");
const stream_1 = __importDefault(require("stream"));
const _pipe = (0, util_1.promisify)(stream_1.default.pipeline);
const check_scopes = async (oauth2client, cmp_scopes = types_1.SCOPES) => {
    const { token } = await oauth2client.getAccessToken();
    if (!token)
        return false;
    const { scopes } = await oauth2client.getTokenInfo(token);
    return cmp_scopes.every(s => scopes.includes(s));
};
exports.check_scopes = check_scopes;
const authorize = async () => {
    const { client_secret, client_id, redirect_uris } = details_json_1.default.installed;
    const oauth2client = new googleapis_1.google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    try {
        const data = await fs_2.promises.readFile(types_1.TOKEN_PATH);
        oauth2client.setCredentials(JSON.parse(data.toString('utf8')).tokens);
        return oauth2client;
    }
    catch (err) {
        return (0, exports.get_access_token)(oauth2client);
    }
};
exports.authorize = authorize;
const get_access_token = async (oauth2client) => {
    const auth_url = oauth2client.generateAuthUrl({
        access_type: 'offline',
        scope: types_1.SCOPES,
    });
    (0, cli_1.info)({ changes_made: false }, p.AUTH_CONFIRM[0] + auth_url);
    (0, cli_1.info)({ changes_made: false }, p.AUTH_CONFIRM[1]);
    await clipboardy_1.default.write(auth_url);
    const { code } = await inquirer_1.default.prompt([
        {
            type: 'password',
            name: 'code',
            message: '[>]',
            mask: '*',
            prefix: '',
            suffix: '',
        },
    ]);
    const data = await oauth2client.getToken({ code });
    oauth2client.setCredentials(data.tokens);
    await fs_2.promises.writeFile(types_1.TOKEN_PATH, JSON.stringify(data));
    return oauth2client;
};
exports.get_access_token = get_access_token;
const list_files = async (oauth2client) => {
    const drive = googleapis_1.google.drive({ version: 'v3', auth: oauth2client });
    const res = await drive.files.list({
        pageSize: 100,
        fields: 'files(id, name)',
        spaces: 'appDataFolder',
    });
    const files = res.data.files;
    if (files?.length) {
        console.log('Files on google drive:');
        files.map(file => {
            console.log(`${file.name} (${file.id})`);
        });
        console.log('\n');
    }
    else {
        console.log('No files found.\n');
    }
};
exports.list_files = list_files;
const import_diary = async (oauth2client, settings) => {
    const drive = googleapis_1.google.drive({ version: 'v3', auth: oauth2client });
    let successful = false;
    const { data: diary_dat_list } = await drive.files.list({
        q: `name = '${types_1.DIARY_NAME}'`,
        fields: 'files(id)',
        spaces: 'appDataFolder',
        pageSize: 1,
    });
    if (diary_dat_list.files?.[0].id) {
        const dest = fs_1.default.createWriteStream(types_1.DIARY_PATH);
        const source = await drive.files.get({
            fileId: diary_dat_list.files[0].id,
            alt: 'media',
        }, { responseType: 'stream' });
        await _pipe(source.data, dest);
        settings.backup1_id = diary_dat_list.files[0].id;
        successful = true;
    }
    const { data: diary_bak_list } = await drive.files.list({
        q: `name = '${types_1.BACKUP_NAME}'`,
        fields: 'files(id)',
        spaces: 'appDataFolder',
        pageSize: 1,
    });
    if (diary_bak_list.files?.[0].id && !diary_dat_list.files?.[0].id) {
        await drive.files.update({
            fileId: diary_bak_list.files[0].id,
            requestBody: {
                name: types_1.DIARY_NAME,
            },
        });
        const dest = fs_1.default.createWriteStream(types_1.DIARY_PATH);
        const source = await drive.files.get({
            fileId: diary_bak_list.files[0].id,
            alt: 'media',
        }, { responseType: 'stream' });
        await _pipe(source.data, dest);
        settings.backup1_id = diary_bak_list.files[0].id;
        successful = true;
    }
    else if (diary_bak_list.files?.[0].id) {
        settings.backup2_id = diary_bak_list.files[0].id;
    }
    if (successful)
        await fs_2.promises.writeFile(types_1.SETTINGS_PATH, JSON.stringify(settings));
    return successful;
};
exports.import_diary = import_diary;
const direct_diary_upload = async (drive) => drive.files.create({
    requestBody: {
        name: types_1.DIARY_NAME,
        parents: ['appDataFolder'],
    },
    media: {
        body: fs_1.default.createReadStream(types_1.DIARY_PATH),
    },
});
const upload_diary = async (oauth2client, settings) => {
    const drive = googleapis_1.google.drive({ version: 'v3', auth: oauth2client });
    try {
        if (settings.backup1_id) {
            if (settings.backup2_id) {
                await drive.files.delete({
                    fileId: settings.backup2_id,
                });
            }
            const { data: new_diary_bak } = await drive.files.copy({
                fileId: settings.backup1_id,
                requestBody: {
                    name: types_1.BACKUP_NAME,
                    parents: ['appDataFolder'],
                },
            });
            await drive.files.delete({
                fileId: settings.backup1_id,
            });
            settings.backup2_id = new_diary_bak.id;
        }
    }
    catch (err) {
        await (0, exports.wipe_drive_files)(drive);
    }
    const { data: new_diary_dat } = await direct_diary_upload(drive);
    settings.backup1_id = new_diary_dat.id;
    await fs_2.promises.writeFile(types_1.SETTINGS_PATH, JSON.stringify(settings));
};
exports.upload_diary = upload_diary;
const wipe_drive_files = async (drive) => {
    const { data } = await drive.files.list({
        fields: 'files(id)',
        spaces: 'appDataFolder',
        pageSize: 100,
    });
    const _delete = drive.files.delete();
    const promises = [];
    if (data.files) {
        for (const file of data.files) {
            promises.push(_delete({
                fileId: file.id || undefined,
            }));
        }
    }
    return Promise.all(promises);
};
exports.wipe_drive_files = wipe_drive_files;
const dump_drive_files = async (oauth2client, location) => {
    const drive = googleapis_1.google.drive({ version: 'v3', auth: oauth2client });
    const { data } = await drive.files.list({
        fields: 'files(name, id)',
        spaces: 'appDataFolder',
        pageSize: 100,
    });
    if (data.files) {
        for (const file of data.files) {
            const dest_location = path_1.default.join(location, `${file.id}_${file.name}`);
            const dest = fs_1.default.createWriteStream(dest_location);
            const source = await drive.files.get({
                fileId: file.id || '',
                alt: 'media',
            }, { responseType: 'stream' });
            await _pipe(source.data, dest);
        }
    }
};
exports.dump_drive_files = dump_drive_files;
