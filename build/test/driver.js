"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const drive_1 = __importDefault(require("./drive"));
const encryption_1 = __importDefault(require("./encryption"));
const main = async () => {
    const pwd = 'abc123';
    console.log('Running encryption()...');
    await (0, encryption_1.default)(pwd);
    console.log('Running drive()...');
    (0, drive_1.default)();
};
main();
process.on('unhandledRejection', reason => {
    console.log(reason);
});
