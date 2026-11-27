'use strict';
/* ---------- Archivio su Google Drive (cartella riservata dell'app) ----------
   Offre all'app gli stessi comandi usati finora con Firebase, ma salva tutto in un solo file. */
const Archivio = (() => {
  const SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
  const API = 'https://www.googleapis.com/drive/v3', UP = 'https://www.googleapis.com/upload/drive/v3/files';
  /* La versione di prova usa file e memoria propri: non tocca l'archivio definitivo */
  const P = window.PF_PROVA ? 'collaudo-' : '', MEM = window.PF_PROVA ? 'pfdc_' : 'pfd_';
  const NOME = P + 'pfinance-dati.json', PREFISSO = P + 'pfinance-copia-', PRIMA = P + 'pfinance-prima-del-ripristino.json';
  const VERSIONE = 1, MAX_COPIE = 5, COLL = ['voci', 'storico', 'account'];
  let cid = '';
  let token = null, scadenza = 0;
  let base = null;        // dati confermati (letti o salvati)
  let bozza = null;       // modifiche non ancora confermate
  let file = null;        // { id, md5Checksum }
  let fresco = false;     // true solo se base arriva da Drive con il permesso attuale
  let quandoLetto = '';
  let gruppi = 0, rifiutate = 0, coda = Promise.resolve();
  const ascolti = [];

  const mem = {
    get(k) { try { return localStorage.getItem(MEM + k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(MEM + k, v); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem(MEM + k); } catch (e) {} }
  };
  const errore = (code, msg) => Object.assign(new Error(msg || code), { code });
  const copia = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));
  const mappa = o => !!o && typeof o === 'object' && !Array.isArray(o);
  const vuoto = () => ({ formato: 'pfinance', versione: VERSIONE, salvato: '', profilo: {}, voci: {}, storico: {}, account: {} });
  const avvisa = () => ascolti.forEach(f => { try { f(); } catch (e) {} });

  function controlla(d) {
    if (!mappa(d) || d.formato !== 'pfinance' || !Number.isInteger(d.versione)) throw errore('drive-file-non-valido');
    if (d.versione > VERSIONE) throw errore('drive-versione-nuova');
    if (!mappa(d.profilo) || !COLL.every(c => mappa(d[c]) && Object.values(d[c]).every(mappa))) throw errore('drive-file-non-valido');
    return d;
  }

  /* ----- memoria sul dispositivo ----- */
  function salvaLocale() {
    if (!mem.set('copia', JSON.stringify({ dati: base, quando: quandoLetto }))) mem.del('copia');
  }
  function leggiLocale() {
    try { const c = JSON.parse(mem.get('copia') || 'null'); if (c) return { dati: controlla(c.dati), quando: c.quando }; } catch (e) {}
    return null;
  }
  try { const t = JSON.parse(mem.get('token') || 'null'); if (t && t.s > Date.now()) { token = t.t; scadenza = t.s; } } catch (e) {}

  /* ----- accesso ----- */
  const permessoValido = () => !!token && Date.now() < scadenza;
  const scrivibile = () => permessoValido() && fresco;
  function togliPermesso() { token = null; scadenza = 0; fresco = false; mem.del('token'); avvisa(); }
  /* Va chiamata direttamente da un tocco, altrimenti il browser blocca la finestra di Google */
  function chiediPermesso() {
    return new Promise((ok, no) => {
      if (!cid) return no(errore('drive-non-configurato'));
      if (!window.google || !google.accounts) return no(errore('network-google'));
      google.accounts.oauth2.initTokenClient({
        client_id: cid, scope: SCOPE,
        callback: r => {
          if (r.error || !google.accounts.oauth2.hasGrantedAllScopes(r, SCOPE)) return no(errore('drive-permesso-negato'));
          token = r.access_token; scadenza = Date.now() + (Number(r.expires_in) - 60) * 1000; fresco = false;
          mem.set('token', JSON.stringify({ t: token, s: scadenza })); ok();
        },
        error_callback: e => no(errore(e.type === 'popup_failed_to_open' ? 'popup-blocked' : 'popup-closed'))
      }).requestAccessToken({ prompt: '' });
    });
  }

  /* ----- comunicazione con Drive ----- */
  async function chiama(url, opz = {}) {
    if (!permessoValido()) { togliPermesso(); throw errore('drive-scaduto'); }
    let r;
    try { r = await fetch(url, { ...opz, cache: 'no-store', headers: { ...(opz.headers || {}), Authorization: 'Bearer ' + token } }); }
    catch (e) { throw errore('network-drive'); }
    if (r.status === 401) { togliPermesso(); throw errore('drive-scaduto'); }
    if (!r.ok) throw errore('drive-errore-' + r.status);
    return r;
  }
  async function elenco(q) {
    const out = []; let pagina = '';
    do {
      const p = new URLSearchParams({ spaces: 'appDataFolder', q, orderBy: 'createdTime', pageSize: '100', fields: 'nextPageToken,files(id,name,md5Checksum,modifiedTime)' });
      if (pagina) p.set('pageToken', pagina);
      const j = await (await chiama(API + '/files?' + p)).json();
      out.push(...j.files); pagina = j.nextPageToken || '';
    } while (pagina);
    return out;
  }
  const trova = async nome => (await elenco("name='" + nome + "'"))[0] || null;
  const scarica = async id => (await chiama(API + '/files/' + id + '?alt=media')).json();
  async function carica(id, nome, dati) {
    const campi = '&fields=id,md5Checksum', testo = JSON.stringify(dati);
    if (id) return (await chiama(UP + '/' + id + '?uploadType=media' + campi, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: testo })).json();
    const sep = 'pf' + Date.now() + Math.random().toString(36).slice(2);
    const body = '--' + sep + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + JSON.stringify({ name: nome, parents: ['appDataFolder'] }) +
      '\r\n--' + sep + '\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n' + testo + '\r\n--' + sep + '--';
    return (await chiama(UP + '?uploadType=multipart' + campi, { method: 'POST', headers: { 'Content-Type': 'multipart/related; boundary=' + sep }, body })).json();
  }

  /* ----- apertura e rilettura ----- */
  async function rileggi() {
    const f = await trova(NOME);
    const d = f ? controlla(await scarica(f.id)) : vuoto();
    base = d; bozza = null; file = f; fresco = true; quandoLetto = new Date().toISOString();
    salvaLocale(); avvisa();
  }
  /* Restituisce 'drive' (aggiornato), 'copia' (sola lettura) oppure 'accesso' (serve accedere) */
  async function apri() {
    let causa = null;
    if (permessoValido()) {
      try { await rileggi(); return 'drive'; }
      catch (e) { if (!/^(network|drive-scaduto|drive-errore)/.test(e.code || '')) throw e; causa = e; }
    }
    const c = leggiLocale();
    if (c) { base = c.dati; quandoLetto = c.quando; bozza = null; file = null; fresco = false; avvisa(); return 'copia'; }
    if (causa && causa.code !== 'drive-scaduto') throw causa;
    return 'accesso';
  }
  async function collega() { await chiediPermesso(); await rileggi(); }
  function esci() {
    token = null; scadenza = 0; base = bozza = file = null; fresco = false; quandoLetto = '';
    mem.del('token'); mem.del('copia'); avvisa();
  }

  /* ----- salvataggio ----- */
  const oggi = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
  /* Una copia al giorno: i dati com'erano PRIMA della prima modifica della giornata */
  async function copiaGiornaliera(precedente) {
    const nome = PREFISSO + oggi() + '.json';
    if (await trova(nome)) return;
    await carica(null, nome, precedente);
    const tutte = (await elenco("name contains '" + PREFISSO + "'")).filter(f => f.name.startsWith(PREFISSO)).sort((a, b) => b.name.localeCompare(a.name));
    for (const f of tutte.slice(MAX_COPIE)) await chiama(API + '/files/' + f.id, { method: 'DELETE' });
  }
  const haDati = d => !!d && COLL.some(c => Object.keys(d[c]).length);
  async function conferma(senzaCopia) {
    if (!bozza) return false;
    const nuovo = bozza;
    try {
      if (!scrivibile()) throw errore(permessoValido() ? 'drive-sola-lettura' : 'drive-scaduto');
      const attuale = await trova(NOME);
      if ((attuale && (!file || attuale.id !== file.id || attuale.md5Checksum !== file.md5Checksum)) || (!attuale && file)) throw errore('drive-conflitto');
      /* La copia di sicurezza non deve mai impedire il salvataggio */
      if (file && !senzaCopia && haDati(base)) { try { await copiaGiornaliera(base); } catch (e) { console.warn('Copia giornaliera non riuscita', e.code); } }
      nuovo.salvato = new Date().toISOString();
      file = await carica(attuale && attuale.id, NOME, nuovo);
    } catch (e) {
      if (bozza === nuovo) bozza = null;
      if (e.code === 'drive-conflitto' || e.code === 'network-drive') fresco = false;
      avvisa(); throw e;
    }
    base = nuovo; if (bozza === nuovo) bozza = null; quandoLetto = new Date().toISOString();
    salvaLocale(); avvisa(); return true;
  }
  const inCoda = f => { const p = coda.then(f); coda = p.catch(() => {}); return p; };
  /* Raggruppa le modifiche di una stessa azione in un solo salvataggio */
  async function gruppo(azione, durante) {
    gruppi++;
    const r0 = rifiutate;
    try {
      const esito = await azione();
      if (gruppi === 1) {
        if (rifiutate !== r0) { bozza = null; throw errore(permessoValido() ? 'drive-sola-lettura' : 'drive-scaduto'); }
        if (bozza) { if (durante) durante(true); try { await inCoda(() => conferma()); } finally { if (durante) durante(false); } }
      }
      return esito;
    } catch (e) { if (gruppi === 1) bozza = null; throw e; }
    finally { gruppi--; }
  }
  async function modifica(cambia) {
    if (!scrivibile()) { rifiutate++; throw errore(permessoValido() ? 'drive-sola-lettura' : 'drive-scaduto'); }
    const lavoro = bozza || copia(base);
    cambia(lavoro); bozza = lavoro;
    if (!gruppi) await inCoda(() => conferma());
  }

  /* ----- stessi comandi usati dall'app con Firebase ----- */
  const ORA = '__ora__';
  const serverTimestamp = () => ORA;
  const pulisci = o => copia(JSON.parse(JSON.stringify(o), (k, v) => v === ORA ? new Date().toISOString() : v));
  const nuovoId = () => Array.from(crypto.getRandomValues(new Uint8Array(15)), b => 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[b % 56]).join('');
  const percorso = (parti) => {
    if (parti[0] !== 'users' || parti[1] !== 'drive') throw errore('permission-denied');
    if (parti.length > 2 && !COLL.includes(parti[2])) throw errore('permission-denied');
    return { coll: parti[2], id: parti[3] };
  };
  const doc = (_, ...p) => ({ tipo: 'doc', parti: p });
  const collection = (_, ...p) => ({ tipo: 'collection', parti: p });
  const prendi = (d, { coll, id }) => coll ? (Object.hasOwn(d[coll], id) ? d[coll][id] : undefined) : d.profilo;
  const metti = (d, { coll, id }, v) => {
    if (!coll) d.profilo = v;
    else if (id === '__proto__' || !id) throw errore('permission-denied');
    else d[coll][id] = v;
  };
  const unisci = (a, b) => { const o = { ...a }; for (const k in b) o[k] = mappa(b[k]) && mappa(o[k]) && Object.keys(b[k]).length ? unisci(o[k], b[k]) : b[k]; return o; };
  const lettura = () => { const d = bozza || base; if (!d) throw errore('drive-non-aperto'); return d; };
  const istantanea = (id, v) => ({ id, exists: () => v !== undefined, data: () => copia(v) });
  async function getDoc(r) { const p = percorso(r.parti); return istantanea(r.parti[r.parti.length - 1], prendi(lettura(), p)); }
  async function getDocs(r) {
    const { coll } = percorso(r.parti), d = lettura();
    if (!coll) throw errore('permission-denied');
    return { docs: Object.entries(d[coll]).map(([id, v]) => istantanea(id, v)) };
  }
  async function setDoc(r, v, opz) {
    const p = percorso(r.parti), val = pulisci(v);
    await modifica(d => metti(d, p, opz && opz.merge ? unisci(prendi(d, p) || {}, val) : val));
  }
  async function updateDoc(r, v) {
    const p = percorso(r.parti), val = pulisci(v);
    await modifica(d => { const old = prendi(d, p); if (old === undefined) throw errore('not-found'); metti(d, p, { ...old, ...val }); });
  }
  async function deleteDoc(r) {
    const p = percorso(r.parti);
    if (!p.coll) throw errore('permission-denied');
    await modifica(d => { delete d[p.coll][p.id]; });
  }
  async function addDoc(r, v) {
    const id = nuovoId();
    await setDoc(doc(null, ...r.parti, id), v);
    return { id };
  }

  /* ----- copie di sicurezza ----- */
  const esporta = () => JSON.stringify(lettura(), null, 2);
  async function copie() {
    const l = await elenco("name contains '" + P + "pfinance-'");
    return l.filter(f => f.name.startsWith(PREFISSO) || f.name === PRIMA).sort((a, b) => b.modifiedTime.localeCompare(a.modifiedTime))
      .map(f => ({ id: f.id, nome: f.name, quando: f.modifiedTime, prima: f.name === PRIMA }));
  }
  /* Sostituisce tutti i dati; prima conserva su Drive quelli attuali */
  async function ripristina(dati) {
    const nuovi = copia(controlla(dati));
    if (!scrivibile()) throw errore(permessoValido() ? 'drive-sola-lettura' : 'drive-scaduto');
    await inCoda(async () => {
      const vecchia = await trova(PRIMA);
      await carica(vecchia && vecchia.id, PRIMA, base);
      bozza = nuovi; await conferma();
    });
  }
  const ripristinaDaDrive = async id => ripristina(await scarica(id));

  /* ----- trasferimento dalla versione precedente ----- */
  /* Testo ordinato per confrontare due contenuti; i numeri non validi restano riconoscibili */
  const firma = v => Array.isArray(v) ? '[' + v.map(firma).join(',') + ']' : mappa(v) ? '{' + Object.keys(v).sort().filter(k => v[k] !== undefined).map(k => JSON.stringify(k) + ':' + firma(v[k])).join(',') + '}' : typeof v === 'number' && !Number.isFinite(v) ? '!' + v : JSON.stringify(v);
  /* Si può trasferire solo su un archivio senza dati, o su un trasferimento rimasto a metà */
  const trasferibile = () => { const d = lettura(); return !haDati(d) || (d.profilo.trasferimento || {}).stato === 'da-verificare'; };
  async function importa(nuovi) {
    if (!scrivibile()) throw errore(permessoValido() ? 'drive-sola-lettura' : 'drive-scaduto');
    await inCoda(async () => {
      await rileggi();
      if (!trasferibile()) throw errore('drive-gia-presente');
      const prima = copia(base), tieni = {};
      ['termini', 'terminiAt'].forEach(k => { if (prima.profilo[k] !== undefined) tieni[k] = prima.profilo[k]; });
      const atteso = { profilo: { ...nuovi.profilo, ...tieni, trasferimento: { stato: 'da-verificare' } }, voci: nuovi.voci, storico: nuovi.storico, account: nuovi.account };
      const parti = d => firma({ profilo: d.profilo, voci: d.voci, storico: d.storico, account: d.account });
      bozza = controlla({ ...vuoto(), ...copia(atteso) }); await conferma(true);
      await rileggi();
      if (parti(base) !== parti(atteso)) { bozza = prima; await conferma(true); throw errore('trasferimento-diverso'); }
      bozza = copia(base); bozza.profilo.trasferimento = { stato: 'ok', quando: new Date().toISOString() }; await conferma(true);
    });
  }

  return {
    importa, trasferibile,
    configura: o => { cid = o.clientId || ''; },
    apri, collega, rileggi, esci, gruppo, esporta, copie, ripristina, ripristinaDaDrive,
    ascolta: f => ascolti.push(f),
    stato: () => ({ scrivibile: scrivibile(), permesso: permessoValido(), minuti: permessoValido() ? Math.max(1, Math.round((scadenza - Date.now()) / 60000)) : 0, quando: quandoLetto, aperto: !!base }),
    comandi: { doc, collection, getDoc, getDocs, setDoc, updateDoc, deleteDoc, addDoc, serverTimestamp }
  };
})();

/* Nomi globali che il resto dell'app si aspetta */
Object.assign(window, Archivio.comandi, {
  auth: {}, db: null,
  GoogleAuthProvider: class {},
  terminate: async () => {}, clearIndexedDbPersistence: async () => {}
});
(() => {
  let ascolto = null;
  const utente = () => ({ uid: 'drive', displayName: 'Io', email: '' });
  /* La risposta parte dopo il caricamento di tutti i file dell'app */
  window.onAuthStateChanged = (_, f) => {
    ascolto = f;
    const via = async () => {
      let modo = 'accesso', guasto = null;
      try { modo = await Archivio.apri(); } catch (e) { guasto = e; }
      await f(modo === 'accesso' ? null : utente());
      if (guasto && window.driveGuasto) window.driveGuasto(guasto);
    };
    /* Mentre i file dell'app si stanno ancora caricando lo stato è « interactive »: si aspetta la fine */
    if (document.readyState === 'complete') setTimeout(via); else document.addEventListener('DOMContentLoaded', via);
  };
  window.signInWithPopup = async () => { await Archivio.collega(); await ascolto(utente()); };
  window.signOut = async () => { Archivio.esci(); };
})();
