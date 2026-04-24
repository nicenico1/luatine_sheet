/**
 * Save / load logic for the fiche RP.
 *
 * Data format v4:
 *   { version: 4, fields: { id: { fr, en } }, journalPages, journalPagesFR, journalPagesEN,
 *     images: [], stepperVals: [], attrPoints, skillPoints, lang }
 *
 * Load priority: data/fiche-export.json → Firebase → localStorage
 */
import { saveToFirebase, loadFromFirebase, isFirebaseReady } from './firebase.js';

const STORAGE_KEY = 'ficherp_save_v3';

// ─── security helpers ───────────────────────────────────────────────────────

export function sanitizeHTML(dirty) {
    const doc = new DOMParser().parseFromString(dirty, 'text/html');
    doc.querySelectorAll('script, style, iframe, object, embed, link[rel="import"], meta, form').forEach(
        (el) => el.remove()
    );
    doc.querySelectorAll('*').forEach((el) => {
        for (const attr of Array.from(el.attributes)) {
            const name = attr.name.toLowerCase();
            const val  = (attr.value ?? '').trim().toLowerCase();
            if (name.startsWith('on') || val.startsWith('javascript:') || val.startsWith('data:text')) {
                el.removeAttribute(attr.name);
            }
        }
    });
    return doc.body.innerHTML;
}

export function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const t = url.trim().toLowerCase();
    return !t.startsWith('javascript:') && !t.startsWith('data:text');
}

// ─── debounce ───────────────────────────────────────────────────────────────

export function debounce(fn, ms) {
    let t;
    return function (...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), ms);
    };
}

// ─── save ───────────────────────────────────────────────────────────────────

export function persistSnapshot(snapshot) {
    // Stamp the snapshot so loadSnapshot can compare freshness across sources.
    snapshot.savedAt = Date.now();
    // Firebase — fire immediately (the 600 ms app-level debounce already batches
    // rapid edits; a separate Firebase debounce only adds dangerous lag that causes
    // cross-browser data loss when another client loads before the write completes).
    try { if (isFirebaseReady()) saveToFirebase(snapshot); } catch { /* ignore */ }

    // localStorage fallback
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (e) {
        if (e?.name === 'QuotaExceededError') {
            try {
                const lite = { ...snapshot };
                delete lite.journalPages;
                delete lite.journalPagesFR;
                delete lite.journalPagesEN;
                localStorage.setItem(STORAGE_KEY, JSON.stringify(lite));
                console.warn('[FicheRP] localStorage quota — pages omitted');
            } catch { /* ignore */ }
        }
    }
}

// ─── load ───────────────────────────────────────────────────────────────────

export async function loadSnapshot() {
    let data = null;

    // 1. Static JSON committed to repo
    try {
        const r = await fetch('data/fiche-export.json', { cache: 'no-store' });
        if (r.ok) {
            const json = await r.json();
            if (json?.version >= 2) data = json;
        }
    } catch { /* file:// or not found */ }

    // 2. Firebase — best source when available; loaded data is held tentatively
    //    so step 3 can still override it if localStorage is fresher.
    if (isFirebaseReady()) {
        try {
            const cloud = await loadFromFirebase();
            if (cloud?.version >= 2) {
                const cloudHasJournal =
                    (Array.isArray(cloud.journalPagesFR) && cloud.journalPagesFR.length > 0) ||
                    (Array.isArray(cloud.journalPages)   && cloud.journalPages.length   > 0) ||
                    (typeof cloud.journalHTML === 'string' && cloud.journalHTML.trim().length > 0);

                if (cloudHasJournal) {
                    data = cloud;
                } else {
                    // Cloud only has metadata (fields, images) — merge over static JSON
                    // but KEEP the static journal pages
                    data = {
                        ...data,           // static JSON (has journalHTML / journalPages)
                        ...cloud,          // cloud fields/images/meta override
                        // Preserve journal from static if cloud has none
                        journalPages: (data?.journalPages?.length > 0) ? data.journalPages : cloud.journalPages,
                        journalHTML:  cloud.journalHTML ?? data?.journalHTML,
                    };
                }
            }
        } catch (e) {
            console.warn('[FicheRP] Firebase load failed, falling back', e);
        }
    }

    // 3. localStorage — wins when it carries a newer savedAt timestamp than Firebase.
    //    If Firebase save failed entirely, localStorage stays the most recent source.
    try {
        const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem('ficherp_save_v2');
        if (raw) {
            const local = JSON.parse(raw);
            if (local?.version >= 2) {
                const localNewer = (local.savedAt ?? 0) > (data?.savedAt ?? 0);
                if (!data || localNewer) data = local;
            }
        }
    } catch { /* ignore */ }

    return data;
}
