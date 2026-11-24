'use strict';
const VER = '1.77';
/* Conti e voci a saldo zero: nascosti, salvo scelta dell'utente (ricordata su questo dispositivo) */
const showZero = () => { if (S.showZero === undefined) { try { S.showZero = localStorage.getItem('pf_zero') === '1'; } catch (e) { S.showZero = false; } } return S.showZero; };
const vz = arr => showZero() ? arr : arr.filter(v => v.valore !== 0);
const zeroToggle = () => `<label style="display:flex;gap:10px;align-items:center;margin:10px 0 0;font-size:14px"><input type="checkbox" id="zt" style="width:auto" ${showZero() ? 'checked' : ''}><span>Mostra conti a saldo zero</span></label>`;
const ASSET = ['Azioni', 'Obbligazioni', 'Monetario', 'Oro e materie prime', 'Immobiliare', 'Criptovalute', 'Multi-asset', 'Altro'];
const dn = v => v.assetClass || v.nome;
const T0 = Date.now();
/* Mese/Anno per singolo grafico: S.aggK[chiave] */
const aggOf = (key, all) => { const k = S.aggK && S.aggK[key]; return new Set((all || S.data.storico).map(s => s.mese.slice(0, 4))).size >= 2 && (k === 'yf' || k === 'ya') ? k : 'm'; };
/* Ordinamento colonne: S.sort[tabella] = { c: colonna, d: 'a' | 'd' } */
const sortSt = t => (S.sort && S.sort[t]) || null;
function sortArr(t, arr, G) {
  const s = sortSt(t); if (!s || !G[s.c]) return arr; const f = G[s.c], m = s.d === 'd' ? -1 : 1;
  return arr.map((x, i) => [x, i]).sort((p, q) => { const a = f(p[0]), b = f(q[0]);
    const r = typeof a === 'string' || typeof b === 'string' ? String(a).localeCompare(String(b), 'it', { numeric: true, sensitivity: 'base' }) : a - b;
    return r * m || p[1] - q[1]; }).map(p => p[0]);
}
const thS = (t, c, label, cls, off) => { if (off) return `<th class="${cls || ''}">${label}</th>`; const s = sortSt(t), on = s && s.c === c;
  return `<th class="${cls || ''} srt${on ? ' on' : ''}" data-act="sort" data-v="${t}|${c}">${label}<i>${on ? (s.d === 'd' ? '▾' : '▴') : ''}</i></th>`; };
