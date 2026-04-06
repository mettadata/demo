import { randomUUID } from 'node:crypto';

export interface Session {
	userId: string;
	createdAt: string;
}

/**
 * In-memory session store.
 * This Map resets on server restart — sessions are not persisted.
 */
const sessions = new Map<string, Session>();

export function createSession(userId: string): string {
	const sessionId = randomUUID();
	sessions.set(sessionId, {
		userId,
		createdAt: new Date().toISOString()
	});
	return sessionId;
}

export function getSession(sessionId: string): Session | undefined {
	return sessions.get(sessionId);
}

export function deleteSession(sessionId: string): void {
	sessions.delete(sessionId);
}
