/* ===== Onionskyn app, part 2: tools and pointer input ===== */
const TOOLS = [
  { id: 'select', k: 'V', n: 'Selection', svg: '<path d="M5 3l10.5 6.5-4.8 1.3-2.5 4.7z"/>', cur: 'default' },
  { id: 'node', k: 'A', n: 'Node edit', svg: '<path d="M5 3l8 5-3.5 1-2 4z"/><rect x="12.5" y="12.5" width="4" height="4"/>', cur: 'default' },
  { sep: 1 },
  { id: 'pen', k: 'P', n: 'Pen (click, or drag for curves; Enter to finish)', svg: '<path d="M3.5 16.5l1.8-5.2 7.6-7.6 3.4 3.4-7.6 7.6z"/><path d="M5.3 11.3l3.4 3.4"/>', cur: 'crosshair' },
  { id: 'pencil', k: 'Y', n: 'Pencil (freehand)', svg: '<path d="M4 16l.8-3.6 8.5-8.5 2.8 2.8-8.5 8.5z"/><path d="M12 5.2l2.8 2.8"/>', cur: 'crosshair' },
  { id: 'brush', k: 'B', n: 'Brush (paints a filled shape; [ and ] change size)', svg: '<path d="M16.5 3.5c-3 .6-6.5 4-8 7l1.5 1.5c3-1.5 6.4-5 7-8.5z"/><path d="M8.3 11.3c-2 0-3.3 1.2-3.3 3.2 0 1-.5 1.6-1.2 2 2.6.6 6-.2 6-3.4"/>', cur: 'crosshair' },
  { id: 'fluid', k: 'F', n: 'Fluid brush (smooth, tapered strokes; [ and ] change size)', svg: '<path d="M16.8 3.2c-4 .2-8.4 3.6-9.6 8.2l1.4 1.4c4.6-1.2 8-5.6 8.2-9.6z"/><path d="M7 12.6c-1.6 0-2.6 1.2-2.6 2.8 0 .8-.4 1.3-1 1.6 2.2.4 4.6-.6 4.6-2.8"/><path d="M10.5 16.5c1.6.4 3.2-.2 5-1.8" stroke-dasharray="1.6 2"/>', cur: 'crosshair' },
  { id: 'eraser', k: 'E', n: 'Eraser (cuts fills and lines on the active layer; [ and ] change size)', svg: '<path d="M7.5 16.5h8"/><path d="M4.2 11.8L11 5l4.2 4.2-6.8 6.8H6z"/><path d="M8 8.2l4.2 4.2"/>', cur: 'crosshair' },
  { id: 'bone', k: 'J', n: 'Bone arm (click shoulder, elbow, then hand; drag the hand to pose it)', svg: '<circle cx="4.5" cy="15" r="2"/><circle cx="10" cy="7" r="2"/><circle cx="16" cy="13" r="2"/><path d="M5.8 13.4l3-4.8M11.6 8l3 3.6"/>', cur: 'crosshair' },
  { id: 'line', k: 'L', n: 'Line (Shift = 45°)', svg: '<path d="M4 16L16 4"/>', cur: 'crosshair' },
  { id: 'rect', k: 'R', n: 'Rectangle (Shift = square, Alt = from centre)', svg: '<rect x="3.5" y="5.5" width="13" height="9" rx="1"/>', cur: 'crosshair' },
  { id: 'ellipse', k: 'O', n: 'Ellipse (Shift = circle, Alt = from centre)', svg: '<ellipse cx="10" cy="10" rx="7" ry="5.5"/>', cur: 'crosshair' },
  { sep: 1 },
  { id: 'text', k: 'T', n: 'Text (click to type; double-click text to edit)', svg: '<path d="M4.5 5V3.5h11V5M10 3.5v13M7.5 16.5h5"/>', cur: 'text' },
  { id: 'bucket', k: 'K', n: 'Paint bucket (Alt = stroke)', svg: '<path d="M4 10l5.5-5.5 6 6-5.5 5.5z"/><path d="M16.5 12.5c0 1.5 1.2 1.9 1.2 3.1a1.2 1.2 0 01-2.4 0c0-1.2 1.2-1.6 1.2-3.1z"/>', cur: 'cell' },
  { id: 'dropper', k: 'I', n: 'Eyedropper (Alt = stroke)', svg: '<path d="M12.5 3.5l4 4-2 2-4-4z"/><path d="M10.5 5.5L4.5 11.5 4 15.5l4-.5 6-6"/>', cur: 'copy' },
  { id: 'hand', k: 'H', n: 'Hand (or hold Space)', svg: '<path d="M7 9.5V5a1.2 1.2 0 012.4 0v3.5V4a1.2 1.2 0 012.4 0v4.5V5a1.2 1.2 0 012.4 0v6.2c0 3-2 5-5 5-2.6 0-3.8-1.5-4.8-3.4L4 10.6a1.2 1.2 0 012-.8z"/>', cur: 'grab' }
];
function buildTools() {
  const box = $('#tools');
  for (const t of TOOLS) {
    if (t.sep) { const s = document.createElement('div'); s.className = 'toolsep'; box.appendChild(s); continue; }
    const b = document.createElement('button');
    b.className = 'tool'; b.dataset.tool = t.id; b.title = t.n + ' (' + t.k + ')'; b.setAttribute('aria-label', t.n); b.setAttribute('aria-pressed', 'false');
    b.innerHTML = '<svg viewBox="0 0 20 20" aria-hidden="true">' + t.svg + '</svg><kbd>' + t.k + '</kbd>';
    b.addEventListener('click', () => setTool(t.id));
    box.appendChild(b);
  }
  const s = document.createElement('div'); s.className = 'toolsep'; box.appendChild(s);
  const sw = document.createElement('div');
  sw.className = 'swatches';
  sw.innerHTML = '<input type="color" id="swStroke" title="Stroke colour" aria-label="Stroke colour"><input type="color" id="swFill" title="Fill colour" aria-label="Fill colour">';
  box.appendChild(sw);
}
function setTool(id) {
  if (S.pen && id !== 'pen') finishPen(false);
  endTextEdit(true);
  S.bone = null;
  S.tool = id; S.draw = null; S.nodeSel = id === 'node' ? S.nodeSel : null;
  $$('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === id)));
  const t = TOOLS.find((x) => x.id === id);
  stage.style.cursor = t ? t.cur : 'default';
  $('#hTool').textContent = t ? t.n.replace(/ \(.*\)/, '') : '';
  { let any = false; $$('#toolopts label').forEach((lb) => { const m = lb.dataset.for.split(' ').includes(id); lb.classList.toggle('on', m); any = any || m; }); $('#toolopts').classList.toggle('on', any); }
  { const was = S.tool0; S.tool0 = id; const tb = $('#tab-brush');
    if (tb) {
      tb.hidden = id !== 'fluid';
      if (id === 'fluid' && was !== 'fluid') { if (S.tab !== 'brush') S.tabBefore = S.tab; }
      else if (id !== 'fluid' && S.tab === 'brush') setTab(S.tabBefore && S.tabBefore !== 'brush' ? S.tabBefore : 'obj');
    } }
  if (id === 'text') autoTab('text'); else if (id === 'fluid') autoTab('brush');
  invalidate();
}

/* ---------- hit testing & creation ---------- */
function hitAt(x, y, tolPx, rigFirst) {
  const tol = tolPx / S.view.z, ls = layers();
  /* a bone arm is a guide laid over artwork, so it is picked last unless asked for first (Alt+click) */
  for (const pass of rigFirst ? [true, false] : [false, true]) {
    for (let i = ls.length - 1; i >= 0; i--) {
      const l = ls[i];
      if (!l.visible || l.locked) continue;
      const objs = C.evalLayerObjs(l, S.frame);
      for (let j = objs.length - 1; j >= 0; j--) if (!!objs[j].rig === pass && hitObj(objs[j], x, y, tol, hctx)) return { lid: l.id, id: objs[j].id, o: objs[j] };
    }
  }
  return null;
}
function canDraw() {
  const l = curLayer();
  if (!l) return false;
  if (l.locked) { toast('This layer is locked. Unlock it to draw.'); return false; }
  if (l.visible === false) { toast('This layer is hidden. Show it to draw.'); return false; }
  return true;
}
function currentPaint(forceStroke) {
  const st = S.style;
  const p = { fill: st.fillOn ? st.fill : null, fa: st.fa, stroke: st.strokeOn ? st.stroke : null, sa: st.sa, sw: st.sw, cap: st.cap, join: st.join };
  if (forceStroke && !p.stroke) { p.stroke = st.stroke; p.sa = 1; }
  if (!p.fill && !p.stroke) { p.stroke = st.stroke; p.sa = 1; }
  return p;
}
function addObject(o) {
  const l = curLayer();
  if (!l || l.locked || l.visible === false) return false;
  pushUndo();
  const kf = C.ensureEditable(l, S.frame);
  kf.objs.push(o);
  S.sel = [{ lid: l.id, id: o.id }];
  commit(); buildLayerList();
  return true;
}
/* freehand strokes: don't select the result, and optionally merge into the previous stroke of the same colour so a drawing stays one shape */
function contourArea(c) { let a = 0; const n = c.nodes; for (let i = 0; i < n.length; i++) { const p = n[i], q = n[(i + 1) % n.length]; a += p.x * q.y - q.x * p.y; } return a / 2; }
function facePositive(cs) { for (const c of cs) if (contourArea(c) < 0) c.nodes.reverse(); return cs; }
function addStroke(o, merge, tag) {
  const l = curLayer();
  if (!l || l.locked || l.visible === false) return false;
  pushUndo();
  const kf = C.ensureEditable(l, S.frame);
  const q = kf.objs[kf.objs.length - 1];
  o.fl = tag;
  if (merge && q && q.kind === 'path' && q.fl === tag && q.fill === o.fill && q.fa === o.fa && !q.stroke && !q.grad && q.t.r === 0 && q.t.sx === 1 && q.t.sy === 1 && (q.op == null || q.op === 1)) {
    for (const c of o.contours) { for (const n of c.nodes) { n.x += o.t.x - q.t.x; n.y += o.t.y - q.t.y; } q.contours.push(c); }
    C.recenter(q);
  } else kf.objs.push(o);
  S.sel = [];
  commit(); buildLayerList();
  return true;
}
function stagePt(e) {
  const r = stage.getBoundingClientRect();
  const sx = e.clientX - r.left, sy = e.clientY - r.top;
  return { sx, sy, w: s2w(sx, sy) };
}

/* ---------- pointer plumbing ---------- */
const ptrs = new Map();
let pinch = null;
stage.addEventListener('pointerleave', () => { if (S.brushHover) { S.brushHover = null; invalidate(); } });
stage.addEventListener('pointerdown', (e) => {
  stage.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) { startPinch(); return; }
  if (ptrs.size > 2) return;
  onDown(e);
});
stage.addEventListener('pointermove', (e) => {
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pinch) { movePinch(); return; }
  onMove(e);
});
const endPtr = (e) => {
  const had = ptrs.delete(e.pointerId);
  if (pinch) { if (ptrs.size < 2) pinch = null; return; }
  if (had) onUp(e);
};
stage.addEventListener('pointerup', endPtr);
stage.addEventListener('pointercancel', endPtr);
stage.addEventListener('dblclick', (e) => onDbl(e));
stage.addEventListener('contextmenu', (e) => e.preventDefault());
stage.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = stagePt(e);
  if (e.ctrlKey || e.metaKey || e.altKey) zoomAt(p.sx, p.sy, Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0025)));
  else { S.view.px -= e.deltaX; S.view.py -= e.deltaY; S.autoFit = false; invalidate(); }
}, { passive: false });
function startPinch() {
  S.drag = null; S.draw = null;
  const [a, b] = Array.from(ptrs.values());
  const r = stage.getBoundingClientRect();
  pinch = { d0: Math.hypot(a.x - b.x, a.y - b.y) || 1, z0: S.view.z, cx0: (a.x + b.x) / 2 - r.left, cy0: (a.y + b.y) / 2 - r.top, px0: S.view.px, py0: S.view.py };
}
function movePinch() {
  const [a, b] = Array.from(ptrs.values());
  const r = stage.getBoundingClientRect();
  const d = Math.hypot(a.x - b.x, a.y - b.y) || 1;
  const cx = (a.x + b.x) / 2 - r.left, cy = (a.y + b.y) / 2 - r.top;
  const z = clamp(pinch.z0 * d / pinch.d0, 0.05, 32);
  const wx = (pinch.cx0 - pinch.px0) / pinch.z0, wy = (pinch.cy0 - pinch.py0) / pinch.z0;
  S.view.z = z; S.view.px = cx - wx * z; S.view.py = cy - wy * z;
  S.autoFit = false;
  updateZoom(); invalidate();
}

