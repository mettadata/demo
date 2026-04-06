/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

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

import { render, screen, cleanup, fireEvent } from '@testing-library/svelte';
import BoardTemplateSelector from '../BoardTemplateSelector.svelte';

afterEach(() => {
	cleanup();
});

beforeEach(() => {
	localStorageMock.clear();
});

describe('BoardTemplateSelector', () => {
	it('renders the dialog with correct ARIA attributes', () => {
		const onselect = vi.fn();
		const ondismiss = vi.fn();
		render(BoardTemplateSelector, { props: { onselect, ondismiss } });

		const dialog = screen.getByRole('dialog');
		expect(dialog).toBeTruthy();
		expect(dialog.getAttribute('aria-modal')).toBe('true');
		expect(dialog.getAttribute('aria-label')).toBe('Choose a board template');
	});

	it('displays all three template names', () => {
		const onselect = vi.fn();
		const ondismiss = vi.fn();
		render(BoardTemplateSelector, { props: { onselect, ondismiss } });

		expect(screen.getByText('Kanban')).toBeTruthy();
		expect(screen.getByText('Scrum')).toBeTruthy();
		expect(screen.getByText('Personal')).toBeTruthy();
	});

	it('displays template descriptions', () => {
		const onselect = vi.fn();
		const ondismiss = vi.fn();
		render(BoardTemplateSelector, { props: { onselect, ondismiss } });

		expect(screen.getByText('Classic workflow for continuous delivery')).toBeTruthy();
		expect(screen.getByText('Sprint-based agile development workflow')).toBeTruthy();
		expect(screen.getByText('Daily planning and personal task management')).toBeTruthy();
	});

	it('has three "Use this template" buttons', () => {
		const onselect = vi.fn();
		const ondismiss = vi.fn();
		render(BoardTemplateSelector, { props: { onselect, ondismiss } });

		const buttons = screen.getAllByText('Use this template');
		expect(buttons).toHaveLength(3);
	});

	it('calls onselect with template key when button is clicked', async () => {
		const onselect = vi.fn();
		const ondismiss = vi.fn();
		render(BoardTemplateSelector, { props: { onselect, ondismiss } });

		const buttons = screen.getAllByText('Use this template');
		await fireEvent.click(buttons[0]);
		expect(onselect).toHaveBeenCalledWith('kanban');

		await fireEvent.click(buttons[1]);
		expect(onselect).toHaveBeenCalledWith('scrum');

		await fireEvent.click(buttons[2]);
		expect(onselect).toHaveBeenCalledWith('personal');
	});

	it('has a "Skip for now" button that calls ondismiss', async () => {
		const onselect = vi.fn();
		const ondismiss = vi.fn();
		render(BoardTemplateSelector, { props: { onselect, ondismiss } });

		const skipBtn = screen.getByText('Skip for now');
		expect(skipBtn).toBeTruthy();
		await fireEvent.click(skipBtn);
		expect(ondismiss).toHaveBeenCalled();
	});

	it('calls ondismiss on Escape key', async () => {
		const onselect = vi.fn();
		const ondismiss = vi.fn();
		render(BoardTemplateSelector, { props: { onselect, ondismiss } });

		await fireEvent.keyDown(window, { key: 'Escape' });
		expect(ondismiss).toHaveBeenCalled();
	});

	it('displays column titles for each template', () => {
		const onselect = vi.fn();
		const ondismiss = vi.fn();
		render(BoardTemplateSelector, { props: { onselect, ondismiss } });

		// Check some column titles from each template
		expect(screen.getByText('Backlog')).toBeTruthy();
		expect(screen.getByText('Sprint Backlog')).toBeTruthy();
		expect(screen.getByText('Ideas')).toBeTruthy();
	});
});
