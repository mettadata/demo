import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock localStorage before importing the store module
const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
		get length() {
			return Object.keys(store).length;
		},
		key: vi.fn((index: number) => Object.keys(store)[index] ?? null)
	};
})();

vi.stubGlobal('localStorage', localStorageMock);

// Mock crypto.randomUUID
let uuidCounter = 0;
vi.stubGlobal('crypto', {
	randomUUID: vi.fn(() => `test-uuid-${++uuidCounter}`)
});

describe('labels store', () => {
	let labels: typeof import('./labels.js').labels;
	let addLabel: typeof import('./labels.js').addLabel;
	let updateLabel: typeof import('./labels.js').updateLabel;
	let removeLabel: typeof import('./labels.js').removeLabel;
	let getLabelsByIds: typeof import('./labels.js').getLabelsByIds;
	let LABELS_STORAGE_KEY: string;

	beforeEach(async () => {
		vi.resetModules();
		localStorageMock.clear();
		vi.mocked(localStorageMock.getItem).mockClear();
		vi.mocked(localStorageMock.setItem).mockClear();
		uuidCounter = 0;

		const mod = await import('./labels.js');
		labels = mod.labels;
		addLabel = mod.addLabel;
		updateLabel = mod.updateLabel;
		removeLabel = mod.removeLabel;
		getLabelsByIds = mod.getLabelsByIds;
		LABELS_STORAGE_KEY = mod.LABELS_STORAGE_KEY;

		labels.set([]);
	});

	it('addLabel creates label with correct fields', () => {
		const id = addLabel('Bug', 'red');
		const items = get(labels);
		expect(items).toHaveLength(1);
		expect(items[0]).toMatchObject({
			id: 'test-uuid-1',
			name: 'Bug',
			color: 'red'
		});
		expect(id).toBe('test-uuid-1');
	});

	it('addLabel trims whitespace from name', () => {
		addLabel('  Feature  ', 'blue');
		expect(get(labels)[0].name).toBe('Feature');
	});

	it('updateLabel changes name', () => {
		addLabel('Bug', 'red');
		const id = get(labels)[0].id;
		updateLabel(id, { name: 'Critical Bug' });
		expect(get(labels)[0].name).toBe('Critical Bug');
		expect(get(labels)[0].color).toBe('red');
	});

	it('updateLabel changes color', () => {
		addLabel('Bug', 'red');
		const id = get(labels)[0].id;
		updateLabel(id, { color: 'orange' });
		expect(get(labels)[0].color).toBe('orange');
		expect(get(labels)[0].name).toBe('Bug');
	});

	it('updateLabel changes both name and color', () => {
		addLabel('Bug', 'red');
		const id = get(labels)[0].id;
		updateLabel(id, { name: 'Feature', color: 'green' });
		expect(get(labels)[0].name).toBe('Feature');
		expect(get(labels)[0].color).toBe('green');
	});

	it('removeLabel removes correct label', () => {
		addLabel('Bug', 'red');
		addLabel('Feature', 'blue');
		addLabel('Urgent', 'amber');

		const items = get(labels);
		expect(items).toHaveLength(3);

		removeLabel(items[1].id);

		const remaining = get(labels);
		expect(remaining).toHaveLength(2);
		expect(remaining[0].name).toBe('Bug');
		expect(remaining[1].name).toBe('Urgent');
	});

	it('labels persist to localStorage', () => {
		addLabel('Bug', 'red');
		expect(localStorageMock.setItem).toHaveBeenCalledWith(
			LABELS_STORAGE_KEY,
			expect.any(String)
		);

		const stored = localStorageMock.getItem(LABELS_STORAGE_KEY);
		const parsed = JSON.parse(stored!);
		expect(parsed).toHaveLength(1);
		expect(parsed[0].name).toBe('Bug');
	});

	it('getLabelsByIds returns matching labels', () => {
		addLabel('Bug', 'red');
		addLabel('Feature', 'blue');
		addLabel('Urgent', 'amber');

		const allLabels = get(labels);
		const result = getLabelsByIds(allLabels, [allLabels[0].id, allLabels[2].id]);
		expect(result).toHaveLength(2);
		expect(result[0].name).toBe('Bug');
		expect(result[1].name).toBe('Urgent');
	});

	it('getLabelsByIds ignores invalid IDs', () => {
		addLabel('Bug', 'red');
		const allLabels = get(labels);
		const result = getLabelsByIds(allLabels, [allLabels[0].id, 'nonexistent-id']);
		expect(result).toHaveLength(1);
		expect(result[0].name).toBe('Bug');
	});

	it('getLabelsByIds returns empty array for empty input', () => {
		addLabel('Bug', 'red');
		const allLabels = get(labels);
		const result = getLabelsByIds(allLabels, []);
		expect(result).toHaveLength(0);
	});

	it('loadLabels handles corrupt data gracefully', async () => {
		localStorageMock.setItem(LABELS_STORAGE_KEY, 'not valid json{{{');

		vi.resetModules();
		const mod2 = await import('./labels.js');
		expect(get(mod2.labels)).toEqual([]);
	});

	it('loadLabels handles non-array data gracefully', async () => {
		localStorageMock.setItem(LABELS_STORAGE_KEY, '{"not": "array"}');

		vi.resetModules();
		const mod2 = await import('./labels.js');
		expect(get(mod2.labels)).toEqual([]);
	});

	it('loadLabels rehydrates from valid localStorage', async () => {
		const saved = [{ id: 'saved-1', name: 'Bug', color: 'red' }];
		localStorageMock.setItem(LABELS_STORAGE_KEY, JSON.stringify(saved));

		vi.resetModules();
		const mod2 = await import('./labels.js');
		const items = get(mod2.labels);
		expect(items).toHaveLength(1);
		expect(items[0].name).toBe('Bug');
	});
});
