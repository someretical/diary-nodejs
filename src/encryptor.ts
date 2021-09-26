// Adapted from https://medium.com/@anned20/encrypting-files-with-nodejs-a54a0736a50a
import crypto from 'crypto';

/**
 * Gets the hash of the password
 */
export const hash_key = (
	key: string,
	hash = 'sha256',
	digest: crypto.BinaryToTextEncoding = 'base64'
): string =>
	/**
	 * Since the user provided password will not likely be 32 characters (256 bits) long,
	 * it needs to be hashed first to obtain 256 bits of data to represent it
	 * aes-256-cbc requires an iv that is 256 bits long
	 */
	crypto.createHash(hash).update(String(key)).digest(digest).substr(0, 32);

/**
 * Encrypts a buffer with the password
 */
export const encrypt = (
	buffer: Buffer,
	hashed_key: string,
	algorithm = 'aes-256-cbc'
): Buffer => {
	const iv = crypto.randomBytes(16);

	const cipher = crypto.createCipheriv(algorithm, hashed_key, iv);

	return Buffer.concat([
		iv,
		cipher.update(buffer), // actual encrypted contents
		cipher.final(),
	]);
};

/**
 * Attempts to decrypt a buffer with the password
 */
export const decrypt = (
	buffer: Buffer,
	hashed_key: string,
	algorithm = 'aes-256-cbc'
): Buffer => {
	const iv = buffer.slice(0, 16);

	const decipher = crypto.createDecipheriv(algorithm, hashed_key, iv);

	return Buffer.concat([
		decipher.update(buffer.slice(16)), // first 16 bytes are part of the iv so they need to be removed
		decipher.final(),
	]);
};
