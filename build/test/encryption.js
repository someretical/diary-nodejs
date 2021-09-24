"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const types_1 = require("../util/types");
const encryptor_1 = require("../util/encryptor");
const zipper_1 = require("../util/zipper");
const console_1 = require("console");
const fs_1 = require("fs");
const main = async () => {
    try {
        await fs_1.promises.mkdir('./data');
    }
    catch (err) { }
    const diary = {
        years: [],
        settings: {},
        metadata: {
            version: types_1.FILE_VERSION,
            last_updated: 1376187489,
        },
    };
    const test_key = 'a very secret key';
    const test_wrong_key = 'a wrong secret key';
    const encrypted = (0, encryptor_1.encrypt)(Buffer.from(JSON.stringify(diary)), (0, encryptor_1.hash_key)(test_key));
    await (0, zipper_1.gzip)(types_1.DIARY_PATH, encrypted);
    const unzipped = await (0, zipper_1.unzip)(types_1.DIARY_PATH);
    const unencrypted = (0, encryptor_1.decrypt)(unzipped, (0, encryptor_1.hash_key)(test_key)).toString('utf8');
    console.log(`Original: ${JSON.stringify(diary)}, unencrypted: ${unencrypted}`);
    (0, console_1.assert)(JSON.stringify(diary) === unencrypted, 'original !== unencrypted');
    try {
        (0, encryptor_1.decrypt)(unzipped, (0, encryptor_1.hash_key)(test_wrong_key));
        console.log('somehow the wrong key managed to decrypt the encrypted message');
    }
    catch (err) { }
};
exports.main = main;
