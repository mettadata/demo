/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

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

import { render, screen, cleanup } from '@testing-library/svelte';
import { afterEach } from 'vitest';
import ShortcutsHelpModal from '../ShortcutsHelpModal.svelte';

afterEach(() => {
	cleanup();
});

beforeEach(() => {
	localStorageMock.clear();
});

describe('ShortcutsHelpModal', () => {
	it('does not render when open is false', () => {
		render(ShortcutsHelpModal, { props: { open: false } });
		expect(screen.queryByRole('dialog')).toBeNull();
	});

	it('renders the dialog when open is true', () => {
		render(ShortcutsHelpModal, { props: { open: true } });
		const dialog = screen.getByRole('dialog');
		expect(dialog).toBeTruthy();
		expect(dialog.getAttribute('aria-label')).toBe('Keyboard shortcuts');
		expect(dialog.getAttribute('aria-modal')).toBe('true');
	});

	it('displays the title', () => {
		render(ShortcutsHelpModal, { props: { open: true } });
		expect(screen.getByText('Keyboard Shortcuts')).toBeTruthy();
	});

	it('displays all shortcut group headings', () => {
		render(ShortcutsHelpModal, { props: { open: true } });
		const expectedGroups = [
			'Global',
			'Todo Input',
			'Kanban Card',
			'Column Title Edit',
			'Label Editing',
			'Add Column Input'
		];
		for (const group of expectedGroups) {
			expect(screen.getByText(group)).toBeTruthy();
		}
	});

	it('displays shortcut descriptions', () => {
		render(ShortcutsHelpModal, { props: { open: true } });
		expect(screen.getByText('Undo')).toBeTruthy();
		expect(screen.getByText('Redo')).toBeTruthy();
		expect(screen.getByText('Open shortcuts help')).toBeTruthy();
		expect(screen.getByText('Add new todo')).toBeTruthy();
		expect(screen.getByText('Cancel move')).toBeTruthy();
	});

	it('renders kbd elements for shortcut keys', () => {
		render(ShortcutsHelpModal, { props: { open: true } });
		const dialog = screen.getByRole('dialog');
		const kbdElements = dialog.querySelectorAll('kbd');
		expect(kbdElements.length).toBeGreaterThan(0);
		const kbdTexts = Array.from(kbdElements).map((el) => el.textContent?.trim());
		expect(kbdTexts).toContain('Ctrl+Z');
		expect(kbdTexts).toContain('Cmd+Z');
	});

	it('has a close button with correct aria-label', () => {
		render(ShortcutsHelpModal, { props: { open: true } });
		const closeBtn = screen.getByLabelText('Close shortcuts help');
		expect(closeBtn).toBeTruthy();
	});

	it('shows both Ctrl and Cmd variants for undo and redo', () => {
		render(ShortcutsHelpModal, { props: { open: true } });
		const dialog = screen.getByRole('dialog');
		const kbdElements = dialog.querySelectorAll('kbd');
		const kbdTexts = Array.from(kbdElements).map((el) => el.textContent?.trim());
		expect(kbdTexts).toContain('Ctrl+Z');
		expect(kbdTexts).toContain('Cmd+Z');
		expect(kbdTexts).toContain('Ctrl+Shift+Z');
		expect(kbdTexts).toContain('Cmd+Shift+Z');
	});
});
