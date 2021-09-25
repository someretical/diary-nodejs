"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("../util/types");
const encryptor_1 = require("../util/encryptor");
const zipper_1 = require("../util/zipper");
const console_1 = require("console");
const fs_1 = require("fs");
const moodflow_migrator_1 = require("../util/moodflow_migrator");
exports.default = async (pwd) => {
    try {
        await fs_1.promises.mkdir('./data');
    }
    catch (err) { }
    const diary = await (0, moodflow_migrator_1.migratev1)('./data/moodflow_backup.json');
    const test_wrong_key = 'a wrong secret key';
    const encrypted = (0, encryptor_1.encrypt)(Buffer.from(JSON.stringify(diary)), (0, encryptor_1.hash_key)(pwd));
    await (0, zipper_1.gzip)(types_1.DIARY_PATH, encrypted);
    const unzipped = await (0, zipper_1.unzip)(types_1.DIARY_PATH);
    const unencrypted = (0, encryptor_1.decrypt)(unzipped, (0, encryptor_1.hash_key)(pwd)).toString('utf8');
    (0, console_1.assert)(JSON.stringify(diary) === unencrypted, 'original !== unencrypted');
    try {
        (0, encryptor_1.decrypt)(unzipped, (0, encryptor_1.hash_key)(test_wrong_key));
        console.log('Somehow the wrong key managed to decrypt the encrypted message!');
    }
    catch (err) { }
};
