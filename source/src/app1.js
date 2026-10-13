/* ===== Onionskyn app, part 1: state, helpers, history, stage rendering ===== */
const C = window.FCCore;
const { uid, clamp, lerp, clone, matOf, mmul, minv, mapply, drawObj, hitObj, localBounds, worldBounds, worldCorners } = C;
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const CW = 16, RH = 26, RULER = 24;
const LS_DOC = 'flashcraft.doc.v1', LS_THEME = 'flashcraft.theme';
const APP_VERSION = '0.10.1-beta', PROJECT_VERSION = 2;
/* diagnostics ring buffers + unsaved-work tracking */
const FCLOG = { errs: [], msgs: [] };
const logPush = (a, m) => { a.push(new Date().toISOString().slice(11, 19) + ' ' + String(m).slice(0, 240)); if (a.length > 15) a.shift(); };
window.addEventListener('error', (e) => logPush(FCLOG.errs, (e.message || 'error') + (e.filename ? ' @' + String(e.filename).split('/').pop() + ':' + e.lineno : '')));
window.addEventListener('unhandledrejection', (e) => logPush(FCLOG.errs, 'promise: ' + (e.reason && e.reason.message || e.reason)));
let unsaved = false, lastSaveAt = Date.now(), nagAt = 0, autosaveWarned = false;
function markDirty() { if (!unsaved) { unsaved = true; lastSaveAt = Date.now(); const b = document.getElementById('mFile'); if (b) b.classList.add('dirty'); } }
function clearDirty() { unsaved = false; lastSaveAt = Date.now(); const b = document.getElementById('mFile'); if (b) b.classList.remove('dirty'); }
window.addEventListener('beforeunload', (e) => { if (unsaved) { e.preventDefault(); e.returnValue = ''; } });
setInterval(() => {
  const now = Date.now();
  if (unsaved && now - lastSaveAt > 600000 && now - nagAt > 600000) { nagAt = now; toast('You have unsaved changes. File → Save project (Ctrl+S) keeps a copy you can reopen anywhere.'); }
}, 60000);

const S = {
  doc: null, frame: 0, layerId: null, tool: 'select', sel: [], view: { z: 1, px: 0, py: 0 },
  style: { font: 'Arial', size: 32, bold: false, italic: false, align: 'left', fill: '#3F5BFF', fillOn: true, fa: 1, stroke: '#1B2030', strokeOn: true, sa: 1, sw: 3, cap: 'round', join: 'round', radius: 0, smooth: 40, bsize: 14, bshape: 'round', bpress: true, bangle: 0, bcolor: '#1B2030', fb: { size: 12, stab: 25, smooth: 50, round: 100, angle: 0, taper: 25, vel: 0, press: 100, zoom: true, color: '#1B2030', alpha: 100, merge: true }, bmerge: true, bgap: 'small', ball: false, fillType: 'solid', gradEdit: true },
  onion: { on: false, b: 1, a: 1 }, playing: false, loop: true, pen: null, draw: null, drag: null, nodeSel: null,
  edit: [], space: false, clipboard: [], cursorW: { x: 0, y: 0 }, autoFit: true
};
const hctx = document.createElement('canvas').getContext('2d');
C.setMeasure(hctx);
let CSSV = {};
function readTheme() {
  const cs = getComputedStyle(document.documentElement);
  const g = (n) => cs.getPropertyValue(n).trim();
  CSSV = {
    pasteboard: g('--pasteboard'), accent: g('--accent'), accentFg: g('--accent-fg'), playhead: g('--playhead'), line: g('--line'), line2: g('--line2'),
    cell: g('--cell'), cell5: g('--cell5'), motion: g('--motion'), shape: g('--shape'), held: g('--held'), key: g('--key'), fg: g('--fg'), mut: g('--mut'), panel: g('--panel')
  };
}

