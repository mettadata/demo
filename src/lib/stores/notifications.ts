// STUB: minimal notifications store for compilation.
// Will be replaced by full implementation in Task 1.1.

export type NotificationType = 'overdue' | 'mention' | 'activity';

export interface Notification {
	id: string;
	type: NotificationType;
	title: string;
	message: string;
	createdAt: string;
}

export function push(_n: Omit<Notification, 'id' | 'createdAt'>, _fromChannel?: boolean): string {
	return '';
}
