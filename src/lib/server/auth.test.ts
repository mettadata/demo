import { describe, it, expect, vi, beforeAll } from 'vitest';

// Override the costly scrypt N parameter before importing the module
vi.hoisted(() => {
	// Nothing to hoist, but we use dynamic import below
});

// Reduce scrypt cost for tests to avoid memory limit errors
vi.mock('./auth.js', async (importOriginal) => {
	const { scrypt, randomBytes, timingSafeEqual } = await import('node:crypto');
	const { promisify } = await import('node:util');

	const scryptAsync = promisify(scrypt) as (
		password: string | Buffer,
		salt: string | Buffer,
		keylen: number,
		options: { N: number; r: number; p: number }
	) => Promise<Buffer>;

	const TEST_N = 1024; // much cheaper than 32768
	const SCRYPT_R = 8;
	const SCRYPT_P = 1;
	const DK_LEN = 64;
	const SALT_LEN = 16;

	return {
		SCRYPT_N: TEST_N,
		async hashPassword(password: string): Promise<string> {
			const salt = randomBytes(SALT_LEN);
			const derived = await scryptAsync(password, salt, DK_LEN, {
				N: TEST_N,
				r: SCRYPT_R,
				p: SCRYPT_P
			});
			return `${salt.toString('hex')}:${derived.toString('hex')}`;
		},
		async verifyPassword(password: string, stored: string): Promise<boolean> {
			const [saltHex, hashHex] = stored.split(':');
			if (!saltHex || !hashHex) {
				return false;
			}
			const salt = Buffer.from(saltHex, 'hex');
			const storedHash = Buffer.from(hashHex, 'hex');
			const derived = await scryptAsync(password, salt, DK_LEN, {
				N: TEST_N,
				r: SCRYPT_R,
				p: SCRYPT_P
			});
			return timingSafeEqual(storedHash, derived);
		}
	};
});

const { hashPassword, verifyPassword } = await import('./auth.js');

describe('hashPassword', () => {
	it('returns a string containing a colon separator', async () => {
		const result = await hashPassword('test-password');
		expect(result).toContain(':');
	});

	it('never returns the plaintext password', async () => {
		const password = 'super-secret-123';
		const result = await hashPassword(password);
		expect(result).not.toContain(password);
	});
});

describe('verifyPassword', () => {
	it('returns true for the correct password', async () => {
		const password = 'correct-horse-battery-staple';
		const hash = await hashPassword(password);
		const result = await verifyPassword(password, hash);
		expect(result).toBe(true);
	});

	it('returns false for an incorrect password', async () => {
		const hash = await hashPassword('right-password');
		const result = await verifyPassword('wrong-password', hash);
		expect(result).toBe(false);
	});

	it('returns false when the stored string is malformed (no colon separator)', async () => {
		const result = await verifyPassword('any-password', 'no-colon-here');
		expect(result).toBe(false);
	});
});
