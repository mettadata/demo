import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock BroadcastChannel globally before any imports
class MockBroadcastChannel {
	name: string;
	constructor(name: string) {
		this.name = name;
	}
	postMessage() {}
	addEventListener() {}
	removeEventListener() {}
	close() {}
}
vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);

// Track postMessage calls on the channel mock
const mockPostMessage = vi.fn();
vi.mock('../sync/broadcastSync.js', () => ({
	channel: { postMessage: (...args: unknown[]) => mockPostMessage(...args) },
	broadcastTodos: vi.fn(),
	broadcastKanban: vi.fn(),
	broadcastHeartbeat: vi.fn(),
	listenForRemoteUpdates: vi.fn(() => () => {})
}));

// Mock crypto.randomUUID for predictable ids
let uuidCounter = 0;
vi.stubGlobal('crypto', {
	randomUUID: vi.fn(() => `notif-uuid-${++uuidCounter}`)
});

describe('notifications store', () => {
	let notifications: typeof import('./notifications').notifications;
	let push: typeof import('./notifications').push;
	let dismiss: typeof import('./notifications').dismiss;
	let clearAll: typeof import('./notifications').clearAll;

	beforeEach(async () => {
		vi.resetModules();
		uuidCounter = 0;
		mockPostMessage.mockClear();

		const mod = await import('./notifications');
		notifications = mod.notifications;
		push = mod.push;
		dismiss = mod.dismiss;
		clearAll = mod.clearAll;

		// Reset store to empty
		clearAll();
		mockPostMessage.mockClear();
	});

	it('push adds a record with generated id and createdAt, returns the id', () => {
		const id = push({ type: 'overdue', title: 'Card Overdue', message: 'Fix login bug is overdue' });
		const items = get(notifications);

		expect(items).toHaveLength(1);
		expect(id).toBe('notif-uuid-1');
		expect(items[0].id).toBe(id);
		expect(items[0].title).toBe('Card Overdue');
		expect(items[0].type).toBe('overdue');
		expect(items[0].message).toBe('Fix login bug is overdue');
		expect(items[0].createdAt).toBeTruthy();
		// Verify it's a valid ISO string
		expect(new Date(items[0].createdAt).toISOString()).toBe(items[0].createdAt);
	});

	it('dismiss removes the correct record by id', () => {
		const idA = push({ type: 'overdue', title: 'A', message: 'msg A' });
		const idB = push({ type: 'mention', title: 'B', message: 'msg B' });

		dismiss(idA);

		const items = get(notifications);
		expect(items).toHaveLength(1);
		expect(items[0].id).toBe(idB);
	});

	it('dismiss with unknown id is a no-op (no error)', () => {
		const id = push({ type: 'overdue', title: 'A', message: 'msg A' });

		expect(() => dismiss('nonexistent')).not.toThrow();

		const items = get(notifications);
		expect(items).toHaveLength(1);
		expect(items[0].id).toBe(id);
	});

	it('clearAll empties the store', () => {
		push({ type: 'overdue', title: 'A', message: 'msg' });
		push({ type: 'mention', title: 'B', message: 'msg' });
		push({ type: 'activity', title: 'C', message: 'msg' });

		clearAll();

		expect(get(notifications)).toEqual([]);
	});

	it('push at capacity (5) evicts the oldest record before appending', () => {
		// Push 5 records; the first one will be the oldest
		const ids: string[] = [];
		for (let i = 0; i < 5; i++) {
			ids.push(push({ type: 'activity', title: `N${i}`, message: `msg ${i}` }));
		}
		expect(get(notifications)).toHaveLength(5);

		// Push a 6th - should evict the oldest (ids[0])
		const newId = push({ type: 'activity', title: 'Board Updated', message: 'New column added' });
		const items = get(notifications);

		expect(items).toHaveLength(5);
		expect(items.find((n) => n.id === ids[0])).toBeUndefined();
		expect(items.find((n) => n.id === newId)).toBeDefined();
	});

	it('eviction removes the record with the lowest createdAt regardless of array position', () => {
		// Manually insert notifications with out-of-order createdAt values
		// Simulate a scenario where a channel-received notification has an earlier timestamp
		// but was appended later in the array
		notifications.set([
			{ id: 'a', type: 'activity', title: 'A', message: 'msg', createdAt: '2026-01-02T00:00:00.000Z' },
			{ id: 'b', type: 'activity', title: 'B', message: 'msg', createdAt: '2026-01-01T00:00:00.000Z' }, // oldest, but not first
			{ id: 'c', type: 'activity', title: 'C', message: 'msg', createdAt: '2026-01-03T00:00:00.000Z' },
			{ id: 'd', type: 'activity', title: 'D', message: 'msg', createdAt: '2026-01-04T00:00:00.000Z' },
			{ id: 'e', type: 'activity', title: 'E', message: 'msg', createdAt: '2026-01-05T00:00:00.000Z' }
		]);

		// Push a 6th - should evict 'b' (lowest createdAt), not 'a' (first element)
		push({ type: 'activity', title: 'F', message: 'msg' });
		const items = get(notifications);

		expect(items).toHaveLength(5);
		expect(items.find((n) => n.id === 'b')).toBeUndefined(); // oldest by createdAt evicted
		expect(items.find((n) => n.id === 'a')).toBeDefined(); // first element preserved
	});

	it('push below capacity does not evict', () => {
		const ids: string[] = [];
		for (let i = 0; i < 4; i++) {
			ids.push(push({ type: 'mention', title: `N${i}`, message: `msg ${i}` }));
		}

		const newId = push({ type: 'mention', title: 'You were mentioned', message: 'Mentioned in Fix login bug' });
		const items = get(notifications);

		expect(items).toHaveLength(5);
		// All 4 previous records still present
		for (const id of ids) {
			expect(items.find((n) => n.id === id)).toBeDefined();
		}
		expect(items.find((n) => n.id === newId)).toBeDefined();
	});

	it('_fromChannel = true skips postMessage', () => {
		push({ type: 'overdue', title: 'Remote', message: 'from channel' }, true);
		expect(mockPostMessage).not.toHaveBeenCalled();
	});

	it('_fromChannel = false (or omitted) calls postMessage', () => {
		push({ type: 'overdue', title: 'Local', message: 'local push' });
		expect(mockPostMessage).toHaveBeenCalledTimes(1);
		expect(mockPostMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: 'notification-pushed' })
		);
	});

	it('push succeeds when channel is null', async () => {
		// Re-import with channel as null
		vi.resetModules();
		uuidCounter = 0;

		vi.doMock('../sync/broadcastSync.js', () => ({
			channel: null,
			broadcastTodos: vi.fn(),
			broadcastKanban: vi.fn(),
			broadcastHeartbeat: vi.fn(),
			listenForRemoteUpdates: vi.fn(() => () => {})
		}));

		const mod = await import('./notifications');
		mod.clearAll();

		expect(() => {
			mod.push({ type: 'overdue', title: 'Test', message: 'no channel' });
		}).not.toThrow();

		expect(get(mod.notifications)).toHaveLength(1);

		// Restore original mock for subsequent tests
		vi.doUnmock('../sync/broadcastSync.js');
	});
});
