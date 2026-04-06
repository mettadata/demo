import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { get } from 'svelte/store';

// Mock BroadcastChannel
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

let uuidCounter = 0;
vi.stubGlobal('crypto', {
	randomUUID: vi.fn(() => `collab-uuid-${++uuidCounter}`)
});

describe('collaborators store', () => {
	beforeEach(() => {
		vi.resetModules();
		vi.useFakeTimers();
		localStorageMock.clear();
		vi.mocked(localStorageMock.getItem).mockClear();
		vi.mocked(localStorageMock.setItem).mockClear();
		uuidCounter = 0;
		postedMessages = [];
		messageListeners = [];
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('generates and persists a UUID on first load', async () => {
		const mod = await import('./collaborators');
		const s = get(mod.self);
		expect(s.id).toBe('collab-uuid-1');
		expect(localStorageMock.setItem).toHaveBeenCalledWith('user-id', 'collab-uuid-1');
		mod.destroyPresence();
	});

	it('reuses existing UUID from localStorage', async () => {
		localStorageMock.setItem('user-id', 'existing-id-123');
		vi.mocked(localStorageMock.setItem).mockClear();

		const mod = await import('./collaborators');
		const s = get(mod.self);
		expect(s.id).toBe('existing-id-123');
		// user-id should not have been written again
		const setItemCalls = vi.mocked(localStorageMock.setItem).mock.calls;
		const userIdWrites = setItemCalls.filter(([key]) => key === 'user-id');
		expect(userIdWrites).toHaveLength(0);
		mod.destroyPresence();
	});

	it('self.color is deterministic for the same id', async () => {
		localStorageMock.setItem('user-id', 'stable-id');
		const mod = await import('./collaborators');
		const color1 = get(mod.self).color;
		mod.destroyPresence();

		// Re-import
		vi.resetModules();
		postedMessages = [];
		messageListeners = [];
		const mod2 = await import('./collaborators');
		const color2 = get(mod2.self).color;
		expect(color1).toBe(color2);
		mod2.destroyPresence();
	});

	it('self.name defaults to Anonymous when user-name is absent', async () => {
		const mod = await import('./collaborators');
		expect(get(mod.self).name).toBe('Anonymous');
		mod.destroyPresence();
	});

	it('updateSelfName persists to localStorage and updates store', async () => {
		const mod = await import('./collaborators');
		mod.updateSelfName('Alice');
		expect(localStorageMock.getItem('user-name')).toBe('Alice');
		expect(get(mod.self).name).toBe('Alice');
		mod.destroyPresence();
	});

	it('updateSelfName rejects whitespace-only input', async () => {
		const mod = await import('./collaborators');
		mod.updateSelfName('   ');
		expect(get(mod.self).name).toBe('Anonymous');
		mod.destroyPresence();
	});

	it('getInitials returns GH for Grace Hopper', async () => {
		const mod = await import('./collaborators');
		expect(mod.getInitials('Grace Hopper')).toBe('GH');
		mod.destroyPresence();
	});

	it('getInitials returns AN for Anonymous', async () => {
		const mod = await import('./collaborators');
		expect(mod.getInitials('Anonymous')).toBe('AN');
		mod.destroyPresence();
	});

	it('getInitials returns BO for Bob', async () => {
		const mod = await import('./collaborators');
		expect(mod.getInitials('Bob')).toBe('BO');
		mod.destroyPresence();
	});

	it('getInitials returns ?? for empty string', async () => {
		const mod = await import('./collaborators');
		expect(mod.getInitials('')).toBe('??');
		mod.destroyPresence();
	});

	it('getInitials returns FW for Frank Lloyd Wright', async () => {
		const mod = await import('./collaborators');
		expect(mod.getInitials('Frank Lloyd Wright')).toBe('FW');
		mod.destroyPresence();
	});

	it('deriveColor returns a hex color from the palette', async () => {
		const mod = await import('./collaborators');
		const color = mod.deriveColor('test-id');
		expect(color).toMatch(/^#[0-9a-f]{6}$/);
		mod.destroyPresence();
	});

	it('deriveColor is deterministic', async () => {
		const mod = await import('./collaborators');
		const c1 = mod.deriveColor('same-id');
		const c2 = mod.deriveColor('same-id');
		expect(c1).toBe(c2);
		mod.destroyPresence();
	});
});
