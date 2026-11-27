'use strict';
/* ---------- Andamento giornaliero ----------
   Ogni giorno registrato e' salvato nella scheda del mese: storico/AAAA-MM, campo g, voce GG. */
const oggiKey = (d = new Date()) => monthKey(d) + '-' + String(d.getDate()).padStart(2, '0');
const G_CAMPI = ['attivi', 'passivi', 'netto', 'liq', 'port', 'beni'];
const gNum = o => Object.fromEntries(G_CAMPI.filter(k => o && typeof o[k] === 'number').map(k => [k, r2(o[k])]));
/* Fotografia di un giorno: totale e singoli account, al centesimo */
const giornoDi = (t, acc) => ({ ...gNum(t), acc: Object.fromEntries(Object.entries(acc || {}).map(([k, v]) => [k, gNum(v)])) });
/* Confronto che non dipende dall'ordine di campi e account */
const gOrd = x => x && typeof x === 'object' ? Object.keys(x).sort().map(k => [k, gOrd(x[k])]) : x;
const firmaGiorno = g => JSON.stringify(gOrd(g));
/* Tutti i giorni salvati, dal piu' vecchio, esclusi quelli successivi a oggi */
function elencoGiorni(D) {
  const oggi = oggiKey(), out = [];
  for (const [m, g] of Object.entries((D && D.giorni) || {})) for (const [d, v] of Object.entries(g)) if (m + '-' + d <= oggi) out.push({ data: m + '-' + d, v });
  return out.sort((a, b) => a.data.localeCompare(b.data));
}
/* Il primo giorno nasce solo da un salvataggio; poi si registra ogni volta che il valore e' diverso dall'ultimo
   (anche all'apertura: ad esempio quando una rata ha ridotto un debito) */
function giornoDaRegistrare(D, ora, cambiaMese, apertura) {
  const tutti = elencoGiorni(D), ultimo = tutti[tutti.length - 1];
  return ultimo ? firmaGiorno(ultimo.v) !== firmaGiorno(ora) : !apertura && cambiaMese;
}
/* Eliminando un mese dallo storico i suoi giorni restano */
async function eliminaMese(m) {
  const D = S.data, rif = doc(db, 'users', D.uid, 'storico', m), g = D.giorni && D.giorni[m];
  if (g) await setDoc(rif, { g, aggiornato: serverTimestamp() }); else await deleteDoc(rif);
  D.accOnly = (D.accOnly || []).filter(x => x.mese !== m);
}
const giorniValidi = g => !!g && typeof g === 'object' && !Array.isArray(g) && Object.entries(g).every(([d, v]) => /^(0[1-9]|[12]\d|3[01])$/.test(d) && !!v && typeof v === 'object' && ['attivi', 'passivi', 'netto'].every(k => Number.isFinite(v[k])) && !!v.acc && typeof v.acc === 'object' && Object.values(v.acc).every(a => !!a && Number.isFinite(a.netto)));

/* Valori registrati per il totale o per un account; un account rimasto senza voci vale zero */
function giorniDi(D, chi) {
  let visto = false; const out = [];
  elencoGiorni(D).forEach(({ data, v }) => {
    if (chi === 'all') return out.push({ data, netto: v.netto });
    const a = v.acc && v.acc[chi];
    if (a) visto = true;
    if (visto) out.push({ data, netto: a ? a.netto : 0 });
  });
  return out;
}
const gBreve = k => { const [, m, d] = k.split('-'); return +d + ' ' + MESI[+m - 1].slice(0, 3); };
const gLunga = k => { const [y, m, d] = k.split('-'); return +d + ' ' + MESI[+m - 1] + ' ' + y; };
const segno = v => (v >= 0 ? '+' : '−') + eur(Math.abs(v));
/* Un punto per ogni giorno di calendario fino a oggi: senza registrazioni resta l'ultimo valore */
function seriaGiorni(reg, per, adesso = new Date()) {
  if (!reg.length) return [];
  const oggi = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate());
  let da = parseD(reg[0].data);
  if (+per) { const x = addM(oggi, -per); if (x > da) da = x; }
  const out = []; let i = 0, cur = null, prima = null;
  for (let d = new Date(da); d <= oggi; d.setDate(d.getDate() + 1)) {
    const k = oggiKey(d); let rec = false;
    while (i < reg.length && reg[i].data <= k) { prima = cur; cur = reg[i]; rec = cur.data === k; i++; }
    const note = rec ? (prima ? [segno(cur.netto - prima.netto) + ' dal valore prima'] : ['Primo valore']) : ['Invariato dal ' + gBreve(cur.data)];
    out.push({ lab: gBreve(k), long: gLunga(k), netto: cur.netto, rec, note });
  }
  return out;
}

const vistaBar = () => `<div class="perbar perbarA vistag">${[['m', 'Mensile'], ['g', 'Giornaliero']].map(([v, l]) => `<button class="b ${(S.vistaG || 'm') === v ? '' : 's'}" data-act="vistag" data-v="${v}">${l}</button>`).join('')}</div>`;
const G_PER = [['1', '1 mese'], ['3', '3 mesi'], ['12', '12 mesi'], ['0', 'Tutto']];
function panDay(r1, cols) {
  const D = S.data, chi = S.fAcc || 'all', per = S.gper || '1', mob = innerWidth < 1000;
  const W = mob ? Math.max(300, innerWidth - 62) : Math.max(300, Math.round((innerWidth - 200 - 56 - 28) * (cols || 5) / 12 - 40));
  const reg = giorniDi(D, chi), pts = seriaGiorni(reg, per), titolo = 'Andamento del patrimonio netto';
  const mancano = S.demo ? 0 : isinSenzaPrezzo(D).length;
  const avviso = mancano ? `<div class="msg">Oggi non viene registrato: ${mancano === 1 ? 'manca 1 prezzo' : 'mancano ' + mancano + ' prezzi'}.${pts.length ? ' La linea mantiene l\'ultimo valore salvato.' : ''}</div>` : '';
  if (!pts.length) return `<div class="card"><div class="chh"><h2>${titolo}</h2><span class="chb"><button class="b s sm" data-act="hclose">← Indietro</button></span></div>${vistaBar()}${avviso}<p class="gvuoto">Il grafico giornaliero parte dal primo salvataggio che modifica il patrimonio. I giorni precedenti non vengono ricostruiti: il passato resta nella vista Mensile.</p></div>`;
  const a = pts[0].netto, b = pts[pts.length - 1].netto, d = b - a;
  const sintesi = `<div class="gsint"><b>${eur(b)}</b> <span class="${d > 0.5 ? 'pos' : d < -0.5 ? 'neg' : ''}">${segno(d)}${a ? ' · ' + pct(d / Math.abs(a)) : ''} nel periodo</span></div>`;
  const periodi = `<div class="perbar perbarA gper">${G_PER.map(([v, l]) => `<button class="b ${per === v ? '' : 's'}" data-act="gper" data-v="${v}">${l}</button>`).join('')}</div>`;
  return lcCard('day', titolo, pts, [{ k: 'netto', c: '#1d4ed8', l: 'Patrimonio netto', fit: 1, nolg: 1, nm: 1, step: 1 }], W, mob ? 220 : Math.max(120, r1 - 245 - (mancano ? 45 : 0)))
    .replace('<div class="lcw"', vistaBar() + periodi + sintesi + avviso + '<div class="lcw"');
}
