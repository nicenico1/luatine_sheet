/**
 * Firebase persistence — Fiche RP
 *
 * Replaces the old firebase-sync.js global IIFE.
 * Uses the modular Firebase v10 SDK (tree-shakeable).
 */
import { initializeApp, getApps } from 'firebase/app';
import {
    getFirestore,
    doc,
    getDoc,
    setDoc,
    collection,
    getDocs,
    writeBatch,
    serverTimestamp,
    deleteField,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import { writable } from 'svelte/store';

// Inline the config (same values as firebase-config.js)
const FIREBASE_CONFIG = {
    apiKey:            "AIzaSyCq99-iJDE-nZJKvo8d0oRj8v5xTeY5134",
    authDomain:        "luatine-sheet.firebaseapp.com",
    projectId:         "luatine-sheet",
    storageBucket:     "luatine-sheet.firebasestorage.app",
    messagingSenderId: "679591300034",
    appId:             "1:679591300034:web:f3168ead48ec0cf0d2e45b",
};

const COLLECTION = 'sheets';
const DOC_ID     = 'lua-tyler';

/** 'idle' | 'syncing' | 'synced' | 'error' | 'unconfigured' */
export const syncStatus = writable('unconfigured');

let db   = null;
let stor = null;

function isConfigured() {
    return !!(FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.projectId);
}

export function initFirebase() {
    if (!isConfigured()) {
        syncStatus.set('unconfigured');
        return false;
    }
    try {
        const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
        db   = getFirestore(app);
        stor = getStorage(app);
        syncStatus.set('idle');
        return true;
    } catch (e) {
        console.error('[FicheRP] Firebase init error', e);
        syncStatus.set('error');
        return false;
    }
}

export function isFirebaseReady() {
    return db !== null;
}

// ─── helpers ───────────────────────────────────────────────────────────────

const PAGE_COL_ACTIVE = 'pages';
const PAGE_COL_FR = 'pages_fr';
const PAGE_COL_EN = 'pages_en';

/**
 * Read ordered { order, html }[] from a pages subcollection.
 * @param {import('firebase/firestore').CollectionReference} colRef
 */
async function readPagesCollection(colRef) {
    const snap = await getDocs(colRef);
    if (snap.empty) return [];
    return snap.docs
        .slice()
        .sort((a, b) => (a.data().order ?? 0) - (b.data().order ?? 0))
        .map((d) => ({ order: d.data().order, html: d.data().html ?? '' }));
}

/**
 * Replace a journal subcollection with the given pages (batch delete + write).
 * @param {import('firebase/firestore').DocumentReference} sheetRef
 * @param {string} colId
 * @param {{ order?: number; html?: string }[]} pages
 */
async function syncJournalSubcollection(sheetRef, colId, pages) {
    const col = collection(sheetRef, colId);
    const existingSnap = await getDocs(col);
    const toDelete = existingSnap.docs;
    for (let i = 0; i < toDelete.length; i += 400) {
        const batch = writeBatch(db);
        toDelete.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
        await batch.commit();
    }
    if (!Array.isArray(pages) || pages.length === 0) return;
    for (let j = 0; j < pages.length; j += 400) {
        const batch = writeBatch(db);
        pages.slice(j, j + 400).forEach((p, k) => {
            const idx = j + k;
            const pageRef = doc(col, `p${String(idx).padStart(4, '0')}`);
            batch.set(pageRef, {
                order: typeof p.order === 'number' ? p.order : idx,
                html:  p.html ?? '',
                updatedAt: serverTimestamp(),
            });
        });
        await batch.commit();
    }
}

function splitJournalHTMLIntoPages(html) {
    if (!html || typeof html !== 'string') return [];
    try {
        const wrap = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
        const root = wrap.querySelector('div');
        return Array.from(root?.querySelectorAll('.book-spread') ?? []).map((s, i) => ({
            order: i,
            html: s.outerHTML,
        }));
    } catch {
        return [];
    }
}

// ─── save ──────────────────────────────────────────────────────────────────

export async function saveToFirebase(snapshot) {
    if (!db) return false;
    syncStatus.set('syncing');
    try {
        const pages = Array.isArray(snapshot.journalPages) ? snapshot.journalPages : [];
        const skipPages = pages.length === 0;
        if (skipPages) {
            console.warn('[FicheRP] Empty pages — saving metadata only (data-loss guard).');
        }

        const sheetRef = doc(db, COLLECTION, DOC_ID);
        const parent = {
            version:     4,
            fields:      snapshot.fields ?? {},
            images:      snapshot.images ?? [],
            stepperVals: snapshot.stepperVals ?? [],
            attrPoints:  snapshot.attrPoints ?? '8',
            skillPoints: snapshot.skillPoints ?? '10',
            updatedAt:   serverTimestamp(),
            journalHTML: deleteField(),
        };
        if (snapshot.lang) parent.lang = snapshot.lang;
        await setDoc(sheetRef, parent, { merge: true });

        if (!skipPages) {
            // Active UI language (compat / readers expecting `pages`)
            await syncJournalSubcollection(sheetRef, PAGE_COL_ACTIVE, pages);
            // Bilingual copies — only write a subcollection when we have content.
            // Never call syncJournalSubcollection with [] when the buffer is empty:
            // that would batch-delete Firestore data that failed to load (e.g. network
            // error on startup left journalPagesEN = []), permanently wiping EN content.
            const fr = Array.isArray(snapshot.journalPagesFR) ? snapshot.journalPagesFR : [];
            const en = Array.isArray(snapshot.journalPagesEN) ? snapshot.journalPagesEN : [];
            if (fr.length > 0) {
                await syncJournalSubcollection(sheetRef, PAGE_COL_FR, fr);
            }
            if (en.length > 0) {
                await syncJournalSubcollection(sheetRef, PAGE_COL_EN, en);
            }
        }

        syncStatus.set('synced');
        // Fade back to idle after 3 s
        setTimeout(() => syncStatus.set('idle'), 3000);
        return true;
    } catch (e) {
        console.error('[FicheRP] Firestore save error', e);
        syncStatus.set('error');
        return false;
    }
}

// ─── load ──────────────────────────────────────────────────────────────────

export async function loadFromFirebase() {
    if (!db) return null;
    try {
        const sheetRef  = doc(db, COLLECTION, DOC_ID);
        const snap      = await getDoc(sheetRef);
        if (!snap.exists()) return null;

        const data = { ...snap.data() };
        delete data.updatedAt;

        const pagesSnap = await getDocs(collection(sheetRef, PAGE_COL_ACTIVE));
        if (!pagesSnap.empty) {
            data.journalPages = pagesSnap.docs
                .slice()
                .sort((a, b) => (a.data().order ?? 0) - (b.data().order ?? 0))
                .map((d) => ({ order: d.data().order, html: d.data().html ?? '' }));
        } else if (data.journalHTML) {
            data.journalPages = splitJournalHTMLIntoPages(data.journalHTML);
        } else {
            data.journalPages = [];
        }

        const frPages = await readPagesCollection(collection(sheetRef, PAGE_COL_FR));
        const enPages = await readPagesCollection(collection(sheetRef, PAGE_COL_EN));
        if (frPages.length > 0) {
            data.journalPagesFR = frPages;
        }
        if (enPages.length > 0) {
            data.journalPagesEN = enPages;
        }
        // Legacy cloud: only `pages` existed — treat as FR source when no pages_fr
        if (frPages.length === 0 && data.journalPages?.length > 0 && !data.journalPagesFR) {
            data.journalPagesFR = data.journalPages;
        }

        if (data.journalHTML) delete data.journalHTML;
        data.version = 4;
        return data;
    } catch (e) {
        console.error('[FicheRP] Firestore load error', e);
        return null;
    }
}

// ─── image upload ──────────────────────────────────────────────────────────

export async function uploadImageToFirebase(file) {
    if (!stor) return null;
    try {
        const ext  = (file.name || 'img.png').split('.').pop() || 'png';
        const path = `images/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const ref  = storageRef(stor, path);
        const res  = await uploadBytes(ref, file);
        return await getDownloadURL(res.ref);
    } catch (e) {
        console.error('[FicheRP] Storage upload error', e);
        return null;
    }
}