function onDown(e) {
  if (S.playing) stopPlay();
  const p = stagePt(e);
  if (e.button === 1 || S.space || S.tool === 'hand') {
    S.drag = { type: 'pan', sx: p.sx, sy: p.sy, px: S.view.px, py: S.view.py };
    stage.style.cursor = 'grabbing';
    return;
  }
  if (e.button !== 0) return;
  S.cursorW = p.w;
  switch (S.tool) {
    case 'select': selDown(e, p); break;
    case 'node': nodeDown(e, p); break;
    case 'pen': penDown(e, p); break;
    case 'pencil': if (canDraw()) S.draw = { type: 'pencil', pts: [p.w] }; break;
    case 'brush': if (canDraw()) S.draw = { type: 'brush', pts: [brushPt(p.w, e)] }; break;
    case 'fluid': if (canDraw()) S.draw = { type: 'fluid', pts: [brushPt(p.w, e)] }; break;
    case 'eraser': if (canDraw()) { S.draw = { type: 'erase', last: p.w, changed: false, undone: false }; eraseSweep(S.draw, p.w, p.w); S.brushHover = p.w; } break;
    case 'line': case 'rect': case 'ellipse': if (canDraw()) S.draw = { type: S.tool, start: p.w, cur: p.w, shift: e.shiftKey, alt: e.altKey }; break;
    case 'bone': boneDown(e, p); break;
    case 'text': textDown(e, p); break;
    case 'bucket': bucketDown(e, p); break;
    case 'dropper': dropperDown(e, p); break;
  }
  invalidate();
}
function onMove(e) {
  const p = stagePt(e);
  S.cursorW = p.w;
  if (S.tool === 'brush' || S.tool === 'fluid') { S.brushHover = p.w; if (!S.draw) invalidate(); }
  if (S.tool === 'eraser') { S.brushHover = p.w; if (!S.draw) invalidate(); }
  $('#hCoord').textContent = 'x ' + Math.round(p.w.x) + '  y ' + Math.round(p.w.y);
  const d = S.drag;
  if (d) {
    if (d.type === 'pan') { S.view.px = d.px + (p.sx - d.sx); S.view.py = d.py + (p.sy - d.sy); S.autoFit = false; invalidate(); return; }
    if (d.type === 'move') moveDrag(p.w, e);
    else if (d.type === 'scale' || d.type === 'rotate') xformDrag(p.w, e);
    else if (d.type === 'marquee') { d.cur = p.w; invalidate(); }
    else if (d.type === 'node') nodeDrag(p.w, e);
    else if (d.type === 'grad') gradDrag(p.w);
    else if (d.type === 'rig') rigDrag(p.w);
    return;
  }
  if (S.draw) {
    const dr = S.draw;
    if (dr.type === 'erase') { if (Math.hypot(p.w.x - dr.last.x, p.w.y - dr.last.y) * S.view.z >= 1.5) { eraseSweep(dr, dr.last, p.w); dr.last = p.w; } S.brushHover = p.w; invalidate(); return; }
    if (dr.type === 'pencil') dr.pts.push(p.w); else if (dr.type === 'brush' || dr.type === 'fluid') dr.pts.push(brushPt(p.w, e)); else { dr.cur = p.w; dr.shift = e.shiftKey; dr.alt = e.altKey; }
    invalidate(); return;
  }
  if (S.bone) invalidate();
  if (S.pen) { penMove(p.w); return; }
  if (S.tool === 'select' && !S.space) {
    const one = singleSel();
    let cur = 'default';
    if (one && !getLayer(one.lid).locked && rigEditing(one.o) && rigHit(one.o, p.sx, p.sy)) cur = 'pointer';
    else if (one && !getLayer(one.lid).locked && gradEditing(one.o)) {
      cur = gradHit(one.o, p.sx, p.sy) ? 'pointer' : hitAt(p.w.x, p.w.y, 5) ? 'move' : 'default';
    } else if (one && !getLayer(one.lid).locked) {
      const h = hitHandle(getHandles(one.o), p.sx, p.sy);
      if (h) cur = h.id === 'rot' ? 'grab' : (h.id === 'n' || h.id === 's') ? 'ns-resize' : (h.id === 'e' || h.id === 'w') ? 'ew-resize' : (h.id === 'nw' || h.id === 'se') ? 'nwse-resize' : 'nesw-resize';
      else if (hitAt(p.w.x, p.w.y, 5)) cur = 'move';
    } else if (hitAt(p.w.x, p.w.y, 5)) cur = 'move';
    stage.style.cursor = cur;
  }
}
function onUp(e) {
  const p = stagePt(e);
  const d = S.drag;
  if (d) {
    C.freeBind.clear();
    if (d.type === 'pan') { const t = TOOLS.find((x) => x.id === S.tool); stage.style.cursor = S.space ? 'grab' : t.cur; }
    if (d.type === 'marquee') marqueeUp(d);
    if ((d.type === 'node' || d.type === 'grad' || d.type === 'rig') && d.started) { commit(); }
    if ((d.type === 'move' || d.type === 'scale' || d.type === 'rotate') && d.started) commit();
    S.drag = null; invalidate();
    return;
  }
  if (S.draw) {
    const dr = S.draw; S.draw = null;
    if (dr.type === 'erase') { if (dr.changed) { S.sel = []; commit(); buildLayerList(); } }
    else if (dr.type === 'pencil') finishPencil(dr.pts);
    else if (dr.type === 'brush') finishBrush(dr.pts);
    else if (dr.type === 'fluid') finishFluid(dr.pts);
    else finishShape(dr);
    invalidate(); return;
  }
  if (S.pen) penUp();
}
function onDbl(e) {
  const p = stagePt(e);
  if (S.tool === 'pen' && S.pen) { finishPen(false); return; }
  if (S.tool === 'node') nodeDbl(p);
  if (S.tool === 'select') {
    const h = hitAt(p.w.x, p.w.y, 5);
    if (h && h.o.kind === 'text') startTextEdit(null, { lid: h.lid, id: h.id });
    else if (h && h.o.kind === 'clip') enterSym(h.o.sym);
    else if (!h && S.edit.length) exitSym();
  }
}
stage.addEventListener('mousedown', (e) => { if (S.tool === 'text') e.preventDefault(); });

/* ---------- text tool ---------- */
let textEd = null;
function textDown(e, p) {
  const h = hitAt(p.w.x, p.w.y, 4);
  if (h && h.o.kind === 'text') startTextEdit(null, { lid: h.lid, id: h.id });
  else startTextEdit(p.w, null);
}
function startTextEdit(w, ex) {
  endTextEdit(true);
  let src = null;
  if (ex) { src = findEval(ex.lid, ex.id); if (!src || src.kind !== 'text') return; if (getLayer(ex.lid).locked) return; }
  else if (!canDraw()) return;
  const st = S.style, r0 = src ? src.runs[0] : { font: st.font, size: st.size, c: st.fillOn ? st.fill : '#000000', b: st.bold, i: st.italic };
  const pos = src ? mapply(matOf(src.t), 0, 0) : [w.x, w.y];
  const sc = src ? Math.abs(src.t.sy) : 1;
  const sp = w2s(pos[0], pos[1]);
  const ta = document.createElement('textarea');
  ta.id = 'textEd'; ta.wrap = 'off'; ta.spellcheck = false; ta.rows = 1;
  ta.value = src ? src.runs.map((r) => r.t).join('') : '';
  ta.style.left = stage.offsetLeft + sp[0] + 'px'; ta.style.top = stage.offsetTop + sp[1] + 'px';
  ta.style.font = (r0.i ? 'italic ' : '') + (r0.b ? 'bold ' : '') + (r0.size * sc * S.view.z) + 'px "' + r0.font + '", Arial, sans-serif';
  ta.style.lineHeight = '1.2'; ta.style.color = r0.c; ta.style.background = src ? S.doc.bg : 'transparent';
  const fit = () => { ta.style.width = '10px'; ta.style.height = '10px'; ta.style.width = Math.max(40, ta.scrollWidth + 8) + 'px'; ta.style.height = Math.max(ta.scrollHeight, 10) + 'px'; };
  ta.addEventListener('input', fit);
  ta.addEventListener('keydown', (ev) => { ev.stopPropagation(); if (ev.key === 'Escape') { ev.preventDefault(); endTextEdit(true); } else if (ev.key === 'Enter' && (ev.ctrlKey || ev.metaKey)) { ev.preventDefault(); endTextEdit(true); } });
  ta.addEventListener('blur', () => endTextEdit(true));
  $('#stagewrap').appendChild(ta);
  textEd = { ta, ex, w, r0 };
  fit();
  setTimeout(() => { ta.focus(); ta.select(); }, 0);
}
function endTextEdit(ok) {
  if (!textEd) return;
  const { ta, ex, w, r0 } = textEd;
  textEd = null;
  const val = ta.value;
  ta.remove();
  if (!ok) return;
  if (ex) {
    const l = getLayer(ex.lid);
    const cur = findEval(ex.lid, ex.id);
    if (!l || !cur || val === cur.runs.map((r) => r.t).join('')) return;
    pushUndo();
    const kf = C.ensureEditable(l, S.frame);
    const o = kf.objs.find((x) => x.id === ex.id);
    if (!o) return;
    if (!val.trim()) { kf.objs.splice(kf.objs.indexOf(o), 1); S.sel = []; } else o.runs = [Object.assign({}, o.runs[0], { t: val })];
    commit(); buildLayerList();
  } else if (val.trim()) {
    const o = { id: uid(), kind: 'text', runs: [{ t: val, font: r0.font, size: r0.size, c: r0.c, b: r0.b, i: r0.i }], align: S.style.align, ls: 0, fill: r0.c, fa: 1, op: 1, t: C.newT() };
    o.t.x = w.x; o.t.y = w.y;
    addObject(o);
    setTool('select');
  }
}

