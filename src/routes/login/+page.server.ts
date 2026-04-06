import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { findUser } from '$lib/server/users.js';
import { verifyPassword } from '$lib/server/auth.js';
import { createSession } from '$lib/server/sessions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		throw redirect(303, '/');
	}
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username');
		const password = data.get('password');

		if (typeof username !== 'string' || typeof password !== 'string') {
			return fail(400, { error: 'Invalid credentials' });
		}

		const user = findUser(username);
		if (!user) {
			return fail(400, { error: 'Invalid credentials' });
		}

		const valid = await verifyPassword(password, user.passwordHash);
		if (!valid) {
			return fail(400, { error: 'Invalid credentials' });
		}

		const sessionId = createSession(user.id);
		cookies.set('session_id', sessionId, {
			httpOnly: true,
			sameSite: 'strict',
			path: '/',
			secure: !dev
		});

		throw redirect(303, '/');
	}
};
