import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { createUser } from '$lib/server/users.js';
import { createSession } from '$lib/server/sessions.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if ((locals as Record<string, unknown>).user) {
		throw redirect(303, '/');
	}
};

const errorMessages: Record<string, string> = {
	USERNAME_REQUIRED: 'Username is required',
	PASSWORD_TOO_SHORT: 'Password must be at least 8 characters',
	USERNAME_TAKEN: 'Username is already taken'
};

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const data = await request.formData();
		const username = data.get('username') as string ?? '';
		const password = data.get('password') as string ?? '';

		try {
			const user = await createUser(username, password);
			const sessionId = createSession(user.id);

			cookies.set('session_id', sessionId, {
				httpOnly: true,
				sameSite: 'strict',
				path: '/',
				secure: !dev
			});
		} catch (err: unknown) {
			const code = (err as { code?: string })?.code;
			const message = (code && errorMessages[code]) ?? 'Registration failed';
			return fail(400, { error: message });
		}

		throw redirect(303, '/');
	}
};
