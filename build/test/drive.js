"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const google_driver_1 = require("../google_driver");
const file_system_1 = require("../file_system");
const fs_1 = require("fs");
exports.default = async () => {
    const settings = await (0, file_system_1.get_settings)();
    const opened_diary = await (0, file_system_1.open_diary)();
    console.log('---\nOpened existing diary:', opened_diary, '\n');
    const oauth2client = await (0, google_driver_1.authorize)();
    console.log('---\nLoaded oauth2client.\n');
    if (!(await (0, google_driver_1.check_scopes)(oauth2client)))
        return console.log('---\nMissing scopes! You will know if this is expected or not.\n');
    await (0, google_driver_1.list_files)(oauth2client);
    settings.sync = false;
    await (0, file_system_1.save_diary)(opened_diary, settings, oauth2client);
    console.log('---\nSaved diary without syncing.\n');
    settings.sync = true;
    await (0, file_system_1.save_diary)(opened_diary, settings, oauth2client);
    console.log('---\nSaved diary to google drive\n');
    await (0, google_driver_1.list_files)(oauth2client);
    console.log('Settings:', settings, '\n');
    try {
        await fs_1.promises.rm('./data/dump', { recursive: true, force: true });
        await fs_1.promises.mkdir('./data/dump');
    }
    catch (err) { }
    await (0, google_driver_1.dump_drive_files)(oauth2client, './data/dump');
    console.log('---\nDumped files to ./data/dump\n');
    const status = await (0, google_driver_1.import_diary)(oauth2client, settings);
    console.log('---\nImport diary status:', status, '\n');
    const opened_diary2 = await (0, file_system_1.open_diary)();
    console.log('Opened imported diary:', opened_diary2, '\n');
    console.log('Settings:', settings, '\n');
};
