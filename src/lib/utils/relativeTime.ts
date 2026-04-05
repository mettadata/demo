/**
 * Formats an ISO 8601 timestamp into a human-readable relative time string.
 */
export function formatRelativeTime(isoTimestamp: string, now?: Date): string {
	const date = new Date(isoTimestamp);
	const ref = now ?? new Date();
	const diffMs = ref.getTime() - date.getTime();

	if (diffMs < 0) return 'just now';

	const seconds = Math.floor(diffMs / 1000);
	if (seconds < 60) return 'just now';

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;

	const hours = Math.floor(minutes / 60);
	if (hours < 24) return hours === 1 ? '1 hour ago' : `${hours} hours ago`;

	const days = Math.floor(hours / 24);
	if (days === 1) return 'yesterday';
	if (days < 30) return `${days} days ago`;

	const months = Math.floor(days / 30);
	if (months < 12) return months === 1 ? '1 month ago' : `${months} months ago`;

	const years = Math.floor(months / 12);
	return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Formats an ActivityEvent into a human-readable description.
 */
export function formatActivityDescription(type: string, detail?: Record<string, unknown>): string {
	switch (type) {
		case 'created':
			return 'Created';
		case 'completed':
			return 'Completed';
		case 'uncompleted':
			return 'Reopened';
		case 'moved': {
			const from = detail?.fromColumn ?? 'unknown';
			const to = detail?.toColumn ?? 'unknown';
			return `Moved from ${from} to ${to}`;
		}
		case 'edited': {
			const field = detail?.field as string | undefined;
			if (!field) return 'Edited';
			switch (field) {
				case 'description':
					return 'Description updated';
				case 'priority': {
					const from = detail?.from ?? 'none';
					const to = detail?.to ?? 'none';
					return `Priority changed from ${from} to ${to}`;
				}
				case 'dueDate': {
					const from = detail?.from;
					const to = detail?.to;
					if (!from && to) return `Due date set to ${to}`;
					if (from && !to) return 'Due date removed';
					return `Due date changed from ${from} to ${to}`;
				}
				case 'labelIds':
					return 'Labels updated';
				default:
					return `${field} updated`;
			}
		}
		default:
			return type;
	}
}
