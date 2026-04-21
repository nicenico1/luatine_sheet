/**
 * Fiche RP — mot de passe mode éditeur (modifiable ici).
 * Sauvegarde : localStorage + export JSON pour GitHub Pages (voir data/fiche-export.json).
 *
 * v3 : sauvegarde par data-field-id (robuste), HTML sanitisé, modales custom.
 */
const FICHE_RP_EDITOR_PASSWORD = "je t'aime";

const STORAGE_EDITOR = 'ficherp_editor_unlocked';
const STORAGE_SAVE_V2 = 'ficherp_save_v2';
const STORAGE_SAVE_V3 = 'ficherp_save_v3';

let isEditorMode = false;
let editableNodes = [];

/* ─── Utilitaires ─── */

function debounce(fn, ms) {
    let t;
    return function debounced(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), ms);
    };
}

/**
 * Sanitise un fragment HTML : supprime <script>, on*, javascript:, data:text etc.
 */
function sanitizeHTML(dirty) {
    const doc = new DOMParser().parseFromString(dirty, 'text/html');
    doc.querySelectorAll('script, style, iframe, object, embed, link[rel="import"], meta, form').forEach(el => el.remove());
    doc.querySelectorAll('*').forEach(el => {
        for (const attr of Array.from(el.attributes)) {
            const name = attr.name.toLowerCase();
            const val = (attr.value || '').trim().toLowerCase();
            if (name.startsWith('on') || val.startsWith('javascript:') || val.startsWith('data:text')) {
                el.removeAttribute(attr.name);
            }
        }
    });
    return doc.body.innerHTML;
}

/**
 * Valide qu'une URL d'image est raisonnablement sûre.
 */
function isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    const trimmed = url.trim().toLowerCase();
    if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:text')) return false;
    return true;
}

/* ─── Modal custom (remplace prompt / alert / confirm) ─── */

function ficheModal({ message, input = false, defaultValue = '', confirmOnly = false }) {
    return new Promise((resolve) => {
        const overlay = document.getElementById('fiche-modal');
        const msgEl = overlay.querySelector('.fiche-modal-message');
        const inputEl = overlay.querySelector('.fiche-modal-input');
        const okBtn = overlay.querySelector('.fiche-modal-ok');
        const cancelBtn = overlay.querySelector('.fiche-modal-cancel');

        msgEl.textContent = message;

        if (input) {
            inputEl.classList.remove('hidden');
            inputEl.value = defaultValue;
            inputEl.type = message.toLowerCase().includes('mot de passe') || message.toLowerCase().includes('password') ? 'password' : 'text';
        } else {
            inputEl.classList.add('hidden');
        }

        if (confirmOnly) {
            cancelBtn.classList.add('hidden');
        } else {
            cancelBtn.classList.remove('hidden');
        }

        overlay.classList.remove('hidden');
        if (input) {
            inputEl.focus();
        } else {
            okBtn.focus();
        }

        function cleanup() {
            overlay.classList.add('hidden');
            okBtn.removeEventListener('click', onOk);
            cancelBtn.removeEventListener('click', onCancel);
            inputEl.removeEventListener('keydown', onKey);
            overlay.removeEventListener('click', onBackdrop);
        }

        function onOk() {
            cleanup();
            resolve(input ? inputEl.value : true);
        }

        function onCancel() {
            cleanup();
            resolve(input ? null : false);
        }

        function onKey(e) {
            if (e.key === 'Enter') onOk();
            if (e.key === 'Escape') onCancel();
        }

        function onBackdrop(e) {
            if (e.target === overlay) onCancel();
        }

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        inputEl.addEventListener('keydown', onKey);
        overlay.addEventListener('click', onBackdrop);
    });
}

