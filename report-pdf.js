'use strict';
/* ---------- Report PDF (creato sul telefono, nessun dato esce dall'app) ---------- */
const PC = { teal: '#0f766e', ink: '#16302d', mute: '#5b7370', line: '#d9e6e4', soft: '#eef6f5', neg: '#b91c1c', pos: '#0f766e' };
const PPAL = ['#0f766e', '#1d4ed8', '#b45309', '#7c3aed', '#be185d', '#0369a1', '#65a30d', '#64748b'];

function caricaPdfLib() {
  if (window.jspdf) return Promise.resolve();
  return new Promise((ok, ko) => {
    const s = document.createElement('script'); s.src = 'jspdf.min.js'; s.onload = ok;
    s.onerror = () => ko(Object.assign(new Error('lib'), { code: 'network-lib' }));
    document.head.appendChild(s);
  });
}
function pdfCanShare() {
  try { return typeof File !== 'undefined' && !!navigator.canShare && navigator.canShare({ files: [new File(['x'], 'a.pdf', { type: 'application/pdf' })] }); } catch (e) { return false; }
}

/* testo sicuro per i caratteri standard del PDF */
const pt = s => String(s ?? '').normalize('NFC').replace(/[   ]/g, ' ').replace(/−/g, '-').replace(/[^\x20-\x7E¡-ÿ€–—‘’“”•…]/g, '?');
const pE = v => pt(eur(v));
const pS = v => (v >= 0 ? '+' : '') + pE(v);
const pP = v => (v * 100).toFixed(1).replace('.', ',') + '%';
const pSP = v => (v >= 0 ? '+' : '') + pP(v);
const axE = v => { const a = Math.abs(v), s = v < 0 ? '-' : ''; return a >= 1e6 ? s + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace('.', ',') + ' M' : a >= 1e3 ? s + Math.round(a / 1e3) + ' k' : s + Math.round(a); };
const axQ = v => Math.round(v * 100) + '%';
const axP = v => (v > 0.0005 ? '+' : '') + Math.round(v * 100) + '%';
const lblM = k => MESI[+k.slice(5) - 1].slice(0, 3) + ' ' + k.slice(2, 4);

