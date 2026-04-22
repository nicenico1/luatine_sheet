<script>
    import { syncStatus } from '../lib/firebase.js';

    const STATES = {
        idle:         { icon: '☁',  text: 'Cloud',      cls: 'sync--idle'   },
        syncing:      { icon: '⟳',  text: 'Saving…',    cls: 'sync--syncing'},
        synced:       { icon: '✓',  text: 'Saved',      cls: 'sync--synced' },
        error:        { icon: '✕',  text: 'Sync error', cls: 'sync--error'  },
        unconfigured: { icon: '💾', text: 'Local only', cls: 'sync--local'  },
    };

    // FIX: use $syncStatus (store auto-subscription) not $derived
    $: state = STATES[$syncStatus] ?? STATES.idle;
</script>

<div class="sync-indicator {state.cls}">
    <span class="sync-icon">{state.icon}</span>
    <span class="sync-text">{state.text}</span>
</div>
