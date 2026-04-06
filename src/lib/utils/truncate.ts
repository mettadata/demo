/**
 * Truncates text to a maximum length, appending a suffix (default "...").
 */
export function truncate(
	text: string,
	maxLength: number,
	options?: { wordBoundary?: boolean; suffix?: string }
): string {
	const suffix = options?.suffix ?? '...';
	if (text.length <= maxLength) return text;

	const cutLength = maxLength - suffix.length;
	if (cutLength <= 0) return suffix.slice(0, maxLength);

	let truncated = text.slice(0, cutLength);

	if (options?.wordBoundary) {
		const lastSpace = truncated.lastIndexOf(' ');
		if (lastSpace > 0) {
			truncated = truncated.slice(0, lastSpace);
		}
	}

	return truncated + suffix;
}

/**
 * Truncates text to a maximum number of words.
 */
export function truncateWords(text: string, maxWords: number, suffix?: string): string {
	const s = suffix ?? '...';
	const words = text.split(/\s+/).filter(Boolean);
	if (words.length <= maxWords) return text;
	return words.slice(0, maxWords).join(' ') + s;
}
