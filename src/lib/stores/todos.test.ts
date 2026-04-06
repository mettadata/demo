import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// Mock broadcastSync module
const mockBroadcastTodos = vi.fn();
vi.mock('../sync/broadcastSync.js', () => ({
	broadcastTodos: (...args: unknown[]) => mockBroadcastTodos(...args),
	broadcastKanban: vi.fn(),
	broadcastHeartbeat: vi.fn(),
	listenForRemoteUpdates: vi.fn(() => () => {})
}));

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

describe('todo store', () => {
	let todos: typeof import('./todos').todos;
	let filter: typeof import('./todos').filter;
	let filteredTodos: typeof import('./todos').filteredTodos;
	let addTodo: typeof import('./todos').addTodo;
	let toggleTodo: typeof import('./todos').toggleTodo;
	let removeTodo: typeof import('./todos').removeTodo;
	let updateTodo: typeof import('./todos').updateTodo;
	let sortTodosByDueDate: typeof import('./todos').sortTodosByDueDate;
	let sortedFilteredTodos: typeof import('./todos').sortedFilteredTodos;
	let sortByDueDate: typeof import('./todos').sortByDueDate;
	let searchQuery: typeof import('./todos').searchQuery;
	let addAttachment: typeof import('./todos').addAttachment;
	let removeAttachment: typeof import('./todos').removeAttachment;
	let getLastPersistError: typeof import('./todos').getLastPersistError;
	let addComment: typeof import('./todos').addComment;
	let editComment: typeof import('./todos').editComment;
	let deleteComment: typeof import('./todos').deleteComment;
	let addReply: typeof import('./todos').addReply;
	let editReply: typeof import('./todos').editReply;
	let deleteReply: typeof import('./todos').deleteReply;
	let archiveTodo: typeof import('./todos').archiveTodo;
	let unarchiveTodo: typeof import('./todos').unarchiveTodo;
	let STORAGE_KEY: string;
	let SORT_STORAGE_KEY: string;

	beforeEach(async () => {
		vi.resetModules();
		localStorageMock.clear();
		vi.mocked(localStorageMock.getItem).mockClear();
		vi.mocked(localStorageMock.setItem).mockClear();
		mockBroadcastTodos.mockClear();
		uuidCounter = 0;

		const mod = await import('./todos');
		todos = mod.todos;
		filter = mod.filter;
		filteredTodos = mod.filteredTodos;
		addTodo = mod.addTodo;
		toggleTodo = mod.toggleTodo;
		removeTodo = mod.removeTodo;
		updateTodo = mod.updateTodo;
		sortTodosByDueDate = mod.sortTodosByDueDate;
		sortedFilteredTodos = mod.sortedFilteredTodos;
		sortByDueDate = mod.sortByDueDate;
		searchQuery = mod.searchQuery;
		addAttachment = mod.addAttachment;
		removeAttachment = mod.removeAttachment;
		getLastPersistError = mod.getLastPersistError;
		addComment = mod.addComment;
		editComment = mod.editComment;
		deleteComment = mod.deleteComment;
		addReply = mod.addReply;
		editReply = mod.editReply;
		deleteReply = mod.deleteReply;
		archiveTodo = mod.archiveTodo;
		unarchiveTodo = mod.unarchiveTodo;
		STORAGE_KEY = mod.STORAGE_KEY;
		SORT_STORAGE_KEY = mod.SORT_STORAGE_KEY;

		// Reset store to empty
		todos.set([]);
		filter.set('all');
		sortByDueDate.set(false);
		searchQuery.set('');
	});

	it('addTodo creates todo with correct fields', () => {
		addTodo('Buy milk');
		const items = get(todos);
		expect(items).toHaveLength(1);
		expect(items[0]).toMatchObject({
			id: 'test-uuid-1',
			text: 'Buy milk',
			completed: false
		});
		expect(items[0].createdAt).toBeTruthy();
		// Verify it's a valid ISO string
		expect(new Date(items[0].createdAt).toISOString()).toBe(items[0].createdAt);
	});

	it('addTodo rejects empty and whitespace-only strings', () => {
		addTodo('');
		expect(get(todos)).toHaveLength(0);

		addTodo('   ');
		expect(get(todos)).toHaveLength(0);

		addTodo('\t\n');
		expect(get(todos)).toHaveLength(0);
	});

	it('addTodo trims whitespace from text', () => {
		addTodo('  Buy milk  ');
		expect(get(todos)[0].text).toBe('Buy milk');
	});

	it('toggleTodo flips completed', () => {
		addTodo('Buy milk');
		const id = get(todos)[0].id;

		expect(get(todos)[0].completed).toBe(false);
		toggleTodo(id);
		expect(get(todos)[0].completed).toBe(true);
		toggleTodo(id);
		expect(get(todos)[0].completed).toBe(false);
	});

	it('removeTodo removes correct todo and leaves others', () => {
		addTodo('First');
		addTodo('Second');
		addTodo('Third');

		const items = get(todos);
		expect(items).toHaveLength(3);

		removeTodo(items[1].id);

		const remaining = get(todos);
		expect(remaining).toHaveLength(2);
		expect(remaining[0].text).toBe('First');
		expect(remaining[1].text).toBe('Third');
	});

	it('filteredTodos returns only active when filter is active', () => {
		addTodo('Active todo');
		addTodo('Completed todo');
		toggleTodo(get(todos)[1].id);

		filter.set('active');
		const result = get(filteredTodos);
		expect(result).toHaveLength(1);
		expect(result[0].text).toBe('Active todo');
		expect(result[0].completed).toBe(false);
	});

	it('filteredTodos returns only completed when filter is completed', () => {
		addTodo('Active todo');
		addTodo('Completed todo');
		toggleTodo(get(todos)[1].id);

		filter.set('completed');
		const result = get(filteredTodos);
		expect(result).toHaveLength(1);
		expect(result[0].text).toBe('Completed todo');
		expect(result[0].completed).toBe(true);
	});

	it('filteredTodos returns all when filter is all', () => {
		addTodo('Active todo');
		addTodo('Completed todo');
		toggleTodo(get(todos)[1].id);

		filter.set('all');
		const result = get(filteredTodos);
		expect(result).toHaveLength(2);
	});

	it('localStorage round-trip persists and rehydrates', async () => {
		addTodo('Persisted todo');
		toggleTodo(get(todos)[0].id);

		// Verify localStorage was written
		const stored = localStorageMock.getItem(STORAGE_KEY);
		expect(stored).toBeTruthy();
		const parsed = JSON.parse(stored!);
		expect(parsed).toHaveLength(1);
		expect(parsed[0].text).toBe('Persisted todo');
		expect(parsed[0].completed).toBe(true);

		// Re-import module to test rehydration from localStorage
		vi.resetModules();
		const mod2 = await import('./todos');
		const rehydrated = get(mod2.todos);
		expect(rehydrated).toHaveLength(1);
		expect(rehydrated[0].text).toBe('Persisted todo');
		expect(rehydrated[0].completed).toBe(true);
	});

	it('loadTodos returns empty array on corrupt localStorage data', async () => {
		localStorageMock.setItem(STORAGE_KEY, 'not valid json{{{');

		vi.resetModules();
		const mod2 = await import('./todos');
		expect(get(mod2.todos)).toEqual([]);
	});

	it('addTodo includes priority and dueDate defaults', () => {
		addTodo('Test todo');
		const items = get(todos);
		expect(items).toHaveLength(1);
		expect(items[0].priority).toBe('none');
		expect(items[0].dueDate).toBeNull();
	});

	it('addTodo includes empty labelIds default', () => {
		addTodo('Test todo');
		const items = get(todos);
		expect(items).toHaveLength(1);
		expect(items[0].labelIds).toEqual([]);
	});

	it('addTodo includes empty description default', () => {
		addTodo('Test todo');
		const items = get(todos);
		expect(items).toHaveLength(1);
		expect(items[0].description).toBe('');
	});

	it('legacy migration defaults missing priority and dueDate', async () => {
		const legacyTodo = {
			id: 'legacy-1',
			text: 'Old todo',
			completed: false,
			createdAt: '2024-01-01T00:00:00.000Z'
		};
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify([legacyTodo]));

		vi.resetModules();
		const mod2 = await import('./todos');
		const items = get(mod2.todos);
		expect(items).toHaveLength(1);
		expect(items[0].priority).toBe('none');
		expect(items[0].dueDate).toBeNull();
	});

	it('legacy migration defaults missing description to empty string', async () => {
		const legacyTodo = {
			id: 'legacy-2',
			text: 'Old todo no desc',
			completed: false,
			createdAt: '2024-01-01T00:00:00.000Z',
			priority: 'low',
			dueDate: null
		};
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify([legacyTodo]));

		vi.resetModules();
		const mod2 = await import('./todos');
		const items = get(mod2.todos);
		expect(items).toHaveLength(1);
		expect(items[0].description).toBe('');
	});

	it('legacy migration defaults missing labelIds to empty array', async () => {
		const legacyTodo = {
			id: 'legacy-3',
			text: 'Old todo no labels',
			completed: false,
			createdAt: '2024-01-01T00:00:00.000Z',
			priority: 'none',
			dueDate: null,
			description: ''
		};
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify([legacyTodo]));

		vi.resetModules();
		const mod2 = await import('./todos');
		const items = get(mod2.todos);
		expect(items).toHaveLength(1);
		expect(items[0].labelIds).toEqual([]);
	});

	it('updateTodo sets priority', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		updateTodo(id, { priority: 'high' });
		expect(get(todos)[0].priority).toBe('high');
	});

	it('updateTodo sets dueDate', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		updateTodo(id, { dueDate: '2025-06-15' });
		expect(get(todos)[0].dueDate).toBe('2025-06-15');
	});

	it('updateTodo sets description', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		updateTodo(id, { description: '**bold** description' });
		expect(get(todos)[0].description).toBe('**bold** description');
	});

	it('updateTodo sets labelIds', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		updateTodo(id, { labelIds: ['label-1', 'label-2'] });
		expect(get(todos)[0].labelIds).toEqual(['label-1', 'label-2']);
	});

	it('updateTodo clears dueDate', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		updateTodo(id, { dueDate: '2025-06-15' });
		expect(get(todos)[0].dueDate).toBe('2025-06-15');
		updateTodo(id, { dueDate: null });
		expect(get(todos)[0].dueDate).toBeNull();
	});

	it('sortTodosByDueDate sorts ascending with nulls last', () => {
		const input = [
			{ id: '1', text: 'C', description: '', completed: false, createdAt: '', priority: 'none' as const, dueDate: '2025-12-01', labelIds: [], activityLog: [], attachments: [], comments: [], archived: false },
			{ id: '2', text: 'A', description: '', completed: false, createdAt: '', priority: 'none' as const, dueDate: null, labelIds: [], activityLog: [], attachments: [], comments: [], archived: false },
			{ id: '3', text: 'B', description: '', completed: false, createdAt: '', priority: 'none' as const, dueDate: '2025-06-01', labelIds: [], activityLog: [], attachments: [], comments: [], archived: false }
		];
		const sorted = sortTodosByDueDate(input);
		expect(sorted[0].dueDate).toBe('2025-06-01');
		expect(sorted[1].dueDate).toBe('2025-12-01');
		expect(sorted[2].dueDate).toBeNull();
	});

	it('sortedFilteredTodos applies sort when enabled', () => {
		addTodo('Later');
		updateTodo(get(todos)[0].id, { dueDate: '2025-12-01' });
		addTodo('Sooner');
		updateTodo(get(todos)[1].id, { dueDate: '2025-06-01' });
		addTodo('No date');

		sortByDueDate.set(true);
		const result = get(sortedFilteredTodos);
		expect(result[0].text).toBe('Sooner');
		expect(result[1].text).toBe('Later');
		expect(result[2].text).toBe('No date');
	});

	it('sortedFilteredTodos passes through when disabled', () => {
		addTodo('Later');
		updateTodo(get(todos)[0].id, { dueDate: '2025-12-01' });
		addTodo('Sooner');
		updateTodo(get(todos)[1].id, { dueDate: '2025-06-01' });

		sortByDueDate.set(false);
		const result = get(sortedFilteredTodos);
		expect(result[0].text).toBe('Later');
		expect(result[1].text).toBe('Sooner');
	});

	it('sortByDueDate persists to localStorage', () => {
		sortByDueDate.set(true);
		expect(localStorageMock.setItem).toHaveBeenCalledWith(SORT_STORAGE_KEY, 'true');
	});

	it('searchQuery filters todos by text (case-insensitive)', () => {
		addTodo('Buy milk');
		addTodo('Walk the dog');
		addTodo('Buy eggs');

		searchQuery.set('buy');
		const result = get(filteredTodos);
		expect(result).toHaveLength(2);
		expect(result[0].text).toBe('Buy milk');
		expect(result[1].text).toBe('Buy eggs');
	});

	it('searchQuery matches description text', () => {
		addTodo('Buy milk');
		addTodo('Walk the dog');
		const id = get(todos)[1].id;
		updateTodo(id, { description: 'Remember to bring treats' });

		searchQuery.set('treats');
		const result = get(filteredTodos);
		expect(result).toHaveLength(1);
		expect(result[0].text).toBe('Walk the dog');
	});

	it('searchQuery with empty string shows all todos', () => {
		addTodo('Buy milk');
		addTodo('Walk the dog');

		searchQuery.set('');
		expect(get(filteredTodos)).toHaveLength(2);

		searchQuery.set('   ');
		expect(get(filteredTodos)).toHaveLength(2);
	});

	it('searchQuery works alongside status filter', () => {
		addTodo('Buy milk');
		addTodo('Buy eggs');
		toggleTodo(get(todos)[0].id); // complete "Buy milk"

		filter.set('active');
		searchQuery.set('buy');
		const result = get(filteredTodos);
		expect(result).toHaveLength(1);
		expect(result[0].text).toBe('Buy eggs');
	});

	it('addTodo includes empty attachments default', () => {
		addTodo('Test todo');
		const items = get(todos);
		expect(items[0].attachments).toEqual([]);
	});

	it('legacy migration defaults missing attachments to empty array', async () => {
		const legacyTodo = {
			id: 'legacy-att',
			text: 'Old todo no attachments',
			completed: false,
			createdAt: '2024-01-01T00:00:00.000Z',
			priority: 'none',
			dueDate: null,
			description: '',
			labelIds: []
		};
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify([legacyTodo]));

		vi.resetModules();
		const mod2 = await import('./todos');
		const items = get(mod2.todos);
		expect(items).toHaveLength(1);
		expect(items[0].attachments).toEqual([]);
	});

	it('addAttachment adds an attachment and logs activity', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		const attachment = {
			id: 'att-1',
			name: 'photo.png',
			mimeType: 'image/png',
			dataUrl: 'data:image/png;base64,abc',
			size: 1024,
			createdAt: new Date().toISOString()
		};
		const ok = addAttachment(id, attachment);
		expect(ok).toBe(true);
		const item = get(todos)[0];
		expect(item.attachments).toHaveLength(1);
		expect(item.attachments[0].name).toBe('photo.png');
		const lastEvent = item.activityLog[item.activityLog.length - 1];
		expect(lastEvent.type).toBe('attachment_added');
		expect(lastEvent.detail?.name).toBe('photo.png');
	});

	it('addAttachment returns false and reverts on quota exceeded', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		const attachment = {
			id: 'att-2',
			name: 'bigfile.zip',
			mimeType: 'application/zip',
			dataUrl: 'data:application/zip;base64,abc',
			size: 4000000,
			createdAt: new Date().toISOString()
		};

		// Make setItem throw to simulate quota exceeded
		vi.mocked(localStorageMock.setItem).mockImplementationOnce(() => {
			throw new DOMException('QuotaExceededError');
		});

		const ok = addAttachment(id, attachment);
		expect(ok).toBe(false);
		expect(get(todos)[0].attachments).toHaveLength(0);
	});

	it('removeAttachment removes attachment and logs activity', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		const attachment = {
			id: 'att-3',
			name: 'doc.pdf',
			mimeType: 'application/pdf',
			dataUrl: 'data:application/pdf;base64,abc',
			size: 2048,
			createdAt: new Date().toISOString()
		};
		addAttachment(id, attachment);
		expect(get(todos)[0].attachments).toHaveLength(1);

		removeAttachment(id, 'att-3');
		const item = get(todos)[0];
		expect(item.attachments).toHaveLength(0);
		const lastEvent = item.activityLog[item.activityLog.length - 1];
		expect(lastEvent.type).toBe('attachment_removed');
		expect(lastEvent.detail?.name).toBe('doc.pdf');
	});

	it('addTodo includes empty comments default', () => {
		addTodo('Test todo');
		expect(get(todos)[0].comments).toEqual([]);
	});

	it('legacy migration defaults missing comments to empty array', async () => {
		const legacyTodo = {
			id: 'legacy-cmt',
			text: 'Old todo no comments',
			completed: false,
			createdAt: '2024-01-01T00:00:00.000Z',
			priority: 'none',
			dueDate: null,
			description: '',
			labelIds: [],
			attachments: []
		};
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify([legacyTodo]));

		vi.resetModules();
		const mod2 = await import('./todos');
		const items = get(mod2.todos);
		expect(items).toHaveLength(1);
		expect(items[0].comments).toEqual([]);
	});

	it('addComment adds a comment to a todo', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		addComment(id, 'This is a comment');
		const item = get(todos)[0];
		expect(item.comments).toHaveLength(1);
		expect(item.comments[0].body).toBe('This is a comment');
		expect(item.comments[0].replies).toEqual([]);
		expect(item.comments[0].id).toBeTruthy();
		expect(item.comments[0].createdAt).toBeTruthy();
	});

	it('addComment trims whitespace and rejects empty', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		addComment(id, '   ');
		expect(get(todos)[0].comments).toHaveLength(0);

		addComment(id, '  Hello  ');
		expect(get(todos)[0].comments[0].body).toBe('Hello');
	});

	it('editComment updates the comment body', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		addComment(id, 'Original');
		const commentId = get(todos)[0].comments[0].id;
		editComment(id, commentId, 'Updated');
		expect(get(todos)[0].comments[0].body).toBe('Updated');
	});

	it('editComment rejects empty body', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		addComment(id, 'Original');
		const commentId = get(todos)[0].comments[0].id;
		editComment(id, commentId, '   ');
		expect(get(todos)[0].comments[0].body).toBe('Original');
	});

	it('deleteComment removes a comment', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		addComment(id, 'First');
		addComment(id, 'Second');
		expect(get(todos)[0].comments).toHaveLength(2);

		const commentId = get(todos)[0].comments[0].id;
		deleteComment(id, commentId);
		expect(get(todos)[0].comments).toHaveLength(1);
		expect(get(todos)[0].comments[0].body).toBe('Second');
	});

	it('addReply adds a reply to a comment', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		addComment(id, 'Parent comment');
		const commentId = get(todos)[0].comments[0].id;
		addReply(id, commentId, 'This is a reply');
		const comment = get(todos)[0].comments[0];
		expect(comment.replies).toHaveLength(1);
		expect(comment.replies[0].body).toBe('This is a reply');
		expect(comment.replies[0].id).toBeTruthy();
		expect(comment.replies[0].createdAt).toBeTruthy();
	});

	it('addReply rejects empty body', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		addComment(id, 'Parent');
		const commentId = get(todos)[0].comments[0].id;
		addReply(id, commentId, '  ');
		expect(get(todos)[0].comments[0].replies).toHaveLength(0);
	});

	it('editReply updates the reply body', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		addComment(id, 'Parent');
		const commentId = get(todos)[0].comments[0].id;
		addReply(id, commentId, 'Original reply');
		const replyId = get(todos)[0].comments[0].replies[0].id;
		editReply(id, commentId, replyId, 'Updated reply');
		expect(get(todos)[0].comments[0].replies[0].body).toBe('Updated reply');
	});

	it('deleteReply removes a reply from a comment', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		addComment(id, 'Parent');
		const commentId = get(todos)[0].comments[0].id;
		addReply(id, commentId, 'Reply 1');
		addReply(id, commentId, 'Reply 2');
		expect(get(todos)[0].comments[0].replies).toHaveLength(2);

		const replyId = get(todos)[0].comments[0].replies[0].id;
		deleteReply(id, commentId, replyId);
		expect(get(todos)[0].comments[0].replies).toHaveLength(1);
		expect(get(todos)[0].comments[0].replies[0].body).toBe('Reply 2');
	});

	it('addTodo includes archived: false default', () => {
		addTodo('Test todo');
		expect(get(todos)[0].archived).toBe(false);
	});

	it('legacy migration defaults missing archived to false', async () => {
		const legacyTodo = {
			id: 'legacy-arch',
			text: 'Old todo no archived',
			completed: true,
			createdAt: '2024-01-01T00:00:00.000Z',
			priority: 'none',
			dueDate: null,
			description: '',
			labelIds: [],
			attachments: [],
			comments: []
		};
		localStorageMock.setItem(STORAGE_KEY, JSON.stringify([legacyTodo]));

		vi.resetModules();
		const mod2 = await import('./todos');
		const items = get(mod2.todos);
		expect(items).toHaveLength(1);
		expect(items[0].archived).toBe(false);
	});

	it('archiveTodo sets archived to true and logs activity', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		toggleTodo(id); // complete it
		archiveTodo(id);
		const item = get(todos)[0];
		expect(item.archived).toBe(true);
		const lastEvent = item.activityLog[item.activityLog.length - 1];
		expect(lastEvent.type).toBe('archived');
	});

	it('unarchiveTodo sets archived to false and logs activity', () => {
		addTodo('Test todo');
		const id = get(todos)[0].id;
		toggleTodo(id);
		archiveTodo(id);
		unarchiveTodo(id);
		const item = get(todos)[0];
		expect(item.archived).toBe(false);
		const lastEvent = item.activityLog[item.activityLog.length - 1];
		expect(lastEvent.type).toBe('unarchived');
	});

	it('filteredTodos hides archived cards by default', () => {
		addTodo('Active todo');
		addTodo('Archived todo');
		const id = get(todos)[1].id;
		toggleTodo(id);
		archiveTodo(id);

		filter.set('all');
		expect(get(filteredTodos)).toHaveLength(1);
		expect(get(filteredTodos)[0].text).toBe('Active todo');
	});

	it('filteredTodos shows only archived when filter is archived', () => {
		addTodo('Active todo');
		addTodo('Archived todo');
		const id = get(todos)[1].id;
		toggleTodo(id);
		archiveTodo(id);

		filter.set('archived');
		const result = get(filteredTodos);
		expect(result).toHaveLength(1);
		expect(result[0].text).toBe('Archived todo');
	});

	it('archived cards are hidden from active and completed filters', () => {
		addTodo('Active todo');
		addTodo('Completed todo');
		addTodo('Archived todo');
		toggleTodo(get(todos)[1].id); // complete
		toggleTodo(get(todos)[2].id); // complete
		archiveTodo(get(todos)[2].id); // archive

		filter.set('active');
		expect(get(filteredTodos)).toHaveLength(1);
		expect(get(filteredTodos)[0].text).toBe('Active todo');

		filter.set('completed');
		expect(get(filteredTodos)).toHaveLength(1);
		expect(get(filteredTodos)[0].text).toBe('Completed todo');
	});

	// --- actorId and broadcast tests ---

	it('addTodo with actorId embeds it in the created event detail', () => {
		addTodo('Buy milk', 'user-1');
		const item = get(todos)[0];
		expect(item.activityLog[0].type).toBe('created');
		expect(item.activityLog[0].detail).toEqual({ actorId: 'user-1' });
	});

	it('addTodo without actorId does not include actorId in detail', () => {
		addTodo('Buy eggs');
		const item = get(todos)[0];
		expect(item.activityLog[0].type).toBe('created');
		expect(item.activityLog[0].detail).toBeUndefined();
	});

	it('toggleTodo with actorId embeds it in the completed event', () => {
		addTodo('Test');
		const id = get(todos)[0].id;
		toggleTodo(id, 'user-2');
		const item = get(todos)[0];
		const lastEvent = item.activityLog[item.activityLog.length - 1];
		expect(lastEvent.type).toBe('completed');
		expect(lastEvent.detail).toEqual({ actorId: 'user-2' });
	});

	it('archiveTodo with actorId embeds it in the archived event', () => {
		addTodo('Test');
		const id = get(todos)[0].id;
		archiveTodo(id, 'user-4');
		const item = get(todos)[0];
		const lastEvent = item.activityLog[item.activityLog.length - 1];
		expect(lastEvent.type).toBe('archived');
		expect(lastEvent.detail).toEqual({ actorId: 'user-4' });
	});

	it('unarchiveTodo with actorId embeds it in the unarchived event', () => {
		addTodo('Test');
		const id = get(todos)[0].id;
		archiveTodo(id);
		unarchiveTodo(id, 'user-5');
		const item = get(todos)[0];
		const lastEvent = item.activityLog[item.activityLog.length - 1];
		expect(lastEvent.type).toBe('unarchived');
		expect(lastEvent.detail).toEqual({ actorId: 'user-5' });
	});

	it('broadcastTodos is called once per mutation', () => {
		mockBroadcastTodos.mockClear();
		addTodo('Test');
		expect(mockBroadcastTodos).toHaveBeenCalledTimes(1);
		expect(mockBroadcastTodos).toHaveBeenCalledWith(get(todos));
	});

	it('broadcastTodos is called for toggleTodo', () => {
		addTodo('Test');
		mockBroadcastTodos.mockClear();
		toggleTodo(get(todos)[0].id);
		expect(mockBroadcastTodos).toHaveBeenCalledTimes(1);
	});

	it('broadcastTodos is called for removeTodo', () => {
		addTodo('Test');
		mockBroadcastTodos.mockClear();
		removeTodo(get(todos)[0].id);
		expect(mockBroadcastTodos).toHaveBeenCalledTimes(1);
	});

	it('addAttachment does not broadcast on quota exceeded', () => {
		addTodo('Test');
		const id = get(todos)[0].id;
		mockBroadcastTodos.mockClear();

		vi.mocked(localStorageMock.setItem).mockImplementationOnce(() => {
			throw new DOMException('QuotaExceededError');
		});

		const ok = addAttachment(id, {
			id: 'att-q',
			name: 'big.zip',
			mimeType: 'application/zip',
			dataUrl: 'data:application/zip;base64,abc',
			size: 4000000,
			createdAt: new Date().toISOString()
		});

		expect(ok).toBe(false);
		expect(mockBroadcastTodos).not.toHaveBeenCalled();
	});

	it('addAttachment broadcasts on success', () => {
		addTodo('Test');
		const id = get(todos)[0].id;
		mockBroadcastTodos.mockClear();

		const ok = addAttachment(id, {
			id: 'att-ok',
			name: 'file.txt',
			mimeType: 'text/plain',
			dataUrl: 'data:text/plain;base64,abc',
			size: 100,
			createdAt: new Date().toISOString()
		});

		expect(ok).toBe(true);
		expect(mockBroadcastTodos).toHaveBeenCalledTimes(1);
	});

	it('remote todos.set does not push to undo stack', async () => {
		// Import history module to check undo stack
		const historyMod = await import('./history');
		expect(get(historyMod.canUndo)).toBe(false);

		// Direct store.set (simulating remote update) should not create undo entry
		todos.set([{
			id: 'remote-1',
			text: 'Remote card',
			description: '',
			completed: false,
			createdAt: new Date().toISOString(),
			priority: 'none',
			dueDate: null,
			labelIds: [],
			attachments: [],
			comments: [],
			archived: false,
			activityLog: [{ type: 'created', timestamp: new Date().toISOString() }]
		}]);

		// canUndo should still be false because direct set bypasses snapshot
		expect(get(historyMod.canUndo)).toBe(false);
	});
});
