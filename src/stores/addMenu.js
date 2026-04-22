/**
 * Global add-element menu state.
 * BookPage writes to this store when the + button is clicked.
 * App.svelte renders the actual menu DOM so it's never clipped by
 * book-page overflow:hidden.
 */
import { writable } from 'svelte/store';

export const addMenu = writable({
    open:     false,
    style:    '',
    onAdd:    null,   // callback(kind) from the originating BookPage
});

export function openAddMenu(style, onAdd) {
    addMenu.set({ open: true, style, onAdd });
}

export function closeAddMenu() {
    addMenu.update((m) => ({ ...m, open: false, onAdd: null }));
}
