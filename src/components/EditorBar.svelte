<script>
    import { isEditor, lockEditor } from '../stores/editor.js';

    let { onExport = () => {}, onImport = () => {}, modal = null } = $props();

    async function handleLock() {
        const ok = await modal?.({
            message: 'Passer en lecture seule ? Les visiteurs ne pourront plus modifier la page.',
        });
        if (ok) lockEditor();
    }

    let importInput = $state(null);
    function triggerImport() { importInput.value = ''; importInput.click(); }

    function onFileChange() {
        const file = importInput.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => onImport(reader.result);
        reader.readAsText(file);
        importInput.value = '';
    }
</script>

{#if $isEditor}
<div id="editor-bar" class="editor-bar" role="status">
    <span class="editor-bar-title"><i class="fas fa-pen"></i> Mode éditeur</span>
    <div class="editor-bar-actions">
        <button type="button" class="btn-text btn-editor-action" onclick={onExport}>
            Exporter JSON
        </button>
        <button type="button" class="btn-text btn-editor-action" onclick={triggerImport}>
            Importer JSON
        </button>
        <input
            type="file"
            accept="application/json,.json"
            class="visually-hidden"
            aria-hidden="true"
            bind:this={importInput}
            onchange={onFileChange}
        />
    </div>
    <button type="button" class="btn-text btn-lock" onclick={handleLock}>
        Verrouiller
    </button>
    <p class="editor-publish-hint">
        <strong>Publication :</strong> la navigation privée et les autres lecteurs ne voient que ce qui est sur GitHub.
        Après tes modifs, clique <strong>Exporter JSON</strong>, enregistre le fichier sous <code>data/fiche-export.json</code>,
        puis <code>git add</code> / <code>commit</code> / <code>push</code>.
    </p>
</div>
{/if}
