'use strict';
/* ---------- Grafici interattivi ---------- */
const CH = {}, CHK = {}, CHS = {}, ZM = {};
const CW = () => Math.max(300, Math.min(innerWidth - (innerWidth >= 1000 ? 200 : 0), 1320) - 62), CHt = w => Math.max(210, Math.min(400, Math.round(w * 0.6)));
const lcInit = (id, key, pts, series, W, H) => { CH[id] = { pts, raw: pts, series, key, W, H, geom: null }; CHK[key] = CH[id]; };
function lcSvg(id) {
  const c = CH[id]; let pts = c.raw, n = pts.length; const W = c.W, H = c.H, L = 50, R = 12, T = 12, B = 28;
  let z = ZM[c.key]; const sig = pts[0].lab + '|' + pts[n - 1].lab;
  if (!z || z.n !== n || z.sig !== sig) z = ZM[c.key] = { a: 0, b: Math.max(1, n - 1), n, sig };
  const isBar = c.series.some(q => q.bar), pad = isBar ? 0.5 : 0;
  const a = z.a, b = z.b, zoomed = a > 0.001 || b < n - 1.001;
  const lo = Math.max(0, Math.ceil(a - 1e-6)), hi = Math.min(n - 1, Math.floor(b + 1e-6));
  const SV = c.series.filter(q => !q.off);
  if (SV.some(q => q.rebase)) { const base = c.raw[lo].abs; pts = c.pts = c.raw.map(p => ({ ...p, var: p.abs - base })); } else c.pts = pts;
  let mn = Infinity, mx = -Infinity;
  for (let i = lo; i <= hi; i++) SV.forEach(s => { const v = pts[i][s.k]; if (v != null) { if (v < mn) mn = v; if (v > mx) mx = v; } });
  if (!isFinite(mn)) { mn = 0; mx = 1; }
  if (SV.some(q => q.fit) || (zoomed && !isBar)) { const p = (mx - mn) * 0.08 || 1; mn -= p; mx += p; } else { mn = Math.min(0, mn); mx = Math.max(0, mx); }
  if (mx === mn) mx = mn + 1;
  const x = i => L + (i - a + pad) / (b - a + 2 * pad) * (W - L - R), y = v => T + (mx - v) / (mx - mn) * (H - T - B);
  c.geom = { a, b, L, R, T, B, x, n, pad };
  let o = `<defs><clipPath id="cp${id}"><rect x="${L}" y="${T - 4}" width="${W - L - R}" height="${H - T - B + 8}"/></clipPath></defs>`;
  for (let k = 0; k < 4; k++) { const t = mn + (mx - mn) * k / 3; o += `<line x1="${L}" x2="${W - R}" y1="${y(t).toFixed(1)}" y2="${y(t).toFixed(1)}" stroke="#e2eceb"/><text x="${L - 6}" y="${(y(t) + 4).toFixed(1)}" font-size="11" fill="#5b7370" text-anchor="end">${compact(t)}</text>`; }
  const vc = hi - lo + 1, step = Math.max(1, Math.ceil(vc / Math.max(2, Math.floor((W - L - R) / 62))));
  for (let i = lo; i <= hi; i++) if (!isBar && (vc <= 40 || (i - lo) % step === 0)) { const yr = i > 0 && pts[i].lab.slice(-2) !== pts[i - 1].lab.slice(-2); o += `<line x1="${x(i).toFixed(1)}" x2="${x(i).toFixed(1)}" y1="${T}" y2="${H - B}" stroke="${yr ? '#b7c7c4' : '#e9f0ef'}" stroke-width="${yr ? 1.4 : 1}"/>`; }
  for (let i = lo; i <= hi; i++) if ((i - lo) % step === 0) o += `<text x="${x(i).toFixed(1)}" y="${H - 8}" font-size="11" fill="#5b7370" text-anchor="${x(i) > W - R - 22 ? 'end' : 'middle'}">${esc(pts[i].lab)}</text>`;
  const i0 = Math.max(0, lo - 1), i1 = Math.min(n - 1, hi + 1);
  if (mn <= 0 && mx >= 0) {
    const z0 = y(0); o += `<line x1="${L}" x2="${W - R}" y1="${z0.toFixed(1)}" y2="${z0.toFixed(1)}" stroke="#475569" stroke-width="1.6"/>`;
    if (SV.some(q => q.zero) && Math.abs(z0 - y(mn)) > 12 && Math.abs(z0 - y(mx)) > 12) o += `<text x="${L - 6}" y="${(z0 + 4).toFixed(1)}" font-size="11" font-weight="700" fill="#475569" text-anchor="end">0</text>`;
  }
  const y0c = Math.max(T - 4, Math.min(H - B + 4, y(0)));
  c.series.forEach(se => {
    if (se.ghost || se.off) return;
    if (se.bar) {
      const bw = Math.min(44, (W - L - R) / (b - a + 2 * pad) * 0.6), yz = y(0);
      o += `<g clip-path="url(#cp${id})">` + pts.map((q, i) => { const v = q[se.k]; if (v == null || i < lo - 1 || i > hi + 1) return ''; const yv = y(v); return `<rect x="${(x(i) - bw / 2).toFixed(1)}" y="${Math.min(yv, yz).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(Math.abs(yv - yz), 1.5).toFixed(1)}" rx="3" fill="${v >= 0 ? '#15803d' : '#b91c1c'}"/>`; }).join('') + '</g>';
      return;
    }
    let seg = [];
    for (let i = i0; i <= i1; i++) if (pts[i][se.k] != null) seg.push(x(i).toFixed(1) + ',' + y(pts[i][se.k]).toFixed(1));
    const pl = col => `<polyline points="${seg.join(' ')}" fill="none" stroke="${col}" stroke-width="2.5" ${se.dash ? 'stroke-dasharray="6 4"' : ''} stroke-linejoin="round"/>`;
    if (se.zero) {
      o += `<defs><clipPath id="cu${id}"><rect x="${L}" y="${T - 4}" width="${W - L - R}" height="${(y0c - (T - 4)).toFixed(1)}"/></clipPath><clipPath id="cd${id}"><rect x="${L}" y="${y0c.toFixed(1)}" width="${W - L - R}" height="${(H - B + 4 - y0c).toFixed(1)}"/></clipPath></defs><g clip-path="url(#cu${id})">${pl(se.c)}</g><g clip-path="url(#cd${id})">${pl('#b91c1c')}</g>`;
    } else o += `<g clip-path="url(#cp${id})">${pl(se.c)}</g>`;
    o += `<g clip-path="url(#cp${id})">`;
    if (vc <= 18) for (let i = lo; i <= hi; i++) if (pts[i][se.k] != null) o += `<circle cx="${x(i).toFixed(1)}" cy="${y(pts[i][se.k]).toFixed(1)}" r="3.5" fill="${se.zero && pts[i][se.k] < 0 ? '#b91c1c' : se.c}"/>`;
    if (!se.nm && hi > lo) {
      let iMin = -1, iMax = -1;
      for (let i = lo; i <= hi; i++) { const v = pts[i][se.k]; if (v == null) continue; if (iMin < 0 || v < pts[iMin][se.k]) iMin = i; if (iMax < 0 || v > pts[iMax][se.k]) iMax = i; }
      if (iMin >= 0 && pts[iMin][se.k] !== pts[iMax][se.k]) o += [[iMin, '#b91c1c'], [iMax, '#15803d']].map(([i, col]) => `<circle cx="${x(i).toFixed(1)}" cy="${y(pts[i][se.k]).toFixed(1)}" r="5.5" fill="${col}" stroke="#fff" stroke-width="1.5"/>`).join('');
    }
    o += '</g>';
    if (se.ck && pts[0].mese) {
      const cks = [];
      for (let i = lo; i <= hi; i++) { const v = pts[i][se.k], yy = pts[i].mese.slice(0, 4); if (v != null && !(i > 0 && pts[i - 1].mese.slice(0, 4) === yy)) cks.push({ i, v, cx: x(i), jan: pts[i].mese.slice(5) === '01' }); }
      cks.forEach((k, j) => {
        if (cks[j + 1] && cks[j + 1].cx - k.cx < 95 && !k.jan) return;
        const cy = y(k.v), top = cy - (T + 18) >= 10, ly = top ? T + 14 : H - B - 8, an = k.cx < L + 50 ? 'start' : k.cx > W - R - 50 ? 'end' : 'middle', tx = an === 'start' ? k.cx + 3 : an === 'end' ? k.cx - 3 : k.cx;
        o += `<line x1="${k.cx.toFixed(1)}" x2="${k.cx.toFixed(1)}" y1="${cy.toFixed(1)}" y2="${(top ? ly + 4 : ly - 12).toFixed(1)}" stroke="${se.c}" stroke-width="1.6" stroke-dasharray="4 3" opacity=".75"/><text x="${tx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="12" font-weight="700" fill="${se.c}" text-anchor="${an}" stroke="#fff" stroke-width="3" paint-order="stroke">${esc(pts[k.i].mese.slice(0, 4) + ' · ' + compact(k.v))}</text>`;
      });
    }
  });
  c.geom.y = y;
  return `<svg class="lc" viewBox="0 0 ${W} ${H}">${o}<g class="xh"></g></svg>`;
}
function lcBlock(id) { return `<div class="lcw" data-ch="${id}" data-k="${CH[id].key}">${lcSvg(id)}</div>`; }
const lcLegend = ser => ser.every(x => x.nolg) ? '' : `<div class="legend">${ser.filter(x => !x.bar && !x.ghost).map(x => x.tog ? `<span class="lt${x.off ? ' off' : ''}" data-act="ser" data-v="${x.k}"><i style="background:${x.c}"></i>${x.l}</span>` : `<span><i style="background:${x.c}"></i>${x.l}</span>`).join('')}${ser.some(x => x.bar) ? '<span><i style="background:#15803d"></i>Aumento</span><span><i style="background:#b91c1c"></i>Calo</span>' : ''}</div>`;
const AGGK = ['main', 'net', 'bar', 'pas'];
const lcAgg = key => {
  if (!AGGK.includes(key)) return '';
  const ok = S.data && new Set(S.data.storico.map(x => x.mese.slice(0, 4))).size >= 2, cur = ok ? (S.agg || 'm') : 'm';
  const hb = hubOpen(), opts = hb ? [['m', 'Mese'], ['yf', 'Anno']] : [['m', 'Mese'], ['yf', 'Anno (fine)'], ['ya', 'Anno (media)']];
  return `<div class="zc">${opts.map(([v, l]) => `<button class="b ${cur === v ? '' : 's'} sm" data-act="agg" data-v="${v}" ${ok ? '' : 'disabled'}>${l}</button>`).join('')}</div>`;
};
const lcZoomBar = key => lcAgg(key) + (hubOpen() ? '' : `<div class="zc"><button class="b s sm" data-act="zm" data-k="${key}" data-v="out" aria-label="Riduci">−</button><button class="b s sm" data-act="zm" data-k="${key}" data-v="in" aria-label="Ingrandisci">＋</button><button class="b s sm" data-act="zm" data-k="${key}" data-v="l" aria-label="Indietro">◀</button><button class="b s sm" data-act="zm" data-k="${key}" data-v="r" aria-label="Avanti">▶</button><button class="b s sm" data-act="zm" data-k="${key}" data-v="0">Tutto</button></div>`);
const hubOpen = () => innerWidth >= 1000 && S.tab === 'pan' && !!S.hq;
function lcCard(key, title, pts, series, w, h) {
  CHS[key] = { title, pts, series };
  const ww = w || CW();
  lcInit(key, key, pts, series, ww, h || CHt(ww));
  const hb = hubOpen(), bk = hb ? '<button class="b s sm" data-act="hclose">← Indietro</button>' : '', cs = hb && key === 'cmp' ? cmpSel() : '';
  return `<div class="card"><div class="chh"><h2>${esc(title)}</h2><span class="chb">${cs}${bk}<button class="b s sm" data-act="fs" data-v="${key}" aria-label="Schermo intero">⛶</button></span></div>${lcLegend(series)}${lcBlock(key)}${lcZoomBar(key)}
    <p class="note" style="margin:4px 0 0">${AGGK[0] === key ? 'Tocca i nomi in alto per mostrare o nascondere le linee. ' : ''}Tocca un punto per vedere il valore, tocca di nuovo per nasconderlo.${hb ? '' : ' Pizzica con due dita (o Ctrl + rotellina) per ingrandire, trascina per scorrere.'}</p></div>`;
}
function fsOverlay() {
  const s = CHS[S.fs]; if (!s) return '';
  const id = S.fs + 'F';
  lcInit(id, S.fs, s.pts, s.series, Math.max(320, innerWidth - 24), Math.max(200, innerHeight - 150));
  return `<div class="fs"><div class="chh"><h2>${esc(s.title)}</h2><button class="b sm" data-act="fs" data-v="">✕ Chiudi</button></div>${lcLegend(s.series)}${lcBlock(id)}${lcZoomBar(S.fs)}</div>`;
}
function lcRepaint(key) { document.querySelectorAll('.lcw[data-k="' + key + '"]').forEach(w => { if (CH[w.dataset.ch]) w.innerHTML = lcSvg(w.dataset.ch); }); }
function lcSet(key, a, b) {
  const c = CHK[key]; if (!c) return; const n = c.pts.length, mins = Math.min(n - 1, 3);
  if (b - a < mins) { const m = (a + b) / 2; a = m - mins / 2; b = m + mins / 2; }
  if (b - a > n - 1) { a = 0; b = n - 1; }
  if (a < 0) { b -= a; a = 0; } if (b > n - 1) { a -= b - (n - 1); b = n - 1; }
  ZM[key] = { a: Math.max(0, a), b, n, sig: ZM[key] ? ZM[key].sig : c.pts[0].lab + '|' + c.pts[n - 1].lab };
}
function lcZoom(key, f, ci) { const z = ZM[key] || { a: 0, b: CHK[key].pts.length - 1 }; lcSet(key, ci - (ci - z.a) / f, ci + (z.b - ci) / f); lcRepaint(key); }
function lcPan(key, di) { const z = ZM[key]; if (!z) return; lcSet(key, z.a + di, z.b + di); lcRepaint(key); }
function lcIdx(w, clientX) {
  const c = CH[w.dataset.ch], svg = w.querySelector('svg'); if (!c || !c.geom || !svg) return null;
  const r = svg.getBoundingClientRect(), g = c.geom, px = (clientX - r.left) * c.W / r.width;
  return g.a - g.pad + (px - g.L) / (c.W - g.L - g.R) * (g.b - g.a + 2 * g.pad);
}
function lcCross(w, clientX, tap) {
  const c = CH[w.dataset.ch]; if (!c || !c.geom) return; const g = c.geom, fi = lcIdx(w, clientX); if (fi === null) return;
  const idx = Math.min(Math.floor(g.b + 1e-6), Math.max(Math.ceil(g.a - 1e-6), Math.round(fi))), pt = c.pts[idx], xs = g.x(idx), xh = w.querySelector('.xh'); if (!pt || !xh) return;
  if (tap && w._sel === idx && xh.innerHTML) { xh.innerHTML = ''; w._sel = null; w._hid = idx; return; }
  if (!tap && w._hid === idx) return;
  w._hid = null; w._sel = idx;
  const rows = c.series.filter(s => !s.off && !s.ghost && pt[s.k] != null), bw = 178, bh = 22 + rows.length * 15, bx = Math.max(4, Math.min(c.W - bw - 4, xs + 10 + bw > c.W - 4 ? xs - 10 - bw : xs + 10));
  xh.innerHTML = `<line x1="${xs.toFixed(1)}" x2="${xs.toFixed(1)}" y1="${g.T}" y2="${c.H - g.B}" stroke="#5b7370" stroke-dasharray="3 3"/>`
    + rows.map(s => `<circle cx="${xs.toFixed(1)}" cy="${g.y(pt[s.k]).toFixed(1)}" r="4.5" fill="#fff" stroke="${s.c}" stroke-width="2.5"/>`).join('')
    + `<rect x="${bx.toFixed(1)}" y="${g.T + 2}" width="${bw}" height="${bh}" rx="6" fill="#16302d" opacity=".93"/><text x="${(bx + 8).toFixed(1)}" y="${g.T + 16}" font-size="11.5" font-weight="700" fill="#fff">${esc(pt.long || pt.lab)}</text>`
    + rows.map((s, j) => `<text x="${(bx + 8).toFixed(1)}" y="${g.T + 31 + j * 15}" font-size="11" fill="${s.c === '#0f766e' ? '#5eead4' : s.c === '#b91c1c' ? '#fca5a5' : s.c === '#1d4ed8' ? '#93c5fd' : '#e2e8f0'}">${esc(s.l)}: ${eur(pt[s.k])}</text>`).join('');
}
const PT = new Map(); let PINCH = null;
let PTYPE = '';
document.addEventListener('pointerdown', e => {
  const w = e.target.closest && e.target.closest('.lcw');
  PTYPE = e.pointerType; if (e.pointerType === 'touch') { const t = e.target.closest && e.target.closest('[data-tip]'); tipAt(e, t && !t.closest('.pie') ? t : null); }
  if (!w) return;
  PT.set(e.pointerId, { x: e.clientX, w }); PINCH = null;
  if (PT.size === 1) lcCross(w, e.clientX, true);
});
document.addEventListener('pointermove', e => {
  const pr = PT.get(e.pointerId);
  if (pr) {
    const prevX = pr.x; pr.x = e.clientX; const w = pr.w, key = w.dataset.k;
    if (PT.size >= 2) {
      const [p1, p2] = [...PT.values()], d = Math.abs(p1.x - p2.x), m = (p1.x + p2.x) / 2, fi = lcIdx(w, m);
      if (PINCH && PINCH.d > 8 && d > 8 && fi !== null) { lcZoom(key, d / PINCH.d, fi); const f2 = lcIdx(w, m); if (f2 !== null) lcPan(key, fi - f2); }
      PINCH = { d };
    } else if ((e.pointerType !== 'mouse' || e.buttons) && ZM[key] && (ZM[key].a > 0.001 || ZM[key].b < ZM[key].n - 1.001)) {
      const f1 = lcIdx(w, prevX), f2 = lcIdx(w, e.clientX); if (f1 !== null && f2 !== null) lcPan(key, f1 - f2);
    } else lcCross(w, e.clientX);
  } else if (e.pointerType === 'mouse') { const w = e.target.closest && e.target.closest('.lcw'); if (w) lcCross(w, e.clientX); }
});
const pend0 = e => { PT.delete(e.pointerId); PINCH = null; };
document.addEventListener('pointerup', pend0); document.addEventListener('pointercancel', pend0);
document.addEventListener('mouseout', e => { const w = e.target.closest && e.target.closest('.lcw'); if (w && !(e.relatedTarget && w.contains(e.relatedTarget))) { const xh = w.querySelector('.xh'); if (xh) xh.innerHTML = ''; w._sel = null; w._hid = null; } });
document.addEventListener('wheel', e => {
  const w = e.target.closest && e.target.closest('.lcw'); if (!w || !(e.ctrlKey || e.metaKey)) return;
  e.preventDefault(); const fi = lcIdx(w, e.clientX); if (fi !== null) lcZoom(w.dataset.k, e.deltaY < 0 ? 1.25 : 0.8, fi);
}, { passive: false });
let WIDE = innerWidth >= 1000;
window.addEventListener('resize', () => { const w = innerWidth >= 1000, ch = w !== WIDE; WIDE = w; if (S.fs || (ch && S.data)) render(); });

