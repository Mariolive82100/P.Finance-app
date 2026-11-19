'use strict';
/* ---------- Albero del patrimonio (interattivo) ---------- */
const TN = { w: 150, h: 46, gx: 44, gy: 12 };

/* Costruisce l'albero: patrimonio netto > (account >) attivi/passivi > classi > voci.
   La classe è l'asset class per gli investimenti, la categoria per tutto il resto.
   La stessa classe presente su più conti viene sommata. */
function alberoDati(D, mode) {
  const att = D.voci.filter(v => v.tipo === 'attivo'), pas = D.voci.filter(v => v.tipo === 'passivo'), multi = D.accounts.length > 0;
  const sum = a => a.reduce((s, v) => s + v.valore, 0);
  const classe = v => v.tipo === 'attivo' && v.categoria === 'Investimenti' ? (v.assetClass || 'Non indicata') : v.categoria;
  const lato = (pid, t, voci, showAcc) => {
    if (!voci.length) return null;
    const tot = sum(voci), m = new Map();
    voci.forEach(v => { const k = classe(v); if (!m.has(k)) m.set(k, []); m.get(k).push(v); });
    const kids = [...m.entries()].map(([k, a]) => {
      const cs = sum(a);
      return { id: pid + '/' + k, label: k, val: cs, pct: tot > 0 ? cs / tot : null, tone: t, lv: 'c',
        kids: a.slice().sort((x, y) => y.valore - x.valore).map(v => ({ id: pid + '/' + k + '/' + v.id, lv: 'v', tone: t, kids: [], val: v.valore, pct: cs > 0 ? v.valore / cs : null,
          label: v.categoria === 'Investimenti' && v.dove ? 'su ' + v.dove : dn(v), sub: showAcc && multi ? accName(v) : '' })) };
    }).sort((x, y) => y.val - x.val);
    return { id: pid, label: t === 'a' ? 'Attivi' : 'Passivi', val: tot, pct: null, tone: t, lv: 's', kids };
  };
  const net = sum(att) - sum(pas);
  if (mode === 'acc') {
    const ac = ['main', ...D.accounts.map(a => a.id)].map(k => {
      const a = att.filter(v => accKey(v) === k), p = pas.filter(v => accKey(v) === k);
      return { id: 'r/' + k, label: k === 'main' ? D.nome : D.accounts.find(x => x.id === k).nome, val: sum(a) - sum(p), pct: null, tone: 'x', lv: 'u', n: a.length + p.length,
        kids: [lato('r/' + k + '/a', 'a', a, false), lato('r/' + k + '/p', 'p', p, false)].filter(Boolean) };
    }).filter(n => n.n).sort((x, y) => y.val - x.val);
    return { id: 'r', label: 'Patrimonio netto', val: net, pct: null, tone: 'r', lv: 'r', kids: ac };
  }
  return { id: 'r', label: 'Patrimonio netto', val: net, pct: null, tone: 'r', lv: 'r', kids: [lato('r/a', 'a', att, true), lato('r/p', 'p', pas, true)].filter(Boolean) };
}

function alberoLayout(root, open) {
  const nodes = [], links = [], step = TN.h + TN.gy; let row = 0;
  const walk = (n, lvl, parent) => {
    const kids = open.has(n.id) ? n.kids : [], me = { n, lvl, y: 0, can: n.kids.length > 0, open: kids.length > 0 };
    nodes.push(me);
    if (kids.length) { const ys = kids.map(k => walk(k, lvl + 1, me)); me.y = (ys[0] + ys[ys.length - 1]) / 2; } else me.y = row++ * step;
    if (parent) links.push([parent, me]);
    return me.y;
  };
  walk(root, 0, null);
  return { nodes, links, rows: row, depth: Math.max(...nodes.map(x => x.lvl)) + 1 };
}

