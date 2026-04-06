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
