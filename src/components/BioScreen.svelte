<script>
    /**
     * Character bio screen — dossier citoyen.
     * Svelte 5 runes syntax.
     */
    import { isEditor } from '../stores/editor.js';
    import { resolveImageSrc } from '../lib/images.js';

    let { fields = $bindable({}), images = $bindable([]), onSave = () => {}, actions } = $props();

    let activeTab = $state('tab-personnage');

    function setTab(id) { activeTab = id; }

    function updateField(id, value) {
        fields = { ...fields, [id]: value };
        onSave();
    }

    function getField(id, fallback = '') {
        return fields[id] ?? fallback;
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
                src={getField('model-img', 'https://placehold.co/400x800/1a1c23/ffffff?text=Cliquez+pour+changer+le+mod%C3%A8le')}
                alt="Modèle Personnage"
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
                {@html getField('menu-title', 'DOSSIER<br>CITOYEN')}
            </h2>

            <nav class="vertical-nav">
                {#each [
                    ['tab-personnage', 'fa-id-card',             'PERSONNAGE'],
                    ['tab-famille',    'fa-users',               'FAMILLE'],
                    ['tab-apparences', 'fa-wand-magic-sparkles', 'APPARENCES'],
                    ['tab-cheveux',    'fa-cut',                 'CHEVEUX'],
                    ['tab-vetements',  'fa-shirt',               'VÊTEMENTS'],
                    ['tab-traits',     'fa-dice',                'TRAITS'],
                ] as [id, icon, label]}
                    <!-- svelte-ignore a11y_invalid_attribute -->
                    <a href="#" class="nav-btn" class:active={activeTab === id}
                        onclick={(e) => { e.preventDefault(); setTab(id); }}>
                        <i class="fas {icon}"></i> {label}
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
                    <label>Prénom Nom</label>
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
                    <label>DESCRIPTION GÉNÉTIQUE</label>
                    <div class="grid-2">
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <div class="dropdown-mock" contenteditable={$isEditor ? 'true' : 'false'}
                            onblur={(e) => updateField('dd-age', e.target.innerHTML)}
                        >{@html getField('dd-age', 'ÂGE')}</div>
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <div class="dropdown-mock" contenteditable={$isEditor ? 'true' : 'false'}
                            onblur={(e) => updateField('dd-yeux', e.target.innerHTML)}
                        >{@html getField('dd-yeux', 'COULEUR DES YEUX')}</div>
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
                    <label>SECONDE LANGUE</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="dropdown-mock w-50" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('dd-langue', e.target.innerHTML)}
                    >{@html getField('dd-langue', 'LANGUAGE')}</div>
                </div>

                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>DESCRIPTION PHYSIQUE</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('bio-physique', e.target.innerHTML)}
                    >{@html getField('bio-physique', "Décrivez l'apparence physique...")}</div>
                </div>
            </div>

            <!-- FAMILLE -->
            <div id="tab-famille" class="tab-content" class:active={activeTab === 'tab-famille'}>
                <h3 class="section-heading">INFORMATIONS FAMILIALES</h3>
                {#each [['fam-mere', 'MÈRE'], ['fam-pere', 'PÈRE']] as [base, label]}
                <div class="member-block">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>{label}</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="input-box" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField(base + '-nom', e.target.innerHTML)}
                    >{@html getField(base + '-nom', 'Nom...')}</div>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock" style="min-height:100px" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField(base + '-info', e.target.innerHTML)}
                    >{@html getField(base + '-info', 'Informations...')}</div>
                </div>
                {/each}
            </div>

            <!-- APPARENCES -->
            <div id="tab-apparences" class="tab-content" class:active={activeTab === 'tab-apparences'}>
                <h3 class="section-heading">APPARENCES GÉNÉRALES</h3>
                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>VISAGE &amp; SILHOUETTE</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock" style="min-height:140px" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('app-visage', e.target.innerHTML)}
                    >{@html getField('app-visage', 'Traits du visage...')}</div>
                </div>
                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>CARACTÈRE</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock" style="min-height:100px" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('app-caractere', e.target.innerHTML)}
                    >{@html getField('app-caractere', 'Tempérament...')}</div>
                </div>
            </div>

            <!-- CHEVEUX -->
            <div id="tab-cheveux" class="tab-content" class:active={activeTab === 'tab-cheveux'}>
                <h3 class="section-heading">CHEVEUX</h3>
                <div class="grid-2">
                    {#each [['hair-style','COUPE / STYLE','STYLE'], ['hair-color','COULEUR','COULEUR']] as [id, lbl, ph]}
                    <div class="form-group">
                        <!-- svelte-ignore a11y_label_has_associated_control -->
                        <label>{lbl}</label>
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <div class="dropdown-mock" contenteditable={$isEditor ? 'true' : 'false'}
                            onblur={(e) => updateField(id, e.target.innerHTML)}
                        >{@html getField(id, ph)}</div>
                    </div>
                    {/each}
                </div>
                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>LONGUEUR</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="dropdown-mock w-50" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('hair-length', e.target.innerHTML)}
                    >{@html getField('hair-length', 'LONGUEUR')}</div>
                </div>
                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>DÉTAILS (RP)</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock" style="min-height:160px" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('hair-details', e.target.innerHTML)}
                    >{@html getField('hair-details', 'Châtain, tirés en arrière...')}</div>
                </div>
            </div>

            <!-- VÊTEMENTS -->
            <div id="tab-vetements" class="tab-content" class:active={activeTab === 'tab-vetements'}>
                <h3 class="section-heading">VÊTEMENTS &amp; TENUE</h3>
                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>TENUE HABITUELLE</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock" style="min-height:140px" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('vet-tenue', e.target.innerHTML)}
                    >{@html getField('vet-tenue', 'Veste U.N.I.S.C.A...')}</div>
                </div>
                <div class="form-group">
                    <!-- svelte-ignore a11y_label_has_associated_control -->
                    <label>ACCESSOIRES</label>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock" style="min-height:100px" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('vet-accessoires', e.target.innerHTML)}
                    >{@html getField('vet-accessoires', 'Lunettes, badge...')}</div>
                </div>
            </div>

            <!-- TRAITS -->
            <div id="tab-traits" class="tab-content" class:active={activeTab === 'tab-traits'}>
                <div class="tab-head-row">
                    <h3 class="section-heading">TRAIT PRINCIPAL</h3>
                </div>
                <p class="counter-line">
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <span contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('traits-count', e.target.innerHTML)}
                    >{@html getField('traits-count', 'Trait sélectionné : 0 / 1')}</span>
                </p>
                <div class="trait-picker">
                    <div class="trait-picker-head">
                        <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                        <span contenteditable={$isEditor ? 'true' : 'false'}
                            onblur={(e) => updateField('trait-num', e.target.innerHTML)}
                        >{@html getField('trait-num', 'TRAIT #1')}</span>
                    </div>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <p class="trait-name" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('trait-name', e.target.innerHTML)}
                    >{@html getField('trait-name', 'LOGIQUE')}</p>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <p class="trait-sub" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('trait-sub', e.target.innerHTML)}
                    >{@html getField('trait-sub', 'Intellect — Le monde des idées')}</p>
                    <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
                    <div class="textarea-mock trait-desc" contenteditable={$isEditor ? 'true' : 'false'}
                        onblur={(e) => updateField('trait-desc', e.target.innerHTML)}
                    >{@html getField('trait-desc', 'Arme de votre force intellectuelle...')}</div>
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
