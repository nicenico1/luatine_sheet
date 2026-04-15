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

        return {
            version: 3,
            fields,
            journalHTML: journalEntriesEl ? journalEntriesEl.innerHTML : '',
            images,
            stepperVals,
            attrPoints: document.getElementById('attr-points-num')?.textContent?.trim() ?? '8',
            skillPoints: document.getElementById('skill-points-num')?.textContent?.trim() ?? '10',
        };
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
            }
        } else if (data.version === 2) {
            // Legacy v2 : rétro-compatibilité par index
            if (journalEntriesEl && typeof data.journalHTML === 'string') {
                journalEntriesEl.innerHTML = sanitizeHTML(data.journalHTML);
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
            localStorage.setItem(STORAGE_SAVE_V3, JSON.stringify(collectSaveSnapshot()));
        } catch (e) {
            console.warn('Sauvegarde locale impossible', e);
        }
    }

    const persistDebounced = debounce(persistToLocalStorage, 600);

    wireLangSwitcher();

    async function loadSavedData() {
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
        try {
            const raw3 = localStorage.getItem(STORAGE_SAVE_V3);
            const raw2 = localStorage.getItem(STORAGE_SAVE_V2);
            const raw = raw3 || raw2;
            if (raw) {
                const fromLocal = JSON.parse(raw);
                if (fromLocal && (fromLocal.version === 2 || fromLocal.version === 3)) {
                    applySaveSnapshot(fromLocal);
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
        screenEl.style.opacity = '0';
        setTimeout(() => {
            screenEl.classList.remove('active');
            screenEl.classList.add('hidden');
            clearScreenOpacity(screenEl);
            if (onHidden) onHidden();
        }, afterFadeMs);
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
        splashScreen.style.opacity = '0';
        setTimeout(() => {
            splashScreen.classList.remove('active');
            splashScreen.classList.add('hidden');
            clearScreenOpacity(splashScreen);
            showScreen(charSelectScreen);
        }, 1000);
    }, 3500);

    // --- 2. Sélection -> Biographie ---
    selectLuaCard.addEventListener('click', () => {
        hideScreen(charSelectScreen, 1000, () => {
            showScreen(charBioScreen);
        });
    });

    // --- 3a. Dossier citoyen -> Journal intime ---
    if (btnNextJournal) {
        btnNextJournal.addEventListener('click', (e) => {
            e.preventDefault();
            hideScreen(charBioScreen, 600, () => {
                showScreen(journalScreen);
                if (journalScreen) journalScreen.scrollTop = 0;
            });
        });
    }

    // --- 3b. Journal intime -> Dossier citoyen ---
    if (btnRetourDossier) {
        btnRetourDossier.addEventListener('click', (e) => {
            e.preventDefault();
            hideScreen(journalScreen, 600, () => {
                showScreen(charBioScreen);
            });
        });
    }

    // --- 3c. Biographie -> Sélection ---
    btnRetourSelect.addEventListener('click', (e) => {
        e.preventDefault();
        hideScreen(charBioScreen, 1000, () => {
            showScreen(charSelectScreen);
        });
    });

    // --- 4. RETOUR écran sélection -> relance le splash ---
    if (btnRetourCharSelect) {
        btnRetourCharSelect.addEventListener('click', () => {
            hideScreen(charSelectScreen, 600, () => {
                showScreen(splashScreen);
                setTimeout(() => {
                    splashScreen.style.opacity = '0';
                    setTimeout(() => {
                        splashScreen.classList.remove('active');
                        splashScreen.classList.add('hidden');
                        clearScreenOpacity(splashScreen);
                        showScreen(charSelectScreen);
                    }, 1000);
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

    // --- 6. Images (avec modal custom) ---
    document.body.addEventListener('click', async (e) => {
        const img = e.target.closest('.editable-image');
        if (!img || !isEditorMode) return;
        e.stopPropagation();
        const newUrl = await ficheModal({
            message: typeof window.t === 'function'
                ? window.t('script_prompt_img')
                : "URL de l'image (lien direct .png, .jpg, etc.) :",
            input: true,
            defaultValue: img.src,
        });
        if (newUrl && newUrl.trim() !== '' && isValidImageUrl(newUrl.trim())) {
            img.src = newUrl.trim();
            persistToLocalStorage();
        }
    });

    // --- 7. Journal : ajouter une entrée ---
    if (btnAddJournalEntry && journalEntriesEl && journalEntryTemplate) {
        btnAddJournalEntry.addEventListener('click', () => {
            if (!isEditorMode) return;
            const frag = journalEntryTemplate.content.cloneNode(true);
            journalEntriesEl.appendChild(frag);
            syncFicheEditableRegistry();
            editableNodes.forEach((el) => {
                el.setAttribute('contenteditable', 'true');
            });
            const last = journalEntriesEl.lastElementChild;
            if (last) last.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            persistToLocalStorage();
        });
    }

});