/* ---------- lookups ---------- */
const layers = () => S.doc.layers;
const getLayer = (id) => layers().find((l) => l.id === id);
const curLayer = () => getLayer(S.layerId) || layers()[layers().length - 1];
const fnum = (f) => f + 1;
function findEval(lid, id) {
  const l = getLayer(lid);
  if (!l || l.visible === false) return null;
  return C.evalLayerObjs(l, S.frame).find((o) => o.id === id) || null;
}
function findEditable(lid, id) {
  const l = getLayer(lid);
  const kf = l && C.kfFor(l, S.frame);
  return (kf && kf.objs.find((o) => o.id === id)) || null;
}
function selEval() {
  const out = [];
  for (const s of S.sel) { const o = findEval(s.lid, s.id); if (o) out.push({ lid: s.lid, id: s.id, o }); }
  return out;
}
function singleSel() { const a = selEval(); return a.length === 1 ? a[0] : null; }
function pruneSel() { S.sel = S.sel.filter((s) => findEval(s.lid, s.id)); if (!singleSel() || singleSel().o.kind !== 'path') S.nodeSel = null; }
function walkPaths(o, fn) {
  if (o.kind === 'image') return;
  if (o.kind === 'group') o.children.forEach((c) => walkPaths(c, fn));
  else if (o.kind === 'text') { const b = o.fill; fn(o); if (o.fill && o.fill !== b) o.runs.forEach((r) => { r.c = o.fill; }); }
  else if (o.kind !== 'clip') fn(o);
}

/* ---------- history ---------- */
const H = { stack: [], redo: [] };
let editGesture = false;
/* ---- symbol editing: while inside a symbol, doc.layers/frames are swapped for the symbol's own; unwind() restores the scene for saving */
function enterSymRaw(sym) {
  const lib = S.doc.lib && S.doc.lib[sym];
  if (!lib) return false;
  S.edit.push({ sym, layers: S.doc.layers, frames: S.doc.frames, frame: S.frame, layerId: S.layerId });
  S.doc.layers = lib.layers; S.doc.frames = Math.max(1, lib.frames || 1);
  return true;
}
function exitSymRaw() {
  const e = S.edit.pop();
  if (!e) return null;
  S.doc.lib[e.sym].frames = S.doc.frames;
  S.doc.layers = e.layers; S.doc.frames = e.frames;
  return e;
}
function unwind() { const p = S.edit.map((e) => e.sym); while (S.edit.length) exitSymRaw(); return p; }
function rewind(p) { for (const s of p) if (!enterSymRaw(s)) break; }
const noSounds = (k, v) => (k === 'sounds' ? undefined : v);
const noMedia = (k, v) => (k === 'sounds' || k === 'images' ? undefined : v);
const metaImages = (v) => Object.fromEntries(Object.entries(v).map(([n, s]) => [n, { name: s.name, mime: s.mime, w: s.w, h: s.h, size: s.size, ext: 1 }]));
const metaSounds = (k, v) => (k === 'images' && v ? metaImages(v) : k === 'sounds' && v ? Object.fromEntries(Object.entries(v).map(([n, s]) => [n, { name: s.name, mime: s.mime, ids: s.ids, size: s.size, ext: 1 }])) : v);
const snap = () => { const p = unwind(); const str = JSON.stringify({ doc: S.doc, frame: S.frame, layerId: S.layerId, path: p }, noMedia); rewind(p); return str; };
function pushUndo() {
  markDirty();
  const s = snap();
  H.stack.push(s);
  const cap = s.length > 1500000 ? 10 : 60;
  while (H.stack.length > cap) H.stack.shift();
  H.redo.length = 0;
  updateHistoryButtons();
}
function restoreSnap(str) {
  const o = JSON.parse(str);
  o.doc.sounds = S.doc.sounds || {}; o.doc.images = S.doc.images || {};
  S.doc = o.doc; C.setLib(S.doc.lib); C.setImages(S.doc.images); S.edit = []; rewind(o.path || []); S.frame = clamp(o.frame, 0, S.doc.frames - 1);
  S.layerId = getLayer(o.layerId) ? o.layerId : layers()[layers().length - 1].id;
  pruneSel();
  refreshAll();
}
function undo() { if (!H.stack.length) return; H.redo.push(snap()); restoreSnap(H.stack.pop()); updateHistoryButtons(); }
function redo() { if (!H.redo.length) return; H.stack.push(snap()); restoreSnap(H.redo.pop()); updateHistoryButtons(); }
function updateHistoryButtons() { $('#bUndo').disabled = !H.stack.length; $('#bRedo').disabled = !H.redo.length; }
/* push undo once per gesture (a drag, a slider sweep, a typed value) */
function beginEditOnce() { if (!editGesture) { pushUndo(); editGesture = true; } }
['pointerup', 'change', 'blur', 'keyup'].forEach((ev) => window.addEventListener(ev, () => { editGesture = false; }, true));

