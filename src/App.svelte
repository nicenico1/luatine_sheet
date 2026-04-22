<script>
    import { onMount, tick }    from 'svelte';
    import Modal                from './components/Modal.svelte';
    import SyncIndicator        from './components/SyncIndicator.svelte';
    import EditorBar            from './components/EditorBar.svelte';
    import BioScreen            from './components/BioScreen.svelte';
    import JournalScreen        from './components/JournalScreen.svelte';
    import LangSwitcher         from './components/LangSwitcher.svelte';

    import { currentScreen }    from './stores/screen.js';
    import { isEditor, unlockEditor, EDITOR_PASSWORD } from './stores/editor.js';
    import { addMenu, closeAddMenu } from './stores/addMenu.js';
    import { trStore, lang, setLang } from './lib/i18n.js';
    import { get } from 'svelte/store';

    const ADD_ITEM_KEYS = [
        { kind: 'paragraph',      icon: 'fa-paragraph',    key: 'add_menu_paragraph' },
        { kind: 'heading',        icon: 'fa-heading',      key: 'add_menu_heading' },
        { kind: 'caption',        icon: 'fa-quote-right',  key: 'add_menu_caption' },
        { kind: 'divider',        icon: 'fa-grip-lines',   key: 'add_menu_divider' },
        { kind: 'photo',          icon: 'fa-image',        key: 'add_menu_photo' },
        { kind: 'photo-portrait', icon: 'fa-portrait',     key: 'add_menu_photo_portrait' },
        { kind: 'photo-clip',     icon: 'fa-thumbtack',    key: 'add_menu_photo_clip' },
        { kind: 'id-card',        icon: 'fa-id-card',      key: 'add_menu_id_card' },
    ];

    import { initFirebase }     from './lib/firebase.js';
    import { loadSnapshot, persistSnapshot, debounce } from './lib/persist.js';
    import { resolveImageSrc }  from './lib/images.js';
    import {
        parseSpreadHTML,
        serializeSpread,
        defaultSpreads,
        deepCloneSpreads,
        mergeJournalSpreadsEnFromFr,
    } from './lib/spreadParser.js';
    import { getBilingualHtml } from './lib/bilingualFields.js';

    // ── modal ──────────────────────────────────────────────────────────────
    let modalComp = $state(null);
    const modal = (opts) => modalComp?.open(opts);

    // ── app state ──────────────────────────────────────────────────────────
    let fields           = $state({});
    let images           = $state([]);
    let stepperVals      = $state([]);
    let spreads          = $state([]);
    let journalPagesFR   = $state([]);
    let journalPagesEN   = $state([]);

    const addMenuItems = $derived(
        ADD_ITEM_KEYS.map((row) => ({ ...row, label: $trStore(row.key) }))
    );

    let charNameHtml = $derived(getBilingualHtml(fields['char-name'], $lang, 'LUA TYLER'));
    let charFactionHtml = $derived(getBilingualHtml(fields['char-faction'], $lang, 'U.N.I.S.C.A.'));

    let cardImgSrc = $derived.by(() => {
        const ph = `https://placehold.co/300x500/1a1c23/ffffff?text=${encodeURIComponent($trStore('img_placeholder_card'))}`;
        const v = fields['card-img'];
        if (typeof v === 'string' && v) return v;
        if (v && typeof v === 'object' && ('fr' in v || 'en' in v)) {
            const b = /** @type {{ fr?: string; en?: string }} */ (v);
            if ($lang === 'en' && b.en && String(b.en).trim()) return b.en;
            if (b.fr) return b.fr;
        }
        return ph;
    });

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

    /** @param {Record<string, unknown>} raw */
    function migrateFieldsToBilingual(raw) {
        /** @type {Record<string, { fr: string; en: string }>} */
        const out = {};
        for (const [id, val] of Object.entries(raw)) {
            if (val && typeof val === 'object' && ('fr' in val || 'en' in val)) {
                const o = /** @type {{ fr?: unknown; en?: unknown }} */ (val);
                out[id] = {
                    fr: typeof o.fr === 'string' ? o.fr : '',
                    en: typeof o.en === 'string' ? o.en : '',
                };
            } else if (typeof val === 'string') {
                out[id] = { fr: val, en: '' };
            }
        }
        return out;
    }

    function collectSnapshot() {
        const L = get(lang);
        // When UI is FR, `spreads` is the live French journal — always prefer it over
        // `journalPagesFR` so we never persist a stale/empty FR after edits.
        const frPages =
            L === 'fr' && spreads.length
                ? deepCloneSpreads(spreads)
                : journalPagesFR.length
                  ? deepCloneSpreads(journalPagesFR)
                  : defaultSpreads();
        const enPages = journalPagesEN.length
            ? mergeJournalSpreadsEnFromFr(journalPagesEN, frPages)
            : [];
        const activePages =
            L === 'en' && enPages.length ? enPages : frPages;
        return {
            version:        4,
            fields,
            journalPages:   activePages.map((s, i) => ({ order: i, html: serializeSpread(s) })),
            journalPagesFR: frPages.map((s, i) => ({ order: i, html: serializeSpread(s) })),
            journalPagesEN: enPages.map((s, i) => ({ order: i, html: serializeSpread(s) })),
            images,
            stepperVals,
            attrPoints:     '8',
            skillPoints:    '10',
            lang:           L,
        };
    }

    const saveDebounced = debounce(() => persistSnapshot(collectSnapshot()), 600);
    function onDataChanged() {
        const L = get(lang);
        if (L === 'en') journalPagesEN = deepCloneSpreads(spreads);
        else journalPagesFR = deepCloneSpreads(spreads);
        saveDebounced();
    }

    /** @type {'fr' | 'en' | null} */
    let prevContentLang = $state(null);

    /** Swap journal spreads when UI language changes; flush previous language first. */
    $effect(() => {
        const L = $lang;
        if (prevContentLang === null) {
            prevContentLang = L;
            return;
        }
        if (prevContentLang === L) return;
        if (prevContentLang === 'en') journalPagesEN = deepCloneSpreads(spreads);
        else journalPagesFR = deepCloneSpreads(spreads);
        if (L === 'en') {
            spreads = mergeJournalSpreadsEnFromFr(journalPagesEN, journalPagesFR);
        } else {
            spreads = journalPagesFR.length ? deepCloneSpreads(journalPagesFR) : defaultSpreads();
        }
        prevContentLang = L;
    });

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
        if (!data) {
            journalPagesFR = defaultSpreads();
            journalPagesEN = [];
            spreads = deepCloneSpreads(journalPagesFR);
            prevContentLang = get(lang);
            return;
        }
        if (data.fields) fields = migrateFieldsToBilingual(data.fields);
        if (data.images)      images      = data.images;
        if (data.stepperVals) stepperVals = data.stepperVals;
        if (data.lang === 'en' || data.lang === 'fr') setLang(data.lang);

        /**
         * French journal source order:
         * 1) journalPagesFR (explicit FR copy)
         * 2) legacy journalHTML blob
         * 3) journalPages only when saved lang is FR (legacy single-language saves)
         *
         * Never use `journalPages` as FR when lang is EN: that array is often the
         * active-language snapshot and may be empty English drafts — it wiped FR in localStorage.
         */
        const sortPages = (arr) =>
            arr
                .slice()
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map((p) => parseSpreadHTML(p.html ?? ''));

        if (Array.isArray(data.journalPagesFR) && data.journalPagesFR.length > 0) {
            journalPagesFR = sortPages(data.journalPagesFR);
        } else if (typeof data.journalHTML === 'string' && data.journalHTML.trim()) {
            const parsed = splitJournalHTML(data.journalHTML);
            if (parsed.length > 0) journalPagesFR = parsed;
        } else if (
            (data.lang === 'fr' || data.lang === undefined || data.lang === null) &&
            Array.isArray(data.journalPages) &&
            data.journalPages.length > 0
        ) {
            journalPagesFR = sortPages(data.journalPages);
        }

        if (Array.isArray(data.journalPagesEN) && data.journalPagesEN.length > 0) {
            journalPagesEN = sortPages(data.journalPagesEN);
        } else if (
            data.lang === 'en' &&
            Array.isArray(data.journalPages) &&
            data.journalPages.length > 0 &&
            (!Array.isArray(data.journalPagesFR) || data.journalPagesFR.length === 0)
        ) {
            journalPagesEN = sortPages(data.journalPages);
        } else {
            journalPagesEN = [];
        }

        if (!journalPagesFR.length) {
            journalPagesFR = defaultSpreads();
        }
        const L = data.lang === 'en' ? 'en' : 'fr';
        if (L === 'en') {
            spreads = mergeJournalSpreadsEnFromFr(journalPagesEN, journalPagesFR);
        } else {
            spreads = deepCloneSpreads(journalPagesFR);
        }
        prevContentLang = L;
    }

    $effect(() => {
        document.title = $trStore('meta_title');
    });

    // ── editor unlock ──────────────────────────────────────────────────────

    async function tryUnlock() {
        const pwd = await modal({ message: $trStore('script_prompt_pwd'), input: true });
        if (pwd === null) return;
        if (pwd === EDITOR_PASSWORD) {
            unlockEditor();
        } else {
            await modal({ message: $trStore('script_wrong_pwd'), confirmOnly: true });
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
            message: $trStore('script_export_alert'),
            confirmOnly: true,
        });
    }

    async function handleImport(text) {
        try {
            const data = JSON.parse(String(text));
            applySnapshot(data);
            await tick();
            onDataChanged();
            await modal({ message: $trStore('script_import_ok'), confirmOnly: true });
        } catch {
            await modal({ message: $trStore('script_import_bad'), confirmOnly: true });
        }
    }

    // ── screen navigation ──────────────────────────────────────────────────

    function go(screen) { $currentScreen = screen; }

    // ── card image picker (char-select screen) ─────────────────────────────

    let cardFileInput = $state(null);

    async function onCardImageSelected() {
        const file = cardFileInput.files?.[0];
        if (!file) return;
        const src = await resolveImageSrc(file);
        fields = { ...fields, 'card-img': { fr: src, en: src } };
        onDataChanged();
        cardFileInput.value = '';
    }

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
        <p class="splash-text">{@html $trStore('splash_text')}</p>
    </div>
