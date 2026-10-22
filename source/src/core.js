/* Onionskyn core: pure logic (geometry, tweens, GIF, SVG, FLA import). No DOM access except DOMParser/JSZip at import time. */
(function (root) {
'use strict';
const PI = Math.PI;
let _uid = 0;
const uid = () => 'o' + Date.now().toString(36) + (_uid++).toString(36) + Math.floor(Math.random() * 46656).toString(36);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const clone = (o) => JSON.parse(JSON.stringify(o));
const nz = (v, d) => (v == null ? d : v);
let _lib = {};            /* symbol library of the current document (name -> {layers, frames}) */
let _mctx = null;
let _ctxEl = null;        /* unwrapped elapsed frames of the enclosing clip (movie clips nested in clips keep playing) */         /* 2D context used to measure text */
function setLib(l) { _lib = l || {}; }
function setMeasure(c) { _mctx = c; }

/* ---------- colour ---------- */
function hexToRgb(h) {
  h = (h || '#000000').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('');
}
function lerpHex(a, b, t) {
  const A = hexToRgb(a), B = hexToRgb(b);
  return rgbToHex(lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t));
}
function rgba(hex, a) { const c = hexToRgb(hex); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; }

/* ---------- matrices: [a,b,c,d,e,f] canvas convention ---------- */
function newT() { return { x: 0, y: 0, sx: 1, sy: 1, r: 0 }; }
function matOf(t) {
  const c = Math.cos(t.r * PI / 180), s = Math.sin(t.r * PI / 180);
  return [c * t.sx, s * t.sx, -s * t.sy, c * t.sy, t.x, t.y];
}
function mmul(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}
function minv(m) {
  const det = m[0] * m[3] - m[1] * m[2];
  if (Math.abs(det) < 1e-12) return [1, 0, 0, 1, -m[4], -m[5]];
  const id = 1 / det;
  return [m[3] * id, -m[1] * id, -m[2] * id, m[0] * id, (m[2] * m[5] - m[3] * m[4]) * id, (m[1] * m[4] - m[0] * m[5]) * id];
}
function mapply(m, x, y) { return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; }
function decompose(m) {
  const sx = Math.hypot(m[0], m[1]);
  const r = Math.atan2(m[1], m[0]);
  const det = m[0] * m[3] - m[1] * m[2];
  const sy = sx > 1e-12 ? det / sx : Math.hypot(m[2], m[3]);
  const h = sx > 1e-12 ? (m[0] * m[2] + m[1] * m[3]) / sx : 0;
  const skew = Math.abs(h) / (Math.max(Math.abs(sx), Math.abs(sy)) || 1);
  return { x: m[4], y: m[5], sx, sy, r: r * 180 / PI, skew };
}

/* ---------- paths ---------- */
function node(x, y) { return { x, y, ix: 0, iy: 0, ox: 0, oy: 0 }; }
function tracePath(p, contours) {
  for (const c of contours) {
    const n = c.nodes;
    if (!n.length) continue;
    p.moveTo(n[0].x, n[0].y);
    const cnt = c.closed ? n.length : n.length - 1;
    for (let i = 0; i < cnt; i++) {
      const a = n[i], b = n[(i + 1) % n.length];
      if (a.ox || a.oy || b.ix || b.iy) p.bezierCurveTo(a.x + a.ox, a.y + a.oy, b.x + b.ix, b.y + b.iy, b.x, b.y);
      else p.lineTo(b.x, b.y);
    }
    if (c.closed) p.closePath();
  }
}
const f2 = (v) => +v.toFixed(3);
function pathD(contours) {
  let d = '';
  for (const c of contours) {
    const n = c.nodes;
    if (!n.length) continue;
    d += 'M' + f2(n[0].x) + ' ' + f2(n[0].y);
    const cnt = c.closed ? n.length : n.length - 1;
    for (let i = 0; i < cnt; i++) {
      const a = n[i], b = n[(i + 1) % n.length];
      if (a.ox || a.oy || b.ix || b.iy) d += 'C' + f2(a.x + a.ox) + ' ' + f2(a.y + a.oy) + ' ' + f2(b.x + b.ix) + ' ' + f2(b.y + b.iy) + ' ' + f2(b.x) + ' ' + f2(b.y);
      else d += 'L' + f2(b.x) + ' ' + f2(b.y);
    }
    if (c.closed) d += 'Z';
  }
  return d;
}
function bezPt(a, b, t) {
  const u = 1 - t;
  const x1 = a.x + a.ox, y1 = a.y + a.oy, x2 = b.x + b.ix, y2 = b.y + b.iy;
  return [
    u * u * u * a.x + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * b.x,
    u * u * u * a.y + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * b.y];
}
function splitSeg(a, b, t) {
  const P0 = [a.x, a.y], P1 = [a.x + a.ox, a.y + a.oy], P2 = [b.x + b.ix, b.y + b.iy], P3 = [b.x, b.y];
  const L = (p, q) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
  const Q0 = L(P0, P1), Q1 = L(P1, P2), Q2 = L(P2, P3), R0 = L(Q0, Q1), R1 = L(Q1, Q2), S = L(R0, R1);
  const na = Object.assign({}, a, { ox: Q0[0] - P0[0], oy: Q0[1] - P0[1] });
  const nb = Object.assign({}, b, { ix: Q2[0] - P3[0], iy: Q2[1] - P3[1] });
  const m = { x: S[0], y: S[1], ix: R0[0] - S[0], iy: R0[1] - S[1], ox: R1[0] - S[0], oy: R1[1] - S[1], s: true };
  return [na, m, nb];
}
function contoursBounds(contours) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  const add = (x, y) => { if (x < x0) x0 = x; if (y < y0) y0 = y; if (x > x1) x1 = x; if (y > y1) y1 = y; };
  for (const c of contours) {
    const n = c.nodes;
    for (const q of n) add(q.x, q.y);
    const cnt = c.closed ? n.length : n.length - 1;
    for (let i = 0; i < cnt; i++) {
      const a = n[i], b = n[(i + 1) % n.length];
      if (a.ox || a.oy || b.ix || b.iy) for (let k = 1; k < 12; k++) { const p = bezPt(a, b, k / 12); add(p[0], p[1]); }
    }
  }
  return x0 === Infinity ? null : { x0, y0, x1, y1 };
}
/* ---------- bitmaps (doc.images[name] = { name, mime, b64, w, h, size }) ---------- */
let _images = {}; const _imgEls = new Map();
function setImages(m) { _images = m || {}; }
function imgEl(name) {
  const rec = _images[name];
  if (!rec || !rec.b64 || typeof Image === 'undefined') return null;
  const sig = rec.mime + ':' + rec.b64.length;
  let e = _imgEls.get(name);
  if (!e || e.sig !== sig) {
    const el = new Image();
    e = { el, sig, ok: false, p: null };
    e.p = new Promise((res) => {
      el.onload = () => { e.ok = true; res(true); if (root.FCCore && root.FCCore.onImageLoad) root.FCCore.onImageLoad(name); };
      el.onerror = () => { res(false); };
    });
    el.src = 'data:' + rec.mime + ';base64,' + rec.b64;
    _imgEls.set(name, e);
  }
  return e.ok ? e.el : null;
}
function preloadImages() {
  const ps = [];
  for (const n of Object.keys(_images)) { imgEl(n); const e = _imgEls.get(n); if (e) ps.push(e.p); }
  return Promise.all(ps);
}
/* ---------- layer masks: a visible mask layer clips the contiguous 'masked' layers directly below it ---------- */
function groupEntries(entries) {
  const units = [];
  let i = entries.length - 1;
  while (i >= 0) {
    const e = entries[i], L = e.layer;
    if (L.mask) {
      let j = i - 1; const mem = [];
      while (j >= 0 && entries[j].layer.masked) { mem.unshift(entries[j]); j--; }
      if (L.visible !== false && mem.length) units.unshift({ mask: e, members: mem });
      else for (let k = mem.length - 1; k >= 0; k--) units.unshift({ e: mem[k] });
      i = j;
    } else { units.unshift({ e }); i--; }
  }
  return units;
}
const _mt = []; let _md = 0;
function maskedDraw(ctx, drawMembers, drawMask) {
  const cv = ctx.canvas, w = cv.width, h = cv.height, d = _md++;
  try {
    for (let k = d * 2; k < d * 2 + 2; k++) if (!_mt[k]) _mt[k] = document.createElement('canvas');
    const a = _mt[d * 2], b = _mt[d * 2 + 1];
    if (a.width !== w || a.height !== h) { a.width = w; a.height = h; }
    if (b.width !== w || b.height !== h) { b.width = w; b.height = h; }
    const ac = a.getContext('2d'), bc = b.getContext('2d'), M = ctx.getTransform();
    for (const c of [ac, bc]) { c.setTransform(1, 0, 0, 1, 0, 0); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.clearRect(0, 0, w, h); c.setTransform(M); }
    drawMembers(ac); drawMask(bc);
    ac.setTransform(1, 0, 0, 1, 0, 0); ac.globalCompositeOperation = 'destination-in'; ac.drawImage(b, 0, 0); ac.globalCompositeOperation = 'source-over';
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(a, 0, 0); ctx.restore();
  } finally { _md--; }
}
function drawUnits(ctx, entries, opt, drawLayer) {
  drawLayer = drawLayer || ((c, e, isMask) => { for (const o of e.objs) drawObj(c, o, isMask ? {} : opt); });
  for (const u of groupEntries(entries)) {
    if (!u.mask) drawLayer(ctx, u.e, false);
    else maskedDraw(ctx, (c) => { for (const m of u.members) drawLayer(c, m, false); }, (c) => drawLayer(c, u.mask, true));
  }
}
function entriesToObjs(entries) {
  const out = [];
  for (const u of groupEntries(entries)) {
    if (!u.mask) { for (const o of u.e.objs) out.push(o); continue; }
    const kids = []; for (const m of u.members) for (const o of m.objs) kids.push(o);
    out.push({ id: 'mg' + u.mask.layer.id, kind: 'group', mask: u.mask.objs, children: kids, op: 1, t: newT() });
  }
  return out;
}
function kidsOf(o) {
  if (o.kind === 'group') return o.children || [];
  if (o.kind === 'clip') {
    const lib = _lib[o.sym];
    if (!lib) return [];
    const f = o._f || 0, ents = [], prev = _ctxEl;
    _ctxEl = o._el == null ? null : o._el;
    for (const l of lib.layers) { if (l.visible === false) continue; ents.push({ layer: l, objs: evalLayerObjs(l, f) }); }
    _ctxEl = prev;
    return entriesToObjs(ents);
  }
  return [];
}
function fontStr(r) { return (r.i ? 'italic ' : '') + (r.b ? 'bold ' : '') + Math.max(1, r.size || 16) + 'px "' + (r.font || 'Arial') + '", Helvetica, Arial, sans-serif'; }
function measureW(r, str, ls) {
  if (_mctx) { _mctx.font = fontStr(r); return _mctx.measureText(str).width + (ls || 0) * str.length; }
  return str.length * (r.size || 16) * 0.55 + (ls || 0) * str.length;
}
/* distance from the top of a text line (where the canvas draws it) down to the alphabetic baseline, so SVG text sits where canvas text does; null if the browser can't measure it */
function baselineDrop(r) {
  if (!_mctx) return null;
  try {
    _mctx.font = fontStr(r); _mctx.textBaseline = 'top';
    const m = _mctx.measureText('Hg'); _mctx.textBaseline = 'alphabetic';
    return typeof m.alphabeticBaseline === 'number' && isFinite(m.alphabeticBaseline) && m.alphabeticBaseline !== 0 ? -m.alphabeticBaseline : null;
  } catch (e) { return null; }
}
function layoutText(o) {
  const lines = [];
  let cur = { segs: [], w: 0, h: 0 };
  const push = () => { lines.push(cur); cur = { segs: [], w: 0, h: 0 }; };
  const wrapW = o.w > 0 ? o.w : 0;
  for (const r of o.runs) {
    const lh = (r.size || 16) * 1.2;
    String(r.t).split(/\r\n|\r|\n/).forEach((part, pi) => {
      if (pi > 0) push();
      cur.h = Math.max(cur.h, lh);
      if (!part) return;
      if (wrapW && !o.nw) {
        for (const w of part.split(/(\s+)/)) {
          if (!w) continue;
          const ww = measureW(r, w, o.ls);
          if (cur.w + ww > wrapW && cur.w > 0 && w.trim()) push();
          cur.h = Math.max(cur.h, lh);
          cur.segs.push({ r, t: w, w: ww }); cur.w += ww;
        }
      } else { const ww = measureW(r, part, o.ls); cur.segs.push({ r, t: part, w: ww }); cur.w += ww; }
    });
  }
  lines.push(cur);
  let y = 0, mw = 0;
  for (const l of lines) { if (!l.h) l.h = ((o.runs[0] && o.runs[0].size) || 16) * 1.2; l.y = y; y += l.h; mw = Math.max(mw, l.w); }
  const bw = wrapW || mw;
  for (const l of lines) l.x = o.align === 'center' ? (bw - l.w) / 2 : o.align === 'right' ? bw - l.w : 0;
  return { lines, w: bw, h: y };
}
function localBounds(o) {
  if (o.kind === 'path') return contoursBounds(o.contours);
  if (o.kind === 'text') { const l = layoutText(o); return { x0: 0, y0: 0, x1: Math.max(l.w, 1), y1: Math.max(l.h, 1) }; }
  if (o.kind === 'image') return { x0: 0, y0: 0, x1: Math.max(o.w || 1, 1), y1: Math.max(o.h || 1, 1) };
  let b = null;
  for (const ch of kidsOf(o)) {
    const cb = localBounds(ch);
    if (!cb) continue;
    const m = matOf(ch.t);
    for (const [x, y] of [[cb.x0, cb.y0], [cb.x1, cb.y0], [cb.x1, cb.y1], [cb.x0, cb.y1]]) {
      const p = mapply(m, x, y);
      if (!b) b = { x0: p[0], y0: p[1], x1: p[0], y1: p[1] };
      else { b.x0 = Math.min(b.x0, p[0]); b.y0 = Math.min(b.y0, p[1]); b.x1 = Math.max(b.x1, p[0]); b.y1 = Math.max(b.y1, p[1]); }
    }
  }
  if (b && o.kind === 'clip' && o.pv) { b.x0 -= o.pv[0]; b.x1 -= o.pv[0]; b.y0 -= o.pv[1]; b.y1 -= o.pv[1]; }
  return b;
}
function worldCorners(o, pm) {
  const b = localBounds(o);
  if (!b) return null;
  const m = pm ? mmul(pm, matOf(o.t)) : matOf(o.t);
  return [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]].map((p) => mapply(m, p[0], p[1]));
}
function worldBounds(o) {
  const c = worldCorners(o);
  if (!c) return null;
  const xs = c.map((p) => p[0]), ys = c.map((p) => p[1]);
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) };
}
/* shift a path's nodes so its bounds centre becomes the local origin */
function recenter(o) {
  if (o.kind !== 'path' || o.rig) return o;
  const b = contoursBounds(o.contours);
  if (!b) return o;
  const cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  for (const c of o.contours) for (const n of c.nodes) { n.x -= cx; n.y -= cy; }
  if (o.grad) o.grad.m = mmul([1, 0, 0, 1, -cx, -cy], o.grad.m);
  const p = mapply(matOf(o.t), cx, cy);
  o.t.x = p[0]; o.t.y = p[1];
  return o;
}
function applyMatrixToNodes(contours, m) {
  for (const c of contours) for (const n of c.nodes) {
    const p = mapply(m, n.x, n.y);
    const i = [m[0] * n.ix + m[2] * n.iy, m[1] * n.ix + m[3] * n.iy];
    const o = [m[0] * n.ox + m[2] * n.oy, m[1] * n.ox + m[3] * n.oy];
    n.x = p[0]; n.y = p[1]; n.ix = i[0]; n.iy = i[1]; n.ox = o[0]; n.oy = o[1];
  }
}
/* assign full matrix m to object (bakes skew into geometry when needed) */
function setObjMatrix(o, m) {
  const d = decompose(m);
  if (d.skew < 1e-3 || o.kind === 'clip' || o.kind === 'text' || o.kind === 'image') { o.t = { x: d.x, y: d.y, sx: d.sx, sy: d.sy, r: d.r }; return o; }
  if (o.kind === 'path') {
    delete o.rig;
    applyMatrixToNodes(o.contours, m);
    if (o.grad) o.grad.m = mmul(m, o.grad.m);
    o.t = newT();
  } else {
    const kids = o.children || [];
    o.t = newT();
    for (const ch of kids) setObjMatrix(ch, mmul(m, matOf(ch.t)));
  }
  return o;
}