/* Colore di sfondo leggero per ogni account (per posizione nell'elenco) */
const ACC_TINTS = ['#eaf2fb', '#fdf0e1', '#eaf6e8', '#f5ebf8', '#fff6d6', '#e4f5f4'];
const accTintIdx = k => { const D = S.data, i = k === 'main' ? 0 : D.accounts.findIndex(a => a.id === k) + 1; return Math.max(0, i) % ACC_TINTS.length; };
const accTint = k => ACC_TINTS[accTintIdx(k)];
const ADMIN_UID = '29kFEZwmKPZvHFjQ9M65ERhIbhG3';
const CATS = {
  attivo: ['Liquidità', 'Investimenti', 'Immobili', 'Beni', 'Altro'],
  passivo: ['Mutuo', 'Prestito', 'Carta di credito', 'Altro debito']
};
const MESI = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/* Nascondi importi: solo le percentuali restano visibili (scelta ricordata su questo dispositivo) */
const hideAmt = () => { if (S.hide === undefined) { try { S.hide = localStorage.getItem('pf_hide') === '1'; } catch (e) { S.hide = false; } } return S.hide; };
const eur = v => hideAmt() ? '••••' : new Intl.NumberFormat('it-IT', {style:'currency', currency:'EUR', maximumFractionDigits: 0, useGrouping:'always'}).format(v || 0);
const pct = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(1).replace('.', ',') + '%';
const monthKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const monthName = k => { const [y, m] = k.split('-'); return MESI[+m - 1] + ' ' + y; };
const totals = voci => {
  const a = voci.filter(v => v.tipo === 'attivo').reduce((s, v) => s + v.valore, 0);
  const p = voci.filter(v => v.tipo === 'passivo').reduce((s, v) => s + v.valore, 0);
  return { attivi: a, passivi: p, netto: a - p };
};
/* Attivi divisi in: Liquidità, Portafoglio (categoria Investimenti), Beni (Immobili, Beni, Altro) */
const catTot = voci => { const at = voci.filter(v => v.tipo === 'attivo'), s = f => at.filter(f).reduce((a, v) => a + v.valore, 0); return { liq: s(v => v.categoria === 'Liquidità'), port: s(v => v.categoria === 'Investimenti'), beni: s(v => v.categoria !== 'Liquidità' && v.categoria !== 'Investimenti') }; };
/* Home modificabile: elenco dei riquadri disponibili (nome, larghezza su 12 colonne, altezza: 1 = come il grafico, 2 = alta, 0 = libera, solo computer) e ordine di partenza */
const HOME_BLK = { and: { n: 'Andamenti e confronti', w: 5, h: 1 }, col: { n: 'Attivi, passivi e netto', w: 3, h: 1 }, ind: { n: 'Indicatori', w: 5, h: 0, pc: 1 }, val: { n: 'Valori per categoria', w: 4, h: 1 }, alb: { n: 'Albero del patrimonio', w: 5, h: 2, pc: 1 }, tor: { n: 'Torte', w: 7, h: 2 } };
const HOME_DEF = ['and', 'col', 'val', 'alb', 'tor', 'ind'];
/* Ogni voce salvata è "id" oppure "id:colonna,riga,larghezza,altezza" (riga e altezza in passi da 10 px) */
const hmParse = s => { const [k, g] = String(s).split(':'); if (!HOME_BLK[k]) return null; const a = g ? g.split(',').map(Number) : null; return { k, g: a && a.length === 4 && a.every(Number.isFinite) ? { c: a[0], r: a[1], w: a[2], h: a[3] } : null }; };
const homeRaw = () => { const src = S.ro && S.own ? S.own : S.data, h = src && Array.isArray(src.home) ? src.home.map(hmParse).filter(Boolean) : null; return h || HOME_DEF.map(k => ({ k, g: null })); };
const homeList = () => homeRaw().map(x => x.k);
const homeStr = raw => raw.map(x => x.g ? `${x.k}:${x.g.c},${x.g.r},${x.g.w},${x.g.h}` : x.k);
/* Dopo ogni spostamento: nessuna sovrapposizione; i riquadri che si scontrano scendono, poi tutto risale verso l'alto */
function hlFix(items, fixedK) {
  const hit = (a, b) => a.c < b.c + b.w && b.c < a.c + a.w && a.r < b.r + b.h && b.r < a.r + a.h;
  const src = items.map(x => ({ ...x })), placed = [], fx = src.find(x => x.k === fixedK);
  if (fx) placed.push(fx);
  src.filter(x => x !== fx).sort((a, b) => a.r - b.r || a.c - b.c).forEach(x => { x.r = 0; while (placed.some(p => hit(x, p))) x.r++; placed.push(x); });
  return src;
}
/* Disposizione dei riquadri sul computer: dalla memoria, oppure quella di partenza (righe da 12 colonne) */
function homeLayout(r1, ok) {
  const raw = homeRaw().filter(x => !ok || ok(x.k)), dh = k => k === 'ind' ? 30 : HOME_BLK[k].h === 1 ? Math.ceil((r1 + 14) / 10) : 40;
  if (!raw.some(x => x.g)) {
    const out = []; let y = 0, row = [], s = 0;
    const flush = () => { if (!row.length) return; let c = 0; row.forEach((i, j) => { if (j === row.length - 1) i.w += 12 - s; i.c = c; i.r = y; c += i.w; out.push(i); }); y += Math.max(...row.map(i => i.h)); row = []; s = 0; };
    raw.forEach(x => { const it = { k: x.k, w: HOME_BLK[x.k].w, h: dh(x.k) }; if (s + it.w > 12) flush(); row.push(it); s += it.w; });
    flush(); return out;
  }
  const items = raw.filter(x => x.g).map(x => { const w = Math.min(12, Math.max(2, Math.round(x.g.w))), h = Math.max(8, Math.round(x.g.h)); return { k: x.k, w, h, c: Math.min(12 - w, Math.max(0, Math.round(x.g.c))), r: Math.max(0, Math.round(x.g.r)) }; });
  let bot = Math.max(0, ...items.map(i => i.r + i.h));
  raw.filter(x => !x.g).forEach(x => { const it = { k: x.k, w: HOME_BLK[x.k].w, h: dh(x.k), c: 0, r: bot }; bot += it.h; items.push(it); });
  return hlFix(items, null);
}
/* Account esclusi dall'aggregato: elenco di chiavi ('main' = account principale) salvato nel profilo */
const isEsc = k => !!(S.data && S.data.esclusi && S.data.esclusi.includes(k));
const inSc = (v, fa) => fa === 'all' ? !isEsc(v.account || 'main') : (v.account || 'main') === fa;
const inScK = (k, fa) => fa === 'all' ? !isEsc(k) : k === fa;
const aggVoci = D => D.voci.filter(v => !isEsc(v.account || 'main'));
const aggD = () => ({ ...S.data, voci: aggVoci(S.data) });
/* Storico di un singolo account: mesi per cui esistono i suoi totali */
function histOf(D, key) {
  const m = new Map();
  [...D.storico, ...(D.accOnly || [])].forEach(s => { const a = s.acc && s.acc[key]; if (a && typeof a.netto === 'number') m.set(s.mese, { mese: s.mese, ...a }); });
  return [...m.values()].sort((x, y) => x.mese.localeCompare(y.mese));
}
/* Totali per account (salvati ogni mese nello storico) */
function totAcc(D) {
  const o = {}, keys = new Set(D.voci.map(v => v.account || 'main'));
  keys.forEach(k => { const vs = D.voci.filter(v => (v.account || 'main') === k); o[k] = { ...totals(vs), ...catTot(vs) }; });
  return o;
}
const cls = v => v >= 0 ? 'pos' : 'neg';
const pnum = s => parseFloat(String(s).replace(/\./g, '').replace(',', '.'));
const r2 = v => Math.round(v * 100) / 100;
const parseD = s => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const fmtD = s => s.split('-').reverse().join('/');
const addM = (d, k) => { const x = new Date(d.getFullYear(), d.getMonth() + k, 1); const last = new Date(x.getFullYear(), x.getMonth() + 1, 0).getDate(); x.setDate(Math.min(d.getDate(), last)); return x; };
const cnt = (a, b) => { let k = (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()); while (k > 0 && addM(a, k) > b) k--; while (addM(a, k + 1) <= b) k++; return Math.max(0, k); };
/* Piano di rimborso: solo quota capitale, rate mensili uguali dalla data di inizio alla data di fine */
function piano(v, oggi = new Date()) {
  const a = parseD(v.inizio), f = parseD(v.fine), t = new Date(oggi.getFullYear(), oggi.getMonth(), oggi.getDate());
  const N = Math.max(1, cnt(a, f)), rata = r2(v.capitale / N);
  if (t < a) return { N, k: 0, rata, residuo: 0, partito: false };
  const k = Math.min(N, cnt(a, t));
  return { N, k, rata, residuo: r2(v.capitale * (N - k) / N), partito: true };
}
/* ---------- Prezzi: CSV pubblicato dal foglio "Lista prodotti quotati" (ticker, ISIN, valuta, prezzo + righe dei cambi EURUSD, EURCHF…) ---------- */
const PREZZI_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSf5Jzc_Y30pFBidAh_M8rYM-9J30iyC67mtfWRZVhk0NEAFACjweMNc7gF7BYlpz4V7mOasY3IKtGN/pub?gid=0&single=true&output=csv';
const leggiPrezzi = () => { try { const x = JSON.parse(localStorage.getItem('pf_prezzi')); return x && x.map ? x : null; } catch (e) { return null; } };
/* Accetta sia 159,39 sia 159.39 sia 1.234,56 */
const numPrezzo = s => {
  s = String(s ?? '').replace(/[\s€]/g, ''); if (!s) return NaN;
  const c = s.lastIndexOf(','), p = s.lastIndexOf('.');
  if (c >= 0 && p >= 0) s = c > p ? s.replace(/\./g, '').replace(',', '.') : s.replace(/,/g, '');
  else if (c >= 0) s = s.replace(',', '.');
  return /^\d+(\.\d+)?$/.test(s) ? parseFloat(s) : NaN;
};
function parsePrezzi(txt) {
  const map = {}, cambi = {}, R = csvRighe(txt);
  const h = (R[0] || []).map(x => String(x || '').trim().toUpperCase()), ci = n => { const i = h.indexOf(n); return i; };
  const iT = Math.max(ci('TICKER'), 0), iI = ci('ISIN') >= 0 ? ci('ISIN') : 1, iV = ci('VALUTA') >= 0 ? ci('VALUTA') : 2, iP = ci('PREZZO') >= 0 ? ci('PREZZO') : 3;
  R.forEach(r => {
    const t = String(r[iT] || '').trim().toUpperCase(), k = String(r[iI] || '').trim().toUpperCase(), p = numPrezzo(r[iP]);
    if (/^EUR[A-Z]{3}$/.test(t) && !k) { if (p > 0) cambi[t.slice(3)] = p; return; }
    if (/^[A-Z0-9]{12}$/.test(k) && p > 0) map[k] = { p, v: String(r[iV] || 'EUR').trim().toUpperCase() };
  });
  const out = {};
  for (const k in map) { const { p, v } = map[k]; if (v === 'EUR' || !v) out[k] = p; else if (cambi[v]) out[k] = Math.round(p / cambi[v] * 1e6) / 1e6; }
  return out;
}
const hasProd = v => !!(v && v.prodotti && v.prodotti.length);
const isPort = v => !!(v && v.portafoglio);
const nfm = x => new Intl.NumberFormat('it-IT', { maximumFractionDigits: 4 }).format(x);
/* Prodotto con prezzo nel foglio: quote x prezzo. Senza prezzo: valore manuale */
const prodVal = p => { const pr = S.prezzi && S.prezzi.map[String(p.isin || '').toUpperCase()]; const f = p.nom ? .01 : 1; return pr > 0 ? p.quote * pr * f : p.pmc > 0 && p.quote > 0 ? p.quote * p.pmc * f : (p.manuale || 0); };
/* Compressi di default: account, categorie e portafogli (true = compresso) */
const accCol = k => S.acol && S.acol[k] !== undefined ? S.acol[k] : true;
const pCol = id => S.pcol && S.pcol[id] !== undefined ? S.pcol[id] : true;
const aliqDef = cl => cl === 'Obbligazioni' ? 12.5 : 26;
const prodAliq = p => p.aliq != null && p.aliq !== '' && isFinite(+p.aliq) ? +p.aliq : aliqDef(p.classe);
/* Capital gain = (prezzo - prezzo medio di carico) x quote; imposte latenti solo sulle plusvalenze */
const prodFisc = p => { const pr = p.isin && S.prezzi && S.prezzi.map[String(p.isin).toUpperCase()]; if (!(pr > 0) || !(p.pmc > 0)) return null; const gain = (pr - p.pmc) * p.quote * (p.nom ? .01 : 1); return { gain, imp: Math.max(0, gain) * prodAliq(p) / 100 }; };
const valoreProd = v => r2(v.prodotti.reduce((s, p) => s + prodVal(p), 0));
/* Grafici e report ragionano per classe di investimento: un portafoglio si divide in una riga per classe (solo per il calcolo, non si salva) */
const espandi = voci => voci.flatMap(v => {
  if (!isPort(v) || !hasProd(v)) return [v];
  const m = new Map();
  v.prodotti.forEach(p => { const c = p.classe || v.assetClass || 'Altro'; m.set(c, (m.get(c) || 0) + prodVal(p)); });
  return [...m].map(([c, val]) => ({ ...v, id: v.id + '#' + c, virt: v.id, assetClass: c, valore: r2(val), prodotti: undefined }));
});
/* Voci di investimento "vecchio stile" (una per conto e classe): da riunire nei portafogli */
const isInvLegacy = v => v.tipo === 'attivo' && v.categoria === 'Investimenti' && !isPort(v);
function portProposta(D) {
  const g = new Map();
  D.voci.filter(isInvLegacy).forEach(v => {
    const dove = (v.dove || v.nome || '').trim() || 'Senza conto', k = (v.account || '') + '|' + dove.toLowerCase();
    if (!g.has(k)) g.set(k, { dove, account: v.account || '', voci: [], prodotti: [], valore: 0, obiettivo: 0 });
    const G = g.get(k), cl = v.assetClass || 'Altro';
    G.voci.push(v); G.valore = r2(G.valore + v.valore); if (v.obiettivo && !G.obiettivo) G.obiettivo = v.obiettivo;
    if (hasProd(v)) v.prodotti.forEach(p => G.prodotti.push({ isin: p.isin, nome: p.nome || '', classe: p.classe || cl, quote: p.quote, nom: !!p.nom, pmc: p.pmc, aliq: p.aliq, manuale: p.manuale || 0 }));
    else G.prodotti.push({ isin: '', nome: v.assetClass || v.nome, classe: cl, quote: 0, manuale: v.valore });
  });
  const out = [...g.values()];
  out.forEach(G => { const ex = D.voci.find(v => isPort(v) && (v.account || '') === G.account && (v.dove || '').trim().toLowerCase() === G.dove.toLowerCase()); G.exId = ex ? ex.id : ''; });
  return out;
}
const applyPiano = v => { if (v.piano) v.valore = piano(v).residuo; else if (hasProd(v) && S.prezzi) v.valore = valoreProd(v); return v; };
const prezziStato = () => {
  if (S.prezziBusy) return 'Aggiorno i prezzi…';
  if (!S.prezzi) return S.prezziErr || 'Prezzi non ancora letti';
  const d = new Date(S.prezzi.quando), oggi = d.toDateString() === new Date().toDateString();
  return 'Prezzi delle ' + d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }) + (oggi ? '' : ' del ' + d.toLocaleDateString('it-IT')) + (S.prezziN ? ' · ' + S.prezziN + ' prodotti' : '') + (S.prezziErr ? ' · ' + S.prezziErr : '');
};
/* Legge i prezzi (all'apertura e con il tasto) e ricalcola le voci con prodotti. Nulla viene salvato per i prezzi; lo storico del mese segue i totali. */
async function aggiornaPrezzi(manuale) {
  if (S.demo) { if (manuale) { S.msg = 'Nella demo i prezzi sono fissi.'; render(); } return; }
  const D = S.data; if (!D || S.prezziBusy) return;
  const tutte = () => [...D.voci, ...(D.arch || [])];
  if (!manuale && !tutte().some(hasProd)) return;
  S.prezziBusy = true; if (manuale) render();
  try {
    const ac = new AbortController(), tm = setTimeout(() => ac.abort(), 12000);
    let r; try { r = await fetch(PREZZI_URL + '&_=' + Date.now(), { cache: 'no-store', signal: ac.signal }); } finally { clearTimeout(tm); }
    if (!r.ok) throw new Error('errore ' + r.status);
    const map = parsePrezzi(await r.text());
    if (!Object.keys(map).length) throw new Error('nessun prezzo nel file ricevuto');
    const vecchi = (S.prezzi && S.prezzi.map) || {}; S.prezzi = { map: { ...vecchi, ...map }, quando: Date.now() }; S.prezziErr = ''; S.prezziN = Object.keys(map).length;
    try { localStorage.setItem('pf_prezzi', JSON.stringify(S.prezzi)); } catch (e) {}
    if (manuale) S.msg = 'Prezzi aggiornati.';
  } catch (e) { const why = e && e.name === 'AbortError' ? 'tempo scaduto' : e instanceof TypeError ? 'il link non risponde o è bloccato dal browser' : (e && e.message) || 'errore'; S.prezziErr = 'Prezzi non aggiornati (' + why + '): uso gli ultimi disponibili.'; if (manuale) S.msg = S.prezziErr; }
  S.prezziBusy = false;
  if (S.data !== D) return;
  tutte().forEach(applyPiano);
  try { await syncStorico(); } catch (e) {}
  if (manuale || !(S.cfm || S.edit || S.pop || S.popm || (S.exp && S.exp.form))) render();
}
const RENAME = { 'Conto corrente': 'Liquidità', 'Immobile': 'Immobili', 'Altro attivo': 'Altro' };
/* Porta i vecchi dati alle nuove categorie: Liquidità, Investimenti, Immobili, Beni, Altro */
async function migraCategorie(uid, voci) {
  const save = async v => { const { id, ...rest } = v; await setDoc(doc(db, 'users', uid, 'voci', id), rest); };
  for (const v of [...voci]) {
    if (v.tipo !== 'attivo') continue;
    if (RENAME[v.categoria]) { v.categoria = RENAME[v.categoria]; await save(v); }
    else if (v.categoria === 'Portafoglio') {
      const c = voci.find(x => x.id === v.conto);
      v.categoria = 'Investimenti'; delete v.conto; if (c) v.dove = c.nome; await save(v);
    } else if (v.categoria === 'Conto di investimento') {
      const lq = v.liquidita !== undefined ? v.liquidita : v.valore, iv = v.investito || 0, ob = v.obiettivo;
      delete v.liquidita; delete v.investito; delete v.obiettivo;
      if (iv > 0) {
        const inv = { tipo: 'attivo', categoria: 'Investimenti', nome: v.nome, dove: v.nome, account: v.account || '', valore: iv };
        if (ob) inv.obiettivo = ob;
        if (lq > 0) { v.categoria = 'Liquidità'; v.valore = lq; await save(v); const r = await addDoc(collection(db, 'users', uid, 'voci'), inv); voci.push({ id: r.id, ...inv }); }
        else { Object.assign(v, inv); await save(v); }
      } else { v.categoria = 'Liquidità'; v.valore = lq; await save(v); }
    }
  }
}
const prevMonth = () => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return monthKey(d); };