/* ---------- redraw scheduling ---------- */
let dirty = false;
function invalidate() {
  if (dirty) return;
  dirty = true;
  requestAnimationFrame(() => { dirty = false; renderStage(); drawTimeline(); });
}
let saveTimer = 0;
function commit() {
  markDirty();
  invalidate(); refreshProps(); updateTime();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(autosave, 700);
}
function refreshAll() { buildLayerList(); refreshProps(); updateTime(); updateHistoryButtons(); invalidate(); syncOnionUI(); clearTimeout(saveTimer); saveTimer = setTimeout(autosave, 700); }
function autosave() {
  try {
    const p = unwind();
    const str = JSON.stringify(S.doc, metaSounds);
    rewind(p);
    if (str.length < 4500000) localStorage.setItem(LS_DOC, str);
    else if (!autosaveWarned) { autosaveWarned = true; toast('This project is too large to autosave in the browser. Use File → Save project to keep your work.'); }
  } catch (e) {
    if (!autosaveWarned) { autosaveWarned = true; toast('The browser couldn’t autosave (storage full or blocked). Use File → Save project to keep your work.'); }
  }
}
let toastTimer = 0;
function toast(msg) {
  const box = $('#toast');
  const d = document.createElement('div');
  d.textContent = msg;
  logPush(FCLOG.msgs, msg);
  box.appendChild(d);
  setTimeout(() => d.remove(), 3800);
}

/* ---------- view ---------- */
const stage = $('#stage'), sctx = stage.getContext('2d');
let stageW = 0, stageH = 0, dpr = 1;
function resizeStage() {
  const r = $('#stagewrap').getBoundingClientRect();
  dpr = window.devicePixelRatio || 1;
  stageW = Math.max(1, r.width); stageH = Math.max(1, r.height);
  stage.width = Math.round(stageW * dpr); stage.height = Math.round(stageH * dpr);
  invalidate();
}
function symBounds() {
  let b = null;
  for (const { objs } of C.evalDoc(S.doc, 0)) for (const o of objs) {
    const wb = worldBounds(o);
    if (!wb) continue;
    b = b ? { x0: Math.min(b.x0, wb.x0), y0: Math.min(b.y0, wb.y0), x1: Math.max(b.x1, wb.x1), y1: Math.max(b.y1, wb.y1) } : { x0: wb.x0, y0: wb.y0, x1: wb.x1, y1: wb.y1 };
  }
  return b || { x0: -50, y0: -50, x1: 50, y1: 50 };
}
function fitView() {
  const m = stageW < 500 ? 24 : 56;
  if (S.edit.length) {
    const b = symBounds(), bw = Math.max(b.x1 - b.x0, 20), bh = Math.max(b.y1 - b.y0, 20);
    S.view.z = clamp(Math.min((stageW - m * 2) / bw, (stageH - m * 2) / bh), 0.05, 6);
    S.view.px = stageW / 2 - (b.x0 + b.x1) / 2 * S.view.z; S.view.py = stageH / 2 - (b.y0 + b.y1) / 2 * S.view.z;
    S.autoFit = false; updateZoom(); invalidate();
    return;
  }
  const z = Math.min((stageW - m * 2) / S.doc.w, (stageH - m * 2) / S.doc.h);
  S.view.z = clamp(z, 0.05, 8);
  S.view.px = (stageW - S.doc.w * S.view.z) / 2; S.view.py = (stageH - S.doc.h * S.view.z) / 2;
  S.autoFit = true;
  updateZoom(); invalidate();
}
function zoomAt(sx, sy, f) {
  const z0 = S.view.z, z1 = clamp(z0 * f, 0.05, 32);
  const wx = (sx - S.view.px) / z0, wy = (sy - S.view.py) / z0;
  S.view.z = z1; S.view.px = sx - wx * z1; S.view.py = sy - wy * z1;
  S.autoFit = false;
  updateZoom(); invalidate();
}
function updateZoom() { $('#zVal').textContent = Math.round(S.view.z * 100) + '%'; }
const w2s = (x, y) => [x * S.view.z + S.view.px, y * S.view.z + S.view.py];
const s2w = (x, y) => ({ x: (x - S.view.px) / S.view.z, y: (y - S.view.py) / S.view.z });

