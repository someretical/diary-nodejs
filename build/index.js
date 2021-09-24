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
exports.prompt_pwd = void 0;
const readline = __importStar(require("readline"));
const util_1 = require("util");
const prompt_pwd = async () => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const q = rl.question;
    q[util_1.promisify.custom] = (question) => new Promise(resolve => {
        rl.question(question, input => {
            resolve(input);
        });
    }).finally(() => {
        rl.close();
    });
    const question = (0, util_1.promisify)(rl.question);
    const pwd = (await question('password: ')) || 'a very secret key';
    return pwd;
};
exports.prompt_pwd = prompt_pwd;
const main = async () => { };
main();
