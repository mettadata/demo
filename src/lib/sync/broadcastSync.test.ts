import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock BroadcastChannel before importing the module
let postedMessages: unknown[] = [];
let messageListeners: Array<(event: MessageEvent) => void> = [];

class MockBroadcastChannel {
	name: string;
	constructor(name: string) {
		this.name = name;
	}
	postMessage(data: unknown) {
		postedMessages.push(data);
	}
	addEventListener(type: string, handler: (event: MessageEvent) => void) {
		if (type === 'message') {
			messageListeners.push(handler);
		}
	}
	removeEventListener(type: string, handler: (event: MessageEvent) => void) {
		if (type === 'message') {
			messageListeners = messageListeners.filter((h) => h !== handler);
		}
	}
	close() {}
}

vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

// Mock localStorage
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
		removeItem: vi.fn((key: string) => { delete store[key]; }),
		clear: vi.fn(() => { store = {}; }),
		get length() { return Object.keys(store).length; },
		key: vi.fn((index: number) => Object.keys(store)[index] ?? null)
	};
})();
vi.stubGlobal('localStorage', localStorageMock);

vi.stubGlobal('crypto', {
	randomUUID: vi.fn(() => 'test-uuid-sync')
});

function dispatchMessage(data: unknown) {
	const event = new MessageEvent('message', { data });
	for (const handler of messageListeners) {
		handler(event);
	}
}

describe('broadcastSync', () => {
	let broadcastTodos: typeof import('./broadcastSync').broadcastTodos;
	let broadcastKanban: typeof import('./broadcastSync').broadcastKanban;
	let broadcastHeartbeat: typeof import('./broadcastSync').broadcastHeartbeat;
	let listenForRemoteUpdates: typeof import('./broadcastSync').listenForRemoteUpdates;

	beforeEach(async () => {
		vi.resetModules();
		postedMessages = [];
		messageListeners = [];
		localStorageMock.clear();

		const mod = await import('./broadcastSync');
		broadcastTodos = mod.broadcastTodos;
		broadcastKanban = mod.broadcastKanban;
		broadcastHeartbeat = mod.broadcastHeartbeat;
		listenForRemoteUpdates = mod.listenForRemoteUpdates;
	});

	it('broadcastTodos posts a todos-updated message', () => {
		const payload = [{ id: '1', text: 'Test' }] as never[];
		broadcastTodos(payload);
		expect(postedMessages).toHaveLength(1);
		expect(postedMessages[0]).toEqual({ type: 'todos-updated', payload });
	});

	it('broadcastKanban posts a kanban-updated message', () => {
		const payload = { columns: [] };
		broadcastKanban(payload);
		expect(postedMessages).toHaveLength(1);
		expect(postedMessages[0]).toEqual({ type: 'kanban-updated', payload });
	});

	it('broadcastHeartbeat posts a presence-heartbeat message with lastSeen', () => {
		const before = Date.now();
		broadcastHeartbeat({ id: 'u1', name: 'Alice', color: '#aaa' });
		const msg = postedMessages[0] as { type: string; payload: { lastSeen: number } };
		expect(msg.type).toBe('presence-heartbeat');
		expect(msg.payload.lastSeen).toBeGreaterThanOrEqual(before);
		expect(msg.payload.lastSeen).toBeLessThanOrEqual(Date.now());
	});

	it('listenForRemoteUpdates calls onTodos for todos-updated messages', () => {
		const onTodos = vi.fn();
		const onKanban = vi.fn();
		const onHeartbeat = vi.fn();
		listenForRemoteUpdates(onTodos, onKanban, onHeartbeat);

		const payload = [{ id: '1', text: 'Hello' }];
		dispatchMessage({ type: 'todos-updated', payload });

		expect(onTodos).toHaveBeenCalledWith(payload);
		expect(onKanban).not.toHaveBeenCalled();
		expect(onHeartbeat).not.toHaveBeenCalled();
	});

	it('listenForRemoteUpdates calls onKanban for kanban-updated messages', () => {
		const onTodos = vi.fn();
		const onKanban = vi.fn();
		const onHeartbeat = vi.fn();
		listenForRemoteUpdates(onTodos, onKanban, onHeartbeat);

		const payload = { columns: [{ id: 'c1', title: 'Col', cardIds: [] }] };
		dispatchMessage({ type: 'kanban-updated', payload });

		expect(onKanban).toHaveBeenCalledWith(payload);
		expect(onTodos).not.toHaveBeenCalled();
	});

	it('listenForRemoteUpdates calls onHeartbeat for presence-heartbeat messages', () => {
		const onTodos = vi.fn();
		const onKanban = vi.fn();
		const onHeartbeat = vi.fn();
		listenForRemoteUpdates(onTodos, onKanban, onHeartbeat);

		const payload = { id: 'u1', name: 'Bob', color: '#bbb', lastSeen: Date.now() };
		dispatchMessage({ type: 'presence-heartbeat', payload });

		expect(onHeartbeat).toHaveBeenCalledWith(payload);
	});

	it('unknown message types are silently ignored', () => {
		const onTodos = vi.fn();
		const onKanban = vi.fn();
		const onHeartbeat = vi.fn();
		listenForRemoteUpdates(onTodos, onKanban, onHeartbeat);

		dispatchMessage({ type: 'unknown-stuff', payload: {} });

		expect(onTodos).not.toHaveBeenCalled();
		expect(onKanban).not.toHaveBeenCalled();
		expect(onHeartbeat).not.toHaveBeenCalled();
	});

	it('unsubscribe stops future delivery', () => {
		const onTodos = vi.fn();
		const unsub = listenForRemoteUpdates(onTodos, vi.fn(), vi.fn());

		dispatchMessage({ type: 'todos-updated', payload: [] });
		expect(onTodos).toHaveBeenCalledTimes(1);

		unsub();
		dispatchMessage({ type: 'todos-updated', payload: [] });
		expect(onTodos).toHaveBeenCalledTimes(1);
	});
});