/* ---------- object factories ---------- */
const KAPPA = 0.5522847498;
function ellipseContour(rx, ry) {
  const kx = rx * KAPPA, ky = ry * KAPPA;
  return {
    closed: true, nodes: [
      { x: 0, y: -ry, ix: -kx, iy: 0, ox: kx, oy: 0, s: true },
      { x: rx, y: 0, ix: 0, iy: -ky, ox: 0, oy: ky, s: true },
      { x: 0, y: ry, ix: kx, iy: 0, ox: -kx, oy: 0, s: true },
      { x: -rx, y: 0, ix: 0, iy: ky, ox: 0, oy: -ky, s: true }]
  };
}
function rectContour(w, h, r) {
  const hw = w / 2, hh = h / 2;
  r = clamp(r || 0, 0, Math.min(hw, hh));
  if (r < 0.01) return { closed: true, nodes: [node(-hw, -hh), node(hw, -hh), node(hw, hh), node(-hw, hh)] };
  const k = r * KAPPA;
  const N = (x, y, ix, iy, ox, oy) => ({ x, y, ix, iy, ox, oy });
  return {
    closed: true, nodes: [
      N(-hw + r, -hh, -k, 0, 0, 0), N(hw - r, -hh, 0, 0, k, 0),
      N(hw, -hh + r, 0, -k, 0, 0), N(hw, hh - r, 0, 0, 0, k),
      N(hw - r, hh, k, 0, 0, 0), N(-hw + r, hh, 0, 0, -k, 0),
      N(-hw, hh - r, 0, k, 0, 0), N(-hw, -hh + r, 0, 0, 0, -k)]
  };
}
function mkPath(contours, st, t) {
  st = st || {};
  return {
    id: uid(), kind: 'path', contours,
    fill: st.fill === undefined ? '#3F5BFF' : st.fill, fa: nz(st.fa, 1),
    stroke: st.stroke === undefined ? null : st.stroke, sa: nz(st.sa, 1), sw: nz(st.sw, 3),
    cap: st.cap || 'round', join: st.join || 'round', op: 1,
    t: Object.assign(newT(), t || {})
  };
}
function mkLayer(name) {
  return { id: uid(), name: name || 'Layer', visible: true, locked: false, kfs: [mkKf(0)] };
}
function mkKf(f, objs) { return { f, objs: objs || [], tween: 'none', ease: { type: 'linear', amt: 50 } }; }
function mkDoc() {
  const l = mkLayer('Layer 1');
  return { w: 640, h: 360, fps: 24, bg: '#FFFFFF', frames: 48, layers: [l], lib: {}, sounds: {}, images: {} };
}
function normalizeDoc(d) {
  d.w = clamp(+d.w || 640, 16, 4096); d.h = clamp(+d.h || 360, 16, 4096);
  d.lib = d.lib || {}; d.sounds = d.sounds || {}; d.images = d.images || {};
  d.fps = clamp(+d.fps || 24, 1, 120); d.bg = /^(#[0-9a-f]{3,8}|transparent)$/i.test(String(d.bg || '')) ? String(d.bg) : '#FFFFFF'; d.frames = clamp(Math.round(+d.frames || 1), 1, 900);
  if (!Array.isArray(d.layers) || !d.layers.length) d.layers = [mkLayer('Layer 1')];
  for (const l of d.layers) {
    l.id = l.id || uid(); l.name = l.name || 'Layer'; l.visible = l.visible !== false; l.locked = !!l.locked;
    if (!Array.isArray(l.kfs) || !l.kfs.length) l.kfs = [mkKf(0)];
    l.kfs.sort((a, b) => a.f - b.f);
    if (l.kfs[0].f !== 0) l.kfs.unshift(mkKf(0));
    for (const k of l.kfs) { k.objs = k.objs || []; k.tween = k.tween || 'none'; k.ease = k.ease || { type: 'linear', amt: 50 }; if (k.scene != null) k.scene = String(k.scene).slice(0, 80); }
    const mx = l.kfs[l.kfs.length - 1].f + 1;
    if (mx > d.frames) d.frames = mx;
  }
  d.frames = Math.min(d.frames, 900);
  normRigs(d.layers); for (const k of Object.keys(d.lib)) if (d.lib[k]) normRigs(d.lib[k].layers);
  if (d.lang !== 'as1') delete d.lang;
  return d;
}

/* ---------- easing ---------- */
function bezierEase(p, x1, y1, x2, y2) {
  if (p <= 0) return 0; if (p >= 1) return 1;
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  let t = p;
  for (let i = 0; i < 8; i++) { const e = X(t) - p; if (Math.abs(e) < 1e-6) return Y(t); const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= e / d; }
  let lo = 0, hi = 1; t = p;
  for (let i = 0; i < 40; i++) { const e = X(t); if (Math.abs(e - p) < 1e-6) break; if (e < p) lo = t; else hi = t; t = (lo + hi) / 2; }
  return Y(t);
}
function ease(type, amt, p, pts) {
  if (type === 'bezier' && pts && pts.length === 4) return bezierEase(p, +pts[0], +pts[1], +pts[2], +pts[3]);
  const a = clamp(amt == null ? 50 : amt, 0, 100) / 100, k = 1 + a * 3;
  switch (type) {
    case 'in': return Math.pow(p, k);
    case 'out': return 1 - Math.pow(1 - p, k);
    case 'inout': return p < 0.5 ? 0.5 * Math.pow(2 * p, k) : 1 - 0.5 * Math.pow(2 * (1 - p), k);
    case 'bounce':
      if (p < 1 / 2.75) return 7.5625 * p * p;
      if (p < 2 / 2.75) { p -= 1.5 / 2.75; return 7.5625 * p * p + 0.75; }
      if (p < 2.5 / 2.75) { p -= 2.25 / 2.75; return 7.5625 * p * p + 0.9375; }
      p -= 2.625 / 2.75; return 7.5625 * p * p + 0.984375;
    case 'elastic': return p <= 0 ? 0 : p >= 1 ? 1 : Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * (2 * PI / 3)) + 1;
    default: return p;
  }
}

/* ---------- shape morphing ---------- */
function segCount(c) { return c.closed ? c.nodes.length : Math.max(0, c.nodes.length - 1); }
function segLen(a, b) {
  const x1 = a.x + a.ox, y1 = a.y + a.oy, x2 = b.x + b.ix, y2 = b.y + b.iy;
  return Math.hypot(x1 - a.x, y1 - a.y) + Math.hypot(x2 - x1, y2 - y1) + Math.hypot(b.x - x2, b.y - y2);
}
function subdivideTo(c, target) {
  const nodes = c.nodes.map((n) => Object.assign({}, n));
  for (let guard = 0; guard < 5000; guard++) {
    const segs = c.closed ? nodes.length : nodes.length - 1;
    if (segs >= target) break;
    let bi = 0, bl = -1;
    for (let i = 0; i < segs; i++) { const l = segLen(nodes[i], nodes[(i + 1) % nodes.length]); if (l > bl) { bl = l; bi = i; } }
    const j = (bi + 1) % nodes.length;
    const r = splitSeg(nodes[bi], nodes[j], 0.5);
    nodes[bi] = r[0]; nodes[j] = r[2];
    nodes.splice(bi + 1, 0, r[1]);
  }
  return nodes;
}
function signedArea(nodes) {
  let s = 0;
  for (let i = 0; i < nodes.length; i++) { const a = nodes[i], b = nodes[(i + 1) % nodes.length]; s += a.x * b.y - b.x * a.y; }
  return s / 2;
}
function reverseNodes(nodes) {
  return nodes.slice().reverse().map((n) => Object.assign({}, n, { ix: n.ox, iy: n.oy, ox: n.ix, oy: n.iy }));
}
function alignNodes(A, B, closed) {
  let nb = B;
  if (closed) {
    if (signedArea(A) * signedArea(nb) < 0) nb = reverseNodes(nb);
    const n = A.length;
    if (n <= 240) {
      let best = 0, bc = Infinity;
      for (let k = 0; k < n; k++) {
        let cst = 0;
        for (let i = 0; i < n; i++) { const q = nb[(i + k) % n]; cst += (A[i].x - q.x) ** 2 + (A[i].y - q.y) ** 2; }
        if (cst < bc) { bc = cst; best = k; }
      }
      if (best) nb = nb.slice(best).concat(nb.slice(0, best));
    }
  } else {
    const n = nb.length;
    const d0 = Math.hypot(A[0].x - nb[0].x, A[0].y - nb[0].y) + Math.hypot(A[A.length - 1].x - nb[n - 1].x, A[A.length - 1].y - nb[n - 1].y);
    const d1 = Math.hypot(A[0].x - nb[n - 1].x, A[0].y - nb[n - 1].y) + Math.hypot(A[A.length - 1].x - nb[0].x, A[A.length - 1].y - nb[0].y);
    if (d1 < d0) nb = reverseNodes(nb);
  }
  return nb;
}
function lerpNode(a, b, p) {
  return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), ix: lerp(a.ix, b.ix, p), iy: lerp(a.iy, b.iy, p), ox: lerp(a.ox, b.ox, p), oy: lerp(a.oy, b.oy, p) };
}
function morphContours(A, B, p) {
  if (!A.length || A.length !== B.length) return null;
  const out = [];
  for (let i = 0; i < A.length; i++) {
    const a = A[i], b = B[i];
    if (a.closed !== b.closed || a.nodes.length < 2 || b.nodes.length < 2) return null;
    const tgt = Math.max(segCount(a), segCount(b));
    const na = subdivideTo(a, tgt);
    const nb = alignNodes(na, subdivideTo(b, tgt), a.closed);
    out.push({ closed: a.closed, nodes: na.map((n, j) => lerpNode(n, nb[j], p)) });
  }
  return out;
}

/* ---------- timeline evaluation ---------- */
function lerpT(a, b, p) { return { x: lerp(a.x, b.x, p), y: lerp(a.y, b.y, p), sx: lerp(a.sx, b.sx, p), sy: lerp(a.sy, b.sy, p), r: lerp(a.r, b.r, p) }; }
function lerpPaint(o, a, b, p) {
  for (const k of ['fill', 'stroke']) {
    const ak = k === 'fill' ? 'fa' : 'sa';
    const ca = a[k], cb = b[k];
    if (ca && cb) { o[k] = lerpHex(ca, cb, p); o[ak] = lerp(nz(a[ak], 1), nz(b[ak], 1), p); }
    else if (ca || cb) { o[k] = ca || cb; o[ak] = lerp(ca ? nz(a[ak], 1) : 0, cb ? nz(b[ak], 1) : 0, p); }
  }
  o.sw = lerp(a.sw || 0, b.sw || 0, p);
}
/* ---------- bone arm: shoulder -> elbow -> hand with two-bone IK ----------
   A rig is an ordinary path object that also carries o.rig = { s:[x,y], h:[x,y], l1, l2, flip, w:[r0,r1,r2] } in the object's own space.
   The outline (o.contours) is derived from the rig, so every renderer and exporter draws it like any other shape; tweens interpolate the rig and rebuild it. */