/* confronto periodo su periodo */
const addMk = (k, d) => { const [y, m] = k.split('-').map(Number); return monthKey(new Date(y, m - 1 + d, 1)); };
function cmpData(all, mode) {
  const map = {}; all.forEach(s => map[s.mese] = s.netto);
  const last = all[all.length - 1].mese; let kA;
  if (mode === 'y') { const y = +last.slice(0, 4), m = +last.slice(5); kA = Array.from({ length: m }, (_, i) => `${y}-${String(i + 1).padStart(2, '0')}`); }
  else { const N = +mode; kA = Array.from({ length: N }, (_, i) => addMk(last, i - N + 1)); }
  const kB = kA.map(k => addMk(k, mode === 'y' ? -12 : -(+mode)));
  const dl = k => map[k] != null && map[addMk(k, -1)] != null ? map[k] - map[addMk(k, -1)] : null;
  const cu = ks => { const base = map[addMk(ks[0], -1)]; return ks.map(k => base != null && map[k] != null ? map[k] - base : null); };
  return { kA, kB, dA: kA.map(dl), dB: kB.map(dl), cA: cu(kA), cB: cu(kB) };
}
function cmpBars(d, w, h) {
  const n = d.kA.length, W = w || CW(), H = h || Math.round(CHt(W) * 0.85), L = 50, R = 12, T = 12, B = 28, half = (H - T - B) / 2, mid = T + half;
  const mx = Math.max(1, ...d.dA.concat(d.dB).filter(v => v != null).map(Math.abs)), slot = (W - L - R) / n, bw = Math.min(18, slot * 0.38), step = Math.ceil(n / 8);
  let o = [mx, 0, -mx].map(t => `<line x1="${L}" x2="${W - R}" y1="${(mid - t / mx * half).toFixed(1)}" y2="${(mid - t / mx * half).toFixed(1)}" stroke="${t === 0 ? '#9db3af' : '#e2eceb'}"/><text x="${L - 6}" y="${(mid - t / mx * half + 4).toFixed(1)}" font-size="11" fill="#5b7370" text-anchor="end">${compact(t)}</text>`).join('');
  const bar = (v, cx, col, tip) => { if (v == null) return ''; const h = Math.abs(v) / mx * half; return `<rect x="${cx.toFixed(1)}" y="${(v >= 0 ? mid - h : mid).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, 1.5).toFixed(1)}" rx="2.5" fill="${col}" data-tip="${esc(tip)}"/>`; };
  for (let i = 0; i < n; i++) {
    const cx = L + slot * (i + 0.5);
    o += bar(d.dB[i], cx - bw - 1, '#9aa9c7', `${shortM(d.kB[i])}: ${d.dB[i] == null ? '–' : eur(d.dB[i])}`) + bar(d.dA[i], cx + 1, '#1d4ed8', `${shortM(d.kA[i])}: ${d.dA[i] == null ? '–' : eur(d.dA[i])}`);
    if (i % step === 0 || i === n - 1) o += `<text x="${cx.toFixed(1)}" y="${H - 8}" font-size="11" fill="#5b7370" text-anchor="middle">${shortM(d.kA[i])}</text>`;
  }
  return `<svg viewBox="0 0 ${W} ${H}">${o}</svg>`;
}
const CMP_OPT = [['y', 'Anno in corso vs anno precedente'], ['12', 'Ultimi 12 mesi vs 12 precedenti'], ['6', 'Ultimi 6 mesi vs 6 precedenti'], ['3', 'Ultimi 3 mesi vs 3 precedenti']];
const cmpSel = () => { const mode = S.cmp || 'y'; return `<select data-act="cmpm">${CMP_OPT.map(([v, l]) => `<option value="${v}" ${mode === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`; };
function cmpParts(all, noSel, w, h1, h2) {
  const mode = S.cmp || 'y', hb = hubOpen(), d = cmpData(all, mode), head = hb ? `<div class="chh"><h2>Confronto tra periodi</h2><span class="chb">${cmpSel()}<button class="b s sm" data-act="hclose">← Indietro</button></span></div>` : `<h2>Confronto tra periodi</h2>${noSel ? '' : cmpSel()}`;
  if (!d.dB.some(v => v != null) && !d.cB.some(v => v != null)) return { a: `<div class="card">${head}<p class="note">Per questo confronto servono più mesi di storico (anche quelli del periodo precedente).</p></div>`, b: '' };
  const lg = [{ k: 'a', c: '#1d4ed8', l: 'Periodo attuale' }, { k: 'b', c: '#9aa9c7', l: 'Periodo precedente', dash: true }];
  const pts = d.kA.map((k, i) => ({ lab: shortM(k), long: shortM(k) + ' / ' + shortM(d.kB[i]), a: d.cA[i], b: d.cB[i] }));
  return { a: `<div class="card">${head}<div class="legend"><span><i style="background:#1d4ed8"></i>Periodo attuale</span><span><i style="background:#9aa9c7"></i>Periodo precedente</span></div>
    <h3 style="font-size:14px;margin:8px 0 2px">Variazione mensile del patrimonio netto</h3>${cmpBars(d, w, h1)}</div>`, b: lcCard('cmp', 'Crescita accumulata: periodo attuale e precedente', pts, lg, w, h2) };
}
function cmpCards(all) { const c = cmpParts(all); return c.a + c.b; }

function popupM() {
  const p = S.popm, s = S.data.storico.find(x => x.mese === p.mese); if (!s) return '';
  const body = p.mode === 'del' ? `<p style="margin-top:0">Vuoi davvero eliminare <b>${esc(monthName(s.mese))}</b> dallo storico?</p><div class="acts"><button class="b r" data-act="pmdelok">Sì, elimina</button><button class="b s" data-act="pmback">Annulla</button></div>`
    : `<div class="acts" style="flex-direction:column"><button class="b" data-act="pmedit">Modifica</button><button class="b r" data-act="pmdel">Elimina</button><button class="b s" data-act="pmclose">Chiudi</button></div>`;
  return `<div class="ov" data-act="pmclose"></div><div class="pop"><h2 style="margin-bottom:2px">${esc(monthName(s.mese))}</h2><div class="lbl" style="margin-bottom:12px">Attivi ${eur(s.attivi)} · Passivi ${eur(s.passivi)} · Netto ${eur(s.netto)}</div>${body}</div>`;
}

function barSvg(st) {
  const d = st.slice(1).map((s, i) => ({ m: s.mese, v: s.netto - st[i].netto }));
  const W = CW(), H = Math.round(CHt(W) * 0.8), L = 50, R = 12, T = 12, B = 28, mid = T + (H - T - B) / 2, half = (H - T - B) / 2;
  const mx = Math.max(1, ...d.map(z => Math.abs(z.v))), slot = (W - L - R) / d.length, bw = Math.min(40, slot * 0.6), step = Math.ceil(d.length / 6);
  let o = [mx, 0, -mx].map(t => `<line x1="${L}" x2="${W - R}" y1="${(mid - t / mx * half).toFixed(1)}" y2="${(mid - t / mx * half).toFixed(1)}" stroke="${t === 0 ? '#9db3af' : '#e2eceb'}"/><text x="${L - 6}" y="${(mid - t / mx * half + 4).toFixed(1)}" font-size="11" fill="#5b7370" text-anchor="end">${compact(t)}</text>`).join('');
  d.forEach((z, i) => {
    const cx = L + slot * (i + 0.5), h = Math.abs(z.v) / mx * half;
    o += `<rect x="${(cx - bw / 2).toFixed(1)}" y="${(z.v >= 0 ? mid - h : mid).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(h, 1).toFixed(1)}" rx="3" fill="${z.v >= 0 ? '#15803d' : '#b91c1c'}"/>`;
    if (i % step === 0 || i === d.length - 1) o += `<text x="${cx.toFixed(1)}" y="${H - 8}" font-size="11" fill="#5b7370" text-anchor="middle">${shortM(z.m)}</text>`;
  });
  return `<svg viewBox="0 0 ${W} ${H}">${o}</svg>`;
}

function formMese(force) {
  const D = S.data;
  const open = force || S.editM || (S.exp && S.exp.fm);
  if (!open) return `<div class="card"><div class="row cl cat" data-act="exp" data-v="fm" style="border:0;padding:0"><div class="n">Ricostruisci lo storico<small>aggiungi i mesi passati a mano o da file</small></div><span class="chev">▸︎</span></div></div>`;
  const e = S.editM && D.storico.find(x => x.mese === S.editM), dr = S.draft || {};
  const f = v => String(v).replace('.', ',');
  const hd = !force && !e ? `<div class="row cl cat" data-act="exp" data-v="fm" style="border:0;padding:0"><h2 style="margin:0">Ricostruisci lo storico</h2><span class="chev open">▸︎</span></div>` : `<h2>${e ? 'Modifica mese' : 'Ricostruisci lo storico'}</h2>`;
  return `<div class="card" id="formm">${hd}<div class="msg">${esc(S.msg)}</div>
    <p class="note" style="margin-top:0">Inserisci i totali di un mese passato. Ripeti per ogni mese che vuoi aggiungere.</p>
    <label class="lbl">Mese (formato AAAA-MM, es. 2026-03)</label><input id="mm" type="month" placeholder="AAAA-MM" max="${prevMonth()}" value="${esc(e ? e.mese : dr.mm || '')}" ${e ? 'readonly' : ''}>
    <label class="lbl">Totale attivi (€)</label><input id="ma" inputmode="decimal" value="${esc(e ? f(e.attivi) : dr.ma || '')}">
    <label class="lbl">Totale passivi (€)</label><input id="mp" inputmode="decimal" value="${esc(e ? f(e.passivi) : dr.mp || '')}">
    <div class="acts"><button class="b" data-act="savem">Salva mese</button>${e ? '<button class="b s" data-act="cancelm">Annulla</button>' : ''}</div>
    ${e ? '' : `<hr style="border:0;border-top:1px solid #e2eceb;margin:16px 0 10px"><label class="lbl">Oppure importa molti mesi insieme da un file (righe: mese;attivi;passivi, es. 2024-05;120000;8000)</label><input id="impf" type="file" accept=".csv,.txt"><div class="msg" id="impmsg"></div>`}</div>`;
}

function serMain() {
  const vis = S.sel instanceof Set && S.sel.size ? S.sel : new Set(['attivi', 'passivi', 'netto']);
  return [{ k: 'attivi', c: '#0f766e', l: 'Attivi' }, { k: 'passivi', c: '#b91c1c', l: 'Passivi' }, { k: 'netto', c: '#1d4ed8', l: 'Patrimonio netto' }, { k: 'var', c: '#6d28d9', l: 'Variazione dal primo punto visibile', zero: 1, rebase: 1 }].map(x => ({ ...x, tog: 1, off: !vis.has(x.k) }));
}
function aggSeries(all, A) {
  const curY = monthKey().slice(0, 4), yrsAll = [...new Set(all.map(s => s.mese.slice(0, 4)))];
  let pts = all.map(s => ({ mese: s.mese, lab: shortM(s.mese), long: monthName(s.mese), attivi: s.attivi, passivi: s.passivi, netto: s.netto, abs: s.netto, var: 0 }));
  let dBar = all.slice(1).map((x, i) => ({ mese: x.mese, lab: shortM(x.mese), long: monthName(x.mese), v: x.netto - all[i].netto }));
  if (A !== 'm') {
    const avg = (a, k) => a.reduce((t, x) => t + x[k], 0) / a.length, by = yrsAll.map(y => all.filter(s => s.mese.slice(0, 4) === y));
    const lg = (g, y) => A === 'yf' ? `${y} · ${monthName(g[g.length - 1].mese)}${y === curY ? ' (in corso)' : ''}` : `Media ${y}${y === curY ? ' (in corso)' : ''}`;
    const val = (g, k) => A === 'yf' ? g[g.length - 1][k] : avg(g, k);
    pts = by.map((g, i) => ({ lab: yrsAll[i], long: lg(g, yrsAll[i]), attivi: val(g, 'attivi'), passivi: val(g, 'passivi'), netto: val(g, 'netto'), abs: val(g, 'netto'), var: 0 }));
    dBar = [];
    by.forEach((g, i) => {
      if (A === 'yf') { if (i) dBar.push({ lab: yrsAll[i], long: lg(g, yrsAll[i]), v: g[g.length - 1].netto - by[i - 1][by[i - 1].length - 1].netto }); }
      else { const d = g.map(s => { const j = all.indexOf(s); return j > 0 ? s.netto - all[j - 1].netto : null; }).filter(x => x !== null); if (d.length) dBar.push({ lab: yrsAll[i], long: lg(g, yrsAll[i]), v: d.reduce((t, x) => t + x, 0) / d.length }); }
    });
  }
  return { pts, dBar };
}
/* ---------- Computer: riquadro andamento a quattro sottoquadranti (mini grafici, tocco = si ingrandisce) ---------- */
const HUB = { main: 'Patrimonio netto', bar: 'Variazione mensile', pas: 'Passivi', cmp2: 'Confronto crescita' };
const mnSvg = o => `<svg viewBox="0 0 320 110" preserveAspectRatio="none" style="width:100%;height:100%">${o}</svg>`;
function mnLines(sers) {
  const all = sers.flatMap(x => x.v).filter(v => v != null); if (!all.length) return '';
  let mn = Math.min(...all), mx = Math.max(...all); if (mx === mn) { mx += 1; mn -= 1; }
  const n = Math.max(...sers.map(x => x.v.length)), X = i => 4 + i / Math.max(1, n - 1) * 312, Y = v => 104 - (v - mn) / (mx - mn) * 98;
  return sers.map(x => { let d = '', pen = false; x.v.forEach((v, i) => { if (v == null) { pen = false; return; } d += `${pen ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(v).toFixed(1)}`; pen = true; }); return `<path d="${d}" fill="none" stroke="${x.c}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>`; }).join('');
}
function mnBars(sers) {
  const all = sers.flatMap(x => x.v).filter(v => v != null); if (!all.length) return '';
  const mn = Math.min(0, ...all), mx = Math.max(0, ...all) || 1, rg = (mx - mn) || 1, Y = v => 104 - (v - mn) / rg * 98, y0 = Y(0), n = Math.max(...sers.map(x => x.v.length)), slot = 312 / n, bw = Math.max(1.5, slot * 0.8 / sers.length);
  let o = `<line x1="4" x2="316" y1="${y0.toFixed(1)}" y2="${y0.toFixed(1)}" stroke="#9db3af" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
  sers.forEach((x, k) => x.v.forEach((v, i) => { if (v == null) return; const yv = Y(v), c = x.c || (v >= 0 ? '#15803d' : '#b91c1c'); o += `<rect x="${(4 + slot * i + slot * 0.1 + bw * k).toFixed(1)}" y="${Math.min(y0, yv).toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, Math.abs(yv - y0)).toFixed(1)}" fill="${c}"/>`; }));
  return o;
}
function hubGrid(all0, all) {
  const ok = all.length >= 2, A = new Set(all.map(s => s.mese.slice(0, 4))).size >= 2 ? (S.agg || 'm') : 'm';
  const ag = ok ? aggSeries(all, A) : null, d = all0.length >= 2 ? cmpData(all0, S.cmp || 'y') : null, cmpOk = d && (d.dB.some(v => v != null) || d.cB.some(v => v != null));
  const last = ok ? all[all.length - 1] : null, dl = ok ? last.netto - all[all.length - 2].netto : 0;
  const cell = (k, svg, val) => `<div class="qc" data-act="hopen" data-v="${k}"><div class="qh"><b>${HUB[k]}</b>${val || ''}</div><div class="qs">${svg ? mnSvg(svg) : `<p class="note" style="margin:8px 0 0">${ok ? 'Servono più mesi di storico.' : 'Servono almeno 2 mesi di dati.'}</p>`}</div></div>`;
  return `<div class="card pcard qcard${S.hanim === 'out' ? ' anim-out' : ''}"><div class="chh"><h2>Andamento del patrimonio</h2><span class="chb">${[['6', 'Ultimi 6 mesi'], ['ytd', 'Anno in corso'], ['12', 'Ultimi 12 mesi'], ['all', 'Da sempre']].map(([v, l]) => `<button class="b sm ${(S.hper || 'all') === v ? '' : 's'}" data-act="hper" data-v="${v}">${l}</button>`).join('')}</span></div><div class="qg">
    ${cell('main', ok && mnLines([{ v: ag.pts.map(x => x.netto), c: '#1d4ed8' }]), ok ? `<span class="qv">${esc(compact(last.netto))}</span>` : '')}
    ${cell('bar', ok && mnBars([{ v: ag.dBar.map(x => x.v) }]), ok ? `<span class="qv ${dl >= 0 ? 'pos' : 'neg'}">${dl >= 0 ? '+' : ''}${esc(compact(dl))}</span>` : '')}
    ${cell('pas', ok && mnLines([{ v: ag.pts.map(x => x.passivi), c: '#b91c1c' }]), ok ? `<span class="qv">${esc(compact(last.passivi))}</span>` : '')}
    ${cell('cmp2', cmpOk && mnLines([{ v: d.cB, c: '#9aa9c7' }, { v: d.cA, c: '#1d4ed8' }]))}</div></div>`;
}
/* Colonne impilate: una colonna con gli attivi, una con passivi + patrimonio netto (stessa altezza degli attivi) */
function colCard(t, vis) {
  const A = t.attivi, P = t.passivi, N = t.netto, pp = Math.max(P, 0), np = Math.max(N, 0), nn = Math.max(-N, 0);
  const head = '<h2>Attivi, passivi e netto</h2>';
  if (A <= 0 && P <= 0) return `<div class="card colc">${head}<p class="note">Nessuna voce da mostrare.</p></div>`;
  const top = Math.max(A, pp + np, 1), H = 230, T0 = 14, sc = H / (top + nn), y0 = T0 + top * sc, pc = v => A > 0 ? (v / A * 100).toFixed(1).replace('.', ',') + '%' : '';
  const T = (x, y, sz, w, c, tx) => `<text x="${x}" y="${y.toFixed(1)}" text-anchor="middle" font-size="${sz}" font-weight="${w}" fill="${c}">${esc(tx)}</text>`;
  const bar = (x, yt, h, col, name, v) => { if (h <= 0) return ''; let o = `<rect x="${x}" y="${yt.toFixed(1)}" width="100" height="${h.toFixed(1)}" fill="${col}" data-tip="${esc(name + ' · ' + eur(v) + (A > 0 ? ' · ' + pc(v) + ' degli attivi' : ''))}"/>`; if (h >= 22) o += T(x + 50, yt + h / 2 + (h >= 40 ? -2 : 4), 13, 700, '#fff', eur0(v)); if (h >= 40 && A > 0) o += T(x + 50, yt + h / 2 + 14, 11, 400, '#fff', pc(v)); return o; };
  let o = `<line x1="10" x2="290" y1="${y0.toFixed(1)}" y2="${y0.toFixed(1)}" stroke="#9db3af" stroke-width="1.2"/>`;
  const PA = ['#0f766e', '#14b8a6', '#2dd4bf', '#5eead4', '#115e59', '#0e7490', '#22d3ee', '#65a30d'], cm = {};
  (vis || []).filter(v => v.tipo === 'attivo').forEach(v => { const k = v.categoria || 'Altro'; cm[k] = (cm[k] || 0) + v.valore; });
  const cats = Object.entries(cm).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
  if (cats.length) { let acc = 0; cats.forEach(([n, v], i) => { acc += v; o += bar(30, y0 - acc * sc, v * sc, PA[i % PA.length], n, v); }); }
  else o += bar(30, y0 - A * sc, A * sc, '#0f766e', 'Attivi', A);
  o += bar(170, y0 - pp * sc, pp * sc, '#b91c1c', 'Passivi', P);
  o += bar(170, y0 - (pp + np) * sc, np * sc, '#1d4ed8', 'Patrimonio netto', N);
  o += bar(170, y0, nn * sc, '#1d4ed8', 'Patrimonio netto', N);
  const ty = T0 + (top + nn) * sc + 18;
  o += T(80, ty, 13, 600, '#16302d', 'Attivi') + T(220, ty, 13, 600, '#16302d', 'Passivi + netto');
  return `<div class="card colc tcol" data-act="copen">${head}<div class="qs"><svg viewBox="0 0 300 ${Math.ceil(ty + 8)}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%">${o}</svg></div></div>`;
}
/* Attivi, passivi e netto ingranditi: al passaggio del mouse il blocco si evidenzia, il resto sbiadisce e a destra compare l'elenco delle voci */
let COLCTX = null;
function colPanel(sel, t, vis) {
  const D = S.data, A = t.attivi, P = t.passivi, N = t.netto, cm = {};
  vis.filter(v => v.tipo === 'attivo').forEach(v => { const k = v.categoria || 'Altro'; cm[k] = (cm[k] || 0) + v.valore; });
  const pcs = v => A > 0 ? ' · ' + (v / A * 100).toFixed(1).replace('.', ',') + '%' : '';
  const rows = arr => arr.length ? arr.slice().sort((a, b) => b.valore - a.valore).map(v => `<div class="row"><div class="n">${esc(dn(v))}<small>${esc([v.dove && v.dove !== dn(v) ? 'su ' + v.dove : '', D.accounts.length ? accName(v) : ''].filter(Boolean).join(' · '))}</small></div><div class="v">${eur(v.valore)}</div></div>`).join('') : '<p class="note">Nessuna voce.</p>';
  const sm = (l, v, c) => `<div class="row"><div class="n">${l}</div><div class="v ${c || ''}">${eur(v)}</div></div>`;
  if (sel && sel.startsWith('a:')) { const c = sel.slice(2); return `<h2>${esc(c)}</h2><div class="lbl">${eur(cm[c] || 0)}${pcs(cm[c] || 0)} degli attivi</div>${rows(vis.filter(v => v.tipo === 'attivo' && (v.categoria || 'Altro') === c))}`; }
  if (sel === 'p') return `<h2>Passivi</h2><div class="lbl">${eur(P)}${pcs(P)} degli attivi</div>${rows(vis.filter(v => v.tipo === 'passivo'))}`;
  if (sel === 'n') return `<h2>Patrimonio netto</h2><div class="lbl">Ciò che possiedi meno ciò che devi</div>${sm('Attivi', A)}${sm('Passivi', -P, 'neg')}${sm('Netto', N, cls(N))}`;
  return `<h2>Riepilogo</h2>${sm('Attivi', A)}${sm('Passivi', -P, 'neg')}${sm('Patrimonio netto', N, cls(N))}<p class="note" style="margin-top:12px">Passa il mouse su un blocco per vederne le voci e mettere in evidenza il resto.</p>`;
}
function colBig(t, vis) {
  COLCTX = { t, vis };
  const A = t.attivi, P = t.passivi, N = t.netto, pp = Math.max(P, 0), np = Math.max(N, 0), nn = Math.max(-N, 0);
  const top = Math.max(A, pp + np, 1), H = 420, T0 = 20, sc = H / (top + nn), y0 = T0 + top * sc, W = 840;
  const PA = ['#0f766e', '#14b8a6', '#2dd4bf', '#5eead4', '#115e59', '#0e7490', '#22d3ee', '#65a30d'], cm = {};
  vis.filter(v => v.tipo === 'attivo').forEach(v => { const k = v.categoria || 'Altro'; cm[k] = (cm[k] || 0) + v.valore; });
  const cats = Object.entries(cm).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]), segs = [];
  let acc = 0; cats.forEach(([n, v], i) => { acc += v; segs.push({ key: 'a:' + n, x: 230, y: y0 - acc * sc, h: v * sc, col: PA[i % PA.length], name: n, v, side: 'l' }); });
  segs.push({ key: 'p', x: 470, y: y0 - pp * sc, h: pp * sc, col: '#b91c1c', name: 'Passivi', v: P, side: 'r' });
  segs.push({ key: 'n', x: 470, y: N >= 0 ? y0 - (pp + np) * sc : y0, h: (N >= 0 ? np : nn) * sc, col: '#1d4ed8', name: 'Patrimonio netto', v: N, side: 'r' });
  const ok = segs.filter(s => s.h > 0);
  const pcs = v => A > 0 ? ' · ' + (v / A * 100).toFixed(1).replace('.', ',') + '%' : '';
  const ty = T0 + (top + nn) * sc + 24;
  let o = `<line x1="40" x2="${W - 40}" y1="${y0.toFixed(1)}" y2="${y0.toFixed(1)}" stroke="#9db3af" stroke-width="1.2"/>`;
  ok.forEach(s => {
    o += `<g data-ck="${esc(s.key)}" style="transition:opacity .15s"><rect x="${s.x}" y="${s.y.toFixed(1)}" width="130" height="${s.h.toFixed(1)}" fill="${s.col}" stroke="#fff" stroke-width="1.5"/>`;
    if (s.h >= 14) o += `<text x="${s.side === 'l' ? s.x - 8 : s.x + 138}" y="${(s.y + s.h / 2 + 4).toFixed(1)}" text-anchor="${s.side === 'l' ? 'end' : 'start'}" font-size="13" font-weight="600" fill="#16302d" style="pointer-events:none">${esc(s.name + ' · ' + eur0(s.v) + pcs(s.v))}</text>`;
    o += '</g>';
  });
  o += `<text x="295" y="${ty.toFixed(1)}" text-anchor="middle" font-size="14" font-weight="700" fill="#16302d">Attivi</text><text x="535" y="${ty.toFixed(1)}" text-anchor="middle" font-size="14" font-weight="700" fill="#16302d">Passivi + netto</text>`;
  return `<div class="fs cfs"><div class="chh"><h2>Attivi, passivi e netto</h2><button class="b sm" data-act="cclose">✕ Chiudi</button></div><div class="cfb"><div class="cfsv"><svg viewBox="0 0 ${W} ${Math.ceil(ty + 10)}" preserveAspectRatio="xMidYMid meet">${o}</svg></div><div class="cfp card">${colPanel(null, t, vis)}</div></div></div>`;
}
function colHover(key) {
  const w = document.querySelector('.cfs'); if (!w || !COLCTX) return;
  w.querySelectorAll('[data-ck]').forEach(g => { g.style.opacity = key && g.dataset.ck !== key ? '.2' : ''; });
  const r = w.querySelector('.cfp'); if (r) r.innerHTML = colPanel(key, COLCTX.t, COLCTX.vis);
}
document.addEventListener('mouseover', e => {
  if (!e.target.closest || !e.target.closest('.cfsv')) return;
  const g = e.target.closest('[data-ck]'); colHover(g ? g.dataset.ck : null);
});
document.addEventListener('mouseout', e => {
  const v = e.target.closest && e.target.closest('.cfsv');
  if (v && !(e.relatedTarget && v.contains(e.relatedTarget))) colHover(null);
});
function panMain(all, r1) {
  if (all.length < 2) return '<div class="card"><h2>Andamento del patrimonio</h2><p class="note">Il grafico comparirà quando ci saranno almeno 2 mesi di dati.</p></div>';
  const A = new Set(all.map(s => s.mese.slice(0, 4))).size >= 2 ? (S.agg || 'm') : 'm', W = Math.max(380, Math.round((innerWidth - 200 - 56 - 28) * 5 / 12 - 40));
  return lcCard('main', 'Andamento del patrimonio netto', aggSeries(all, A).pts, [{ k: 'netto', c: '#1d4ed8', l: 'Patrimonio netto', fit: 1, nolg: 1, ck: 1 }], W, Math.max(130, r1 - 150));
}
function pageAnd() {
  const all = S.data.storico, rg = String(S.range || '12');
  if (!all.length) return formMese(true) + '<div class="card">Nessuno storico disponibile. Inserisci i mesi passati qui sopra, oppure aggiungi le voci nella pagina Patrimonio: ogni mese ne viene salvata una fotografia.</div>';
  const yy = +monthKey().slice(0, 4);
  const rF = S.rFrom || all[0].mese, rT = S.rTo || all[all.length - 1].mese, lo_ = rF <= rT ? rF : rT, hi_ = rF <= rT ? rT : rF;
  const yrs = [...new Set(all.map(s => s.mese.slice(0, 4)))].reverse(), yr = yrs.includes(S.yr) ? S.yr : yrs[0];
  const st = rg === 'year' ? all.filter(s => s.mese.slice(0, 4) === yr) : rg === 'custom' ? all.filter(s => s.mese >= lo_ && s.mese <= hi_) : rg === '0' ? all : rg === 'ytd' ? all.filter(s => s.mese >= (yy - 1) + '-12') : all.slice(-(+rg));
  const sel = `<select data-act="range">${rg === 'year' ? '<option value="" selected disabled>Periodo…</option>' : ''}${[['3', 'Ultimi 3 mesi'], ['6', 'Ultimi 6 mesi'], ['ytd', 'Da inizio anno'], ['12', 'Ultimi 12 mesi'], ['36', 'Ultimi 3 anni'], ['0', 'Tutto lo storico'], ['custom', 'Periodo personalizzato']].map(([v, l]) => `<option value="${v}" ${rg === v ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
  const sel2 = `<select data-act="yrsel">${rg === 'year' ? '' : '<option value="" selected disabled>Anno…</option>'}${yrs.map(y => `<option value="${y}" ${rg === 'year' && y === yr ? 'selected' : ''}>${y}</option>`).join('')}</select>`;
  const L = serMain();
  const pts0 = all.map(s => ({ mese: s.mese, lab: shortM(s.mese), long: monthName(s.mese), attivi: s.attivi, passivi: s.passivi, netto: s.netto, abs: s.netto, var: 0 }));
  const rows = all.map((s, i) => ({ s, d: i ? s.netto - all[i - 1].netto : null })).reverse(), topen = S.exp && S.exp.stab;
  const cust = rg === 'custom' ? `<div class="grid" style="margin-top:8px"><div><label class="lbl">Dal mese</label><input type="month" data-act="rfrom" value="${esc(lo_)}" min="${all[0].mese}" max="${all[all.length - 1].mese}"></div><div><label class="lbl">Al mese</label><input type="month" data-act="rto" value="${esc(hi_)}" min="${all[0].mese}" max="${all[all.length - 1].mese}"></div></div>` : '';
  const dBar0 = all.slice(1).map((x, i) => ({ mese: x.mese, lab: shortM(x.mese), long: monthName(x.mese), v: x.netto - all[i].netto }));
  const yrsAll = [...new Set(all.map(s => s.mese.slice(0, 4)))], A = yrsAll.length >= 2 ? (S.agg || 'm') : 'm', curY = monthKey().slice(0, 4);
  const ag = aggSeries(all, A), pts = ag.pts, dBar = ag.dBar;
  const wsig = [rg, lo_, hi_, yr, all.length, A].join('|');
  if (all.length > 1 && S.wsig !== wsig) {
    S.wsig = wsig;
    [['main', pts0], ['bar', dBar0]].forEach(([k, d]) => {
      const n = d.length, m = d.map(q => q.mese);
      if (A !== 'm' || !st.length || rg === '0') { delete ZM[k]; return; }
      let ia = m.findIndex(x => x >= st[0].mese), ib = m.length - 1 - [...m].reverse().findIndex(x => x <= st[st.length - 1].mese);
      if (ia < 0) ia = 0; if (ib >= n || ib < 0) ib = n - 1;
      const mins = Math.min(n - 1, 3);
      if (ib - ia < mins) { const c0 = (ia + ib) / 2; ia = c0 - mins / 2; ib = c0 + mins / 2; }
      if (ia < 0) { ib -= ia; ia = 0; } if (ib > n - 1) { ia -= ib - (n - 1); ib = n - 1; }
      ia = Math.max(0, ia);
      if (ia <= 0 && ib >= n - 1) { delete ZM[k]; return; }
      ZM[k] = { a: ia, b: ib, n, sig: d[0].lab + '|' + d[n - 1].lab };
    });
  }
  const bT = A === 'yf' ? 'Variazione annuale del patrimonio netto' : A === 'ya' ? 'Variazione mensile media del patrimonio netto, per anno' : 'Variazione mensile del patrimonio netto', bL = A === 'yf' ? 'Variazione annuale' : A === 'ya' ? 'Variazione mensile media' : 'Variazione mensile';
  const ch = all.length > 1 ? {
    main: lcCard('main', 'Andamento del patrimonio', pts, L),
    bar: lcCard('bar', bT, dBar, [{ k: 'v', c: '#15803d', l: bL, bar: 1 }])
  } : null;
  return `<div class="card"><div class="grid">${sel}${sel2}</div>${cust}${A !== 'm' ? '<p class="note">Vista annuale attiva: i grafici mostrano tutti gli anni e il periodo scelto qui sopra non si applica. Per tornare al dettaglio, usa il tasto "Mese" sotto i grafici.</p>' : ''}${all.length < 2 ? '<p class="note">I grafici compariranno quando ci saranno almeno 2 mesi di dati. Ogni mese viene salvata una fotografia del tuo patrimonio quando apri l\'app.</p>' : ''}</div>
    ${ch ? ch.main : ''}
    ${ch ? ch.bar : ''}
    ${all.length > 1 ? cmpCards(all) : ''}
    <div class="card"><div class="row cl cat" data-act="exp" data-v="stab" style="border:0;padding:0"><div class="n">Storico mese per mese<small>${all.length} mesi · tocca una riga per modificarla o eliminarla</small></div><span class="chev ${topen ? 'open' : ''}">▸︎</span></div>
    ${topen ? `<div class="tw" style="margin-top:8px"><table><tr>${thS('sto', 'm', 'Mese')}${thS('sto', 'a', 'Attivi')}${thS('sto', 'p', 'Passivi')}${thS('sto', 'n', 'Netto')}${thS('sto', 'd', 'Var.')}</tr>
    ${sortArr('sto', rows, { m: r => r.s.mese, a: r => r.s.attivi, p: r => r.s.passivi, n: r => r.s.netto, d: r => r.d === null ? -Infinity : r.d }).map(({ s, d }) => `<tr${s.mese < monthKey() ? ` class="cl" data-act="rowm" data-v="${s.mese}"` : ''}><td>${esc(shortM(s.mese))}${s.manuale ? ' ✎' : ''}</td><td>${eur(s.attivi)}</td><td>${eur(s.passivi)}</td><td><b>${eur(s.netto)}</b></td><td class="${d === null ? '' : cls(d)}">${d === null ? '–' : (d >= 0 ? '+' : '') + eur(d)}</td></tr>`).join('')}</table></div>` : ''}</div>
    ${formMese()}`;
}

function indicatori(D, st) {
  const t = totals(D.voci), cur = st[st.length - 1], map = {}; st.forEach(s => map[s.mese] = s);
  const att = D.voci.filter(v => v.tipo === 'attivo'), sumC = c => att.filter(v => v.categoria === c).reduce((s, v) => s + v.valore, 0);
  const P = v => (v * 100).toFixed(1).replace('.', ',') + '%', I = [];
  if (t.attivi > 0) {
    const r = t.passivi / t.attivi;
    I.push(['Indebitamento', P(r), r < 0.3 ? 'pos' : r < 0.6 ? '' : 'neg', 'Quanta parte di ciò che possiedi è coperta da debiti (passivi diviso attivi). Conta perché più è alto, meno margine hai se i valori scendono o le entrate calano. Come regola generale sotto il 30% è contenuto, sopra il 60% va tenuto d\'occhio.']);
    I.push(['Peso della liquidità', P(sumC('Liquidità') / t.attivi), '', 'Quota dei tuoi attivi tenuta in conti e contanti, disponibile subito. Serve per gli imprevisti: se è troppo bassa rischi di dover vendere gli investimenti nel momento sbagliato, se è troppo alta l\'inflazione ne riduce il valore nel tempo.']);
    I.push(['Peso degli investimenti', P(sumC('Investimenti') / t.attivi), '', 'Quota degli attivi messa in investimenti. Dice quanto il tuo patrimonio dipende dall\'andamento dei mercati: più è alta, più può crescere ma anche oscillare.']);
    const top = att.slice().sort((a, b) => b.valore - a.valore)[0];
    if (top) I.push(['Concentrazione', P(top.valore / t.attivi), top.valore / t.attivi > 0.6 ? 'neg' : '', `Peso della voce più grande (${esc(dn(top))}) sul totale degli attivi. Se una sola voce supera il 60%, il tuo patrimonio dipende troppo da lei: distribuire su più voci riduce il rischio.`]);
  }
  const yr = cur.mese.slice(0, 4), prevs = st.filter(s => s.mese < yr + '-01'), b0 = prevs[prevs.length - 1];
  if (b0 && b0.netto) { const d = cur.netto - b0.netto; I.push(['Crescita da inizio anno', `${d >= 0 ? '+' : ''}${eur0(d)} (${pct(d / Math.abs(b0.netto))})`, cls(d), 'Quanto è cambiato il patrimonio netto dall\'ultimo mese dell\'anno scorso. Comprende ciò che hai risparmiato, i debiti rimborsati e la variazione dei valori: non è un rendimento puro, ma dice se nell\'anno stai avanzando.']); }
  const m12 = map[addMk(cur.mese, -12)];
  if (m12 && m12.netto) { const d = cur.netto - m12.netto; I.push(['Crescita ultimi 12 mesi', `${d >= 0 ? '+' : ''}${eur0(d)} (${pct(d / Math.abs(m12.netto))})`, cls(d), 'Confronto con lo stesso mese di un anno fa. Elimina l\'effetto delle stagioni (tredicesime, vacanze, tasse) ed è il modo più pulito per capire il ritmo reale di crescita.']); I.push(['Variazione media mensile', `${d >= 0 ? '+' : ''}${eur0(d / 12)}`, cls(d), 'Di quanto cresce in media il patrimonio ogni mese negli ultimi 12 mesi. Serve a capire se il ritmo è costante e a stimare i tempi per raggiungere un obiettivo.']); }
  const f = st[0], mths = (+cur.mese.slice(0, 4) - +f.mese.slice(0, 4)) * 12 + (+cur.mese.slice(5) - +f.mese.slice(5));
  if (mths >= 12 && f.netto > 0 && cur.netto > 0) { const g = Math.pow(cur.netto / f.netto, 12 / mths) - 1; I.push(['Crescita annua media (CAGR)', pct(g), cls(g), 'Tasso di crescita annuo composto: di quanto è cresciuto in media ogni anno il patrimonio, come se la crescita fosse stata costante. Permette di confrontare periodi diversi. Include anche i tuoi versamenti, quindi non è il rendimento dei soli investimenti.']); }
  let pk = -Infinity, pkm = '', worst = 0, wm = '';
  st.forEach(s => { if (s.netto > pk) { pk = s.netto; pkm = s.mese; } if (pk > 0) { const dd = (s.netto - pk) / pk; if (dd < worst) { worst = dd; wm = s.mese; } } });
  if (st.length > 2) I.push(['Calo massimo', worst < 0 ? `${P(worst)} (${shortM(wm)})` : 'Nessun calo', worst < -0.1 ? 'neg' : '', 'La discesa più forte dal punto più alto a quello più basso successivo. Mostra quanto hai "sofferto" nei momenti peggiori: serve a capire se il rischio che stai prendendo è sopportabile.']);
  const ob = att.filter(v => v.obiettivo > 0);
  if (ob.length) { const o = ob.reduce((s, v) => s + v.obiettivo, 0), g = ob.reduce((s, v) => s + v.valore, 0); I.push(['Avanzamento obiettivi', P(g / o), '', 'Quanta parte degli obiettivi fissati sugli investimenti è già raggiunta (valore attuale diviso obiettivo). Aiuta a capire quanta strada manca.']); }
  return `<div class="card"><h2>Indicatori patrimoniali</h2>${I.map(([l, v, c, ex], i) => `<div class="row"><div class="n">${l}<button class="ib" data-act="exp" data-v="i:${i}" aria-label="Spiegazione">i</button></div><div class="v ${c}">${v}</div></div>${S.exp && S.exp['i:' + i] ? `<p class="note ex">${ex}</p>` : ''}`).join('')}<p class="note">Tocca la "i" per capire a cosa serve ogni indicatore. Informazioni generali a scopo educativo.</p></div>`;
}

function pageRep() {
  const D = S.data, st = D.storico;
  if (!st.length) return '<div class="card">Nessun dato disponibile. Inserisci almeno una voce nella pagina Patrimonio.</div>';
  if (innerWidth >= 1000) return pdfCard();
  const cur = st[st.length - 1], prev = st.length > 1 ? st[st.length - 2] : null;
  const dN = prev ? cur.netto - prev.netto : null, dA = prev ? cur.attivi - prev.attivi : null, dP = prev ? cur.passivi - prev.passivi : null;
  const dpct = prev && prev.netto ? dN / Math.abs(prev.netto) : null;
  const byCat = tp => {
    const m = {}; D.voci.filter(v => v.tipo === tp).forEach(v => m[v.categoria] = (m[v.categoria] || 0) + v.valore);
    const e = Object.entries(m).sort((a, b) => b[1] - a[1]);
    return e.length ? e.map(([c, v]) => `<div class="row"><div class="n">${esc(c)}</div><div class="v">${eur(v)}</div></div>`).join('') : '<p class="note">Nessuna voce.</p>';
  };
  const dl = (l, v) => v === null ? '' : `<div class="row"><div class="n">${l}</div><div class="v ${l === 'Passivi' ? cls(-v) : cls(v)}">${v >= 0 ? '+' : ''}${eur(v)}</div></div>`;
  // commenti educativi
  const c = [];
  c.push('Il <b>patrimonio netto</b> è ciò che possiedi meno ciò che devi: è il numero più importante da seguire nel tempo.');
  if (dN !== null) c.push(dN >= 0
    ? `Nel mese il patrimonio netto è <b>aumentato</b> di ${eur(dN)}. Può dipendere da risparmio, rimborso di debiti o variazione dei valori.`
    : `Nel mese il patrimonio netto è <b>diminuito</b> di ${eur(-dN)}. Può dipendere da spese, nuovi debiti o variazione dei valori.`);
  if (cur.attivi > 0) {
    const r = cur.passivi / cur.attivi;
    c.push(`I debiti sono il <b>${(r * 100).toFixed(0)}%</b> di ciò che possiedi. ` + (r < 0.3 ? 'Come regola generale è un livello contenuto.' : r < 0.6 ? 'Come regola generale è un livello medio: conviene tenere d\'occhio le rate.' : 'Come regola generale è un livello alto: le rate pesano molto sul patrimonio.'));
    const liq = D.voci.filter(v => v.categoria === 'Liquidità').reduce((s, v) => s + v.valore, 0) / cur.attivi;
    if (liq > 0.5) c.push('Oltre metà dei tuoi attivi è in liquidità: nel tempo l\'inflazione ne riduce il valore reale.');
    else if (liq < 0.05) c.push('Hai poca liquidità: di solito si consiglia un fondo per imprevisti pari a 3-6 mesi di spese.');
    const top = Math.max(0, ...D.voci.filter(v => v.tipo === 'attivo').map(v => v.valore)) / cur.attivi;
    if (top > 0.6) c.push('Una sola voce vale oltre il 60% dei tuoi attivi: avere tutto in un solo posto aumenta il rischio.');
  }
  return `<div class="card"><h2>Report di ${esc(monthName(cur.mese))}</h2>
    <div class="grid"><div><div class="lbl">Patrimonio netto</div><div class="big ${cls(cur.netto)}">${eur(cur.netto)}</div></div>
    ${dN !== null ? `<div><div class="lbl">Rispetto a ${esc(monthName(prev.mese))}</div><div class="big ${cls(dN)}">${dN >= 0 ? '+' : ''}${eur(dN)}</div>${dpct !== null ? `<div class="lbl">${pct(dpct)}</div>` : ''}</div>` : ''}</div>
    ${dN !== null ? `<div style="margin-top:12px">${dl('Attivi', dA)}${dl('Passivi', dP)}</div>` : '<p class="note">Il confronto con il mese precedente sarà disponibile dal prossimo mese.</p>'}</div>
    ${pdfCard()}
    ${indicatori(D, st)}
    <div class="grid"><div class="card"><h2>Attivi per categoria</h2>${byCat('attivo')}</div><div class="card"><h2>Passivi per categoria</h2>${byCat('passivo')}</div></div>
    <div class="card"><h2>Lo sapevi?</h2><ul class="c">${c.map(x => `<li>${x}</li>`).join('')}</ul>
    <p class="note">Informazioni generali a scopo educativo, non consulenza finanziaria.</p></div>`;
}

function pageAdm() {
  const u = S.users, pend = u.filter(x => !x.approved), ok = u.filter(x => x.approved);
  const row = (x, p) => `<div class="row"><div class="n">${esc(x.nome)}</div>
    ${p ? `<button class="b sm" data-act="appr" data-v="${x.uid}">Approva</button><button class="b r sm" data-act="rej" data-v="${x.uid}">Rifiuta</button>`
        : `<button class="b r sm" data-act="rev" data-v="${x.uid}">Revoca</button>`}</div>`;
  return `<div class="card"><h2>In attesa di approvazione (${pend.length})</h2>${pend.length ? pend.map(x => row(x, true)).join('') : '<p class="note">Nessuna richiesta.</p>'}</div>
    <div class="card"><h2>Utenti approvati (${ok.length})</h2>${ok.length ? ok.map(x => row(x, false)).join('') : '<p class="note">Nessun utente.</p>'}</div>
    <div class="card"><button class="b s" data-act="reload-users">Aggiorna elenco</button></div>`;
}