/* ---------- selection tool ---------- */
function selDown(e, p) {
  const w = p.w, one = singleSel();
  if (one && !getLayer(one.lid).locked && rigEditing(one.o)) { const part = rigHit(one.o, p.sx, p.sy); if (part) { S.drag = { type: 'rig', part, lid: one.lid, id: one.id, start: p.w, started: false }; return; } }
  if (one && !getLayer(one.lid).locked && gradEditing(one.o) && gradDown(e, p, one)) { refreshProps(); return; }
  if (one && !getLayer(one.lid).locked && !gradEditing(one.o)) {
    const h = hitHandle(getHandles(one.o), p.sx, p.sy);
    if (h) { S.drag = { type: h.id === 'rot' ? 'rotate' : 'scale', h, start: w, started: false, lid: one.lid, id: one.id }; return; }
  }
  const hit = hitAt(w.x, w.y, 5, e.altKey);
  if (hit) {
    const inSel = S.sel.some((s) => s.lid === hit.lid && s.id === hit.id);
    if (e.shiftKey) S.sel = inSel ? S.sel.filter((s) => !(s.lid === hit.lid && s.id === hit.id)) : S.sel.concat([{ lid: hit.lid, id: hit.id }]);
    else if (!inSel) S.sel = [{ lid: hit.lid, id: hit.id }];
    selectLayer(hit.lid, true);
    S.drag = { type: 'move', start: w, started: false };
  } else {
    const base = e.shiftKey ? S.sel.slice() : [];
    S.sel = base.slice();
    S.drag = { type: 'marquee', start: w, cur: w, base };
  }
  refreshProps();
}
function selLayerIds() { return Array.from(new Set(S.sel.map((s) => s.lid))); }
function beginEdit() {
  pushUndo();
  for (const lid of selLayerIds()) C.ensureEditable(getLayer(lid), S.frame);
}
function moveDrag(w, e) {
  const d = S.drag;
  if (!d.started) {
    if (Math.hypot(w.x - d.start.x, w.y - d.start.y) * S.view.z < 3) return;
    d.started = true; beginEdit();
    d.orig = S.sel.map((s) => { const o = findEditable(s.lid, s.id); return o ? { o, x: o.t.x, y: o.t.y } : null; }).filter(Boolean);
    for (const q of d.orig) if (q.o.bind) C.freeBind.add(q.o.id);
  }
  let dx = w.x - d.start.x, dy = w.y - d.start.y;
  if (e.shiftKey) { if (Math.abs(dx) > Math.abs(dy)) dy = 0; else dx = 0; }
  for (const q of d.orig) { q.o.t.x = q.x + dx; q.o.t.y = q.y + dy; }
  invalidate(); refreshTransformFields();
}
function xformDrag(w, e) {
  const d = S.drag;
  if (!d.started) {
    if (Math.hypot(w.x - d.start.x, w.y - d.start.y) * S.view.z < 2) return;
    pushUndo(); C.ensureEditable(getLayer(d.lid), S.frame);
    const o = findEditable(d.lid, d.id);
    if (!o) { S.drag = null; return; }
    if (o.bind) C.freeBind.add(o.id);
    d.o = o; d.t0 = Object.assign({}, o.t); d.b = localBounds(o); d.M0 = matOf(o.t); d.inv = minv(d.M0); d.started = true;
    const cx = (d.b.x0 + d.b.x1) / 2, cy = (d.b.y0 + d.b.y1) / 2;
    d.C = mapply(d.M0, cx, cy); d.cx = cx; d.cy = cy;
    d.a0 = Math.atan2(d.start.y - d.C[1], d.start.x - d.C[0]);
  }
  const t0 = d.t0, o = d.o, b = d.b;
  if (d.type === 'rotate') {
    const a = Math.atan2(w.y - d.C[1], w.x - d.C[0]);
    let r = t0.r + (a - d.a0) * 180 / Math.PI;
    if (e.shiftKey) r = Math.round(r / 15) * 15;
    const rr = r * Math.PI / 180, c = Math.cos(rr), s = Math.sin(rr);
    o.t.r = r;
    o.t.x = d.C[0] - (c * t0.sx * d.cx - s * t0.sy * d.cy);
    o.t.y = d.C[1] - (s * t0.sx * d.cx + c * t0.sy * d.cy);
  } else {
    const h = d.h, id = h.id, pl = mapply(d.inv, w.x, w.y);
    const mx = id.includes('e') || id.includes('w'), my = id.includes('n') || id.includes('s');
    const ax = e.altKey ? d.cx : (mx ? (h.l[0] === b.x0 ? b.x1 : b.x0) : d.cx);
    const ay = e.altKey ? d.cy : (my ? (h.l[1] === b.y0 ? b.y1 : b.y0) : d.cy);
    let fx = 1, fy = 1;
    if (mx) { const den = h.l[0] - ax; fx = Math.abs(den) < 1e-6 ? 1 : (pl[0] - ax) / den; }
    if (my) { const den = h.l[1] - ay; fy = Math.abs(den) < 1e-6 ? 1 : (pl[1] - ay) / den; }
    if (e.shiftKey && mx && my) { const m = Math.max(Math.abs(fx), Math.abs(fy)); fx = (fx < 0 ? -1 : 1) * m; fy = (fy < 0 ? -1 : 1) * m; }
    let sx = t0.sx * fx, sy = t0.sy * fy;
    if (Math.abs(sx) < 0.001) sx = sx < 0 ? -0.001 : 0.001;
    if (Math.abs(sy) < 0.001) sy = sy < 0 ? -0.001 : 0.001;
    const A = mapply(d.M0, ax, ay), r = t0.r * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    o.t.sx = sx; o.t.sy = sy;
    o.t.x = A[0] - (c * sx * ax - s * sy * ay);
    o.t.y = A[1] - (s * sx * ax + c * sy * ay);
  }
  invalidate(); refreshTransformFields();
}
function marqueeUp(d) {
  const x0 = Math.min(d.start.x, d.cur.x), x1 = Math.max(d.start.x, d.cur.x), y0 = Math.min(d.start.y, d.cur.y), y1 = Math.max(d.start.y, d.cur.y);
  if ((x1 - x0) * S.view.z < 3 && (y1 - y0) * S.view.z < 3) { refreshProps(); return; }
  const out = d.base.slice();
  for (const l of layers()) {
    if (!l.visible || l.locked) continue;
    for (const o of C.evalLayerObjs(l, S.frame)) {
      const b = worldBounds(o);
      if (!b) continue;
      if (b.x1 >= x0 && b.x0 <= x1 && b.y1 >= y0 && b.y0 <= y1 && !out.some((s) => s.lid === l.id && s.id === o.id)) out.push({ lid: l.id, id: o.id });
    }
  }
  S.sel = out; refreshProps();
}

/* ---------- shapes ---------- */
function boxFrom(d) {
  let x0 = d.start.x, y0 = d.start.y, x1 = d.cur.x, y1 = d.cur.y;
  if (d.shift && d.type !== 'line') {
    const w = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    x1 = x0 + (x1 < x0 ? -w : w); y1 = y0 + (y1 < y0 ? -w : w);
  }
  if (d.alt && d.type !== 'line') { x0 = 2 * d.start.x - x1; y0 = 2 * d.start.y - y1; }
  if (d.type === 'line' && d.shift) {
    const dx = x1 - x0, dy = y1 - y0, a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * Math.PI / 4, l = Math.hypot(dx, dy);
    x1 = x0 + Math.cos(a) * l; y1 = y0 + Math.sin(a) * l;
  }
  return { x0, y0, x1, y1, w: Math.abs(x1 - x0), h: Math.abs(y1 - y0), cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}
function finishShape(d) {
  const b = boxFrom(d);
  if (d.type === 'line') {
    if (Math.hypot(b.x1 - b.x0, b.y1 - b.y0) * S.view.z < 3) return;
    const c = { closed: false, nodes: [C.node(b.x0 - b.cx, b.y0 - b.cy), C.node(b.x1 - b.cx, b.y1 - b.cy)] };
    const o = C.mkPath([c], Object.assign(currentPaint(true), { fill: null }), { x: b.cx, y: b.cy });
    addObject(o); return;
  }
  if (b.w * S.view.z < 3 || b.h * S.view.z < 3) return;
  const c = d.type === 'rect' ? C.rectContour(b.w, b.h, S.style.radius) : C.ellipseContour(b.w / 2, b.h / 2);
  addObject(C.mkPath([c], currentPaint(false), { x: b.cx, y: b.cy }));
}
function drawPreview(ctx) {
  const d = S.draw;
  if (d.type === 'erase') return;
  ctx.save(); ctx.strokeStyle = CSSV.accent; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
  if (d.type === 'brush') {
    const cs = brushOutline(d.pts, S.style, S.view.z), p = new Path2D(), st = S.style;
    ctx.setLineDash([]);
    ctx.beginPath();
    for (const c of cs) { c.nodes.forEach((n, i) => { const q = w2s(n.x, n.y); i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]); }); p.closePath(); }
    ctx.fillStyle = st.bcolor; ctx.fill(p, 'nonzero');
  } else if (d.type === 'fluid') {
    const cs = fluidOutline(d.pts, S.style.fb, S.view.z), p = new Path2D();
    ctx.setLineDash([]);
    for (const c of cs) { c.nodes.forEach((n, i) => { const q = w2s(n.x, n.y); i ? p.lineTo(q[0], q[1]) : p.moveTo(q[0], q[1]); }); p.closePath(); }
    ctx.globalAlpha = S.style.fb.alpha / 100; ctx.fillStyle = S.style.fb.color; ctx.fill(p, 'nonzero');
  } else if (d.type === 'pencil') {
    ctx.beginPath();
    d.pts.forEach((p, i) => { const q = w2s(p.x, p.y); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
    ctx.stroke();
  } else {
    const b = boxFrom(d), a = w2s(b.x0, b.y0), c = w2s(b.x1, b.y1);
    ctx.beginPath();
    if (d.type === 'line') { ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); }
    else if (d.type === 'rect') ctx.rect(Math.min(a[0], c[0]), Math.min(a[1], c[1]), Math.abs(c[0] - a[0]), Math.abs(c[1] - a[1]));
    else ctx.ellipse((a[0] + c[0]) / 2, (a[1] + c[1]) / 2, Math.abs(c[0] - a[0]) / 2, Math.abs(c[1] - a[1]) / 2, 0, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

/* ---------- pencil ---------- */
function rdp(pts, tol) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let md = 0, mi = -1;
    const A = pts[a], B = pts[b], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy);
    for (let i = a + 1; i < b; i++) {
      const P = pts[i];
      const dd = L < 1e-9 ? Math.hypot(P.x - A.x, P.y - A.y) : Math.abs(dy * P.x - dx * P.y + B.x * A.y - B.y * A.x) / L;
      if (dd > md) { md = dd; mi = i; }
    }
    if (md > tol && mi > 0) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function smoothNodes(pts, closed) {
  const n = pts.length;
  return pts.map((p, i) => {
    const prev = pts[i === 0 ? (closed ? n - 1 : 0) : i - 1], next = pts[i === n - 1 ? (closed ? 0 : n - 1) : i + 1];
    const tx = (next.x - prev.x) / 6, ty = (next.y - prev.y) / 6;
    const end = !closed && (i === 0 || i === n - 1);
    return { x: p.x, y: p.y, ix: end && i === 0 ? 0 : -tx, iy: end && i === 0 ? 0 : -ty, ox: end && i === n - 1 ? 0 : tx, oy: end && i === n - 1 ? 0 : ty, s: true };
  });
}
function finishPencil(raw) {
  if (raw.length < 2) return;
  const tol = lerp(0.6, 7, S.style.smooth / 100) / S.view.z;
  let pts = rdp(raw, tol);
  if (pts.length < 2) return;
  const first = pts[0], last = pts[pts.length - 1];
  let closed = false;
  if (pts.length > 3 && Math.hypot(first.x - last.x, first.y - last.y) * S.view.z < 10) { closed = true; pts = pts.slice(0, -1); }
  const nodes = pts.length === 2 ? pts.map((p) => C.node(p.x, p.y)) : smoothNodes(pts, closed);
  const paint = currentPaint(true);
  if (!closed) paint.fill = null;
  const o = C.mkPath([{ closed, nodes }], paint);
  C.recenter(o);
  addObject(o);
}


/* ---------- brush: sweeps a convex nib along the stroke and fills the outline (nonzero) ---------- */
const BRUSH_SHAPES = [['round', 'Round'], ['square', 'Square'], ['diamond', 'Diamond'], ['ovalh', 'Oval wide'], ['ovalv', 'Oval tall'], ['flat', 'Calligraphy (flat)']];
function nibOf(shape, base, angle) {
  const n = clamp(Math.round(8 + Math.sqrt(Math.max(base, 1)) * 4), 12, 40);
  const ell = (rx, ry, rot) => Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry, c = Math.cos(rot), s = Math.sin(rot); return [x * c - y * s, x * s + y * c]; });
  let V;
  switch (shape) {
    case 'square': V = [[-1, -1], [1, -1], [1, 1], [-1, 1]]; break;
    case 'diamond': V = [[0, -1.3], [1.3, 0], [0, 1.3], [-1.3, 0]]; break;
    case 'ovalh': V = ell(1, 0.42, 0); break;
    case 'ovalv': V = ell(0.42, 1, 0); break;
    case 'flat': V = ell(1.2, 0.17, 0); break;
    default: V = ell(1, 1, 0);
  }
  if (angle && shape !== 'round') { const r = angle * Math.PI / 180, c = Math.cos(r), sn = Math.sin(r); V = V.map((v) => [v[0] * c - v[1] * sn, v[0] * sn + v[1] * c]); }
  return V;
}
function brushPt(w, e) { return { x: w.x, y: w.y, pr: e && e.pointerType === 'pen' ? clamp(e.pressure || 0.5, 0.02, 1) : 1, t: e && e.timeStamp ? e.timeStamp : undefined }; }
function brushOutline(raw, st, z) {
  const base = Math.max(0.5, st.bsize / 2), V = nibOf(st.bshape, base, st.bangle), K = V.length;
  const sc = (p) => (st.bpress ? lerp(0.15, 1, p.pr == null ? 1 : p.pr) : 1);
  const pt = (p, k) => ({ x: p.x + V[k][0] * base * sc(p), y: p.y + V[k][1] * base * sc(p) });
  const sup = (nx, ny) => { let bk = 0, bd = -1e18; for (let k = 0; k < K; k++) { const d = V[k][0] * nx + V[k][1] * ny; if (d > bd + 1e-9) { bd = d; bk = k; } } return bk; };
  const asNodes = (pts) => ({ closed: true, nodes: pts.map((q) => C.node(q.x, q.y)) });
  /* resample evenly */
  const step = Math.max(1.5 / z, st.bsize * 0.15), hy = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  let a = { x: raw[0].x, y: raw[0].y, pr: raw[0].pr == null ? 1 : raw[0].pr }, need = step;
  let R = [a];
  for (let i = 1; i < raw.length; i++) {
    const b = { x: raw[i].x, y: raw[i].y, pr: raw[i].pr == null ? 1 : raw[i].pr };
    let d = hy(a, b);
    while (d >= need && d > 1e-9) { const t = need / d; a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, pr: lerp(a.pr, b.pr, t) }; R.push(a); d = hy(a, b); need = step; }
    need -= d; a = b;
  }
  const last = raw[raw.length - 1];
  if (hy(R[R.length - 1], last) > step * 0.25) R.push({ x: last.x, y: last.y, pr: last.pr == null ? 1 : last.pr });
  if (R.length < 2) return [asNodes(V.map((_, k) => pt(R[0], k)))];
  for (let k = 0, n = Math.round(st.smooth / 100 * 6); k < n && R.length > 2; k++) {
    const Q = R; R = Q.map((p, i) => (i === 0 || i === Q.length - 1 ? p : { x: (Q[i - 1].x + 2 * p.x + Q[i + 1].x) / 4, y: (Q[i - 1].y + 2 * p.y + Q[i + 1].y) / 4, pr: p.pr }));
  }
  R = rdp(R, Math.max(0.3 / z, st.bsize * 0.015) * (1 + st.smooth / 40));
  return sweepNib(R, V, base, sc, asNodes);
}
/* sweeps convex nib V (scaled by base * sc(point)) along polyline Q and returns the filled outline contour */
function sweepNib(R, V, base, sc, asNodes) {
  const K = V.length, hy = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const pt = (p, k) => ({ x: p.x + V[k][0] * base * sc(p), y: p.y + V[k][1] * base * sc(p) });
  const sup = (nx, ny) => { let bk = 0, bd = -1e18; for (let k = 0; k < K; k++) { const d = V[k][0] * nx + V[k][1] * ny; if (d > bd + 1e-9) { bd = d; bk = k; } } return bk; };
  const walk = (Q) => {
    const out = [], segs = [];
    for (let i = 0; i + 1 < Q.length; i++) { const L = hy(Q[i], Q[i + 1]); if (L < 1e-9) continue; const dx = (Q[i + 1].x - Q[i].x) / L, dy = (Q[i + 1].y - Q[i].y) / L; segs.push({ i, dx, dy, a: sup(dy, -dx) }); }
    segs.forEach((sg, j) => {
      out.push(pt(Q[sg.i], sg.a), pt(Q[sg.i + 1], sg.a));
      const nx = segs[j + 1];
      if (nx) {
        const cross = sg.dx * nx.dy - sg.dy * nx.dx, P = Q[sg.i + 1];
        if (cross > 1e-6) { let k = sg.a; while (k !== nx.a) { k = (k + 1) % K; if (k !== nx.a) out.push(pt(P, k)); } }
        else if (cross < -1e-6) out.push({ x: P.x, y: P.y });
      } else {
        const P = Q[sg.i + 1], b = sup(-sg.dy, sg.dx);
        let k = sg.a; while (k !== b) { k = (k + 1) % K; if (k !== b) out.push(pt(P, k)); }
      }
    });
    return out;
  };
  const pts = walk(R).concat(walk(R.slice().reverse()));
  const clean = pts.filter((q, i) => i === 0 || Math.abs(q.x - pts[i - 1].x) + Math.abs(q.y - pts[i - 1].y) > 1e-6);
  return [asNodes(clean)];
}

