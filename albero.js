'use strict';
/* ---------- Albero del patrimonio (interattivo) ---------- */

/* Costruisce l'albero: patrimonio netto > (account >) attivi/passivi > macro categorie > (classi, solo per gli investimenti) > voci.
   La stessa classe presente su più conti viene sommata. */
function alberoDati(D, mode) {
  const att = D.voci.filter(v => v.tipo === 'attivo'), pas = D.voci.filter(v => v.tipo === 'passivo'), multi = D.accounts.length > 0;
  const sum = a => a.reduce((s, v) => s + v.valore, 0);
  const lato = (pid, t, voci, showAcc) => {
    if (!voci.length) return null;
    const tot = sum(voci), cats = [...new Set([...CATS[t === 'a' ? 'attivo' : 'passivo'], ...voci.map(v => v.categoria)])].filter(c => voci.some(v => v.categoria === c));
    const leaves = (base, arr, ps) => arr.slice().sort((x, y) => y.valore - x.valore).map(v => ({ id: base + '/' + v.id, lv: 'v', vid: v.piano ? '' : v.id, tone: t, kids: [], val: v.valore, pct: ps > 0 ? v.valore / ps : null,
      label: v.categoria === 'Investimenti' && v.dove ? 'su ' + v.dove : dn(v), sub: showAcc && multi ? accName(v) : '' }));
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

const TSTY = {
  r: { f: '#1f3b38', s: '#1f3b38', t1: '#d6f2ee', t2: '#ffffff', ln: '#8aa5a2' },
  u: { f: '#e8eefb', s: '#1d4ed8', t1: '#16302d', t2: '#1d4ed8', ln: '#7d97d6' },
  sa: { f: '#d6f2ee', s: '#0f766e', t1: '#16302d', t2: '#0f766e', ln: '#4f9f96' }, sp: { f: '#fde8e8', s: '#b91c1c', t1: '#16302d', t2: '#b91c1c', ln: '#d96464' },
  ma: { f: '#e3f3f0', s: '#2f8a80', t1: '#16302d', t2: '#0f766e', ln: '#4f9f96' }, mp: { f: '#fdeeee', s: '#c95555', t1: '#16302d', t2: '#b91c1c', ln: '#d96464' },
  ca: { f: '#eef6f5', s: '#4f9f96', t1: '#16302d', t2: '#0f766e', ln: '#4f9f96' }, cp: { f: '#fff5f5', s: '#d96464', t1: '#16302d', t2: '#b91c1c', ln: '#d96464' },
  va: { f: '#ffffff', s: '#b5d9d4', t1: '#16302d', t2: '#0f766e', ln: '#4f9f96' }, vp: { f: '#ffffff', s: '#efb0b0', t1: '#16302d', t2: '#b91c1c', ln: '#d96464' }
};
const tsty = n => n.lv === 'r' || n.lv === 'u' ? TSTY[n.lv] : TSTY[n.lv === 's' ? 's' + n.tone : n.lv === 'm' ? 'm' + n.tone : n.lv === 'c' ? 'c' + n.tone : 'v' + n.tone];

/* Albero verticale con rami collegati da linee */
function alberoLista(root, open, focus) {
  const walk = (n, par, last) => {
    const c = tsty(n), can = n.kids.length > 0, isOpen = can && open.has(n.id), pc = n.pct != null ? (n.pct * 100).toFixed(1).replace('.', ',') + '%' : '';
    const act = can ? ` data-act="tn" data-v="${esc(n.id)}" data-p="${esc(par)}"` : n.vid ? ` data-act="tleaf" data-v="${esc(n.vid)}"` : '';
    const mark = can ? (isOpen ? '▾' : '▸') : n.vid ? '✎' : '';
    let o = `<div class="tb${par ? '' : ' tr0'}" style="--ln:${c.ln}"><div class="tr${n.id === focus ? ' foc' : ''}${act ? ' clk' : ''}"${act} style="background:${c.f};border-color:${c.s};color:${c.t1}" title="${esc(n.label)}">`
      + `<span class="tm" style="color:${c.s}">${mark}</span><span class="tl">${esc(n.label)}${n.sub ? `<small>${esc(n.sub)}</small>` : ''}</span>`
      + `<span class="tv" style="color:${n.val < 0 ? '#b91c1c' : c.t2}">${eur0(n.val)}${pc ? `<small>${pc}</small>` : ''}</span></div>`;
    if (isOpen) o += `<div class="tk">${n.kids.map((k, i) => walk(k, n.id, i === n.kids.length - 1)).join('')}</div>`;
    return o + '</div>';
  };
  return walk(root, '', true);
}

function alberoTrova(root, id, path = []) {
  const p = [...path, root];
  if (root.id === id) return { node: root, path: p };
  for (const k of root.kids) { const r = alberoTrova(k, id, p); if (r) return r; }
  return null;
}

function treeCard(root, focus) {
  const mode = S.tview || 'agg';
  return `<div class="card tcard" style="min-width:0"><h2>Albero del patrimonio</h2>
    <div class="tabs"><button class="b ${mode === 'agg' ? '' : 's'}" data-act="tview" data-v="agg">Aggregato</button><button class="b ${mode === 'acc' ? '' : 's'}" data-act="tview" data-v="acc">Per account</button></div>
    ${zeroToggle()}
    <div class="tabs" style="margin-top:8px"><button class="b s sm" data-act="texp">Espandi</button><button class="b s sm" data-act="tcol">Comprimi</button><button class="b s sm" data-act="topie">Grafico ↓</button></div>
    <div class="tt" style="margin-top:12px">${alberoLista(root, S.tx, focus)}</div>
    <p class="note">Tocca una riga con la freccia per aprire il ramo e toccala di nuovo per chiuderlo. Sulle voci finali (con la matita) tocca per aggiornare il valore. Il grafico a torta mostra i rami del riquadro evidenziato. Nella vista Aggregato la stessa classe presente su più conti è sommata, e aprendola vedi il dettaglio per conto.</p></div>`;
}

/* ---------- Grafico a torta: segue il ramo evidenziato nell'albero ---------- */
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
    return { label: k.label, sum: k.val, pct: P(k.val), col: pal[n % pal.length] };
  });
  return { sum: node.val, groups, total };
}
function pieCard(found) {
  const node = found.node, pb = pieDati(node), path = found.path.map(n => n.label).join(' › ');
  if (!pb.groups.length) return `<div class="card pcard" id="pie"><h2>Grafico a torta</h2><p class="note" style="margin-top:0">${esc(path)}</p><p>Nessuna voce da mostrare in questo ramo.</p></div>`;
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
  return `<div class="card pcard" id="pie"><h2>Grafico a torta</h2><p class="note" style="margin-top:0">${esc(path)}</p>
    <svg class="pie${S.anim ? ' anim' : ''}${S.anim === true ? ' full' : ''}" viewBox="0 0 400 400"><g class="pg">${paths}</g>${hole}</svg>
    <p class="note" style="text-align:center;margin:0 0 6px">Mostra i rami di ${esc(node.label)}. Tocca una fetta.</p>${legend}</div>`;
}
