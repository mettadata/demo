/**
 * Returns "Today", "Yesterday", "Tomorrow", or a formatted date like "Apr 6, 2026".
 */
export function formatDisplayDate(isoDate: string, now?: Date): string {
	const date = new Date(isoDate + 'T00:00:00'); // treat as local date
	const ref = now ?? new Date();
	const today = new Date(ref.getFullYear(), ref.getMonth(), ref.getDate());
	const target = new Date(date.getFullYear(), date.getMonth(), date.getDate());
	const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24));

	if (diffDays === 0) return 'Today';
	if (diffDays === 1) return 'Yesterday';
	if (diffDays === -1) return 'Tomorrow';

	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Returns validated YYYY-MM-DD format.
 */
export function formatIsoDate(isoDate: string): string {
	const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!match) throw new TypeError(`Invalid ISO date: "${isoDate}"`);
	return `${match[1]}-${match[2]}-${match[3]}`;
}

/**
 * Returns compact format like "Apr 6".
 */
export function formatShortDate(isoDate: string): string {
	const date = new Date(isoDate + 'T00:00:00');
	return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
