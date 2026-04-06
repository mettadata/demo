import { initTodos } from './todos.js';
import { initKanban } from './kanban.js';
import { initLabels } from './labels.js';

export function initStores(userId: string): void {
	initTodos(userId);
	initKanban(userId);
	initLabels(userId);
}