function finishBrush(raw) {
  if (!raw.length) return;
  const st = S.style, cs = brushOutline(raw, st, S.view.z);
  facePositive(cs);
  const o = C.mkPath(cs, { fill: st.bcolor, fa: 1, stroke: null, sw: 0 });
  o.nz = true;
  C.recenter(o);
  addStroke(o, st.bmerge !== false, 'b');
}
/* ---------- fluid brush: stabilised, smoothed, tapered variable-width strokes ---------- */
const FB_DEFAULT = { size: 12, stab: 25, smooth: 50, round: 100, angle: 0, taper: 25, vel: 0, press: 100, zoom: true, color: '#1B2030', alpha: 100, merge: true };
function fbSize(fb, z) { return Math.max(0.3, fb.zoom ? fb.size : fb.size / z); }
function fbNib(fb) {
  const n = 28, ry = clamp(fb.round / 100, 0.06, 1), rot = (fb.angle || 0) * Math.PI / 180, c = Math.cos(rot), sn = Math.sin(rot);
  return Array.from({ length: n }, (_, i) => { const a = i / n * Math.PI * 2, x = Math.cos(a), y = Math.sin(a) * ry; return [x * c - y * sn, x * sn + y * c]; });
}
/* lazy-rope stabiliser: the brush follows the pointer at the end of a rope of length stab */
function fbStabilize(raw, ropeLen) {
  const out = [{ x: raw[0].x, y: raw[0].y, pr: raw[0].pr, t: raw[0].t }];
  if (ropeLen <= 1e-9) { for (let i = 1; i < raw.length; i++) out.push({ x: raw[i].x, y: raw[i].y, pr: raw[i].pr, t: raw[i].t }); return out; }
  let b = { x: raw[0].x, y: raw[0].y };
  for (let i = 1; i < raw.length; i++) {
    const p = raw[i], d = Math.hypot(p.x - b.x, p.y - b.y);
    if (d > ropeLen) { const k = (d - ropeLen) / d; b = { x: b.x + (p.x - b.x) * k, y: b.y + (p.y - b.y) * k }; out.push({ x: b.x, y: b.y, pr: p.pr, t: p.t }); }
  }
  const l = raw[raw.length - 1], e = out[out.length - 1];
  if (Math.hypot(l.x - e.x, l.y - e.y) > 1e-6) out.push({ x: l.x, y: l.y, pr: l.pr, t: l.t });
  return out;
}
function fbRdp(pts, tolG, tolW) {
  if (pts.length < 3) return pts.slice();
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let md = 0, mi = -1;
    const A = pts[a], B = pts[b], dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), ds = B.s - A.s;
    for (let i = a + 1; i < b; i++) {
      const P = pts[i];
      const g = L < 1e-9 ? Math.hypot(P.x - A.x, P.y - A.y) : Math.abs(dy * P.x - dx * P.y + B.x * A.y - B.y * A.x) / L;
      const kk = A.k + (B.k - A.k) * (ds > 1e-9 ? (P.s - A.s) / ds : 0);
      const dd = Math.max(g / tolG, Math.abs(P.k - kk) / tolW);
      if (dd > md) { md = dd; mi = i; }
    }
    if (md > 1 && mi > 0) { keep[mi] = 1; stack.push([a, mi], [mi, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}
function fluidOutline(raw, fb, z) {
  fb = Object.assign({}, FB_DEFAULT, fb || {});
  const size = fbSize(fb, z), base = size / 2, V = fbNib(fb);
  const asNodes = (pts) => ({ closed: true, nodes: pts.map((q) => C.node(q.x, q.y)) });
  const hy = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const P = clamp(fb.press, 0, 100) / 100, VEL = clamp(fb.vel, -100, 100) / 100;
  const pf = (pr) => clamp(1 - P * (1 - (pr == null ? 1 : pr)), 0.08, 1);
  const st = fbStabilize(raw, clamp(fb.stab, 0, 100) / 100 * 40 / z);
  /* resample evenly, carrying pressure and time */
  let total = 0; for (let i = 1; i < st.length; i++) total += hy(st[i - 1], st[i]);
  const step = Math.max(1 / z, size * 0.08, total / 3000);
  const mk = (q) => ({ x: q.x, y: q.y, pr: q.pr == null ? 1 : q.pr, t: q.t });
  let a = mk(st[0]), need = step; let R = [a];
  const lt = (u, v, t) => (u == null || v == null ? undefined : u + (v - u) * t);
  for (let i = 1; i < st.length; i++) {
    const b = mk(st[i]);
    let d = hy(a, b);
    while (d >= need && d > 1e-9) { const t = need / d; a = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, pr: lerp(a.pr, b.pr, t), t: lt(a.t, b.t, t) }; R.push(a); d = hy(a, b); need = step; }
    need -= d; a = b;
  }
  const lastP = mk(st[st.length - 1]);
  if (hy(R[R.length - 1], lastP) > step * 0.2 || R.length < 2) R.push(lastP);
  if (R.length < 2 || total < 1e-6) { const q = R[0]; return [asNodes(V.map((v) => ({ x: q.x + v[0] * base * pf(q.pr), y: q.y + v[1] * base * pf(q.pr) })))]; }
  /* curve smoothing: relax the path, keeping both ends */
  const sigma = clamp(fb.smooth, 0, 100) / 100 * (10 / z + size * 0.6);
  for (let k = 0, n = Math.min(600, Math.round(2 * (sigma / step) * (sigma / step))); k < n && R.length > 2; k++) {
    const Q = R; R = Q.map((p, i) => (i === 0 || i === Q.length - 1 ? p : { x: (Q[i - 1].x + 2 * p.x + Q[i + 1].x) / 4, y: (Q[i - 1].y + 2 * p.y + Q[i + 1].y) / 4, pr: p.pr, t: p.t }));
  }
  /* arc length, speed (screen px per ms; needs timestamps) */
  R[0].s = 0; for (let i = 1; i < R.length; i++) R[i].s = R[i - 1].s + hy(R[i - 1], R[i]);
  const L = R[R.length - 1].s;
  let sp = R.map((p, i) => { const u = R[Math.max(0, i - 2)], v = R[Math.min(R.length - 1, i + 2)]; const dt = (u.t != null && v.t != null) ? v.t - u.t : 0; return dt > 0 ? hy(u, v) * z / dt : 0; });
  for (let k = 0; k < 3; k++) sp = sp.map((v, i) => (sp[Math.max(0, i - 1)] + v + sp[Math.min(sp.length - 1, i + 1)]) / 3);
  const tl = clamp(fb.taper, 0, 100) / 100 * L / 2, ss = (x) => x * x * (3 - 2 * x);
  R.forEach((p, i) => {
    const vn = clamp(sp[i] / 2, 0, 1), vf = VEL >= 0 ? 1 - VEL * vn * 0.85 : 1 + (-VEL) * vn * 0.6;
    const tf = tl > 1e-9 ? Math.max(0.04, ss(clamp(Math.min(p.s, L - p.s) / tl, 0, 1))) : 1;
    p.k = clamp(pf(p.pr) * vf * tf, 0.03, 2);
  });
  R = fbRdp(R, Math.max(0.2 / z, size * 0.01), Math.max(0.01, 0.2 / z / base));
  R.forEach((p) => { p.pr = p.k; });
  return sweepNib(R, V, base, (p) => p.pr, asNodes);
}
function finishFluid(raw) {
  if (!raw.length) return;
  const fb = S.style.fb, cs = fluidOutline(raw, fb, S.view.z);
  facePositive(cs);
  const o = C.mkPath(cs, { fill: fb.color, fa: fb.alpha / 100, stroke: null, sw: 0 });
  o.nz = true;
  C.recenter(o);
  addStroke(o, fb.merge !== false, 'f');
}

function drawBrushCursor(ctx) {
  const w = S.brushHover, st = S.style;
  if (!w || (S.tool !== 'brush' && S.tool !== 'fluid') || S.space || (S.draw && (S.draw.type === 'brush' || S.draw.type === 'fluid'))) return;
  const fl = S.tool === 'fluid';
  const V = fl ? fbNib(st.fb) : nibOf(st.bshape, st.bsize / 2, st.bangle), r = fl ? fbSize(st.fb, S.view.z) / 2 : st.bsize / 2;
  ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath();
  V.forEach((v, i) => { const q = w2s(w.x + v[0] * r, w.y + v[1] * r); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.stroke();
  ctx.strokeStyle = 'rgba(20,24,40,.85)'; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.restore();
}

/* ---------- pen ---------- */
function penDown(e, p) {
  if (!canDraw()) return;
  const P = S.pen || (S.pen = { nodes: [], hover: p.w, drag: null });
  const w = p.w;
  if (P.nodes.length >= 2) {
    const f = P.nodes[0];
    if (Math.hypot(f.x - w.x, f.y - w.y) * S.view.z < 9) { finishPen(true); return; }
  }
  const n = { x: w.x, y: w.y, ix: 0, iy: 0, ox: 0, oy: 0 };
  P.nodes.push(n); P.drag = n;
}
function penMove(w) {
  const P = S.pen;
  P.hover = w;
  if (P.drag) {
    const n = P.drag;
    if (Math.hypot(w.x - n.x, w.y - n.y) * S.view.z > 3) { n.ox = w.x - n.x; n.oy = w.y - n.y; n.ix = -n.ox; n.iy = -n.oy; n.s = true; }
  }
  invalidate();
}
function penUp() { if (S.pen) S.pen.drag = null; }
function finishPen(closed) {
  const P = S.pen;
  S.pen = null;
  if (!P) return;
  let nodes = P.nodes;
  if (nodes.length >= 2) {
    const a = nodes[nodes.length - 1], b = nodes[nodes.length - 2];
    if (Math.hypot(a.x - b.x, a.y - b.y) * S.view.z < 3) nodes = nodes.slice(0, -1);
  }
  if (nodes.length < 2) { invalidate(); return; }
  const paint = currentPaint(!closed);
  if (!closed) paint.fill = null;
  const o = C.mkPath([{ closed, nodes }], paint);
  C.recenter(o);
  addObject(o);
}
function cancelPen() { S.pen = null; invalidate(); }
function drawPenPreview(ctx) {
  const P = S.pen;
  if (!P.nodes.length) return;
  ctx.save(); ctx.strokeStyle = CSSV.accent; ctx.lineWidth = 1.5; ctx.fillStyle = CSSV.accentFg;
  const pt = (x, y) => w2s(x, y);
  ctx.beginPath();
  const n0 = P.nodes[0], s0 = pt(n0.x, n0.y);
  ctx.moveTo(s0[0], s0[1]);
  for (let i = 0; i < P.nodes.length - 1; i++) {
    const a = P.nodes[i], b = P.nodes[i + 1];
    const c1 = pt(a.x + a.ox, a.y + a.oy), c2 = pt(b.x + b.ix, b.y + b.iy), e = pt(b.x, b.y);
    ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], e[0], e[1]);
  }
  const last = P.nodes[P.nodes.length - 1];
  if (!P.drag && P.hover) {
    const c1 = pt(last.x + last.ox, last.y + last.oy), h = pt(P.hover.x, P.hover.y);
    ctx.bezierCurveTo(c1[0], c1[1], h[0], h[1], h[0], h[1]);
  }
  ctx.stroke();
  P.nodes.forEach((n, i) => {
    const p = pt(n.x, n.y);
    if (n.ox || n.oy) {
      for (const k of [[n.x + n.ox, n.y + n.oy], [n.x + n.ix, n.y + n.iy]]) { const q = pt(k[0], k[1]); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); ctx.beginPath(); ctx.arc(q[0], q[1], 3.5, 0, 6.3); ctx.fill(); ctx.stroke(); }
    }
    ctx.beginPath(); ctx.rect(p[0] - 4, p[1] - 4, 8, 8);
    ctx.fillStyle = i === 0 ? CSSV.accent : CSSV.accentFg; ctx.fill(); ctx.stroke(); ctx.fillStyle = CSSV.accentFg;
  });
  ctx.restore();
}

