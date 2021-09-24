"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const drive_1 = require("./drive");
const encryption_1 = require("./encryption");
const main = async () => {
    console.log('running encryption() ...');
    await (0, encryption_1.main)();
    console.log('running drive() ...');
    (0, drive_1.main)();
};
main();
process.on('unhandledRejection', reason => {
    console.log(reason);
});