const S = { user: null, profile: null, data: null, tab: 'pat', users: [], edit: null, loading: true, msg: '', prezzi: leggiPrezzi() };

function errText(e) {
  const c = e && e.code || '';
  if (c.includes('popup-closed') || c.includes('cancelled-popup')) return 'Accesso annullato.';
  if (c.includes('popup-blocked')) return 'Il browser ha bloccato la finestra di accesso. Consentila e riprova.';
  if (c.includes('credential-already-in-use')) return 'Questo account Google è già collegato a un altro profilo.';
  if (c.includes('unauthorized-domain')) return 'Indirizzo dell\'app non autorizzato in Firebase.';
  if (c.includes('operation-not-allowed')) return 'Accesso con Google non ancora attivato.';
  if (c.includes('network')) return 'Connessione assente. Riprova.';
  if (c.includes('too-many-requests')) return 'Troppi tentativi. Riprova tra qualche minuto.';
  if (c.includes('read-only')) return S.demo ? 'Nella demo non si può modificare.' : 'Sei in sola visualizzazione: non puoi modificare.';
  if (c.includes('permission-denied')) return 'Permesso negato. Chiedi all\'amministratore.';
  return 'Errore: ' + (c || (e && e.message) || 'sconosciuto');
}

/* ---------- Dati ---------- */
async function loadData(uid, nome) {
  const [vs, ss, as] = await Promise.all([
    getDocs(collection(db, 'users', uid, 'voci')),
    getDocs(collection(db, 'users', uid, 'storico')),
    getDocs(collection(db, 'users', uid, 'account'))
  ]);
  const accounts = as.docs.map(d => ({ id: d.id, nome: d.data().nome })).sort((a, b) => a.nome.localeCompare(b.nome));
  const voci = vs.docs.map(d => ({ id: d.id, ...d.data() }));
  if (!S.ro) await migraCategorie(uid, voci);
  voci.forEach(applyPiano);
  const arch = voci.filter(v => v.archiviata);
  for (let i = voci.length - 1; i >= 0; i--) if (voci[i].archiviata) voci.splice(i, 1);
  const stAll = ss.docs.map(d => ({ mese: d.id, ...d.data() })).sort((a, b) => a.mese.localeCompare(b.mese));
  /* mesi con soli totali di un account (importati per account) non fanno parte dello storico aggregato */
  const storico = stAll.filter(x => typeof x.netto === 'number'), accOnly = stAll.filter(x => typeof x.netto !== 'number' && x.acc);
  let esclusi = [], home = null, bil = {};
  try { const ps = await getDoc(doc(db, 'users', uid)); const pd = ps.exists() ? ps.data() : {}, e = pd.esclusi; if (Array.isArray(e)) esclusi = e.filter(k => k === 'main' || accounts.some(a => a.id === k)); if (Array.isArray(pd.home)) home = pd.home.filter(s => HOME_BLK[String(s).split(':')[0]]).map(String); if (pd.bil && typeof pd.bil === 'object') for (const k in pd.bil) if ((k === 'main' || accounts.some(a => a.id === k)) && pd.bil[k] && typeof pd.bil[k] === 'object') { bil[k] = {}; for (const c in pd.bil[k]) if (ASSET.includes(c) && isFinite(+pd.bil[k][c])) bil[k][c] = +pd.bil[k][c]; } } catch (e) {}
  S.data = { uid, nome, voci, arch, storico, accOnly, accounts, esclusi, home, bil };
  await syncStorico();
}

