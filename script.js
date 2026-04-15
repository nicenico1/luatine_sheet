/**
 * Fiche RP — mot de passe mode éditeur (modifiable ici).
 * Sauvegarde : localStorage + export JSON pour GitHub Pages (voir data/fiche-export.json).
 */
const FICHE_RP_EDITOR_PASSWORD = "je t'aime";

const STORAGE_EDITOR = 'ficherp_editor_unlocked';
const STORAGE_SAVE_V2 = 'ficherp_save_v2';

let isEditorMode = false;
let editableNodes = [];

function debounce(fn, ms) {
    let t;
    return function debounced(...args) {
        clearTimeout(t);
        t = setTimeout(() => fn.apply(this, args), ms);
    };
}

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof window.applyLanguage === 'function' && typeof window.getLang === 'function') {
        window.applyLanguage(window.getLang());
    }

    /** Langue : branché tout de suite (avant fetch sauvegarde) pour que les clics répondent toujours. */
    function wireLangSwitcher() {
        const root = document.getElementById('lang-switcher');
        if (!root) return;
        root.addEventListener('click', (e) => {
            const t = e.target.closest('[data-lang]');
            if (!t) return;
            const lang = t.getAttribute('data-lang');
            if (!lang || (typeof window.getLang === 'function' && lang === window.getLang())) return;
            if (typeof window.setLang === 'function') window.setLang(lang);
            try {
                persistToLocalStorage();
            } catch (_) {
                /* ignore */
            }
            location.reload();
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

    function collectSaveSnapshot() {
        syncFicheEditableRegistry();
        const textsOutside = editableNodes
            .filter((el) => !journalEntriesEl?.contains(el))
            .map((el) => el.innerHTML);
        const images = Array.from(document.querySelectorAll('.editable-image')).map(
            (img) => img.getAttribute('src') || ''
        );
        const stepperVals = Array.from(document.querySelectorAll('.stepper-value')).map((el) =>
            el.textContent.trim()
        );
        return {
            version: 2,
            textsOutside,
            journalHTML: journalEntriesEl ? journalEntriesEl.innerHTML : '',
            images,
            stepperVals,
            attrPoints: document.getElementById('attr-points-num')?.textContent?.trim() ?? '8',
            skillPoints: document.getElementById('skill-points-num')?.textContent?.trim() ?? '10',
        };
    }

    function applySaveSnapshot(data) {
        if (!data || data.version !== 2) return;
        if (journalEntriesEl && typeof data.journalHTML === 'string') {
            journalEntriesEl.innerHTML = data.journalHTML;
        }
        syncFicheEditableRegistry();
        const outside = editableNodes.filter((el) => !journalEntriesEl?.contains(el));
        data.textsOutside?.forEach((html, i) => {
            if (outside[i]) outside[i].innerHTML = html;
        });
        const imgs = Array.from(document.querySelectorAll('.editable-image'));
        data.images?.forEach((src, i) => {
            if (src && imgs[i]) imgs[i].src = src;
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
            localStorage.setItem(STORAGE_SAVE_V2, JSON.stringify(collectSaveSnapshot()));
        } catch (e) {
            console.warn('Sauvegarde locale impossible', e);
        }
    }

    const persistDebounced = debounce(persistToLocalStorage, 600);

    wireLangSwitcher();

    /** D’abord le JSON du dépôt (visible par tout le monde), puis le localStorage (ta session navigateur). */
    async function loadSavedData() {
        try {
            const r = await fetch('data/fiche-export.json', { cache: 'no-store' });
            if (r.ok) {
                const fromFetch = await r.json();
                if (fromFetch && fromFetch.version === 2) applySaveSnapshot(fromFetch);
            }
        } catch (_) {
            /* pas de fichier ou file:// */
        }
        try {
            const raw = localStorage.getItem(STORAGE_SAVE_V2);
            if (raw) {
                const fromLocal = JSON.parse(raw);
                if (fromLocal && fromLocal.version === 2) applySaveSnapshot(fromLocal);
            }
        } catch (_) {
            /* ignore */
        }
    }

    await loadSavedData();

    /** Réinitialise l'opacité inline (sinon l'écran reste invisible après une transition). */
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

    /**
     * Registre tous les champs éditables (y compris entrées de journal ajoutées plus tard).
     */
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

    function tryUnlockEditor() {
        const pwd = window.prompt(
            typeof window.t === 'function' ? window.t('script_prompt_pwd') : 'Mot de passe — mode éditeur :'
        );
        if (pwd === null) return;
        if (pwd === FICHE_RP_EDITOR_PASSWORD) {
            applyEditorMode();
        } else {
            window.alert(typeof window.t === 'function' ? window.t('script_wrong_pwd') : 'Mot de passe incorrect.');
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
        btnLockEditor.addEventListener('click', () => {
            const msg =
                typeof window.t === 'function'
                    ? window.t('script_lock_confirm')
                    : 'Passer en lecture seule ? Les visiteurs ne pourront plus modifier la page.';
            if (window.confirm(msg)) {
                applyReadOnlyMode();
            }
        });
    }

    if (btnExportFiche) {
        btnExportFiche.addEventListener('click', () => {
            const data = collectSaveSnapshot();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'fiche-export.json';
            a.click();
            URL.revokeObjectURL(a.href);
            window.alert(
                typeof window.t === 'function'
                    ? window.t('script_export_alert')
                    : 'Fichier téléchargé.\n\n' +
                          '1) Renomme-le exactement : fiche-export.json\n' +
                          '2) Mets-le dans le dossier data/ de ton projet (à côté de index.html)\n' +
                          '3) git add data/fiche-export.json && git commit -m "Données fiche" && git push\n\n' +
                          'Sans cette étape, seul ton navigateur mémorise les changements — pas le site pour les autres ni la navigation privée.'
            );
        });
    }

    if (btnImportFiche && inputImportFiche) {
        btnImportFiche.addEventListener('click', () => inputImportFiche.click());
        inputImportFiche.addEventListener('change', () => {
            const file = inputImportFiche.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(String(reader.result));
                    applySaveSnapshot(data);
                    if (isEditorMode) {
                        editableNodes.forEach((el) => el.setAttribute('contenteditable', 'true'));
                    } else {
                        editableNodes.forEach((el) => el.setAttribute('contenteditable', 'false'));
                    }
                    persistToLocalStorage();
                    window.alert(
                        typeof window.t === 'function' ? window.t('script_import_ok') : 'Import terminé.'
                    );
                } catch (err) {
                    window.alert(
                        typeof window.t === 'function' ? window.t('script_import_bad') : 'Fichier JSON invalide.'
                    );
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

    // --- 4. RETOUR écran sélection ---
    if (btnRetourCharSelect) {
        btnRetourCharSelect.addEventListener('click', () => {
            if (window.history.length > 1) {
                window.history.back();
            }
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

    // --- 6. Images ---
    document.body.addEventListener('click', (e) => {
        const img = e.target.closest('.editable-image');
        if (!img || !isEditorMode) return;
        e.stopPropagation();
        const newUrl = window.prompt(
            typeof window.t === 'function'
                ? window.t('script_prompt_img')
                : "URL de l'image (lien direct .png, .jpg, etc.) :",
            img.src
        );
        if (newUrl && newUrl.trim() !== '') {
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
