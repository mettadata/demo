import { describe, it, expect, beforeEach } from 'vitest';
import { createUser, findUser, clearUsers } from './users.js';

describe('users', () => {
	beforeEach(() => {
		clearUsers();
	});

	describe('createUser', () => {
		it('returns a user with a UUID id and lowercase username', async () => {
			const user = await createUser('Alice', 'password123');

			expect(user.id).toMatch(
				/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
			);
			expect(user.username).toBe('alice');
		});

		it('stores a passwordHash that is not plaintext', async () => {
			const password = 'password123';
			const user = await createUser('bob', password);

			expect(user.passwordHash).not.toBe(password);
			expect(user.passwordHash.length).toBeGreaterThan(0);
		});

		it('throws USERNAME_TAKEN for a duplicate username (case-insensitive)', async () => {
			await createUser('charlie', 'password123');

			await expect(createUser('Charlie', 'password456')).rejects.toEqual({
				code: 'USERNAME_TAKEN'
			});
		});

		it('throws PASSWORD_TOO_SHORT for passwords shorter than 8 characters', async () => {
			await expect(createUser('dave', 'short')).rejects.toEqual({
				code: 'PASSWORD_TOO_SHORT'
			});
		});

		it('throws USERNAME_REQUIRED for an empty username', async () => {
			await expect(createUser('', 'password123')).rejects.toEqual({
				code: 'USERNAME_REQUIRED'
			});
		});
	});

	describe('findUser', () => {
		it('returns undefined for unknown usernames', () => {
			expect(findUser('nobody')).toBeUndefined();
		});

		it('returns the user after creation', async () => {
			const created = await createUser('eve', 'password123');
			const found = findUser('eve');

			expect(found).toBeDefined();
			expect(found!.id).toBe(created.id);
			expect(found!.username).toBe('eve');
		});
	});
});
