"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const google_driver_1 = require("../util/google_driver");
const file_1 = require("../util/file");
const main = async () => {
    const settings = await (0, file_1.get_settings)();
    const opened_diary = await (0, file_1.open_diary)();
    console.log(opened_diary);
    const oauth2client = await (0, google_driver_1.authorize)();
    console.log(oauth2client);
    if (!(await (0, google_driver_1.check_scopes)(oauth2client)))
        console.log('missing scopes!!! (you will know if this is expected or not)');
    await (0, google_driver_1.list_files)(oauth2client);
};
exports.main = main;
