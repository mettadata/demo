import { describe, it, expect } from 'vitest';
import { createSession, getSession, deleteSession } from './sessions.js';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('sessions', () => {
	it('createSession returns a UUID-format string', () => {
		const sessionId = createSession('user-1');
		expect(sessionId).toMatch(UUID_REGEX);
	});

	it('getSession returns the session after creation', () => {
		const sessionId = createSession('user-2');
		const session = getSession(sessionId);
		expect(session).toBeDefined();
		expect(session!.userId).toBe('user-2');
		expect(typeof session!.createdAt).toBe('string');
	});

	it('getSession returns undefined for an unknown ID', () => {
		const session = getSession('nonexistent-id');
		expect(session).toBeUndefined();
	});

	it('deleteSession removes the session so getSession returns undefined', () => {
		const sessionId = createSession('user-3');
		expect(getSession(sessionId)).toBeDefined();
		deleteSession(sessionId);
		expect(getSession(sessionId)).toBeUndefined();
	});

	it('creating two sessions with the same userId returns different session IDs', () => {
		const id1 = createSession('user-same');
		const id2 = createSession('user-same');
		expect(id1).not.toBe(id2);
	});
});
