import { scrypt, randomBytes, timingSafeEqual, type ScryptOptions } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify<string | Buffer, string | Buffer, number, ScryptOptions, Buffer>(scrypt);

export const SCRYPT_N = 32768;

const SCRYPT_R = 8;
const SCRYPT_P = 1;
const DK_LEN = 64;
const SALT_LEN = 16;

export async function hashPassword(password: string): Promise<string> {
	const salt = randomBytes(SALT_LEN);
	const derived = await scryptAsync(password, salt, DK_LEN, {
		N: SCRYPT_N,
		r: SCRYPT_R,
		p: SCRYPT_P
	});

	return `${salt.toString('hex')}:${derived.toString('hex')}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
	const [saltHex, hashHex] = stored.split(':');
	if (!saltHex || !hashHex) {
		return false;
	}

	const salt = Buffer.from(saltHex, 'hex');
	const storedHash = Buffer.from(hashHex, 'hex');
	const derived = await scryptAsync(password, salt, DK_LEN, {
		N: SCRYPT_N,
		r: SCRYPT_R,
		p: SCRYPT_P
	});

	return timingSafeEqual(storedHash, derived);
}
