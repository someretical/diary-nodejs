"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const encryptor_1 = require("./util/encryptor");
const zipper_1 = require("./util/zipper");
const main = async () => {
    const key = 'super duper secret key';
    const hashed_key = (0, encryptor_1.hash_key)(key);
    const unzipped = await (0, zipper_1.unzip)('data/diary.dat');
    console.log('unzipped');
    const decrypted = (0, encryptor_1.decrypt)(unzipped, hashed_key).toString('utf8');
    console.log(JSON.parse(decrypted));
};
main();
