/**
 * Firebase Sync — Fiche RP
 *
 * Provides cloud persistence via Firestore (data) + Firebase Storage (images).
 * Gracefully degrades: if Firebase is not configured the app keeps working
 * with localStorage only (the existing behaviour).
 */
(function () {
    'use strict';

    var _fb = null;
    var _status = 'unconfigured';
    var _hideTimer = null;

    /* ── helpers ── */

    function configured() {
        return typeof FIREBASE_CONFIG !== 'undefined'
            && FIREBASE_CONFIG
            && FIREBASE_CONFIG.apiKey
            && FIREBASE_CONFIG.apiKey !== ''
            && FIREBASE_CONFIG.projectId
            && FIREBASE_CONFIG.projectId !== '';
    }

    function col() {
        return (typeof FIREBASE_COLLECTION !== 'undefined' && FIREBASE_COLLECTION) || 'sheets';
    }

    function docId() {
        return (typeof FIREBASE_DOC_ID !== 'undefined' && FIREBASE_DOC_ID) || 'default';
    }

    /* ── init ── */

    function initFirebase() {
        if (!configured()) {
            _status = 'unconfigured';
            renderIndicator();
            return false;
        }
        if (typeof firebase === 'undefined') {
            console.warn('[FicheRP] Firebase SDK not loaded');
            _status = 'unconfigured';
            renderIndicator();
            return false;
        }
        try {
            if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
            _fb = {
                db: firebase.firestore(),
                storage: firebase.storage()
            };
            _status = 'idle';
            renderIndicator();
            return true;
        } catch (e) {
            console.error('[FicheRP] Firebase init error', e);
            _status = 'error';
            renderIndicator();
            return false;
        }
    }

    /* ── public API ── */

    function isFirebaseReady() { return _fb !== null; }

    async function saveToFirebase(snapshot) {
        if (!_fb) return false;
        setStatus('syncing');
        try {
            await _fb.db.collection(col()).doc(docId()).set({
                ...snapshot,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            setStatus('synced', true);
            return true;
        } catch (e) {
            console.error('[FicheRP] Firestore save error', e);
            setStatus('error');
            return false;
        }
    }

    async function loadFromFirebase() {
        if (!_fb) return null;
        try {
            var snap = await _fb.db.collection(col()).doc(docId()).get();
            if (!snap.exists) return null;
            var data = Object.assign({}, snap.data());
            delete data.updatedAt;
            return data;
        } catch (e) {
            console.error('[FicheRP] Firestore load error', e);
            return null;
        }
    }

    async function uploadImageToFirebase(file) {
        if (!_fb) return null;
        try {
            var ext = (file.name || 'img.png').split('.').pop() || 'png';
            var path = 'images/' + Date.now() + '_' + Math.random().toString(36).slice(2, 8) + '.' + ext;
            var ref = _fb.storage.ref(path);
            var result = await ref.put(file);
            return await result.ref.getDownloadURL();
        } catch (e) {
            console.error('[FicheRP] Storage upload error', e);
            return null;
        }
    }

    /* ── sync indicator UI ── */

    function setStatus(s, autoHide) {
        _status = s;
        renderIndicator(autoHide);
    }

    function renderIndicator(autoHide) {
        var el = document.getElementById('sync-indicator');
        if (!el) {
            if (!document.body) return;
            el = document.createElement('div');
            el.id = 'sync-indicator';
            document.body.appendChild(el);
        }

        var m = {
            idle:         ['☁',  'Cloud',       'sync--idle'],
            syncing:      ['⟳',  'Saving…',     'sync--syncing'],
            synced:       ['✓',  'Saved',       'sync--synced'],
            error:        ['✕',  'Sync error',  'sync--error'],
            unconfigured: ['💾', 'Local only',  'sync--local']
        };
        var s = m[_status] || m.idle;
        el.className = 'sync-indicator ' + s[2];
        el.innerHTML = '<span class="sync-icon">' + s[0] + '</span>'
                     + '<span class="sync-text">' + s[1] + '</span>';

        el.style.opacity = '1';
        clearTimeout(_hideTimer);
        if (autoHide) {
            _hideTimer = setTimeout(function () { el.style.opacity = '0.25'; }, 3000);
        }
    }

    /* ── bootstrap ── */
    initFirebase();

    /* ── expose ── */
    window.isFirebaseReady      = isFirebaseReady;
    window.saveToFirebase       = saveToFirebase;
    window.loadFromFirebase     = loadFromFirebase;
    window.uploadImageToFirebase = uploadImageToFirebase;
})();