function rigSolve(g) {
  const sx = g.s[0], sy = g.s[1], dx = g.h[0] - sx, dy = g.h[1] - sy, d = Math.hypot(dx, dy);
  const l1 = g.l1, l2 = g.l2, lo = Math.abs(l1 - l2) + 1e-6, hi = l1 + l2 - 1e-6;
  const ux = d > 1e-9 ? dx / d : 1, uy = d > 1e-9 ? dy / d : 0;
  const dc = Math.min(Math.max(d, lo), hi);
  const a = (l1 * l1 - l2 * l2 + dc * dc) / (2 * dc), h = Math.sqrt(Math.max(0, l1 * l1 - a * a)), fl = g.flip < 0 ? -1 : 1;
  return { s: [sx, sy], e: [sx + ux * a - uy * h * fl, sy + uy * a + ux * h * fl], h: [sx + ux * dc, sy + uy * dc], reach: d > hi || d < lo };
}
function rigContours(g) {
  const k = rigSolve(g), P = [k.s, k.e, k.h], r = g.w, out = [];
  const circ = (p, rad) => { const c = ellipseContour(rad, rad); for (const n of c.nodes) { n.x += p[0]; n.y += p[1]; } return c; };
  const seg = (A, B, ra, rb) => {
    const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
    let q = [[A[0] + nx * ra, A[1] + ny * ra], [B[0] + nx * rb, B[1] + ny * rb], [B[0] - nx * rb, B[1] - ny * rb], [A[0] - nx * ra, A[1] - ny * ra]];
    let area = 0; for (let i = 0; i < 4; i++) { const u = q[i], v = q[(i + 1) % 4]; area += u[0] * v[1] - v[0] * u[1]; }
    if (area < 0) q = q.reverse();
    return { closed: true, nodes: q.map((u) => ({ x: u[0], y: u[1], ix: 0, iy: 0, ox: 0, oy: 0 })) };
  };
  out.push(seg(P[0], P[1], r[0], r[1]), seg(P[1], P[2], r[1], r[2]));
  for (let i = 0; i < 3; i++) out.push(circ(P[i], r[i]));
  return out;
}
function rigBuild(o) { o.contours = rigContours(o.rig); o.nz = true; return o; }
function rigValid(g) {
  const num = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;
  const pt = (p) => Array.isArray(p) && p.length === 2 && num(p[0], -1e6, 1e6) && num(p[1], -1e6, 1e6);
  return !!g && pt(g.s) && pt(g.h) && num(g.l1, 1, 1e5) && num(g.l2, 1, 1e5) && Array.isArray(g.w) && g.w.length === 3 && g.w.every((v) => num(v, 0.5, 1e4));
}
function lerpRig(a, b, p) {
  const L = (x, y) => x + (y - x) * p;
  return { s: [L(a.s[0], b.s[0]), L(a.s[1], b.s[1])], h: [L(a.h[0], b.h[0]), L(a.h[1], b.h[1])], l1: L(a.l1, b.l1), l2: L(a.l2, b.l2), flip: a.flip < 0 ? -1 : 1, w: a.w.map((v, i) => L(v, b.w[i])) };
}
function normRigs(layers) {
  for (const l of layers || []) for (const k of l.kfs || []) for (const o of k.objs || []) {
    if (o.bind && !(o.kind === 'clip' && bindValid(o.bind))) delete o.bind;
    if (!o.rig) continue;
    o.rig.ghost = !!o.rig.ghost;
    if (o.kind === 'path' && rigValid(o.rig)) { o.rig.flip = o.rig.flip < 0 ? -1 : 1; rigBuild(o); } else delete o.rig;
  }
}
/* ---------- attaching symbols to bones ----------
   A symbol instance with o.bind = { to: <rig object id>, bone: 0|1, lx, ly, lr } is held rigidly in the bone's frame (bone 0 = shoulder->elbow, 1 = elbow->hand).
   The rig must be on the same layer. Evaluation overrides the instance's x, y and rotation from the rig's evaluated pose, so tweens and every renderer follow along. */
const freeBind = new Set(); /* ids being dragged in the editor: shown where the pointer puts them until the drag is committed */
function boneFrame(rigObj, bone) {
  const k = rigSolve(rigObj.rig), M = matOf(rigObj.t), A = bone ? k.e : k.s, B = bone ? k.h : k.e;
  const a = mapply(M, A[0], A[1]), b = mapply(M, B[0], B[1]);
  return { x: a[0], y: a[1], r: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / PI };
}
function bindPose(o, rigObj) {
  const f = boneFrame(rigObj, o.bind.bone), th = f.r * PI / 180, c = Math.cos(th), s = Math.sin(th), b = o.bind;
  return { x: f.x + c * b.lx - s * b.ly, y: f.y + s * b.lx + c * b.ly, r: f.r + b.lr };
}
function resolveBinds(objs) {
  let any = false;
  for (const o of objs) if (o.bind) { any = true; break; }
  if (!any) return objs;
  for (const o of objs) {
    if (!o.bind || o.kind !== 'clip' || freeBind.has(o.id)) continue;
    const r = objs.find((x) => x.id === o.bind.to && x.rig && x.kind === 'path');
    if (!r) continue;
    const q = bindPose(o, r);
    o.t = Object.assign({}, o.t, { x: q.x, y: q.y, r: q.r });
  }
  return objs;
}
function bindOffsets(o, rigObj, bone) {
  const f = boneFrame(rigObj, bone), th = f.r * PI / 180, c = Math.cos(th), s = Math.sin(th), dx = o.t.x - f.x, dy = o.t.y - f.y;
  return { to: rigObj.id, bone, lx: c * dx + s * dy, ly: -s * dx + c * dy, lr: o.t.r - f.r };
}
/* attach (or move to another bone) on every keyframe of the layer that has both objects */
function bindBone(layer, clipId, rigId, bone) {
  let n = 0;
  for (const k of layer.kfs) {
    const o = k.objs.find((x) => x.id === clipId && x.kind === 'clip'), r = k.objs.find((x) => x.id === rigId && x.rig && x.kind === 'path');
    if (!o || !r) continue;
    o.bind = bindOffsets(o, r, bone === 1 ? 1 : 0); n++;
  }
  return n;
}
function unbindBone(layer, clipId) {
  for (const k of layer.kfs) for (const o of k.objs) if (o.id === clipId && o.bind) delete o.bind;
}
function setRigGhost(layer, rigId, v) {
  for (const k of layer.kfs) for (const o of k.objs) if (o.id === rigId && o.rig) o.rig.ghost = !!v;
}
/* keep stored x/y/rotation of bound instances in step with the pose; an instance in `edited` that the user moved is re-attached from where it now is */
function settleBinds(objs, edited) {
  for (const o of objs) {
    if (!o.bind || o.kind !== 'clip') continue;
    const r = objs.find((x) => x.id === o.bind.to && x.rig && x.kind === 'path');
    if (!r) continue;
    const q = bindPose(o, r);
    if (edited && edited.has(o.id) && (Math.abs(q.x - o.t.x) > 0.01 || Math.abs(q.y - o.t.y) > 0.01 || Math.abs(q.r - o.t.r) > 0.01)) o.bind = bindOffsets(o, r, o.bind.bone);
    else { o.t.x = q.x; o.t.y = q.y; o.t.r = q.r; }
  }
}
function bindValid(b) {
  const num = (v) => typeof v === 'number' && isFinite(v) && Math.abs(v) < 1e7;
  return !!b && typeof b.to === 'string' && b.to.length < 80 && (b.bone === 0 || b.bone === 1) && num(b.lx) && num(b.ly) && num(b.lr);
}
function lerpObj(a, b, p, mode) {
  const o = Object.assign({}, a);
  o.t = lerpT(a.t, b.t, p);
  o.op = lerp(nz(a.op, 1), nz(b.op, 1), p);
  if (a.bind && b.bind && a.bind.to === b.bind.to && a.bind.bone === b.bind.bone) o.bind = { to: a.bind.to, bone: a.bind.bone, lx: lerp(a.bind.lx, b.bind.lx, p), ly: lerp(a.bind.ly, b.bind.ly, p), lr: lerp(a.bind.lr, b.bind.lr, p) };
  if (a.kind === 'text' && b.kind === 'text') { lerpPaint(o, a, b, p); return o; }
  if (a.kind === 'path' && b.kind === 'path') {
    lerpPaint(o, a, b, p);
    if (a.grad && b.grad && a.grad.type === b.grad.type && a.grad.stops.length === b.grad.stops.length) {
      o.grad = { type: a.grad.type, stops: a.grad.stops.map((s, i) => ({ o: lerp(s.o, b.grad.stops[i].o, p), c: lerpHex(s.c, b.grad.stops[i].c, p), a: lerp(nz(s.a, 1), nz(b.grad.stops[i].a, 1), p) })), m: a.grad.m && b.grad.m ? a.grad.m.map((v, i) => lerp(v, b.grad.m[i], p)) : (a.grad.m || b.grad.m) };
    }
    if (mode === 'shape') { const m = morphContours(a.contours, b.contours, p); if (m) o.contours = m; }
    if (a.rig && b.rig) { o.rig = lerpRig(a.rig, b.rig, p); rigBuild(o); }
  }
  return o;
}
function kfIndexAt(layer, t) {
  let idx = -1;
  for (let i = 0; i < layer.kfs.length; i++) { if (layer.kfs[i].f <= t) idx = i; else break; }
  return idx;
}
function kfAt(layer, f) { return layer.kfs.find((k) => k.f === f) || null; }
function kfFor(layer, f) { const i = kfIndexAt(layer, f); return i < 0 ? null : layer.kfs[i]; }
function withClips(layer, i, t, objs) {
  let any = false;
  for (const o of objs) if (o.kind === 'clip') { any = true; break; }
  if (!any) return objs;
  return objs.map((o) => {
    if (o.kind !== 'clip') return o;
    const lib = _lib[o.sym], n = lib ? lib.frames : 1;
    let start;
    if (o.mc) { let j = i; while (j > 0 && layer.kfs[j - 1].objs.some((x) => x.id === o.id && x.kind === 'clip')) j--; start = layer.kfs[j].f; }
    else start = layer.kfs[i].f;
    /* playback mode and first frame belong to graphic symbols (as in Animate); a movie clip always loops from its first frame */
    const el = Math.max(0, (o.mc && _ctxEl != null ? _ctxEl : t) - start), first = o.mc ? 0 : (o.first || 0), mode = o.mc ? 'loop' : o.mode;
    const f = mode === 'single' ? first : mode === 'once' ? Math.min(first + el, n - 1) : (first + el) % n;
    const c = Object.assign({}, o);
    Object.defineProperty(c, '_f', { value: f, enumerable: false });
    Object.defineProperty(c, '_el', { value: el, enumerable: false });
    return c;
  });
}
/* which object in the next keyframe each object tweens to: same id first; for a shape tween, leftover shapes pair up in drawing order, so drawing a new shape in a blank keyframe still morphs */
function tweenPairs(kf, next) {
  const byId = new Map(next.objs.map((o) => [o.id, o])), pairs = new Map(), used = new Set();
  for (const a of kf.objs) { const b = byId.get(a.id); if (b && b.kind === a.kind) { pairs.set(a, b); used.add(b); } }
  if (kf.tween === 'shape') {
    const free = next.objs.filter((o) => o.kind === 'path' && !used.has(o));
    let q = 0;
    for (const a of kf.objs) if (!pairs.has(a) && a.kind === 'path' && q < free.length) pairs.set(a, free[q++]);
  }
  return pairs;
}
/* how many shapes in a shape tween cannot morph smoothly (different part counts or open/closed mismatch) */
function shapeTweenIssues(layer, f) {
  const i = kfIndexAt(layer, f); if (i < 0) return 0;
  const kf = layer.kfs[i], next = layer.kfs[i + 1]; if (!next) return 0;
  let n = 0;
  for (const [a, b] of tweenPairs(kf, next)) if (a.kind === 'path' && b.kind === 'path' && !morphContours(a.contours, b.contours, 0.5)) n++;
  return n;
}
function evalLayerObjs(layer, t) { return resolveBinds(evalLayerRaw(layer, t)); }
function evalLayerRaw(layer, t) {
  const i = kfIndexAt(layer, t);
  if (i < 0) return [];
  const kf = layer.kfs[i], next = layer.kfs[i + 1];
  if (kf.tween && kf.tween !== 'none' && next && t > kf.f) {
    const p = (t - kf.f) / (next.f - kf.f);
    const e = ease(kf.ease && kf.ease.type, kf.ease && kf.ease.amt, p, kf.ease && kf.ease.p);
    const pairs = tweenPairs(kf, next);
    return withClips(layer, i, t, kf.objs.map((a) => { const b = pairs.get(a); return b ? lerpObj(a, b, e, kf.tween) : a; }));
  }
  return withClips(layer, i, t, kf.objs);
}
const notGhost = (o) => !(o.rig && o.rig.ghost);
/* in the editor a bone arm is always drawn semi-transparent so the artwork under it stays visible; exports draw it as it really is */
const fadeGhost = (o) => (o.rig ? Object.assign({}, o, { op: nz(o.op, 1) * 0.35 }) : o);
function evalDoc(doc, t, ghosts) {
  _lib = doc.lib || {};
  return doc.layers.map((layer) => ({ layer, objs: layer.visible === false ? [] : ghosts ? evalLayerObjs(layer, t).map(fadeGhost) : evalLayerObjs(layer, t).filter(notGhost) }));
}
function sortKfs(layer) { layer.kfs.sort((a, b) => a.f - b.f); }

