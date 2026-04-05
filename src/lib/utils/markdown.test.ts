import { describe, it, expect } from 'vitest';
import { renderMarkdown, truncateDescription } from './markdown.js';

describe('renderMarkdown', () => {
	it('renders bold text', () => {
		expect(renderMarkdown('**bold**')).toContain('<strong>bold</strong>');
	});

	it('renders italic text', () => {
		expect(renderMarkdown('*italic*')).toContain('<em>italic</em>');
	});

	it('renders inline code', () => {
		expect(renderMarkdown('`code`')).toContain('<code>code</code>');
	});

	it('renders links with proper attributes', () => {
		const result = renderMarkdown('[example](https://example.com)');
		expect(result).toContain('<a href="https://example.com"');
		expect(result).toContain('rel="noopener noreferrer"');
		expect(result).toContain('target="_blank"');
		expect(result).toContain('>example</a>');
	});

	it('renders headings downscaled (# → h3, ## → h4, ### → h5)', () => {
		expect(renderMarkdown('# Heading 1')).toContain('<h3>Heading 1</h3>');
		expect(renderMarkdown('## Heading 2')).toContain('<h4>Heading 2</h4>');
		expect(renderMarkdown('### Heading 3')).toContain('<h5>Heading 3</h5>');
	});

	it('renders unordered list items', () => {
		const result = renderMarkdown('- item 1\n- item 2');
		expect(result).toContain('<ul>');
		expect(result).toContain('<li>item 1</li>');
		expect(result).toContain('<li>item 2</li>');
		expect(result).toContain('</ul>');
	});

	it('renders list items with * marker', () => {
		const result = renderMarkdown('* item A\n* item B');
		expect(result).toContain('<li>item A</li>');
		expect(result).toContain('<li>item B</li>');
	});

	it('escapes HTML to prevent XSS', () => {
		const result = renderMarkdown('<script>alert("xss")</script>');
		expect(result).not.toContain('<script>');
		expect(result).toContain('&lt;script&gt;');
	});

	it('escapes HTML entities in attributes', () => {
		const result = renderMarkdown('<img onerror="alert(1)">');
		expect(result).not.toContain('<img');
		expect(result).toContain('&lt;img');
	});

	it('returns empty string for empty input', () => {
		expect(renderMarkdown('')).toBe('');
	});

	it('handles mixed formatting', () => {
		const result = renderMarkdown('**bold** and *italic* and `code`');
		expect(result).toContain('<strong>bold</strong>');
		expect(result).toContain('<em>italic</em>');
		expect(result).toContain('<code>code</code>');
	});
});

describe('truncateDescription', () => {
	it('returns plain text stripped of markdown', () => {
		expect(truncateDescription('**bold** text')).toBe('bold text');
	});

	it('strips italic markdown', () => {
		expect(truncateDescription('*italic* text')).toBe('italic text');
	});

	it('strips code markdown', () => {
		expect(truncateDescription('`code` here')).toBe('code here');
	});

	it('strips link markdown, keeping text', () => {
		expect(truncateDescription('[click](https://example.com)')).toBe('click');
	});

	it('strips heading markers', () => {
		expect(truncateDescription('# Heading')).toBe('Heading');
	});

	it('strips list markers', () => {
		expect(truncateDescription('- item one\n- item two')).toBe('item one item two');
	});

	it('truncates long text with ellipsis', () => {
		const long = 'a'.repeat(100);
		const result = truncateDescription(long, 80);
		expect(result).toHaveLength(83); // 80 + '...'
		expect(result.endsWith('...')).toBe(true);
	});

	it('does not truncate short text', () => {
		expect(truncateDescription('short')).toBe('short');
	});

	it('returns empty string for empty input', () => {
		expect(truncateDescription('')).toBe('');
	});
});