</div>
{/if}

<!-- CHAR SELECT (menu principal — seul écran avec choix de langue) -->
{#if $currentScreen === 'char-select'}
<input type="file" accept="image/*" bind:this={cardFileInput} style="display:none" onchange={onCardImageSelected} />
<div id="char-select-screen" class="screen active">
    <LangSwitcher />
    <h1 class="page-title">{$trStore('chars_title')}</h1>
    <div class="char-cards-container">
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="char-card" onclick={() => { if (!$isEditor) go('char-bio'); }}>
            <div class="char-card-image">
                <!-- svelte-ignore a11y_click_events_have_key_events -->
                <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                <img
                    src={cardImgSrc}
                    alt="Lua Tyler"
                    class="editable-image"
                    class:cursor-pointer={$isEditor}
                    onclick={(e) => { if ($isEditor) { e.stopPropagation(); cardFileInput.value=''; cardFileInput.click(); } }}
                />
            </div>
            <div class="char-card-info">
                <h2>{@html charNameHtml}</h2>
                <p>{@html charFactionHtml}</p>
                <div class="char-status">
                    <i class="fas fa-check text-green"></i>
                    <i class="fas fa-skull text-red"></i>
                </div>
            </div>
        </div>
    </div>
    <div class="bottom-controls">
        <button type="button" class="btn-text" onclick={() => go('splash')}>
            <i class="fas fa-arrow-left"></i> {$trStore('btn_back')}
        </button>
        {#if !$isEditor}
        <button type="button" class="btn-text" onclick={() => go('char-bio')}>
            {$trStore('char_open_file')} <i class="fas fa-arrow-right"></i>
        </button>
        {/if}
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
            <i class="fas fa-arrow-left"></i> {$trStore('btn_back')}
        </button>
        <button type="button" class="btn-text" onclick={() => go('journal')}>
            {$trStore('btn_next')} <i class="fas fa-arrow-right"></i>
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
            <i class="fas fa-arrow-left"></i> {$trStore('btn_back_dossier')}
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
    title={$trStore('editor_fab')}
    aria-label={$trStore('editor_fab')}
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

<!-- Global add-element menu — rendered here so it's never clipped by book overflow -->
{#if $addMenu.open}
<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    class="add-element-menu"
    role="menu"
    style={$addMenu.style}
>
    {#each addMenuItems as item}
        <button
            type="button"
            class="aem-item"
            role="menuitem"
            onclick={() => { $addMenu.onAdd?.(item.kind); closeAddMenu(); }}
        >
            <i class="fas {item.icon}"></i> {item.label}
        </button>
    {/each}
</div>
{/if}

<!-- Modal -->
<Modal bind:this={modalComp} />