/* ---------- node edit tool ---------- */
function nodeDown(e, p) {
  const one = singleSel();
  if (one && one.o.rig) { toast('A bone arm is posed with the Selection tool: drag its hand, elbow or shoulder.'); return; }
  if (one && one.o.kind === 'path' && !getLayer(one.lid).locked) {
    const hit = hitNodePart(one.o, p.sx, p.sy);
    if (hit) {
      S.nodeSel = { ci: hit.ci, ni: hit.ni };
      S.drag = { type: 'node', part: hit.part, ci: hit.ci, ni: hit.ni, lid: one.lid, id: one.id, start: p.w, started: false };
      refreshProps(); return;
    }
  }
  const h = hitAt(p.w.x, p.w.y, 6);
  if (h && h.o.kind === 'path') { S.sel = [{ lid: h.lid, id: h.id }]; selectLayer(h.lid, true); }
  else if (h) toast('Ungroup (Ctrl+Shift+G) to edit nodes inside a group.');
  else S.sel = [];
  S.nodeSel = null; refreshProps();
}
function hitNodePart(o, sx, sy) {
  const near = (a) => Math.hypot(a[0] - sx, a[1] - sy) <= 9;
  if (S.nodeSel) {
    const n = o.contours[S.nodeSel.ci] && o.contours[S.nodeSel.ci].nodes[S.nodeSel.ni];
    if (n) {
      if ((n.ox || n.oy) && near(nodeScreen(o, n, 'out'))) return { ci: S.nodeSel.ci, ni: S.nodeSel.ni, part: 'out' };
      if ((n.ix || n.iy) && near(nodeScreen(o, n, 'in'))) return { ci: S.nodeSel.ci, ni: S.nodeSel.ni, part: 'in' };
    }
  }
  for (let ci = 0; ci < o.contours.length; ci++) for (let ni = 0; ni < o.contours[ci].nodes.length; ni++) if (near(nodeScreen(o, o.contours[ci].nodes[ni], 'anchor'))) return { ci, ni, part: 'anchor' };
  return null;
}
function nodeDrag(w, e) {
  const d = S.drag;
  if (!d.started) {
    if (Math.hypot(w.x - d.start.x, w.y - d.start.y) * S.view.z < 2) return;
    pushUndo(); C.ensureEditable(getLayer(d.lid), S.frame);
    const o = findEditable(d.lid, d.id);
    if (!o) { S.drag = null; return; }
    d.o = o; d.inv = minv(matOf(o.t));
    const n = o.contours[d.ci].nodes[d.ni];
    d.n = n; d.n0 = Object.assign({}, n);
    if (!n.ix && !n.iy && !n.ox && !n.oy && d.part !== 'anchor') n.s = true;
    d.p0 = mapply(d.inv, d.start.x, d.start.y);
    d.started = true;
  }
  const pl = mapply(d.inv, w.x, w.y), n = d.n;
  if (d.part === 'anchor') { n.x = d.n0.x + pl[0] - d.p0[0]; n.y = d.n0.y + pl[1] - d.p0[1]; }
  else {
    const hx = pl[0] - n.x, hy = pl[1] - n.y;
    const mine = d.part === 'out' ? 'o' : 'i', other = d.part === 'out' ? 'i' : 'o';
    n[mine + 'x'] = hx; n[mine + 'y'] = hy;
    if (n.s && !e.altKey) {
      const l2 = Math.hypot(hx, hy) || 1, L = Math.hypot(n[other + 'x'], n[other + 'y']) || l2;
      n[other + 'x'] = -hx / l2 * L; n[other + 'y'] = -hy / l2 * L;
    } else if (e.altKey) n.s = false;
  }
  invalidate();
}
function nodeNeighbors(c, ni) {
  const n = c.nodes.length;
  return [c.nodes[ni === 0 ? (c.closed ? n - 1 : 0) : ni - 1], c.nodes[ni === n - 1 ? (c.closed ? 0 : n - 1) : ni + 1]];
}
function nodeDbl(p) {
  const one = singleSel();
  if (!one || one.o.kind !== 'path' || getLayer(one.lid).locked) return;
  const hit = hitNodePart(one.o, p.sx, p.sy);
  if (hit && hit.part === 'anchor') {
    pushUndo(); C.ensureEditable(getLayer(one.lid), S.frame);
    const o = findEditable(one.lid, one.id), c = o.contours[hit.ci], n = c.nodes[hit.ni];
    const nb = nodeNeighbors(c, hit.ni);
    if (n.ix || n.iy || n.ox || n.oy) { n.ix = n.iy = n.ox = n.oy = 0; n.s = false; }
    else {
      let tx = nb[1].x - nb[0].x, ty = nb[1].y - nb[0].y;
      const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
      const dp = Math.hypot(n.x - nb[0].x, n.y - nb[0].y) / 3, dn = Math.hypot(nb[1].x - n.x, nb[1].y - n.y) / 3;
      n.ix = -tx * dp; n.iy = -ty * dp; n.ox = tx * dn; n.oy = ty * dn; n.s = true;
    }
    S.nodeSel = { ci: hit.ci, ni: hit.ni };
    commit(); return;
  }
  if (hit) return;
  const m = minv(matOf(one.o.t)), lp = mapply(m, p.w.x, p.w.y);
  const sc = Math.max(Math.abs(one.o.t.sx), Math.abs(one.o.t.sy), 1e-6), tol = 8 / (S.view.z * sc);
  let best = null;
  one.o.contours.forEach((c, ci) => {
    const cnt = c.closed ? c.nodes.length : c.nodes.length - 1;
    for (let i = 0; i < cnt; i++) {
      const a = c.nodes[i], b = c.nodes[(i + 1) % c.nodes.length];
      for (let k = 1; k < 40; k++) {
        const q = C.bezPt(a, b, k / 40), dd = Math.hypot(q[0] - lp[0], q[1] - lp[1]);
        if (dd < tol && (!best || dd < best.d)) best = { ci, i, t: k / 40, d: dd };
      }
    }
  });
  if (!best) return;
  pushUndo(); C.ensureEditable(getLayer(one.lid), S.frame);
  const o = findEditable(one.lid, one.id), c = o.contours[best.ci];
  const j = (best.i + 1) % c.nodes.length;
  const r = C.splitSeg(c.nodes[best.i], c.nodes[j], best.t);
  c.nodes[best.i] = r[0]; c.nodes[j] = r[2];
  c.nodes.splice(best.i + 1, 0, r[1]);
  S.nodeSel = { ci: best.ci, ni: best.i + 1 };
  commit();
}
function deleteNode() {
  const one = singleSel();
  if (!one || !S.nodeSel || one.o.kind !== 'path') return false;
  pushUndo(); C.ensureEditable(getLayer(one.lid), S.frame);
  const o = findEditable(one.lid, one.id), c = o.contours[S.nodeSel.ci];
  if (!c) return false;
  c.nodes.splice(S.nodeSel.ni, 1);
  if (c.nodes.length < 2) o.contours.splice(S.nodeSel.ci, 1);
  S.nodeSel = null;
  if (!o.contours.length) { const kf = C.kfFor(getLayer(one.lid), S.frame); kf.objs.splice(kf.objs.indexOf(o), 1); S.sel = []; }
  commit(); return true;
}

