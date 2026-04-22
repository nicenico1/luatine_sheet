<script>
    import { syncStatus } from '../lib/firebase.js';
    import { trStore } from '../lib/i18n.js';

    const STATE_KEYS = {
        idle:         { icon: '☁',  key: 'sync_idle',        cls: 'sync--idle'   },
        syncing:      { icon: '⟳',  key: 'sync_syncing',     cls: 'sync--syncing'},
        synced:       { icon: '✓',  key: 'sync_synced',      cls: 'sync--synced' },
        error:        { icon: '✕',  key: 'sync_error',       cls: 'sync--error'  },
        unconfigured: { icon: '💾', key: 'sync_local',       cls: 'sync--local'  },
    };

    // FIX: use $syncStatus (store auto-subscription) not $derived
    $: row = STATE_KEYS[$syncStatus] ?? STATE_KEYS.idle;
</script>

<div class="sync-indicator {row.cls}">
    <span class="sync-icon">{row.icon}</span>
    <span class="sync-text">{$trStore(row.key)}</span>
</div>
