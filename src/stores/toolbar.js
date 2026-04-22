/**
 * Stores the currently focused Tiptap editor instance.
 * Used to bridge BookPage (deep in tree) → FormatToolbar (sibling in JournalScreen).
 * A writable store works across component boundaries without prop drilling.
 */
import { writable } from 'svelte/store';

export const activeEditor = writable(null);