/* ---------- keyframe editing ---------- */
function ensureEditable(layer, f) {
  const i = kfIndexAt(layer, f);
  if (i < 0) { const k = mkKf(f); layer.kfs.push(k); sortKfs(layer); return k; }
  const kf = layer.kfs[i], next = layer.kfs[i + 1];
  if (kf.f !== f && kf.tween !== 'none' && next) {
    const k = { f, objs: clone(evalLayerObjs(layer, f)), tween: kf.tween, ease: Object.assign({}, kf.ease, kf.ease && kf.ease.p ? { p: kf.ease.p.slice() } : {}) };
    layer.kfs.splice(i + 1, 0, k);
    return k;
  }
  return kf;
}
function insertKeyframe(layer, f, blank) {
  const ex = kfAt(layer, f);
  if (ex) { if (blank) { ex.objs = []; ex.tween = 'none'; } return ex; }
  const cur = kfFor(layer, f);
  const k = mkKf(f, blank ? [] : clone(evalLayerObjs(layer, f)));
  if (cur && cur.tween !== 'none' && !blank) {
    const next = layer.kfs[layer.kfs.indexOf(cur) + 1];
    if (next) { k.tween = cur.tween; k.ease = Object.assign({}, cur.ease, cur.ease && cur.ease.p ? { p: cur.ease.p.slice() } : {}); }
  }
  layer.kfs.push(k); sortKfs(layer);
  return k;
}
function insertFrames(layer, f, n, doc) {
  for (const k of layer.kfs) if (k.f > f) k.f += n;
  doc.frames += n;
}
function removeFrames(layer, f, n, doc) {
  layer.kfs = layer.kfs.filter((k) => k.f === 0 || k.f < f || k.f >= f + n);
  for (const k of layer.kfs) if (k.f >= f + n) k.f -= n;
  const mx = Math.max(...doc.layers.map((l) => l.kfs[l.kfs.length - 1].f)) + 1;
  doc.frames = Math.max(mx, doc.frames - n, 1);
}
function clearKeyframe(layer, f) {
  const k = kfAt(layer, f);
  if (!k || f === 0) return false;
  layer.kfs.splice(layer.kfs.indexOf(k), 1);
  return true;
}
function moveKeyframe(layer, from, to) {
  const k = kfAt(layer, from);
  if (!k || from === 0 || to <= 0 || kfAt(layer, to)) return false;
  k.f = to; sortKfs(layer);
  return true;
}
/* frame ranges: reverse the order of the keyframes inside frames a..b, or slide a block of keyframes together */
function reverseFrames(layers, a, b, doc) {
  b = Math.min(b, doc.frames - 1);
  if (!(b > a)) return 0;
  let n = 0;
  for (const layer of layers) {
    if (a > 0) insertKeyframe(layer, a, false);
    if (b + 1 < doc.frames) insertKeyframe(layer, b + 1, false);
    const ps = layer.kfs.filter((k) => k.f >= a && k.f <= b);
    if (ps.length < 1) continue;
    const old = ps.map((k) => ({ t: k.tween || 'none', e: k.ease }));
    ps.forEach((k, i) => { const nx = ps[i + 1]; k.nf = a + b + 1 - (nx ? nx.f : b + 1); });
    ps.forEach((k, i) => { k.f = k.nf; delete k.nf; k.tween = i ? old[i - 1].t : 'none'; if (i && old[i - 1].e) k.ease = old[i - 1].e; });
    sortKfs(layer); n++;
  }
  return n;
}
function moveKeyframes(layers, a, b, delta, doc, only) {
  if (!delta) return true;
  const plan = [];
  let top = 0;
  for (const layer of layers) {
    const mv = layer.kfs.filter((k) => k.f > 0 && (only ? only.has(k) : k.f >= a && k.f <= b));
    if (!mv.length) continue;
    const stay = new Set(layer.kfs.filter((k) => !mv.includes(k)).map((k) => k.f));
    for (const k of mv) { const t = k.f + delta; if (t < 1 || stay.has(t)) return false; top = Math.max(top, t); }
    plan.push([layer, mv]);
  }
  if (!plan.length || top + 1 > 900) return false;
  for (const [layer, mv] of plan) { for (const k of mv) k.f += delta; sortKfs(layer); }
  if (top + 1 > doc.frames) doc.frames = top + 1;
  return true;
}
/* returns {ok, msg} ; creates an end keyframe at the last doc frame when none follows */
function setTweenAt(doc, layer, f, type) {
  const i = kfIndexAt(layer, f);
  if (i < 0) return { ok: false, msg: 'No keyframe here.' };
  const kf = layer.kfs[i];
  if (type === 'none') { kf.tween = 'none'; return { ok: true }; }
  let next = layer.kfs[i + 1];
  let msg = '';
  if (!next) {
    const last = doc.frames - 1;
    if (last <= kf.f) return { ok: false, msg: 'Add frames after this keyframe first.' };
    next = mkKf(last, clone(kf.objs));
    layer.kfs.push(next); sortKfs(layer);
    msg = 'Added an end keyframe at frame ' + (last + 1) + '.';
  }
  kf.tween = type;
  return { ok: true, msg };
}

/* ---------- drawing ---------- */
/* draw `draw` into a scratch canvas and composite it once at alpha `a`, so overlapping parts of one object fade together like a single layer (as in Animate and in the SVG export).
   `rect` (device pixels) limits the scratch work to where the object can paint; without it the whole canvas is used. */
function groupAlpha(ctx, a, draw, rect) {
  if (a >= 0.999) { draw(ctx); return; }
  if (a <= 0.001) return;
  const cv = ctx.canvas, w = cv.width, h = cv.height, d = _md++;
  try {
    if (!_mt[d * 2]) _mt[d * 2] = document.createElement('canvas');
    const c = _mt[d * 2];
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    const r = rect || { x: 0, y: 0, w, h };
    const cc = c.getContext('2d');
    cc.setTransform(1, 0, 0, 1, 0, 0); cc.globalCompositeOperation = 'source-over'; cc.globalAlpha = 1; cc.clearRect(r.x, r.y, r.w, r.h);
    cc.setTransform(ctx.getTransform());
    draw(cc);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha *= a; ctx.drawImage(c, r.x, r.y, r.w, r.h, r.x, r.y, r.w, r.h); ctx.restore();
  } finally { _md--; }
}
/* extra room (in the object's own units) its strokes and glyphs can paint beyond its bounds */
function paintPad(o) {
  if (o.kind === 'path') return o.stroke && o.sw > 0 ? o.sw * 1.5 : 0;
  if (o.kind === 'text') return Math.max(8, ...((o.runs || []).map((r) => (r.size || 16) * 0.5)));
  if (o.kind === 'group' || o.kind === 'clip') {
    let m = 0;
    for (const ch of kidsOf(o)) m = Math.max(m, paintPad(ch) * Math.max(1, Math.abs(ch.t.sx), Math.abs(ch.t.sy)));
    return m;
  }
  return 0;
}
function deviceRect(ctx, o) {
  const b = localBounds(o);
  if (!b) return null;
  const T = ctx.getTransform(), m = matOf(o.t);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of [[b.x0, b.y0], [b.x1, b.y0], [b.x1, b.y1], [b.x0, b.y1]]) {
    const q = mapply(m, x, y), p = T.transformPoint({ x: q[0], y: q[1] });
    x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y);
  }
  const sc = Math.max(Math.hypot(T.a, T.b), Math.hypot(T.c, T.d), 1) * Math.max(1, Math.abs(o.t.sx), Math.abs(o.t.sy));
  const pad = paintPad(o) * sc + 3;
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  x0 = Math.max(0, Math.floor(x0 - pad)); y0 = Math.max(0, Math.floor(y0 - pad)); x1 = Math.min(cw, Math.ceil(x1 + pad)); y1 = Math.min(ch, Math.ceil(y1 + pad));
  return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : { x: 0, y: 0, w: 0, h: 0 };
}
function drawObj(ctx, o, opt) {
  const op = nz(o.op, 1);
  const multi = o.kind === 'group' || o.kind === 'clip' || (o.kind !== 'text' && o.kind !== 'image' && o.fill && o.stroke && o.sw > 0);
  if (op < 0.999 && multi) {
    const r = deviceRect(ctx, o);
    if (r && (r.w <= 0 || r.h <= 0)) return; /* entirely off canvas */
    groupAlpha(ctx, op, (c) => drawObjRaw(c, o, opt, true), r || undefined);
    return;
  }
  drawObjRaw(ctx, o, opt, false);
}
function drawObjRaw(ctx, o, opt, noOp) {
  opt = opt || {};
  ctx.save();
  const m = matOf(o.t);
  ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
  if (!noOp) ctx.globalAlpha *= nz(o.op, 1);
  if (o.kind === 'group' || o.kind === 'clip') {
    if (o.kind === 'clip' && o.pv) ctx.translate(-o.pv[0], -o.pv[1]);
    if (o.mask) maskedDraw(ctx, (c) => { for (const ch of o.children) drawObj(c, ch, opt); }, (c) => { for (const m of o.mask) drawObj(c, m, {}); });
    else for (const ch of kidsOf(o)) drawObj(ctx, ch, opt);
  } else if (o.kind === 'image') {
    const el = imgEl(o.img);
    if (el) { if (opt.tint) ctx.globalAlpha *= Math.min(0.5, opt.tint.a * 1.5); ctx.drawImage(el, 0, 0, o.w, o.h); }
    else if (!_images[o.img]) { ctx.fillStyle = 'rgba(128,128,128,.25)'; ctx.fillRect(0, 0, o.w, o.h); }
  } else if (o.kind === 'text') {
    const lay = layoutText(o);
    ctx.textBaseline = 'top';
    if ('letterSpacing' in ctx) ctx.letterSpacing = (o.ls || 0) + 'px';
    for (const l of lay.lines) {
      let x = l.x;
      for (const sg of l.segs) {
        ctx.font = fontStr(sg.r);
        ctx.fillStyle = opt.tint ? rgba(opt.tint.c, opt.tint.a) : rgba(sg.r.c || o.fill || '#000000', nz(o.fa, 1));
        ctx.fillText(sg.t, x, l.y); x += sg.w;
      }
    }
  } else {
    const p = new Path2D();
    tracePath(p, o.contours);
    if (o.fill) {
      const g = o.grad;
      if (g && !opt.tint && Math.abs(g.m[0] * g.m[3] - g.m[1] * g.m[2]) > 1e-12) {
        ctx.save();
        ctx.clip(p, o.nz ? 'nonzero' : 'evenodd');
        ctx.transform(g.m[0], g.m[1], g.m[2], g.m[3], g.m[4], g.m[5]);
        const gr = g.type === 'radial' ? ctx.createRadialGradient(0, 0, 0, 0, 0, 819.2) : ctx.createLinearGradient(-819.2, 0, 819.2, 0);
        for (const st of g.stops) gr.addColorStop(clamp(st.o, 0, 1), rgba(st.c, st.a * nz(o.fa, 1)));
        ctx.fillStyle = gr;
        ctx.fillRect(-1e6, -1e6, 2e6, 2e6);
        ctx.restore();
      } else {
        ctx.fillStyle = opt.tint ? rgba(opt.tint.c, opt.tint.a * nz(o.fa, 1)) : rgba(o.fill, nz(o.fa, 1));
        ctx.fill(p, o.nz ? 'nonzero' : 'evenodd');
      }
    }
    if (o.stroke && o.sw > 0) {
      ctx.strokeStyle = opt.tint ? rgba(opt.tint.c, opt.tint.a * nz(o.sa, 1)) : rgba(o.stroke, nz(o.sa, 1));
      ctx.lineWidth = o.sw; ctx.lineCap = o.cap || 'round'; ctx.lineJoin = o.join || 'round';
      ctx.stroke(p);
    }
  }
  ctx.restore();
}
function hitObj(o, x, y, tol, hctx, anyAlpha) {
  const m = minv(matOf(o.t));
  const p = mapply(m, x, y);
  const sc = Math.max(Math.abs(o.t.sx), Math.abs(o.t.sy), 1e-6);
  const lt = tol / sc;
  if (o.kind === 'group' || o.kind === 'clip') {
    if (o.kind === 'clip' && o.pv) { p[0] += o.pv[0]; p[1] += o.pv[1]; }
    const kids = kidsOf(o);
    for (let i = kids.length - 1; i >= 0; i--) if (hitObj(kids[i], p[0], p[1], lt, hctx, anyAlpha)) return true;
    return false;
  }
  if (o.kind === 'text' || o.kind === 'image') {
    const b = localBounds(o);
    return !!b && p[0] >= b.x0 - lt && p[0] <= b.x1 + lt && p[1] >= b.y0 - lt && p[1] <= b.y1 + lt;
  }
  const path = new Path2D();
  tracePath(path, o.contours);
  if (o.fill && (anyAlpha || nz(o.fa, 1) > 0.02) && hctx.isPointInPath(path, p[0], p[1], o.nz ? 'nonzero' : 'evenodd')) return true;
  hctx.lineWidth = (o.stroke ? (o.sw || 0) : 0) + 2 * lt;
  return hctx.isPointInStroke(path, p[0], p[1]);
}