async function syncStorico() {
  const D = S.data;
  if (!D || S.ro || S.demo) return;
  const inc = aggVoci(D), t = { ...totals(inc), ...catTot(inc) }, acc = totAcc(D);
  const mk = monthKey();
  const cur = D.storico.find(x => x.mese === mk);
  if (!D.voci.length && !cur) return;
  if (cur && cur.attivi === t.attivi && cur.passivi === t.passivi && cur.liq === t.liq && cur.port === t.port && cur.beni === t.beni && JSON.stringify(cur.acc || null) === JSON.stringify(acc)) return;
  await setDoc(doc(db, 'users', D.uid, 'storico', mk), { ...t, acc, aggiornato: serverTimestamp() });
  if (cur) Object.assign(cur, t, { acc }); else { D.storico.push({ mese: mk, ...t, acc }); D.storico.sort((a, b) => a.mese.localeCompare(b.mese)); }
}

async function loadUsers() {
  const q = await getDocs(collection(db, 'users'));
  S.users = q.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.uid !== S.user.uid)
    .sort((a, b) => (a.approved === b.approved ? (a.nome || '').localeCompare(b.nome || '') : a.approved ? 1 : -1));
  try { S.rich = (await getDocs(collection(db, 'richiesteIsin'))).docs.map(d => ({ isin: d.id, ...d.data() })).sort((a, b) => a.isin.localeCompare(b.isin)); } catch (e) { S.rich = []; S.richErr = true; }
}
/* Segnala all'amministratore gli ISIN senza prezzo nel foglio (solo ISIN, nome e classe: niente quote) */
async function segnalaIsin(prodotti) {
  if (!S.prezzi || !S.prezzi.map) return;
  for (const p of prodotti) {
    const isin = String(p.isin || '').toUpperCase();
    if (!/^[A-Z0-9]{12}$/.test(isin) || S.prezzi.map[isin] > 0) continue;
    try { await setDoc(doc(db, 'richiesteIsin', isin), { isin, nome: String(p.nome || '').slice(0, 80), classe: String(p.classe || '').slice(0, 40), creato: serverTimestamp() }); } catch (e) {}
  }
}

const isAdmin = () => !!S.user && S.user.uid === ADMIN_UID;

const TERMS_V = 2;
const termsHtml = () => `<h2>Termini e condizioni</h2><p class="lbl">Versione ${TERMS_V} · P.Finance (beta)</p>
<h3>1. Cos'è questa app</h3><p>Uno strumento per tenere traccia del proprio patrimonio e per imparare i concetti di base della finanza personale. Non è consulenza finanziaria, fiscale o legale: i commenti del report sono informazioni generali a scopo educativo.</p>
<h3>2. Nessuna garanzia</h3><p>L'app è in versione di prova e può contenere errori o interruzioni. I calcoli dipendono dai dati che inserisci tu, di cui sei responsabile. Il titolare non risponde delle decisioni prese in base a ciò che l'app mostra.</p>
<h3>3. Titolare e contatti</h3><p>Il titolare è Mario T. Per qualsiasi richiesta (informazioni, correzione o cancellazione dei dati) contattalo direttamente.</p>
<h3>4. Quali dati vengono salvati</h3><p>Il nome del tuo account Google e la tua email (registrati dal servizio di accesso; la password resta a Google e il titolare non la vede), le voci di attivo e passivo, i sotto-account e lo storico mensile. Una copia dei dati può restare sul tuo telefono per l'uso senza connessione e viene cancellata quando esci dall'app. Non vengono raccolti altri dati e non vengono venduti né ceduti a terzi.</p>
<h3>5. Chi può vedere i tuoi dati</h3><p>Ogni iscritto vede solo i propri dati. Nemmeno l'amministratore può consultarli tramite l'app. Resta un limite tecnico: i dati sono conservati sul servizio Firebase di Google e chi gestisce quel servizio potrebbe accedervi dal suo pannello di controllo. Il titolare si impegna a non farlo.</p>
<h3>6. Accesso e sicurezza</h3><p>Proteggi il tuo account Google: chi vi accede può entrare anche qui. L'accesso è soggetto ad approvazione e il titolare può sospendere un account.</p>
<h3>7. Cancellazione</h3><p>Puoi chiedere in qualsiasi momento la cancellazione del tuo account e di tutti i tuoi dati. Puoi anche scaricare i tuoi dati dalla funzione di esportazione.</p>
<h3>8. Modifiche ai termini</h3><p>Se i termini cambiano, alla successiva apertura dell'app ti verrà chiesto di accettarli di nuovo per continuare a usarla.</p>`;
function termsGate() {
  $('app').innerHTML = `<div class="auth card" style="max-width:640px">${termsHtml()}<label style="display:flex;gap:10px;align-items:flex-start;margin:14px 0"><input type="checkbox" id="tc" style="width:auto;margin-top:3px"><span>Ho letto e accetto i termini e condizioni.</span></label><div class="msg">${esc(S.msg)}</div>
    <div class="acts"><button class="b" data-act="accept">Accetto e continuo</button><button class="b s" data-act="logout">Esci</button></div></div>`;
}
function pageTerms() { return `<div class="card terms">${termsHtml()}<p class="note">Hai accettato la versione ${S.profile && S.profile.termini ? S.profile.termini : TERMS_V}.</p></div>`; }


