import { randomUUID } from 'node:crypto';
import { hashPassword } from './auth.js';

export interface User {
	id: string;
	username: string;
	passwordHash: string;
	createdAt: string;
}

const users = new Map<string, User>();

export async function createUser(username: string, password: string): Promise<User> {
	if (!username || username.trim().length === 0) {
		throw { code: 'USERNAME_REQUIRED' };
	}

	if (password.length < 8) {
		throw { code: 'PASSWORD_TOO_SHORT' };
	}

	const normalised = username.toLowerCase().trim();

	if (users.has(normalised)) {
		throw { code: 'USERNAME_TAKEN' };
	}

	const passwordHash = await hashPassword(password);
	const user: User = {
		id: randomUUID(),
		username: normalised,
		passwordHash,
		createdAt: new Date().toISOString()
	};

	users.set(normalised, user);
	return user;
}

export function findUser(username: string): User | undefined {
	return users.get(username.toLowerCase().trim());
}

export function clearUsers(): void {
	users.clear();
}