/* ---------- gradients: creation, canvas handles, stops ---------- */
const GR = 819.2;
function makeGrad(type, contours, c1, c2) {
  const b = C.contoursBounds(contours);
  if (!b) return null;
  const w = Math.max(b.x1 - b.x0, 1), h = Math.max(b.y1 - b.y0, 1), cx = (b.x0 + b.x1) / 2, cy = (b.y0 + b.y1) / 2;
  const k = Math.max(w, h) / (GR * 2);
  const m = type === 'radial' ? [k, 0, 0, k, cx, cy] : [w / (GR * 2), 0, 0, h / (GR * 2), cx, cy];
  return { type, stops: [{ o: 0, c: c1, a: 1 }, { o: 1, c: c2 === c1 ? '#FFFFFF' : c2, a: 1 }], m };
}
function gradColorAt(stops, t) {
  const s = stops.slice().sort((a, b) => a.o - b.o);
  if (t <= s[0].o) return { c: s[0].c, a: C.nz(s[0].a, 1) };
  for (let i = 1; i < s.length; i++) if (t <= s[i].o) {
    const u = (t - s[i - 1].o) / Math.max(1e-9, s[i].o - s[i - 1].o);
    return { c: C.lerpHex(s[i - 1].c, s[i].c, u), a: C.nz(s[i - 1].a, 1) + (C.nz(s[i].a, 1) - C.nz(s[i - 1].a, 1)) * u };
  }
  const l = s[s.length - 1]; return { c: l.c, a: C.nz(l.a, 1) };
}
const gradEditing = (o) => S.style.gradEdit !== false && o && o.kind === 'path' && o.grad && Math.abs(o.grad.m[0] * o.grad.m[3] - o.grad.m[1] * o.grad.m[2]) > 1e-12;
function gradPts(o) {
  const g = o.grad, M = matOf(o.t);
  const W = (x, y) => { const a = mapply(g.m, x, y), b = mapply(M, a[0], a[1]); return { x: b[0], y: b[1] }; };
  const out = [], rad = g.type === 'radial';
  if (rad) { out.push(Object.assign({ id: 'c' }, W(0, 0)), Object.assign({ id: 'r' }, W(GR, 0)), Object.assign({ id: 'y' }, W(0, GR))); }
  else out.push(Object.assign({ id: 'a' }, W(-GR, 0)), Object.assign({ id: 'b' }, W(GR, 0)));
  g.stops.forEach((s, i) => { if (s.o > 0.001 && s.o < 0.999) out.push(Object.assign({ id: 's', i, c: s.c }, rad ? W(s.o * GR, 0) : W(-GR + s.o * 2 * GR, 0))); });
  return out;
}
function drawGradHandles(ctx, o) {
  const pts = gradPts(o), g = o.grad, acc = CSSV.accent, sc = (q) => w2s(q.x, q.y);
  const by = (id) => pts.find((q) => q.id === id);
  ctx.save(); ctx.lineWidth = 1.5; ctx.strokeStyle = acc;
  const line = (a, b) => { const p = sc(a), q = sc(b); ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke(); };
  if (g.type === 'radial') {
    const c = by('c'), r = by('r'), y = by('y'); line(c, r); line(c, y);
    const M = matOf(o.t); ctx.beginPath();
    for (let i = 0; i <= 48; i++) { const a = i / 48 * Math.PI * 2, u = mapply(g.m, Math.cos(a) * GR, Math.sin(a) * GR), w = mapply(M, u[0], u[1]), s = w2s(w[0], w[1]); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); }
    ctx.setLineDash([4, 3]); ctx.stroke(); ctx.setLineDash([]);
  } else line(by('a'), by('b'));
  for (const q of pts) {
    const p = sc(q); ctx.beginPath();
    if (q.id === 's') { ctx.rect(p[0] - 5, p[1] - 5, 10, 10); ctx.fillStyle = q.c; }
    else {
      ctx.arc(p[0], p[1], q.id === 'y' ? 4 : 6, 0, Math.PI * 2);
      const first = q.id === 'a' || q.id === 'c', last = g.stops.slice().sort((a, b) => a.o - b.o);
      ctx.fillStyle = q.id === 'a' || q.id === 'c' ? last[0].c : q.id === 'y' ? CSSV.accentFg : last[last.length - 1].c;
    }
    ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = acc; ctx.stroke();
  }
  ctx.restore();
}
function gradHit(o, sx, sy) {
  const pts = gradPts(o), near = (q) => { const p = w2s(q.x, q.y); return Math.hypot(p[0] - sx, p[1] - sy) <= 9; };
  return pts.filter((q) => q.id === 's').find(near) || pts.find((q) => q.id !== 's' && near(q)) || null;
}
function gradDown(e, p, one) {
  const o = one.o;
  if (!gradEditing(o)) return false;
  const hit = gradHit(o, p.sx, p.sy);
  if (hit) {
    if (hit.id === 's' && e.altKey && o.grad.stops.length > 2) {
      pushUndo(); C.ensureEditable(getLayer(one.lid), S.frame);
      const eo = findEditable(one.lid, one.id); if (!eo || !eo.grad) return true;
      eo.grad.stops.splice(hit.i, 1); commit(); return true;
    }
    S.drag = { type: 'grad', part: hit.id, i: hit.i, lid: one.lid, id: one.id, start: p.w, started: false };
    return true;
  }
  /* click on the gradient line: add a stop there */
  const pts = gradPts(o), g = o.grad, rad = g.type === 'radial';
  const A = pts.find((q) => q.id === (rad ? 'c' : 'a')), B = pts.find((q) => q.id === (rad ? 'r' : 'b'));
  const a = w2s(A.x, A.y), b = w2s(B.x, B.y), dx = b[0] - a[0], dy = b[1] - a[1], L2 = dx * dx + dy * dy;
  if (L2 < 1) return false;
  const t = ((p.sx - a[0]) * dx + (p.sy - a[1]) * dy) / L2;
  if (t < 0 || t > 1 || Math.hypot(a[0] + dx * t - p.sx, a[1] + dy * t - p.sy) > 6) return false;
  pushUndo(); C.ensureEditable(getLayer(one.lid), S.frame);
  const eo = findEditable(one.lid, one.id); if (!eo || !eo.grad) return true;
  const col = gradColorAt(eo.grad.stops, t);
  eo.grad.stops.push({ o: t, c: col.c, a: col.a });
  eo.grad.stops.sort((u, v) => u.o - v.o);
  const i = eo.grad.stops.findIndex((s) => s.o === t);
  S.drag = { type: 'grad', part: 's', i, lid: one.lid, id: one.id, start: p.w, started: true, fresh: true };
  const eo2 = eo; S.drag.o = eo2; S.drag.inv = minv(matOf(eo2.t)); S.drag.m0 = eo2.grad.m.slice();
  commit();
  return true;
}
function gradDrag(w) {
  const d = S.drag;
  if (!d.started) {
    if (Math.hypot(w.x - d.start.x, w.y - d.start.y) * S.view.z < 2) return;
    pushUndo(); C.ensureEditable(getLayer(d.lid), S.frame);
    const o = findEditable(d.lid, d.id);
    if (!o || !o.grad) { S.drag = null; return; }
    d.o = o; d.inv = minv(matOf(o.t)); d.m0 = o.grad.m.slice(); d.started = true;
  }
  const g = d.o.grad, m = d.m0, l = mapply(d.inv, w.x, w.y);
  const P0 = mapply(m, -GR, 0), P1 = mapply(m, GR, 0), ctr = [m[4], m[5]];
  const setLin = (A, B) => { const xv = [(B[0] - A[0]) / (2 * GR), (B[1] - A[1]) / (2 * GR)]; if (Math.hypot(xv[0], xv[1]) < 1e-6) return; g.m = [xv[0], xv[1], -xv[1], xv[0], (A[0] + B[0]) / 2, (A[1] + B[1]) / 2]; };
  if (d.part === 'a') setLin(l, P1);
  else if (d.part === 'b') setLin(P0, l);
  else if (d.part === 'c') g.m = [m[0], m[1], m[2], m[3], l[0], l[1]];
  else if (d.part === 'r') {
    const nx = (l[0] - ctr[0]) / GR, ny = (l[1] - ctr[1]) / GR, den = m[0] * m[0] + m[1] * m[1];
    if (den < 1e-12 || Math.hypot(nx, ny) < 1e-6) return;
    const zr = (nx * m[0] + ny * m[1]) / den, zi = (ny * m[0] - nx * m[1]) / den;
    g.m = [nx, ny, m[2] * zr - m[3] * zi, m[2] * zi + m[3] * zr, m[4], m[5]];
  } else if (d.part === 'y') g.m = [m[0], m[1], (l[0] - ctr[0]) / GR, (l[1] - ctr[1]) / GR, m[4], m[5]];
  else if (d.part === 's') {
    let t;
    if (g.type === 'radial') { const R = [m[0] * GR, m[1] * GR]; t = ((l[0] - ctr[0]) * R[0] + (l[1] - ctr[1]) * R[1]) / (R[0] * R[0] + R[1] * R[1]); }
    else { const v = [P1[0] - P0[0], P1[1] - P0[1]]; t = ((l[0] - P0[0]) * v[0] + (l[1] - P0[1]) * v[1]) / (v[0] * v[0] + v[1] * v[1]); }
    if (g.stops[d.i]) g.stops[d.i].o = Math.max(0, Math.min(1, t));
  }
  invalidate(); if (window.gsSync) window.gsSync();
}