/* ---------- Info app e novità ---------- */
const CHANGELOG = [
  ['1.64','24 nov 2026',['Panoramica: i filtri di periodo (6 mesi, anno in corso, 12 mesi, da sempre) sono tasti più grandi sopra il riquadro Andamento del patrimonio; Variazioni assolute mostra solo la variazione di ogni categoria nel periodo scelto; nuovo riquadro Valori per categoria al posto delle torte, che scendono in basso al posto di Ricostruisci lo storico (il modulo resta nella pagina Storico)']],
  ['1.63','24 nov 2026',['Scegliendo un account la Panoramica e la pagina Patrimonio mantengono la stessa struttura dell\'aggregato, con grafici e indicatori calcolati sullo storico di quell\'account (se ne ha uno); il modulo per ricostruire lo storico compare solo nell\'aggregato']],
  ['1.62','24 nov 2026',['Computer: anche nelle pagine Saldi, Portafogli, Beni e Passivi c\'è la riga per scegliere l\'account (Aggregato, il tuo, gli altri), uguale a quella del telefono']],
  ['1.61','24 nov 2026',['Telefono: le pagine Saldi, Portafogli, Beni e Passivi hanno la scelta dell\'account (anche quelli fuori dall\'aggregato) e ricordano quello selezionato; nella vista di un account senza voci una nota spiega perché il patrimonio è 0']],
  ['1.60','24 nov 2026',['Account escludibili dall\'aggregato: toccando un account (anche il principale) compare il tasto « Escludi dall\'aggregato »; l\'account escluso resta consultabile da solo ma non entra in totali, grafici, albero, report e storico aggregato','Lo storico mensile salva anche i totali di ogni account; in Importazioni lo storico CSV si può caricare per un singolo account, e nella vista del singolo account compare il suo storico mese per mese']],
  ['1.59','24 nov 2026',['Home: quando è selezionato un account compare il tasto « Aggregato » per tornare al patrimonio totale; toccando di nuovo lo stesso account si torna all\'aggregato']],
  ['1.58','24 nov 2026',['Variazioni assolute: accanto al titolo la variazione del patrimonio netto nel periodo scelto (stesso filtro di Andamento del patrimonio)','Toccando il riquadro si apre un unico grafico con Liquidità, Portafoglio, Beni e Passivi, con il filtro per periodo']],
  ['1.57','24 nov 2026',['Schermata iniziale: tasto Installa l\'app (con istruzioni per iPhone) prima dell\'accesso; animazione di apertura con l\'euro che si ingrandisce e poi la P di P.Finance']],
  ['1.56','23 nov 2026',['Portafogli: tasti Compra e Vendi accanto ad Aggiungi portafoglio (quote, prezzo medio di carico e, se vuoi, liquidità del conto con lo stesso nome)']],
  ['1.55','23 nov 2026',['Passivi: nuova scelta "Debito già in corso" (debito residuo di oggi e data dell\'ultima rata): i mesi già registrati non cambiano e il debito scende da solo dal mese prossimo']],
  ['1.54','23 nov 2026',['Icone di Beni (casa) e Passivi (freccia a zigzag verso il basso), anche sul telefono; in Passivi, Aggiungi passivo offre il piano di rimborso (importo, data di inizio e di fine) con calcolo automatico del capitale residuo']],
  ['1.53','23 nov 2026',['Nuova pagina Beni (immobili, beni, altro) dopo i Portafogli e prima dei Passivi, con la stessa grafica di Saldi e Passivi']],
  ['1.52','23 nov 2026',['Nuova pagina Passivi (computer e telefono): totale in alto, passivi di ogni account con Modifica, Aggiorna valori e Aggiungi passivo, torte per passivo']],
  ['1.51','23 nov 2026',['Aggiornamento dell\'app più affidabile: i file nuovi vengono sempre scaricati dal sito (evita versioni miste dopo un aggiornamento)']],
  ['1.77','24 nov 2026',['Tolto "Nuova voce" dalle pagine Albero e Liquidità; tolto "Ricostruisci lo storico" dalla pagina Storico (restano la modifica di un mese toccando la riga e l\'importazione da file)']],
  ['1.76','24 nov 2026',['Portafogli: nuova sottopagina Bilanciamento (tolta dal menu laterale): obiettivi per classe e per account, solo acquisti oppure anche vendite, prodotti suggeriti con quote e imposte stimate, registrazione delle operazioni']],
  ['1.75','24 nov 2026',['Portafogli (computer): il portafoglio aggregato compare sempre in fondo, anche con un solo portafoglio']],
  ['1.74','24 nov 2026',['Portafogli (computer): con un solo account selezionato ogni portafoglio ha la sua torta a destra dell\'elenco e l\'aggregato dell\'account resta in fondo; la vista Aggregato è come prima']],
  ['1.73','24 nov 2026',['Portafogli (computer): ogni portafoglio ha la sua torta per classi a destra dell\'elenco']],
  ['1.72','24 nov 2026',['Quando guardi i dati di un\'altra persona in sola visualizzazione, la home usa la tua disposizione']],
  ['1.71','24 nov 2026',['Andamenti e confronti: i filtri di periodo sono dentro il riquadro, accanto al titolo']],
  ['1.70','24 nov 2026',['Panoramica: Attivi, passivi e netto si evidenzia al passaggio del mouse; "Andamento del patrimonio" diventa "Andamenti e confronti" con filtri di periodo propri (di partenza "Da sempre"); i filtri in cima partono da "Mese corrente"']],
  ['1.69','24 nov 2026',['Panoramica: filtri di periodo sotto il titolo della pagina; "Grafici a torta" diventa "Distribuzioni"; tolti titolo e sottotitolo da Valori per categoria e il "da ..." dal patrimonio netto; variazioni più grandi']],
  ['1.68','24 nov 2026',['Panoramica: il delta di ogni categoria (in euro e in percentuale) è nel riquadro Valori per categoria, accanto al valore; il riquadro Variazioni assolute è stato eliminato; sotto il patrimonio netto c\'è solo la variazione del periodo scelto; nuovi periodi Mese corrente e 30 giorni, tolto Ultimi 6 mesi']],
  ['1.67','24 nov 2026',['Panoramica: "Modifica home" prende il posto di "Nuova voce"; i grafici ingranditi si adattano alla larghezza reale del riquadro (niente più scritte giganti)']],
  ['1.66','24 nov 2026',['Home libera sul computer: in modalità modifica i riquadri si spostano trascinandoli e si ridimensionano trascinando l\'angolo in basso a destra; non possono sovrapporsi e la disposizione è salvata nel tuo account']],
  ['1.65','24 nov 2026',['Home modificabile: il tasto "Modifica home" permette di scegliere quali riquadri mostrare e in che ordine (frecce su/giù, Aggiungi, Togli, Ripristina); la disposizione è salvata nel tuo account e vale per tutti gli account e per telefono e computer']],
  ['1.50','23 nov 2026',['Variazioni assolute: ogni riquadro mostra il valore, la variazione sul mese precedente e quella totale dall\'inizio delle registrazioni']],
  ['1.49','23 nov 2026',['Modalità demo: nella schermata di accesso "Prova la demo" apre l\'app con dati inventati (10 anni, da 50.000 a 500.000 euro); nulla viene salvato e non si vedono dati reali']],
  ['1.48','23 nov 2026',['Nuova pagina Condivisione (menu laterale e menu a panino): ognuno ha un codice personale e può dare ad altri la sola visualizzazione dei propri dati, togliendola quando vuole; chi la riceve apre i dati dell\'altro in sola lettura con un tasto per tornare ai propri']],
  ['1.47','23 nov 2026',['Importazioni: l\'importazione del portafoglio non si blocca più se esistono investimenti inseriti a valore; quello con lo stesso nome del conto viene sostituito, gli altri restano']],
  ['1.46','23 nov 2026',['Nuova pagina Importazioni (menu laterale e menu a panino, computer e telefono): importa lo storico e il portafoglio da file CSV, con anteprima prima di confermare']],
  ['1.45','23 nov 2026',['Portafogli: in modifica si può cambiare l\'account del portafoglio (si sposta anche il conto di liquidità collegato)']],
  ['1.44','23 nov 2026',['Saldi: ogni conto è un riquadro come i portafogli, con nome, saldo e tasto Modifica (che apre Aggiorna, Modifica, Archivia, Elimina)']],
  ['1.43','23 nov 2026',['Computer, Saldi: pagina in due colonne, a destra la torta per conto di ogni account e in fondo quella della liquidità aggregata']],
  ['1.42','23 nov 2026',['Computer, Portafogli: pagina in due colonne, a destra la torta per classi di ogni account e in fondo quella del portafoglio aggregato; tolta la maschera Importa titoli']],
  ['1.41','23 nov 2026',['Computer, Portafogli: la modifica di un prodotto ha i campi in colonna con le etichette sopra, come sul telefono']],
  ['1.40','23 nov 2026',['Albero ingrandito: all\'apertura si adatta per intero alla pagina; tasti − Adatta ＋ per lo zoom e trascinamento con il mouse per spostarsi']],
  ['1.39','23 nov 2026',['Computer: Liquidità diventa Saldi e Portafogli prende la grafica del telefono, con totale in alto e tasti per aggiornare, modificare e aggiungere']],
  ['1.38','23 nov 2026',['Computer, Panoramica: tolta la cella "Aggregato"; albero ingrandito adattato alla larghezza della pagina (caratteri più grandi, si scorre in verticale)']],
  ['1.37','23 nov 2026',['Telefono, Saldi: in Aggiorna saldi ogni conto ha la ✕ per eliminarlo (con Annulla subito dopo)']],
  ['1.36','23 nov 2026',['Telefono, Portafogli: tasto Elimina portafoglio nella schermata di modifica']],
  ['1.35','23 nov 2026',['Telefono: tolto \'Aggregato\' dai riquadri degli account (toccando di nuovo l\'account scelto si torna al totale) e la sezione Account dal menu; Saldi: nuovo tasto Aggiungi conto; Portafogli: totale in testa e nuovo tasto Aggiungi portafoglio']],
  ['1.34','23 nov 2026',['Telefono, Portafogli: in modifica si vede prima l\'elenco dei prodotti (con ricerca se sono tanti) e si apre solo quello da modificare']],
  ['1.33','23 nov 2026',['Telefono, Portafogli: ora si possono modificare i prodotti (ISIN, nome, classe, quote, prezzo di carico, aliquota, valore a mano), aggiungerli e toglierli, con il nuovo totale prima di salvare']],
  ['1.31','23 nov 2026',['Prezzi del foglio visibili anche agli altri utenti (prima solo all\'amministratore)','Quando un utente salva un prodotto senza prezzo nel foglio, l\'ISIN (solo ISIN, nome e classe) viene segnalato all\'amministratore, che li aggiunge al foglio dalla pagina Amministrazione']],
  ['1.30','23 nov 2026',['Panoramica: i riquadri di variazione mostrano anche il valore attuale in grande']],
  ['1.29','23 nov 2026',['Portafogli: il nome del portafoglio si cambia dal modulo di modifica (si rinomina anche il conto di liquidità collegato)']],
  ['1.28','22 nov 2026',['Panoramica: l\'albero torna riquadro piccolo (come gli indicatori) e si ingrandisce con un clic; accanto c\'è "Ricostruisci lo storico"']],
  ['1.27','22 nov 2026',['Computer: in fondo alla Panoramica c\'è "Ricostruisci lo storico" (mesi a mano o importazione da file)']],
  ['1.26','22 nov 2026',['Importazione storico: accetta anche le colonne liquidità, portafoglio e beni (servono ai riquadri di variazione della Panoramica)']],
  ['1.25','22 nov 2026',['Panoramica: albero in fondo più piccolo; torte piccole: la fetta sotto il mouse si rilascia quando il mouse esce']],
  ['1.24','22 nov 2026',['Panoramica: al posto dei grafici a torta ci sono 4 riquadri con la variazione su mese precedente (Liquidità, Portafoglio, Beni, Passivi); le torte passano in basso a destra e l\'albero, ingrandito, in fondo alla pagina. Le variazioni compaiono dal mese successivo al primo salvataggio']],
  ['1.23','22 nov 2026',['Se il nome non si trova, il campo spiega il motivo']],
  ['1.22','22 nov 2026',['Il nome del prodotto si compila da solo partendo dall\'ISIN (da Borsa Italiana, tramite il foglio)']],
  ['1.21','22 nov 2026',['Se il prezzo manca (es. mercato fermo, 0,00%) il valore usa il prezzo medio di carico']],
  ['1.20','22 nov 2026',['La casella «Obbligazione: nominale €» ora sta sotto il campo delle quote']],
  ['1.19','22 nov 2026',['Obbligazioni: nella scheda del portafoglio spunta «Obbligazione» e scrivi il nominale in € (es. 7000): il valore usa il prezzo in % del foglio','Capital gain e imposte latenti seguono lo stesso calcolo']],
  ['1.19','23 nov 2026',['Telefono, Saldi: nuovo tasto Aggiorna saldi per scrivere i nuovi valori dei conti di liquidità e salvarli tutti insieme']],
  ['1.18','22 nov 2026',['Portafogli: nuove colonne prezzo medio di carico, capital gain netto (rosso se negativo), aliquota e imposte latenti; PMC e aliquota si inseriscono nel modulo del prodotto (aliquota predefinita: 12,5% obbligazioni, 26% il resto)','Liquidità e Portafogli: account, categorie e portafogli sono compressi di default','Portafogli: gli ISIN nuovi si aggiungono anche al foglio Google "Lista prodotti quotati" (serve collegare lo script, vedi Info) così il prezzo si recupera da Borsa Italiana']],
  ['1.18','23 nov 2026',['Telefono, Patrimonio: solo il patrimonio netto e gli stessi riquadri della Panoramica del computer (quattro grafici, attivi e passivi a colonne, variazione per sezione, quattro torte); tolto l\'albero e l\'elenco delle voci','Telefono: Distribuzione diventa Saldi, con i conti di liquidità per account; al posto di Andamento c\'è la pagina Portafogli, in sola lettura (si modifica dal computer)']],
  ['1.17','22 nov 2026',['Telefono, Patrimonio: tolti i due riquadri con il totale di Attivi e Passivi e il riquadro Importa titoli']],
  ['1.16','22 nov 2026',['Telefono: sistemato il simbolo di aggiornamento (appariva come un grande cerchio nero) e reso più compatto l\'intestazione']],
  ['1.15','22 nov 2026',['Torte: la fetta si deseleziona appena il mouse esce dalla fetta (o dalla voce in legenda)']],
  ['1.14','22 nov 2026',['Albero ingrandito: toccando una voce la finestra di modifica ora compare subito sopra l\'albero (prima restava nascosta) e offre tutte le azioni: Aggiorna, Modifica, Archivia, Elimina']],
  ['1.13','22 nov 2026',['Grafici: Mese/Anno vale per il singolo grafico (prima cambiava in tutti)','Il menu Conti diventa Liquidità e non mostra più i portafogli; le tabelle hanno le linee a griglia come in Excel']],
  ['1.12','22 nov 2026',['Computer, Panoramica: accanto a "Andamento del patrimonio" il periodo dei grafici (ultimi 6 mesi, anno in corso, ultimi 12 mesi, da sempre; predefinito da sempre)','Grafico aperto: restano solo i pulsanti Mese e Anno; tolti frecce, più e meno, Tutto e Anno (media)']],
  ['1.11','22 nov 2026',['Computer: tolta la pagina Albero dal menu laterale (c\'è già in Panoramica); nel riquadro dell\'albero un selettore passa tra Aggregato e Per account','Data e ora dell\'ultimo aggiornamento accanto al simbolo di aggiornamento (tolta dalla pagina Portafogli)','Grassetto per "Patrimonio netto" e per i nomi degli account','Grafici a torta: la fetta si evidenzia al passaggio del mouse, senza clic']],
  ['1.10','22 nov 2026',['Home: Aggregato e gli account sono in caselle dedicate accanto a quella del patrimonio netto, ognuna con il proprio patrimonio netto; la casella scelta è evidenziata']],
  ['1.09','22 nov 2026',['Corretto: la sezione Account è tolta dal menu laterale (computer), non dal menu a panino, che torna com\'era; Bilanciamento resta nel menu laterale']],
  ['1.08','22 nov 2026',['Home: accanto al patrimonio netto c\'è il simbolo di aggiornamento (amministratore: rilegge i prezzi; gli altri: ricarica i dati) e i pulsanti Aggregato, account e + per aggiungerne uno','Menu laterale: tolta la sezione Account; al suo posto la nuova pagina Bilanciamento (per ora vuota). Rinomina ed elimina account sono accanto ai pulsanti quando un account è selezionato']],
  ['1.07','22 nov 2026',['Tabelle: toccando il titolo di una colonna (Conti, Archiviati, prodotti dei Portafogli, Storico mese per mese) le righe si ordinano; un secondo tocco inverte l\'ordine','Conti e Portafogli: ogni account ha un leggero sfondo colorato, per distinguere le persone','Corretto il file sw.js (era vuoto dalla v1.04): torna la copia offline dell\'app']],
  ['1.06','21 nov 2026',['Prezzi: se una lettura del foglio arriva incompleta (alcuni prodotti vuoti), l\'app tiene l\'ultimo prezzo noto di quei prodotti invece di azzerarli']],
  ['1.05','21 nov 2026',['Prezzi: se la lettura non riesce, l\'app dice il motivo; mostra quanti prodotti ha letto dal foglio e, per ogni prodotto senza prezzo, "non nel foglio"']],
  ['1.04','21 nov 2026',['Portafogli: corretto il salvataggio dopo una modifica (non partiva mai)','Conti e Portafogli: account e singoli portafogli si possono comprimere con un tocco sul titolo; tasto Comprimi tutto / Espandi tutto']],
  ['1.03','21 nov 2026',['Prezzi: ora letti dal nuovo foglio "Lista prodotti quotati"; i prodotti in dollari o franchi svizzeri sono convertiti in euro con i cambi del foglio','Portafogli: se il salvataggio non va a buon fine, il motivo compare subito sopra la tabella (prima restava nascosto in cima alla pagina)']],
  ['1.02','21 nov 2026',['Computer: nuova pagina Portafogli, con un portafoglio per conto (es. Directa, Fineco) dentro ogni account e un prodotto per riga: ISIN, nome, classe di investimento, quote','La pagina Conti ora non contiene più gli investimenti: per ogni portafoglio c\'è una riga di riepilogo che rimanda a Portafogli','Conti e Portafogli sono divise per account','Le voci di investimento già presenti si riuniscono nei portafogli con un\'anteprima da confermare','Importa titoli si trova ora nella pagina Portafogli']],
  ['1.01','21 nov 2026',['Prezzi in tempo reale (amministratore, computer): le voci di investimento elencano i prodotti con ISIN e quote e il valore si calcola con i prezzi del foglio Google, letti all\'apertura e con il tasto Aggiorna prezzi nella pagina Conti','I prodotti senza prezzo nel foglio restano a valore manuale','Importa titoli ora carica anche ISIN e quote di ogni prodotto']],
  ['1.00','21 nov 2026',['Computer: Attivi, passivi e netto si ingrandisce al tocco, senza legenda, con blocchi interattivi al passaggio del mouse (elenco delle voci a destra)','Albero: passando il mouse su un blocco si evidenzia il suo ramo e si sbiadisce il resto']],
  ['0.99','21 nov 2026',['Computer: in Panoramica gli indicatori hanno la larghezza dell\'andamento e l\'albero sta alla loro destra; toccandolo si ingrandisce']],
  ['0.98','20 nov 2026',['Computer: nuova pagina Conti con aggiornamento di fine mese (tutti i valori in una volta), archivia ed elimina con avviso Annulla; conti divisi per categoria comprimibili, investimenti per conto']],
  ['0.97', '20 nov 2026', ['Computer: l\'albero del patrimonio ha una pagina tutta sua (voce Albero nel menu a sinistra, dopo Panoramica); in Panoramica restano grafici, torte e indicatori']],
  ['0.96', '20 nov 2026', ['Computer: nei grafici a sinistra il confronto variazioni è sostituito dall\'andamento dei passivi.', 'Nel grafico a colonne la colonna degli attivi è divisa per categoria.']],
  ['0.95', '20 nov 2026', ['Computer: in alto resta solo il patrimonio netto (tolti attivi, passivi e indebitamento)', 'Nuovo grafico a colonne tra l\'andamento e le torte: una colonna con gli attivi e una colonna impilata con passivi e patrimonio netto']],
  ['0.94', '20 nov 2026', ['Computer: il riquadro Albero del patrimonio è ridotto, con l\'albero in miniatura; toccandolo si espande per intero, con il tasto Indietro (o Esc) per richiuderlo']],
  ['0.93', '20 nov 2026', ['Grafico del patrimonio netto: all\'inizio di ogni anno una linea verticale collega il punto della curva all\'etichetta con anno e valore (niente più puntino e niente mese)']],
  ['0.92', '20 nov 2026', ['Computer: il tasto Indietro dei grafici ingranditi è dentro il riquadro, vicino al tasto schermo intero', 'Grafico del patrimonio netto: un puntino con etichetta (data e valore) all\'inizio di ogni anno']],
  ['0.91', '20 nov 2026', ['Computer: il grafico dell\'andamento mostra solo il patrimonio netto (tolte le linee di attivi, passivi e variazione, e le etichette da selezionare)', 'Il grafico del patrimonio netto usa una scala adattata ai dati, così le variazioni si vedono meglio']],
  ['0.90', '20 nov 2026', ['Computer: transizioni quando si apre e si chiude un sottoquadrante (grafici e torte)', 'Il tasto per tornare alla vista con i quattro sottoquadranti ora si chiama Indietro (vale anche il tasto Esc)', 'Grafici ingranditi più alti, per riempire meglio il riquadro']],
  ['0.89', '20 nov 2026', ['Computer: il riquadro a sinistra è fatto come quello delle torte: quattro sottoquadranti (Andamento, Variazione mensile, Confronto variazioni, Confronto crescita) con un mini grafico ciascuno; tocca un sottoquadrante per ingrandirlo, il tasto Tutti i grafici torna indietro']],
  ['0.88', '20 nov 2026', ['Computer: la variazione rispetto al mese precedente è scritta con un carattere più grande']],
  ['0.87', '20 nov 2026', ['Computer: le torte tornano sempre visibili nel riquadro a destra; il riquadro a sinistra ha un selettore con Andamento, Variazione mensile, Confronto variazioni e Confronto crescita']],
  ['0.86', '20 nov 2026', ['Computer: tutti i grafici sono nel riquadro in alto della Panoramica, a tutta larghezza, con un selettore per scegliere quale vedere (andamento, variazione mensile, confronti, torte)', 'La scheda delle quattro torte non c\'è più come riquadro a parte: è la voce Tutte le torte del selettore', 'Nuova voce: aggiunto il tasto Annulla, che riporta alla Panoramica', 'Computer: tolto il tasto Genera report; il tasto per nascondere gli importi è un occhio accanto al patrimonio netto', 'Computer: la variazione rispetto al mese precedente è verde se positiva e rossa se negativa', 'Computer: la pagina Report mostra solo il riquadro del report PDF']],
  ['0.85', '20 nov 2026', ['Computer: le quattro torte tornano espandibili (tocca il riquadro; tocca una fetta per selezionarla)', 'Barra laterale: Panoramica, Account (Aggregato e singoli account, con aggiunta, rinomina ed elimina), Report, Info e novità, Termini e condizioni, Amministrazione; il menu a panino non c\'è più su computer', 'Tocchi su un account: la Panoramica mostra solo quell\'account', 'In alto a destra della Panoramica: Genera report e Nuova voce', 'Su computer restano solo Panoramica e Report; Patrimonio, Distribuzione e Andamento sono nascoste per ora']],
  ['0.84', '20 nov 2026', ['Computer: le quattro torte non si espandono più, le fette si selezionano soltanto', 'Nuovo ordine: Per account, Attivi per categoria, Classi di investimento (valori aggregati di tutti gli account), Passivi per tipo']],
  ['0.83', '20 nov 2026', ['Computer: il grafico a torta diventa quattro torte piccole (Attivi per categoria, Passivi per tipo, Per account, Liquido / non liquido)', 'Tocca una torta per ingrandirla; il tasto Tutti i grafici riporta alla vista con le quattro torte', 'Telefono invariato']],
  ['0.82', '20 nov 2026', ['Nuovo tasto per nascondere gli importi in tutta l\'app (restano le percentuali)', 'Grafico a torta più compatto, senza il testo di istruzioni']],
  ['0.81', '20 nov 2026', ['Albero su computer ancora più grande: caratteri ingranditi fino a riempire la larghezza, il riquadro si allunga di conseguenza']],
  ['0.80', '20 nov 2026', ['Albero su computer più grande: occupa tutta la larghezza disponibile, con caratteri più leggibili']],
  ['0.79', '20 nov 2026', ['Albero sempre completamente aperto, con tutti i rami visibili', 'Tolti i tasti Espandi tutto e Comprimi tutto: resta la scelta Aggregato / Per account']],
  ['0.78', '20 nov 2026', ['Albero su computer: stessa dimensione dei caratteri con l\'albero chiuso o aperto, e altezza sempre completa']],
  ['0.77', '20 nov 2026', ['Albero aperto del tutto: ora sta interamente nella finestra, anche in larghezza']],
  ['0.76', '20 nov 2026', ['Albero: la finestra ha già lo spazio per tutto l\'albero aperto, quindi non cambia e non scorre quando apri i rami']],
  ['0.75', '20 nov 2026', ['Panoramica che sta tutta nello schermo, senza scorrere la pagina', 'Albero più piccolo, in una finestra di dimensione fissa che non cambia quando apri i rami']],
  ['0.74', '20 nov 2026', ['Versione computer: menu laterale a sinistra e nuova pagina Panoramica con andamento, torta, albero e indicatori insieme', 'Su telefono non cambia nulla']],
  ['0.73', '20 nov 2026', ['Versione computer: caratteri più piccoli in tutta l\'app e nell\'albero', 'Albero con transizioni fluide quando apri o chiudi i rami']],
  ['0.72', '20 nov 2026', ['Distribuzione su computer: l\'albero ora sta sotto il grafico a torta, a tutta larghezza']],
  ['0.71', '20 nov 2026', ['Primi due grafici di Andamento uniti in uno: tocca i nomi (Attivi, Passivi, Patrimonio netto, Variazione) per mostrare solo le linee che vuoi']],
  ['0.70', '20 nov 2026', ['Grafici di Andamento: nuovi tasti Mese / Anno (fine) / Anno (media) per vedere i dati per anno']],
  ['0.69', '20 nov 2026', ['Report PDF con importi: aggiunti grafico e colonna dell\'indebitamento (come nella versione senza importi)']],
  ['0.68', '20 nov 2026', ['Importazione dei titoli da CSV riservata all\'amministratore durante la fase beta']],
  ['0.67', '19 nov 2026', ['Grafico a torta: tocca una fetta per selezionarla, tocca di nuovo per aprirla', 'Nuovi tasti "Indietro" e "Torna all\'inizio" sulla torta', 'Tocca al centro o fuori dalle fette per deselezionare', 'La torta non dipende più dall\'albero', 'Nuova sezione Info nel menu, con le novità']],
  ['0.66', '19 nov 2026', ['Importa i titoli da un file CSV (conto e tipo di investimento)']],
  ['0.65', '19 nov 2026', ['Albero aggregato: la stessa piattaforma su più account è un solo ramo']],
  ['0.62 – 0.64', '19 nov 2026', ['Albero ridisegnato più volte per il telefono, ora di nuovo orizzontale']],
  ['0.60 – 0.61', '19 nov 2026', ['Pulsanti "Espandi tutto" e "Comprimi tutto" sull\'albero', 'Aggiorni il valore dalle voci finali dell\'albero']],
  ['0.57 – 0.59', '19 nov 2026', ['Opzione per mostrare i conti a saldo zero', 'Grafico a torta a un solo anello']],
  ['0.55 – 0.56', '19 nov 2026', ['Nuovo albero del patrimonio: aggregato o per account, con rami apribili']],
  ['0.54', '19 nov 2026', ['Report PDF dettagliato con grafici e opzione per nascondere gli importi']],
  ['0.53', '18 nov 2026', ['Campo "tipo di investimento" (asset class) nelle voci']],
  ['0.50 – 0.52', '18 nov 2026', ['Accesso solo con Google', 'App utilizzabile anche senza connessione', 'Termini e condizioni aggiornati (versione 2)']],
  ['0.44 – 0.49', '18 nov 2026', ['Barre della variazione mensile interattive', 'Selettori di periodo e di anno per i grafici', 'Evidenziazione delle fette nella torta']],
  ['0.35 – 0.43', '18 nov 2026', ['Tasto indietro del telefono per schede, menu e finestre', 'Barra di navigazione in basso con icone', 'Grafico del patrimonio netto interattivo nella pagina Andamento']],
  ['0.30 – 0.34', '17 nov 2026', ['Grafici con zoom, schermo intero e valori al tocco', 'Confronto tra periodi e indicatori nel report', 'Importazione dello storico da file']]
];
/* Collegamento al foglio Google dei prezzi: l'indirizzo dello script e la chiave restano solo su questo dispositivo */
const sheetCfg = () => { try { const c = JSON.parse(localStorage.getItem('pf_sheet') || 'null'); return c && c.url && c.token ? c : null; } catch (e) { return null; } };
const sheetCard = () => { const c = sheetCfg() || {}; return `<div class="card"><h2>Foglio dei prezzi</h2><p class="lbl" style="margin-top:0">Quando salvi un portafoglio con un ISIN nuovo, l'app lo aggiunge al foglio "Lista prodotti quotati" e il prezzo arriva da Borsa Italiana. Serve lo script Google (file script_isin_foglio.txt): incolla qui l'indirizzo e la chiave.</p>
  <label class="lbl">Indirizzo dello script</label><input id="shu" placeholder="https://script.google.com/macros/s/…/exec" value="${esc(c.url || '')}">
  <label class="lbl">Chiave</label><input id="sht" placeholder="La chiave scelta nello script" value="${esc(c.token || '')}">
  <div class="acts"><button class="b sm" data-act="shsave">Salva</button>${c.url ? '<button class="b s sm" data-act="shtest">Prova collegamento</button><button class="b s sm r" data-act="shdel">Scollega</button>' : ''}</div></div>`; };
