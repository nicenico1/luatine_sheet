<script>
    import { onMount, tick }    from 'svelte';
    import Modal                from './components/Modal.svelte';
    import SyncIndicator        from './components/SyncIndicator.svelte';
    import EditorBar            from './components/EditorBar.svelte';
    import BioScreen            from './components/BioScreen.svelte';
    import JournalScreen        from './components/JournalScreen.svelte';

    import { currentScreen }    from './stores/screen.js';
    import { isEditor, unlockEditor, EDITOR_PASSWORD } from './stores/editor.js';

    import { initFirebase }     from './lib/firebase.js';
    import { loadSnapshot, persistSnapshot, debounce } from './lib/persist.js';
    import { parseSpreadHTML, serializeSpread, defaultSpreads } from './lib/spreadParser.js';

    // ── modal ──────────────────────────────────────────────────────────────
    let modalComp = $state(null);
    const modal = (opts) => modalComp?.open(opts);

    // ── app state ──────────────────────────────────────────────────────────
    let fields      = $state({});
    let images      = $state([]);
    let stepperVals = $state([]);
    let spreads     = $state(defaultSpreads());

    // FIX: mirror isEditor onto document.body so all body.is-editor CSS works
    $effect(() => {
        if ($isEditor) {
            document.body.classList.add('is-editor');
            document.body.classList.remove('is-read-only');
        } else {
            document.body.classList.remove('is-editor');
            document.body.classList.add('is-read-only');
        }
    });

    // ── persistence ────────────────────────────────────────────────────────

    function collectSnapshot() {
        return {
            version:      4,
            fields,
            journalPages: spreads.map((s, i) => ({ order: i, html: serializeSpread(s) })),
            images,
            stepperVals,
            attrPoints:   '8',
            skillPoints:  '10',
        };
    }

    const saveDebounced = debounce(() => persistSnapshot(collectSnapshot()), 600);
    function onDataChanged() { saveDebounced(); }

    // FIX: handle v3 journalHTML blob by splitting into spreads
    function splitJournalHTML(html) {
        if (!html || typeof html !== 'string') return [];
        const doc  = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
        const root = doc.querySelector('div');
        return Array.from(root?.querySelectorAll('.book-spread') ?? []).map((s) =>
            parseSpreadHTML(s.outerHTML)
        );
    }

    function applySnapshot(data) {
        if (!data) return;
        if (data.fields)      fields      = data.fields;
        if (data.images)      images      = data.images;
        if (data.stepperVals) stepperVals = data.stepperVals;

        if (Array.isArray(data.journalPages) && data.journalPages.length > 0) {
            // v4 format — array of { order, html } objects
            spreads = data.journalPages
                .slice()
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((p) => parseSpreadHTML(p.html ?? ''));
        } else if (typeof data.journalHTML === 'string' && data.journalHTML.trim()) {
            // v3 format — one big HTML blob
            const parsed = splitJournalHTML(data.journalHTML);
            if (parsed.length > 0) spreads = parsed;
        }
    }

    // ── editor unlock ──────────────────────────────────────────────────────

    async function tryUnlock() {
        const pwd = await modal({ message: 'Mot de passe — mode éditeur :', input: true });
        if (pwd === null) return;
        if (pwd === EDITOR_PASSWORD) {
            unlockEditor();
        } else {
            await modal({ message: 'Mot de passe incorrect.', confirmOnly: true });
        }
    }

    // ── export / import ────────────────────────────────────────────────────

    function handleExport() {
        const data = collectSnapshot();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a    = document.createElement('a');
        a.href     = URL.createObjectURL(blob);
        a.download = 'fiche-export.json';
        a.click();
        URL.revokeObjectURL(a.href);
        modal({
            message: 'Fichier téléchargé.\n\n1) Renomme-le : fiche-export.json\n2) Mets-le dans data/\n3) git add, commit, push',
            confirmOnly: true,
        });
    }

    async function handleImport(text) {
        try {
            const data = JSON.parse(String(text));
            applySnapshot(data);
            await tick();
            onDataChanged();
            await modal({ message: 'Import terminé.', confirmOnly: true });
        } catch {
            await modal({ message: 'Fichier JSON invalide.', confirmOnly: true });
        }
    }

    // ── screen navigation ──────────────────────────────────────────────────

    function go(screen) { $currentScreen = screen; }

    // ── bootstrap ──────────────────────────────────────────────────────────

    onMount(async () => {
        initFirebase();
        const data = await loadSnapshot();
        applySnapshot(data);

        const params = new URLSearchParams(window.location.search);
        if (params.get('edit') === '1' && !$isEditor) {
            tryUnlock();
            params.delete('edit');
            const clean = window.location.pathname + (params.toString() ? `?${params}` : '') + window.location.hash;
            window.history.replaceState({}, '', clean);
        }

        setTimeout(() => go('char-select'), 3500);
    });
