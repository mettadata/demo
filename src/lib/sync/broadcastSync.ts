import { get } from 'svelte/store';
import type { Writable } from 'svelte/store';
import type { Todo } from '../stores/todos.js';
import type { KanbanState } from '../stores/kanban.js';
import type { Notification } from '../stores/notifications.js';

export interface HeartbeatPayload {
	id: string;
	name: string;
	color: string;
	lastSeen: number;
}

export type SyncMessage =
	| { type: 'todos-updated'; payload: Todo[] }
	| { type: 'kanban-updated'; payload: KanbanState }
	| { type: 'presence-heartbeat'; payload: HeartbeatPayload }
	| { type: 'notification-pushed'; payload: Notification }
	| { type: 'notification-dismissed'; payload: { id: string } };

type ActivityChange =
	| { kind: 'card-moved'; cardId: string; cardTitle: string; toColumnTitle: string }
	| { kind: 'column-added'; columnTitle: string }
	| { kind: 'column-renamed'; newTitle: string };

export let channel: BroadcastChannel | null = null;

if (typeof window !== 'undefined') {
	try {
		channel = new BroadcastChannel('metta-todo-sync');
	} catch {
		// BroadcastChannel not available (pre-Safari 15.4)
	}
}

// Lazy references to break circular-import initialization.
// Resolved on first access inside function bodies — never at module init time.
let _kanbanState: Writable<KanbanState> | null = null;
let _todos: Writable<Todo[]> | null = null;
let _push: ((n: Omit<Notification, 'id' | 'createdAt'>, _fromChannel?: boolean) => string) | null = null;
let _lazyResolved = false;

export function _injectLazyDeps(deps: {
	kanbanState: Writable<KanbanState>;
	todos: Writable<Todo[]>;
	push: (n: Omit<Notification, 'id' | 'createdAt'>, _fromChannel?: boolean) => string;
}): void {
	_kanbanState = deps.kanbanState;
	_todos = deps.todos;
	_push = deps.push;
	_lazyResolved = true;
}

async function ensureLazyImports(): Promise<void> {
	if (_lazyResolved) return;
	_lazyResolved = true;
	const [kanbanMod, todosMod, notifMod] = await Promise.all([
		import('../stores/kanban.js'),
		import('../stores/todos.js'),
		import('../stores/notifications.js')
	]);
	_kanbanState = kanbanMod.kanbanState;
	_todos = todosMod.todos;
	_push = notifMod.push;
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

export function diffKanbanStates(
	previous: KanbanState,
	incoming: KanbanState,
	todoMap: Map<string, string>
): ActivityChange[] {
	const changes: ActivityChange[] = [];

	// Build card-to-column maps
	const previousCardColumn = new Map<string, string>();
	for (const col of previous.columns) {
		for (const cardId of col.cardIds) {
			previousCardColumn.set(cardId, col.id);
		}
	}

	const incomingCardColumn = new Map<string, string>();
	for (const col of incoming.columns) {
		for (const cardId of col.cardIds) {
			incomingCardColumn.set(cardId, col.id);
		}
	}

	// Detect card moves
	for (const [cardId, incomingColId] of incomingCardColumn) {
		const previousColId = previousCardColumn.get(cardId);
		if (previousColId !== undefined && previousColId !== incomingColId) {
			const toColumn = incoming.columns.find((c) => c.id === incomingColId);
			changes.push({
				kind: 'card-moved',
				cardId,
				cardTitle: todoMap.get(cardId) ?? 'Unknown card',
				toColumnTitle: toColumn?.title ?? 'Unknown column'
			});
		}
	}

	// Build previous column id set and map for title comparison
	const previousColumnMap = new Map<string, string>();
	for (const col of previous.columns) {
		previousColumnMap.set(col.id, col.title);
	}

	// Detect new columns and renames
	for (const col of incoming.columns) {
		const previousTitle = previousColumnMap.get(col.id);
		if (previousTitle === undefined) {
			changes.push({ kind: 'column-added', columnTitle: col.title });
		} else if (previousTitle !== col.title) {
			changes.push({ kind: 'column-renamed', newTitle: col.title });
		}
	}

	return changes;
}

export function listenForRemoteUpdates(
	onTodos: (t: Todo[]) => void,
	onKanban: (s: KanbanState) => void,
	onHeartbeat: (p: HeartbeatPayload) => void
): () => void {
	if (!channel) return () => {};

	// Kick off lazy import resolution immediately so deps are ready when messages arrive
	ensureLazyImports();

	function handler(event: MessageEvent): void {
		try {
			const msg = event.data as SyncMessage;
			if (!msg || typeof msg.type !== 'string') return;

			switch (msg.type) {
				case 'todos-updated':
					if (!Array.isArray(msg.payload)) return;
					onTodos(msg.payload);
					break;
				case 'kanban-updated': {
					if (!msg.payload || typeof msg.payload !== 'object' || !('columns' in msg.payload)) return;
					// Snapshot local state before applying incoming update
					const previous = _kanbanState ? get(_kanbanState) : null;
					onKanban(msg.payload);
					// Generate activity notifications for detected changes
					if (previous && _todos && _push) {
						const todoMap = new Map(get(_todos).map((t) => [t.id, t.text]));
						const changes = diffKanbanStates(previous, msg.payload, todoMap);
						for (const change of changes) {
							if (change.kind === 'card-moved') {
								_push({ type: 'activity', title: 'Board Updated', message: `'${change.cardTitle}' moved to ${change.toColumnTitle}` });
							} else if (change.kind === 'column-added') {
								_push({ type: 'activity', title: 'Board Updated', message: `New column '${change.columnTitle}' added` });
							} else if (change.kind === 'column-renamed') {
								_push({ type: 'activity', title: 'Board Updated', message: `Column renamed to '${change.newTitle}'` });
							}
						}
					}
					break;
				}
				case 'presence-heartbeat':
					if (!msg.payload || typeof msg.payload.id !== 'string') return;
					onHeartbeat(msg.payload);
					break;
				case 'notification-pushed':
					break;
				case 'notification-dismissed':
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
