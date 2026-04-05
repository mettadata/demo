export interface Todo {
	id: string;
	text: string;
	completed: boolean;
	createdAt: string;
}

export type Filter = 'all' | 'active' | 'completed';

export const STORAGE_KEY = 'todos';