/* ---------- SVG ---------- */
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
let _gid = 0;
function svgMasked(maskObjs, inner) {
  const id = 'm' + (++_gid);
  return '<mask id="' + id + '" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="-100000" y="-100000" width="200000" height="200000">' + maskObjs.map(objSVG).join('') + '</mask><g mask="url(#' + id + ')">' + inner + '</g>';
}
function layersSVG(entries) {
  let body = '';
  for (const u of groupEntries(entries)) {
    if (!u.mask) { for (const o of u.e.objs) body += objSVG(o); continue; }
    let inner = ''; for (const m of u.members) for (const o of m.objs) inner += objSVG(o);
    body += svgMasked(u.mask.objs, inner);
  }
  return body;
}
function objSVG(o) {
  const m = matOf(o.t), tr = 'matrix(' + m.map((n) => +n.toFixed(5)).join(' ') + ')', op = nz(o.op, 1);
  const opa = op < 1 ? ' opacity="' + +op.toFixed(3) + '"' : '';
  if (o.kind === 'group') { const inner = o.children.map(objSVG).join(''); return '<g transform="' + tr + '"' + opa + '>' + (o.mask ? svgMasked(o.mask, inner) : inner) + '</g>'; }
  if (o.kind === 'clip') {
    const pv = o.pv ? '<g transform="translate(' + -o.pv[0] + ' ' + -o.pv[1] + ')">' : '<g>';
    return '<g transform="' + tr + '"' + opa + '>' + pv + kidsOf(o).map(objSVG).join('') + '</g></g>';
  }
  if (o.kind === 'image') {
    const rec = _images[o.img];
    return rec && rec.b64 ? '<image transform="' + tr + '" width="' + +(o.w || 0).toFixed(2) + '" height="' + +(o.h || 0).toFixed(2) + '" preserveAspectRatio="none"' + opa + ' xlink:href="data:' + rec.mime + ';base64,' + rec.b64 + '"/>' : '';
  }
  if (o.kind === 'text') {
    const lay = layoutText(o);
    let out = '<g transform="' + tr + '"' + opa + '>';
    for (const l of lay.lines) {
      let x = l.x;
      for (const sg of l.segs) {
        const r = sg.r;
        const drop = baselineDrop(r);
        out += '<text x="' + +x.toFixed(2) + '" y="' + +(drop == null ? l.y : l.y + drop).toFixed(2) + '"' + (drop == null ? ' dominant-baseline="text-before-edge"' : '') + ' xml:space="preserve" font-family="' + esc(r.font || 'Arial') + ', Helvetica, sans-serif" font-size="' + (r.size || 16) + '"' + (r.b ? ' font-weight="bold"' : '') + (r.i ? ' font-style="italic"' : '') + ' fill="' + esc(r.c || o.fill || '#000000') + '" fill-opacity="' + +nz(o.fa, 1).toFixed(3) + '">' + String(sg.t).replace(/&/g, '&amp;').replace(/</g, '&lt;') + '</text>';
        x += sg.w;
      }
    }
    return out + '</g>';
  }
  let defs = '', fillAttr;
  if (o.fill && o.grad) {
    const id = 'g' + (++_gid), g = o.grad;
    const stops = g.stops.map((st) => '<stop offset="' + +st.o.toFixed(4) + '" stop-color="' + esc(st.c) + '" stop-opacity="' + +(st.a * nz(o.fa, 1)).toFixed(3) + '"/>').join('');
    defs = g.type === 'radial'
      ? '<radialGradient id="' + id + '" gradientUnits="userSpaceOnUse" cx="0" cy="0" r="819.2" gradientTransform="matrix(' + g.m.map((n) => +n.toFixed(6)).join(' ') + ')">' + stops + '</radialGradient>'
      : '<linearGradient id="' + id + '" gradientUnits="userSpaceOnUse" x1="-819.2" y1="0" x2="819.2" y2="0" gradientTransform="matrix(' + g.m.map((n) => +n.toFixed(6)).join(' ') + ')">' + stops + '</linearGradient>';
    defs = '<defs>' + defs + '</defs>';
    fillAttr = 'fill="url(#' + id + ')" fill-rule="' + (o.nz ? 'nonzero' : 'evenodd') + '"';
  } else fillAttr = o.fill ? 'fill="' + esc(o.fill) + '" fill-opacity="' + +nz(o.fa, 1).toFixed(3) + '" fill-rule="' + (o.nz ? 'nonzero' : 'evenodd') + '"' : 'fill="none"';
  const stroke = o.stroke && o.sw > 0 ? ' stroke="' + esc(o.stroke) + '" stroke-opacity="' + +nz(o.sa, 1).toFixed(3) + '" stroke-width="' + +o.sw.toFixed(3) + '" stroke-linecap="' + (o.cap || 'round') + '" stroke-linejoin="' + (o.join || 'round') + '"' : '';
  return defs + '<path transform="' + tr + '" d="' + pathD(o.contours) + '" ' + fillAttr + stroke + opa + '/>';
}
function frameSVG(doc, t) {
  _gid = 0;
  let body = '';
  body = layersSVG(evalDoc(doc, t));
  return '<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + doc.w + '" height="' + doc.h + '" viewBox="0 0 ' + doc.w + ' ' + doc.h + '">\n' + (doc.bg && doc.bg !== 'transparent' ? '<rect width="100%" height="100%" fill="' + esc(doc.bg) + '"/>\n' : '') + body + '\n</svg>\n';
}

/* ---------- GIF encoder ---------- */
function quantize(rgba, n, maxC) {
  maxC = Math.max(2, Math.min(256, maxC | 0 || 256));
  const hist = new Map();
  for (let i = 0; i < n; i++) {
    const k = (rgba[i * 4] << 16) | (rgba[i * 4 + 1] << 8) | rgba[i * 4 + 2];
    hist.set(k, (hist.get(k) || 0) + 1);
  }
  const keys = Array.from(hist.keys());
  const palette = new Uint8Array(256 * 3);
  const lut = new Map();
  let count = 0;
  if (keys.length <= maxC) {
    count = keys.length;
    keys.forEach((k, i) => { palette[i * 3] = k >> 16; palette[i * 3 + 1] = (k >> 8) & 255; palette[i * 3 + 2] = k & 255; lut.set(k, i); });
  } else {
    // median cut on 15-bit reduced colours
    const red = new Map();
    for (const [k, c] of hist) {
      const r = k >> 16, g = (k >> 8) & 255, b = k & 255;
      const rk = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      let e = red.get(rk);
      if (!e) { e = { rk, c: 0, r: 0, g: 0, b: 0 }; red.set(rk, e); }
      e.c += c; e.r += r * c; e.g += g * c; e.b += b * c;
    }
    const items = Array.from(red.values());
    const boxes = [items];
    const range = (box) => {
      let rl = 255, rh = 0, gl = 255, gh = 0, bl = 255, bh = 0;
      for (const e of box) {
        const r = e.r / e.c, g = e.g / e.c, b = e.b / e.c;
        if (r < rl) rl = r; if (r > rh) rh = r; if (g < gl) gl = g; if (g > gh) gh = g; if (b < bl) bl = b; if (b > bh) bh = b;
      }
      return [rh - rl, gh - gl, bh - bl];
    };
    while (boxes.length < maxC) {
      let bi = -1, bs = 0, bch = 0;
      for (let i = 0; i < boxes.length; i++) {
        if (boxes[i].length < 2) continue;
        const rg = range(boxes[i]);
        const mx = Math.max(rg[0], rg[1], rg[2]);
        if (mx > bs) { bs = mx; bi = i; bch = rg.indexOf(mx); }
      }
      if (bi < 0) break;
      const box = boxes[bi];
      const key = bch === 0 ? (e) => e.r / e.c : bch === 1 ? (e) => e.g / e.c : (e) => e.b / e.c;
      box.sort((a, b) => key(a) - key(b));
      let tot = 0; for (const e of box) tot += e.c;
      let acc = 0, cut = 1;
      for (let i = 0; i < box.length - 1; i++) { acc += box[i].c; if (acc >= tot / 2) { cut = i + 1; break; } cut = i + 1; }
      boxes.splice(bi, 1, box.slice(0, cut), box.slice(cut));
    }
    count = boxes.length;
    const rkIndex = new Map();
    boxes.forEach((box, i) => {
      let c = 0, r = 0, g = 0, b = 0;
      for (const e of box) { c += e.c; r += e.r; g += e.g; b += e.b; rkIndex.set(e.rk, i); }
      palette[i * 3] = Math.round(r / c); palette[i * 3 + 1] = Math.round(g / c); palette[i * 3 + 2] = Math.round(b / c);
    });
    for (const k of keys) {
      const r = k >> 16, g = (k >> 8) & 255, b = k & 255;
      lut.set(k, rkIndex.get(((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3)));
    }
  }
  const idx = new Uint8Array(n);
  for (let i = 0; i < n; i++) idx[i] = lut.get((rgba[i * 4] << 16) | (rgba[i * 4 + 1] << 8) | rgba[i * 4 + 2]);
  return { palette, idx, count };
}
/* remap pixels to a palette with dithering: mode 'diffusion' (Floyd-Steinberg) or 'pattern' (ordered 4x4); skip = mask of transparent pixels */
function remapDither(rgba, w, h, q, mode, amt, skip) {
  const pal = q.palette, cnt = q.count, cache = new Int16Array(32768).fill(-1), idx = new Uint8Array(w * h);
  const near = (r, g, b) => {
    r = r < 0 ? 0 : r > 255 ? 255 : r | 0; g = g < 0 ? 0 : g > 255 ? 255 : g | 0; b = b < 0 ? 0 : b > 255 ? 255 : b | 0;
    const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
    let v = cache[k]; if (v >= 0) return v;
    let best = 0, bd = 1e9;
    for (let i = 0; i < cnt; i++) { const dr = pal[i * 3] - r, dg = pal[i * 3 + 1] - g, db = pal[i * 3 + 2] - b, d = dr * dr * 3 + dg * dg * 4 + db * db * 2; if (d < bd) { bd = d; best = i; } }
    cache[k] = best; return best;
  };
  if (mode === 'pattern') {
    const M = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const p = y * w + x; if (skip && skip[p]) continue;
      const o = ((M[(y & 3) * 4 + (x & 3)] + 0.5) / 16 - 0.5) * 72 * amt;
      idx[p] = near(rgba[p * 4] + o, rgba[p * 4 + 1] + o, rgba[p * 4 + 2] + o);
    }
    return idx;
  }
  const buf = new Float32Array(w * h * 3);
  for (let i = 0; i < w * h; i++) { buf[i * 3] = rgba[i * 4]; buf[i * 3 + 1] = rgba[i * 4 + 1]; buf[i * 3 + 2] = rgba[i * 4 + 2]; }
  const spread = (p, er, eg, eb, f) => { buf[p * 3] += er * f; buf[p * 3 + 1] += eg * f; buf[p * 3 + 2] += eb * f; };
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const p = y * w + x; if (skip && skip[p]) continue;
    const r = buf[p * 3], g = buf[p * 3 + 1], b = buf[p * 3 + 2], i = near(r, g, b);
    idx[p] = i;
    const er = (r - pal[i * 3]) * amt, eg = (g - pal[i * 3 + 1]) * amt, eb = (b - pal[i * 3 + 2]) * amt;
    if (x + 1 < w) spread(p + 1, er, eg, eb, 7 / 16);
    if (y + 1 < h) { if (x > 0) spread(p + w - 1, er, eg, eb, 3 / 16); spread(p + w, er, eg, eb, 5 / 16); if (x + 1 < w) spread(p + w + 1, er, eg, eb, 1 / 16); }
  }
  return idx;
}
function lzw(indices, minCode) {
  const clear = 1 << minCode, eoi = clear + 1;
  let codeSize = minCode + 1, next = eoi + 1;
  const out = [];
  let cur = 0, bits = 0;
  const emit = (code) => {
    cur |= code << bits; bits += codeSize;
    while (bits >= 8) { out.push(cur & 255); cur >>>= 8; bits -= 8; }
  };
  let dict = new Map();
  emit(clear);
  let prefix = indices[0];
  for (let i = 1; i < indices.length; i++) {
    const k = indices[i], key = (prefix << 8) | k;
    const found = dict.get(key);
    if (found === undefined) {
      emit(prefix);
      if (next === 4096) {
        emit(clear); dict = new Map(); next = eoi + 1; codeSize = minCode + 1;
      } else {
        if (next >= (1 << codeSize)) codeSize++;
        dict.set(key, next++);
      }
      prefix = k;
    } else prefix = found;
  }
  emit(prefix); emit(eoi);
  if (bits > 0) out.push(cur & 255);
  return out;
}
/* GifWriter: header(w,h,loops) -> addFrame(rgba, delayCs) -> finish() */
function gifWriter(w, h, o) {
  if (typeof o !== 'object' || o === null) o = { loop: o ? 0 : -1 };
  const loop = o.loop == null ? 0 : o.loop, maxC = Math.max(2, Math.min(256, o.colors | 0 || 256)), tr = !!o.transparent;
  const matte = o.matte || [255, 255, 255], dith = o.dither || 'none', amt = o.ditherAmt == null ? 1 : o.ditherAmt;
  const bytes = [];
  const push = (...a) => { for (const v of a) bytes.push(v); };
  const w16 = (v) => push(v & 255, (v >> 8) & 255);
  push(0x47, 0x49, 0x46, 0x38, 0x39, 0x61); w16(w); w16(h); push(0x00, 0, 0);
  if (loop >= 0) { push(0x21, 0xff, 0x0b, 0x4e, 0x45, 0x54, 0x53, 0x43, 0x41, 0x50, 0x45, 0x32, 0x2e, 0x30, 3, 1); w16(loop); push(0); }
  return {
    addFrame(rgbaData, delayCs) {
      const n = w * h;
      let src = rgbaData, skip = null;
      if (tr) {
        src = new Uint8ClampedArray(rgbaData); skip = new Uint8Array(n);
        for (let i = 0; i < n; i++) {
          const a = src[i * 4 + 3];
          if (a < 128) { skip[i] = 1; src[i * 4] = matte[0]; src[i * 4 + 1] = matte[1]; src[i * 4 + 2] = matte[2]; }
          else if (a < 255) for (let c = 0; c < 3; c++) src[i * 4 + c] = Math.round((src[i * 4 + c] * a + matte[c] * (255 - a)) / 255);
        }
      }
      const q = quantize(src, n, tr ? maxC - 1 : maxC);
      const idx = dith === 'none' || q.count <= 1 ? q.idx : remapDither(src, w, h, q, dith, amt, skip);
      let ti = -1;
      if (tr) { ti = q.count; for (let i = 0; i < n; i++) if (skip[i]) idx[i] = ti; }
      const total = q.count + (tr ? 1 : 0);
      let bits = 1; while ((1 << bits) < total) bits++;
      push(0x21, 0xf9, 4, tr ? 0x09 : 0x04, delayCs & 255, (delayCs >> 8) & 255, tr ? ti : 0, 0);
      push(0x2c); w16(0); w16(0); w16(w); w16(h); push(0x80 | (bits - 1));
      for (let i = 0; i < (1 << bits) * 3; i++) bytes.push(i < q.count * 3 ? q.palette[i] : 0);
      const minCode = Math.max(2, bits);
      push(minCode);
      const data = lzw(idx, minCode);
      for (let i = 0; i < data.length; i += 255) {
        const len = Math.min(255, data.length - i);
        bytes.push(len);
        for (let j = 0; j < len; j++) bytes.push(data[i + j]);
      }
      bytes.push(0);
    },
    finish() { bytes.push(0x3b); return new Uint8Array(bytes); }
  };
}