/* ---------- grafici su canvas ---------- */
function cvs(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, w, h); return [c, x]; }
function ticks(min, max, n) {
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / n, mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
  const step = (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * mag, lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step, t = [];
  for (let v = lo; v <= hi + step / 2; v += step) t.push(+v.toFixed(8));
  return t;
}
function axes(x, W, H, L, R, T, B, labels, vals, fmt, zero) {
  let mn = Math.min(...vals), mx = Math.max(...vals);
  if (zero) { mn = Math.min(0, mn); mx = Math.max(0, mx); }
  const pad = (mx - mn) * 0.08 || Math.abs(mx) * 0.05 || 1; if (!zero) { mn -= pad; mx += pad; } else { if (mn < 0) mn -= pad; if (mx > 0) mx += pad; }
  const tk = ticks(mn, mx, 5), y0 = tk[0], y1 = tk[tk.length - 1], n = labels.length;
  const px = i => L + (n > 1 ? i * (W - L - R) / (n - 1) : (W - L - R) / 2), py = v => T + (y1 - v) * (H - T - B) / (y1 - y0);
  x.font = '22px sans-serif'; x.textBaseline = 'middle';
  tk.forEach(v => {
    x.strokeStyle = v === 0 && y0 < 0 ? '#8aa5a2' : '#e3eceb'; x.lineWidth = v === 0 && y0 < 0 ? 2 : 1;
    x.beginPath(); x.moveTo(L, py(v)); x.lineTo(W - R, py(v)); x.stroke();
    if (fmt) { x.fillStyle = '#5b7370'; x.textAlign = 'right'; x.fillText(fmt(v), L - 10, py(v)); }
  });
  return { px, py, y0, y1 };
}
function xlabels(x, W, H, B, px, labels, bars) {
  const n = labels.length, step = Math.max(1, Math.ceil(n / 8));
  x.fillStyle = '#5b7370'; x.font = '22px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'top';
  labels.forEach((l, i) => { if (i % step === 0 || (!bars && i === n - 1 && (n - 1) % step > step / 2)) x.fillText(l, px(i), H - B + 14); });
}
function lineChart(labels, series, fmt) {
  const W = 1100, H = 440, L = fmt ? 105 : 40, R = 34, T = series.length > 1 ? 44 : 24, B = 58, [c, x] = cvs(W, H);
  const A = axes(x, W, H, L, R, T, B, labels, series.flatMap(s => s.vals), fmt, false), n = labels.length;
  series.forEach((s, si) => {
    if (n > 1 && s.fill) {
      const g = x.createLinearGradient(0, T, 0, H - B); g.addColorStop(0, s.color + '55'); g.addColorStop(1, s.color + '08');
      x.beginPath(); x.moveTo(A.px(0), H - B); s.vals.forEach((v, i) => x.lineTo(A.px(i), A.py(v))); x.lineTo(A.px(n - 1), H - B); x.closePath(); x.fillStyle = g; x.fill();
    }
    x.strokeStyle = s.color; x.lineWidth = 4; x.lineJoin = 'round'; x.beginPath();
    s.vals.forEach((v, i) => i ? x.lineTo(A.px(i), A.py(v)) : x.moveTo(A.px(i), A.py(v))); x.stroke();
    if (n <= 24) s.vals.forEach((v, i) => { x.beginPath(); x.arc(A.px(i), A.py(v), 5.5, 0, 7); x.fillStyle = '#fff'; x.fill(); x.lineWidth = 3.5; x.stroke(); });
    if (series.length > 1) { const lx = L + 8 + si * 250; x.fillStyle = s.color; x.fillRect(lx, 14, 28, 6); x.fillStyle = '#16302d'; x.font = '22px sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(s.name, lx + 38, 18); }
  });
  xlabels(x, W, H, B, A.px, labels, false);
  return c.toDataURL('image/png');
}
function barChart(labels, vals, fmt) {
  const W = 1100, H = 440, L = fmt ? 105 : 40, R = 34, T = 24, B = 58, [c, x] = cvs(W, H), n = labels.length;
  const A = axes(x, W, H, L, R, T, B, labels, vals, fmt, true), slot = (W - L - R) / n, bw = Math.min(46, slot * 0.62), z = A.py(0);
  vals.forEach((v, i) => { const cx = L + slot * (i + 0.5), yy = A.py(v); x.fillStyle = v >= 0 ? PC.pos : PC.neg; x.fillRect(cx - bw / 2, Math.min(z, yy), bw, Math.max(2, Math.abs(yy - z))); });
  const step = Math.max(1, Math.ceil(n / 8)); x.fillStyle = '#5b7370'; x.font = '22px sans-serif'; x.textAlign = 'center'; x.textBaseline = 'top';
  labels.forEach((l, i) => { if (i % step === 0) x.fillText(l, L + slot * (i + 0.5), H - B + 14); });
  return c.toDataURL('image/png');
}
function donut(items) {
  const S0 = 560, [c, x] = cvs(S0, S0), cx = S0 / 2, r1 = S0 * 0.46, r0 = S0 * 0.27, tot = items.reduce((s, i) => s + i.val, 0);
  let a = -Math.PI / 2;
  if (tot > 0) items.forEach(it => {
    const d = it.val / tot * Math.PI * 2; if (d <= 0) return;
    x.beginPath(); x.arc(cx, cx, r1, a, a + d); x.arc(cx, cx, r0, a + d, a, true); x.closePath(); x.fillStyle = it.color; x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 4; x.stroke(); a += d;
  });
  return c.toDataURL('image/png');
}

/* ---------- indicatori ---------- */
function pdfMetriche(D, st) {
  const t = totals(D.voci), cur = st[st.length - 1], prev = st.length > 1 ? st[st.length - 2] : null, att = D.voci.filter(v => v.tipo === 'attivo'), map = {}; st.forEach(s => map[s.mese] = s);
  const sumC = c => att.filter(v => v.categoria === c).reduce((s, v) => s + v.valore, 0), m = { t, cur, prev };
  m.dN = prev ? cur.netto - prev.netto : null; m.dpct = prev && prev.netto ? m.dN / Math.abs(prev.netto) : null;
  m.dA = prev ? cur.attivi - prev.attivi : null; m.dP = prev ? cur.passivi - prev.passivi : null;
  if (t.attivi > 0) { m.indeb = t.passivi / t.attivi; m.liq = sumC('Liquidità') / t.attivi; m.inv = sumC('Investimenti') / t.attivi; const top = att.slice().sort((a, b) => b.valore - a.valore)[0]; if (top) m.top = { nome: dn(top), p: top.valore / t.attivi }; }
  const yr = cur.mese.slice(0, 4), b0 = st.filter(s => s.mese < yr + '-01').pop();
  if (b0 && b0.netto) m.ytd = { d: cur.netto - b0.netto, p: (cur.netto - b0.netto) / Math.abs(b0.netto) };
  const m12 = map[addMk(cur.mese, -12)]; if (m12 && m12.netto) m.y12 = { d: cur.netto - m12.netto, p: (cur.netto - m12.netto) / Math.abs(m12.netto) };
  const f = st[0], mths = (+cur.mese.slice(0, 4) - +f.mese.slice(0, 4)) * 12 + (+cur.mese.slice(5) - +f.mese.slice(5));
  if (mths >= 12 && f.netto > 0 && cur.netto > 0) m.cagr = Math.pow(cur.netto / f.netto, 12 / mths) - 1;
  let pk = -Infinity, worst = 0, wm = ''; st.forEach(s => { if (s.netto > pk) pk = s.netto; if (pk > 0) { const dd = (s.netto - pk) / pk; if (dd < worst) { worst = dd; wm = s.mese; } } });
  if (st.length > 2) m.dd = { v: worst, m: wm };
  const ob = att.filter(v => v.obiettivo > 0); if (ob.length) m.ob = ob.reduce((s, v) => s + v.valore, 0) / ob.reduce((s, v) => s + v.obiettivo, 0);
  return m;
}

/* ---------- documento ---------- */
async function creaPdf(D, hide) {
  const { jsPDF } = window.jspdf, st = D.storico, M0 = pdfMetriche(D, st), cur = M0.cur, t = M0.t;
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });
  const PW = 210, PH = 297, M = 15, CW = PW - 2 * M, BOT = PH - 16; let y = 0;
  const txt = (s, x, yy, o = {}) => { doc.setFont('helvetica', o.b ? 'bold' : 'normal'); doc.setFontSize(o.s || 10); doc.setTextColor(o.c || PC.ink); doc.text(pt(s), x, yy, { align: o.a || 'left' }); };
  const need = h => { if (y + h > BOT) { doc.addPage(); y = M; } };
  const h2 = (s, h = 32) => { need(8 + h); y += 5; txt(s, M, y + 4, { b: 1, s: 13, c: PC.teal }); doc.setDrawColor(PC.line); doc.setLineWidth(0.3); doc.line(M, y + 6.5, M + CW, y + 6.5); y += 10; };
  const para = (s, o = {}) => { doc.setFont('helvetica', 'normal'); doc.setFontSize(o.s || 9); const ls = doc.splitTextToSize(pt(s), CW - (o.ind || 0)); need(ls.length * 4.2 + 1); doc.setTextColor(o.c || PC.mute); doc.text(ls, M + (o.ind || 0), y + 3.4); y += ls.length * 4.2 + 1; };
  const img = (url, w, h) => { need(h + 2); doc.addImage(url, 'PNG', M, y, w, h); y += h + 2; };
  const fit = (s, w, b, sz) => { doc.setFont('helvetica', b ? 'bold' : 'normal'); doc.setFontSize(sz); s = pt(s); while (s.length > 1 && doc.getTextWidth(s) > w - 3) s = s.slice(0, -1); return s; };
  function table(cols, rows) {
    const RH = 6.4, head = () => { doc.setFillColor(PC.soft); doc.rect(M, y, CW, RH, 'F'); let x = M; cols.forEach(c => { txt(c.h, c.a === 'r' ? x + c.w - 1.5 : x + 1.5, y + 4.3, { b: 1, s: 8.5, c: PC.mute, a: c.a === 'r' ? 'right' : 'left' }); x += c.w; }); y += RH; };
    need(RH * 3); head();
    rows.forEach(r => {
      if (y + RH > BOT) { doc.addPage(); y = M; head(); }
      if (r.fill) { doc.setFillColor(PC.soft); doc.rect(M, y, CW, RH, 'F'); }
      let x = M; r.cells.forEach((cell, i) => { const c = cols[i], o = typeof cell === 'object' ? cell : { t: cell }, b = r.b || o.b, sz = 9;
        txt(fit(o.t, c.w, b, sz), c.a === 'r' ? x + c.w - 1.5 : x + 1.5, y + 4.4, { b, s: sz, c: o.c || PC.ink, a: c.a === 'r' ? 'right' : 'left' }); x += c.w; });
      doc.setDrawColor(PC.line); doc.setLineWidth(0.15); doc.line(M, y + RH, M + CW, y + RH); y += RH;
    });
    y += 3;
  }
  const colSgn = v => v >= 0 ? PC.pos : PC.neg;

  /* intestazione */
  doc.setFillColor(PC.teal); doc.rect(0, 0, PW, 30, 'F');
  txt('Report del patrimonio', M, 14, { b: 1, s: 20, c: '#ffffff' });
  txt(`${D.nome}  ·  aggiornato a ${monthName(cur.mese)}`, M, 22.5, { s: 10.5, c: '#d6f2ee' });
  txt('Generato il ' + new Date().toLocaleDateString('it-IT'), PW - M, 22.5, { s: 9.5, c: '#d6f2ee', a: 'right' });
  if (hide) txt('IMPORTI NASCOSTI', PW - M, 13, { b: 1, s: 9.5, c: '#ffffff', a: 'right' });
  y = 38;

  /* riquadri principali */
  const prevName = M0.prev ? monthName(M0.prev.mese) : '';
  const kp = hide ? [
    ['Variazione del mese', M0.dpct !== null ? pSP(M0.dpct) : '-', M0.dpct !== null ? 'rispetto a ' + prevName : '', M0.dpct !== null ? colSgn(M0.dpct) : PC.ink],
    ['Da inizio anno', M0.ytd ? pSP(M0.ytd.p) : '-', 'patrimonio netto', M0.ytd ? colSgn(M0.ytd.d) : PC.ink],
    ['Indebitamento', M0.indeb !== undefined ? pP(M0.indeb) : '-', 'passivi su attivi', PC.ink]
  ] : [
    ['Patrimonio netto', pE(cur.netto), M0.dN !== null ? `${pS(M0.dN)} (${pSP(M0.dpct ?? 0)}) vs ${prevName}` : '', cur.netto >= 0 ? PC.ink : PC.neg],
    ['Attivi', pE(cur.attivi), M0.dA !== null ? pS(M0.dA) + ' vs ' + prevName : '', PC.ink],
    ['Passivi', pE(cur.passivi), M0.dP !== null ? pS(M0.dP) + ' vs ' + prevName : '', PC.ink]
  ];
  const bw = (CW - 8) / 3;
  kp.forEach((k, i) => { const x = M + i * (bw + 4); doc.setFillColor(PC.soft); doc.roundedRect(x, y, bw, 25, 2, 2, 'F');
    txt(k[0], x + 4, y + 6.5, { s: 8.5, c: PC.mute }); txt(k[1], x + 4, y + 15, { b: 1, s: 15, c: k[3] }); txt(fit(k[2], bw - 4, 0, 7.5), x + 4, y + 21, { s: 7.5, c: PC.mute }); });
  y += 29;

  /* grafici nel tempo */
  const labels = st.map(s => lblM(s.mese)), CH_H = 72, CH_W = CW;
  h2('Andamento del patrimonio netto', 80);
  const f0 = st[0].netto;
  if (hide) { const ok = f0 > 0; img(lineChart(labels, [{ name: 'Patrimonio netto', color: PC.teal, fill: 1, vals: st.map(s => ok ? s.netto / f0 - 1 : 0) }], ok ? axP : null), CH_W, CH_H); para(ok ? 'Variazione percentuale rispetto al primo mese registrato (' + monthName(st[0].mese) + ').' : 'Importi nascosti: il grafico mostra solo la forma dell\'andamento.', { s: 8 }); }
  else img(lineChart(labels, [{ name: 'Patrimonio netto', color: PC.teal, fill: 1, vals: st.map(s => s.netto) }], axE), CH_W, CH_H);
  if (hide) {
    h2('Indebitamento nel tempo', 80);
    img(lineChart(labels, [{ name: 'Passivi su attivi', color: '#b45309', fill: 1, vals: st.map(s => s.attivi > 0 ? s.passivi / s.attivi : 0) }], axQ), CH_W, CH_H);
  } else {
    h2('Attivi e passivi nel tempo', 80);
    img(lineChart(labels, [{ name: 'Attivi', color: PC.teal, fill: 0, vals: st.map(s => s.attivi) }, { name: 'Passivi', color: PC.neg, fill: 0, vals: st.map(s => s.passivi) }], axE), CH_W, CH_H);
  }
  if (st.length > 1) {
    h2(hide ? 'Variazione mensile del patrimonio netto (%)' : 'Variazione mensile del patrimonio netto', 80);
    const dl = [], dv = []; st.forEach((s, i) => { if (!i) return; const d = s.netto - st[i - 1].netto; dl.push(labels[i]); dv.push(hide ? (st[i - 1].netto ? d / Math.abs(st[i - 1].netto) : 0) : d); });
    img(barChart(dl, dv, hide ? axP : axE), CH_W, CH_H);
  }

  /* composizione attivi */
  const vv0 = vz(D.voci), att = vv0.filter(v => v.tipo === 'attivo'), pas = vv0.filter(v => v.tipo === 'passivo');
  const sum = a => a.reduce((s, v) => s + v.valore, 0), totA = sum(att), totP = sum(pas);
  const group = (arr, key) => { const m = {}; arr.forEach(v => { const k = key(v); m[k] = (m[k] || 0) + v.valore; }); return Object.entries(m).sort((a, b) => b[1] - a[1]); };
  const share = (title, entries, tot) => {
    if (!entries.length) return;
    h2(title, 58); const items = entries.map(([l, v], i) => ({ label: l, val: v, color: PPAL[i % PPAL.length] })), hh = Math.max(56, items.length * 6.4 + 4);
    need(hh); doc.addImage(donut(items), 'PNG', M, y, 54, 54);
    items.forEach((it, i) => { const yy = y + 6 + i * 6.4; doc.setFillColor(it.color); doc.rect(M + 62, yy - 3, 4, 4, 'F'); txt(fit(it.label, 62, 0, 10), M + 69, yy, { s: 10 });
      txt(tot > 0 ? pP(it.val / tot) : '-', M + CW, yy, { s: 10, a: 'right', b: hide }); if (!hide) txt(pE(it.val), M + CW - 22, yy, { s: 10, a: 'right', c: PC.mute }); });
    y += hh;
  };
  share('Composizione degli attivi', group(att, v => v.categoria), totA);
  share('Investimenti per asset class', group(att.filter(v => v.categoria === 'Investimenti'), v => v.assetClass || 'Non indicata'), sum(att.filter(v => v.categoria === 'Investimenti')));

  /* dettaglio attivi */
  h2('Dettaglio degli attivi');
  const cats = [...CATS.attivo, ...new Set(att.map(v => v.categoria).filter(c => !CATS.attivo.includes(c)))], rows = [];
  cats.forEach(c => { const it = att.filter(v => v.categoria === c).sort((a, b) => b.valore - a.valore); if (!it.length) return;
    rows.push({ fill: 1, b: 1, cells: hide ? [c, '', '', totA > 0 ? pP(sum(it) / totA) : '-'] : [c, '', '', pE(sum(it)), totA > 0 ? pP(sum(it) / totA) : '-'] });
    it.forEach(v => rows.push({ cells: hide ? [dn(v), accName(v), v.dove ? 'su ' + v.dove : '', totA > 0 ? pP(v.valore / totA) : '-'] : [dn(v), accName(v), v.dove ? 'su ' + v.dove : '', pE(v.valore), totA > 0 ? pP(v.valore / totA) : '-'] })); });
  table(hide ? [{ h: 'Voce', w: 70 }, { h: 'Account', w: 45 }, { h: 'Conto', w: 45 }, { h: '% degli attivi', w: 20, a: 'r' }] : [{ h: 'Voce', w: 56 }, { h: 'Account', w: 36 }, { h: 'Conto', w: 36 }, { h: 'Valore', w: 30, a: 'r' }, { h: '% attivi', w: 22, a: 'r' }], rows);

  /* passivi */
  if (pas.length) {
    h2('Dettaglio dei passivi');
    const pr = pas.slice().sort((a, b) => b.valore - a.valore).map(v => { const pi = v.piano ? piano(v) : null;
      return { cells: hide ? [dn(v), v.categoria, pi ? 'fino al ' + fmtD(v.fine) : '', totP > 0 ? pP(v.valore / totP) : '-'] : [dn(v), v.categoria, pi ? pE(pi.rata) + '/mese fino al ' + fmtD(v.fine) : '', pE(v.valore), totP > 0 ? pP(v.valore / totP) : '-'] }; });
    table(hide ? [{ h: 'Voce', w: 70 }, { h: 'Categoria', w: 45 }, { h: 'Scadenza', w: 45 }, { h: '% dei passivi', w: 20, a: 'r' }] : [{ h: 'Voce', w: 46 }, { h: 'Categoria', w: 32 }, { h: 'Rata capitale', w: 46 }, { h: 'Residuo', w: 32, a: 'r' }, { h: '% passivi', w: 24, a: 'r' }], pr);
  }

  /* per account */
  if (D.accounts.length) {
    h2('Per account');
    const keys = ['main', ...D.accounts.map(a => a.id)], ar = keys.map(k => { const a = att.filter(v => accKey(v) === k), p = pas.filter(v => accKey(v) === k); return { n: k === 'main' ? D.nome : D.accounts.find(x => x.id === k).nome, a: sum(a), p: sum(p) }; }).filter(r => r.a || r.p);
    table(hide ? [{ h: 'Account', w: 90 }, { h: '% degli attivi', w: 45, a: 'r' }, { h: 'Indebitamento', w: 45, a: 'r' }] : [{ h: 'Account', w: 60 }, { h: 'Attivi', w: 40, a: 'r' }, { h: 'Passivi', w: 40, a: 'r' }, { h: 'Netto', w: 40, a: 'r' }],
      ar.map(r => ({ cells: hide ? [r.n, totA > 0 ? pP(r.a / totA) : '-', r.a > 0 ? pP(r.p / r.a) : '-'] : [r.n, pE(r.a), pE(r.p), { t: pE(r.a - r.p), c: colSgn(r.a - r.p) }] })));
  }

  /* storico */
  h2('Storico mensile');
  const hs = st.map((s, i) => ({ s, d: i ? s.netto - st[i - 1].netto : null, dp: i && st[i - 1].netto ? (s.netto - st[i - 1].netto) / Math.abs(st[i - 1].netto) : null })).reverse().slice(0, 24);
  table(hide ? [{ h: 'Mese', w: 80 }, { h: 'Variazione netto', w: 50, a: 'r' }, { h: 'Indebitamento', w: 50, a: 'r' }] : [{ h: 'Mese', w: 42 }, { h: 'Attivi', w: 34, a: 'r' }, { h: 'Passivi', w: 34, a: 'r' }, { h: 'Netto', w: 34, a: 'r' }, { h: 'Variazione', w: 36, a: 'r' }],
    hs.map(r => ({ cells: hide ? [monthName(r.s.mese), r.dp !== null ? { t: pSP(r.dp), c: colSgn(r.dp) } : '-', r.s.attivi > 0 ? pP(r.s.passivi / r.s.attivi) : '-'] : [monthName(r.s.mese), pE(r.s.attivi), pE(r.s.passivi), pE(r.s.netto), r.d !== null ? { t: pS(r.d), c: colSgn(r.d) } : '-'] })));

  /* indicatori */
  h2('Indicatori patrimoniali');
  const ir = [], M1 = M0;
  if (M1.indeb !== undefined) { ir.push(['Indebitamento', pP(M1.indeb)], ['Peso della liquidità', pP(M1.liq)], ['Peso degli investimenti', pP(M1.inv)]); if (M1.top) ir.push(['Concentrazione (' + M1.top.nome + ')', pP(M1.top.p)]); }
  if (M1.ytd) ir.push(['Crescita da inizio anno', hide ? pSP(M1.ytd.p) : `${pS(M1.ytd.d)} (${pSP(M1.ytd.p)})`]);
  if (M1.y12) ir.push(['Crescita ultimi 12 mesi', hide ? pSP(M1.y12.p) : `${pS(M1.y12.d)} (${pSP(M1.y12.p)})`]);
  if (M1.cagr !== undefined) ir.push(['Crescita annua media (CAGR)', pSP(M1.cagr)]);
  if (M1.dd) ir.push(['Calo massimo', M1.dd.v < 0 ? pP(M1.dd.v) + ' (' + lblM(M1.dd.m) + ')' : 'Nessun calo']);
  if (M1.ob !== undefined) ir.push(['Avanzamento obiettivi', pP(M1.ob)]);
  table([{ h: 'Indicatore', w: 110 }, { h: 'Valore', w: 70, a: 'r' }], ir.map(r => ({ cells: [r[0], r[1]] })));

  /* note */
  h2('Come leggere il report');
  [
    'Il patrimonio netto è ciò che possiedi meno ciò che devi: è il numero più importante da seguire nel tempo.',
    'L\'indebitamento è la quota di ciò che possiedi coperta da debiti. Come regola generale sotto il 30% è contenuto, oltre il 60% è alto.',
    'Un fondo per gli imprevisti in liquidità pari a 3-6 mesi di spese è una regola di prudenza molto usata; troppa liquidità, però, perde valore con l\'inflazione.',
    'Se una sola voce vale oltre il 60% degli attivi, il patrimonio dipende troppo da lei: distribuire il rischio lo rende più stabile.'
  ].forEach(s => para('•  ' + s, { s: 9, c: PC.ink, ind: 0 }));
  y += 2; para('Informazioni generali a scopo educativo, non consulenza finanziaria. Report creato da P.Finance con i dati inseriti dall\'utente.', { s: 8 });

  /* piè di pagina */
  const N = doc.getNumberOfPages();
  for (let i = 1; i <= N; i++) { doc.setPage(i); doc.setDrawColor(PC.line); doc.setLineWidth(0.2); doc.line(M, PH - 11, PW - M, PH - 11);
    txt('P.Finance · Report del patrimonio' + (hide ? ' · importi nascosti' : ''), M, PH - 6.5, { s: 8, c: PC.mute }); txt(`Pagina ${i} di ${N}`, PW - M, PH - 6.5, { s: 8, c: PC.mute, a: 'right' }); }
  doc.setProperties({ title: 'Report del patrimonio - ' + monthName(cur.mese), creator: 'P.Finance' });
  const name = `PFinance_report_${cur.mese}${hide ? '_senza-importi' : ''}.pdf`;
  return { blob: doc.output('blob'), name };
}

/* ---------- riquadro nella pagina Report ---------- */
function pdfCard() {
  const p = S.pdf;
  return `<div class="card"><h2>Report PDF</h2>
    <p class="note" style="margin-top:0">Report dettagliato con grafici, tabelle e indicatori, creato sul tuo telefono.</p>
    <label style="display:flex;gap:10px;align-items:flex-start;margin:12px 0"><input type="checkbox" id="pdfhide" style="width:auto;margin-top:3px" ${S.pdfHide ? 'checked' : ''}><span>Nascondi gli importi (restano solo le percentuali)</span></label>
    ${S.pdfBusy ? '<p class="note">Creazione del PDF in corso…</p>' : `<button class="b" data-act="pdfmake">${p ? 'Ricrea il PDF' : 'Crea il PDF'}</button>`}
    ${p && !S.pdfBusy ? `<div class="msg ok" style="margin-top:12px">Report pronto: ${esc(p.name)}</div><div class="acts"><button class="b" data-act="pdfsave">Salva</button>${pdfCanShare() ? '<button class="b s" data-act="pdfshare">Condividi</button>' : ''}</div>` : ''}</div>`;
}
