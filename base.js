'use strict';
const VER = '0.56';
const ASSET = ['Azioni', 'Obbligazioni', 'Monetario', 'Oro e materie prime', 'Immobiliare', 'Criptovalute', 'Multi-asset', 'Altro'];
const dn = v => v.assetClass || v.nome;
const ADMIN_UID = '29kFEZwmKPZvHFjQ9M65ERhIbhG3';
const CATS = {
  attivo: ['Liquidità', 'Investimenti', 'Immobili', 'Beni', 'Altro'],
  passivo: ['Mutuo', 'Prestito', 'Carta di credito', 'Altro debito']
};
const MESI = ['gennaio','febbraio','marzo','aprile','maggio','giugno','luglio','agosto','settembre','ottobre','novembre','dicembre'];

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const eur = v => new Intl.NumberFormat('it-IT', {style:'currency', currency:'EUR', maximumFractionDigits: 0, useGrouping:'always'}).format(v || 0);
const pct = v => (v >= 0 ? '+' : '') + (v * 100).toFixed(1).replace('.', ',') + '%';
const monthKey = (d = new Date()) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
const monthName = k => { const [y, m] = k.split('-'); return MESI[+m - 1] + ' ' + y; };
const totals = voci => {
  const a = voci.filter(v => v.tipo === 'attivo').reduce((s, v) => s + v.valore, 0);
  const p = voci.filter(v => v.tipo === 'passivo').reduce((s, v) => s + v.valore, 0);
  return { attivi: a, passivi: p, netto: a - p };
};
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
const applyPiano = v => { if (v.piano) v.valore = piano(v).residuo; return v; };
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

const S = { user: null, profile: null, data: null, tab: 'pat', users: [], edit: null, loading: true, msg: '' };

function errText(e) {
  const c = e && e.code || '';
  if (c.includes('popup-closed') || c.includes('cancelled-popup')) return 'Accesso annullato.';
  if (c.includes('popup-blocked')) return 'Il browser ha bloccato la finestra di accesso. Consentila e riprova.';
  if (c.includes('credential-already-in-use')) return 'Questo account Google è già collegato a un altro profilo.';
  if (c.includes('unauthorized-domain')) return 'Indirizzo dell\'app non autorizzato in Firebase.';
  if (c.includes('operation-not-allowed')) return 'Accesso con Google non ancora attivato.';
  if (c.includes('network')) return 'Connessione assente. Riprova.';
  if (c.includes('too-many-requests')) return 'Troppi tentativi. Riprova tra qualche minuto.';
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
  await migraCategorie(uid, voci);
  voci.forEach(applyPiano);
  const arch = voci.filter(v => v.archiviata);
  for (let i = voci.length - 1; i >= 0; i--) if (voci[i].archiviata) voci.splice(i, 1);
  const storico = ss.docs.map(d => ({ mese: d.id, ...d.data() })).sort((a, b) => a.mese.localeCompare(b.mese));
  S.data = { uid, nome, voci, arch, storico, accounts };
  await syncStorico();
}

async function syncStorico() {
  const D = S.data;
  if (!D) return;
  const t = totals(D.voci);
  const mk = monthKey();
  const cur = D.storico.find(x => x.mese === mk);
  if (!D.voci.length && !cur) return;
  if (cur && cur.attivi === t.attivi && cur.passivi === t.passivi) return;
  await setDoc(doc(db, 'users', D.uid, 'storico', mk), { ...t, aggiornato: serverTimestamp() });
  if (cur) Object.assign(cur, t); else { D.storico.push({ mese: mk, ...t }); D.storico.sort((a, b) => a.mese.localeCompare(b.mese)); }
}

async function loadUsers() {
  const q = await getDocs(collection(db, 'users'));
  S.users = q.docs.map(d => ({ uid: d.id, ...d.data() })).filter(u => u.uid !== S.user.uid)
    .sort((a, b) => (a.approved === b.approved ? (a.nome || '').localeCompare(b.nome || '') : a.approved ? 1 : -1));
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