/* ---------- FLA / XFL import ---------- */
function parseNum(s) {
  if (s[0] === '#') {
    const parts = s.slice(1).split('.');
    let ip = parseInt(parts[0], 16);
    const nd = parts[0].length;
    if (nd >= 6 && ip >= Math.pow(2, nd * 4 - 1)) ip -= Math.pow(2, nd * 4);
    const frac = parts[1] ? parseInt(parts[1], 16) / Math.pow(16, parts[1].length) : 0;
    return ip + frac;
  }
  return parseFloat(s);
}
function parseEdges(str) {
  const chains = [];
  str = str.replace(/S\d+/g, '');
  const re = /([!|\/\[\]])([^!|\/\[\]]*)/g;
  let m, cur = null, px = 0, py = 0;
  while ((m = re.exec(str))) {
    const cmd = m[1];
    const nums = m[2].trim().split(/\s+/).filter(Boolean).map(parseNum);
    if (cmd === '!') { px = nums[0]; py = nums[1]; cur = []; chains.push(cur); }
    else if ((cmd === '|' || cmd === '/') && nums.length >= 2) { cur.push({ x0: px, y0: py, x1: nums[0], y1: nums[1] }); px = nums[0]; py = nums[1]; }
    else if ((cmd === '[' || cmd === ']') && nums.length >= 4) { cur.push({ x0: px, y0: py, cx: nums[0], cy: nums[1], x1: nums[2], y1: nums[3] }); px = nums[2]; py = nums[3]; }
  }
  return chains.filter((c) => c.length);
}
const skey = (x, y) => x.toFixed(2) + '|' + y.toFixed(2);
function assembleLoops(segs) {
  const map = new Map();
  segs.forEach((s, i) => { const k = skey(s.x0, s.y0); let a = map.get(k); if (!a) { a = []; map.set(k, a); } a.push(i); });
  const used = new Uint8Array(segs.length), loops = [];
  for (let i = 0; i < segs.length; i++) {
    if (used[i]) continue;
    used[i] = 1;
    const loop = [segs[i]];
    const startKey = skey(segs[i].x0, segs[i].y0);
    let end = skey(segs[i].x1, segs[i].y1);
    while (end !== startKey) {
      const cand = map.get(end);
      let nx = -1;
      if (cand) for (const j of cand) if (!used[j]) { nx = j; break; }
      if (nx < 0) break;
      used[nx] = 1; loop.push(segs[nx]); end = skey(segs[nx].x1, segs[nx].y1);
    }
    loops.push({ segs: loop, closed: end === startKey });
  }
  return loops;
}
/* segments (twips) -> contour (px) with cubic handles */
function segsToContour(segs, closed, scale) {
  const nodes = [];
  const cn = (s) => ({ x: s.x0 * scale, y: s.y0 * scale, ix: 0, iy: 0, ox: 0, oy: 0 });
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const n = cn(s);
    nodes.push(n);
    if (s.cx !== undefined) {
      const c1x = s.x0 + 2 / 3 * (s.cx - s.x0), c1y = s.y0 + 2 / 3 * (s.cy - s.y0);
      const c2x = s.x1 + 2 / 3 * (s.cx - s.x1), c2y = s.y1 + 2 / 3 * (s.cy - s.y1);
      n.ox = (c1x - s.x0) * scale; n.oy = (c1y - s.y0) * scale;
      s._in = [(c2x - s.x1) * scale, (c2y - s.y1) * scale];
    }
  }
  const last = segs[segs.length - 1];
  if (!closed) nodes.push({ x: last.x1 * scale, y: last.y1 * scale, ix: 0, iy: 0, ox: 0, oy: 0 });
  for (let i = 0; i < segs.length; i++) {
    const tgt = nodes[(i + 1) % nodes.length];
    if (segs[i]._in) { tgt.ix = segs[i]._in[0]; tgt.iy = segs[i]._in[1]; }
  }
  return { closed, nodes };
}
function xmlKids(el, name) {
  const out = [];
  if (!el) return out;
  for (const c of Array.from(el.children)) if (c.localName === name) out.push(c);
  return out;
}
function xmlKid(el, name) { return xmlKids(el, name)[0] || null; }
function attr(el, name, d) { const v = el && el.getAttribute(name); return v == null || v === '' ? d : v; }
function parseMatrixEl(el) {
  const M = el && xmlKid(xmlKid(el, 'matrix'), 'Matrix') || (el && el.localName === 'Matrix' ? el : null);
  if (!M) return [1, 0, 0, 1, 0, 0];
  return [+attr(M, 'a', 1), +attr(M, 'b', 0), +attr(M, 'c', 0), +attr(M, 'd', 1), +attr(M, 'tx', 0), +attr(M, 'ty', 0)];
}
function colorOf(el, rep) {
  if (!el) return { c: '#000000', a: 1 };
  const sc = el.localName === 'SolidColor' ? el : xmlKid(el, 'SolidColor');
  if (sc) return { c: attr(sc, 'color', '#000000').toUpperCase(), a: +attr(sc, 'alpha', 1) };
  const ents = xmlKids(el, 'GradientEntry');
  if (ents.length) {
    rep.gradient++;
    const stops = ents.map((e, i) => ({ o: clamp(+attr(e, 'ratio', i / Math.max(1, ents.length - 1)), 0, 1), c: attr(e, 'color', '#000000').toUpperCase(), a: +attr(e, 'alpha', 1) })).sort((x, y) => x.o - y.o);
    let r = 0, g = 0, bl = 0, al = 0;
    for (const st of stops) { const c = hexToRgb(st.c); r += c[0]; g += c[1]; bl += c[2]; al += st.a; }
    const n = stops.length;
    const out = { c: rgbToHex(r / n, g / n, bl / n), a: al / n };
    const m = parseMatrixEl(el);
    if (Math.abs(m[0] * m[3] - m[1] * m[2]) > 1e-12) out.grad = { type: el.localName === 'RadialGradient' ? 'radial' : 'linear', stops, m };
    return out;
  }
  if (el.localName === 'BitmapFill') { rep.bitmap++; return { c: '#999999', a: 1 }; }
  return { c: '#000000', a: 1 };
}
function importShape(el, idBase, rep) {
  const fills = new Map(), strokes = new Map();
  const fe = xmlKid(el, 'fills');
  for (const fs of xmlKids(fe, 'FillStyle')) fills.set(+attr(fs, 'index', 1), colorOf(fs.firstElementChild, rep));
  const se = xmlKid(el, 'strokes');
  for (const ss of xmlKids(se, 'StrokeStyle')) {
    const sol = ss.firstElementChild;
    if (!sol) continue;
    const fillEl = xmlKid(sol, 'fill');
    const col = colorOf(fillEl ? fillEl.firstElementChild : null, rep);
    const caps = attr(sol, 'caps', 'round'), joints = attr(sol, 'joints', 'round');
    strokes.set(+attr(ss, 'index', 1), { c: col.c, a: col.a, w: Math.max(+attr(sol, 'weight', 1), 0.25), cap: caps === 'none' ? 'butt' : caps, join: joints === 'miter' ? 'miter' : joints === 'bevel' ? 'bevel' : 'round' });
  }
  const fillSegs = new Map(), strokeContours = new Map();
  const ee = xmlKid(el, 'edges');
  for (const ed of xmlKids(ee, 'Edge')) {
    const s = attr(ed, 'edges', '');
    if (!s) continue;
    const chains = parseEdges(s);
    const f0 = +attr(ed, 'fillStyle0', 0), f1 = +attr(ed, 'fillStyle1', 0), st = +attr(ed, 'strokeStyle', 0);
    for (const ch of chains) {
      if (f1) { const a = fillSegs.get(f1) || []; fillSegs.set(f1, a); for (const sg of ch) a.push(Object.assign({}, sg)); }
      if (f0) {
        const a = fillSegs.get(f0) || []; fillSegs.set(f0, a);
        for (let i = ch.length - 1; i >= 0; i--) { const sg = ch[i]; a.push({ x0: sg.x1, y0: sg.y1, x1: sg.x0, y1: sg.y0, cx: sg.cx, cy: sg.cy }); }
      }
      if (st && strokes.has(st)) {
        const a = strokeContours.get(st) || []; strokeContours.set(st, a);
        const closed = skey(ch[0].x0, ch[0].y0) === skey(ch[ch.length - 1].x1, ch[ch.length - 1].y1) && ch.length > 1;
        a.push(segsToContour(ch.map((x) => Object.assign({}, x)), closed, 0.05));
      }
    }
  }
  const mat = parseMatrixEl(el);
  const out = [];
  const idents = Math.abs(mat[0] - 1) + Math.abs(mat[3] - 1) + Math.abs(mat[1]) + Math.abs(mat[2]) + Math.abs(mat[4]) + Math.abs(mat[5]) < 1e-9;
  const fin = (o) => { if (!idents) setObjMatrix(o, mat); recenter(o); out.push(o); };
  for (const k of Array.from(fillSegs.keys()).sort((a, b) => a - b)) {
    const st = fills.get(k);
    if (!st) continue;
    const loops = assembleLoops(fillSegs.get(k));
    const contours = loops.filter((l) => l.segs.length >= 2).map((l) => segsToContour(l.segs, true, 0.05));
    if (!contours.length) continue;
    const o = mkPath(contours, { fill: st.c, fa: st.a, stroke: null });
    if (st.grad) o.grad = { type: st.grad.type, stops: clone(st.grad.stops), m: st.grad.m.slice() };
    o.id = idBase + '-f' + k;
    fin(o);
  }
  for (const k of Array.from(strokeContours.keys()).sort((a, b) => a - b)) {
    const st = strokes.get(k);
    const contours = strokeContours.get(k).filter((c) => c.nodes.length >= 2);
    if (!contours.length) continue;
    const o = mkPath(contours, { fill: null, stroke: st.c, sa: st.a, sw: st.w, cap: st.cap, join: st.join });
    o.id = idBase + '-s' + k;
    fin(o);
  }
  return out;
}
function importElements(els, ctx, depth, idBase) {
  const out = [];
  let ei = 0;
  for (const el of els) {
    const id = idBase + '-' + ei++;
    const nm = el.localName;
    if (nm === 'DOMShape') out.push(...importShape(el, id, ctx.rep));
    else if (nm === 'DOMGroup') {
      const mem = xmlKid(el, 'members');
      const kids = importElements(mem ? Array.from(mem.children) : [], ctx, depth, id);
      if (kids.length) { const g = { id, kind: 'group', children: kids, op: 1, t: newT() }; setObjMatrix(g, parseMatrixEl(el)); out.push(g); }
    } else if (nm === 'DOMSymbolInstance') {
      const g = importInstance(el, ctx, depth, id);
      if (g) out.push(g);
    } else if (nm === 'DOMBitmapInstance') {
      const bm = ctx.bitmaps && ctx.bitmaps[attr(el, 'libraryItemName', '')];
      if (bm) { const g = { id, kind: 'image', img: bm.key, w: bm.w, h: bm.h, op: 1, t: newT() }; setObjMatrix(g, parseMatrixEl(el)); out.push(g); ctx.rep.images++; }
      else ctx.rep.bitmapMissing++;
    }
    else if (nm === 'DOMStaticText' || nm === 'DOMDynamicText' || nm === 'DOMInputText') { const t = importText(el, ctx, id); if (t) out.push(t); }
    else if (nm === 'DOMTLFText') ctx.rep.tlf++;
    else ctx.rep.other++;
  }
  return out;
}
function fontFace(face, attrs) {
  let f = String(face || 'Arial'), bold = false, italic = false;
  const parts = f.split('-');
  f = parts[0];
  const suf = (parts[1] || '').toLowerCase();
  if (/bold|black|heavy/.test(suf)) bold = true;
  if (/italic|oblique/.test(suf)) italic = true;
  f = f.replace(/MT$/, '').replace(/PS$/, '');
  if (f === 'Arial' && /^arial/i.test(face) === false) f = 'Arial';
  return { font: f || 'Arial', bold, italic };
}
function importText(el, ctx, id) {
  const runsEl = xmlKid(el, 'textRuns');
  const runs = [];
  let align = 'left', ls = 0;
  for (const tr of xmlKids(runsEl, 'DOMTextRun')) {
    const chars = xmlKid(tr, 'characters');
    const txt = chars ? chars.textContent : '';
    const ta = xmlKid(xmlKid(tr, 'textAttrs'), 'DOMTextAttrs');
    const ff = fontFace(attr(ta, 'face', 'Arial'));
    const r = { t: txt, font: ff.font, size: +attr(ta, 'size', 12) || 12, c: attr(ta, 'fillColor', '#000000').toUpperCase(), b: attr(ta, 'bold', 'false') === 'true' || ff.bold, i: attr(ta, 'italic', 'false') === 'true' || ff.italic };
    if (ta) { align = attr(ta, 'alignment', align); ls = +attr(ta, 'letterSpacing', ls) || 0; }
    runs.push(r);
  }
  if (!runs.length || !runs.some((r) => r.t)) return null;
  const dyn = el.localName !== 'DOMStaticText';
  const w = +attr(el, 'width', 0) || 0;
  const o = { id, kind: 'text', name: attr(el, 'name', ''), runs, align: align === 'center' || align === 'right' ? align : 'left', ls, fill: runs[0].c, fa: 1, op: 1, t: newT() };
  if (w && (dyn || o.align !== 'left')) { o.w = w; if (!dyn) o.nw = true; }
  let M = parseMatrixEl(el);
  if (dyn) { const isMulti = attr(el, 'lineType', 'single line') !== 'single line'; if (!isMulti) o.nw = true; }
  setObjMatrix(o, M);
  ctx.rep.textCount++;
  return o;
}
const RESERVED_SYM = /^(__proto__|constructor|prototype|toString|valueOf|hasOwnProperty|__defineGetter__|__defineSetter__|__lookupGetter__|__lookupSetter__|isPrototypeOf|propertyIsEnumerable|toLocaleString)$/;
function importInstance(el, ctx, depth, id) {
  const rawName = attr(el, 'libraryItemName', '');
  const name = RESERVED_SYM.test(rawName) ? rawName + '_' : rawName;
  const item = ctx.lib.get(rawName);
  if (!item || depth > 12 || ctx.inProg.has(name)) { ctx.rep.missing++; return null; }
  const type = attr(el, 'symbolType', 'movie clip');
  if (!ctx.libOut[name]) {
    ctx.inProg.add(name);
    const tlEl = xmlKid(xmlKid(item, 'timeline'), 'DOMTimeline');
    ctx.libOut[name] = tlEl ? importTimeline(tlEl, ctx, depth + 1) : { layers: [], frames: 1 };
    ctx.inProg.delete(name);
  }
  const g = { id, kind: 'clip', sym: name, name: attr(el, 'name', ''), mc: type === 'movie clip', mode: 'loop', first: 0, pv: [0, 0], op: 1, t: newT() };
  { const ae = xmlKid(el, 'Actionscript'), tx = ae ? (xmlKid(ae, 'script') || ae).textContent.trim() : ''; if (tx) { g.script = tx; ctx.rep.instScripts++; ctx.scripts.push(tx); } }
  if (type === 'button') { g.mode = 'single'; g.btn = true; ctx.rep.buttons++; }
  else if (type === 'graphic') {
    const lm = attr(el, 'loop', 'loop');
    g.mode = lm === 'single frame' ? 'single' : lm === 'play once' ? 'once' : 'loop';
    g.first = Math.max(0, parseInt(attr(el, 'firstFrame', 0), 10) || 0);
  }
  if (ctx.libOut[name].frames > 1 && g.mode !== 'single') ctx.rep.animatedSyms.add(name);
  const colorEl = xmlKid(el, 'color');
  const colEl = colorEl && xmlKid(colorEl, 'Color');
  if (colEl) g.op = clamp(+attr(colEl, 'alphaMultiplier', 1), 0, 1);
  let M = parseMatrixEl(el);
  const tp = xmlKid(xmlKid(el, 'transformationPoint'), 'Point');
  const px = tp ? +attr(tp, 'x', 0) : 0, py = tp ? +attr(tp, 'y', 0) : 0;
  if (px || py) { g.pv = [px, py]; M = mmul(M, [1, 0, 0, 1, px, py]); }
  setObjMatrix(g, M);
  return g;
}
function importTimeline(tl, ctx, depth) {
  const layersEl = xmlKid(tl, 'layers');
  const out = [];
  let maxF = 1;
  let li = 0; const types = {};
  for (const le of xmlKids(layersEl, 'DOMLayer')) {
    const idx = li++;
    const type = attr(le, 'layerType', 'normal');
    if (type === 'folder') continue;
    if (type === 'guide') { ctx.rep.guide++; continue; }
    const layer = mkLayer(attr(le, 'name', 'Layer'));
    types[idx] = type;
    if (type === 'mask') { layer.mask = true; ctx.rep.mask++; }
    else { const par = attr(le, 'parentLayerIndex', ''); if (par !== '' && types[+par] === 'mask') { layer.masked = true; ctx.rep.masked++; } }
    layer.visible = attr(le, 'visible', 'true') !== 'false';
    layer.locked = attr(le, 'locked', 'false') === 'true';
    layer.kfs = [];
    let end = 0;
    for (const fe of xmlKids(xmlKid(le, 'frames'), 'DOMFrame')) {
      const f = parseInt(attr(fe, 'index', 0), 10) || 0, dur = parseInt(attr(fe, 'duration', 1), 10) || 1;
      end = Math.max(end, f + dur);
      const els = xmlKid(fe, 'elements');
      const objs = els ? importElements(Array.from(els.children), ctx, depth, 'L' + idx) : [];
      const tt = attr(fe, 'tweenType', '');
      let tween = tt === 'motion' ? 'motion' : tt === 'shape' ? 'shape' : 'none';
      if (tt === 'motion object') ctx.rep.motionObject++;
      const acc = +attr(fe, 'acceleration', 0);
      const kf = mkKf(f, objs);
      const scEl = xmlKid(fe, 'Framescript') || xmlKid(fe, 'Actionscript');
      const scTxt = scEl ? (xmlKid(scEl, 'script') || scEl).textContent.trim() : '';
      if (scTxt) { kf.script = scTxt; ctx.rep.scripts++; ctx.scripts.push(scTxt); }
      const sn = attr(fe, 'soundName', '');
      if (sn) {
        const lm = attr(fe, 'soundLoopMode', ''), cnt = parseInt(attr(fe, 'soundLoop', 0), 10) || 0;
        kf.sound = { name: sn, sync: attr(fe, 'soundSync', 'event'), loop: lm === 'loop' ? -1 : Math.max(0, cnt - 1) };
        ctx.rep.soundFrames++;
      }
      const lbl = attr(fe, 'name', ''); if (lbl && attr(fe, 'labelType', 'name') === 'name') kf.label = lbl;
      kf.tween = tween;
      kf.ease = { type: acc > 0 ? 'out' : acc < 0 ? 'in' : 'linear', amt: clamp(Math.abs(acc), 0, 100) };
      layer.kfs.push(kf);
    }
    if (!layer.kfs.length) layer.kfs.push(mkKf(0));
    layer.kfs.sort((a, b) => a.f - b.f);
    if (layer.kfs[0].f > 0) layer.kfs.unshift(mkKf(0));
    layer._end = end;
    maxF = Math.max(maxF, end);
    out.push(layer);
  }
  for (const l of out) {
    if (l._end > 0 && l._end < maxF) l.kfs.push(mkKf(l._end));
    delete l._end;
  }
  return { layers: out.reverse(), frames: maxF };
}
function parseXML(str) {
  const d = new DOMParser().parseFromString(str, 'application/xml');
  if (d.getElementsByTagName('parsererror').length) throw new Error('badxml');
  return d.documentElement;
}
/* tolerant ZIP reader: walks central-directory records directly, ignoring the (sometimes wrong) end record */
function looseZip(buf) {
  const b = new Uint8Array(buf), dv = new DataView(buf), ents = new Map();
  for (let i = 0; i + 46 <= b.length; i++) {
    if (b[i] === 0x50 && b[i + 1] === 0x4b && b[i + 2] === 1 && b[i + 3] === 2) {
      const method = dv.getUint16(i + 10, true), csize = dv.getUint32(i + 20, true), nl = dv.getUint16(i + 28, true), xl = dv.getUint16(i + 30, true), cl = dv.getUint16(i + 32, true), off = dv.getUint32(i + 42, true);
      if (off + 30 > b.length || b[off] !== 0x50 || b[off + 1] !== 0x4b || b[off + 2] !== 3 || b[off + 3] !== 4) continue;
      const name = new TextDecoder().decode(b.subarray(i + 46, i + 46 + nl));
      ents.set(name, { method, csize, off });
      i += 45 + nl + xl + cl;
    }
  }
  if (!ents.size) return null;
  const files = {};
  for (const n of ents.keys()) files[n] = { dir: n.endsWith('/') };
  const read = async (n) => {
    const e = ents.get(n);
    const start = e.off + 30 + dv.getUint16(e.off + 26, true) + dv.getUint16(e.off + 28, true);
    let data = b.subarray(start, start + e.csize);
    if (e.method === 8) {
      const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      data = new Uint8Array(await new Response(stream).arrayBuffer());
    } else if (e.method !== 0) throw new Error('Unsupported ZIP compression method ' + e.method);
    return data;
  };
  return { files, file: (n) => (ents.has(n) ? { async: async (t) => { const d = await read(n); return t === 'string' ? new TextDecoder().decode(d) : d; } } : null) };
}
function b64enc(u8) { let s = ''; const CH = 0x8000; for (let i = 0; i < u8.length; i += CH) s += String.fromCharCode.apply(null, u8.subarray(i, i + CH)); return btoa(s); }
function pcmToWav(pcm, rate, ch) {
  const out = new Uint8Array(44 + pcm.length), dv = new DataView(out.buffer);
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out[o + i] = s.charCodeAt(i); };
  w(0, 'RIFF'); dv.setUint32(4, 36 + pcm.length, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, ch, true);
  dv.setUint32(24, rate, true); dv.setUint32(28, rate * ch * 2, true); dv.setUint16(32, ch * 2, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}
