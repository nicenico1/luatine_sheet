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

    async function loadSavedData() {
        let data = null;
        try {
            const raw = localStorage.getItem(STORAGE_SAVE_V2);
            if (raw) data = JSON.parse(raw);
        } catch (_) {
            /* ignore */
        }
        if (!data || data.version !== 2) {
            try {
                const r = await fetch('data/fiche-export.json', { cache: 'no-store' });
                if (r.ok) data = await r.json();
            } catch (_) {
                /* fichier absent ou file:// sans serveur */
            }
        }
        if (data && data.version === 2) applySaveSnapshot(data);
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
        const pwd = window.prompt('Mot de passe — mode éditeur :');
        if (pwd === null) return;
        if (pwd === FICHE_RP_EDITOR_PASSWORD) {
            applyEditorMode();
        } else {
            window.alert('Mot de passe incorrect.');
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
            if (window.confirm('Passer en lecture seule ? Les visiteurs ne pourront plus modifier la page.')) {
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
                'Fichier téléchargé. Placez-le dans le dossier data/ du dépôt sous le nom fiche-export.json, puis poussez sur GitHub pour que les visiteurs voient votre contenu.'
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
                    window.alert('Import terminé.');
                } catch (err) {
                    window.alert('Fichier JSON invalide.');
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
            "URL de l'image (lien direct .png, .jpg, etc.) :",
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

    /**
     * Attributs / compétences : pool de points
     */
    function initPoolStepper(listEl, numElId) {
        const poolTotal = parseInt(listEl.dataset.poolTotal, 10);
        const total = Number.isFinite(poolTotal) ? poolTotal : 8;
        const numEl = document.getElementById(numElId);
        const rows = listEl.querySelectorAll('.stepper-row');

        function sum() {
            let s = 0;
            rows.forEach((row) => {
                const val = row.querySelector('.stepper-value');
                s += parseInt(val.textContent, 10) || 0;
            });
            return s;
        }

        function updateRemaining() {
            if (numEl) numEl.textContent = String(Math.max(0, total - sum()));
        }

        rows.forEach((row) => {
            const valEl = row.querySelector('.stepper-value');
            const up = row.querySelector('.step-up');
            const down = row.querySelector('.step-down');
            const min = parseInt(row.dataset.min, 10) || 0;
            const max = parseInt(row.dataset.max, 10) || 99;

            up.addEventListener('click', (e) => {
                e.preventDefault();
                if (!isEditorMode) return;
                let v = parseInt(valEl.textContent, 10) || 0;
                if (v >= max) return;
                if (sum() >= total) return;
                valEl.textContent = String(v + 1);
                updateRemaining();
                persistToLocalStorage();
            });

            down.addEventListener('click', (e) => {
                e.preventDefault();
                if (!isEditorMode) return;
                let v = parseInt(valEl.textContent, 10) || 0;
                if (v <= min) return;
                valEl.textContent = String(v - 1);
                updateRemaining();
                persistToLocalStorage();
            });
        });

        updateRemaining();
    }

    const attrList = document.querySelector('.stepper-list[data-pool="attr"]');
    const skillList = document.querySelector('.stepper-list[data-pool="skill"]');
    if (attrList) initPoolStepper(attrList, 'attr-points-num');
    if (skillList) initPoolStepper(skillList, 'skill-points-num');
});
