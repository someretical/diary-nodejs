"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.critical = exports.err = exports.warn = exports.success = exports.info = void 0;
const chalk_1 = __importDefault(require("chalk"));
const fmt_cmd = (s) => s.replace(/\{(\w+)\}/g, `\`${chalk_1.default.bold('$1')}\``);
const info = (d, s) => {
    if (Array.isArray(s))
        s.map(_ => console.log(d.opened_diary ? '[*D]' : '[*]', fmt_cmd(_)));
    else
        console.log(d.opened_diary ? '[*D]' : '[*]', fmt_cmd(s));
};
exports.info = info;
const success = (d, s) => console.log(chalk_1.default.green(d.opened_diary ? '[*D]' : '[*]'), fmt_cmd(s));
exports.success = success;
const warn = (d, s) => {
    console.log(chalk_1.default.yellowBright(d.opened_diary ? '[!D]' : '[!]'), fmt_cmd(s));
};
exports.warn = warn;
const err = (d, s, e) => console.log(chalk_1.default.redBright(d.opened_diary ? '[!D]' : '[!]'), fmt_cmd(s), e);
exports.err = err;
const critical = (d, s, e) => console.log(chalk_1.default.bgRedBright(d.opened_diary ? '[!!!D]' : '[!!!]'), fmt_cmd(s), e);
exports.critical = critical;