const TSTY = {
  r: { f: '#1f3b38', s: '#1f3b38', t1: '#d6f2ee', t2: '#ffffff', ln: '#8aa5a2' },
  u: { f: '#e8eefb', s: '#1d4ed8', t1: '#16302d', t2: '#1d4ed8', ln: '#7d97d6' },
  sa: { f: '#d6f2ee', s: '#0f766e', t1: '#16302d', t2: '#0f766e', ln: '#4f9f96' }, sp: { f: '#fde8e8', s: '#b91c1c', t1: '#16302d', t2: '#b91c1c', ln: '#d96464' },
  ca: { f: '#eef6f5', s: '#4f9f96', t1: '#16302d', t2: '#0f766e', ln: '#4f9f96' }, cp: { f: '#fff5f5', s: '#d96464', t1: '#16302d', t2: '#b91c1c', ln: '#d96464' },
  va: { f: '#ffffff', s: '#b5d9d4', t1: '#16302d', t2: '#0f766e', ln: '#4f9f96' }, vp: { f: '#ffffff', s: '#efb0b0', t1: '#16302d', t2: '#b91c1c', ln: '#d96464' }
};
const tsty = n => n.lv === 'r' || n.lv === 'u' ? TSTY[n.lv] : TSTY[n.lv === 's' ? 's' + n.tone : n.lv === 'c' ? 'c' + n.tone : 'v' + n.tone];

function alberoSvg(root, open) {
  const L = alberoLayout(root, open), W = L.depth * (TN.w + TN.gx) - TN.gx + 4, H = Math.max(1, L.rows) * (TN.h + TN.gy) - TN.gy + 4;
  const X = lvl => 2 + lvl * (TN.w + TN.gx), Y = m => 2 + m.y;
  const T = (x, y, s, sz, w, f, an = 'start') => `<text x="${x}" y="${y}" font-size="${sz}" font-weight="${w}" fill="${f}" text-anchor="${an}">${esc(s)}</text>`;
  let o = '';
  L.links.forEach(([p, c]) => { const x1 = X(p.lvl) + TN.w, y1 = Y(p) + TN.h / 2, x2 = X(c.lvl), y2 = Y(c) + TN.h / 2, mx = (x1 + x2) / 2;
    o += `<path d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}" fill="none" stroke="${tsty(c.n).ln}" stroke-width="2.2"/>`; });
  L.nodes.forEach(m => {
    const n = m.n, c = tsty(n), x = X(m.lvl), y = Y(m), pc = n.pct != null ? ' · ' + (n.pct * 100).toFixed(1).replace('.', ',') + '%' : '';
    o += `<g${m.can ? ` data-act="tn" data-v="${esc(n.id)}" data-l="${m.lvl}" style="cursor:pointer"` : ''}><title>${esc(n.label + (n.sub ? ' · ' + n.sub : '') + ' · ' + eur(n.val) + pc)}</title>`
      + `<rect x="${x}" y="${y}" width="${TN.w}" height="${TN.h}" rx="10" fill="${c.f}" stroke="${c.s}" stroke-width="${n.lv === 'v' ? 1.5 : 2}"/>`
      + T(x + 10, y + 19, trunc(n.label, 20), 11, 600, c.t1) + T(x + 10, y + 35, eur0(n.val) + pc, 10.5, 600, n.val < 0 ? '#b91c1c' : c.t2);
    if (m.can) o += `<circle cx="${x + TN.w}" cy="${y + TN.h / 2}" r="10" fill="#fff" stroke="${c.s}" stroke-width="2"/>` + T(x + TN.w, y + TN.h / 2 + 5, m.open ? '−' : '+', 15, 700, c.s, 'middle');
    o += '</g>';
  });
  return `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" style="min-width:${W}px">${o}</svg>`;
}

function treeCard() {
  const D = S.data, mode = S.tview || 'agg';
  if (!S.tx) S.tx = new Set(['r']);
  return `<div class="card" style="min-width:0"><h2>Albero del patrimonio</h2>
    <div class="tabs"><button class="b ${mode === 'agg' ? '' : 's'}" data-act="tview" data-v="agg">Aggregato</button><button class="b ${mode === 'acc' ? '' : 's'}" data-act="tview" data-v="acc">Per account</button></div>
    <div class="tw tt" style="margin-top:12px">${alberoSvg(alberoDati(D, mode), S.tx)}</div>
    <p class="note">Tocca un riquadro con il + per aprire il ramo e toccalo di nuovo per chiuderlo. Le classi sono gli investimenti divisi per asset class e le altre categorie. Nella vista Aggregato la stessa classe presente su più conti è sommata, e aprendola vedi il dettaglio per conto. Scorri di lato se i rami sono larghi.</p></div>`;
}
