import { writable, get } from 'svelte/store';
import type { Writable } from 'svelte/store';

export interface Collaborator {
	id: string;
	name: string;
	color: string;
	lastSeen: number;
}

const AVATAR_PALETTE = [
	'#e57373', '#f06292', '#ba68c8', '#7986cb',
	'#4fc3f7', '#4db6ac', '#81c784', '#dce775',
	'#ffb74d', '#ff8a65', '#a1887f', '#90a4ae'
];

export function deriveColor(id: string): string {
	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
	}
	return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function getInitials(name: string): string {
	const words = name.trim().split(/\s+/);
	if (words.length === 0 || (words.length === 1 && words[0] === '')) {
		return '??';
	}
	if (words.length > 1) {
		return (words[0][0] + words[words.length - 1][0]).toUpperCase();
	}
	const word = words[0];
	return (word.length >= 2 ? word.slice(0, 2) : word).toUpperCase();
}

function initSelf(): Collaborator {
	if (typeof window === 'undefined') {
		return { id: '', name: 'Anonymous', color: '#90a4ae', lastSeen: 0 };
	}

	let id = localStorage.getItem('user-id');
	if (!id) {
		id = crypto.randomUUID();
		localStorage.setItem('user-id', id);
	}

	const name = localStorage.getItem('user-name') ?? 'Anonymous';
	const color = deriveColor(id);

	return { id, name, color, lastSeen: Date.now() };
}

export const self: Writable<Collaborator> = writable<Collaborator>(initSelf());

export const activeCollaborators: Writable<Collaborator[]> = writable<Collaborator[]>([]);

export function updateSelfName(name: string): void {
	const trimmed = name.trim();
	if (trimmed === '') return;
	if (typeof window !== 'undefined') {
		localStorage.setItem('user-name', trimmed);
	}
	self.update((s) => ({ ...s, name: trimmed }));
}

// Presence lifecycle — wired in a separate step (Batch 2)
let heartbeatInterval: ReturnType<typeof setInterval> | null = null;
let expiryInterval: ReturnType<typeof setInterval> | null = null;
let unsubscribeListener: (() => void) | null = null;

export function _wirePresence(
	broadcastHeartbeatFn: (c: { id: string; name: string; color: string }) => void,
	listenFn: (
		onTodos: (t: unknown[]) => void,
		onKanban: (s: unknown) => void,
		onHeartbeat: (p: { id: string; name: string; color: string; lastSeen: number }) => void
	) => () => void
): void {
	if (typeof window === 'undefined') return;

	const sendHeartbeat = () => {
		const s = get(self);
		self.update((cur) => ({ ...cur, lastSeen: Date.now() }));
		broadcastHeartbeatFn({ id: s.id, name: s.name, color: s.color });
	};

	// Send initial heartbeat
	sendHeartbeat();

	// Heartbeat every 30s
	heartbeatInterval = setInterval(sendHeartbeat, 30_000);

	// Expiry poll every 10s
	expiryInterval = setInterval(() => {
		const now = Date.now();
		activeCollaborators.update((list) => list.filter((c) => now - c.lastSeen <= 90_000));
	}, 10_000);

	// Listen for heartbeats from other tabs
	unsubscribeListener = listenFn(
		() => {}, // onTodos — no-op, handled in +page.svelte
		() => {}, // onKanban — no-op, handled in +page.svelte
		(payload) => {
			const selfId = get(self).id;
			if (payload.id === selfId) return;

			activeCollaborators.update((list) => {
				const existing = list.findIndex((c) => c.id === payload.id);
				const entry: Collaborator = {
					id: payload.id,
					name: payload.name,
					color: payload.color,
					lastSeen: payload.lastSeen
				};
				if (existing !== -1) {
					const updated = [...list];
					updated[existing] = entry;
					return updated;
				}
				return [entry, ...list];
			});
		}
	);
}

export function destroyPresence(): void {
	if (heartbeatInterval !== null) {
		clearInterval(heartbeatInterval);
		heartbeatInterval = null;
	}
	if (expiryInterval !== null) {
		clearInterval(expiryInterval);
		expiryInterval = null;
	}
	if (unsubscribeListener) {
		unsubscribeListener();
		unsubscribeListener = null;
	}
}
