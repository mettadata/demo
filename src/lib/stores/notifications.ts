import { writable } from 'svelte/store';
import type { Writable } from 'svelte/store';
// Circular import safe: accessed only inside function bodies
import { channel } from '../sync/broadcastSync.js';

export type NotificationType = 'overdue' | 'mention' | 'activity';

export interface Notification {
	id: string;
	type: NotificationType;
	title: string;
	message: string;
	createdAt: string;
}

export const notifications: Writable<Notification[]> = writable<Notification[]>([]);

function addToQueue(record: Notification): void {
	notifications.update((queue) => {
		const next = [...queue];
		if (next.length >= 5) {
			let oldestIdx = 0;
			for (let i = 1; i < next.length; i++) {
				if (next[i].createdAt < next[oldestIdx].createdAt) oldestIdx = i;
			}
			next.splice(oldestIdx, 1);
		}
		next.push(record);
		return next;
	});
}

export function push(
	notification: Omit<Notification, 'id' | 'createdAt'>,
	_fromChannel?: boolean
): string {
	const record: Notification = {
		type: notification.type,
		title: notification.title,
		message: notification.message,
		id: crypto.randomUUID(),
		createdAt: new Date().toISOString()
	};

	addToQueue(record);

	if (!_fromChannel) {
		try {
			channel?.postMessage({ type: 'notification-pushed', payload: record });
		} catch {
			// Silently drop on serialization or channel errors
		}
	}

	return record.id;
}

function pushFromChannel(notification: Notification): void {
	addToQueue(notification);
}

export function dismiss(id: string, _fromChannel?: boolean): void {
	notifications.update((queue) => queue.filter((n) => n.id !== id));

	if (!_fromChannel) {
		try {
			channel?.postMessage({ type: 'notification-dismissed', payload: { id } });
		} catch {
			// Silently drop on serialization or channel errors
		}
	}
}

export function clearAll(): void {
	notifications.set([]);
}

// Register BroadcastChannel listener (SSR-guarded)
if (typeof window !== 'undefined') {
	try {
		const syncChannel = new BroadcastChannel('metta-todo-sync');
		syncChannel.addEventListener('message', (event: MessageEvent) => {
			try {
				const msg = event.data;
				if (!msg || typeof msg.type !== 'string') return;

				switch (msg.type) {
					case 'notification-pushed': {
						const p = msg.payload;
						if (
							p &&
							typeof p === 'object' &&
							typeof p.id === 'string' &&
							typeof p.title === 'string' &&
							typeof p.message === 'string' &&
							typeof p.type === 'string' &&
							(p.type === 'overdue' || p.type === 'mention' || p.type === 'activity') &&
							typeof p.createdAt === 'string'
						) {
							pushFromChannel({
								id: p.id,
								type: p.type as NotificationType,
								title: p.title,
								message: p.message,
								createdAt: p.createdAt
							});
						}
						break;
					}
					case 'notification-dismissed':
						if (msg.payload && typeof msg.payload.id === 'string') {
							dismiss(msg.payload.id, true);
						}
						break;
				}
			} catch {
				// Silently drop malformed messages
			}
		});
	} catch {
		// BroadcastChannel not available
	}
}