/* ─── Main ─── */

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.applyLanguage === 'function' && typeof window.getLang === 'function') {
        window.applyLanguage(window.getLang());
    }

    /** Langue : changement sans rechargement de page. */
    function wireLangSwitcher() {
        const root = document.getElementById('lang-switcher');
        if (!root) return;
        root.addEventListener('click', (e) => {
            const t = e.target.closest('[data-lang]');
            if (!t) return;
            const lang = t.getAttribute('data-lang');
            if (!lang || (typeof window.getLang === 'function' && lang === window.getLang())) return;
            if (typeof window.setLang === 'function') window.setLang(lang);
            if (typeof window.applyLanguage === 'function') window.applyLanguage(lang);
            try {
                persistToLocalStorage();
            } catch (_) { /* ignore */ }
        });
    }

    const splashScreen = document.getElementById('splash-screen');
    const charSelectScreen = document.getElementById('char-select-screen');
    const charBioScreen = document.getElementById('char-bio-screen');
    const journalScreen = document.getElementById('journal-screen');

    const selectLuaCard = document.getElementById('select-lua');
    const btnRetourSelect = document.getElementById('btn-retour-select');
    const btnRetourCharSelect = document.getElementById('btn-retour-char-select');
    const btnNextJournal = document.getElementById('btn-next-journal');
    const btnRetourDossier = document.getElementById('btn-retour-dossier');
    const btnAddJournalEntry = document.getElementById('btn-add-journal-entry');
    const journalEntriesEl = document.getElementById('journal-entries');
    const journalEntryTemplate = document.getElementById('journal-entry-template');

    const navBtns = document.querySelectorAll('.nav-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    const btnUnlockEditor = document.getElementById('btn-unlock-editor');
    const editorBar = document.getElementById('editor-bar');
    const btnLockEditor = document.getElementById('btn-lock-editor');
    const btnExportFiche = document.getElementById('btn-export-fiche');
    const btnImportFiche = document.getElementById('btn-import-fiche');
    const inputImportFiche = document.getElementById('input-import-fiche');

    /* ─── Sauvegarde v3 : par data-field-id (robuste) ─── */

    function collectSaveSnapshot() {
        syncFicheEditableRegistry();

        const fields = {};
        document.querySelectorAll('[data-field-id]').forEach((el) => {
            fields[el.getAttribute('data-field-id')] = el.innerHTML;
        });

        const images = Array.from(document.querySelectorAll('.editable-image')).map(
            (img) => img.getAttribute('src') || ''
        );
        const stepperVals = Array.from(document.querySelectorAll('.stepper-value')).map((el) =>
            el.textContent.trim()
        );

        // Nettoyer les images en base64 du HTML du journal avant de sauvegarder
        // (elles sont déjà sauvegardées dans le tableau images[] et restaurées par applySaveSnapshot)
        let cleanJournalHTML = '';
        if (journalEntriesEl) {
            const clone = journalEntriesEl.cloneNode(true);
            // Nuke all img src attributes entirely - they'll be restored from images[] array
            clone.querySelectorAll('img').forEach(img => {
                img.removeAttribute('src');
                img.removeAttribute('srcset');
            });
            // Strip any inline styles that may contain data: URIs (background-image, etc.)
            clone.querySelectorAll('[style]').forEach(el => {
                const style = el.getAttribute('style') || '';
                if (style.includes('data:') || style.includes('base64')) {
                    el.removeAttribute('style');
                }
            });
            // Remove any element with a data-* attribute containing base64
            clone.querySelectorAll('*').forEach(el => {
                Array.from(el.attributes).forEach(attr => {
                    if (attr.value && (attr.value.includes('data:image') || attr.value.length > 10000)) {
                        el.removeAttribute(attr.name);
                    }
                });
            });
            cleanJournalHTML = clone.innerHTML;
            // Filet de sécurité ultime : strip tout ce qui pourrait rester
            cleanJournalHTML = cleanJournalHTML.replace(/data:image[^"'\s)>]+/gi, '');
            cleanJournalHTML = cleanJournalHTML.replace(/data:application[^"'\s)>]+/gi, '');
            console.log('[FicheRP] journalHTML size:', cleanJournalHTML.length, 'bytes');
            if (cleanJournalHTML.length > 500000) {
                console.warn('[FicheRP] journalHTML still huge! Sample:', cleanJournalHTML.substring(0, 2000));
                console.warn('[FicheRP] Longest chunk:', cleanJournalHTML.split(/\s/).reduce((a, b) => a.length > b.length ? a : b).substring(0, 500));
            }
        }

        // Nettoyer aussi les champs (au cas où un base64 serait collé ailleurs)
        Object.keys(fields).forEach(k => {
            if (fields[k] && (fields[k].includes('data:image') || fields[k].length > 100000)) {
                fields[k] = fields[k].replace(/data:image[^"'\s)>]+/gi, '');
                fields[k] = fields[k].replace(/src\s*=\s*"[^"]{10000,}"/gi, 'src=""');
            }
        });

        return {
            version: 3,
            fields,
            journalHTML: cleanJournalHTML,
            images,
            stepperVals,
            attrPoints: document.getElementById('attr-points-num')?.textContent?.trim() ?? '8',
            skillPoints: document.getElementById('skill-points-num')?.textContent?.trim() ?? '10',
        };
    }

    function migrateBookPageNums() {
        if (!journalEntriesEl) return;
        journalEntriesEl.querySelectorAll('.book-page').forEach((page) => {
            const inner = page.querySelector(':scope > .book-page-inner');
            if (!inner) return;
            const nested = inner.querySelector(':scope > .book-page-num');
            if (nested) {
                page.appendChild(nested);
            }
        });
    }

    /**
     * Restaure l'editabilité des éléments cassés par le parseur HTML.
     *
     * Chrome, quand on appuie sur Enter à l'intérieur d'un <p contenteditable>,
     * insère un <div>. Sérialisé via innerHTML puis re-parsé, le <p> se ferme
     * avant le <div>, qui devient un SIBLING du <p>. Le texte se retrouve
     * ainsi dans des <div>/<span> orphelins non-editables, et l'utilisateur
     * ne peut plus cliquer dessus pour modifier.
     *
     * Fix pragmatique : pour chaque enfant direct de .book-page-inner qui
     * porte du texte mais n'est pas "structuré" (photo, titre, légende,
     * divider, toolbar, etc.), on pose contenteditable="true" et la classe
     * book-text/fiche-editable si besoin. L'utilisateur peut ainsi recliquer
     * et éditer, peu importe comment le parseur a réorganisé le DOM.
     */
    function migrateBrokenEditableParagraphs() {
        if (!journalEntriesEl) return;
        const STRUCTURED_CLASSES = [
            'book-heading', 'book-caption', 'book-label', 'book-divider',
            'book-id-grid', 'combine-emblem', 'book-decoration',
            'photo-taped', 'scrap-row', 'book-page-num',
            'element-tools', 'page-add-btn',
        ];
        const STRUCTURED_TAGS = new Set(['FIGURE', 'HR', 'BUTTON', 'IMG', 'SVG']);
        const hasStructuredClass = (el) => {
            if (!el.classList) return false;
            for (const c of STRUCTURED_CLASSES) if (el.classList.contains(c)) return true;
            return false;
        };
        journalEntriesEl.querySelectorAll('.book-page-inner').forEach((inner) => {
            Array.from(inner.children).forEach((child) => {
                if (!child || child.nodeType !== 1) return;
                if (STRUCTURED_TAGS.has(child.tagName)) return;
                if (hasStructuredClass(child)) return;
                // Déjà éditable : rien à faire
                if (child.getAttribute('contenteditable') === 'true') return;
                // S'il ne porte aucun texte ET aucun enfant descriptif, on
                // laisse tel quel (p.ex. un <p></p> vraiment vide).
                const hasText = (child.textContent || '').trim().length > 0;
                if (!hasText) return;
                // Promeut en zone éditable
                child.setAttribute('contenteditable', 'true');
                child.classList.add('fiche-editable');
                if (!child.classList.contains('book-text')) {
                    child.classList.add('book-text', 'book-text--body');
                }
            });
        });
    }

    function applySaveSnapshot(data) {
        if (!data) return;

        if (data.version === 3) {
            if (data.fields) {
                Object.entries(data.fields).forEach(([id, html]) => {
                    const el = document.querySelector(`[data-field-id="${CSS.escape(id)}"]`);
                    if (el) el.innerHTML = sanitizeHTML(html);
                });
            }
            if (journalEntriesEl && typeof data.journalHTML === 'string') {
                journalEntriesEl.innerHTML = sanitizeHTML(data.journalHTML);
                migrateBookPageNums();
                migrateBrokenEditableParagraphs();
            }
        } else if (data.version === 2) {
            // Legacy v2 : rétro-compatibilité par index
            if (journalEntriesEl && typeof data.journalHTML === 'string') {
                journalEntriesEl.innerHTML = sanitizeHTML(data.journalHTML);
                migrateBookPageNums();
                migrateBrokenEditableParagraphs();
            }
            syncFicheEditableRegistry();
            const outside = editableNodes.filter((el) => !journalEntriesEl?.contains(el));
            data.textsOutside?.forEach((html, i) => {
                if (outside[i]) outside[i].innerHTML = sanitizeHTML(html);
            });
        } else {
            return;
        }

        const imgs = Array.from(document.querySelectorAll('.editable-image'));
        data.images?.forEach((src, i) => {
            if (isValidImageUrl(src) && imgs[i]) imgs[i].src = src;
        });

        const steppers = Array.from(document.querySelectorAll('.stepper-value'));
        data.stepperVals?.forEach((v, i) => {
            if (steppers[i]) steppers[i].textContent = v;
        });

        const an = document.getElementById('attr-points-num');
        const sn = document.getElementById('skill-points-num');
        if (an && data.attrPoints != null) an.textContent = data.attrPoints;
        if (sn && data.skillPoints != null) sn.textContent = data.skillPoints;
    }

    function persistToLocalStorage() {
        try {
            var snapshot = collectSaveSnapshot();
            localStorage.setItem(STORAGE_SAVE_V3, JSON.stringify(snapshot));
            firebaseSaveDebounced(snapshot);
        } catch (e) {
            console.warn('Sauvegarde locale impossible', e);
        }
    }

    const firebaseSaveDebounced = debounce(function (snapshot) {
        if (typeof isFirebaseReady === 'function' && isFirebaseReady() && typeof saveToFirebase === 'function') {
            saveToFirebase(snapshot);
        }
    }, 2000);

    const persistDebounced = debounce(persistToLocalStorage, 600);

    wireLangSwitcher();

    async function loadSavedData() {
        // 1. Baseline from static JSON (committed to repo)
        try {
            const r = await fetch('data/fiche-export.json', { cache: 'no-store' });
            if (r.ok) {
                const fromFetch = await r.json();
                if (fromFetch && (fromFetch.version === 2 || fromFetch.version === 3)) {
                    applySaveSnapshot(fromFetch);
                }
            }
        } catch (e) {
            console.debug('Pas de fiche-export.json ou file://', e);
        }

        // 2. Firebase cloud data (takes priority when available)
        if (typeof isFirebaseReady === 'function' && isFirebaseReady()) {
            try {
                const fromCloud = await loadFromFirebase();
                if (fromCloud && (fromCloud.version === 2 || fromCloud.version === 3)) {
                    applySaveSnapshot(fromCloud);
                    try { localStorage.setItem(STORAGE_SAVE_V3, JSON.stringify(fromCloud)); } catch (_) {}
                    return;
                }
            } catch (e) {
                console.warn('Firebase load failed, falling back to localStorage', e);
            }
        }

        // 3. Fallback: localStorage
        try {
            const raw3 = localStorage.getItem(STORAGE_SAVE_V3);
            const raw2 = localStorage.getItem(STORAGE_SAVE_V2);
            const raw = raw3 || raw2;
            if (raw) {
                const fromLocal = JSON.parse(raw);
                if (fromLocal && (fromLocal.version === 2 || fromLocal.version === 3)) {
                    applySaveSnapshot(fromLocal);
                    // First-time Firebase: migrate local data to cloud
                    if (typeof isFirebaseReady === 'function' && isFirebaseReady() && typeof saveToFirebase === 'function') {
                        saveToFirebase(fromLocal);
                    }
                }
            }
        } catch (e) {
            console.warn('Erreur lecture localStorage', e);
        }
    }

    await loadSavedData();

    function clearScreenOpacity(el) {
        if (el) el.style.removeProperty('opacity');
    }

    function showScreen(screenEl) {
        clearScreenOpacity(screenEl);
        screenEl.classList.remove('hidden');
        requestAnimationFrame(() => {
            screenEl.classList.add('active');
        });
    }

    function hideScreen(screenEl, afterFadeMs, onHidden) {
        // Enlève la classe active pour suspendre l'animation d'entrée
        screenEl.classList.remove('active');
        screenEl.style.animation = 'none';
        screenEl.style.transition = `opacity ${afterFadeMs}ms cubic-bezier(0.19, 1, 0.22, 1), transform ${afterFadeMs}ms cubic-bezier(0.19, 1, 0.22, 1)`;
        screenEl.style.opacity = '0';
        screenEl.style.transform = 'scale(1.015)';

        setTimeout(() => {
            screenEl.classList.add('hidden');
            screenEl.style.removeProperty('animation');
            screenEl.style.removeProperty('transition');
            screenEl.style.removeProperty('transform');
            clearScreenOpacity(screenEl);
            if (onHidden) onHidden();
        }, afterFadeMs);
    }

    // --- Transition Smooth : Fondu Séquentiel (disparition complète avant l'apparition) ---
    // Optim : plus de filter blur (GPU-lourd sur plein écran), opacity + transform seulement.
    function crossfadeScreen(oldScreen, newScreen, fadeMs, logicBeforeShow) {
        oldScreen.style.pointerEvents = 'none';

        oldScreen.style.transition = `opacity ${fadeMs}ms ease-in-out, transform ${fadeMs}ms ease-in-out`;
        oldScreen.style.opacity = '0';
        oldScreen.style.transform = 'scale(1.02)';

        setTimeout(() => {
            oldScreen.classList.remove('active');
            oldScreen.classList.add('hidden');
            oldScreen.style.removeProperty('transition');
            oldScreen.style.removeProperty('opacity');
            oldScreen.style.removeProperty('transform');
            oldScreen.style.removeProperty('pointer-events');
            oldScreen.style.zIndex = '';
            clearScreenOpacity(oldScreen);

            if (logicBeforeShow) logicBeforeShow();

            newScreen.classList.remove('hidden');
            requestAnimationFrame(() => {
                newScreen.classList.add('active');
            });
        }, fadeMs);
    }

    function syncFicheEditableRegistry() {
        document.querySelectorAll('[contenteditable="true"]').forEach((el) => {
            el.classList.add('fiche-editable');
        });
        editableNodes = Array.from(document.querySelectorAll('.fiche-editable'));
    }

    function applyReadOnlyMode() {
        isEditorMode = false;
        sessionStorage.removeItem(STORAGE_EDITOR);
        document.body.classList.remove('is-editor');
        document.body.classList.add('is-read-only');
        syncFicheEditableRegistry();
        editableNodes.forEach((el) => {
            el.setAttribute('contenteditable', 'false');
        });
        if (editorBar) editorBar.classList.add('hidden');
        if (btnUnlockEditor) btnUnlockEditor.classList.remove('hidden');
    }

    function applyEditorMode() {
        isEditorMode = true;
        sessionStorage.setItem(STORAGE_EDITOR, '1');
        document.body.classList.remove('is-read-only');
        document.body.classList.add('is-editor');
        syncFicheEditableRegistry();
        editableNodes.forEach((el) => {
            el.setAttribute('contenteditable', 'true');
        });
        // Chrome insère par défaut un <div> à chaque Enter dans un <p
        // contenteditable>, ce qui corrompt la structure (le <p> ne peut pas
        // contenir de <div>, donc à la sérialisation/ré-affichage, le P est
        // fermé et le contenu devient orphelin non editable). On force <br>
        // pour garder tout le texte dans le même noeud editable.
        try { document.execCommand('defaultParagraphSeparator', false, 'br'); } catch (_) {}
        if (editorBar) editorBar.classList.remove('hidden');
        if (btnUnlockEditor) btnUnlockEditor.classList.add('hidden');
    }

    async function tryUnlockEditor() {
        const pwd = await ficheModal({
            message: typeof window.t === 'function' ? window.t('script_prompt_pwd') : 'Mot de passe — mode éditeur :',
            input: true,
        });
        if (pwd === null) return;
        if (pwd === FICHE_RP_EDITOR_PASSWORD) {
            applyEditorMode();
        } else {
            await ficheModal({
                message: typeof window.t === 'function' ? window.t('script_wrong_pwd') : 'Mot de passe incorrect.',
                confirmOnly: true,
            });
        }
    }

    if (sessionStorage.getItem(STORAGE_EDITOR) === '1') {
        applyEditorMode();
    } else {
        applyReadOnlyMode();
    }

    if (btnUnlockEditor) {
        btnUnlockEditor.addEventListener('click', tryUnlockEditor);
    }
    if (btnLockEditor) {
        btnLockEditor.addEventListener('click', async () => {
            const msg =
                typeof window.t === 'function'
                    ? window.t('script_lock_confirm')
                    : 'Passer en lecture seule ? Les visiteurs ne pourront plus modifier la page.';
            const ok = await ficheModal({ message: msg });
            if (ok) applyReadOnlyMode();
        });
    }

    if (btnExportFiche) {
        btnExportFiche.addEventListener('click', async () => {
            const data = collectSaveSnapshot();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'fiche-export.json';
            a.click();
            URL.revokeObjectURL(a.href);
            await ficheModal({
                message: typeof window.t === 'function'
                    ? window.t('script_export_alert')
                    : 'Fichier téléchargé.\n\n1) Renomme-le : fiche-export.json\n2) Mets-le dans data/\n3) git add, commit, push',
                confirmOnly: true,
            });
        });
    }

    if (btnImportFiche && inputImportFiche) {
        btnImportFiche.addEventListener('click', () => inputImportFiche.click());
        inputImportFiche.addEventListener('change', () => {
            const file = inputImportFiche.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = async () => {
                try {
                    const data = JSON.parse(String(reader.result));
                    applySaveSnapshot(data);
                    syncFicheEditableRegistry();
                    if (isEditorMode) {
                        editableNodes.forEach((el) => el.setAttribute('contenteditable', 'true'));
                    } else {
                        editableNodes.forEach((el) => el.setAttribute('contenteditable', 'false'));
                    }
                    persistToLocalStorage();
                    await ficheModal({
                        message: typeof window.t === 'function' ? window.t('script_import_ok') : 'Import terminé.',
                        confirmOnly: true,
                    });
                } catch (err) {
                    console.error('Import JSON échoué', err);
                    await ficheModal({
                        message: typeof window.t === 'function' ? window.t('script_import_bad') : 'Fichier JSON invalide.',
                        confirmOnly: true,
                    });
                }
                inputImportFiche.value = '';
            };
            reader.readAsText(file);
        });
    }

    document.addEventListener(
        'input',
        (e) => {
            if (!isEditorMode) return;
            if (e.target.closest?.('#char-bio-screen, #char-select-screen, #journal-screen')) {
                persistDebounced();
            }
        },
        true
    );

    const params = new URLSearchParams(window.location.search);
    if (params.get('edit') === '1' && !isEditorMode) {
        tryUnlockEditor();
        params.delete('edit');
        const next = params.toString();
        const clean = window.location.pathname + (next ? `?${next}` : '') + window.location.hash;
        window.history.replaceState({}, '', clean);
    }

    // --- 1. Splash Screen ---
    setTimeout(() => {
        crossfadeScreen(splashScreen, charSelectScreen, 800);
    }, 3500);

    // --- 2. Sélection -> Biographie ---
    selectLuaCard.addEventListener('click', () => {
        crossfadeScreen(charSelectScreen, charBioScreen, 800);
    });

    // --- 3a. Dossier citoyen -> Journal intime ---
    if (btnNextJournal) {
        btnNextJournal.addEventListener('click', (e) => {
            e.preventDefault();
            crossfadeScreen(charBioScreen, journalScreen, 800, () => {
                if (journalScreen) journalScreen.scrollTop = 0;
            });
        });
    }

    // --- 3b. Journal intime -> Dossier citoyen ---
    if (btnRetourDossier) {
        btnRetourDossier.addEventListener('click', (e) => {
            e.preventDefault();
            crossfadeScreen(journalScreen, charBioScreen, 800);
        });
    }

    // --- 3c. Biographie -> Sélection ---
    btnRetourSelect.addEventListener('click', (e) => {
        e.preventDefault();
        crossfadeScreen(charBioScreen, charSelectScreen, 800);
    });

    // --- 4. RETOUR écran sélection -> relance le splash ---
    if (btnRetourCharSelect) {
        btnRetourCharSelect.addEventListener('click', () => {
            crossfadeScreen(charSelectScreen, splashScreen, 800, () => {
                setTimeout(() => {
                    crossfadeScreen(splashScreen, charSelectScreen, 800);
                }, 2000);
            });
        });
    }

    // --- 5. Onglets biographie ---
    navBtns.forEach((btn) => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            navBtns.forEach((b) => b.classList.remove('active'));
            tabContents.forEach((t) => t.classList.remove('active'));
            btn.classList.add('active');
            const targetId = btn.getAttribute('data-target');
            const targetContent = document.getElementById(targetId);
            if (targetContent) targetContent.classList.add('active');
        });
    });

    // --- 6. Images : ouvrir le picker (URL ou upload) ---
    const inputImageUpload = document.getElementById('input-image-upload');
    let pendingImageTarget = null;

    function readFileAsDataURL(file) {
        return new Promise((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const max = 1200;

                    if (width > height) {
                        if (width > max) {
                            height = Math.round((height * max) / width);
                            width = max;
                        }
                    } else {
                        if (height > max) {
                            width = Math.round((width * max) / height);
                            height = max;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.75));
                };
                img.onerror = reject;
                img.src = r.result;
            };
            r.onerror = reject;
            r.readAsDataURL(file);
        });
    }

    async function pickImageForElement(imgEl) {
        const choice = await ficheModal({
            message: "Comment veux-tu ajouter l'image ?\n\n• OK = importer un fichier depuis ton ordinateur\n• Annuler = utiliser une URL en ligne (.png, .jpg, .webp...)",
        });
        if (choice) {
            pendingImageTarget = imgEl;
            inputImageUpload.value = '';
            inputImageUpload.click();
            return;
        }
        const newUrl = await ficheModal({
            message: "URL de l'image (lien direct .png, .jpg, .webp, etc.) :",
            input: true,
            defaultValue: imgEl.src && !imgEl.src.startsWith('data:') ? imgEl.src : '',
        });
        if (newUrl && newUrl.trim() !== '' && isValidImageUrl(newUrl.trim())) {
            imgEl.src = newUrl.trim();
            persistToLocalStorage();
        }
    }

    document.body.addEventListener('click', async (e) => {
        const img = e.target.closest('.editable-image');
        if (!img || !isEditorMode) return;
        e.stopPropagation();
        await pickImageForElement(img);
    });

    if (inputImageUpload) {
        inputImageUpload.addEventListener('change', async () => {
            const file = inputImageUpload.files?.[0];
            if (!file || !pendingImageTarget) return;
            try {
                let imgSrc = null;
                if (typeof uploadImageToFirebase === 'function' && typeof isFirebaseReady === 'function' && isFirebaseReady()) {
                    imgSrc = await uploadImageToFirebase(file);
                }
                if (!imgSrc) {
                    imgSrc = await readFileAsDataURL(file);
                }
                pendingImageTarget.src = imgSrc;
                persistToLocalStorage();
            } catch (err) {
                console.warn('Lecture image impossible', err);
            }
            pendingImageTarget = null;
            inputImageUpload.value = '';
        });
    }

    /* ─────────────────────────────────────────────────────────────
       LIVRE — viewer une double-page à la fois + animation flip
       ───────────────────────────────────────────────────────────── */

    const bookViewer = document.getElementById('book-viewer');
    const bookPrev = document.getElementById('book-prev');
    const bookNext = document.getElementById('book-next');
    const pagerCurrent = document.getElementById('book-pager-current');
    const pagerTotal = document.getElementById('book-pager-total');
    const btnRemoveJournalEntry = document.getElementById('btn-remove-journal-entry');

    let currentSpreadIdx = 0;
    let isFlipping = false;

    function getSpreads() {
        return Array.from(journalEntriesEl ? journalEntriesEl.querySelectorAll(':scope > .book-spread') : []);
    }

    function updatePager() {
        const spreads = getSpreads();
        if (pagerTotal) pagerTotal.textContent = String(spreads.length || 1);
        if (pagerCurrent) pagerCurrent.textContent = String(Math.min(currentSpreadIdx + 1, spreads.length || 1));
        if (bookPrev) bookPrev.disabled = currentSpreadIdx <= 0;
        if (bookNext) bookNext.disabled = currentSpreadIdx >= spreads.length - 1;
    }

    function showSpread(idx, direction) {
        const spreads = getSpreads();
        if (!spreads.length) return;
        idx = Math.max(0, Math.min(idx, spreads.length - 1));
        const current = spreads.findIndex(s => s.classList.contains('is-current'));

        if (current === idx) {
            spreads.forEach((s, i) => {
                s.classList.toggle('is-current', i === idx);
            });
            updatePager();
            return;
        }

        if (current === -1) {
            spreads[idx].classList.add('is-current');
            currentSpreadIdx = idx;
            updatePager();
            return;
        }

        if (isFlipping) return;
        isFlipping = true;

        const dir = direction || (idx > current ? 'forward' : 'backward');
        const oldEl = spreads[current];
        const newEl = spreads[idx];
        const book = journalEntriesEl;

        if (book) book.classList.add('is-flipping');
        newEl.classList.add(dir === 'forward' ? 'is-entering-forward' : 'is-entering-backward');

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                oldEl.classList.remove('is-current');
                oldEl.classList.add(dir === 'forward' ? 'is-leaving-forward' : 'is-leaving-backward');

                newEl.classList.remove('is-entering-forward', 'is-entering-backward');
                newEl.classList.add('is-current');
                currentSpreadIdx = idx;
                updatePager();

                setTimeout(() => {
                    oldEl.classList.remove('is-leaving-forward', 'is-leaving-backward');
                    if (book) book.classList.remove('is-flipping');
                    isFlipping = false;
                }, 440);
            });
        });
    }

    function refreshBook() {
        const spreads = getSpreads();
        spreads.forEach(s => s.classList.remove('is-current', 'is-leaving-forward', 'is-leaving-backward', 'is-entering-forward', 'is-entering-backward'));
        if (currentSpreadIdx >= spreads.length) currentSpreadIdx = Math.max(0, spreads.length - 1);
        if (spreads[currentSpreadIdx]) spreads[currentSpreadIdx].classList.add('is-current');
        updatePager();
        injectPageAddButtons();
        injectElementTags();
    }

    if (bookPrev) bookPrev.addEventListener('click', () => showSpread(currentSpreadIdx - 1, 'backward'));
    if (bookNext) bookNext.addEventListener('click', () => showSpread(currentSpreadIdx + 1, 'forward'));

    document.addEventListener('keydown', (e) => {
        if (!journalScreen || journalScreen.classList.contains('hidden')) return;
        if (document.activeElement && (document.activeElement.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName))) return;
        if (e.key === 'ArrowLeft')  { showSpread(currentSpreadIdx - 1, 'backward'); }
        if (e.key === 'ArrowRight') { showSpread(currentSpreadIdx + 1, 'forward');  }
    });

    /* ─────────────────────────────────────────────────────────────
       Bouton "+" sur chaque page + menu d'ajout d'éléments
       ───────────────────────────────────────────────────────────── */

    const addElementMenu = document.getElementById('add-element-menu');
    let addMenuTargetPage = null;

    function injectPageAddButtons() {
        if (!journalEntriesEl) return;
        journalEntriesEl.querySelectorAll('.book-page-inner').forEach((pageInner) => {
            if (pageInner.querySelector(':scope > .page-add-btn')) return;
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'page-add-btn editor-only';
            btn.title = 'Ajouter un élément à cette page';
            btn.setAttribute('aria-label', 'Ajouter un élément');
            btn.innerHTML = '<i class="fas fa-plus"></i>';
            pageInner.appendChild(btn);
        });
    }

    function injectElementTags() {
        if (!journalEntriesEl) return;
        journalEntriesEl.querySelectorAll('.book-page-inner').forEach((pageInner) => {
            Array.from(pageInner.children).forEach((child) => {
                if (child.classList.contains('page-add-btn')) return;
                if (child.classList.contains('book-page-num')) return;
                if (child.classList.contains('book-decoration')) return;
                if (child.classList.contains('element-tools')) return;
                if (!child.hasAttribute('data-element')) {
                    if (child.tagName === 'FIGURE') child.setAttribute('data-element', 'photo');
                    else if (child.tagName === 'H2' || child.classList.contains('book-heading')) child.setAttribute('data-element', 'heading');
                    else if (child.classList.contains('book-caption')) child.setAttribute('data-element', 'caption');
                    else if (child.classList.contains('book-divider')) child.setAttribute('data-element', 'divider');
                    else if (child.classList.contains('book-id-grid')) child.setAttribute('data-element', 'id-card');
                    else child.setAttribute('data-element', 'paragraph');
                }
                if (!child.querySelector(':scope > .element-tools')) {
                    const tools = document.createElement('div');
                    tools.className = 'element-tools editor-only';
                    tools.innerHTML = `
                        <button type="button" class="et-up" title="Monter"><i class="fas fa-arrow-up"></i></button>
                        <button type="button" class="et-down" title="Descendre"><i class="fas fa-arrow-down"></i></button>
                        <button type="button" class="et-rotate" title="Tourner légèrement"><i class="fas fa-rotate-right"></i></button>
                        <button type="button" class="et-del" title="Supprimer"><i class="fas fa-times"></i></button>
                    `;
                    child.appendChild(tools);
                }
            });
        });
    }

    function openAddElementMenu(page, anchorEl) {
        addMenuTargetPage = page;
        const rect = anchorEl.getBoundingClientRect();
        addElementMenu.classList.remove('hidden');
        const menuRect = addElementMenu.getBoundingClientRect();
        let top = rect.top - menuRect.height - 6;
        if (top < 8) top = rect.bottom + 6;
        let left = rect.left + rect.width / 2 - menuRect.width / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - menuRect.width - 8));
        addElementMenu.style.top = `${top}px`;
        addElementMenu.style.left = `${left}px`;
        document.body.classList.add('aem-open');
        anchorEl.classList.add('is-open');
    }

    function closeAddElementMenu() {
        if (!addElementMenu) return;
        addElementMenu.classList.add('hidden');
        document.body.classList.remove('aem-open');
        document.querySelectorAll('.page-add-btn.is-open').forEach(b => b.classList.remove('is-open'));
        addMenuTargetPage = null;
    }

    function placeholderImg(w, h) {
        return `https://via.placeholder.com/${w}x${h}/d4d2cc/5a5a5a?text=Cliquer+pour+changer`;
    }

    function buildElement(kind) {
        const wrap = document.createElement('div');
        switch (kind) {
            case 'paragraph': {
                const p = document.createElement('p');
                p.className = 'book-text book-text--body book-text--justify';
                p.setAttribute('contenteditable', 'true');
                p.setAttribute('data-element', 'paragraph');
                p.innerHTML = 'Écris ici… clique pour modifier, sélectionne du texte pour changer la police, la taille ou la couleur de l’encre.';
                return p;
            }
            case 'heading': {
                const h = document.createElement('h2');
                h.className = 'book-heading';
                h.setAttribute('contenteditable', 'true');
                h.setAttribute('data-element', 'heading');
                h.textContent = 'Titre…';
                return h;
            }
            case 'caption': {
                const p = document.createElement('p');
                p.className = 'book-caption';
                p.setAttribute('contenteditable', 'true');
                p.setAttribute('data-element', 'caption');
                p.textContent = 'Légende — lieu — date.';
                return p;
            }
            case 'divider': {
                const d = document.createElement('div');
                d.className = 'book-divider';
                d.setAttribute('data-element', 'divider');
                d.setAttribute('aria-hidden', 'true');
                return d;
            }
            case 'photo': {
                const fig = document.createElement('figure');
                fig.className = 'photo-taped';
                fig.setAttribute('data-element', 'photo');
                fig.setAttribute('data-rotate', String((Math.floor(Math.random() * 7) - 3)));
                const img = document.createElement('img');
                img.src = placeholderImg(420, 280);
                img.alt = '';
                img.className = 'editable-image journal-photo book-photo';
                img.width = 420; img.height = 280;
                fig.appendChild(img);
                return fig;
            }
            case 'photo-portrait': {
                const fig = document.createElement('figure');
                fig.className = 'photo-taped photo-taped--portrait';
                fig.setAttribute('data-element', 'photo');
                fig.setAttribute('data-rotate', String((Math.floor(Math.random() * 7) - 3)));
                const img = document.createElement('img');
                img.src = placeholderImg(280, 380);
                img.alt = '';
                img.className = 'editable-image journal-photo book-photo';
                img.width = 280; img.height = 380;
                fig.appendChild(img);
                return fig;
            }
            case 'photo-clip': {
                const fig = document.createElement('figure');
                fig.className = 'photo-taped photo-taped--small photo-taped--clip';
                fig.setAttribute('data-element', 'photo');
                const clip = document.createElement('span');
                clip.className = 'paperclip';
                clip.setAttribute('aria-hidden', 'true');
                fig.appendChild(clip);
                const img = document.createElement('img');
                img.src = placeholderImg(220, 150);
                img.alt = '';
                img.className = 'editable-image journal-photo book-photo';
                img.width = 220; img.height = 150;
                fig.appendChild(img);
                return fig;
            }
            case 'id-card': {
                const grid = document.createElement('div');
                grid.className = 'book-id-grid';
                grid.setAttribute('data-element', 'id-card');
                const colA = document.createElement('div');
                colA.className = 'book-id-col';
                colA.setAttribute('contenteditable', 'true');
                colA.innerHTML = 'Name: …<br>Height: …<br>Weight: …<br>Eyes: …<br>Age: …';
                const colB = document.createElement('div');
                colB.className = 'book-id-col';
                colB.setAttribute('contenteditable', 'true');
                colB.innerHTML = 'Birth: … — …';
                grid.appendChild(colA); grid.appendChild(colB);
                return grid;
            }
            default: return null;
        }
    }

    function addElementToPage(page, kind) {
        if (!page) return;
        const el = buildElement(kind);
        if (!el) return;
        const addBtn = page.querySelector(':scope > .page-add-btn');
        const pageNum = page.querySelector(':scope > .book-page-num');
        const before = addBtn || pageNum || null;
        if (before) page.insertBefore(el, before);
        else page.appendChild(el);
        injectElementTags();
        syncFicheEditableRegistry();
        if (isEditorMode) {
            editableNodes.forEach((n) => n.setAttribute('contenteditable', 'true'));
        }
        if (el.isContentEditable) {
            const range = document.createRange();
            range.selectNodeContents(el);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
            el.focus();
        }
        persistToLocalStorage();
    }

    if (journalEntriesEl) {
        journalEntriesEl.addEventListener('click', (e) => {
            const addBtn = e.target.closest('.page-add-btn');
            if (addBtn && isEditorMode) {
                const page = addBtn.parentElement;
                if (addElementMenu.classList.contains('hidden') || addMenuTargetPage !== page) {
                    closeAddElementMenu();
                    openAddElementMenu(page, addBtn);
                } else {
                    closeAddElementMenu();
                }
                e.stopPropagation();
                return;
            }
            const tools = e.target.closest('.element-tools');
            if (tools && isEditorMode) {
                const target = tools.parentElement;
                if (e.target.closest('.et-del')) {
                    target.remove();
                    persistToLocalStorage();
                } else if (e.target.closest('.et-up')) {
                    const prev = target.previousElementSibling;
                    if (prev && !prev.classList.contains('book-page-num')) target.parentElement.insertBefore(target, prev);
                    persistToLocalStorage();
                } else if (e.target.closest('.et-down')) {
                    const next = target.nextElementSibling;
                    if (next && !next.classList.contains('page-add-btn') && !next.classList.contains('book-page-num')) {
                        target.parentElement.insertBefore(next, target);
                    }
                    persistToLocalStorage();
                } else if (e.target.closest('.et-rotate')) {
                    if (target.classList.contains('photo-taped') || target.tagName === 'FIGURE') {
                        const cur = parseInt(target.getAttribute('data-rotate') || '0', 10) || 0;
                        const nxt = cur >= 5 ? -3 : cur + 1;
                        target.setAttribute('data-rotate', String(nxt));
                        persistToLocalStorage();
                    }
                }
                e.stopPropagation();
                return;
            }
        });
    }

    if (addElementMenu) {
        addElementMenu.addEventListener('click', (e) => {
            const item = e.target.closest('.aem-item');
            if (!item) return;
            const kind = item.getAttribute('data-add');
            const page = addMenuTargetPage;
            closeAddElementMenu();
            if (page) addElementToPage(page, kind);
        });
    }

    document.addEventListener('click', (e) => {
        if (addElementMenu && !addElementMenu.classList.contains('hidden')) {
            if (!e.target.closest('#add-element-menu') && !e.target.closest('.page-add-btn')) {
                closeAddElementMenu();
            }
        }
    });

    /* ─────────────────────────────────────────────────────────────
       Drag & Drop d'une image directement sur une page
       ───────────────────────────────────────────────────────────── */

    if (journalEntriesEl) {
        journalEntriesEl.addEventListener('dragover', (e) => {
            if (!isEditorMode) return;
            const page = e.target.closest('.book-page');
            if (!page) return;
            e.preventDefault();
            page.classList.add('is-drop-target');
        });
        journalEntriesEl.addEventListener('dragleave', (e) => {
            const page = e.target.closest('.book-page');
            if (page) page.classList.remove('is-drop-target');
        });
        journalEntriesEl.addEventListener('drop', async (e) => {
            if (!isEditorMode) return;
            const page = e.target.closest('.book-page');
            if (!page) return;
            e.preventDefault();
            page.classList.remove('is-drop-target');
            const file = Array.from(e.dataTransfer?.files || []).find(f => f.type.startsWith('image/'));
            if (!file) return;
            try {
                let imgSrc = null;
                if (typeof uploadImageToFirebase === 'function' && typeof isFirebaseReady === 'function' && isFirebaseReady()) {
                    imgSrc = await uploadImageToFirebase(file);
                }
                if (!imgSrc) {
                    imgSrc = await readFileAsDataURL(file);
                }
                const fig = buildElement('photo');
                fig.querySelector('img').src = imgSrc;
                const inner = page.querySelector('.book-page-inner');
                if (inner) {
                    const addBtn = inner.querySelector(':scope > .page-add-btn');
                    const pageNum = inner.querySelector(':scope > .book-page-num');
                    inner.insertBefore(fig, addBtn || pageNum || null);
                }
                injectElementTags();
                syncFicheEditableRegistry();
                if (isEditorMode) editableNodes.forEach((n) => n.setAttribute('contenteditable', 'true'));
                persistToLocalStorage();
            } catch (err) { console.warn('Drop image impossible', err); }
        });
    }

    /* ─────────────────────────────────────────────────────────────
       Barre de mise en forme flottante (sélection dans le livre)
       ───────────────────────────────────────────────────────────── */

    const formatToolbar = document.getElementById('format-toolbar');
    const ftFont = document.getElementById('ft-font');
    const ftSize = document.getElementById('ft-size');

    let savedRange = null;

    function isSelectionInBook() {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return false;
        const node = sel.anchorNode;
        if (!node) return false;
        const el = node.nodeType === 1 ? node : node.parentElement;
        return !!el?.closest('.journal-book');
    }

    function rememberSelection() {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
            savedRange = sel.getRangeAt(0).cloneRange();
        }
    }
    function restoreSelection() {
        if (!savedRange) return;
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(savedRange);
    }

    function positionToolbarFromSelection() {
        const sel = window.getSelection();
        if (!sel || !sel.rangeCount) return;
        const range = sel.getRangeAt(0);
        let rect = range.getBoundingClientRect();
        if (!rect || (rect.width === 0 && rect.height === 0)) {
            const el = (sel.anchorNode?.nodeType === 1 ? sel.anchorNode : sel.anchorNode?.parentElement);
            if (el) rect = el.getBoundingClientRect();
        }
        if (!rect) return;
        formatToolbar.classList.remove('hidden');
        const tbRect = formatToolbar.getBoundingClientRect();
        let top = rect.top - tbRect.height - 10 + window.scrollY;
        if (top < 8 + window.scrollY) top = rect.bottom + 8 + window.scrollY;
        let left = rect.left + rect.width / 2 - tbRect.width / 2;
        left = Math.max(8, Math.min(left, window.innerWidth - tbRect.width - 8));
        formatToolbar.style.top = `${top}px`;
        formatToolbar.style.left = `${left}px`;
    }

    function showFormatToolbar() {
        if (!formatToolbar) return;
        formatToolbar.classList.remove('hidden');
        positionToolbarFromSelection();
        updateToolbarState();
    }
    function hideFormatToolbar() {
        if (!formatToolbar) return;
        formatToolbar.classList.add('hidden');
    }

    function updateToolbarState() {
        if (!formatToolbar) return;
        ['bold', 'italic', 'underline', 'strikeThrough', 'justifyLeft', 'justifyCenter', 'justifyRight', 'justifyFull'].forEach(cmd => {
            const btn = formatToolbar.querySelector(`.ft-btn[data-cmd="${cmd}"]`);
            if (!btn) return;
            try {
                btn.classList.toggle('is-active', document.queryCommandState(cmd));
            } catch { /* ignore */ }
        });
    }

    function execCmd(cmd, value) {
        try {
            document.execCommand('styleWithCSS', false, true);
        } catch { /* ignore */ }
        document.execCommand(cmd, false, value);
    }

    // Optim : selectionchange se déclenche à chaque micro-mouvement du caret.
    // On coalesce en un seul traitement par frame via rAF pour éviter de
    // lire getBoundingClientRect + queryCommandState 60+ fois/seconde.
    let _selRafScheduled = false;
    document.addEventListener('selectionchange', () => {
        if (_selRafScheduled) return;
        _selRafScheduled = true;
        requestAnimationFrame(() => {
            _selRafScheduled = false;
            if (!isEditorMode) { hideFormatToolbar(); return; }
            if (isSelectionInBook()) {
                rememberSelection();
                showFormatToolbar();
            } else {
                const active = document.activeElement;
                if (!active || !active.closest('#format-toolbar')) hideFormatToolbar();
            }
        });
    });

    if (formatToolbar) {
        formatToolbar.addEventListener('mousedown', (e) => {
            // empêche la perte de sélection au clic dans la toolbar — sauf pour les <select>
            if (e.target.closest('select')) return;
            e.preventDefault();
        });
        formatToolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('.ft-btn');
            if (btn) { restoreSelection(); execCmd(btn.dataset.cmd); updateToolbarState(); persistToLocalStorage(); return; }
            const ink = e.target.closest('.ft-ink');
            if (ink) { restoreSelection(); execCmd('foreColor', ink.dataset.color); persistToLocalStorage(); return; }
        });
        if (ftFont) ftFont.addEventListener('change', () => { restoreSelection(); execCmd('fontName', ftFont.value); persistToLocalStorage(); });
        if (ftSize) ftSize.addEventListener('change', () => { restoreSelection(); execCmd('fontSize', ftSize.value); persistToLocalStorage(); });
    }

    /* ─────────────────────────────────────────────────────────────
       Journal : ajouter / supprimer une double-page
       ───────────────────────────────────────────────────────────── */

    if (btnAddJournalEntry && journalEntriesEl && journalEntryTemplate) {
        btnAddJournalEntry.addEventListener('click', () => {
            if (!isEditorMode) return;
            const frag = journalEntryTemplate.content.cloneNode(true);
            journalEntriesEl.appendChild(frag);
            refreshBook();
            syncFicheEditableRegistry();
            editableNodes.forEach((el) => el.setAttribute('contenteditable', 'true'));
            const spreads = getSpreads();
            showSpread(spreads.length - 1, 'forward');
            persistToLocalStorage();
        });
    }

    if (btnRemoveJournalEntry && journalEntriesEl) {
        btnRemoveJournalEntry.addEventListener('click', async () => {
            if (!isEditorMode) return;
            const spreads = getSpreads();
            if (spreads.length <= 1) {
                await ficheModal({ message: 'Impossible : il doit rester au moins une double-page.', confirmOnly: true });
                return;
            }
            const ok = await ficheModal({ message: 'Supprimer définitivement la double-page actuelle ?' });
            if (!ok) return;
            const target = spreads[currentSpreadIdx];
            target.remove();
            const newSpreads = getSpreads();
            currentSpreadIdx = Math.min(currentSpreadIdx, newSpreads.length - 1);
            refreshBook();
            persistToLocalStorage();
        });
    }

    // Initialisation : afficher la première double-page
    refreshBook();

    // Re-injection des helpers chaque fois qu'on entre/quitte le mode éditeur ou qu'on importe
    const _origApplyEditor = applyEditorMode;
    const _origApplyReadOnly = applyReadOnlyMode;
    window.__refreshBook = refreshBook;
    // Patch léger pour s'assurer qu'on rafraîchit après import
    if (inputImportFiche) {
        inputImportFiche.addEventListener('change', () => {
            setTimeout(refreshBook, 200);
        });
    }
    // Quand on (re)passe en édition, garantir que les outils sont injectés.
    // Optim : on ne réagit qu'aux ajouts/suppressions de nœuds (pas à chaque
    // caractère tapé), et on coalesce les mutations proches dans le temps via
    // un microtask unique + rAF pour éviter des dizaines de passes/s.
    let _injectScheduled = false;
    function scheduleInject() {
        if (_injectScheduled) return;
        _injectScheduled = true;
        requestAnimationFrame(() => {
            _injectScheduled = false;
            injectPageAddButtons();
            injectElementTags();
        });
    }
    new MutationObserver((mutations) => {
        for (const m of mutations) {
            if (m.addedNodes.length || m.removedNodes.length) {
                scheduleInject();
                return;
            }
        }
    }).observe(journalEntriesEl, { childList: true, subtree: true });
});
