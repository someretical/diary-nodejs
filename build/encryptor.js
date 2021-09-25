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
exports.decrypt = exports.encrypt = exports.hash_key = void 0;
const crypto = __importStar(require("crypto"));
const hash_key = (key, hash = 'sha256', digest = 'base64') => crypto.createHash(hash).update(String(key)).digest(digest).substr(0, 32);
exports.hash_key = hash_key;
const encrypt = (buffer, hashed_key, algorithm = 'aes-256-cbc') => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, hashed_key, iv);
    return Buffer.concat([
        iv,
        cipher.update(buffer),
        cipher.final(),
    ]);
};
exports.encrypt = encrypt;
const decrypt = (buffer, hashed_key, algorithm = 'aes-256-cbc') => {
    const iv = buffer.slice(0, 16);
    const decipher = crypto.createDecipheriv(algorithm, hashed_key, iv);
    return Buffer.concat([
        decipher.update(buffer.slice(16)),
        decipher.final(),
    ]);
};
exports.decrypt = decrypt;
