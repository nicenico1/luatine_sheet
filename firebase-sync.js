/**
 * Firebase Sync — Fiche RP
 *
 * Cloud persistence: Firestore (parent doc + `pages` subcollection) + Storage (images).
 * The journal is sharded: `sheets/{id}/pages/{p0000..}` to stay under 1MB per document.
 * Gracefully degrades to localStorage only when unconfigured.
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

    /**
     * Parse legacy one-blob journalHTML into { order, html }[].
     */
    function splitJournalHTMLIntoPages(html) {
        if (!html || typeof html !== 'string') return [];
        try {
            var doc = new DOMParser().parseFromString('<div id="fiche-j-root">' + html + '</div>', 'text/html');
            var root = doc.getElementById('fiche-j-root');
            if (!root) return [];
            var spreads = root.querySelectorAll('.book-spread');
            var out = [];
            for (var i = 0; i < spreads.length; i++) {
                out.push({ order: i, html: spreads[i].outerHTML });
            }
            return out;
        } catch (e) {
            console.error('[FicheRP] splitJournalHTMLIntoPages', e);
            return [];
        }
    }

    function normalizeSnapshotToV4(snapshot) {
        if (!snapshot) return null;
        var s = Object.assign({}, snapshot);
        if (s.version === 4 && Array.isArray(s.journalPages)) {
            delete s.journalHTML;
            s.version = 4;
            return s;
        }
        if (s.journalHTML && typeof s.journalHTML === 'string') {
            s.journalPages = splitJournalHTMLIntoPages(s.journalHTML);
        } else {
            s.journalPages = s.journalPages || [];
        }
        s.version = 4;
        delete s.journalHTML;
        return s;
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
            console.log('[FicheRP] firebase-sync 2026-04-22 (pages subcollection, no journalHTML on parent)');
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

    async function saveToFirebase(rawSnapshot) {
        if (!_fb) return false;
        setStatus('syncing');
        try {
            var snap = normalizeSnapshotToV4(rawSnapshot);
            if (!snap) {
                setStatus('error');
                return false;
            }
            var pages = Array.isArray(snap.journalPages) ? snap.journalPages : [];

            // Filet de sécurité : on refuse d'écraser les pages cloud avec
            // un snapshot vide. Ce cas peut arriver après un QuotaExceededError
            // ou un bug qui aurait wipé le DOM. On sauvegarde quand même les
            // champs (metadata) mais on NE touche PAS à la sous-collection pages.
            var skipPagesWrite = pages.length === 0;
            if (skipPagesWrite) {
                console.warn('[FicheRP] Snapshot sans pages — sync metadata seulement (protection perte de données).');
            }

            var sheetRef = _fb.db.collection(col()).doc(docId());
            var parent = {
                version: 4,
                fields: snap.fields,
                images: snap.images,
                stepperVals: snap.stepperVals,
                attrPoints: snap.attrPoints,
                skillPoints: snap.skillPoints,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            if (typeof snap.lang !== 'undefined') parent.lang = snap.lang;
            parent.journalHTML = firebase.firestore.FieldValue.delete();
            await sheetRef.set(parent, { merge: true });

            if (!skipPagesWrite) {
                var existing = await sheetRef.collection('pages').get();
                var toDelete = existing.docs;
                for (var i = 0; i < toDelete.length; i += 400) {
                    var batchDel = _fb.db.batch();
                    toDelete.slice(i, i + 400).forEach(function (docSnap) {
                        batchDel.delete(docSnap.ref);
                    });
                    await batchDel.commit();
                }

                for (var j = 0; j < pages.length; j += 400) {
                    var batchSet = _fb.db.batch();
                    var chunk = pages.slice(j, j + 400);
                    chunk.forEach(function (p, k) {
                        var idx = j + k;
                        var ref = sheetRef.collection('pages').doc('p' + String(idx).padStart(4, '0'));
                        batchSet.set(ref, {
                            order: typeof p.order === 'number' ? p.order : idx,
                            html: p.html || '',
                            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    });
                    await batchSet.commit();
                }
            }

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
            var sheetRef = _fb.db.collection(col()).doc(docId());
            var snap = await sheetRef.get();
            if (!snap.exists) return null;
            var data = Object.assign({}, snap.data());
            delete data.updatedAt;

            var pagesSnap = await sheetRef.collection('pages').get();
            if (!pagesSnap.empty) {
                data.journalPages = pagesSnap.docs
                    .slice()
                    .sort(function (a, b) {
                        var ao = (a.data() && a.data().order) || 0;
                        var bo = (b.data() && b.data().order) || 0;
                        return ao - bo;
                    })
                    .map(function (d) {
                        var x = d.data();
                        return { order: x.order, html: x.html || '' };
                    });
                data.version = 4;
            } else if (data.journalHTML && typeof data.journalHTML === 'string') {
                data.journalPages = splitJournalHTMLIntoPages(data.journalHTML);
                data.version = 4;
            } else {
                data.journalPages = [];
                data.version = 4;
            }
            if (data.journalHTML) delete data.journalHTML;
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