/* ---------- stage rendering ---------- */
function drawFrameObjs(ctx, f, opt) {
  C.drawUnits(ctx, C.evalDoc(S.doc, f), opt);
}
function renderStage() {
  if (!S.doc) return;
  const ctx = sctx, z = S.view.z, d = S.doc;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = CSSV.pasteboard; ctx.fillRect(0, 0, stage.width, stage.height);
  ctx.setTransform(dpr * z, 0, 0, dpr * z, dpr * S.view.px, dpr * S.view.py);
  ctx.save();
  const inSym = S.edit.length > 0;
  if (!inSym) { ctx.shadowColor = 'rgba(0,0,0,.35)'; ctx.shadowBlur = 16 * dpr; ctx.shadowOffsetY = 3 * dpr; ctx.fillStyle = d.bg; ctx.fillRect(0, 0, d.w, d.h); }
  ctx.restore();
  if (!inSym) { ctx.fillStyle = d.bg; ctx.fillRect(0, 0, d.w, d.h); }
  if (S.playing) { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, d.w, d.h); ctx.clip(); }
  if (S.onion.on && !S.playing) {
    for (let k = S.onion.b; k >= 1; k--) if (S.frame - k >= 0) drawFrameObjs(ctx, S.frame - k, { tint: { c: '#FF4D5E', a: 0.34 / k } });
    for (let k = S.onion.a; k >= 1; k--) if (S.frame + k < d.frames) drawFrameObjs(ctx, S.frame + k, { tint: { c: '#2FB36B', a: 0.34 / k } });
  }
  drawFrameObjs(ctx, S.frame);
  if (!S.playing && !(S.drawGhostOff)) {
    for (const { layer, objs } of C.evalDoc(S.doc, S.frame)) if (layer.mask && layer.visible !== false) for (const o of objs) drawObj(ctx, o, { tint: { c: CSSV.accent, a: layer.id === S.layerId ? 0.4 : 0.22 } });
  }
  if (S.playing) ctx.restore();
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.strokeStyle = CSSV.line; ctx.lineWidth = 1;
  if (!S.edit.length) ctx.strokeRect(S.view.px - 0.5, S.view.py - 0.5, d.w * z + 1, d.h * z + 1);
  if (S.edit.length) {
    ctx.strokeStyle = CSSV.accent; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(S.view.px - 7, S.view.py); ctx.lineTo(S.view.px + 7, S.view.py); ctx.moveTo(S.view.px, S.view.py - 7); ctx.lineTo(S.view.px, S.view.py + 7); ctx.stroke();
  }
  if (!S.playing) drawOverlay(ctx);
}

