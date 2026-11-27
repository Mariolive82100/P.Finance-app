'use strict';
/* ---------- Copia completa dei dati e ripristino ---------- */
const COPIA_PARTI = ['voci', 'storico', 'account'];
const COPIA_PROFILO = ['nome', 'esclusi', 'home', 'bil'];

/* Le date del database diventano testo nel file, e tornano date al ripristino */
const copiaOut = x => x && typeof x.toDate === 'function' ? { __data: x.toDate().toISOString() } : Array.isArray(x) ? x.map(copiaOut) : x && typeof x === 'object' ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, copiaOut(v)])) : x;
const copiaIn = x => Array.isArray(x) ? x.map(copiaIn) : x && typeof x === 'object' ? (typeof x.__data === 'string' ? Timestamp.fromDate(new Date(x.__data)) : Object.fromEntries(Object.entries(x).map(([k, v]) => [k, copiaIn(v)]))) : x;
/* Impronta indipendente dall'ordine dei campi, per confrontare due copie */
const copiaOrd = x => Array.isArray(x) ? x.map(copiaOrd) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, copiaOrd(x[k])])) : x;
const copiaFirma = c => JSON.stringify(copiaOrd([c.profilo, ...COPIA_PARTI.map(p => c[p])]));

/* Legge tutto direttamente dal database (non dalla memoria del dispositivo) */
async function copiaLeggi() {
  if (!navigator.onLine) throw Object.assign(new Error('offline'), { code: 'network-offline' });
  const uid = S.user.uid;
  const [ps, ...parti] = await Promise.all([getDocFromServer(doc(db, 'users', uid)), ...COPIA_PARTI.map(p => getDocsFromServer(collection(db, 'users', uid, p)))]);
  const pd = ps.exists() ? ps.data() : {};
  const c = { app: 'P.Finance', tipo: 'copia-completa', versione: 1, creata: new Date().toISOString(), uid, profilo: {} };
  COPIA_PROFILO.forEach(k => { if (pd[k] !== undefined) c.profilo[k] = copiaOut(pd[k]); });
  COPIA_PARTI.forEach((p, i) => { c[p] = Object.fromEntries(parti[i].docs.map(d => [d.id, copiaOut(d.data())])); });
  return c;
}
function copiaFile(c, prefisso) {
  const d = new Date(), n = v => String(v).padStart(2, '0');
  const nome = `${prefisso}_${d.getFullYear()}-${n(d.getMonth() + 1)}-${n(d.getDate())}_${n(d.getHours())}${n(d.getMinutes())}.json`;
  const a = document.createElement('a'), url = URL.createObjectURL(new Blob([JSON.stringify(c)], { type: 'application/json' }));
  a.href = url; a.download = nome; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 30000);
  return nome;
}
const copiaConta = c => `${Object.keys(c.voci).length} voci (comprese le archiviate), ${Object.keys(c.storico).length} mesi di storico, ${Object.keys(c.account).length} account aggiuntivi`;

/* Controlla che il file sia una copia di P.Finance, integra e di questo account */
function copiaControlla(c) {
  const ogg = x => !!x && typeof x === 'object' && !Array.isArray(x);
  const no = t => { throw new Error(t); };
  if (!ogg(c) || c.app !== 'P.Finance' || c.tipo !== 'copia-completa' || c.versione !== 1) no('Questo file non è una copia completa di P.Finance.');
  if (c.uid !== S.user.uid) no('La copia appartiene a un altro account.');
  if (!ogg(c.profilo) || !COPIA_PARTI.every(p => ogg(c[p]))) no('Il file è incompleto o danneggiato.');
  for (const p of COPIA_PARTI) for (const [id, v] of Object.entries(c[p])) if (!id || id.includes('/') || !ogg(v) || Object.keys(v).length > 60) no('Il file è incompleto o danneggiato.');
  if (!Object.keys(c.voci).length) no('La copia non contiene voci: ripristino fermato per sicurezza.');
  if (Object.values(c.voci).some(v => !['attivo', 'passivo'].includes(v.tipo) || typeof v.valore !== 'number')) no('Il file contiene voci non valide.');
  if (Object.keys(c.storico).some(k => !/^\d{4}-\d{2}$/.test(k))) no('Il file contiene mesi non validi.');
  if (Object.values(c.account).some(v => Object.keys(v).join() !== 'nome' || typeof v.nome !== 'string' || v.nome.length > 60)) no('Il file contiene account non validi.');
  return c;
}

async function copiaEsporta() {
  if (S.demo || !S.data || S.copiaBusy) return;
  S.copiaBusy = true; S.copiaMsg = { ok: true, t: 'Preparo la copia…' }; render();
  try {
    if (S.undo && S.undo.kind === 'del') await commitDel();
    const c = await copiaLeggi(), nome = copiaFile(c, 'pfinance_copia');
    S.copiaMsg = { ok: true, t: `Copia creata: ${nome} (${copiaConta(c)}). Controlla di trovarla tra i download.` };
  } catch (e) { S.copiaMsg = { ok: false, t: errText(e) }; }
  S.copiaBusy = false; render();
}

