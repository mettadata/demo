/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock localStorage before any Svelte imports
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

// Mock matchMedia
vi.stubGlobal('matchMedia', vi.fn(() => ({
	matches: false,
	addEventListener: vi.fn(),
	removeEventListener: vi.fn(),
	addListener: vi.fn(),
	removeListener: vi.fn(),
	dispatchEvent: vi.fn(),
	media: '',
	onchange: null,
})));

// Track createObjectURL / revokeObjectURL calls
const createObjectURLMock = vi.fn(() => 'blob:mock-url');
const revokeObjectURLMock = vi.fn();
vi.stubGlobal('URL', {
	...globalThis.URL,
	createObjectURL: createObjectURLMock,
	revokeObjectURL: revokeObjectURLMock
});

import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import ExportBoardButton from '../ExportBoardButton.svelte';
import { kanbanState } from '$lib/stores/kanban.js';
import { todos } from '$lib/stores/todos.js';
import { labels } from '$lib/stores/labels.js';

// Helper: intercept anchor creation to capture download filename and blob
function setupAnchorSpy() {
	let capturedDownload = '';
	let capturedBlob: Blob | undefined;

	const origCreateObjectURL = createObjectURLMock;
	(origCreateObjectURL as ReturnType<typeof vi.fn>).mockImplementation((blob: Blob) => {
		capturedBlob = blob;
		return 'blob:mock-url';
	});

	const origCreateElement = document.createElement.bind(document);
	vi.spyOn(document, 'createElement').mockImplementation(function (this: Document, tag: string, options?: ElementCreationOptions) {
		const el = origCreateElement(tag, options);
		if (tag === 'a') {
			vi.spyOn(el as HTMLAnchorElement, 'click').mockImplementation(() => {});
			// Use a proxy to capture download assignment
			const origEl = el as HTMLAnchorElement;
			const proxy = new Proxy(origEl, {
				set(target, prop, value) {
					if (prop === 'download') {
						capturedDownload = value;
					}
					(target as unknown as Record<string | symbol, unknown>)[prop] = value;
					return true;
				}
			});
			return proxy;
		}
		return el;
	});

	return {
		getDownload: () => capturedDownload,
		getBlob: () => capturedBlob
	};
}

afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

beforeEach(() => {
	localStorageMock.clear();
	createObjectURLMock.mockClear();
	revokeObjectURLMock.mockClear();

	// Reset stores to defaults
	kanbanState.set({
		columns: [
			{ id: 'col-todo', title: 'To Do', cardIds: [] },
			{ id: 'col-in-progress', title: 'In Progress', cardIds: [] },
			{ id: 'col-done', title: 'Done', cardIds: [] }
		]
	});
	todos.set([]);
	labels.set([]);
});

describe('ExportBoardButton', () => {
	it('renders export button', () => {
		render(ExportBoardButton);
		const button = screen.getByRole('button', { name: /export/i });
		expect(button).toBeTruthy();
	});

	it('button has correct aria-label', () => {
		render(ExportBoardButton);
		const button = screen.getByRole('button', { name: /export/i });
		expect(button.getAttribute('aria-label')).toBe('Export board as JSON');
	});

	it('exports correct JSON payload structure', async () => {
		const now = new Date().toISOString();
		const todoItems = [
			{
				id: 'todo-1', text: 'Task 1', description: '', completed: false,
				createdAt: now, priority: 'none' as const, dueDate: null, labelIds: ['label-1'],
				attachments: [], comments: [], archived: false,
				activityLog: [{ type: 'created' as const, timestamp: now }]
			},
			{
				id: 'todo-2', text: 'Task 2', description: '', completed: true,
				createdAt: now, priority: 'high' as const, dueDate: null, labelIds: [],
				attachments: [], comments: [], archived: false,
				activityLog: [{ type: 'created' as const, timestamp: now }]
			}
		];

		todos.set(todoItems);
		kanbanState.set({
			columns: [
				{ id: 'col-1', title: 'To Do', cardIds: ['todo-1'] },
				{ id: 'col-2', title: 'Done', cardIds: ['todo-2'] }
			]
		});
		labels.set([
			{ id: 'label-1', name: 'Bug', color: 'red' },
			{ id: 'label-2', name: 'Feature', color: 'blue' }
		]);

		const spy = setupAnchorSpy();

		render(ExportBoardButton);
		const button = screen.getByRole('button', { name: /export/i });
		await fireEvent.click(button);

		expect(createObjectURLMock).toHaveBeenCalled();
		const blob = spy.getBlob();
		expect(blob).toBeDefined();
		const blobContent = await blob!.text();
		const payload = JSON.parse(blobContent);

		expect(payload.version).toBe('1');
		expect(payload.exportedAt).toBeDefined();
		expect(payload.columns).toHaveLength(2);
		expect(payload.cards).toHaveLength(2);
		expect(payload.labels).toBeDefined();
	});

	it('only includes referenced labels', async () => {
		const now = new Date().toISOString();
		todos.set([
			{
				id: 'todo-1', text: 'Task 1', description: '', completed: false,
				createdAt: now, priority: 'none' as const, dueDate: null, labelIds: ['label-1'],
				attachments: [], comments: [], archived: false,
				activityLog: [{ type: 'created' as const, timestamp: now }]
			}
		]);
		kanbanState.set({
			columns: [{ id: 'col-1', title: 'To Do', cardIds: ['todo-1'] }]
		});
		labels.set([
			{ id: 'label-1', name: 'Bug', color: 'red' },
			{ id: 'label-2', name: 'Feature', color: 'blue' },
			{ id: 'label-3', name: 'Docs', color: 'green' }
		]);

		const spy = setupAnchorSpy();

		render(ExportBoardButton);
		const button = screen.getByRole('button', { name: /export/i });
		await fireEvent.click(button);

		const blob = spy.getBlob();
		expect(blob).toBeDefined();
		const blobContent = await blob!.text();
		const payload = JSON.parse(blobContent);

		expect(payload.labels).toHaveLength(1);
		expect(payload.labels[0].id).toBe('label-1');
		expect(payload.labels[0].name).toBe('Bug');
	});

	it('filename includes current date', async () => {
		const spy = setupAnchorSpy();

		render(ExportBoardButton);
		const button = screen.getByRole('button', { name: /export/i });
		await fireEvent.click(button);

		const today = new Date().toISOString().split('T')[0];
		expect(spy.getDownload()).toBe(`board-export-${today}.json`);
	});

	it('revokes object URL after download', async () => {
		setupAnchorSpy();

		render(ExportBoardButton);
		const button = screen.getByRole('button', { name: /export/i });
		await fireEvent.click(button);

		expect(revokeObjectURLMock).toHaveBeenCalledWith('blob:mock-url');
	});
});
