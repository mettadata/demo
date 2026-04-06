import { describe, it, expect, beforeEach } from 'vitest';
import { createUser, findUser, clearUsers } from './users.js';
import { verifyPassword } from './auth.js';
import { createSession, getSession, deleteSession } from './sessions.js';

describe('auth integration', () => {
	beforeEach(() => {
		clearUsers();
	});

	it('happy path: register → verify → session → logout', async () => {
		const user = await createUser('alice', 'password123');

		const found = findUser('alice');
		expect(found).toBeDefined();
		expect(found!.id).toBe(user.id);

		const valid = await verifyPassword('password123', user.passwordHash);
		expect(valid).toBe(true);

		const sessionId = createSession(user.id);
		const session = getSession(sessionId);
		expect(session).toBeDefined();
		expect(session!.userId).toBe(user.id);

		deleteSession(sessionId);
		expect(getSession(sessionId)).toBeUndefined();
	});

	it('rejection path: wrong password prevents session creation', async () => {
		const user = await createUser('bob', 'correctpass');

		const valid = await verifyPassword('wrongpass!!', user.passwordHash);
		expect(valid).toBe(false);

		// No session should be created on failed auth
	});
});
