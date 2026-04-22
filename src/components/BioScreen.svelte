<script>
    /**
     * Character bio screen — dossier citoyen.
     * Svelte 5 runes syntax.
     */
    import { isEditor } from '../stores/editor.js';
    import { resolveImageSrc } from '../lib/images.js';
    import { trStore, lang } from '../lib/i18n.js';

    let { fields = $bindable({}), images = $bindable([]), onSave = () => {}, actions } = $props();

    let activeTab = $state('tab-personnage');

    function setTab(id) { activeTab = id; }

    /** @param {string} id */
    function isImageFieldId(id) {
        return id === 'model-img' || id.endsWith('-img');
    }

    /** @param {unknown} v */
    function normalizeFieldValue(v) {
        if (v && typeof v === 'object' && ('fr' in v || 'en' in v)) {
            return {
                fr: typeof v.fr === 'string' ? v.fr : '',
                en: typeof v.en === 'string' ? v.en : '',
            };
        }
        const s = typeof v === 'string' ? v : '';
        return { fr: s, en: '' };
    }

    /** @param {string} id */
    function getField(id, fallback = '') {
        const raw = fields[id];
        const L = $lang;
        if (raw && typeof raw === 'object' && ('fr' in raw || 'en' in raw)) {
            const b = /** @type {{ fr?: string; en?: string }} */ (raw);
            if (L === 'en') {
                if (b.en && String(b.en).trim()) return b.en;
                if (isImageFieldId(id)) return b.fr || '';
                return '';
            }
            return b.fr || '';
        }
        if (typeof raw === 'string') return raw;
        return fallback;
    }

    /** @param {string} id */
    function updateField(id, value) {
        const L = $lang;
        const prev = normalizeFieldValue(fields[id]);
        if (isImageFieldId(id)) {
            fields = { ...fields, [id]: { fr: value, en: value } };
        } else if (L === 'en') {
            fields = { ...fields, [id]: { ...prev, en: value } };
        } else {
            fields = { ...fields, [id]: { ...prev, fr: value } };
        }
        onSave();
    }

    let fileInput = $state(null);
    let pendingImgId = $state(null);

    async function promptImage(fieldId) {
        if (!$isEditor) return;
        pendingImgId = fieldId;
        fileInput.value = '';
        fileInput.click();
    }

    async function onFileSelected() {
        const file = fileInput.files?.[0];
        if (!file || !pendingImgId) return;
        const src = await resolveImageSrc(file);
        updateField(pendingImgId, src);
        pendingImgId = null;
        fileInput.value = '';
    }
</script>

<!-- svelte-ignore a11y_label_has_associated_control -->
<input type="file" accept="image/*" bind:this={fileInput} style="display:none" onchange={onFileSelected} />