/* Aggiunge al foglio gli ISIN senza prezzo (solo amministratore); restituisce un messaggio */
/* Chiamata allo script del foglio: la chiave viaggia nel corpo della richiesta (non nell'indirizzo); se lo script e' ancora la versione vecchia, ripiega sul metodo precedente */
const pulisciTesto = (s, n) => String(s || '').replace(/^[\s=+\-@]+/, '').slice(0, n);
async function chiamaFoglio(c, par) {
  const corpo = JSON.stringify({ token: c.token, ...par });
  try {
    const r = await fetch(c.url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: corpo, cache: 'no-store' });
    return await r.json();
  } catch (e) {
    const q = new URLSearchParams({ token: c.token, ...par });
    return await (await fetch(c.url + (c.url.includes('?') ? '&' : '?') + q, { cache: 'no-store' })).json();
  }
}
async function nomeDaIsin(isin) {
  const c = sheetCfg(); if (!c) return '';
  try { const j = await chiamaFoglio(c, { isin, solonome: '1' }); window._nomeInfo = j.ok ? (j.info || 'nome non trovato') : (j.errore || 'errore'); return j.ok && j.nome ? String(j.nome) : ''; } catch (e) { window._nomeInfo = 'foglio non raggiungibile'; return ''; }
}
async function sheetAggiungi(prodotti) {
  const c = sheetCfg(), mancanti = prodotti.filter(p => p.isin && S.prezzi && !S.prezzi.map[p.isin]);
  if (!mancanti.length) return '';
  if (!c) return ' Per prendere il prezzo di ' + mancanti.map(p => p.isin).join(', ') + ' collega il foglio dalla pagina Info.';
  const out = [];
  for (const p of mancanti) {
    try {
      const j = await chiamaFoglio(c, { isin: p.isin, nome: pulisciTesto(p.nome, 60), classe: pulisciTesto(p.classe, 40) });
      out.push(j.ok ? (j.esito === 'presente' ? p.isin + ' è già nel foglio' : p.isin + ' aggiunto al foglio' + (j.prezzo ? ' (prezzo ' + nfm(j.prezzo) + ')' : '')) : p.isin + ': ' + (j.errore || 'errore'));
    } catch (e) { out.push(p.isin + ': foglio non raggiungibile'); }
  }
  return ' ' + out.join('; ') + '. Il prezzo compare in app quando il foglio pubblicato si aggiorna.';
}
function pageInfo() {
  return `<div class="card"><h2>P.Finance</h2><p class="lbl">Versione ${VER} beta</p>
    <p>App per tenere traccia del proprio patrimonio, della situazione mese per mese e per imparare le basi della finanza personale.</p>
    <div class="row"><div class="n">Titolare</div><div class="v">Mario T.</div></div>
    <div class="row"><div class="n">Accesso</div><div class="v">Google</div></div>
    <div class="row"><div class="n">Funziona anche offline</div><div class="v">Sì</div></div>
    <p class="note">Strumento educativo, non consulenza finanziaria. I tuoi dati restano visibili solo a te.</p>
    <button class="b s sm" data-act="terms">Termini e condizioni</button></div>
    ${isAdmin() ? sheetCard() : ''}
    <div class="card"><h2>Novità</h2>${CHANGELOG.map(([v, d, l]) => `<h3 style="margin:12px 0 2px;font-size:15px">Versione ${v}</h3><div class="lbl">${d}</div><ul class="c">${l.map(x => `<li>${esc(x)}</li>`).join('')}</ul>`).join('')}</div>`;
}