/* ---------- handles & overlay ---------- */
function getHandles(o) {
  const b = localBounds(o);
  if (!b) return [];
  const m = matOf(o.t), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const pts = { nw: [b.x0, b.y0], n: [cx, b.y0], ne: [b.x1, b.y0], e: [b.x1, cy], se: [b.x1, b.y1], s: [cx, b.y1], sw: [b.x0, b.y1], w: [b.x0, cy] };
  const out = [];
  for (const k in pts) { const p = mapply(m, pts[k][0], pts[k][1]); out.push({ id: k, x: p[0], y: p[1], l: pts[k] }); }
  const n = out.find((h) => h.id === 'n'), c = mapply(m, cx, cy);
  const dx = n.x - c[0], dy = n.y - c[1], len = Math.hypot(dx, dy) || 1, off = 26 / S.view.z;
  out.push({ id: 'rot', x: n.x + dx / len * off, y: n.y + dy / len * off, l: null });
  return out;
}
function hitHandle(hs, sx, sy) {
  for (const h of hs) { const p = w2s(h.x, h.y); if (Math.hypot(p[0] - sx, p[1] - sy) <= 9) return h; }
  return null;
}
function nodeScreen(o, n, which) {
  const m = matOf(o.t);
  const lx = which === 'in' ? n.x + n.ix : which === 'out' ? n.x + n.ox : n.x;
  const ly = which === 'in' ? n.y + n.iy : which === 'out' ? n.y + n.oy : n.y;
  const p = mapply(m, lx, ly);
  return w2s(p[0], p[1]);
}
function drawOverlay(ctx) {
  const acc = CSSV.accent;
  const sels = selEval();
  ctx.lineWidth = 1; ctx.strokeStyle = acc; ctx.fillStyle = CSSV.accentFg;
  for (const s of sels) {
    const cs = worldCorners(s.o);
    if (!cs) continue;
    ctx.beginPath();
    cs.forEach((p, i) => { const q = w2s(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
    ctx.closePath(); ctx.stroke();
  }
  const one = sels.length === 1 ? sels[0] : null;
  if (one && S.tool === 'select' && gradEditing(one.o)) drawGradHandles(ctx, one.o);
  else if (one && S.tool === 'select') {
    const hs = getHandles(one.o);
    const rot = hs.find((h) => h.id === 'rot'), nh = hs.find((h) => h.id === 'n');
    if (rot && nh) { const a = w2s(nh.x, nh.y), b = w2s(rot.x, rot.y); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    for (const h of hs) {
      const p = w2s(h.x, h.y);
      ctx.beginPath();
      if (h.id === 'rot') ctx.arc(p[0], p[1], 5, 0, Math.PI * 2); else ctx.rect(p[0] - 4, p[1] - 4, 8, 8);
      ctx.fill(); ctx.stroke();
    }
  }
  if (one && S.tool === 'node' && one.o.kind === 'path') {
    one.o.contours.forEach((c, ci) => {
      c.nodes.forEach((n, ni) => {
        const sel = S.nodeSel && S.nodeSel.ci === ci && S.nodeSel.ni === ni;
        if (sel) {
          for (const w of ['in', 'out']) {
            if (!(w === 'in' ? n.ix || n.iy : n.ox || n.oy)) continue;
            const a = nodeScreen(one.o, n, 'anchor'), b = nodeScreen(one.o, n, w);
            ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
            ctx.beginPath(); ctx.arc(b[0], b[1], 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
          }
        }
        const p = nodeScreen(one.o, n, 'anchor');
        ctx.beginPath(); ctx.rect(p[0] - 4, p[1] - 4, 8, 8);
        ctx.fillStyle = sel ? acc : CSSV.accentFg; ctx.fill(); ctx.stroke(); ctx.fillStyle = CSSV.accentFg;
      });
    });
  }
  const d = S.drag;
  if (d && d.type === 'marquee') {
    const a = w2s(d.start.x, d.start.y), b = w2s(d.cur.x, d.cur.y);
    ctx.save(); ctx.fillStyle = acc; ctx.globalAlpha = 0.12;
    ctx.fillRect(a[0], a[1], b[0] - a[0], b[1] - a[1]); ctx.restore();
    ctx.strokeRect(a[0], a[1], b[0] - a[0], b[1] - a[1]);
  }
  if (S.draw) drawPreview(ctx);
  drawBrushCursor(ctx);
  if (S.pen) drawPenPreview(ctx);
}
