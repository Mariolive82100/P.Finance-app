'use strict';
/* ---------- Albero del patrimonio (interattivo) ---------- */
const TN = { w: 150, h: 46, gx: 44, gy: 12 };

/* Costruisce l'albero: patrimonio netto > (account >) attivi/passivi > macro categorie > (classi, solo per gli investimenti) > voci.
   La stessa classe presente su più conti viene sommata. */
function alberoDati(D, mode) {
  D = { ...D, voci: espandi(D.voci) };
  const att = D.voci.filter(v => v.tipo === 'attivo'), pas = D.voci.filter(v => v.tipo === 'passivo'), multi = D.accounts.length > 0;
  const sum = a => a.reduce((s, v) => s + v.valore, 0);
  const lato = (pid, t, voci, showAcc) => {
    if (!voci.length) return null;
    const tot = sum(voci), cats = [...new Set([...CATS[t === 'a' ? 'attivo' : 'passivo'], ...voci.map(v => v.categoria)])].filter(c => voci.some(v => v.categoria === c));
    const leaf = (base, v, ps, label, sub) => ({ id: base + '/' + v.id, lv: 'v', vid: v.piano || v.virt ? '' : v.id, tone: t, kids: [], val: v.valore, pct: ps > 0 ? v.valore / ps : null, label, sub });
    const leaves = (base, arr, ps) => {
      const srt = arr.slice().sort((x, y) => y.valore - x.valore), inv = v => v.categoria === 'Investimenti' && v.dove;
      if (!(showAcc && multi)) return srt.map(v => leaf(base, v, ps, inv(v) ? 'su ' + v.dove : dn(v), ''));
      /* aggregato: stessa piattaforma su più account = un solo ramo, con il dettaglio per account */
      const g = new Map(); srt.forEach(v => { const k = inv(v) ? 'b:' + v.dove.trim().toLowerCase() : 'v:' + v.id; if (!g.has(k)) g.set(k, []); g.get(k).push(v); });
      return [...g.entries()].map(([k, b]) => {
        if (b.length === 1) return leaf(base, b[0], ps, inv(b[0]) ? 'su ' + b[0].dove : dn(b[0]), accName(b[0]));
        const bs = sum(b);
        return { id: base + '/' + k, lv: 'v', vid: '', tone: t, val: bs, pct: ps > 0 ? bs / ps : null, label: 'su ' + b[0].dove.trim(), sub: b.length + ' account', kids: b.map(v => leaf(base + '/' + k, v, bs, accName(v), '')) };
      }).sort((x, y) => y.val - x.val);
    };
    const kids = cats.map(c => {
      const a = voci.filter(v => v.categoria === c), cs = sum(a), id = pid + '/' + c; let sub;
      if (t === 'a' && c === 'Investimenti') {
        const m = new Map(); a.forEach(v => { const k = v.assetClass || 'Non indicata'; if (!m.has(k)) m.set(k, []); m.get(k).push(v); });
        sub = [...m.entries()].map(([k, b]) => { const ks = sum(b); return { id: id + '/' + k, label: k, val: ks, pct: cs > 0 ? ks / cs : null, tone: t, lv: 'c', kids: leaves(id + '/' + k, b, ks) }; }).sort((x, y) => y.val - x.val);
      } else sub = leaves(id, a, cs);
      return { id, label: c, val: cs, pct: tot > 0 ? cs / tot : null, tone: t, lv: 'm', kids: sub };
    });
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
    const kids = open.has(n.id) ? n.kids : [], me = { n, lvl, y: 0, can: n.kids.length > 0, open: kids.length > 0, par: parent ? parent.n.id : '' };
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
  ma: { f: '#e3f3f0', s: '#2f8a80', t1: '#16302d', t2: '#0f766e', ln: '#4f9f96' }, mp: { f: '#fdeeee', s: '#c95555', t1: '#16302d', t2: '#b91c1c', ln: '#d96464' },
  ca: { f: '#eef6f5', s: '#4f9f96', t1: '#16302d', t2: '#0f766e', ln: '#4f9f96' }, cp: { f: '#fff5f5', s: '#d96464', t1: '#16302d', t2: '#b91c1c', ln: '#d96464' },
  va: { f: '#ffffff', s: '#b5d9d4', t1: '#16302d', t2: '#0f766e', ln: '#4f9f96' }, vp: { f: '#ffffff', s: '#efb0b0', t1: '#16302d', t2: '#b91c1c', ln: '#d96464' }
};
const tsty = n => n.lv === 'r' || n.lv === 'u' ? TSTY[n.lv] : TSTY[n.lv === 's' ? 's' + n.tone : n.lv === 'm' ? 'm' + n.tone : n.lv === 'c' ? 'c' + n.tone : 'v' + n.tone];

const TPOS = {}, TK = { k: 0.72 }, treeK = () => innerWidth >= 1000 ? TK.k : 1;
let TREE_ROOT = null;
function alberoSvg(root, open, focus) {
  TREE_ROOT = root;
  const L = alberoLayout(root, open), anim = !!S.tanim && Object.keys(TPOS).length > 0, W = L.depth * (TN.w + TN.gx) - TN.gx + 4, H = Math.max(1, L.rows) * (TN.h + TN.gy) - TN.gy + 4;
  const X = lvl => 2 + lvl * (TN.w + TN.gx), Y = m => 2 + m.y;
  const T = (x, y, s, sz, w, f, an = 'start') => `<text x="${x}" y="${y}" font-size="${sz}" font-weight="${w}" fill="${f}" text-anchor="${an}">${esc(s)}</text>`;
  let o = `<rect x="0" y="0" width="${W}" height="${H}" fill="transparent" />`;
  const hf = S.thl ? alberoTrova(root, S.thl) : null, hl = new Set();
  if (hf) { hf.path.forEach(n => hl.add(n.id)); const dw = n => { hl.add(n.id); n.kids.forEach(dw); }; dw(hf.node); }
  const NP = {}; L.nodes.forEach(m => { NP[m.n.id] = { x: X(m.lvl), y: Y(m) }; });
  L.links.forEach(([p, c]) => { const x1 = X(p.lvl) + TN.w, y1 = Y(p) + TN.h / 2, x2 = X(c.lvl), y2 = Y(c) + TN.h / 2, mx = (x1 + x2) / 2;
    o += `<path data-a="${esc(p.n.id)}" data-b="${esc(c.n.id)}"${anim ? ' class="tlk"' : ''}${hf && !(hl.has(p.n.id) && hl.has(c.n.id)) ? ' opacity=".15"' : ''} d="M${x1} ${y1} C${mx} ${y1} ${mx} ${y2} ${x2} ${y2}" fill="none" stroke="${tsty(c.n).ln}" stroke-width="2.2"/>`; });
  L.nodes.forEach(m => {
    const n = m.n, c = tsty(n), x = X(m.lvl), y = Y(m), pc = n.pct != null ? ' · ' + (n.pct * 100).toFixed(1).replace('.', ',') + '%' : '';
    let cl = '', st = '';
    if (anim) {
      const pv = TPOS[n.id];
      if (pv) { const dy = pv.y - NP[n.id].y, dx = pv.x - NP[n.id].x; if (Math.abs(dy) > 0.5 || Math.abs(dx) > 0.5) { cl = ' class="tmv"'; st = `--dx:${dx.toFixed(1)}px;--dy:${dy.toFixed(1)}px;`; } }
      else { const pp = TPOS[m.par] || NP[m.par]; if (pp) { cl = ' class="tin"'; st = `--dx:${(pp.x - NP[n.id].x).toFixed(1)}px;--dy:${(pp.y - NP[n.id].y).toFixed(1)}px;`; } else cl = ' class="tin"'; }
    }
    const ptr = 'cursor:pointer;', dim = hf && !hl.has(n.id) ? 'opacity:.2;' : '', sty = ` style="${st}${ptr}${dim}"`;
    o += `<g${cl}${sty} data-nid="${esc(n.id)}"><title>${esc(n.label + (n.sub ? ' · ' + n.sub : '') + ' · ' + eur(n.val) + pc)}</title>`
      + `<rect x="${x}" y="${y}" width="${TN.w}" height="${TN.h}" rx="10" fill="${c.f}" stroke="${c.s}" stroke-width="${n.id === focus || n.id === S.thl ? 4 : n.lv === 'v' ? 1.5 : 2}"/>`
      + T(x + 10, y + 19, trunc(n.label, 20), 11, 600, c.t1) + T(x + 10, y + 35, eur0(n.val) + pc, 10.5, 600, n.val < 0 ? '#b91c1c' : c.t2);
    if (n.vid) o += `<g data-act="tleaf" data-v="${esc(n.vid)}"><circle cx="${x + TN.w}" cy="${y + TN.h / 2}" r="10" fill="#fff" stroke="${c.s}" stroke-width="2"/>` + T(x + TN.w, y + TN.h / 2 + 4, '✎', 12, 700, c.s, 'middle') + '</g>';
    o += '</g>';
  });
  Object.keys(TPOS).forEach(k => delete TPOS[k]); Object.assign(TPOS, NP);
  const k = treeK();
  const wk = Math.round(W * k), hk = Math.round(H * k);
  /* su computer dimensioni fisse: il carattere è lo stesso con l'albero chiuso o aperto (la regola generale svg{width:100%} lo stirerebbe) */
  const fix = innerWidth >= 1000 ? `width:${wk}px;height:${hk}px;max-width:none;` : '';
  return `<svg data-tree="1" viewBox="0 0 ${W} ${H}" width="${wk}" height="${hk}" style="${fix}min-width:${wk}px">${o}</svg>`;
}

function alberoTrova(root, id, path = []) {
  const p = [...path, root];
  if (root.id === id) return { node: root, path: p };
  for (const k of root.kids) { const r = alberoTrova(k, id, p); if (r) return r; }
  return null;
}

/* altezza dell'albero con tutti i rami aperti: la finestra dell'albero si dimensiona su questa, così non cambia mai */
function alberoFull(root) {
  const all = new Set(['r']); const w = n => { if (n.kids.length) { all.add(n.id); n.kids.forEach(w); } }; w(root);
  const L = alberoLayout(root, all); return { h: Math.max(1, L.rows) * (TN.h + TN.gy) - TN.gy + 4, w: L.depth * (TN.w + TN.gx) - TN.gx + 4 };
}
function treeCard(root, focus, single, full) {
  const mode = single ? 'agg' : S.tview || 'agg', fu = alberoFull(root), wide = innerWidth >= 1000;
  /* computer, Panoramica: riquadro con l'albero in miniatura che si adatta alla finestra; il tocco lo ingrandisce */
  if (wide && !full && !S.tfull) {
    TK.k = 1;
    return `<div class="card tcard tcol${S.tcan ? ' anim-in' : ''}" data-act="topen" style="min-width:0"><div class="chh"><h2>Albero del patrimonio</h2>${single ? '' : `<span class="chb"><button class="b sm ${mode === 'agg' ? '' : 's'}" data-act="tview" data-v="agg">Aggregato</button><button class="b sm ${mode === 'acc' ? '' : 's'}" data-act="tview" data-v="acc">Per account</button></span>`}</div><div class="tt tmini">${alberoSvg(root, S.tx, focus)}</div></div>`;
  }
  /* albero ingrandito a tutto schermo (computer) */
  if (wide && full) {
    TK.k = Math.max(0.5, Math.min((innerWidth - 56) / fu.w, 2.4));
    return `<div class="fs tfs"><div class="chh"><h2>Albero del patrimonio</h2><button class="b sm" data-act="tclose">✕ Chiudi</button></div>
      ${single ? '' : `<div class="tabs" style="margin:0"><button class="b ${mode === 'agg' ? '' : 's'}" data-act="tview" data-v="agg">Aggregato</button><button class="b ${mode === 'acc' ? '' : 's'}" data-act="tview" data-v="acc">Per account</button></div>`}
      <div class="tt" style="flex:1;min-height:0;overflow:auto;display:flex;justify-content:center;align-items:flex-start">${alberoSvg(root, S.tx, focus)}</div></div>`;
  }
  /* scala l'albero aperto del tutto in modo che stia nella larghezza disponibile */
  const avail = wide ? innerWidth - 200 - 56 - 40 : innerWidth - 40;
  TK.k = Math.max(0.5, Math.min(avail / fu.w, wide && S.tpan ? 0.75 : 1.5));
  const fh = Math.round(fu.h * treeK()) + 20;
  return `<div class="card tcard${S.tcan ? ' anim-in' : ''}" style="min-width:0"><h2>Albero del patrimonio</h2>
    ${single ? '' : `<div class="tabs"><button class="b ${mode === 'agg' ? '' : 's'}" data-act="tview" data-v="agg">Aggregato</button><button class="b ${mode === 'acc' ? '' : 's'}" data-act="tview" data-v="acc">Per account</button></div>`}
    ${zeroToggle()}
    <div class="tw tt" style="margin-top:12px;--th:${fh}px">${alberoSvg(root, S.tx, focus)}</div>
    <p class="note">Tocca ✎ per aggiornare il valore di una voce.</p>
    ${!wide ? '<button class="b s sm" data-act="topie">Vai al grafico ↓</button>' : ''}</div>`;
}

/* ---------- Grafico a torta: si naviga con i tocchi sulle fette (indipendente dall'albero) ---------- */
const PALS = {
  a: ['#0f766e', '#14b8a6', '#2dd4bf', '#5eead4', '#115e59', '#0e7490', '#22d3ee', '#65a30d'],
  p: ['#b91c1c', '#dc2626', '#ef4444', '#f87171', '#fca5a5', '#9f1239', '#be123c', '#fb7185'],
  x: ['#1d4ed8', '#3b82f6', '#60a5fa', '#93c5fd', '#1e40af', '#0369a1', '#38bdf8', '#6366f1']
};
function pieDati(node) {
  const kids = node.kids.filter(k => k.val > 0), total = kids.reduce((s, k) => s + k.val, 0), cnt = {};
  const P = x => total > 0 ? (x / total * 100).toFixed(1).replace('.', ',') + '%' : '';
  const groups = kids.map(k => {
    const pal = PALS[k.tone] || PALS.a, n = cnt[k.tone] = (cnt[k.tone] ?? -1) + 1;
    return { id: k.id, can: k.kids.some(x => x.val > 0), label: k.label, sum: k.val, pct: P(k.val), col: pal[n % pal.length] };
  });
  return { sum: node.val, groups, total };
}
function pieCard(found) {
  const node = found.node, pb = pieDati(node), path = found.path.map(n => n.label).join(' › ');
  const nav = `<div class="tabs" style="margin:0 0 8px"><button class="b s sm" data-act="pback" ${S.pp && S.pp.length > 1 ? '' : 'disabled'}>← Indietro</button><button class="b s sm" data-act="phome" ${S.pp && S.pp.length > 1 ? '' : 'disabled'}>⟲ Torna all'inizio</button></div>`;
  if (!pb.groups.length) return `<div class="card pcard" id="pie"><h2>Grafico a torta</h2>${nav}<p class="note" style="margin-top:0">${esc(path)}</p><p>Nessuna voce da mostrare in questo ramo.</p></div>`;
  const gi = S.pieSel != null && pb.groups[S.pieSel] ? S.pieSel : -1;
  const CX = 200, CY = 200, r0 = 84, r1 = 178, tot = pb.total || 1, P2 = Math.PI * 2;
  const pt = (r, a) => [(CX + r * Math.cos(a)).toFixed(1), (CY + r * Math.sin(a)).toFixed(1)];
  const ring = (a0, a1, ra, rb) => {
    if (a1 - a0 >= P2 - 1e-3) return `M${CX + rb} ${CY}A${rb} ${rb} 0 1 1 ${CX - rb} ${CY}A${rb} ${rb} 0 1 1 ${CX + rb} ${CY}ZM${CX + ra} ${CY}A${ra} ${ra} 0 1 0 ${CX - ra} ${CY}A${ra} ${ra} 0 1 0 ${CX + ra} ${CY}Z`;
    const big = a1 - a0 > Math.PI ? 1 : 0, p1 = pt(rb, a0), p2 = pt(rb, a1 - 1e-4), p3 = pt(ra, a1 - 1e-4), p4 = pt(ra, a0);
    return `M${p1[0]} ${p1[1]}A${rb} ${rb} 0 ${big} 1 ${p2[0]} ${p2[1]}L${p3[0]} ${p3[1]}A${ra} ${ra} 0 ${big} 0 ${p4[0]} ${p4[1]}Z`;
  };
  let ang = -Math.PI / 2, paths = '';
  pb.groups.forEach((g, i) => {
    const a2 = ang + g.sum / tot * P2, on = gi === i, dim = gi >= 0 && !on ? ' dim' : '';
    paths += `<path class="${on ? 'sel' : ''}${dim}" d="${ring(ang, a2, r0, on ? r1 + 8 : r1)}" fill="${g.col}" fill-rule="evenodd" data-act="pies" data-v="${i}" data-tip="${esc(g.label + ' · ' + eur(g.sum) + ' · ' + g.pct)}"></path>`;
    ang = a2;
  });
  const sg = gi >= 0 ? pb.groups[gi] : null;
  const cl = sg ? sg.label : node.label, cv = sg ? sg.sum : pb.sum, cp = sg ? sg.pct : '';
  const hole = `<text x="${CX}" y="${CY - 8}" text-anchor="middle" font-size="14" fill="#5b7370">${esc(trunc(cl, 16))}</text><text x="${CX}" y="${CY + 14}" text-anchor="middle" font-size="19" font-weight="700" fill="#16302d">${eur0(cv)}</text>${cp ? `<text x="${CX}" y="${CY + 32}" text-anchor="middle" font-size="12" fill="#5b7370">${cp}</text>` : ''}`;
  const legend = pb.groups.map((g, i) => `<div class="pl ${i === gi ? 'on' : ''}" data-act="pies" data-v="${i}"><i style="background:${g.col}"></i><span class="a">${esc(g.label)}</span><span>${eur0(g.sum)} · ${g.pct}</span></div>`).join('');
  return `<div class="card pcard" id="pie" data-act="pdes"><h2>Grafico a torta</h2>${nav}<p class="note" style="margin-top:0">${esc(path)}</p>
    <div class="pbody"><div class="psvg"><svg class="pie${S.anim ? ' anim' : ''}${S.anim === true ? ' full' : ''}" viewBox="0 0 400 400"><g class="pg">${paths}</g>${hole}</svg>
</div><div class="pleg">${legend}</div></div></div>`;
}

/* ---------- Computer: quattro torte piccole; tocco sulla fetta = selezione, tocco sul riquadro = si ingrandisce ---------- */
const QT = { c: 'Per account', a: 'Attivi per categoria', i: 'Classi di investimento', p: 'Passivi per tipo', l: 'Liquido / non liquido' };
const QLIQ = ['Liquidità', 'Investimenti'];
/* radice (stesso formato dell'albero) di ciascuna torta; sempre i valori aggregati degli account considerati */
function qRoot(key, Dz) {
  const agg = alberoDati(Dz, 'agg'), lato = t => agg.kids.find(k => k.id === 'r/' + t), sm = arr => arr.reduce((s, k) => s + k.val, 0);
  let kids = [], val = 0;
  if (key === 'c') { const r = alberoDati(Dz, 'acc'); kids = r.kids; val = r.val; }
  else if (key === 'a' || key === 'p') { const n = lato(key); if (n) { kids = n.kids; val = n.val; } }
  else if (key === 'i') { const a = lato('a'), inv = a && a.kids.find(k => k.label === 'Investimenti'); if (inv) { kids = inv.kids.map(k => ({ ...k, tone: 'x' })); val = inv.val; } }
  else {
    const a = lato('a'), cats = a ? a.kids : [], mk = (id, label, tn, arr) => ({ id: 'r/' + id, label, tone: tn, lv: 'm', val: sm(arr), pct: null, kids: arr });
    kids = [mk('liq', 'Liquido', 'a', cats.filter(k => QLIQ.includes(k.label))), mk('nliq', 'Non liquido', 'x', cats.filter(k => !QLIQ.includes(k.label)))].filter(n => n.kids.length); val = sm(kids);
  }
  return { id: 'r', label: QT[key], val, pct: null, tone: 'a', lv: 'r', kids };
}
function ringPath(CX, CY, a0, a1, ra, rb) {
  const P2 = Math.PI * 2, pt = (r, a) => [(CX + r * Math.cos(a)).toFixed(1), (CY + r * Math.sin(a)).toFixed(1)];
  if (a1 - a0 >= P2 - 1e-3) return `M${CX + rb} ${CY}A${rb} ${rb} 0 1 1 ${CX - rb} ${CY}A${rb} ${rb} 0 1 1 ${CX + rb} ${CY}ZM${CX + ra} ${CY}A${ra} ${ra} 0 1 0 ${CX - ra} ${CY}A${ra} ${ra} 0 1 0 ${CX + ra} ${CY}Z`;
  const big = a1 - a0 > Math.PI ? 1 : 0, p1 = pt(rb, a0), p2 = pt(rb, a1 - 1e-4), p3 = pt(ra, a1 - 1e-4), p4 = pt(ra, a0);
  return `M${p1[0]} ${p1[1]}A${rb} ${rb} 0 ${big} 1 ${p2[0]} ${p2[1]}L${p3[0]} ${p3[1]}A${ra} ${ra} 0 ${big} 0 ${p4[0]} ${p4[1]}Z`;
}
/* piccola (big = false) o grande (big = true): stessa selezione delle fette in entrambe */
function qSvg(key, Dz, big) {
  const pb = pieDati(qRoot(key, Dz)), tot = pb.total || 1, CX = 200, CY = 200, r0 = big ? 84 : 100, r1 = big ? 176 : 188, f = big ? 0.5 : 1;
  const T = (y, sz, w, c, t) => `<text x="${CX}" y="${y}" text-anchor="middle" font-size="${sz}" font-weight="${w}" fill="${c}">${esc(t)}</text>`;
  const sel = S.qsel && S.qsel[key] != null && pb.groups[S.qsel[key]] ? S.qsel[key] : -1;
  let ang = -Math.PI / 2, o = '';
  if (!pb.groups.length) o = `<circle cx="${CX}" cy="${CY}" r="${(r0 + r1) / 2}" fill="none" stroke="#e2eceb" stroke-width="${r1 - r0}"/>` + T(CY + 8, 30, 400, '#5b7370', 'nessuna voce');
  else {
    pb.groups.forEach((g, i) => { const a2 = ang + g.sum / tot * Math.PI * 2, on = i === sel; o += `<path class="${on ? 'sel' : sel >= 0 ? 'dim' : ''}" d="${ringPath(CX, CY, ang, a2, r0, on ? r1 + 10 : r1)}" fill="${g.col}" fill-rule="evenodd" data-act="qs" data-v="${key}:${i}" data-tip="${esc(g.label + ' · ' + eur(g.sum) + ' · ' + g.pct)}"></path>`; ang = a2; });
    const g = sel >= 0 ? pb.groups[sel] : null;
    o += big ? (g ? T(CY - 14, 20, 400, '#5b7370', trunc(g.label, 13)) + T(CY + 16, 25, 700, '#16302d', eur0(g.sum)) + T(CY + 40, 17, 400, '#5b7370', g.pct) : T(CY - 10, 20, 400, '#5b7370', 'Totale') + T(CY + 20, 25, 700, '#16302d', eur0(pb.sum)))
      : (g ? T(CY - 18, 28, 400, '#5b7370', trunc(g.label, 14)) + T(CY + 22, 44, 700, '#16302d', compact(g.sum)) + T(CY + 56, 28, 400, '#5b7370', g.pct) : T(CY + 16, 46, 700, '#16302d', compact(pb.sum)));
  }
  return { pb, sel, svg: o };
}
function miniPie(key, Dz) {
  const r = qSvg(key, Dz, false);
  return `<div class="qc" data-act="qopen" data-v="${key}"><b>${QT[key]}</b><div class="qs"><svg class="qp" viewBox="0 0 400 400" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">${r.svg}</svg></div></div>`;
}
function bigPie(key, Dz, back = true) {
  const r = qSvg(key, Dz, true), head = `<div class="chh"><h2>${QT[key]}</h2>${back ? '<button class="b s sm" data-act="qclose">← Indietro</button>' : ''}</div>`;
  if (!r.pb.groups.length) return `<div class="card pcard qcard" id="pie">${head}<p>Nessuna voce da mostrare.</p></div>`;
  const leg = r.pb.groups.map((g, i) => `<div class="pl ${i === r.sel ? 'on' : ''}" data-act="qs" data-v="${key}:${i}"><i style="background:${g.col}"></i><span class="a">${esc(g.label)}</span><span>${eur0(g.sum)} · ${g.pct}</span></div>`).join('');
  return `<div class="card pcard qcard${S.panim === 'in' ? ' anim-in' : ''}" id="pie" data-act="qdes" data-v="${key}">${head}<div class="pbody"><div class="psvg"><svg class="pie" viewBox="0 0 400 400"><g>${r.svg}</g></svg></div><div class="pleg">${leg}</div></div></div>`;
}
function quadCard(Dz, single) {
  const keys = single ? ['l', 'a', 'i', 'p'] : ['c', 'a', 'i', 'p'];
  if (S.qd && !keys.includes(S.qd)) S.qd = null;
  if (S.qd) return bigPie(S.qd, Dz, true);
  return `<div class="card pcard qcard${S.panim === 'out' ? ' anim-out' : ''}" id="pie"><h2>Grafici a torta</h2><div class="qg">${keys.map(k => miniPie(k, Dz)).join('')}</div></div>`;
}

/* Passaggio del mouse: evidenzia il blocco con il suo ramo e sbiadisce il resto (senza ridisegnare) */
function treeHover(svg, id) {
  const gs = svg.querySelectorAll('[data-nid]'), ps = svg.querySelectorAll('[data-a]');
  const hf = id && TREE_ROOT ? alberoTrova(TREE_ROOT, id) : null;
  if (!hf) { gs.forEach(g => { g.style.opacity = ''; }); ps.forEach(p => p.removeAttribute('opacity')); return; }
  const hl = new Set(); hf.path.forEach(n => hl.add(n.id)); const dw = n => { hl.add(n.id); n.kids.forEach(dw); }; dw(hf.node);
  gs.forEach(g => { g.style.opacity = hl.has(g.dataset.nid) ? '' : '.2'; });
  ps.forEach(p => p.setAttribute('opacity', hl.has(p.dataset.a) && hl.has(p.dataset.b) ? '1' : '.15'));
}
document.addEventListener('mouseover', e => {
  const s = e.target.closest && e.target.closest('svg[data-tree]'); if (!s) return;
  const g = e.target.closest('[data-nid]'); treeHover(s, g ? g.dataset.nid : null);
});
document.addEventListener('mouseout', e => {
  const s = e.target.closest && e.target.closest('svg[data-tree]');
  if (s && !(e.relatedTarget && s.contains(e.relatedTarget))) treeHover(s, null);
});