/* ---------- bucket & eyedropper ---------- */
/* ---------- region fill (Flash-style paint bucket on enclosed space) ---------- */
const GAPS = { none: 0, small: 2, medium: 5, large: 10 };
/* square dilation of a binary mask by r cells, separable with running sums */
function dilateMask(m, W, H, r) {
  if (r <= 0) return m;
  const tmp = new Uint8Array(W * H), out = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) {
    let cnt = 0; const row = y * W;
    for (let x = -r; x < W; x++) {
      const add = x + r, rem = x - r - 1;
      if (add < W && add >= 0 && m[row + add]) cnt++;
      if (rem >= 0 && m[row + rem]) cnt--;
      if (x >= 0) tmp[row + x] = cnt > 0 ? 1 : 0;
    }
  }
  for (let x = 0; x < W; x++) {
    let cnt = 0;
    for (let y = -r; y < H; y++) {
      const add = y + r, rem = y - r - 1;
      if (add < H && add >= 0 && tmp[add * W + x]) cnt++;
      if (rem >= 0 && tmp[rem * W + x]) cnt--;
      if (y >= 0) out[y * W + x] = cnt > 0 ? 1 : 0;
    }
  }
  return out;
}
/* flood fill from (sx,sy) through cells where block==0; returns {mask, border} */
function floodMask(block, W, H, sx, sy) {
  const mask = new Uint8Array(W * H); let border = false;
  const st = [sx, sy];
  while (st.length) {
    const y = st.pop(), x0 = st.pop();
    if (block[y * W + x0] || mask[y * W + x0]) continue;
    let a = x0, b = x0;
    while (a > 0 && !block[y * W + a - 1] && !mask[y * W + a - 1]) a--;
    while (b < W - 1 && !block[y * W + b + 1] && !mask[y * W + b + 1]) b++;
    if (a === 0 || b === W - 1 || y === 0 || y === H - 1) border = true;
    for (let x = a; x <= b; x++) {
      mask[y * W + x] = 1;
      if (y > 0 && !block[(y - 1) * W + x] && !mask[(y - 1) * W + x]) st.push(x, y - 1);
      if (y < H - 1 && !block[(y + 1) * W + x] && !mask[(y + 1) * W + x]) st.push(x, y + 1);
    }
  }
  return { mask, border };
}
/* boundary loops of a binary mask as arrays of [x,y] grid corners (interior on the right) */
function traceMask(m, W, H) {
  const V = W + 1, out = new Map();
  const add = (x0, y0, x1, y1) => { const k = y0 * V + x0; let a = out.get(k); if (!a) { a = []; out.set(k, a); } a.push({ x1, y1, used: false }); };
  const at = (x, y) => (x >= 0 && y >= 0 && x < W && y < H && m[y * W + x]);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (!m[y * W + x]) continue;
    if (!at(x, y - 1)) add(x, y, x + 1, y);
    if (!at(x + 1, y)) add(x + 1, y, x + 1, y + 1);
    if (!at(x, y + 1)) add(x + 1, y + 1, x, y + 1);
    if (!at(x - 1, y)) add(x, y + 1, x, y);
  }
  const loops = [];
  for (const [k0, list] of out) {
    for (const e0 of list) {
      if (e0.used) continue;
      const pts = []; let x = k0 % V, y = (k0 / V) | 0, e = e0;
      for (;;) {
        e.used = true; pts.push([x, y]);
        const dx = e.x1 - x, dy = e.y1 - y; x = e.x1; y = e.y1;
        const nxt = (out.get(y * V + x) || []).filter((q) => !q.used);
        if (!nxt.length) break;
        let pick = nxt[0];
        if (nxt.length > 1) { /* prefer the right turn so diagonal touches stay apart */
          let best = -9;
          for (const q of nxt) { const cx = dx * (q.y1 - y) - dy * (q.x1 - x); if (cx > best) { best = cx; pick = q; } }
        }
        e = pick;
        if (x === k0 % V && y === ((k0 / V) | 0) && e === e0) break;
      }
      if (pts.length >= 4) loops.push(pts);
    }
  }
  return loops;
}
function rdpClosed(pts, eps) {
  /* drop collinear corners, then simplify the ring from two far anchors */
  const n0 = pts.length, keep = [];
  for (let i = 0; i < n0; i++) {
    const a = pts[(i + n0 - 1) % n0], b = pts[i], c = pts[(i + 1) % n0];
    if ((b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) !== 0) keep.push(b);
  }
  if (keep.length < 4) return keep;
  const rdp = (p, i0, i1, out) => {
    let md = 0, mi = -1;
    const a = p[i0], b = p[i1], dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1e-9;
    for (let i = i0 + 1; i < i1; i++) { const d = Math.abs(dy * (p[i][0] - a[0]) - dx * (p[i][1] - a[1])) / L; if (d > md) { md = d; mi = i; } }
    if (md > eps) { rdp(p, i0, mi, out); out.push(p[mi]); rdp(p, mi, i1, out); }
  };
  const half = keep.length >> 1, ring = keep.concat([keep[0]]);
  const r = [keep[0]]; rdp(ring, 0, half, r); r.push(ring[half]); rdp(ring, half, ring.length - 1, r);
  return r;
}
function regionFill(p, opt) {
  if (!canDraw()) return false;
  const doc = S.doc, st = S.style, gap = GAPS[opt.gap] || 0;
  const pad = 40, bx = -pad, by = -pad, WW = doc.w + pad * 2, HH = doc.h + pad * 2;
  const s = Math.min(2, 3600 / Math.max(WW, HH)), W = Math.ceil(WW * s), H = Math.ceil(HH * s);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  ctx.setTransform(s, 0, 0, s, -bx * s, -by * s);
  const ents = opt.all ? C.evalDoc(doc, S.frame) : [{ layer: curLayer(), objs: C.evalLayerObjs(curLayer(), S.frame) }];
  for (const en of ents) { if (en.layer.visible === false || en.layer.mask) continue; for (const o of en.objs) C.drawObj(ctx, o, {}); }
  const d = ctx.getImageData(0, 0, W, H).data, obst = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) obst[i] = d[i * 4 + 3] >= 16 ? 1 : 0;
  /* close gaps by morphological closing of the walls, so sharp corners of the region keep their exact shape */
  const r = Math.round(gap * s);
  let block = obst;
  if (r > 0) {
    const inv = dilateMask(obst, W, H, r).map((v) => 1 - v);
    block = dilateMask(inv, W, H, r).map((v) => 1 - v);
    for (let i = 0; i < W * H; i++) if (obst[i]) block[i] = 1;
  }
  const sx = Math.round((p.x - bx) * s), sy = Math.round((p.y - by) * s);
  if (sx < 0 || sy < 0 || sx >= W || sy >= H) return false;
  if (block[sy * W + sx]) { toast(obst[sy * W + sx] ? 'That spot is already filled.' : 'Too close to a line. Try a smaller gap size.'); return false; }
  const fl = floodMask(block, W, H, sx, sy);
  if (fl.border) { toast(gap < 10 ? 'This area isn\u2019t closed. Try a larger gap size in the tool options.' : 'This area isn\u2019t closed.'); return false; }
  /* tuck the fill under the strokes so no antialiased halo shows at corners */
  /* closing also swallows narrow wedges of the region: win them back by growing through the cells closing added (original free space only) */
  if (r > 0) {
    const m = fl.mask, st2 = [];
    for (let i = 0; i < W * H; i++) if (m[i]) st2.push(i);
    while (st2.length) {
      const i = st2.pop(), x = i % W, y = (i / W) | 0;
      const nb = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1];
      for (const j of nb) if (j >= 0 && !m[j] && block[j] && !obst[j]) { m[j] = 1; st2.push(j); }
    }
  }
  const reg = dilateMask(fl.mask, W, H, Math.max(2, Math.ceil(1.5 * s)));
  const loops = traceMask(reg, W, H).map((l) => rdpClosed(l, 0.7)).filter((l) => l.length >= 3);
  if (!loops.length) return false;
  const cs = loops.map((l) => ({ closed: true, nodes: l.map((q) => C.node(bx + q[0] / s, by + q[1] / s)) }));
  pushUndo();
  const kf = C.ensureEditable(curLayer(), S.frame);
  const o = C.mkPath(cs, { fill: st.fill, fa: st.fa, stroke: null, sw: 0 });
  o.nz = false;
  C.recenter(o);
  if (st.fillType && st.fillType !== 'solid') { const gr = makeGrad(st.fillType, o.contours, st.fill, st.fill2 || '#FFFFFF'); if (gr) o.grad = gr; }
  kf.objs.unshift(o);
  S.sel = [{ lid: curLayer().id, id: o.id }];
  commit(); buildLayerList();
  return true;
}

function bucketDown(e, p) {
  const hit = hitAt(p.w.x, p.w.y, 4);
  if (!hit) { if (!e.altKey) regionFill(p.w, { gap: S.style.bgap || 'small', all: !!S.style.ball }); return; }
  pushUndo(); C.ensureEditable(getLayer(hit.lid), S.frame);
  const o = findEditable(hit.lid, hit.id);
  if (!o) return;
  const st = S.style;
  const gt = st.fillType && st.fillType !== 'solid' ? st.fillType : null;
  walkPaths(o, (q) => {
    if (e.altKey) { q.stroke = st.stroke; q.sa = st.sa; if (!(q.sw > 0)) q.sw = st.sw; return; }
    q.fill = st.fill; q.fa = st.fa;
    if (q.kind === 'path') { const gr = gt && makeGrad(gt, q.contours, st.fill, st.fill2 || '#FFFFFF'); if (gr) q.grad = gr; else delete q.grad; }
  });
  S.sel = [{ lid: hit.lid, id: hit.id }];
  commit();
}
function dropperDown(e, p) {
  try {
    const px = sctx.getImageData(Math.round(p.sx * dpr), Math.round(p.sy * dpr), 1, 1).data;
    const hex = C.rgbToHex(px[0], px[1], px[2]);
    if (e.altKey) { S.style.stroke = hex; S.style.strokeOn = true; } else { S.style.fill = hex; S.style.fillOn = true; }
    syncStyleUI();
    toast((e.altKey ? 'Stroke' : 'Fill') + ' colour ' + hex.toUpperCase());
  } catch (err) { /* canvas read blocked */ }
}

/* ---------- eraser ----------
   Fills are cut with polygon boolean ops (polygon-clipping); lines are trimmed where the eraser passes.
   All geometry is done in world space so the eraser stays a true circle on scaled or rotated shapes. */