</script>

<!-- Background -->
<div class="background-image"></div>
<div class="background-overlay"></div>

<!-- SPLASH -->
{#if $currentScreen === 'splash'}
<div id="splash-screen" class="screen active">
    <div class="splash-content">
        <p class="splash-text">"On n'oublie rien de rien, on s'habitue, c'est tout - Jacques Brel"</p>
    </div>
</div>
{/if}

<!-- CHAR SELECT -->
{#if $currentScreen === 'char-select'}
<div id="char-select-screen" class="screen active">
    <h1 class="page-title">PERSONNAGES</h1>
    <div class="char-cards-container">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="char-card" onclick={() => go('char-bio')}>
            <div class="char-card-image">
                <img
                    src={fields['card-img'] || 'https://placehold.co/300x500/1a1c23/ffffff?text=Cliquez+pour+changer'}
                    alt="Lua Tyler"
                    class="editable-image"
                />
            </div>
            <div class="char-card-info">
                <h2>{@html fields['char-name'] || 'LUA TYLER'}</h2>
                <p>{@html fields['char-faction'] || 'U.N.I.S.C.A.'}</p>
                <div class="char-status">
                    <i class="fas fa-check text-green"></i>
                    <i class="fas fa-skull text-red"></i>
                </div>
            </div>
        </div>
    </div>
    <div class="bottom-controls">
        <button type="button" class="btn-text" onclick={() => go('splash')}>
            <i class="fas fa-arrow-left"></i> RETOUR
        </button>
    </div>
</div>
{/if}

<!-- BIO -->
{#if $currentScreen === 'char-bio'}
<BioScreen
    bind:fields
    bind:images
    onSave={onDataChanged}
>
    {#snippet actions()}
        <button type="button" class="btn-text" onclick={() => go('char-select')}>
            <i class="fas fa-arrow-left"></i> RETOUR
        </button>
        <button type="button" class="btn-text" onclick={() => go('journal')}>
            SUIVANT <i class="fas fa-arrow-right"></i>
        </button>
    {/snippet}
</BioScreen>
{/if}

<!-- JOURNAL -->
{#if $currentScreen === 'journal'}
<JournalScreen
    bind:spreads
    bind:fields
    bind:images
    {modal}
    onSave={onDataChanged}
>
    {#snippet footer()}
        <button type="button" class="btn-text" onclick={() => go('char-bio')}>
            <i class="fas fa-arrow-left"></i> RETOUR AU DOSSIER
        </button>
    {/snippet}
</JournalScreen>
{/if}

<!-- Lock FAB (shown only in read-only mode) -->
{#if !$isEditor}
<button
    type="button"
    id="btn-unlock-editor"
    class="editor-fab"
    title="Mode éditeur"
    aria-label="Mode éditeur"
    onclick={tryUnlock}
>
    <i class="fas fa-lock"></i>
</button>
{/if}

<!-- Editor bar -->
<EditorBar
    {modal}
    onExport={handleExport}
    onImport={handleImport}
/>

<!-- Sync indicator -->
<SyncIndicator />

<!-- Modal -->
<Modal bind:this={modalComp} />