<div id="char-bio-screen" class="screen active">
    <div class="bio-container">

        <!-- Left: model image -->
        <div class="bio-left">
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <img
                src={getField('model-img', `https://placehold.co/400x800/1a1c23/ffffff?text=${encodeURIComponent($trStore('img_placeholder_model'))}`)}
                alt={$trStore('alt_model')}
                class="editable-image model-image"
                class:cursor-pointer={$isEditor}
                onclick={() => promptImage('model-img')}
            />
        </div>

        <!-- Centre: nav -->
        <div class="bio-menu">
            <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
            <h2
                class="menu-title"
                contenteditable={$isEditor ? 'true' : 'false'}
                onblur={(e) => updateField('menu-title', e.target.innerHTML)}
            >
                {@html getField('menu-title', $trStore('menu_dossier'))}
            </h2>

            <nav class="vertical-nav">
                {#each [
                    ['tab-personnage', 'fa-id-card',             'nav_personnage'],
                    ['tab-famille',    'fa-users',               'nav_famille'],
                    ['tab-apparences', 'fa-wand-magic-sparkles', 'nav_apparences'],
                    ['tab-cheveux',    'fa-cut',                 'nav_cheveux'],
                    ['tab-vetements',  'fa-shirt',               'nav_vetements'],
                    ['tab-traits',     'fa-dice',                'nav_traits'],
                ] as [id, icon, labelKey]}
                    <!-- svelte-ignore a11y_invalid_attribute -->
                    <a href="#" class="nav-btn" class:active={activeTab === id}
                        onclick={(e) => { e.preventDefault(); setTab(id); }}>
                        <i class="fas {icon}"></i> {$trStore(labelKey)}
                    </a>
                {/each}
            </nav>
        </div>

        <!-- Right: content -->
        <div class="bio-content">

            <!-- PERSONNAGE -->
            <!-- svelte-ignore a11y_label_has_associated_control -->
            <div id="tab-personnage" class="tab-content" class:active={activeTab === 'tab-personnage'}>
                <div class="form-group">
                    <label>{$trStore('lab_nom_genre')}</label>
                    <div class="input-box flex-between">
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <span
                            contenteditable={$isEditor ? 'true' : 'false'}
                            class="editable-text"
                            onblur={(e) => updateField('bio-name', e.target.innerHTML)}
                        >{@html getField('bio-name', 'Lua Tyler')}</span>
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <span
                            class="gender-icons"
                            contenteditable={$isEditor ? 'true' : 'false'}
                            onblur={(e) => updateField('bio-gender', e.target.innerHTML)}
                        >{@html getField('bio-gender', '♂ ♀')}</span>
                    </div>
                </div>

                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>{$trStore('lab_genetique')}</label>
                    <div class="grid-2">
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <div class="dropdown-mock" contenteditable={$isEditor ? 'true' : 'false'}
                            onblur={(e) => updateField('dd-age', e.target.innerHTML)}
                        >{@html getField('dd-age', $trStore('dd_age'))}</div>
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <div class="dropdown-mock" contenteditable={$isEditor ? 'true' : 'false'}
                            onblur={(e) => updateField('dd-yeux', e.target.innerHTML)}
                        >{@html getField('dd-yeux', $trStore('dd_yeux'))}</div>
                    </div>
                    <div class="progress-bar-container">
                        <div class="progress-bar" style="width: 40%;"></div>
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <span class="progress-text" contenteditable={$isEditor ? 'true' : 'false'}
                            onblur={(e) => updateField('bio-height', e.target.innerHTML)}
                        >{@html getField('bio-height', '1m72')}</span>
                    </div>
                </div>

                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>{$trStore('lab_langue')}</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="dropdown-mock w-50" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('dd-langue', e.target.innerHTML)}
                    >{@html getField('dd-langue', $trStore('dd_langue'))}</div>
                </div>

                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>{$trStore('lab_physique')}</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('bio-physique', e.target.innerHTML)}
                    >{@html getField('bio-physique', $trStore('phys_combined'))}</div>
                </div>
            </div>

            <!-- FAMILLE -->
            <div id="tab-famille" class="tab-content" class:active={activeTab === 'tab-famille'}>
                <h3 class="section-heading">{$trStore('famille_heading')}</h3>
                {#each [['fam-mere', 'membre_mere'], ['fam-pere', 'membre_pere']] as [base, labelKey]}
                <div class="member-block">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>{$trStore(labelKey)}</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="input-box" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField(base + '-nom', e.target.innerHTML)}
                    >{@html getField(base + '-nom', $trStore('nom_membre_ph'))}</div>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock" style="min-height:100px" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField(base + '-info', e.target.innerHTML)}
                    >{@html getField(base + '-info', $trStore('info_membre_ph'))}</div>
                </div>
                {/each}
            </div>

            <!-- APPARENCES -->
            <div id="tab-apparences" class="tab-content" class:active={activeTab === 'tab-apparences'}>
                <h3 class="section-heading">{$trStore('app_heading')}</h3>
                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>{$trStore('lab_visage')}</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock" style="min-height:140px" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('app-visage', e.target.innerHTML)}
                    >{@html getField('app-visage', $trStore('visage_ph'))}</div>
                </div>
                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>{$trStore('lab_presence')}</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock" style="min-height:100px" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('app-caractere', e.target.innerHTML)}
                    >{@html getField('app-caractere', $trStore('presence_ph'))}</div>
                </div>
            </div>

            <!-- CHEVEUX -->
            <div id="tab-cheveux" class="tab-content" class:active={activeTab === 'tab-cheveux'}>
                <h3 class="section-heading">{$trStore('cheveux_heading')}</h3>
                <div class="grid-2">
                    {#each [['hair-style','lab_coupe','dd_style'], ['hair-color','lab_couleur','dd_couleur']] as [id, lblKey, phKey]}
                    <div class="form-group">
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label>{$trStore(lblKey)}</label>
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <div class="dropdown-mock" contenteditable={$isEditor ? 'true' : 'false'}
                            onblur={(e) => updateField(id, e.target.innerHTML)}
                        >{@html getField(id, $trStore(phKey))}</div>
                    </div>
                    {/each}
                </div>
                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>{$trStore('lab_longueur')}</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="dropdown-mock w-50" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('hair-length', e.target.innerHTML)}
                    >{@html getField('hair-length', $trStore('dd_longueur'))}</div>
                </div>
                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>{$trStore('lab_details_rp')}</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock" style="min-height:160px" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('hair-details', e.target.innerHTML)}
                    >{@html getField('hair-details', $trStore('cheveux_ph'))}</div>
                </div>
            </div>

            <!-- VÊTEMENTS -->
            <div id="tab-vetements" class="tab-content" class:active={activeTab === 'tab-vetements'}>
                <h3 class="section-heading">{@html $trStore('vet_heading')}</h3>
                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>{$trStore('lab_tenue')}</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock" style="min-height:140px" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('vet-tenue', e.target.innerHTML)}
                    >{@html getField('vet-tenue', $trStore('tenue_ph'))}</div>
                </div>
                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>{$trStore('lab_accessoires')}</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock" style="min-height:100px" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('vet-accessoires', e.target.innerHTML)}
                    >{@html getField('vet-accessoires', $trStore('acc_ph'))}</div>
                </div>
            </div>

            <!-- TRAITS -->
            <div id="tab-traits" class="tab-content" class:active={activeTab === 'tab-traits'}>
                <div class="tab-head-row">
                    <h3 class="section-heading">{$trStore('traits_heading')}</h3>
                </div>
                <p class="counter-line">
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <span contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('traits-count', e.target.innerHTML)}
                    >{@html getField('traits-count', $trStore('traits_count'))}</span>
                </p>
                <div class="trait-picker">
                    <div class="trait-picker-head">
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <span contenteditable={$isEditor ? 'true' : 'false'}
                            onblur={(e) => updateField('trait-num', e.target.innerHTML)}
                        >{@html getField('trait-num', $trStore('trait_num'))}</span>
                    </div>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <p class="trait-name" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('trait-name', e.target.innerHTML)}
                    >{@html getField('trait-name', $trStore('trait_nom'))}</p>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <p class="trait-sub" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('trait-sub', e.target.innerHTML)}
                    >{@html getField('trait-sub', $trStore('trait_sub'))}</p>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock trait-desc" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('trait-desc', e.target.innerHTML)}
                    >{@html getField('trait-desc', $trStore('trait_desc'))}</div>
                </div>
                <div class="traits-slots">
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="trait-slot" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('trait-slot-1', e.target.innerHTML)}
                    >{@html getField('trait-slot-1', '—')}</div>
                </div>
            </div>

        </div>

        <!-- Bottom actions -->
        <div class="form-actions">
            {@render actions?.()}
        </div>
    </div>
</div>
