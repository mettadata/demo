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

export function push(
	notification: Omit<Notification, 'id' | 'createdAt'>,
	_fromChannel?: boolean
): string {
	const record: Notification = {
		...notification,
		id: (notification as Notification).id || crypto.randomUUID(),
		createdAt: (notification as Notification).createdAt || new Date().toISOString()
	};

	notifications.update((queue) => {
		const next = queue.length >= 5 ? queue.slice(1) : [...queue];
		next.push(record);
		return next;
	});

	if (!_fromChannel) {
		try {
			channel?.postMessage({ type: 'notification-pushed', payload: record });
		} catch {
			// Silently drop on serialization or channel errors
		}
	}

	return record.id;
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
					case 'notification-pushed':
						if (msg.payload && typeof msg.payload === 'object' && msg.payload.id) {
							push(msg.payload, true);
						}
						break;
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
