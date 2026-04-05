import { writable, derived } from 'svelte/store';
import type { Writable, Readable } from 'svelte/store';

export interface Label {
  id: string;
  name: string;
  color: LabelColor;
}

export type LabelColor = 'red' | 'orange' | 'amber' | 'green' | 'teal' | 'blue' | 'purple' | 'pink';

export const LABEL_COLORS: LabelColor[] = ['red', 'orange', 'amber', 'green', 'teal', 'blue', 'purple', 'pink'];

export const LABEL_COLOR_CLASSES: Record<LabelColor, { bg: string; text: string; darkBg: string; darkText: string }> = {
  red:    { bg: 'bg-red-100',    text: 'text-red-700',    darkBg: 'dark:bg-red-900',    darkText: 'dark:text-red-300' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-700', darkBg: 'dark:bg-orange-900', darkText: 'dark:text-orange-300' },
  amber:  { bg: 'bg-amber-100',  text: 'text-amber-700',  darkBg: 'dark:bg-amber-900',  darkText: 'dark:text-amber-300' },
  green:  { bg: 'bg-green-100',  text: 'text-green-700',  darkBg: 'dark:bg-green-900',  darkText: 'dark:text-green-300' },
  teal:   { bg: 'bg-teal-100',   text: 'text-teal-700',   darkBg: 'dark:bg-teal-900',   darkText: 'dark:text-teal-300' },
  blue:   { bg: 'bg-blue-100',   text: 'text-blue-700',   darkBg: 'dark:bg-blue-900',   darkText: 'dark:text-blue-300' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-700', darkBg: 'dark:bg-purple-900', darkText: 'dark:text-purple-300' },
  pink:   { bg: 'bg-pink-100',   text: 'text-pink-700',   darkBg: 'dark:bg-pink-900',   darkText: 'dark:text-pink-300' },
};

export const LABELS_STORAGE_KEY = 'labels';

function loadLabels(): Label[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LABELS_STORAGE_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Label[];
  } catch { return []; }
}

export const labels: Writable<Label[]> = writable<Label[]>(loadLabels());

labels.subscribe((value) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(LABELS_STORAGE_KEY, JSON.stringify(value)); }
  catch { console.warn('Failed to persist labels'); }
});

export function addLabel(name: string, color: LabelColor): string {
  const id = crypto.randomUUID();
  labels.update((current) => [...current, { id, name: name.trim(), color }]);
  return id;
}

export function updateLabel(id: string, fields: Partial<Pick<Label, 'name' | 'color'>>): void {
  labels.update((current) =>
    current.map((l) => (l.id === id ? { ...l, ...fields } : l))
  );
}

export function removeLabel(id: string): void {
  labels.update((current) => current.filter((l) => l.id !== id));
}

// Helper to get labels by IDs
export function getLabelsByIds(allLabels: Label[], ids: string[]): Label[] {
  const map = new Map(allLabels.map(l => [l.id, l]));
  return ids.map(id => map.get(id)).filter((l): l is Label => l !== undefined);
}