describe('board activity notifications', () => {
	let listenForRemoteUpdates: typeof import('./broadcastSync').listenForRemoteUpdates;
	let _injectLazyDeps: typeof import('./broadcastSync')._injectLazyDeps;

	let mockPush: ReturnType<typeof vi.fn>;
	let mockKanbanState: import('svelte/store').Writable<import('../stores/kanban.js').KanbanState>;
	let mockTodos: import('svelte/store').Writable<import('../stores/todos.js').Todo[]>;

	beforeEach(async () => {
		vi.resetModules();
		postedMessages = [];
		messageListeners = [];
		localStorageMock.clear();

		const { writable } = await import('svelte/store');
		const mod = await import('./broadcastSync');
		listenForRemoteUpdates = mod.listenForRemoteUpdates;
		_injectLazyDeps = mod._injectLazyDeps;

		mockPush = vi.fn(() => 'mock-notif-id');

		mockKanbanState = writable({
			columns: [
				{ id: 'col-1', title: 'To Do', cardIds: ['card-1', 'card-2'] },
				{ id: 'col-2', title: 'In Progress', cardIds: ['card-3'] },
				{ id: 'col-3', title: 'Done', cardIds: [] }
			]
		});

		mockTodos = writable([
			{ id: 'card-1', text: 'Fix login bug', description: '', completed: false, createdAt: '2026-01-01T00:00:00.000Z', priority: 'none' as const, dueDate: null, labelIds: [], attachments: [], comments: [], archived: false, activityLog: [] },
			{ id: 'card-2', text: 'Add dark mode', description: '', completed: false, createdAt: '2026-01-01T00:00:00.000Z', priority: 'none' as const, dueDate: null, labelIds: [], attachments: [], comments: [], archived: false, activityLog: [] },
			{ id: 'card-3', text: 'Write tests', description: '', completed: false, createdAt: '2026-01-01T00:00:00.000Z', priority: 'none' as const, dueDate: null, labelIds: [], attachments: [], comments: [], archived: false, activityLog: [] }
		] as import('../stores/todos.js').Todo[]);

		_injectLazyDeps({
			kanbanState: mockKanbanState,
			todos: mockTodos,
			push: mockPush
		});
	});

	it('card moved from one column to another triggers activity notification', () => {
		const onTodos = vi.fn();
		const onKanban = vi.fn();
		listenForRemoteUpdates(onTodos, onKanban, vi.fn());

		// card-1 moves from col-1 (To Do) to col-3 (Done)
		const incomingState = {
			columns: [
				{ id: 'col-1', title: 'To Do', cardIds: ['card-2'] },
				{ id: 'col-2', title: 'In Progress', cardIds: ['card-3'] },
				{ id: 'col-3', title: 'Done', cardIds: ['card-1'] }
			]
		};
		dispatchMessage({ type: 'kanban-updated', payload: incomingState });

		expect(onKanban).toHaveBeenCalledWith(incomingState);
		expect(mockPush).toHaveBeenCalledTimes(1);
		expect(mockPush).toHaveBeenCalledWith({
			type: 'activity',
			title: 'Board Updated',
			message: "'Fix login bug' moved to Done"
		});
	});

	it('new column added triggers activity notification', () => {
		listenForRemoteUpdates(vi.fn(), vi.fn(), vi.fn());

		const incomingState = {
			columns: [
				{ id: 'col-1', title: 'To Do', cardIds: ['card-1', 'card-2'] },
				{ id: 'col-2', title: 'In Progress', cardIds: ['card-3'] },
				{ id: 'col-3', title: 'Done', cardIds: [] },
				{ id: 'col-4', title: 'Backlog', cardIds: [] }
			]
		};
		dispatchMessage({ type: 'kanban-updated', payload: incomingState });

		expect(mockPush).toHaveBeenCalledTimes(1);
		expect(mockPush).toHaveBeenCalledWith({
			type: 'activity',
			title: 'Board Updated',
			message: "New column 'Backlog' added"
		});
	});

	it('column renamed triggers activity notification', () => {
		listenForRemoteUpdates(vi.fn(), vi.fn(), vi.fn());

		const incomingState = {
			columns: [
				{ id: 'col-1', title: 'Inbox', cardIds: ['card-1', 'card-2'] },
				{ id: 'col-2', title: 'In Progress', cardIds: ['card-3'] },
				{ id: 'col-3', title: 'Done', cardIds: [] }
			]
		};
		dispatchMessage({ type: 'kanban-updated', payload: incomingState });

		expect(mockPush).toHaveBeenCalledTimes(1);
		expect(mockPush).toHaveBeenCalledWith({
			type: 'activity',
			title: 'Board Updated',
			message: "Column renamed to 'Inbox'"
		});
	});

	it('multiple simultaneous changes produce correct number of push calls', () => {
		listenForRemoteUpdates(vi.fn(), vi.fn(), vi.fn());

		// Add a new column AND rename an existing one in a single broadcast
		const incomingState = {
			columns: [
				{ id: 'col-1', title: 'Inbox', cardIds: ['card-1', 'card-2'] },  // renamed from 'To Do'
				{ id: 'col-2', title: 'In Progress', cardIds: ['card-3'] },
				{ id: 'col-3', title: 'Done', cardIds: [] },
				{ id: 'col-5', title: 'Review', cardIds: [] }  // new column
			]
		};
		dispatchMessage({ type: 'kanban-updated', payload: incomingState });

		expect(mockPush).toHaveBeenCalledTimes(2);

		const calls = mockPush.mock.calls.map((c: unknown[]) => (c[0] as { message: string }).message);
		expect(calls).toContain("Column renamed to 'Inbox'");
		expect(calls).toContain("New column 'Review' added");
	});

	it('todos-updated message does NOT trigger activity push', () => {
		listenForRemoteUpdates(vi.fn(), vi.fn(), vi.fn());

		dispatchMessage({
			type: 'todos-updated',
			payload: [{ id: 'card-1', text: 'Updated title' }]
		});

		expect(mockPush).not.toHaveBeenCalled();
	});

	it('notification-pushed message does NOT trigger activity push', () => {
		listenForRemoteUpdates(vi.fn(), vi.fn(), vi.fn());

		dispatchMessage({
			type: 'notification-pushed',
			payload: { id: 'n1', type: 'overdue', title: 'Card Overdue', message: 'Task is overdue', createdAt: new Date().toISOString() }
		});

		expect(mockPush).not.toHaveBeenCalled();
	});
});