const eraserR = () => Math.max(0.5, (S.style.esize || 20) / 2);
function eFlatten(c, m) {
  const n = c.nodes, out = [], cnt = c.closed ? n.length : n.length - 1;
  if (!n.length) return out;
  const sc = Math.max(0.01, Math.hypot(m[0], m[1]), Math.hypot(m[2], m[3]));
  out.push(C.mapply(m, n[0].x, n[0].y));
  for (let i = 0; i < cnt; i++) {
    const a = n[i], b = n[(i + 1) % n.length], last = c.closed && i === cnt - 1;
    if (a.ox || a.oy || b.ix || b.iy) {
      const L = Math.hypot(a.ox, a.oy) + Math.hypot(b.ix, b.iy) + Math.hypot(b.x - a.x, b.y - a.y);
      const k = Math.min(64, Math.max(4, Math.ceil(L * sc / 3)));
      for (let j = 1; j < k; j++) { const q = C.bezPt(a, b, j / k); out.push(C.mapply(m, q[0], q[1])); }
    }
    if (!last) out.push(C.mapply(m, b.x, b.y));
  }
  return out;
}
const eArea = (r) => { let s = 0; for (let i = 0, n = r.length; i < n; i++) { const a = r[i], b = r[(i + 1) % n]; s += a[0] * b[1] - b[0] * a[1]; } return s / 2; };
function eInRing(pt, r) {
  let ins = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    if ((r[i][1] > pt[1]) !== (r[j][1] > pt[1]) && pt[0] < (r[j][0] - r[i][0]) * (pt[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) ins = !ins;
  }
  return ins;
}
/* the filled area of a path as a polygon-clipping MultiPolygon, honouring its fill rule */
function eFillGeom(o, m) {
  const rings = o.contours.filter((c) => c.closed && c.nodes.length >= 3).map((c) => eFlatten(c, m)).filter((r) => r.length >= 3);
  if (!rings.length) return null;
  const pc = polygonClipping;
  if (!o.nz) return rings.length === 1 ? [[rings[0]]] : pc.xor(...rings.map((r) => [[r]]));
  const ar = rings.map(eArea);
  let big = 0; ar.forEach((a, i) => { if (Math.abs(a) > Math.abs(ar[big])) big = i; });
  const sg = Math.sign(ar[big]), solid = [], maybe = [];
  rings.forEach((r, i) => (Math.sign(ar[i]) === sg ? solid : maybe).push(i));
  const holes = maybe.filter((i) => solid.some((j) => eInRing(rings[i][0], rings[j])));
  const solidIdx = solid.concat(maybe.filter((i) => !holes.includes(i)));
  let g = pc.union(...solidIdx.map((i) => [[rings[i]]]));
  if (holes.length) g = pc.difference(g, ...holes.map((i) => [[rings[i]]]));
  return g;
}
function eCapsule(P, Q, r) {
  const N = 14, th = Math.atan2(Q[1] - P[1], Q[0] - P[0]), pts = [];
  if (Math.hypot(Q[0] - P[0], Q[1] - P[1]) < 1e-6) { for (let i = 0; i < N * 2; i++) { const a = i / (N * 2) * Math.PI * 2; pts.push([P[0] + Math.cos(a) * r, P[1] + Math.sin(a) * r]); } return pts; }
  for (let i = 0; i <= N; i++) { const a = th - Math.PI / 2 + i / N * Math.PI; pts.push([Q[0] + Math.cos(a) * r, Q[1] + Math.sin(a) * r]); }
  for (let i = 0; i <= N; i++) { const a = th + Math.PI / 2 + i / N * Math.PI; pts.push([P[0] + Math.cos(a) * r, P[1] + Math.sin(a) * r]); }
  return pts;
}
const eDistSeg = (x, y, P, Q) => {
  const dx = Q[0] - P[0], dy = Q[1] - P[1], L = dx * dx + dy * dy;
  const t = L < 1e-12 ? 0 : Math.max(0, Math.min(1, ((x - P[0]) * dx + (y - P[1]) * dy) / L));
  return Math.hypot(x - P[0] - t * dx, y - P[1] - t * dy);
};
/* the part of segment AB closer than r to segment PQ, as [t0, t1] (a convex distance, so one interval), or null */
function eInterval(A, B, P, Q, r) {
  const f = (t) => eDistSeg(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, P, Q);
  let lo = 0, hi = 1;
  for (let i = 0; i < 28; i++) { const m1 = lo + (hi - lo) / 3, m2 = hi - (hi - lo) / 3; if (f(m1) < f(m2)) hi = m2; else lo = m1; }
  const tm = (lo + hi) / 2;
  if (f(tm) >= r) return null;
  let t0 = 0, t1 = 1;
  if (f(0) >= r) { let a = 0, b = tm; for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (f(m) < r) b = m; else a = m; } t0 = b; }
  if (f(1) >= r) { let a = tm, b = 1; for (let i = 0; i < 26; i++) { const m = (a + b) / 2; if (f(m) < r) a = m; else b = m; } t1 = a; }
  return [t0, t1];
}
/* trim a polyline; returns the surviving pieces, or null when the eraser never touched it */
function eCutLine(pts, closed, P, Q, r) {
  const L = pts.slice(); if (closed) L.push(pts[0]);
  const pieces = []; let cur = [], touched = false, startKept = false, endKept = false;
  const at = (A, B, t) => [A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t];
  for (let i = 0; i + 1 < L.length; i++) {
    const A = L[i], B = L[i + 1];
    const near = Math.min(A[0], B[0]) - r > Math.max(P[0], Q[0]) || Math.max(A[0], B[0]) + r < Math.min(P[0], Q[0]) || Math.min(A[1], B[1]) - r > Math.max(P[1], Q[1]) || Math.max(A[1], B[1]) + r < Math.min(P[1], Q[1]);
    const iv = near ? null : eInterval(A, B, P, Q, r);
    if (!iv) { if (!cur.length) cur.push(A); cur.push(B); if (i === 0) startKept = true; continue; }
    touched = true;
    if (iv[0] > 1e-6) { if (!cur.length) cur.push(A); cur.push(at(A, B, iv[0])); if (i === 0) startKept = true; }
    if (cur.length > 1) pieces.push(cur);
    cur = [];
    if (iv[1] < 1 - 1e-6) { cur = [at(A, B, iv[1]), B]; }
  }
  if (!touched) return null;
  if (cur.length > 1) { pieces.push(cur); endKept = true; }
  if (closed && startKept && endKept && pieces.length > 1) { const last = pieces.pop(); pieces[0] = last.concat(pieces[0].slice(1)); }
  return pieces.filter((p) => p.length > 1 && p.some((q) => Math.hypot(q[0] - p[0][0], q[1] - p[0][1]) > 1e-3));
}
const eNode = (inv, p) => { const q = C.mapply(inv, p[0], p[1]); return C.node(q[0], q[1]); };
/* erase one path object; returns null (untouched) or the list of objects that replace it */
function eErasePath(o, P, Q, r) {
  const m = C.matOf(o.t), inv = C.minv(m), pc = polygonClipping;
  const hasFill = o.fill != null && o.contours.some((c) => c.closed);
  const hasStroke = !!o.stroke && o.sw > 0;
  let fillRings = null, strokeContours = null;
  if (hasFill) {
    const g = eFillGeom(o, m);
    if (g && g.length) {
      const cap = [[eCapsule(P, Q, r)]];
      if (pc.intersection(g, cap).length) {
        fillRings = [];
        for (const poly of pc.difference(g, cap)) for (const ring of poly) {
          const pts = ring.slice(0, -1);
          const s = rdpClosed(pts, 0.12);
          if (s.length >= 3) fillRings.push({ closed: true, nodes: s.map((p) => eNode(inv, p)) });
        }
      }
    }
  }
  if (hasStroke) {
    let any = false; const out = [];
    for (const c of o.contours) {
      const pts = eFlatten(c, m), pieces = pts.length > 1 ? eCutLine(pts, c.closed, P, Q, r) : null;
      if (!pieces) { out.push(c); continue; }
      any = true;
      for (const pc2 of pieces) out.push({ closed: false, nodes: pc2.map((p) => eNode(inv, p)) });
    }
    if (any) strokeContours = out;
  }
  if (!fillRings && !strokeContours) return null;
  const res = [];
  const make = (contours, fill, stroke) => {
    const k = C.clone(o); k.id = C.uid(); k.contours = contours;
    if (!fill) k.fill = null; if (!stroke) k.stroke = null;
    if (fill) k.nz = false;
    C.recenter(k); return k;
  };
  if (hasFill && hasStroke) {
    const fr = fillRings || o.contours.filter((c) => c.closed);
    if (fr.length) res.push(make(fr, true, false));
    const sc = strokeContours || o.contours;
    if (sc.length) res.push(make(sc, false, true));
  } else if (hasFill) {
    const open = o.contours.filter((c) => !c.closed);
    const cs = (fillRings || []).concat(open);
    if (cs.length) { const k = make(cs, true, false); k.id = o.id; res.push(k); }
  } else {
    if (strokeContours.length) { const k = make(strokeContours, false, true); k.id = o.id; res.push(k); }
  }
  if (res.length) res[0].id = o.id;
  return res;
}
/* one eraser sweep from world point a to b on the active layer; returns true if anything changed */
function eraseSweep(dr, a, b) {
  const l = curLayer();
  if (!l || l.locked || l.visible === false) return false;
  const r = eraserR(), P = [a.x, a.y], Q = [b.x, b.y];
  const bx0 = Math.min(P[0], Q[0]) - r, bx1 = Math.max(P[0], Q[0]) + r, by0 = Math.min(P[1], Q[1]) - r, by1 = Math.max(P[1], Q[1]) + r;
  const cand = C.evalLayerObjs(l, S.frame).filter((o) => {
    if (o.kind !== 'path' || o.rig) return false;
    const wb = C.worldBounds(o); if (!wb) return false;
    const pad = (o.stroke ? o.sw : 0) / 2 + 1;
    return !(wb.x0 - pad > bx1 || wb.x1 + pad < bx0 || wb.y0 - pad > by1 || wb.y1 + pad < by0);
  });
  if (!cand.length) return false;
  const ids = new Set(cand.map((o) => o.id));
  let kf = C.kfFor(l, S.frame);
  const targets = (kf && (kf.f === S.frame || kf.tween === 'none') ? kf.objs : cand).filter((o) => ids.has(o.id));
  const plan = [];
  for (const o of targets) { const rep = eErasePath(o, P, Q, r); if (rep) plan.push([o.id, rep]); }
  if (!plan.length) return false;
  if (!dr.undone) { pushUndo(); dr.undone = true; }
  kf = C.ensureEditable(l, S.frame);
  for (const [id, rep] of plan) {
    const i = kf.objs.findIndex((x) => x.id === id);
    if (i >= 0) kf.objs.splice(i, 1, ...rep);
  }
  dr.changed = true;
  return true;
}
function drawEraserCursor(ctx) {
  const w = S.brushHover;
  if (!w || S.tool !== 'eraser' || S.space) return;
  const c = w2s(w.x, w.y), rr = eraserR() * S.view.z;
  ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(c[0], c[1], rr, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = 'rgba(20,24,40,.85)'; ctx.setLineDash([3, 3]); ctx.stroke(); ctx.restore();
}

/* ---------- bone arm ---------- */
const rigEditing = (o) => !!(o && o.kind === 'path' && o.rig && C.rigValid(o.rig));
function boneDown(e, p) {
  if (!canDraw()) return;
  const B = S.bone || (S.bone = { pts: [] });
  const last = B.pts[B.pts.length - 1];
  if (last && Math.hypot(p.w.x - last.x, p.w.y - last.y) * S.view.z < 8) return;
  B.pts.push(p.w);
  if (B.pts.length === 3) finishBone();
  invalidate();
}
function finishBone() {
  const [a, b, c] = S.bone.pts; S.bone = null;
  const l1 = Math.hypot(b.x - a.x, b.y - a.y), l2 = Math.hypot(c.x - b.x, c.y - b.y), L = l1 + l2;
  const ux = (c.x - a.x), uy = (c.y - a.y), du = Math.hypot(ux, uy) || 1;
  const side = (-uy / du) * (b.x - a.x) + (ux / du) * (b.y - a.y);
  const pa = currentPaint(false);
  const o = C.mkPath([], { fill: pa.fill || S.style.fill, fa: pa.fa, stroke: null }, { x: 0, y: 0 });
  o.rig = { s: [a.x, a.y], h: [c.x, c.y], l1, l2, flip: side < 0 ? -1 : 1, w: [Math.max(3, L * 0.07), Math.max(2.5, L * 0.055), Math.max(2, L * 0.04)] };
  C.rigBuild(o);
  if (addObject(o)) { setTool('select'); refreshProps(); }
}
function rigPts(o) {
  const M = matOf(o.t), k = C.rigSolve(o.rig), W = (q) => { const r = mapply(M, q[0], q[1]); return { x: r[0], y: r[1] }; };
  return { s: W(k.s), e: W(k.e), h: W(o.rig.h), hh: W(k.h) };
}
function rigHit(o, sx, sy) {
  const P = rigPts(o), near = (q) => { const p = w2s(q.x, q.y); return Math.hypot(p[0] - sx, p[1] - sy) <= 10; };
  return near(P.h) ? 'h' : near(P.e) ? 'e' : near(P.s) ? 's' : null;
}
function drawRigHandles(ctx, o) {
  const P = rigPts(o), acc = CSSV.accent, sc = (q) => w2s(q.x, q.y);
  ctx.save(); ctx.lineWidth = 1.5; ctx.strokeStyle = acc;
  const S0 = sc(P.s), E0 = sc(P.e), H0 = sc(P.hh), T0 = sc(P.h);
  ctx.beginPath(); ctx.moveTo(S0[0], S0[1]); ctx.lineTo(E0[0], E0[1]); ctx.lineTo(H0[0], H0[1]); ctx.stroke();
  if (Math.hypot(T0[0] - H0[0], T0[1] - H0[1]) > 2) { ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.moveTo(H0[0], H0[1]); ctx.lineTo(T0[0], T0[1]); ctx.stroke(); ctx.setLineDash([]); }
  const dot = (p, r, fill) => { ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); ctx.lineWidth = 1; ctx.strokeStyle = acc; ctx.stroke(); };
  dot(S0, 6, CSSV.accentFg); dot(E0, 5, CSSV.accentFg); dot(T0, 7, acc);
  ctx.restore();
}
function drawBonePreview(ctx) {
  const B = S.bone; if (!B || !B.pts.length) return;
  const pts = B.pts.concat(S.cursorW ? [S.cursorW] : []);
  ctx.save(); ctx.strokeStyle = CSSV.accent; ctx.fillStyle = CSSV.accent; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
  ctx.beginPath(); pts.forEach((q, i) => { const s = w2s(q.x, q.y); i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1]); }); ctx.stroke(); ctx.setLineDash([]);
  B.pts.forEach((q) => { const s = w2s(q.x, q.y); ctx.beginPath(); ctx.arc(s[0], s[1], 5, 0, Math.PI * 2); ctx.fill(); });
  ctx.restore();
}
function rigDrag(w) {
  const d = S.drag;
  if (!d.started) {
    if (Math.hypot(w.x - d.start.x, w.y - d.start.y) * S.view.z < 2) return;
    pushUndo(); C.ensureEditable(getLayer(d.lid), S.frame);
    const o = findEditable(d.lid, d.id);
    if (!o || !o.rig) { S.drag = null; return; }
    d.o = o; d.inv = minv(matOf(o.t)); d.s0 = o.rig.s.slice(); d.h0 = o.rig.h.slice(); d.l0 = mapply(d.inv, d.start.x, d.start.y); d.started = true;
  }
  const g = d.o.rig, l = mapply(d.inv, w.x, w.y);
  if (d.part === 'h') g.h = [l[0], l[1]];
  else if (d.part === 's') { const dx = l[0] - d.l0[0], dy = l[1] - d.l0[1]; g.s = [d.s0[0] + dx, d.s0[1] + dy]; g.h = [d.h0[0] + dx, d.h0[1] + dy]; }
  else if (d.part === 'e') { const cr = (g.h[0] - g.s[0]) * (l[1] - g.s[1]) - (g.h[1] - g.s[1]) * (l[0] - g.s[0]); if (Math.abs(cr) > 1e-6) g.flip = cr < 0 ? -1 : 1; }
  C.rigBuild(d.o); syncBinds(d.lid); invalidate();
}
function syncBinds(lid) { const k = C.kfFor(getLayer(lid), S.frame); if (k) C.settleBinds(k.objs, null); }
function rigEdit(fn) {
  const one = singleSel(); if (!one || !one.o.rig || getLayer(one.lid).locked) return;
  beginEditOnce(); C.ensureEditable(getLayer(one.lid), S.frame);
  const o = findEditable(one.lid, one.id); if (!o || !o.rig) return;
  fn(o.rig); C.rigBuild(o); syncBinds(one.lid); commit();
}