async function importSounds(rootEl, zip, base, names, rep) {
  const out = {}, norm = new Map();
  for (const n of names) norm.set(n.replace(/\\/g, '/'), n);
  const read = async (rel) => { const n = norm.get((base + rel).replace(/\\/g, '/')); return n ? zip.file(n).async('uint8array') : null; };
  const isMp3 = (d) => d && d.length > 4 && ((d[0] === 0xff && (d[1] & 0xe0) === 0xe0) || (d[0] === 0x49 && d[1] === 0x44 && d[2] === 0x33));
  for (const it of xmlKids(xmlKid(rootEl, 'media'), 'DOMSoundItem')) {
    try {
      const name = attr(it, 'name', '');
      if (!name) continue;
      const hr = attr(it, 'soundDataHRef', ''), href = attr(it, 'href', '');
      const data = hr ? await read('bin/' + hr) : null;
      const fm = /(\d+)\s*kHz\s+(\d+)\s*bit\s+(Mono|Stereo)/i.exec(attr(it, 'format', ''));
      const len = +attr(it, 'dataLength', 0);
      let bytes = null, mime = null;
      if (isMp3(data)) { bytes = len > 0 && len <= data.length ? data.subarray(0, len) : data; mime = 'audio/mpeg'; }
      else if (data && fm && +fm[2] === 16) {
        const rate = { 5: 5512, 11: 11025, 22: 22050, 44: 44100 }[+fm[1]] || 44100;
        bytes = pcmToWav(len > 0 && len <= data.length ? data.subarray(0, len) : data, rate, /stereo/i.test(fm[3]) ? 2 : 1); mime = 'audio/wav';
      }
      if (!bytes && href) {
        const o = (await read('LIBRARY/' + href)) || (await read(href));
        if (o) { bytes = o; mime = /\.wav$/i.test(href) ? 'audio/wav' : /\.ogg$/i.test(href) ? 'audio/ogg' : 'audio/mpeg'; }
      }
      if (!bytes) { rep.soundMissing++; continue; }
      out[name] = { name, mime, b64: b64enc(bytes), size: bytes.length, ids: [attr(it, 'linkageIdentifier', ''), attr(it, 'linkageClassName', '')].filter(Boolean) };
    } catch (e) { rep.soundMissing++; }
  }
  return out;
}
function imgDims(u) {
  try {
    if (u[0] === 0x89 && u[1] === 0x50) return [((u[16] << 24) | (u[17] << 16) | (u[18] << 8) | u[19]) >>> 0, ((u[20] << 24) | (u[21] << 16) | (u[22] << 8) | u[23]) >>> 0];
    if (u[0] === 0x47 && u[1] === 0x49) return [u[6] | (u[7] << 8), u[8] | (u[9] << 8)];
    if (u[0] === 0xff && u[1] === 0xd8) {
      let i = 2;
      while (i + 9 < u.length) {
        if (u[i] !== 0xff) { i++; continue; }
        const m = u[i + 1];
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return [(u[i + 7] << 8) | u[i + 8], (u[i + 5] << 8) | u[i + 6]];
        i += 2 + ((u[i + 2] << 8) | u[i + 3]);
      }
    }
  } catch (e) { /* fall through */ }
  return null;
}
async function importBitmaps(rootEl, zip, base, names, rep) {
  const images = {}, map = {}, norm = new Map();
  for (const n of names) norm.set(n.replace(/\\/g, '/'), n);
  const read = async (rel) => { const n = norm.get((base + rel).replace(/\\/g, '/')); return n ? zip.file(n).async('uint8array') : null; };
  for (const it of xmlKids(xmlKid(rootEl, 'media'), 'DOMBitmapItem')) {
    try {
      const name = attr(it, 'name', ''), href = attr(it, 'href', '') || name;
      if (!name) continue;
      const data = (await read('LIBRARY/' + href)) || (await read(href));
      if (!data || data.length < 16) { rep.bitmapMissing++; continue; }
      const ext = (href.split('.').pop() || '').toLowerCase();
      const mime = data[0] === 0x89 ? 'image/png' : data[0] === 0xff ? 'image/jpeg' : data[0] === 0x47 ? 'image/gif' : ext === 'png' ? 'image/png' : ext === 'gif' ? 'image/gif' : 'image/jpeg';
      const dm = imgDims(data) || [Math.round(+attr(it, 'frameRight', 0) / 20) || 100, Math.round(+attr(it, 'frameBottom', 0) / 20) || 100];
      images[name] = { name, mime, b64: b64enc(data), w: dm[0], h: dm[1], size: data.length };
      map[name] = { key: name, w: dm[0], h: dm[1] };
    } catch (e) { rep.bitmapMissing++; }
  }
  return { images, map };
}
async function importFLA(buf) {
  const bytes = new Uint8Array(buf);
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) throw new Error('legacy');
  let zip;
  try { zip = await JSZip.loadAsync(buf); }
  catch (e) {
    /* some Animate builds write a wrong central-directory size; read entries by their own headers instead */
    zip = looseZip(buf);
    if (!zip) { const er = new Error('notzip'); er.detail = String(e && e.message || e); throw er; }
  }
  const names = Object.keys(zip.files);
  const domName = names.find((n) => /(^|\/)DOMDocument\.xml$/i.test(n) && !zip.files[n].dir);
  if (!domName) { const er = new Error('nodom'); er.detail = names.slice(0, 25).join(', ') || '(empty archive)'; throw er; }
  const base = domName.slice(0, domName.length - 'DOMDocument.xml'.length);
  let root;
  try { root = parseXML((await zip.file(domName).async('string')).replace(/^\uFEFF/, '')); }
  catch (e) { const er = new Error('badxml'); er.detail = String(e && e.message || e); throw er; }
  const rep = { soundFrames: 0, soundMissing: 0, sounds: 0, gradient: 0, bitmap: 0, images: 0, bitmapMissing: 0, tlf: 0, textCount: 0, mask: 0, masked: 0, guide: 0, missing: 0, other: 0, motionObject: 0, scripts: 0, instScripts: 0, buttons: 0, animatedSyms: new Set() };
  const lib = new Map();
  for (const name of Object.keys(zip.files)) {
    if (!name.startsWith(base) || !/^LIBRARY\/.*\.xml$/i.test(name.slice(base.length)) || zip.files[name].dir) continue;
    try {
      const el = parseXML(await zip.file(name).async('string'));
      if (el.localName === 'DOMSymbolItem') lib.set(attr(el, 'name', name.slice(base.length + 8, -4)), el);
    } catch (e) { /* skip unreadable library item */ }
  }
  const bms = await importBitmaps(root, zip, base, names, rep);
  const ctx = { rep, lib, libOut: {}, inProg: new Set(), bitmaps: bms.map, scripts: [] };
  const timelines = xmlKid(root, 'timelines');
  const tls = xmlKids(timelines, 'DOMTimeline');
  if (!tls.length) throw new Error('nodom');
  /* scenes are joined into one timeline, as Flash does when it publishes: each scene's layers only have content inside that scene's frame range, and the first keyframe of each scene carries a scene marker */
  const multi = tls.length > 1, parts = [];
  let total = 0;
  tls.forEach((te, i) => {
    const t = importTimeline(te, ctx, 0), nm = attr(te, 'name', 'Scene ' + (i + 1));
    if (!t.layers.length) { const l = mkLayer('Layer 1'); l.kfs = [mkKf(0)]; t.layers.push(l); }
    parts.push({ t, nm, start: total }); total += t.frames;
  });
  const layers = [];
  for (const { t, nm, start } of parts) {
    const end = start + t.frames;
    t.layers.forEach((l, li) => {
      if (start > 0) { for (const k of l.kfs) k.f += start; l.kfs.unshift(mkKf(0)); }
      if (end < total && !l.kfs.some((k) => k.f === end)) l.kfs.push(mkKf(end));
      if (multi) l.name = nm + ': ' + l.name;
      if (li === 0) { const k0 = l.kfs.find((k) => k.f === start); if (k0) k0.scene = nm; }
      layers.push(l);
    });
  }
  const doc = {
    w: Math.round(+attr(root, 'width', 550)), h: Math.round(+attr(root, 'height', 400)), fps: +attr(root, 'frameRate', 24),
    bg: attr(root, 'backgroundColor', '#FFFFFF'), frames: total, layers, lib: ctx.libOut
  };
  /* scripts written for ActionScript 1/2 (the document says so, or the code gives it away) run through the player's AS1 layer */
  { let asv = '';
    try { const pf = zip.file(base + 'PublishSettings.xml'); if (pf) { const m = /<ActionScriptVersion>\s*(\d)/.exec(await pf.async('string')); if (m) asv = m[1]; } } catch (e) { /* no publish settings */ }
    if (asv === '1' || asv === '2') { doc.lang = 'as1'; rep.lang = 'ActionScript ' + asv; }
    else if (ctx.scripts.some(as1Looks)) { doc.lang = 'as1'; rep.lang = 'ActionScript 1/2 (detected)'; } }
  normalizeDoc(doc);
  doc.images = bms.images;
  doc.sounds = await importSounds(root, zip, base, names, rep);
  rep.sounds = Object.keys(doc.sounds).length;
  rep.scenes = tls.length;
  if (total > 900) rep.truncated = total;
  rep.animatedSyms = Array.from(rep.animatedSyms);
  return { doc, report: rep };
}


