import { writable, get } from 'svelte/store';

const STORAGE_EDITOR = 'ficherp_editor_unlocked';
export const EDITOR_PASSWORD = "je t'aime";

export const isEditor = writable(sessionStorage.getItem(STORAGE_EDITOR) === '1');

isEditor.subscribe((val) => {
    if (val) {
        sessionStorage.setItem(STORAGE_EDITOR, '1');
    } else {
        sessionStorage.removeItem(STORAGE_EDITOR);
    }
});

export function unlockEditor() { isEditor.set(true); }
export function lockEditor()   { isEditor.set(false); }
