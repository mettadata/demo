/**
 * Simple zero-dependency markdown-to-HTML renderer.
 * Escapes HTML first (XSS prevention), then applies markdown patterns.
 */

function escapeHtml(input: string): string {
	return input
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;');
}

export function renderMarkdown(input: string): string {
	if (!input) return '';

	const escaped = escapeHtml(input);
	const lines = escaped.split('\n');
	const outputLines: string[] = [];
	let inList = false;

	for (const line of lines) {
		const trimmed = line.trim();

		// Headings (# → h3, ## → h4, ### → h5 — downscaled for card context)
		const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
		if (headingMatch) {
			if (inList) {
				outputLines.push('</ul>');
				inList = false;
			}
			const level = headingMatch[1].length + 2; // 1→3, 2→4, 3→5
			outputLines.push(`<h${level}>${applyInlineFormatting(headingMatch[2])}</h${level}>`);
			continue;
		}

		// List items (- item or * item)
		const listMatch = trimmed.match(/^[-*]\s+(.+)$/);
		if (listMatch) {
			if (!inList) {
				outputLines.push('<ul>');
				inList = true;
			}
			outputLines.push(`<li>${applyInlineFormatting(listMatch[1])}</li>`);
			continue;
		}

		// Close list if we hit a non-list line
		if (inList) {
			outputLines.push('</ul>');
			inList = false;
		}

		// Empty line
		if (trimmed === '') {
			outputLines.push('<br>');
			continue;
		}

		// Regular text line
		outputLines.push(applyInlineFormatting(trimmed));
	}

	if (inList) {
		outputLines.push('</ul>');
	}

	return outputLines.join('\n');
}

function applyInlineFormatting(text: string): string {
	let result = text;

	// Bold: **text**
	result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

	// Italic: *text* (but not inside bold tags)
	result = result.replace(/\*(.+?)\*/g, '<em>$1</em>');

	// Inline code: `code`
	result = result.replace(/`(.+?)`/g, '<code>$1</code>');

	// Links: [text](url)
	result = result.replace(
		/\[(.+?)\]\((.+?)\)/g,
		'<a href="$2" rel="noopener noreferrer" target="_blank">$1</a>'
	);

	return result;
}

/**
 * Strip markdown syntax and return plain text, truncated to maxLength.
 */
export function truncateDescription(input: string, maxLength = 80): string {
	if (!input) return '';

	let plain = input;

	// Strip markdown syntax
	plain = plain.replace(/\*\*(.+?)\*\*/g, '$1'); // bold
	plain = plain.replace(/\*(.+?)\*/g, '$1'); // italic
	plain = plain.replace(/`(.+?)`/g, '$1'); // code
	plain = plain.replace(/\[(.+?)\]\(.+?\)/g, '$1'); // links
	plain = plain.replace(/^#{1,3}\s+/gm, ''); // headings
	plain = plain.replace(/^[-*]\s+/gm, ''); // list markers
	plain = plain.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();

	if (plain.length <= maxLength) return plain;
	return plain.slice(0, maxLength) + '...';
}