/* ---------- ActionScript 1 / 2 support (parsing helpers; the runtime provides the AS1 environment) ---------- */
const AS1_MARK = /\b(getURL|_root|_parent|_level0|onClipEvent|tellTarget|loadMovie|loadVariables|duplicateMovieClip|attachMovie|removeMovieClip|setProperty|getProperty|stopAllSounds|prevScene|nextScene)\b|\bon\s*\(\s*(press|release|releaseOutside|rollOver|rollOut|dragOver|dragOut|keyPress)\b|\b_(x|y|alpha|rotation|xscale|yscale|visible|currentframe|totalframes|xmouse|ymouse)\b|\.on(Press|Release|RollOver|RollOut|EnterFrame|Load)\s*=/;
function as1Looks(src) { return AS1_MARK.test(String(src || '')); }
function as1EndStr(s, i) { const q = s[i]; let j = i + 1; while (j < s.length && s[j] !== q) { if (s[j] === '\\') j++; j++; } return Math.min(s.length, j + 1); }
function as1MatchBrace(s, i) { /* s[i] is '{' (or '('); returns the index after its partner */
  const open = s[i], close = open === '{' ? '}' : ')'; let d = 0, j = i;
  while (j < s.length) {
    const c = s[j];
    if (c === '"' || c === "'") { j = as1EndStr(s, j); continue; }
    if (c === '/' && s[j + 1] === '/') { while (j < s.length && s[j] !== '\n') j++; continue; }
    if (c === '/' && s[j + 1] === '*') { const e = s.indexOf('*/', j + 2); j = e < 0 ? s.length : e + 2; continue; }
    if (c === open) d++; else if (c === close) { d--; if (d === 0) return j + 1; }
    j++;
  }
  return -1;
}
/* drop AS2 type annotations: var x:Type, function f(a:Type):Type */
function as1StripTypes(src) {
  const T = '[A-Za-z_$][\\w$.]*';
  const fix = (code) => code
    .replace(new RegExp('\\bvar\\s+([\\w$]+)\\s*:\\s*' + T, 'g'), 'var $1')
    .replace(new RegExp('\\bfunction\\s*([\\w$]*)\\s*\\(([^()]*)\\)\\s*(?::\\s*' + T + ')?', 'g'), (m, n, ps) => 'function ' + n + '(' + ps.replace(new RegExp('\\s*:\\s*' + T, 'g'), '') + ')');
  let out = '', i = 0, seg = 0; const s = String(src);
  while (i < s.length) {
    const c = s[i];
    let e = -1;
    if (c === '"' || c === "'") e = as1EndStr(s, i);
    else if (c === '/' && s[i + 1] === '/') { e = s.indexOf('\n', i); if (e < 0) e = s.length; }
    else if (c === '/' && s[i + 1] === '*') { e = s.indexOf('*/', i + 2); e = e < 0 ? s.length : e + 2; }
    if (e < 0) { i++; continue; }
    out += fix(s.slice(seg, i)) + s.slice(i, e); i = seg = e;
  }
  return out + fix(s.slice(seg));
}
/* rewrite one AS1 script into JavaScript for the player's AS1 scope:
   on(...) / onClipEvent(...) blocks -> __on / __clip registrations; top-level function and var become timeline variables;
   tellTarget(x) { } -> with (__tt(x)) { } */
function as1Prepare(src, inner) {
  const s = inner ? String(src) : as1StripTypes(src), n = s.length;
  let out = '', i = 0, depth = 0, stmt = true; const fns = [];
  const ws = (j) => { while (j < n && /\s/.test(s[j])) j++; return j; };
  const wordAt = (j) => { let k = j; while (k < n && /[\w$]/.test(s[k])) k++; return k; };
  while (i < n) {
    const c = s[i];
    if (c === '"' || c === "'") { const e = as1EndStr(s, i); out += s.slice(i, e); i = e; stmt = false; continue; }
    if (c === '/' && s[i + 1] === '/') { let e = s.indexOf('\n', i); if (e < 0) e = n; out += s.slice(i, e); i = e; continue; }
    if (c === '/' && s[i + 1] === '*') { let e = s.indexOf('*/', i + 2); e = e < 0 ? n : e + 2; out += s.slice(i, e); i = e; continue; }
    if (/[A-Za-z_$]/.test(c)) {
      const j = wordAt(i), w = s.slice(i, j), prev = out.replace(/\s+$/, '').slice(-1);
      const top = !inner && depth === 0 && prev !== '.';
      if (top && (w === 'on' || w === 'onClipEvent')) {
        const k = ws(j);
        if (s[k] === '(') {
          const pe = as1MatchBrace(s, k);
          const b = pe < 0 ? -1 : ws(pe);
          if (pe > 0 && s[b] === '{') {
            const be = as1MatchBrace(s, b);
            if (be > 0) {
              const raw = s.slice(k + 1, pe - 1), evs = [];
              raw.replace(/(\w+)(?:\s*"([^"]*)")?/g, (m, e, key) => { evs.push(key != null ? e + ':' + key : e); return m; });
              out += (w === 'on' ? '__on(' : '__clip(') + JSON.stringify(evs) + ', function () {' + as1Prepare(s.slice(b + 1, be - 1), true) + '});';
              i = be; stmt = true; continue;
            }
          }
        }
      }
      if (top && w === 'function') {
        const k = ws(j), e2 = wordAt(k);
        if (e2 > k && s[ws(e2)] === '(') {
          const name = s.slice(k, e2), pk = ws(e2), pe = as1MatchBrace(s, pk), b = pe < 0 ? -1 : ws(pe);
          if (pe > 0 && s[b] === '{') {
            const be = as1MatchBrace(s, b);
            if (be > 0) { fns.push(name + ' = function ' + s.slice(pk, pe) + ' {' + as1Prepare(s.slice(b + 1, be - 1), true) + '};'); i = be; stmt = true; continue; }
          }
        }
      }
      if (top && w === 'var' && stmt) { i = ws(j); continue; }
      if (w === 'tellTarget' && prev !== '.') {
        const k = ws(j);
        if (s[k] === '(') { const pe = as1MatchBrace(s, k); if (pe > 0) { out += 'with (__tt(' + s.slice(k + 1, pe - 1) + '))'; i = pe; stmt = false; continue; } }
      }
      out += w; i = j; stmt = false; continue;
    }
    if (c === '{') { depth++; stmt = true; }
    else if (c === '}') { depth--; stmt = true; }
    else if (c === ';') stmt = true;
    else if (!/\s/.test(c)) stmt = false;
    out += c; i++;
  }
  return fns.join('\n') + (fns.length ? '\n' : '') + out;
}

root.FCCore = {
  uid, clamp, lerp, clone, nz, hexToRgb, rgbToHex, lerpHex, rgba,
  newT, matOf, mmul, minv, mapply, decompose, node, tracePath, pathD, bezPt, splitSeg, contoursBounds, localBounds, worldCorners, worldBounds,
  recenter, applyMatrixToNodes, setObjMatrix, ellipseContour, rectContour, mkPath, mkLayer, mkKf, mkDoc, normalizeDoc,
  groupEntries, drawUnits, maskedDraw, groupAlpha, tweenPairs, shapeTweenIssues, ease, bezierEase, morphContours, evalLayerObjs, evalDoc, kfIndexAt, kfAt, kfFor, sortKfs, ensureEditable, insertKeyframe, insertFrames, removeFrames,
  rigSolve, rigBuild, rigValid, boneFrame, bindBone, unbindBone, setRigGhost, settleBinds, freeBind, notGhost, resolveBinds, clearKeyframe, moveKeyframe, reverseFrames, moveKeyframes, setTweenAt, drawObj, hitObj, frameSVG, objSVG, quantize, lzw, gifWriter, parseNum, parseEdges, assembleLoops,
  as1Looks, as1StripTypes, as1Prepare, importFLA, setImages, preloadImages, setLib, setMeasure, kidsOf, layoutText
};
})(typeof window !== 'undefined' ? window : globalThis);
