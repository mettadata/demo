import { redirect, type Handle } from '@sveltejs/kit';
import { getSession } from '$lib/server/sessions.js';
import { findUserById } from '$lib/server/users.js';

const PUBLIC_PATHS = ['/login', '/register'];

export const handle: Handle = async ({ event, resolve }) => {
	const sessionId = event.cookies.get('session_id');

	if (sessionId) {
		const session = getSession(sessionId);
		if (session) {
			const user = findUserById(session.userId);
			if (user) {
				event.locals.user = {
					id: user.id,
					username: user.username
				};
			}
		}
	}

	if (!event.locals.user && !PUBLIC_PATHS.includes(event.url.pathname)) {
		throw redirect(303, '/login');
	}

	return resolve(event);
};
