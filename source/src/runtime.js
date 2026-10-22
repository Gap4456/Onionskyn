/* ===== Onionskyn runtime: a stateful player with a CreateJS-style MovieClip API =====
   Used by Preview and by the HTML export. Never loaded into the editor's own scripting context. */
(function (root) {
'use strict';
function create(doc, cv, opt) {
  opt = opt || {};
  const Core = root.FCCore, mainCtx = cv.getContext('2d');
  let ctx = mainCtx;
  const dpr = opt.dpr || Math.min(root.devicePixelRatio || 1, 3);
  cv.width = Math.round(doc.w * dpr); cv.height = Math.round(doc.h * dpr);
  const hc = document.createElement('canvas').getContext('2d');
  const lib = doc.lib || {};
  Core.setLib(lib); Core.setImages(doc.images); Core.setMeasure(ctx);
  const errors = [], tickers = [], fnCache = new Map(), entries = [];
  let paused = false, hoverChain = new Set(), hoverTop = null, down = null, downChain = new Set(), raf = 0, started = false;
  const report = (e) => { const m = String(e && e.message || e); errors.push(m); if (opt.onError) opt.onError(m); else if (root.console) console.error(e); };

  /* ---- helpers ---- */
  const isInst = (o) => (o.kind === 'clip' && (o.mc || o.btn)) || (o.kind === 'text' && !!o.name);
  function hasScripts() {
    const chk = (layers) => layers.some((l) => l.kfs.some((k) => (k.script && String(k.script).trim()) || k.objs.some((o) => o.kind === 'clip' && o.script && String(o.script).trim())));
    if (chk(doc.layers)) return true;
    for (const k of Object.keys(lib)) if (chk(lib[k].layers)) return true;
    return false;
  }
  function newInst(tl, parent, key, o) {
    const inst = { tl, layers: tl.layers || [], total: Math.max(1, tl.frames || 1), cur: 0, playing: true, parent, key, kids: new Map(), ls: {}, ov: {}, last: o || null, alive: true, fresh: true, btn: !!(o && o.btn), kind: o ? o.kind : 'root', cache: null, labels: null, name: (o && o.name) || '', depth: 0 };
    if (inst.btn) inst.playing = false;
    inst.proxy = makeProxy(inst);
    return inst;
  }
  function labelsOf(inst) {
    if (!inst.labels) { inst.labels = new Map(); for (const l of inst.layers) for (const k of l.kfs) if (k.label) inst.labels.set(k.label, k.f); }
    return inst.labels;
  }
  function evalInst(inst, f) {
    if (f == null) f = inst.cur;
    if (f === inst.cur && inst.cache && inst.cache.f === f) return inst.cache.list;
    const list = [];
    for (const l of inst.layers) list.push({ layer: l, objs: l.visible === false ? [] : Core.evalLayerObjs(l, f).filter(Core.notGhost) }); /* hidden layers stay in the list (empty) so a hidden mask still disables its masking, exactly as in the editor */
    if (f === inst.cur) inst.cache = { f, list };
    return list;
  }

  /* ---- proxies exposed to scripts ---- */
  function makeProxy(inst) {
    const p = {};
    const def = (n, get, set) => Object.defineProperty(p, n, { get, set, configurable: true, enumerable: false });
    const num = (n, getv) => def(n, () => (inst.ov[n] != null ? inst.ov[n] : getv()), (v) => { inst.ov[n] = +v; });
    const L = () => inst.last || { t: { x: 0, y: 0, sx: 1, sy: 1, r: 0 }, op: 1 };
    num('x', () => L().t.x); num('y', () => L().t.y); num('rotation', () => L().t.r);
    num('scaleX', () => L().t.sx); num('scaleY', () => L().t.sy); num('alpha', () => Core.nz(L().op, 1));
    def('visible', () => inst.ov.visible !== false, (v) => { inst.ov.visible = !!v; });
    def('name', () => inst.name, () => {});
    def('currentFrame', () => inst.cur, () => {});
    def('totalFrames', () => inst.total, () => {});
    def('timeline', () => ({ duration: inst.total, position: inst.cur }), () => {});
    def('parent', () => (inst.parent ? inst.parent.proxy : null), () => {});
    def('mouseEnabled', () => inst.ov.mouse !== false, (v) => { inst.ov.mouse = !!v; });
    def('cursor', () => inst.ov.cursor || null, (v) => { inst.ov.cursor = v; });
    if (inst.kind === 'text') {
      def('text', () => (inst.ov.text != null ? inst.ov.text : (L().runs || []).map((r) => r.t).join('')), (v) => { inst.ov.text = String(v); });
      def('color', () => inst.ov.color || (L().runs && L().runs[0].c), (v) => { inst.ov.color = String(v); });
    }
    p.stop = () => { inst.playing = false; };
    p.play = () => { inst.playing = true; };
    p.gotoAndStop = (f) => goto(inst, f, false);
    p.gotoAndPlay = (f) => goto(inst, f, true);
    p.nextFrame = () => goto(inst, Math.min(inst.total - 1, inst.cur + 1), false);
    p.prevFrame = () => goto(inst, Math.max(0, inst.cur - 1), false);
    p.addEventListener = (t, fn) => { if (typeof fn === 'function') (inst.ls[t] || (inst.ls[t] = [])).push(fn); return fn; };
    p.on = p.addEventListener;
    p.removeEventListener = (t, fn) => { if (inst.ls[t]) inst.ls[t] = inst.ls[t].filter((x) => x !== fn); };
    p.off = p.removeEventListener;
    p.removeAllEventListeners = (t) => { if (t) delete inst.ls[t]; else inst.ls = {}; };
    p.dispatchEvent = (e) => dispatch(inst, typeof e === 'string' ? { type: e } : e, inst, false);
    return p;
  }
  function link(parent, kid) {
    const d0 = kid.name ? Object.getOwnPropertyDescriptor(parent.proxy, kid.name) : null;
    if (!kid.name || (d0 && !d0.configurable)) return;
    Object.defineProperty(parent.proxy, kid.name, { configurable: true, enumerable: true, get: () => kid.proxy });
    kid.linked = true;
  }
  function unlink(parent, kid) { if (kid.linked) { const d = Object.getOwnPropertyDescriptor(parent.proxy, kid.name); if (d && d.get && d.get() === kid.proxy) delete parent.proxy[kid.name]; } }
  function kill(parent, kid) {
    kid.alive = false; parent.kids.delete(kid.key); unlink(parent, kid);
    for (const k of Array.from(kid.kids.values())) kill(kid, k);
    if (down === kid) down = null;
  }

  /* ---- timeline stepping ---- */
  function sync(inst) {
    const born = [], want = new Set();
    for (const { layer, objs } of evalInst(inst)) for (const o of objs) {
      if (!isInst(o)) continue;
      const key = layer.id + '|' + o.id;
      want.add(key);
      let k = inst.kids.get(key);
      if (k && k.sym !== o.sym) { kill(inst, k); k = null; }
      if (!k) {
        k = newInst(o.kind === 'clip' ? (lib[o.sym] || { layers: [], frames: 1 }) : { layers: [], frames: 1 }, inst, key, o);
        k.sym = o.sym; inst.kids.set(key, k); link(inst, k); born.push(k);
        if (o.kind === 'clip' && o.script && String(o.script).trim()) runInstScript(k, o);
      }
      k.last = o;
    }
    for (const [key, k] of Array.from(inst.kids)) if (!want.has(key)) kill(inst, k);
    return born;
  }
  function stageShim() { return { addEventListener: (t, fn) => { if (t === 'tick') tickers.push(fn); else rootInst.proxy.addEventListener(t, fn); }, removeEventListener: () => {}, update: () => {}, canvas: cv }; }
  /* CreateJS shims: Ticker, Tween, Ease */
  const tweens = [];
  const E = {
    linear: (t) => t, quadIn: (t) => t * t, quadOut: (t) => t * (2 - t), quadInOut: (t) => (t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    cubicIn: (t) => t * t * t, cubicOut: (t) => (--t) * t * t + 1, cubicInOut: (t) => (t < .5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
    sineIn: (t) => 1 - Math.cos(t * Math.PI / 2), sineOut: (t) => Math.sin(t * Math.PI / 2), sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    backOut: (t) => { const c = 1.70158; t -= 1; return t * t * ((c + 1) * t + c) + 1; }, bounceOut: (t) => { const n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; }
  };
  const Ease = new Proxy(E, { get: (o, k) => (k in o ? o[k] : o.linear) });
  function Tween(target, opts) {
    this.target = target; this.steps = []; this.t0 = null; this.i = 0; this.loop = !!(opts && opts.loop); this.dead = false; this.start = null;
    tweens.push(this);
  }
  Tween.get = (target, opts) => new Tween(target, opts);
  Tween.removeTweens = (target) => { for (const tw of tweens) if (tw.target === target) tw.dead = true; };
  Tween.removeAllTweens = () => { for (const tw of tweens) tw.dead = true; };
  Tween.prototype = {
    to(props, ms, ease) { this.steps.push({ type: 'to', props, ms: ms || 0, ease: typeof ease === 'function' ? ease : E.linear }); return this; },
    wait(ms) { this.steps.push({ type: 'wait', ms: ms || 0 }); return this; },
    call(fn, args, scope) { this.steps.push({ type: 'call', fn, args, scope }); return this; },
    set(props) { this.steps.push({ type: 'set', props }); return this; },
    play() { return this; }, pause() { return this; }, setPaused() { return this; }
  };
  function stepTweens(now) {
    for (let n = 0; n < tweens.length; n++) {
      const tw = tweens[n];
      if (tw.dead) { tweens.splice(n--, 1); continue; }
      let guard = 0;
      while (tw.i < tw.steps.length && guard++ < 50) {
        const st = tw.steps[tw.i];
        if (tw.t0 == null) { tw.t0 = now; tw.from = null; }
        if (st.type === 'call') { try { st.fn.apply(st.scope || tw.target, st.args || []); } catch (e) { report('Tween callback error: ' + (e && e.message || e)); } tw.i++; tw.t0 = null; continue; }
        if (st.type === 'set') { for (const k in st.props) tw.target[k] = st.props[k]; tw.i++; tw.t0 = null; continue; }
        if (st.type === 'wait') { if (now - tw.t0 >= st.ms) { tw.i++; tw.t0 = null; continue; } break; }
        if (!tw.from) { tw.from = {}; for (const k in st.props) tw.from[k] = +tw.target[k] || 0; }
        const u = st.ms <= 0 ? 1 : Math.min(1, (now - tw.t0) / st.ms), e = st.ease(u);
        for (const k in st.props) tw.target[k] = tw.from[k] + (st.props[k] - tw.from[k]) * e;
        if (u >= 1) { tw.i++; tw.t0 = null; tw.from = null; continue; }
        break;
      }
      if (tw.i >= tw.steps.length) { if (tw.loop && tw.steps.length) { tw.i = 0; tw.t0 = null; } else { tw.dead = true; } }
    }
  }
  /* ---- sound: library items played through HTMLAudio ---- */
  const snd = doc.sounds || {}, sndIds = new Map(), sndUrls = {}, live = new Set(), pending = new Set();
  let gVol = 1, gMute = false;
  for (const k of Object.keys(snd)) {
    sndIds.set(k, k);
    for (const id of snd[k].ids || []) sndIds.set(id, k);
    const bn = k.split('/').pop().replace(/\.[^.]+$/, '');
    if (!sndIds.has(bn)) sndIds.set(bn, k);
  }
  function urlOf(k) {
    if (sndUrls[k]) return sndUrls[k];
    const s = snd[k];
    if (!s || !s.b64) return null;
    const bin = atob(s.b64), u8 = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    return (sndUrls[k] = URL.createObjectURL(new Blob([u8], { type: s.mime || 'audio/mpeg' })));
  }
  const unlock = () => { for (const o of Array.from(pending)) { pending.delete(o); o.resume(); } };
  ['pointerdown', 'keydown', 'touchstart'].forEach((ev) => document.addEventListener(ev, unlock, true));
  function makeSound(key, opts, autostart) {
    opts = opts || {};
    const url = key ? urlOf(key) : null, el = new Audio();
    if (url) el.src = url;
    const o = { ls: {}, _vol: opts.volume != null ? +opts.volume : 1, _mute: false, _loops: opts.loop | 0, playState: 'playSucceeded' };
    const apply = () => { el.volume = Math.max(0, Math.min(1, o._vol * gVol)); el.muted = gMute || o._mute; el.loop = o._loops === -1; };
    const start = () => { apply(); live.add(o); const pr = el.play(); if (pr && pr.catch) pr.catch(() => { pending.add(o); }); return o; };
    const emit = (t) => { for (const fn of (o.ls[t] || []).slice()) { try { fn.call(o, { type: t, target: o }); } catch (e) { report('Sound handler error: ' + (e && e.message || e)); } } };
    Object.defineProperties(o, {
      volume: { get: () => o._vol, set: (v) => { o._vol = +v || 0; apply(); } },
      muted: { get: () => o._mute, set: (v) => { o._mute = !!v; apply(); } },
      loop: { get: () => o._loops, set: (v) => { o._loops = v | 0; apply(); } },
      paused: { get: () => el.paused, set: (v) => { if (v) el.pause(); else start(); } },
      position: { get: () => el.currentTime * 1000, set: (v) => { try { el.currentTime = v / 1000; } catch (e) { /* not seekable yet */ } } },
      duration: { get: () => (isFinite(el.duration) ? el.duration * 1000 : 0) }
    });
    o.play = (a) => { if (a && typeof a === 'object') { if (a.loop != null) o._loops = a.loop | 0; if (a.volume != null) o._vol = +a.volume; } return start(); };
    o.stop = () => { el.pause(); try { el.currentTime = 0; } catch (e) { /* ignore */ } live.delete(o); pending.delete(o); return o; };
    o.pause = () => { el.pause(); return o; };
    o.resume = () => start();
    o.setVolume = (v) => { o.volume = v; return o; }; o.setMute = (m) => { o.muted = m; return o; };
    o.setPan = () => o; o.getVolume = () => o._vol;
    o.on = o.addEventListener = (t, fn) => { (o.ls[t] || (o.ls[t] = [])).push(fn); return fn; };
    o.removeEventListener = (t, fn) => { if (o.ls[t]) o.ls[t] = o.ls[t].filter((x) => x !== fn); };
    el.addEventListener('ended', () => {
      if (o._loops > 0) { o._loops--; try { el.currentTime = 0; } catch (e) { /* ignore */ } start(); return; }
      live.delete(o); o.playState = 'playFinished'; emit('complete');
    });
    if (autostart && url) start();
    return o;
  }
  const Sound = {
    get volume() { return gVol; }, set volume(v) { gVol = Math.max(0, +v || 0); for (const o of live) o.volume = o._vol; },
    get muted() { return gMute; }, set muted(v) { gMute = !!v; for (const o of live) o.muted = o._mute; },
    play(id, a, b, c, d, e) {
      const key = sndIds.get(String(id));
      const opts = a && typeof a === 'object' ? a : { loop: d, volume: e };
      return makeSound(key, opts, true);
    },
    createInstance: (id) => makeSound(sndIds.get(String(id)), {}, false),
    stop() { for (const o of Array.from(live)) o.stop(); }, registerSound() { return true; }, registerSounds() { return true; }, loadComplete: (id) => sndIds.has(String(id)),
    setVolume(v) { Sound.volume = v; }, getVolume: () => gVol, setMute(m) { Sound.muted = m; }, getMute: () => gMute, addEventListener() {}, on() {}, removeEventListener() {},
    alternateExtensions: [], INTERRUPT_ANY: 'any', INTERRUPT_NONE: 'none', INTERRUPT_EARLY: 'early', INTERRUPT_LATE: 'late'
  };
  function runSounds(inst) {
    for (let i = inst.layers.length - 1; i >= 0; i--) {
      const l = inst.layers[i];
      if (l.visible === false) continue;
      const kf = l.kfs.find((k) => k.f === inst.cur);
      if (!kf || !kf.sound) continue;
      const sd = kf.sound, key = sndIds.get(sd.name);
      if (!key) continue;
      inst.snds = inst.snds || {};
      const prev = inst.snds[key];
      if (sd.sync === 'stop') { if (prev) prev.stop(); continue; }
      if (sd.sync === 'start' && prev && live.has(prev)) continue;
      if (prev && sd.sync === 'stream') prev.stop();
      inst.snds[key] = makeSound(key, { loop: sd.loop }, true);
    }
  }
  const createjs = {
    Ticker: { framerate: doc.fps, timingMode: 'raf', RAF: 'raf', RAF_SYNCHED: 'synched', TIMEOUT: 'timeout', addEventListener: (t, fn) => { if (t === 'tick') tickers.push(fn); }, removeEventListener: (t, fn) => { const i = tickers.indexOf(fn); if (i >= 0) tickers.splice(i, 1); }, setFPS() {}, getFPS: () => doc.fps, on(t, fn) { this.addEventListener(t, fn); return fn; } },
    Event: function (type) { this.type = type; },
    MovieClip: function () {},
    Sound, Tween, Ease, Touch: { enable() { return true; } }
  };
  function exec(inst, kf) {
    if (AS1) { runAS1(inst, String(kf.script), inst, inst); return; }
    let fn = fnCache.get(kf);
    if (fn === undefined) {
      try { fn = new Function('createjs', 'exportRoot', 'stage', 'lib', 'images', String(kf.script)); }
      catch (e) { report('Script syntax error: ' + e.message); fn = null; }
      fnCache.set(kf, fn);
    }
    if (!fn) return;
    try { fn.call(inst.proxy, createjs, rootInst.proxy, stageShim(), {}, {}); }
    catch (e) { report('Script error' + (inst.name ? ' in ' + inst.name : '') + ' frame ' + (inst.cur + 1) + ': ' + (e && e.message || e)); }
  }
  function runScripts(inst) {
    for (let i = inst.layers.length - 1; i >= 0; i--) {
      const l = inst.layers[i];
      if (l.visible === false) continue;
      const kf = l.kfs.find((k) => k.f === inst.cur);
      if (kf && kf.script && String(kf.script).trim()) exec(inst, kf);
    }
  }
  function enter(inst) {
    if (!inst.alive || inst.depth > 6) return;
    inst.depth++;
    try {
      const born = sync(inst);
      runSounds(inst);
      runScripts(inst);
      for (const k of born) if (k.alive) { enter(k); if (AS1) fireH(k, 'load'); }
    } finally { inst.depth--; }
  }
  function goto(inst, f, play) {
    if (typeof f === 'string') { const m = labelsOf(inst); f = m.has(f) ? m.get(f) : parseInt(f, 10); }
    f = Math.floor(+f);
    if (!isFinite(f)) return;
    inst.cur = Math.max(0, Math.min(inst.total - 1, f)); inst.playing = !!play; inst.fresh = true;
    enter(inst);
  }
  function tick(inst) {
    if (!inst.alive) return;
    if (inst.fresh) inst.fresh = false;
    else if (inst.playing && inst.total > 1) { if (inst === rootInst && opt.loop === false && inst.cur >= inst.total - 1) inst.playing = false; else { inst.cur = (inst.cur + 1) % inst.total; enter(inst); } }
    if (AS1 && inst.alive) fireH(inst, 'enterFrame');
    for (const k of Array.from(inst.kids.values())) tick(k);
  }
  function tickAll() {
    tick(rootInst);
    for (const fn of tickers.slice()) { try { fn({ type: 'tick', delta: 1000 / doc.fps, paused: false }); } catch (e) { report('Ticker error: ' + (e && e.message || e)); } }
  }

  /* ---- ActionScript 1/2 layer: gives AS1 code the environment it expects (_root, _x, on(release), gotoAndPlay("scene", 1), ...) ---- */
  const AS1 = doc.lang === 'as1';
  const scenes = (() => {
    const a = [];
    for (const l of doc.layers) for (const k of l.kfs) if (k.scene) a.push({ name: String(k.scene), start: k.f });
    a.sort((x, y) => x.start - y.start);
    const out = [];
    for (const x of a) if (!out.some((o) => o.start === x.start)) out.push(x);
    if (!out.length || out[0].start > 0) out.unshift({ name: 'Scene 1', start: 0 });
    out.forEach((x, i) => { x.end = (i + 1 < out.length ? out[i + 1].start : doc.frames) - 1; });
    return out;
  })();
  const sceneAt = (f) => { let r = scenes[0]; for (const x of scenes) if (x.start <= f) r = x; return r; };
  const t0 = performance.now(), asWarned = new Set();
  const warnOnce = (what) => { if (!asWarned.has(what)) { asWarned.add(what); report(what + ' is not supported by the player yet and was ignored.'); } };
  const isNum = (v) => typeof v === 'number' || (typeof v === 'string' && /^\s*\d+\s*$/.test(v));
  function as1Goto(inst, a, b, play) {
    if (b !== undefined && inst === rootInst) {
      const sc = scenes.find((x) => x.name === String(a));
      if (sc) {
        if (isNum(b)) return goto(inst, Math.min(sc.end, sc.start + Math.max(1, Math.floor(+b)) - 1), play);
        const m = labelsOf(inst); return goto(inst, m.has(String(b)) ? m.get(String(b)) : sc.start, play);
      }
      a = b;
    }
    if (isNum(a)) {
      const n = Math.max(1, Math.floor(+a));
      if (inst === rootInst) { const cs = sceneAt(inst.cur); return goto(inst, Math.min(cs.end, cs.start + n - 1), play); }
      return goto(inst, n - 1, play);
    }
    return goto(inst, a, play);
  }
  function as1Scene(delta) {
    const i = scenes.indexOf(sceneAt(rootInst.cur)), j = i + delta;
    if (j >= 0 && j < scenes.length) goto(rootInst, scenes[j].start, true);
  }
  let mouse = { x: 0, y: 0 };
  const kidByName = (inst, n) => { for (const k of inst.kids.values()) if (k.alive && k.name === n) return k; return null; };
  const AS_PROPS = { _x: ['x', 1], _y: ['y', 1], _rotation: ['rotation', 1], _xscale: ['scaleX', 100], _yscale: ['scaleY', 100], _alpha: ['alpha', 100] };
  const AS_HANDLERS = { onPress: 'press', onRelease: 'release', onReleaseOutside: 'releaseOutside', onRollOver: 'rollOver', onRollOut: 'rollOut', onEnterFrame: 'enterFrame', onLoad: 'load', onMouseDown: 'mouseDown', onMouseUp: 'mouseUp', onMouseMove: 'mouseMove', onKeyDown: 'keyDown', onKeyUp: 'keyUp' };
  const AS_METHODS = new Set(['gotoAndPlay', 'gotoAndStop', 'play', 'stop', 'nextFrame', 'prevFrame', 'nextScene', 'prevScene']);
  function as1Wrap(inst) {
    if (inst.w1) return inst.w1;
    const vars = inst.vars || (inst.vars = Object.create(null)), P = inst.proxy;
    const meth = {
      gotoAndPlay: (a, b) => as1Goto(inst, a, b, true), gotoAndStop: (a, b) => as1Goto(inst, a, b, false),
      play: () => { inst.playing = true; }, stop: () => { inst.playing = false; },
      nextFrame: () => goto(inst, Math.min(inst.total - 1, inst.cur + 1), false), prevFrame: () => goto(inst, Math.max(0, inst.cur - 1), false),
      nextScene: () => as1Scene(1), prevScene: () => as1Scene(-1)
    };
    const own = (p) => !!AS_PROPS[p] || AS_METHODS.has(p) || p === '_visible' || p === '_name' || p === '_parent' || p === '_root' || p === '_currentframe' || p === '_totalframes' || p === '_xmouse' || p === '_ymouse' || !!kidByName(inst, p) || p in vars;
    inst.w1 = new Proxy({}, {
      has: (_, p) => typeof p === 'string' && own(p),
      get(_, p) {
        if (typeof p !== 'string') return undefined;
        const ap = AS_PROPS[p];
        if (ap) return P[ap[0]] * ap[1];
        if (meth[p]) return meth[p];
        switch (p) {
          case '_visible': return P.visible;
          case '_name': return inst.name;
          case '_parent': return inst.parent ? as1Wrap(inst.parent) : undefined;
          case '_root': case '_level0': return as1Wrap(rootInst);
          case '_currentframe': return inst.cur + 1;
          case '_totalframes': return inst.total;
          case '_xmouse': return mouse.x; case '_ymouse': return mouse.y;
        }
        if (p in vars) return vars[p];
        const k = kidByName(inst, p);
        return k ? as1Wrap(k) : undefined;
      },
      set(_, p, v) {
        if (typeof p !== 'string') return true;
        const ap = AS_PROPS[p];
        if (ap) { P[ap[0]] = (+v || 0) / ap[1]; return true; }
        if (p === '_visible') { P.visible = !!v; return true; }
        if (AS_HANDLERS[p]) { (inst.hset || (inst.hset = {}))[AS_HANDLERS[p]] = v; return true; }
        vars[p] = v; return true;
      }
    });
    return inst.w1;
  }
  function fireH(inst, name, arg) {
    let n = 0;
    const run = (fn) => { n++; try { fn.call(as1Wrap(inst), arg); } catch (e) { report('Script error in ' + (inst.name || 'clip') + ' (' + name + '): ' + (e && e.message || e)); } };
    for (const fn of ((inst.hs && inst.hs[name]) || []).slice()) run(fn);
    const f = inst.hset && inst.hset[name];
    if (typeof f === 'function') run(f);
    return n;
  }
  const fireUp = (inst, name) => { for (let k = inst; k; k = k.parent) if (fireH(k, name) > 0) return; };
  function walk(inst, fn) { if (!inst.alive) return; fn(inst); for (const k of Array.from(inst.kids.values())) walk(k, fn); }
  const KEYS = { LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, SPACE: 32, ENTER: 13, ESCAPE: 27, BACKSPACE: 8, TAB: 9, SHIFT: 16, CONTROL: 17, DELETEKEY: 46, INSERT: 45, HOME: 36, END: 35, PGUP: 33, PGDN: 34, CAPSLOCK: 20 };
  const KEYNAMES = { '<Left>': 37, '<Up>': 38, '<Right>': 39, '<Down>': 40, '<Space>': 32, '<Enter>': 13, '<Escape>': 27, '<Backspace>': 8, '<Tab>': 9, '<Delete>': 46, '<Insert>': 45, '<Home>': 36, '<End>': 35, '<PageUp>': 33, '<PageDown>': 34 };
  const keyDown = new Set(), keyListeners = []; let lastKey = 0;
  const KeyObj = Object.assign({ isDown: (c) => keyDown.has(+c), getCode: () => lastKey, getAscii: () => lastKey, addListener: (o) => { if (o && keyListeners.indexOf(o) < 0) keyListeners.push(o); }, removeListener: (o) => { const i = keyListeners.indexOf(o); if (i >= 0) keyListeners.splice(i, 1); }, isToggled: () => false }, KEYS);
  const onKey = (e, down) => {
    const t = e.target; if (t && /^(input|textarea|select)$/i.test(t.tagName || '')) return;
    lastKey = e.keyCode || 0;
    if (down) keyDown.add(lastKey); else keyDown.delete(lastKey);
    walk(rootInst, (k) => {
      fireH(k, down ? 'keyDown' : 'keyUp');
      if (down && k.hs) for (const nm of Object.keys(k.hs)) if (nm.indexOf('keyPress:') === 0) { const kn = nm.slice(9); if (KEYNAMES[kn] === lastKey || (kn.length === 1 && kn.toUpperCase().charCodeAt(0) === lastKey)) fireH(k, nm); }
    });
    for (const o of keyListeners.slice()) { const f = down ? o.onKeyDown : o.onKeyUp; if (typeof f === 'function') { try { f.call(o); } catch (er) { report('Key listener error: ' + (er && er.message || er)); } } }
  };
  const keyDn = (e) => onKey(e, true), keyUp = (e) => onKey(e, false);
  if (AS1) { document.addEventListener('keydown', keyDn); document.addEventListener('keyup', keyUp); }
  function resolvePath(from, str) {
    if (str && typeof str === 'object') return str;
    let cur = from; const p = String(str == null ? '' : str);
    let parts = p.split(/[\/.]/);
    if (p[0] === '/') { cur = rootInst; parts = parts.slice(1); }
    for (const part of parts) {
      if (!part || part === '.') continue;
      if (part === '..' || part === '_parent') cur = cur && cur.parent;
      else if (part === '_root' || part === '_level0') cur = rootInst;
      else cur = cur && kidByName(cur, part);
      if (!cur) return null;
    }
    return cur;
  }
  const toInst = (from, t) => (t && t.__inst ? t.__inst : resolvePath(from, t));
  function AS1Sound(target) {
    const o = this; let id = null, h = null; o.onSoundComplete = null;
    o.attachSound = (name) => { id = sndIds.get(String(name)) || null; if (!id) report('Sound "' + name + '" was not found in the library.'); };
    o.start = (off, loops) => { if (!id) return; if (h) h.stop(); h = makeSound(id, { loop: Math.max(0, (loops | 0) - 1) }, true); h.on('complete', () => { if (typeof o.onSoundComplete === 'function') { try { o.onSoundComplete(); } catch (e) { report('onSoundComplete error: ' + (e && e.message || e)); } } }); if (o._vol != null) h.volume = o._vol; };
    o.stop = () => { if (h) h.stop(); };
    o.setVolume = (v) => { o._vol = Math.max(0, +v || 0) / 100; if (h) h.volume = o._vol; };
    o.getVolume = () => Math.round((o._vol == null ? 1 : o._vol) * 100);
    o.setPan = () => {}; o.getPan = () => 0;
    Object.defineProperty(o, 'position', { get: () => (h ? h.position : 0) });
    Object.defineProperty(o, 'duration', { get: () => (h ? h.duration : 0) });
  }
  const JS_GLOBALS = new Set(['Math', 'Date', 'Array', 'Object', 'String', 'Number', 'Boolean', 'RegExp', 'Error', 'Function', 'JSON', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'NaN', 'Infinity', 'undefined', 'escape', 'unescape', 'encodeURIComponent', 'decodeURIComponent', 'encodeURI', 'decodeURI', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'arguments', 'console']);
  function as1Scope(owner, target) {
    const tw = as1Wrap(target);
    const G = {
      __on: (evs, fn) => { const h = owner.hs || (owner.hs = {}); for (const e of evs) (h[e] || (h[e] = [])).push(fn); },
      __clip: (evs, fn) => { const h = owner.hs || (owner.hs = {}); for (const e of evs) (h[e] || (h[e] = [])).push(fn); },
      __tt: (p) => { const k = resolvePath(target, p); return k ? as1Wrap(k) : {}; },
      trace: (...a) => { try { console.log.apply(console, a); } catch (e) { /* no console */ } },
      getURL: (u, w) => { const url = String(u == null ? '' : u); if (/^\s*(javascript|data|vbscript):/i.test(url)) { report('getURL blocked an unsafe address.'); return; } if (opt.onURL) opt.onURL(url, w); else { try { root.open(url, w || '_self'); } catch (e) { /* blocked */ } } },
      random: (n) => Math.floor(Math.random() * Math.floor(+n || 0)),
      getTimer: () => Math.round(performance.now() - t0),
      int: (v) => Math.trunc(+v) || 0,
      stopAllSounds: () => Sound.stop(),
      setProperty: (t, p, v) => { const k = toInst(target, t); if (k) as1Wrap(k)[p] = v; },
      getProperty: (t, p) => { const k = toInst(target, t); return k ? as1Wrap(k)[p] : undefined; },
      Key: KeyObj, Mouse: { addListener() {}, removeListener() {}, hide() {}, show() {} },
      Sound: AS1Sound,
      attachMovie: () => warnOnce('attachMovie()'), duplicateMovieClip: () => warnOnce('duplicateMovieClip()'), removeMovieClip: () => warnOnce('removeMovieClip()'),
      loadMovie: () => warnOnce('loadMovie()'), loadMovieNum: () => warnOnce('loadMovieNum()'), loadVariables: () => warnOnce('loadVariables()'), unloadMovie: () => warnOnce('unloadMovie()'),
      fscommand: () => {}, updateAfterEvent: () => {}, startDrag: () => warnOnce('startDrag()'), stopDrag: () => {}
    };
    return new Proxy({}, {
      has: (_, p) => typeof p === 'string' && !JS_GLOBALS.has(p),
      get: (_, p) => { if (typeof p !== 'string') return undefined; return Object.prototype.hasOwnProperty.call(G, p) ? G[p] : tw[p]; },
      set: (_, p, v) => { if (typeof p === 'string') tw[p] = v; return true; }
    });
  }
  const asCache = new Map();
  function runAS1(owner, src, target, self) {
    let fn = asCache.get(src);
    if (fn === undefined) {
      try { fn = new Function('__s', 'with (__s) {\n' + Core.as1Prepare(src) + '\n}'); }
      catch (e) { report('Script syntax error: ' + e.message); fn = null; }
      asCache.set(src, fn);
    }
    if (!fn) return;
    try { fn.call(as1Wrap(self), as1Scope(owner, target)); }
    catch (e) { report('Script error' + (owner.name ? ' in ' + owner.name : '') + ': ' + (e && e.message || e)); }
  }
  function runInstScript(k, o) {
    const src = String(o.script);
    if (AS1) { runAS1(k, src, k.btn ? k.parent : k, k); return; }
    let fn = fnCache.get(src);
    if (fn === undefined) {
      try { fn = new Function('createjs', 'exportRoot', 'stage', 'lib', 'images', src); }
      catch (e) { report('Script syntax error: ' + e.message); fn = null; }
      fnCache.set(src, fn);
    }
    if (!fn) return;
    try { fn.call(k.proxy, createjs, rootInst.proxy, stageShim(), {}, {}); }
    catch (e) { report('Script error' + (k.name ? ' in ' + k.name : '') + ': ' + (e && e.message || e)); }
  }

  /* ---- drawing ---- */
  function renderInst(inst) {
    if (inst.btn) inst.cur = down && downChain.has(inst) && inst.total > 2 ? 2 : hoverChain.has(inst) && inst.total > 1 ? 1 : 0;
    const list = evalInst(inst);
    for (const { layer } of list) if (!layer.mask) entries.push({ inst, layer, M: ctx.getTransform() });
    Core.drawUnits(ctx, list, {}, (c, e) => {
      const prev = ctx; ctx = c;
      try {
        for (const o of e.objs) {
          const k = isInst(o) ? inst.kids.get(e.layer.id + '|' + o.id) : null;
          if (k) drawKid(k, o); else Core.drawObj(ctx, o, {});
        }
      } finally { ctx = prev; }
    });
  }
  function drawKid(k, o) {
    const ov = k.ov;
    if (ov.visible === false) return;
    ctx.save();
    const t = Object.assign({}, o.t);
    if (ov.x != null) t.x = ov.x; if (ov.y != null) t.y = ov.y; if (ov.rotation != null) t.r = ov.rotation;
    if (ov.scaleX != null) t.sx = ov.scaleX; if (ov.scaleY != null) t.sy = ov.scaleY;
    const m = Core.matOf(t);
    ctx.transform(m[0], m[1], m[2], m[3], m[4], m[5]);
    const alpha = ov.alpha != null ? ov.alpha : Core.nz(o.op, 1);
    if (o.kind === 'text') ctx.globalAlpha *= alpha;
    if (o.kind === 'text') {
      const c = Object.assign({}, o, { t: Core.newT(), op: 1 });
      if (ov.text != null) c.runs = [Object.assign({}, o.runs[0], { t: ov.text })];
      if (ov.color) c.runs = c.runs.map((r) => Object.assign({}, r, { c: ov.color }));
      Core.drawObj(ctx, c, {});
    } else {
      Core.groupAlpha(ctx, alpha, (c) => {
        const prev = ctx; ctx = c;
        try { if (o.pv) ctx.translate(-o.pv[0], -o.pv[1]); renderInst(k); } finally { ctx = prev; }
      });
    }
    ctx.restore();
  }
  function render() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (doc.bg && doc.bg !== 'transparent') { ctx.fillStyle = doc.bg; ctx.fillRect(0, 0, doc.w, doc.h); } else ctx.clearRect(0, 0, doc.w, doc.h);
    ctx.save(); ctx.beginPath(); ctx.rect(0, 0, doc.w, doc.h); ctx.clip();
    entries.length = 0;
    renderInst(rootInst);
    ctx.restore();
  }

  /* ---- pointer input ---- */
  function evtPt(e) { const r = cv.getBoundingClientRect(); return { x: (e.clientX - r.left) * cv.width / r.width, y: (e.clientY - r.top) * cv.height / r.height }; }
  function pick(px, py) {
    for (let i = entries.length - 1; i >= 0; i--) {
      const en = entries[i], inst = en.inst;
      if (inst.kind === 'text' || inst.ov.mouse === false) continue;
      const hf = inst.btn && inst.total > 3 ? 3 : inst.cur;
      const objs = hf === inst.cur ? evalInst(inst).find((x) => x.layer === en.layer) : { objs: Core.evalLayerObjs(en.layer, hf).filter(Core.notGhost) };
      if (!objs) continue;
      const p = en.M.inverse().transformPoint(new DOMPoint(px, py));
      for (const o of objs.objs) { if (isInst(o)) continue; if (Core.hitObj(o, p.x, p.y, 0, hc, true)) return inst; }
    }
    return null;
  }
  const chainOf = (inst) => { const s = new Set(); for (let k = inst; k; k = k.parent) s.add(k); return s; };
  const AS_MOUSE = { mousedown: 'press', click: 'release', mouseover: 'rollOver', mouseout: 'rollOut' };
  function dispatch(target, evt, from, bubble) {
    if (AS1 && AS_MOUSE[evt.type] && from === undefined) fireUp(target, AS_MOUSE[evt.type]);
    evt.target = target.proxy;
    for (let k = from || target; k; k = bubble === false ? null : k.parent) {
      evt.currentTarget = k.proxy;
      for (const fn of (k.ls[evt.type] || []).slice()) { try { fn.call(k.proxy, evt); } catch (e) { report('Event handler error: ' + (e && e.message || e)); } }
    }
  }
  const mk = (type, p) => ({ type, stageX: p.x / dpr, stageY: p.y / dpr, rawX: p.x / dpr, rawY: p.y / dpr });
  function wantsPointer(chain) { for (const k of chain) if (k.btn || k.ls.click || k.ls.mousedown || k.ls.pressup || (k.hs && (k.hs.press || k.hs.release || k.hs.releaseOutside)) || (k.hset && (k.hset.press || k.hset.release))) return true; return false; }
  function setHover(t, p) {
    if (t !== hoverTop) {
      if (hoverTop && hoverTop.alive) dispatch(hoverTop, mk('mouseout', p));
      hoverTop = t; hoverChain = t ? chainOf(t) : new Set();
      if (t) dispatch(t, mk('mouseover', p));
    }
    cv.style.cursor = t && wantsPointer(hoverChain) ? 'pointer' : '';
  }
  cv.addEventListener('pointermove', (e) => { const p = evtPt(e); mouse = { x: p.x / dpr, y: p.y / dpr }; setHover(pick(p.x, p.y), p); if (AS1) walk(rootInst, (k) => fireH(k, 'mouseMove')); if (paused) render(); });
  cv.addEventListener('pointerleave', (e) => { setHover(null, evtPt(e)); });
  cv.addEventListener('pointerdown', (e) => {
    const p = evtPt(e), t = pick(p.x, p.y);
    down = t; downChain = t ? chainOf(t) : new Set();
    dispatch(rootInst, mk('stagemousedown', p), rootInst, false);
    if (AS1) walk(rootInst, (k) => fireH(k, 'mouseDown'));
    if (t) dispatch(t, mk('mousedown', p));
  });
  cv.addEventListener('pointerup', (e) => {
    const p = evtPt(e), t = pick(p.x, p.y), d = down;
    down = null; downChain = new Set();
    dispatch(rootInst, mk('stagemouseup', p), rootInst, false);
    if (AS1) walk(rootInst, (k) => fireH(k, 'mouseUp'));
    if (d && d.alive) dispatch(d, mk('pressup', p));
    if (AS1 && d && d.alive && t !== d) fireUp(d, 'releaseOutside');
    if (t && d && t === d) dispatch(t, mk('click', p));
    if (paused) render();
  });

  /* ---- loop ---- */
  const rootInst = newInst({ layers: doc.layers, frames: doc.frames }, null, 'root', null);
  rootInst.name = 'exportRoot';
  function start() {
    if (started) return;
    started = true;
    enter(rootInst); rootInst.fresh = false;
    /* clips present on the first frame were not born during a tick, so they advance with the root from the very first tick */
    (function clearFresh(i) { for (const k of i.kids.values()) { k.fresh = false; clearFresh(k); } })(rootInst);
    render();
    let last = performance.now(), acc = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(250, now - last); last = now;
      stepTweens(now);
      if (!paused) {
        acc += dt * doc.fps / 1000;
        let n = Math.floor(acc); acc -= n;
        for (n = Math.min(n, 5); n > 0; n--) tickAll();
      }
      render();
    };
    raf = requestAnimationFrame(loop);
  }
  return {
    root: rootInst.proxy, errors, start, render, hasScripts: hasScripts(),
    setPaused: (v) => { paused = !!v; }, isPaused: () => paused, tick: tickAll,
    scrub: (f) => { goto(rootInst, f, false); render(); },
    stop: () => { cancelAnimationFrame(raf); document.removeEventListener('keydown', keyDn); document.removeEventListener('keyup', keyUp); }
  };
}
root.FCRuntime = { create };
})(typeof window !== 'undefined' ? window : globalThis);
