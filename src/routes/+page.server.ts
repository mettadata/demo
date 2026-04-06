import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { deleteSession } from '$lib/server/sessions.js';
import type { Actions } from './$types.js';

export const actions: Actions = {
	logout: async ({ cookies }) => {
		const sessionId = cookies.get('session_id');
		if (sessionId) {
			deleteSession(sessionId);
		}
		cookies.set('session_id', '', { httpOnly: true, sameSite: 'strict', path: '/', secure: !dev, maxAge: 0 });
		throw redirect(303, '/login');
	}
};