/* Sostituisce i dati con quelli della copia, poi rilegge e controlla */
async function copiaRipristina() {
  if (S.demo || !S.data || S.copiaBusy || !S.copia) return;
  const nuovi = S.copia.dati;
  if (!confirm('I dati attuali verranno sostituiti con quelli della copia. Prima viene scaricata una copia della situazione attuale. Continuare?')) return;
  S.copiaBusy = true; S.copiaMsg = { ok: true, t: 'Ripristino in corso: non chiudere l\'app…' }; render();
  let scritto = false;
  try {
    if (S.undo && S.undo.kind === 'del') await commitDel();
    const ora = await copiaLeggi();
    copiaFile(ora, 'pfinance_prima-del-ripristino');
    const uid = S.user.uid, rif = (p, id) => doc(db, 'users', uid, p, id), op = [];
    /* prima si scrive, poi si elimina ciò che nella copia non c'è */
    COPIA_PARTI.forEach(p => Object.entries(nuovi[p]).forEach(([id, v]) => op.push(b => b.set(rif(p, id), copiaIn(v)))));
    COPIA_PARTI.forEach(p => Object.keys(ora[p]).filter(id => !(id in nuovi[p])).forEach(id => op.push(b => b.delete(rif(p, id)))));
    const prof = {};
    COPIA_PROFILO.forEach(k => { if (nuovi.profilo[k] !== undefined) prof[k] = copiaIn(nuovi.profilo[k]); else if (k !== 'nome' && ora.profilo[k] !== undefined) prof[k] = deleteField(); });
    if (Object.keys(prof).length) op.push(b => b.update(doc(db, 'users', uid), prof));
    /* fino a 450 operazioni il salvataggio è unico: o tutto o niente */
    for (let i = 0; i < op.length; i += 450) { const b = writeBatch(db); op.slice(i, i + 450).forEach(f => f(b)); await b.commit(); scritto = true; }
    const dopo = await copiaLeggi();
    const atteso = { ...nuovi, profilo: { ...(ora.profilo.nome !== undefined ? { nome: ora.profilo.nome } : {}), ...nuovi.profilo } };
    if (copiaFirma(dopo) !== copiaFirma(atteso)) throw new Error('controllo non superato');
    try { sessionStorage.setItem('pf_copia_ok', 'Ripristino completato e controllato.'); } catch (e) {}
    S.copia = null; location.reload();
  } catch (e) {
    S.copiaBusy = false;
    S.copiaMsg = { ok: false, t: (scritto ? 'Ripristino non confermato. Chiudi e riapri l\'app e controlla i dati; se serve, ripristina il file "prima-del-ripristino". ' : 'Ripristino non eseguito: i dati non sono stati modificati. ') + errText(e) };
    render();
  }
}

function copiaCard() {
  if (S.demo || S.ro || !S.data) return '';
  const C = S.copia, M = S.copiaMsg, off = S.copiaBusy ? 'disabled' : '';
  return `<div class="card"><h2>Copia di sicurezza</h2><div class="lbl">Scarica un file con tutti i tuoi dati. Conservalo in un posto sicuro: contiene i tuoi importi in chiaro.</div>
    <div class="acts"><button class="b" data-act="copiascarica" ${off}>Scarica copia completa</button></div>
    ${C ? `<div style="margin-top:14px"><b>Copia del ${new Date(C.dati.creata).toLocaleString('it-IT')}</b><div class="lbl">${copiaConta(C.dati)}</div><div class="lbl" style="margin-top:6px">Il ripristino sostituisce tutti i dati attuali, anche ciò che hai inserito dopo quella data.</div>
      <div class="acts"><button class="b r" data-act="copiaok" ${off}>Sostituisci i dati</button><button class="b s" data-act="copiano" ${off}>Annulla</button></div></div>`
    : `<label class="lbl" style="display:block;margin-top:14px">Ripristina da una copia (scegli il file)</label><input id="copiaf" type="file" accept=".json,application/json" ${off}>`}
    ${M ? `<div class="msg ${M.ok ? 'ok' : ''}">${esc(M.t)}</div>` : ''}</div>`;
}

document.addEventListener('change', async e => {
  if (e.target.id !== 'copiaf' || !e.target.files[0] || !S.data || S.demo) return;
  try {
    let c; try { c = JSON.parse(await e.target.files[0].text()); } catch (x) { throw new Error('File non leggibile: scegli una copia completa di P.Finance.'); }
    S.copia = { dati: copiaControlla(c) }; S.copiaMsg = null;
  } catch (x) { S.copia = null; S.copiaMsg = { ok: false, t: x.message }; }
  render();
});
