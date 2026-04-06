import type { Todo } from '../stores/todos.js';
import type { KanbanState } from '../stores/kanban.js';

export interface HeartbeatPayload {
	id: string;
	name: string;
	color: string;
	lastSeen: number;
}

export type SyncMessage =
	| { type: 'todos-updated'; payload: Todo[] }
	| { type: 'kanban-updated'; payload: KanbanState }
	| { type: 'presence-heartbeat'; payload: HeartbeatPayload };

let channel: BroadcastChannel | null = null;

if (typeof window !== 'undefined') {
	try {
		channel = new BroadcastChannel('metta-todo-sync');
	} catch {
		// BroadcastChannel not available (pre-Safari 15.4)
	}
}

export function broadcastTodos(todos: Todo[]): void {
	if (!channel) return;
	try {
		const message: SyncMessage = { type: 'todos-updated', payload: todos };
		channel.postMessage(message);
	} catch {
		// Silently drop on serialization errors
	}
}

export function broadcastKanban(state: KanbanState): void {
	if (!channel) return;
	try {
		const message: SyncMessage = { type: 'kanban-updated', payload: state };
		channel.postMessage(message);
	} catch {
		// Silently drop on serialization errors
	}
}

export function broadcastHeartbeat(collaborator: { id: string; name: string; color: string }): void {
	if (!channel) return;
	try {
		const message: SyncMessage = {
			type: 'presence-heartbeat',
			payload: { ...collaborator, lastSeen: Date.now() }
		};
		channel.postMessage(message);
	} catch {
		// Silently drop on serialization errors
	}
}

export function listenForRemoteUpdates(
	onTodos: (t: Todo[]) => void,
	onKanban: (s: KanbanState) => void,
	onHeartbeat: (p: HeartbeatPayload) => void
): () => void {
	if (!channel) return () => {};

	function handler(event: MessageEvent): void {
		try {
			const msg = event.data as SyncMessage;
			if (!msg || typeof msg.type !== 'string') return;

			switch (msg.type) {
				case 'todos-updated':
					if (!Array.isArray(msg.payload)) return;
					onTodos(msg.payload);
					break;
				case 'kanban-updated':
					if (!msg.payload || typeof msg.payload !== 'object' || !('columns' in msg.payload)) return;
					onKanban(msg.payload);
					break;
				case 'presence-heartbeat':
					if (!msg.payload || typeof msg.payload.id !== 'string') return;
					onHeartbeat(msg.payload);
					break;
				default:
					// Unknown message type — silently ignore
					break;
			}
		} catch {
			// Silently drop malformed messages
		}
	}

	channel.addEventListener('message', handler);
	return () => {
		channel?.removeEventListener('message', handler);
	};
}
