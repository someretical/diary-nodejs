"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.decrypt = exports.encrypt = exports.hash_key = void 0;
const crypto_1 = __importDefault(require("crypto"));
const hash_key = (key, hash = 'sha256', digest = 'base64') => crypto_1.default.createHash(hash).update(String(key)).digest(digest).substr(0, 32);
exports.hash_key = hash_key;
const encrypt = (buffer, hashed_key, algorithm = 'aes-256-cbc') => {
    const iv = crypto_1.default.randomBytes(16);
    const cipher = crypto_1.default.createCipheriv(algorithm, hashed_key, iv);
    return Buffer.concat([
        iv,
        cipher.update(buffer),
        cipher.final(),
    ]);
};
exports.encrypt = encrypt;
const decrypt = (buffer, hashed_key, algorithm = 'aes-256-cbc') => {
    const iv = buffer.slice(0, 16);
    const decipher = crypto_1.default.createDecipheriv(algorithm, hashed_key, iv);
    return Buffer.concat([
        decipher.update(buffer.slice(16)),
        decipher.final(),
    ]);
};
exports.decrypt = decrypt;
