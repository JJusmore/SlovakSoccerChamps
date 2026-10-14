'use strict';
// ─── Živý zápas: fyzika, AI, ovládanie, vykresľovanie ─────────────

const PL = 105, PW = 68, GW = 7.32, GH = 2.44;
const GY1 = PW / 2 - GW / 2, GY2 = PW / 2 + GW / 2;
const MIN_PER_SEC = 1.5;
const GK_KITS = ['#2ecc71', '#ff9800', '#9c27b0', '#222222', '#00bcd4', '#e91e63', '#cddc39', '#795548'];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// ─── Zvuk (WebAudio, generovaný) ─────────────────────────────────
const SFX = {
  ctx: null, crowd: null, noiseBuf: null,
  on() { return G && G.settings && G.settings.sound; },
  init() {
    if (this.ctx || !this.on()) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      const len = this.ctx.sampleRate * 2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
  },
  noise(dur, freq, q, gain, attack = 0.01) {
    if (!this.ctx || !this.on()) return null;
    const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noiseBuf; src.loop = true;
    f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
    const t = c.currentTime;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(c.destination);
    src.start(t); src.stop(t + dur + 0.05);
    return src;
  },
  whistle(n = 1) {
    if (!this.ctx || !this.on()) return;
    const c = this.ctx;
    for (let i = 0; i < n; i++) {
      const t = c.currentTime + i * 0.38, o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
      o.frequency.value = 2900; lfo.frequency.value = 28; lg.gain.value = 120;
      lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
      g.gain.setValueAtTime(0.08, t + (n > 1 && i === n - 1 ? 0.55 : 0.25)); g.gain.exponentialRampToValueAtTime(0.0001, t + (n > 1 && i === n - 1 ? 0.62 : 0.3));
      o.connect(g); g.connect(c.destination);
      o.start(t); lfo.start(t); o.stop(t + 0.7); lfo.stop(t + 0.7);
    }
  },
  kick(v = 1) { this.noise(0.07, 900, 0.8, 0.25 * v, 0.003); },
  cheer() { this.noise(3.2, 900, 0.5, 0.35, 0.25); this.noise(2.6, 1700, 0.7, 0.15, 0.3); },
  ooh() { this.noise(1.2, 700, 0.6, 0.18, 0.15); },
  startCrowd() {
    if (!this.ctx || !this.on() || this.crowd) return;
    const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.noiseBuf; src.loop = true;
    f.type = 'lowpass'; f.frequency.value = 520; g.gain.value = 0.045;
    src.connect(f); f.connect(g); g.connect(c.destination); src.start();
    this.crowd = { src, g };
  },
  stopCrowd() { if (this.crowd) { try { this.crowd.src.stop(); } catch (e) { /* */ } this.crowd = null; } },
};

// ─── Trieda zápasu ───────────────────────────────────────────────
class LiveMatch {
  constructor(root, cfg) {
    this.root = root; this.cfg = cfg;
    const home = this.home = cfg.home, away = this.away = cfg.away;
    prepareTeam(home, away); prepareTeam(away, home);
    this.orig = [{ lineup: home.lineup.slice(), ment: home.ment }, { lineup: away.lineup.slice(), ment: away.ment }];
    this.userSide = cfg.userSide != null ? cfg.userSide : home.id === G.userTid ? 0 : away.id === G.userTid ? 1 : -1;
    this.manual = (cfg.control || G.settings.control) !== 'auto' && this.userSide >= 0;
    const rightSide = this.userSide === 1 ? 1 : 0;

    let kA = away.kit;
    if (U.colorDist(home.kit.p, away.kit.p) < 150) kA = kitAway(away);
    if (U.colorDist(home.kit.p, kA.p) < 150) kA = { p: '#222244', s: '#ffd200', sh: '#222244', pat: 'plain' };
    this.kits = [{ ...home.kit }, { ...kA }];
    const gks = GK_KITS.filter(c => U.colorDist(c, this.kits[0].p) > 140 && U.colorDist(c, this.kits[1].p) > 140);
    this.gkKits = [0, 1].map(i => { const c = gks[i] || GK_KITS[i]; return { p: c, s: '#111111', sh: U.shade(c, -0.4), pat: 'plain', so: c }; });

    this.sides = [0, 1].map(i => ({ i, team: i ? away : home, dir: i === rightSide ? 1 : -1, goals: 0, shots: 0, onT: 0, poss: 0.01, subs: 0, subsIn: [], subsOut: [], mps: [] }));
    for (const S of this.sides) this.buildSide(S);
    this.str = [teamStrength(home), teamStrength(away)];

    this.ball = { x: PL / 2, y: PW / 2, z: 0, vx: 0, vy: 0, vz: 0, owner: null, lastTouch: null, shot: null, spin: 0, rot: 0, passTarget: null, pass: null };
    this.minute = 0; this.half2 = false; this.added = U.ri(1, 4); this.chIdx = 0;
    this.chances = buildChances(home, away, cfg.neutral);
    // karty sú vopred vylosované, ukážu sa v danej minúte
    this.cardEv = genCards(home, away); this.cardIdx = 0; this.cardsOut = []; this.men = [11, 11];
    // zranenia sú tiež vopred vylosované
    this.injEv = genInjuries(home, away); this.injIdx = 0; this.injOut = [];
    // počasie (vizuálne) a VAR
    this.wx = weatherFor(home); this.varOn = varOn(home, away); this.varx = []; this.varPend = null; this.wxP = null; this.flashT = 0;
    // mapa striel, heatmapa, šatňa cez polčas
    this.shotLog = []; this.heat = {}; this.heatT = 0; this.htDone = false; G.htTalk = null;
    this.events = []; this.now = 0; this.speed = G.settings.speed || 1;
    this.cam = { x: PL / 2, y: PW / 2, s: 6 };
    this.keys = {}; this.ptr = { down: false, path: [] };
    this.fade = 0; this.trail = []; this.hintShown = false;
    this.penShootout = null;
    this.buildDOM();
    this.bindInput();
    this.resize();
    this.kickoff(0);
    this.cam.s = this.targetScale(false);
    this.state = 'intro'; this.introT = 1.8;
    this.banner('VÝKOP', `${home.name} – ${away.name}`, 'info', 1.6);
    SFX.init(); SFX.whistle(1); SFX.startCrowd();
    this.last = performance.now(); this.acc = 0;
    this.loop = this.loop.bind(this);
    this.raf = requestAnimationFrame(this.loop);
  }

  // ─── Príprava ────────────────────────────────────────────
  buildSide(S) {
    const t = S.team, slots = FORMATIONS[t.form];
    S.mps = [];
    t.lineup.forEach((pid, i) => {
      const p = G.players[pid];
      if (!p) return;
      S.mps.push(this.makeMP(S, p, i, slots[i]));
    });
  }
  makeMP(S, p, i, slot) {
    const role = slot[0], eff = effR(p, role, slot);
    const fit = (0.7 + 0.3 * p.fit / 100) * xpFactor(p);
    const a = playerAttrs(p).map(v => v * fit * (p.pos === 'GK' ? 1 : posFit(p, role === 'GK' ? p.pos : role, role === 'GK' ? null : slot)));
    const tr = p.tr || {};
    const isGKp = p.pos === 'GK';
    const out = isGKp ? [eff * 0.8, eff * 0.45, eff * 0.6, eff * 0.5, eff * 0.6, a[5]] : a;
    const gk = isGKp ? a : [eff, eff, eff];
    return {
      p, side: S.i, slot: i, role, fx: slot[1], fy: slot[2], x: PL / 2, y: PW / 2, vx: 0, vy: 0, tx: PL / 2, ty: PW / 2, sf: 1,
      maxV: (5.3 + 2.8 * out[0] / 100) * (1 + 0.025 * (tr.spd || 0)), eff, tr, wf: p.wf || 3, sk: p.sk || 2, ft: p.ft || 'R', phase: Math.random() * 6, face: S.dir, cd: 0, shield: 0, tackleCd: 0,
      pac: out[0], sho: out[1], pas: out[2], dri: out[3], def: out[4], phy: out[5], ref: gk[0], han: gk[1], rush: gk[2],
      isGK: role === 'GK', look: playerLook(p), num: p.num, react: 0, beaten: false, override: false, dive: 0,
    };
  }
  all() { return this.sides[0].mps.concat(this.sides[1].mps); }
  toW(S, u, v) { return S.dir > 0 ? [u, v] : [PL - u, PW - v]; }
  toF(S, x, y) { return S.dir > 0 ? [x, y] : [PL - x, PW - y]; }
  gkOf(S) { return S.mps.find(m => m.isGK) || S.mps[0]; }

  // ─── DOM a HUD ───────────────────────────────────────────
  buildDOM() {
    const h = this.home, a = this.away;
    this.root.innerHTML = `
<div class="match">
  <canvas class="mcanvas"></canvas>
  <div class="mhud">
    <div class="sb">
      <div class="sb-t">${crestSVG(h, 26)}<span>${U.esc(h.short)}</span></div>
      <div class="sb-score"><span class="g0">0</span><i>:</i><span class="g1">0</span></div>
      <div class="sb-t"><span>${U.esc(a.short)}</span>${crestSVG(a, 26)}</div>
      <div class="sb-time">0'</div>
    </div>
    <div class="mbtns">
      <button class="mb mb-speed" title="Rýchlosť">×${this.speed}</button>
      <button class="mb mb-skip" title="Preskočiť akciu" hidden>⏭</button>
      <button class="mb mb-pause" title="Pauza / taktika">❚❚</button>
    </div>
    <div class="mbanner"><div class="mb-title"></div><div class="mb-sub"></div></div>
    <div class="mcomment"></div>
    <div class="mtl"><div class="mtl-fill"></div><div class="mtl-marks"></div><div class="mtl-half"></div></div>
    <div class="mhint" hidden></div>
  </div>
  <div class="moverlay" hidden></div>
</div>`;
    const q = s => this.root.querySelector(s);
    this.cv = q('.mcanvas'); this.ctx = this.cv.getContext('2d');
    this.el = {
      g0: q('.g0'), g1: q('.g1'), time: q('.sb-time'), banner: q('.mbanner'), bt: q('.mb-title'), bs: q('.mb-sub'),
      comment: q('.mcomment'), fill: q('.mtl-fill'), marks: q('.mtl-marks'), hint: q('.mhint'), overlay: q('.moverlay'),
      speed: q('.mb-speed'), skip: q('.mb-skip'), pause: q('.mb-pause'),
    };
    this.el.speed.onclick = () => {
      this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 4 : 1;
      G.settings.speed = this.speed; this.el.speed.textContent = '×' + this.speed;
    };
    this.el.skip.onclick = () => this.skipChance();
    this.el.pause.onclick = () => this.openTactics();
  }

  banner(title, sub = '', cls = '', dur = 2) {
    const b = this.el.banner;
    this.el.bt.textContent = title; this.el.bs.textContent = sub;
    b.className = 'mbanner show ' + cls;
    clearTimeout(this.bannerTO);
    this.bannerTO = setTimeout(() => { b.className = 'mbanner ' + cls; }, dur * 1000);
  }
  comment(txt) {
    this.el.comment.textContent = txt;
    this.el.comment.classList.remove('pop'); void this.el.comment.offsetWidth; this.el.comment.classList.add('pop');
  }
  updateHUD() {
    this.el.g0.textContent = this.sides[0].goals; this.el.g1.textContent = this.sides[1].goals;
    const m = Math.floor(this.minute);
    let txt;
    if (this.penShootout) txt = 'PK';
    else if (!this.half2 && m >= 45) txt = '45\'';
    else if (m >= 90) txt = '90+' + Math.max(1, m - 89) + '\'';
    else txt = Math.max(0, m) + '\'';
    this.el.time.textContent = txt;
    this.el.fill.style.width = U.clamp(this.minute / 90 * 100, 0, 100) + '%';
    this.el.skip.hidden = !(this.state === 'chance' && !this.userCtrl);
  }
  addMark(side, min) {
    const d = document.createElement('i');
    d.className = 'mk s' + side;
    d.style.left = U.clamp(min / 90 * 100, 0, 100) + '%';
    this.el.marks.appendChild(d);
  }

  // ─── Vstup ───────────────────────────────────────────────
  bindInput() {
    const cv = this.cv;
    const pos = e => { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * this.dpr, (e.clientY - r.top) * this.dpr]; };
    this.onDown = e => {
      SFX.init();
      if (this.state !== 'chance' || !this.userCtrl) return;
      e.preventDefault();
      const [x, y] = pos(e);
      this.ptr = { down: true, x, y, x0: x, y0: y, t0: performance.now(), path: [[x, y, performance.now()]], steer: false };
      cv.setPointerCapture && cv.setPointerCapture(e.pointerId);
    };
    this.onMove = e => {
      const [x, y] = pos(e);
      this.mouse = [x, y];
      if (!this.ptr.down) return;
      const now = performance.now();
      this.ptr.x = x; this.ptr.y = y;
      this.ptr.path.push([x, y, now]);
      if (this.ptr.path.length > 60) this.ptr.path.shift();
      const moved = Math.hypot(x - this.ptr.x0, y - this.ptr.y0);
      if (!this.ptr.steer && now - this.ptr.t0 > 200 && moved < 30 * this.dpr) this.ptr.steer = true;
    };
    this.onUp = e => {
      if (!this.ptr.down) return;
      const now = performance.now();
      const p = this.ptr; p.down = false;
      const dur = now - p.t0, total = Math.hypot(p.x - p.x0, p.y - p.y0);
      const recent = p.path.filter(q => now - q[2] < 160);
      let rv = 0, rl = 0;
      if (recent.length > 1) {
        const a = recent[0], b = recent[recent.length - 1];
        rl = Math.hypot(b[0] - a[0], b[1] - a[1]); rv = rl / Math.max(1, b[2] - a[2]);
      }
      const D = this.dpr;
      if (!p.steer && dur < 260 && total < 16 * D) this.tap(p.x, p.y);
      else if ((!p.steer && total > 30 * D && dur < 600) || (rl > 35 * D && rv > 0.7 * D)) {
        let path = p.path;
        if (p.steer) path = recent;
        this.swipe(path);
      }
    };
    cv.addEventListener('pointerdown', this.onDown);
    cv.addEventListener('pointermove', this.onMove);
    cv.addEventListener('pointerup', this.onUp);
    cv.addEventListener('pointercancel', () => { this.ptr.down = false; });
    this.onKey = e => {
      const k = e.key.toLowerCase();
      const map = { arrowup: 'u', w: 'u', arrowdown: 'd', s: 'd', arrowleft: 'l', a: 'l', arrowright: 'r', d: 'r' };
      if (e.type === 'keydown') {
        SFX.init();
        if (map[k]) { this.keys[map[k]] = true; e.preventDefault(); }
        if (k === ' ' && this.state === 'chance' && this.userCtrl) { e.preventDefault(); this.keyShoot(); }
        if ((k === 'e' || k === 'q') && this.state === 'chance' && this.userCtrl) this.keyPass();
        if (k === 'p' || k === 'escape') this.openTactics();
      } else if (map[k]) this.keys[map[k]] = false;
    };
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
    this.onResize = () => this.resize();
    window.addEventListener('resize', this.onResize);
  }

  resize() {
    const r = this.cv.getBoundingClientRect();
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.cv.width = Math.max(200, Math.round(r.width * this.dpr));
    this.cv.height = Math.max(150, Math.round(r.height * this.dpr));
    this.rot = this.cv.height > this.cv.width * 1.15;
  }

  // svet → obrazovka
  w2s(x, y) {
    const c = this.cam, W = this.cv.width, H = this.cv.height;
    const dx = (x - c.x) * c.s, dy = (y - c.y) * c.s;
    return this.rot ? [W / 2 + dy, H / 2 - dx] : [W / 2 + dx, H / 2 + dy];
  }
  s2w(sx, sy) {
    const c = this.cam, W = this.cv.width, H = this.cv.height;
    const dx = sx - W / 2, dy = sy - H / 2;
    return this.rot ? [c.x - dy / c.s, c.y + dx / c.s] : [c.x + dx / c.s, c.y + dy / c.s];
  }
  sdir(dx, dy) { return this.rot ? [-dy, dx] : [dx, dy]; } // smer na obrazovke → smer vo svete

  controlled() {
    if (!this.userCtrl) return null;
    const b = this.ball;
    if (b.owner && b.owner.side === this.userSide) return b.owner;
    if (b.passTarget && b.passTarget.side === this.userSide) return b.passTarget;
    return null;
  }

  tap(sx, sy) {
    const car = this.ball.owner;
    if (!car || car.side !== this.userSide || this.isPen) return;
    const [wx, wy] = this.s2w(sx, sy);
    const S = this.sides[this.userSide];
    let best = null, bd = 7;
    for (const m of S.mps) {
      if (m === car) continue;
      const d = Math.hypot(m.x - wx, m.y - wy);
      if (d < bd) { bd = d; best = m; }
    }
    if (best) this.pass(car, best, { lofted: dist(car, best) > 26 });
    else {
      let rec = null, rd = 1e9;
      for (const m of S.mps) { if (m === car || m.isGK) continue; const d = Math.hypot(m.x - wx, m.y - wy); if (d < rd) { rd = d; rec = m; } }
      if (rec) this.pass(car, rec, { point: [wx, wy], lofted: Math.hypot(car.x - wx, car.y - wy) > 28 });
    }
    this.hideHint();
  }

  swipe(path) {
    const car = this.ball.owner;
    if (!car || car.side !== this.userSide) return;
    const a = path[0], b = path[path.length - 1];
    const sdx = b[0] - a[0], sdy = b[1] - a[1];
    const len = Math.hypot(sdx, sdy);
    if (len < 10) return;
    let dev = 0;
    for (const q of path) {
      const cr = ((q[0] - a[0]) * sdy - (q[1] - a[1]) * sdx) / len;
      if (Math.abs(cr) > Math.abs(dev)) dev = cr;
    }
    const ref = Math.min(this.cv.width, this.cv.height);
    const power = U.clamp(len / (ref * 0.26), 0.3, 1);
    let curl = U.clamp(dev / len * 3.2, -1, 1);
    if (Math.abs(curl) < 0.12) curl = 0;
    const [dx, dy] = this.sdir(sdx, sdy);
    this.trail = path.map(q => [q[0], q[1]]); this.trailT = 0.35;
    this.shoot(car, dx, dy, power, curl);
    this.hideHint();
  }

  keyShoot() {
    const car = this.ball.owner;
    if (!car || car.side !== this.userSide) return;
    const S = this.sides[this.userSide];
    let tx = S.dir > 0 ? PL : 0, ty = PW / 2;
    if (this.mouse) {
      const [wx, wy] = this.s2w(this.mouse[0], this.mouse[1]);
      if (Math.abs(wx - tx) < 30) ty = U.clamp(wy, GY1 - 3, GY2 + 3);
    }
    this.shoot(car, tx - car.x, ty - car.y, 0.8, 0);
  }
  keyPass() {
    const car = this.ball.owner;
    if (!car || car.side !== this.userSide || this.isPen) return;
    const opt = this.bestPassOption(car);
    if (opt) this.pass(car, opt.mp, {});
  }

  showHint(txt) { if (this.hintShown) return; this.hintShown = true; this.el.hint.innerHTML = txt; this.el.hint.hidden = false; }
  hideHint() { this.el.hint.hidden = true; }

  // ─── Hlavná slučka ───────────────────────────────────────
  loop(ts) {
    if (this.dead) return;
    const dt = Math.min(0.1, (ts - this.last) / 1000);
    this.last = ts;
    if (!this.paused) {
      this.acc += dt;
      const step = 1 / 60;
      let n = 0;
      while (this.acc >= step && n < 6) {
        const reps = this.state === 'flow' ? this.speed : (this.state === 'chance' && !this.userCtrl ? Math.min(2, this.speed) : 1);
        for (let r = 0; r < reps && !this.paused && !this.dead; r++) this.update(step);
        this.acc -= step; n++;
      }
      if (n === 6) this.acc = 0;
      this.updateCamera(dt);
    }
    this.render(dt);
    this.updateHUD();
    this.raf = requestAnimationFrame(this.loop);
  }

  update(dt) {
    this.now += dt;
    if ((this.heatT += dt) > 0.5) { this.heatT = 0; this.sampleHeat(); }
    if (this.fade > 0) this.fade = Math.max(0, this.fade - dt * 2.5);
    if (this.trailT > 0) this.trailT -= dt;
    switch (this.state) {
      case 'intro':
        this.introT -= dt;
        this.flowMovePlayers(dt, true);
        if (this.introT <= 0) this.state = 'flow';
        break;
      case 'flow': this.updateFlow(dt); break;
      case 'chance': this.updateChance(dt); break;
      case 'goal':
        this.goalT -= dt;
        if (this.varPend && (this.varPend.t -= dt) <= 0) this.varAnnul();
        this.physicsBall(dt, true);
        this.celebrate(dt);
        if (this.goalT <= 0) {
          if (this.penShootout) this.nextPenKick();
          else this.kickoff(1 - this.goalSide);
        }
        break;
      case 'pause2':
        this.waitT -= dt;
        if (!this.penShootout) this.flowMovePlayers(dt, false);
        else this.physicsBall(dt, true);
        if (this.waitT <= 0 && this.afterWait) { const f = this.afterWait; this.afterWait = null; f(); }
        break;
    }
  }

  // ─── Plynulá hra (zrýchlený čas) ────────────────────────
  kickoff(possSide) {
    for (const S of this.sides) for (const m of S.mps) {
      const u = m.isGK ? 3 : Math.min(46, 6 + m.fx * 62), v = 6 + m.fy * 56;
      const [x, y] = this.toW(S, u, v);
      m.x = m.tx = x; m.y = m.ty = y; m.vx = m.vy = 0;
    }
    const S = this.sides[possSide];
    const fw = S.mps.filter(m => !m.isGK).sort((a, b) => b.fx - a.fx || Math.abs(a.fy - 0.5) - Math.abs(b.fy - 0.5))[0];
    const [x, y] = this.toW(S, 52, 34);
    fw.x = fw.tx = x; fw.y = fw.ty = y;
    const b = this.ball;
    Object.assign(b, { x: PL / 2, y: PW / 2, z: 0, vx: 0, vy: 0, vz: 0, owner: fw, shot: null, spin: 0, passTarget: null, pass: null });
    this.flowInit(possSide);
  }

  flowInit(possSide) {
    this.state = 'flow';
    this.ch = null; this.userCtrl = false; this.isPen = false;
    const b = this.ball;
    b.shot = null; b.z = 0; b.passTarget = null; b.spin = 0; b.vx = b.vy = b.vz = 0;
    b.x = U.clamp(b.x, 1, PL - 1); b.y = U.clamp(b.y, 1, PW - 1);
    let o = b.owner && b.owner.side === possSide ? b.owner : null;
    if (!o) {
      let bd = 1e9;
      for (const m of this.sides[possSide].mps) { const d = dist(m, b); if (d < bd) { bd = d; o = m; } }
    }
    b.owner = o;
    this.poss = possSide;
    this.fl = { pass: null, next: this.now + U.rf(0.5, 1.0) };
    for (const m of this.all()) { m.override = false; m.dive = 0; }
    this.hideHint();
  }

  homeTarget(m, poss) {
    const S = this.sides[m.side];
    const [bu, bv] = this.toF(S, this.ball.x, this.ball.y);
    if (m.isGK) return this.toW(S, 4 + U.clamp((bu - 20) * 0.05, 0, 7), 34 + (bv - 34) * 0.12);
    const base = 8 + m.fx * 72;
    const shift = (bu - 45) * 0.5 + (poss ? 7 : -5);
    const u = U.clamp(base + shift, 7, poss ? 84 : 72);
    let v = 6 + m.fy * 56;
    v += (bv - v) * 0.22;
    return this.toW(S, u, v);
  }

  flowMovePlayers(dt, idle) {
    const b = this.ball;
    for (const m of this.all()) {
      if (m === b.owner || (this.fl && this.fl.pass && this.fl.pass.to === m)) continue;
      const [tx, ty] = this.homeTarget(m, m.side === this.poss);
      m.tx = tx; m.ty = ty; m.sf = idle ? 0.4 : 0.72;
    }
    for (const m of this.all()) this.movePlayer(m, dt);
    this.separate();
    if (b.owner) this.attachBall(b.owner, dt);
  }

  updateFlow(dt) {
    this.minute += dt * MIN_PER_SEC;
    this.sides[this.poss].poss += dt;
    while (this.cardIdx < this.cardEv.length && this.minute >= this.cardEv[this.cardIdx].min) this.showCard(this.cardEv[this.cardIdx++]);
    while (this.injIdx < this.injEv.length && this.minute >= this.injEv[this.injIdx].min) this.showInjury(this.injEv[this.injIdx++]);
    if (!this.half2 && this.minute >= 45) { this.minute = 45; this.halftime(); return; }
    const ch = this.chances[this.chIdx];
    if (ch && this.minute >= ch.min && (this.half2 || ch.min < 45)) { this.startChance(ch); return; }
    if (this.half2 && this.minute >= 90 + this.added) { this.chIdx = this.chances.length; this.fulltime(); return; }
    const b = this.ball, f = this.fl;
    if (f.pass) {
      const P = f.pass;
      P.t += dt;
      const k = Math.min(1, P.t / P.dur);
      b.x = U.lerp(P.x0, P.x1, k); b.y = U.lerp(P.y0, P.y1, k); b.z = P.h * 4 * k * (1 - k);
      b.rot += dt * 12;
      P.to.tx = P.x1; P.to.ty = P.y1; P.to.sf = 1;
      if (k >= 1) {
        b.owner = P.to; b.z = 0;
        if (P.to.side !== this.poss) this.poss = P.to.side;
        f.pass = null; f.next = this.now + U.rf(0.45, 1.1);
      }
    } else if (b.owner) {
      const o = b.owner, S = this.sides[o.side];
      const [u, v] = this.toF(S, o.x, o.y);
      const [tx, ty] = this.toW(S, Math.min(u + 5, 76), v + (34 - v) * 0.1);
      o.tx = tx; o.ty = ty; o.sf = 0.55;
      if (this.now >= f.next) this.flowPass();
    }
    this.flowMovePlayers(dt, false);
  }

  flowPass() {
    const b = this.ball, o = b.owner, S = this.sides[o.side], O = this.sides[1 - o.side];
    const [ou] = this.toF(S, o.x, o.y);
    const cands = S.mps.filter(m => m !== o);
    const tgt = U.weighted(cands, m => {
      const [mu] = this.toF(S, m.x, m.y);
      const d = dist(o, m);
      if (d < 5 || d > 40) return 0.03;
      let w = (mu - ou > 0 ? (mu > 80 ? 0.3 : 1.6) : 0.8) / (1 + d / 25);
      if (m.isGK) w *= ou < 35 ? 0.4 : 0.02;
      return w;
    });
    let to = tgt, x1 = tgt.x + tgt.vx * 0.4, y1 = tgt.y + tgt.vy * 0.4;
    const pt = U.clamp(0.13 * Math.pow(this.str[O.i].mid / Math.max(5, this.str[S.i].mid), 1.5), 0.05, 0.35);
    if (U.chance(pt)) {
      const k = U.rf(0.4, 0.9);
      const ix = U.lerp(o.x, x1, k), iy = U.lerp(o.y, y1, k);
      let bd = 1e9;
      for (const m of O.mps) { if (m.isGK) continue; const d = Math.hypot(m.x - ix, m.y - iy); if (d < bd) { bd = d; to = m; } }
      x1 = ix; y1 = iy;
    }
    x1 = U.clamp(x1, 1, PL - 1); y1 = U.clamp(y1, 1, PW - 1);
    const d = Math.hypot(b.x - x1, b.y - y1);
    this.fl.pass = { x0: b.x, y0: b.y, x1, y1, t: 0, dur: 0.25 + d / 22, h: d > 25 ? U.rf(1.5, 3) : 0, to };
    b.owner = null;
    SFX.kick(0.25);
  }

  // ─── Šanca (hrá sa v reálnom čase) ───────────────────────
  startChance(ch) {
    const A = this.sides[ch.side], D = this.sides[1 - ch.side];
    this.att = A; this.def = D; this.ch = ch; this.t = 0; this.endT = null; this.lastPasser = null;
    this.aiDecT = 0.6; this.markT = 0; this.marks = new Map();
    if (!ch.kind) ch.kind = U.weighted(['build', 'counter', 'wing', 'pen'], k => ({ build: 48, counter: 22, wing: 26, pen: 4 })[k]);
    this.userCtrl = this.manual && A.i === this.userSide;
    this.isPen = ch.kind === 'pen';
    if (!this.userCtrl && ch.forced == null && !ch.shootout) {
      const sh = A.mps.filter(m => !m.isGK).map(m => m.sho).sort((a, b) => b - a).slice(0, 3);
      const g = this.gkOf(D);
      ch.forced = U.chance(goalProb(U.avg(sh), (g.ref + g.han) / 2) * (this.isPen ? 2.6 : 1)) ? 'goal' : 'nogoal';
    }
    const flip = U.chance(0.5);
    const place = (m, ua, va) => {
      va = U.clamp(va, 1.5, PW - 1.5); ua = U.clamp(ua, 0.5, PL - 0.5);
      const [x, y] = this.toW(A, ua, flip ? PW - va : va);
      m.x = m.tx = x; m.y = m.ty = y; m.vx = m.vy = 0;
    };
    const placeD = (m, ud, vd) => place(m, PL - ud, PW - vd);
    for (const m of this.all()) { m.cd = 0; m.shield = 0; m.tackleCd = 0.4; m.beaten = false; m.override = false; m.dive = 0; m.react = 0; m.su = null; m.stun = 0; m.boost = 0; m.face = this.sides[m.side].dir; }
    this.spaceT = 0; this.stillT = 0;
    const oA = A.mps.filter(m => !m.isGK), oD = D.mps.filter(m => !m.isGK);
    const gA = this.gkOf(A), gD = this.gkOf(D);
    place(gA, 6, 34); placeD(gD, 1.2, 34);
    const kind = ch.kind;
    let car;
    if (kind === 'pen') {
      car = ch.taker || oA.slice().sort((a, b) => b.sho - a.sho)[0];
      place(car, 93.3, 34);
      let i = 0;
      for (const m of oA) if (m !== car) { place(m, 84 - (i % 3) * 3, 14 + (i * 5.3) % 40); i++; }
      i = 0;
      for (const m of oD) { place(m, 85 - (i % 2) * 2, 20 + (i * 4.7) % 30); i++; }
      placeD(gD, 0.4, 34);
    } else if (kind === 'counter') {
      car = U.weighted(oA, m => (m.role === 'FW' ? 3 : m.role === 'MF' ? 1.2 : 0.1) * m.eff);
      const cv = 34 + U.rf(-8, 8);
      place(car, 55, cv);
      const mates = oA.filter(m => m !== car).sort((a, b) => b.fx - a.fx);
      mates.forEach((m, i) => {
        if (i === 0) place(m, 58, cv + (cv > 34 ? -14 : 14));
        else if (i === 1) place(m, 50, cv + (cv > 34 ? 10 : -12));
        else place(m, 30 + m.fx * 30, 6 + m.fy * 56);
      });
      const dd = oD.slice().sort((a, b) => a.fx - b.fx);
      dd.forEach((m, i) => {
        if (i < 3) placeD(m, 24 + U.rf(-3, 3), 22 + i * 12 + U.rf(-2, 2));
        else placeD(m, 52 + U.rf(0, 10), 6 + m.fy * 56);
      });
    } else if (kind === 'wing') {
      const wide = oA.filter(m => (m.role === 'MF' || m.role === 'FW') && Math.abs(m.fy - 0.5) > 0.25);
      car = wide.length ? U.pick(wide) : U.weighted(oA, m => m.role === 'FW' ? 2 : 1);
      const side = car.fy < 0.5 ? 1 : -1;
      const cv = side > 0 ? 7 : PW - 7;
      place(car, 80 + U.rf(-3, 4), cv);
      oA.filter(m => m !== car).forEach(m => {
        if (m.role === 'FW') place(m, 90 + U.rf(-3, 3), 34 + (m.fy - 0.5) * 18 + U.rf(-3, 3));
        else if (m.role === 'MF') place(m, 72 + m.fx * 14, 34 + (m.fy - 0.5) * 40);
        else place(m, 45 + m.fx * 20, 6 + m.fy * 56);
      });
      oD.forEach(m => placeD(m, 7 + m.fx * 33 + U.rf(-1, 1), 34 + (m.fy - 0.5) * 34));
    } else {
      car = U.weighted(oA, m => (m.role === 'MF' ? 2 : m.role === 'FW' ? 1.5 : 0.25) * m.eff);
      const cv = 34 + U.rf(-11, 11);
      place(car, 67 + U.rf(-2, 4), cv);
      oA.filter(m => m !== car).forEach(m => {
        if (m.role === 'FW') place(m, 77 + U.rf(0, 6), 34 + (m.fy - 0.5) * 40);
        else if (m.role === 'MF') place(m, 58 + (m.fx - 0.43) * 40, 6 + m.fy * 56);
        else place(m, 38 + (m.fx - 0.2) * 30, 6 + m.fy * 56);
      });
      const cu = this.toF(A, car.x, car.y)[0];
      const mfs = oD.filter(m => m.role === 'MF').sort((a, b) => Math.abs(a.fy - 0.5) - Math.abs(b.fy - 0.5));
      const holding = new Set(mfs.slice(0, 2));
      oD.forEach(m => {
        let vd = 6 + m.fy * 56; vd += ((PW - cv) - vd) * 0.25;
        if (m.role === 'DF') placeD(m, 15 + (m.fx - 0.2) * 20 + U.rf(-1, 1), vd);
        else if (holding.has(m)) placeD(m, 25 + U.rf(-1.5, 2), 34 + (vd - 34) * 0.5);
        else place(m, cu - U.rf(4, 14), PW - vd);
      });
    }
    const b = this.ball;
    Object.assign(b, { owner: car, shot: null, z: 0, vx: 0, vy: 0, vz: 0, spin: 0, passTarget: null, pass: null, lastTouch: car });
    this.attachBall(car, 0, true);
    car.shield = 1.1;
    this.state = 'chance';
    this.fade = 1;
    this.cam.x = b.x + A.dir * 8; this.cam.y = b.y;
    this.cam.s = this.targetScale(true);
    const tn = A.team.name;
    if (kind === 'pen') { this.banner(ch.shootout ? 'PENALTA' : 'PENALTA!', tn, A.i === this.userSide ? 'good' : 'bad', 1.6); SFX.whistle(1); }
    else this.banner(A.i === this.userSide ? 'TVOJA ŠANCA!' : 'ŠANCA SÚPERA', tn, A.i === this.userSide ? 'good' : 'bad', 1.2);
    const cm = { build: `${pName(car.p)} rozbieha útok…`, counter: `Rýchly protiútok! ${pName(car.p)} sa rúti dopredu!`, wing: `${pName(car.p)} beží po krídle…`, pen: `K penalte sa stavia ${pName(car.p)}.` };
    this.comment(cm[kind]);
    if (this.userCtrl) {
      if (kind === 'pen') this.showHint('<b>Potiahni</b> prstom/myšou smerom k bránke = strela');
      else this.showHint('<b>Potiahni</b> = strela &nbsp;·&nbsp; <b>Klik</b> na spoluhráča = prihrávka &nbsp;·&nbsp; <b>Podrž</b> = beh / <b>šípky</b>');
    }
    if (this.isPen && !this.userCtrl) this.penAIT = U.rf(1.2, 1.8);
  }

  updateChance(dt) {
    this.t += dt;
    const A = this.att, D = this.def, b = this.ball;
    for (const m of this.all()) { m.cd -= dt; m.shield -= dt; m.tackleCd -= dt; if (m.dive > 0) m.dive = Math.max(0, m.dive - dt * 1.2); }
    if (this.isPen) { this.updatePen(dt); return; }
    const car = b.owner;
    if (car && car.side === A.i) {
      if (this.userCtrl) this.userCarrier(car, dt);
      else this.aiCarrier(car, dt);
    } else if (car && car.side === D.i) {
      const [du, dv] = this.toF(D, car.x, car.y);
      const [x, y] = this.toW(D, du + 10, dv);
      car.tx = x; car.ty = y; car.sf = 0.7;
      if (this.endT == null) this.endChance('lost', 0.9);
    }
    this.aiOffBall(dt);
    for (const m of this.all()) this.movePlayer(m, dt);
    this.separate();
    this.physicsBall(dt, false);
    if (this.state !== 'chance') return;
    this.checkPickup();
    this.checkTackles();
    if (this.t > 14 && this.endT == null) this.endChance('timeout', 0.6);
    if (!b.owner && !b.shot && Math.hypot(b.vx, b.vy) < 0.6 && this.t > 1 && this.endT == null) {
      this.stillT = (this.stillT || 0) + dt;
      if (this.stillT > 2.5) this.endChance('timeout', 0.3);
    } else this.stillT = 0;
    if (this.endT != null) { this.endT -= dt; if (this.endT <= 0) this.finishChance(); }
  }

  userCarrier(car, dt) {
    const A = this.att;
    let dx = 0, dy = 0;
    if (this.keys.u) dy -= 1; if (this.keys.d) dy += 1; if (this.keys.l) dx -= 1; if (this.keys.r) dx += 1;
    if (dx || dy) { [dx, dy] = this.sdir(dx, dy); }
    else if (this.ptr.down && this.ptr.steer) {
      const [wx, wy] = this.s2w(this.ptr.x, this.ptr.y);
      dx = wx - car.x; dy = wy - car.y;
      if (Math.hypot(dx, dy) < 1) dx = dy = 0;
    } else {
      [dx, dy] = this.dribbleDir(car);
      car.sf = 0.86;
    }
    const l = Math.hypot(dx, dy);
    if (l > 0) { car.tx = car.x + dx / l * 4; car.ty = car.y + dy / l * 4; if (this.keys.u || this.keys.d || this.keys.l || this.keys.r || this.ptr.steer) car.sf = 0.95; }
    else { car.tx = car.x; car.ty = car.y; }
    void A; void dt;
  }

  dribbleDir(car) {
    const A = this.sides[car.side], D = this.sides[1 - car.side];
    const gx = A.dir > 0 ? PL - 8 : 8;
    let dx = gx - car.x, dy = PW / 2 - car.y;
    const l = Math.hypot(dx, dy) || 1; dx /= l; dy /= l;
    let steer = 0;
    for (const m of D.mps) {
      if (m.isGK || m.stun > 0) continue;
      const ox = m.x - car.x, oy = m.y - car.y, d = Math.hypot(ox, oy);
      if (d > 8 || d < 0.01) continue;
      const ahead = (ox * dx + oy * dy) / d;
      if (ahead < 0.15) continue;
      const side = Math.sign(ox * dy - oy * dx) || (car.y < PW / 2 ? -1 : 1);
      steer += side * (8 - d) / 8 * ahead;
    }
    if (car.y < 5) steer += (A.dir > 0 ? 1 : -1) * (5 - car.y) / 5;
    if (car.y > PW - 5) steer -= (A.dir > 0 ? 1 : -1) * (car.y - PW + 5) / 5;
    const ang = U.clamp(steer * 1.3, -1.15, 1.15);
    const c = Math.cos(ang), sn = Math.sin(ang);
    return [dx * c - dy * sn, dx * sn + dy * c];
  }

  aiCarrier(car, dt) {
    const A = this.att, ch = this.ch;
    const gx = A.dir > 0 ? PL : 0;
    const dGoal = Math.hypot(gx - car.x, PW / 2 - car.y);
    const [u, v] = this.toF(A, car.x, car.y);
    let nd = 1e9;
    for (const m of this.def.mps) if (!m.isGK) nd = Math.min(nd, dist(m, car));
    this.aiDecT -= dt;
    if (this.aiDecT <= 0) {
      this.aiDecT = 0.22;
      const forced = ch.forced;
      if (forced === 'goal' && (dGoal < 17 || this.t > 7.5)) { this.aiShoot(car); return; }
      if (dGoal < 11.5 || (dGoal < 20 && U.chance(0.1 + (20 - dGoal) * 0.022 + (nd < 2 ? 0.12 : 0))) || (dGoal < 28 && dGoal > 20 && U.chance(0.025)) || (this.t > 10 && dGoal < 30)) {
        this.aiShoot(car); return;
      }
      if (u > 86 && Math.abs(v - 34) > 11 && U.chance(0.45)) {
        const inBox = A.mps.filter(m => m !== car && !m.isGK && this.toF(A, m.x, m.y)[0] > 86);
        if (inBox.length) { this.pass(car, U.pick(inBox), { lofted: true, cross: true }); return; }
      }
      const opt = this.bestPassOption(car);
      if (opt && ((nd < 2.6 && U.chance(0.55)) || (opt.score > 14 && U.chance(0.22)))) { this.pass(car, opt.mp, { lofted: dist(car, opt.mp) > 27 }); return; }
    }
    const [dx, dy] = this.dribbleDir(car);
    const l = Math.hypot(dx, dy) || 1;
    car.tx = car.x + dx / l * 4; car.ty = car.y + dy / l * 4; car.sf = 0.92;
  }

  bestPassOption(car) {
    const A = this.sides[car.side], D = this.sides[1 - car.side];
    const [cu] = this.toF(A, car.x, car.y);
    let best = null;
    for (const m of A.mps) {
      if (m === car || m.isGK) continue;
      const d = dist(car, m);
      if (d < 4 || d > 34) continue;
      const [mu, mv] = this.toF(A, m.x, m.y);
      let open = 1e9, lane = 1e9;
      for (const o of D.mps) {
        open = Math.min(open, dist(o, m));
        lane = Math.min(lane, segDist(o.x, o.y, car.x, car.y, m.x, m.y));
      }
      let score = (mu - cu) * 0.6 + Math.min(open, 8) * 1.5 + Math.min(lane, 4) * 2 - (d > 22 ? (d - 22) * 0.5 : 0);
      if (mu > 88 && Math.abs(mv - 34) < 18) score += 5;
      if (lane < 1.3) score -= 12;
      if (!best || score > best.score) best = { mp: m, score };
    }
    return best;
  }

  aiShoot(car) {
    const A = this.att, D = this.def, gk = this.gkOf(D);
    const gx = A.dir > 0 ? PL : 0;
    const side = gk.y < PW / 2 ? 1 : -1;
    const forced = this.ch && this.ch.forced;
    const off = forced === 'goal' ? U.rf(1.4, GW / 2 - 0.7) : (U.chance(0.45) ? GW / 2 + U.rf(0.3, 1.8) : U.rf(0.3, GW / 2 - 0.5));
    const ty = PW / 2 + side * off * (U.chance(0.8) ? 1 : -1);
    const d = Math.hypot(gx - car.x, ty - car.y);
    const power = U.clamp(0.55 + d / 60 + U.rf(-0.05, 0.15), 0.5, 0.98);
    this.shoot(car, gx - car.x, ty - car.y, power, 0, { precise: forced === 'goal', vz: forced === 'goal' ? U.rf(0.6, 2.4) : undefined });
  }

  // ─── Akcie s loptou ──────────────────────────────────────
  pass(from, to, o = {}) {
    const b = this.ball;
    let tx, ty;
    if (o.point) [tx, ty] = o.point;
    else { const lead = o.lofted ? 0.9 : 0.55; tx = to.x + to.vx * lead; ty = to.y + to.vy * lead; }
    const d = Math.hypot(tx - b.x, ty - b.y);
    const ftr = from.tr || {};
    const pt = o.cross ? 1 - 0.12 * (ftr.crs || 0) : o.lofted ? 1 - 0.12 * (ftr.lob || 0) : 1 - 0.1 * (ftr.vis || 0);
    let ang = Math.atan2(ty - b.y, tx - b.x) + U.gauss() * (0.012 + 0.065 * (1 - from.pas / 100)) * pt;
    if (o.lofted) {
      const vh = U.clamp(d * 0.75 + 7, 12, 26);
      const T = d / vh;
      b.vx = Math.cos(ang) * vh; b.vy = Math.sin(ang) * vh; b.vz = 0.5 * 9.8 * T * (o.cross ? 0.9 : 1);
    } else {
      const v0 = U.clamp(d * 0.9 + 6.5, 8, 28);
      b.vx = Math.cos(ang) * v0; b.vy = Math.sin(ang) * v0; b.vz = 0;
    }
    b.owner = null; b.lastTouch = from; b.shot = null; b.spin = 0;
    b.passTarget = to; b.pass = { from, to, t: this.now, lofted: !!o.lofted, cross: !!o.cross };
    from.cd = 0.35;
    this.lastPasser = from;
    SFX.kick(0.5);
    if (o.cross) this.comment('Center do šestnástky…');
  }

  shoot(m, dx, dy, power, curl, o = {}) {
    const b = this.ball, A = this.sides[m.side], D = this.sides[1 - m.side];
    const r = m.sho;
    const l = Math.hypot(dx, dy) || 1;
    let ang = Math.atan2(dy / l, dx / l) - curl * 0.13;
    const tr = m.tr || {}, gd = Math.hypot((A.dir > 0 ? PL : 0) - m.x, PW / 2 - m.y);
    // slabšia noha, zakončovateľ zblízka, strela zďaleka, hlavičkár
    let tf = 1;
    if (o.header) tf *= 1 - 0.1 * (tr.hdr || 0);
    else {
      if (m.ft !== 'B' && U.chance(0.3)) tf *= 1.35 - 0.07 * m.wf;
      if (gd < 17) tf *= 1 - 0.1 * (tr.fin || 0);
      else if (gd > 18) tf *= 1 - 0.1 * (tr.lng || 0);
      if (this.isPen) tf *= 1 - 0.15 * (tr.pen || 0);
    }
    const sigma = o.precise ? 0.008 : (0.015 + 0.085 * (1 - r / 100) + 0.035 * power * power) * tf;
    ang += U.gauss() * sigma;
    const speed = (13 + 19 * power * (0.8 + 0.2 * r / 100)) * (gd > 18 && !o.header ? 1 + 0.03 * (tr.lng || 0) : 1);
    b.vx = Math.cos(ang) * speed; b.vy = Math.sin(ang) * speed;
    b.vz = o.vz != null ? o.vz : Math.max(0.3, 0.6 + 3.4 * power + U.gauss() * 0.6 * (1.25 - r / 100));
    b.spin = curl * 12;
    b.owner = null; b.lastTouch = m; b.passTarget = null; b.pass = null;
    b.shot = { by: m, side: m.side, t: this.now, speed };
    m.cd = 0.5;
    A.shots++;
    this.shotLog.push({ side: m.side, x: A.dir > 0 ? m.x / PL : 1 - m.x / PL, y: A.dir > 0 ? m.y / PW : 1 - m.y / PW, goal: false, pid: m.p.id, pk: !!this.isPen });
    const gk = this.gkOf(D);
    gk.react = this.t + (0.32 - 0.12 * gk.ref / 100);
    gk.beaten = false;
    this.penGuess = null;
    SFX.kick(1.2);
    this.comment(`${pName(m.p)} strieľa!`);
  }

  // ─── AI bez lopty ────────────────────────────────────────
  aiOffBall(dt) {
    const A = this.att, D = this.def, b = this.ball;
    const [bu, bv] = this.toF(A, b.x, b.y);
    const loose = !b.owner && !b.shot;
    // naháňanie voľnej lopty
    let chA = null, chD = null;
    if (loose) {
      let da = 1e9, dd = 1e9;
      const px = b.x + b.vx * 0.25, py = b.y + b.vy * 0.25;
      for (const m of A.mps) { if (m.isGK) continue; const d = Math.hypot(m.x - px, m.y - py); if (d < da) { da = d; chA = m; } }
      for (const m of D.mps) { const d = Math.hypot(m.x - px, m.y - py) + (m.isGK ? 2 : 0); if (d < dd) { dd = d; chD = m; } }
      if (b.passTarget && b.passTarget.side === A.i) chA = b.passTarget;
    }
    // útočníci
    this.spaceT = (this.spaceT || 0) - dt;
    const resample = this.spaceT <= 0;
    if (resample) this.spaceT = 0.6;
    for (const m of A.mps) {
      if (m === b.owner) continue;
      if (m.isGK) { const [x, y] = this.toW(A, 6, 34); m.tx = x; m.ty = y; m.sf = 0.4; continue; }
      if (m === chA || (b.passTarget === m)) {
        const [ix, iy] = this.interceptPoint(m);
        m.tx = ix; m.ty = iy; m.sf = 1; continue;
      }
      let u, v;
      if (m.role === 'FW' || (m.role === 'MF' && m.fx > 0.5)) {
        u = U.clamp(Math.max(bu + 9, 84 - (0.7 - m.fx) * 20), 50, 97);
        v = 34 + (m.fy - 0.5) * 30;
        if (resample || m.su == null) {
          let bestS = -1;
          for (let k = 0; k < 6; k++) {
            const cu = u + U.rf(-4, 3), cv = v + U.rf(-6, 6);
            const [cx, cy] = this.toW(A, cu, cv);
            let mn = 1e9;
            for (const o of D.mps) mn = Math.min(mn, Math.hypot(o.x - cx, o.y - cy));
            if (mn > bestS) { bestS = mn; m.su = cu; m.sv = cv; }
          }
        }
        u = m.su; v = m.sv;
      } else if (m.role === 'MF') {
        u = U.clamp(bu - 5 + (m.fx - 0.43) * 30, 30, 90);
        v = 6 + m.fy * 56; v += (bv - v) * 0.3;
      } else {
        u = U.clamp(bu - 30, 20, 62); v = 6 + m.fy * 56;
      }
      const [x, y] = this.toW(A, u, v);
      m.tx = x; m.ty = y; m.sf = m.role === 'DF' ? 0.6 : 0.88;
    }
    // obrancovia
    const gk = this.gkOf(D);
    this.gkLogic(gk, dt);
    const out = D.mps.filter(m => !m.isGK);
    const tgt = b.owner || b;
    const sorted = out.slice().sort((a, c) => (dist(a, tgt) + (a.stun > 0 ? 50 : 0)) - (dist(c, tgt) + (c.stun > 0 ? 50 : 0)));
    const presser = sorted[0], cover = sorted[1];
    const ownGX = D.dir > 0 ? 0 : PL;
    this.markT -= dt;
    if (this.markT <= 0) {
      this.markT = 0.35;
      this.marks = new Map();
      const free = A.mps.filter(m => !m.isGK && m !== b.owner);
      const markers = out.filter(m => m !== presser && m !== cover).sort((a, c) => a.fx - c.fx);
      const taken = new Set();
      for (const d of markers) {
        let best = null, bd = 1e9;
        for (const a of free) {
          if (taken.has(a)) continue;
          const [au] = this.toF(D, a.x, a.y);
          if (au > 55) continue;
          const dd = dist(d, a);
          if (dd < bd) { bd = dd; best = a; }
        }
        if (best && bd < 25) { taken.add(best); this.marks.set(d, best); }
      }
    }
    for (const m of out) {
      if (loose && m === chD) { const [ix, iy] = this.interceptPoint(m); m.tx = ix; m.ty = iy; m.sf = 1; continue; }
      if (m === presser && !loose) {
        const lead = b.owner ? 0.3 : 0.2;
        m.tx = tgt.x + (tgt.vx || 0) * lead; m.ty = tgt.y + (tgt.vy || 0) * lead;
        const dOwn = Math.abs(tgt.x - ownGX);
        m.sf = dist(m, tgt) < 3.5 ? 0.8 : dOwn < 25 ? 1 : 0.9;
        continue;
      }
      if (m === cover) {
        const dx = ownGX - tgt.x, dy = PW / 2 - tgt.y, l = Math.hypot(dx, dy) || 1;
        const k = Math.min(5.5, l * 0.5);
        m.tx = tgt.x + dx / l * k; m.ty = tgt.y + dy / l * k; m.sf = 0.95;
        continue;
      }
      const mk = this.marks.get(m);
      if (mk) {
        const dx = ownGX - mk.x, dy = PW / 2 - mk.y, l = Math.hypot(dx, dy) || 1;
        m.tx = mk.x + dx / l * 1.6; m.ty = mk.y + dy / l * 1.6; m.sf = 0.92;
      } else {
        const [du, dv] = this.toF(D, b.x, b.y);
        const u = U.clamp(du * 0.55 + 6 + m.fx * 20, 6, 55);
        let v = 6 + m.fy * 56; v += (dv - v) * 0.3;
        const [x, y] = this.toW(D, u, v);
        m.tx = x; m.ty = y; m.sf = 0.8;
      }
    }
  }

  interceptPoint(m) {
    const b = this.ball;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp < 1) return [b.x, b.y];
    let best = [b.x, b.y];
    for (let t = 0.1; t <= 2.5; t += 0.1) {
      const k = (1 - Math.exp(-0.85 * t)) / 0.85;
      const px = b.x + b.vx * k, py = b.y + b.vy * k;
      if (Math.hypot(px - m.x, py - m.y) / (m.maxV * 0.95) <= t) return [px, py];
      best = [px, py];
    }
    return best;
  }

  gkLogic(gk, dt) {
    const b = this.ball, S = this.sides[gk.side];
    const ownGX = S.dir > 0 ? 0 : PL;
    if (b.shot && b.shot.side !== gk.side && !gk.beaten) {
      if (this.t >= gk.react) {
        let py = b.y;
        const vxT = b.vx;
        if ((ownGX - b.x) * vxT > 0) {
          const tt = (gk.x - b.x) / vxT;
          if (tt > 0) py = b.y + b.vy * tt;
        }
        if (this.isPen && this.penGuess != null) py = this.penGuess;
        const ty = U.clamp(py, GY1 - 1.2, GY2 + 1.2);
        const dv = 3.0 + 2.6 * gk.ref / 100;
        const dy = U.clamp(ty - gk.y, -dv * dt, dv * dt);
        gk.override = true; gk.vx = 0; gk.vy = dy / dt;
        if (Math.abs(ty - gk.y) > 0.5) gk.dive = Math.min(1, gk.dive + dt * 6) * Math.sign(ty - gk.y);
        gk.face = S.dir;
      } else { gk.override = true; gk.vx = 0; gk.vy = 0; }
      return;
    }
    if (b.owner === gk) { gk.tx = gk.x; gk.ty = gk.y; return; }
    const gcx = ownGX, gcy = PW / 2;
    const d = Math.hypot(b.x - gcx, b.y - gcy) || 1;
    const loose = !b.owner && !b.shot;
    const [bu] = this.toF(S, b.x, b.y);
    if (loose && bu < 15 && Math.abs(b.y - PW / 2) < 18 && b.z < 1.5) {
      const nearestOther = this.all().filter(m => m !== gk).reduce((mn, m) => Math.min(mn, dist(m, b)), 1e9);
      if (dist(gk, b) < nearestOther + 1) { gk.tx = b.x; gk.ty = b.y; gk.sf = 1; return; }
    }
    const off = U.clamp(d * 0.08, 0.5, 2.6);
    gk.tx = gcx + (b.x - gcx) / d * off;
    gk.ty = U.clamp(gcy + (b.y - gcy) / d * off, GY1 - 1.2, GY2 + 1.2);
    gk.sf = 0.9;
  }

  // ─── Pohyb ───────────────────────────────────────────────
  movePlayer(m, dt) {
    if (m.override) {
      m.x += m.vx * dt; m.y += m.vy * dt; m.override = false;
      m.phase += Math.hypot(m.vx, m.vy) * dt * 2;
      return;
    }
    const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy);
    let vmax = m.maxV * m.sf * (this.ball.owner === m ? 0.88 : 1);
    if (m.stun > 0) { m.stun -= dt; vmax *= 0.3; }
    if (m.boost > 0) { m.boost -= dt; vmax *= 1.12; }
    if (d < 1.5) vmax *= d / 1.5;
    const dvx = d > 0.01 ? dx / d * vmax : 0, dvy = d > 0.01 ? dy / d * vmax : 0;
    let ax = dvx - m.vx, ay = dvy - m.vy;
    const al = Math.hypot(ax, ay), maxA = 16 * dt;
    if (al > maxA) { ax *= maxA / al; ay *= maxA / al; }
    m.vx += ax; m.vy += ay;
    m.x += m.vx * dt; m.y += m.vy * dt;
    m.x = U.clamp(m.x, -3, PL + 3); m.y = U.clamp(m.y, -2, PW + 2);
    const sp = Math.hypot(m.vx, m.vy);
    m.phase += sp * dt * 2.3;
    if (Math.abs(m.vx) > 0.4) m.face = Math.sign(m.vx);
  }

  separate() {
    const ms = this.all();
    for (let i = 0; i < ms.length; i++) for (let j = i + 1; j < ms.length; j++) {
      const a = ms[i], c = ms[j];
      const dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy);
      if (d < 0.85 && d > 0.001) {
        const push = (0.85 - d) / 2;
        const nx = dx / d, ny = dy / d;
        const own = this.ball.owner;
        const ka = a.override ? 0 : a === own ? 0 : c === own ? 2 : 1;
        const kc = c.override ? 0 : c === own ? 0 : a === own ? 2 : 1;
        a.x -= nx * push * ka; a.y -= ny * push * ka;
        c.x += nx * push * kc; c.y += ny * push * kc;
      }
    }
  }

  attachBall(o, dt, snap) {
    const b = this.ball;
    const sp = Math.hypot(o.vx, o.vy);
    let fx, fy;
    if (sp > 0.3) { fx = o.vx / sp; fy = o.vy / sp; } else { fx = o.face || 1; fy = 0; }
    const tx = o.x + fx * 0.62, ty = o.y + fy * 0.62 + 0.05;
    if (snap) { b.x = tx; b.y = ty; } else { const k = Math.min(1, dt * 14); b.x += (tx - b.x) * k; b.y += (ty - b.y) * k; }
    b.z = 0; b.vx = o.vx; b.vy = o.vy; b.vz = 0;
    b.rot += sp * dt * 3;
  }

  // ─── Fyzika lopty ────────────────────────────────────────
  physicsBall(dt, afterGoal) {
    const b = this.ball;
    if (b.owner) { this.attachBall(b.owner, dt); return; }
    const px = b.x, py = b.y, pz = b.z;
    if (b.spin) {
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 2) { b.vx += -b.vy / sp * b.spin * dt; b.vy += b.vx / sp * b.spin * dt; }
      b.spin *= Math.exp(-1.2 * dt);
    }
    b.x += b.vx * dt; b.y += b.vy * dt;
    if (b.z > 0 || b.vz > 0) {
      b.vz -= 9.8 * dt; b.z += b.vz * dt;
      b.vx *= Math.exp(-0.12 * dt); b.vy *= Math.exp(-0.12 * dt);
      if (b.z <= 0) {
        b.z = 0;
        if (b.vz < -2.2) { b.vz = -b.vz * 0.42; b.vx *= 0.82; b.vy *= 0.82; } else b.vz = 0;
      }
    } else {
      const k = Math.exp(-0.85 * dt);
      b.vx *= k; b.vy *= k;
    }
    b.rot += Math.hypot(b.vx, b.vy) * dt * 1.6;
    if (afterGoal) {
      if (b.x > PL + 1.8) { b.x = PL + 1.8; b.vx = 0; b.vy *= 0.5; }
      if (b.x < -1.8) { b.x = -1.8; b.vx = 0; b.vy *= 0.5; }
      if (b.z > GH - 0.2) { b.z = GH - 0.2; b.vz = 0; }
      return;
    }
    if (this.state !== 'chance') return;
    // strela – blok a brankár
    if (b.shot) {
      const D = this.sides[1 - b.shot.side];
      if (b.z < 1.7 && !(this.ch && this.ch.forced === 'goal')) {
        for (const m of D.mps) {
          if (m.isGK || m.blockTried === b.shot.t) continue;
          if (segDist(m.x, m.y, px, py, b.x, b.y) < 0.6) {
            m.blockTried = b.shot.t;
            if (U.chance(0.33)) {
              b.vx = -b.vx * U.rf(0.15, 0.35) + U.rf(-3, 3); b.vy = U.rf(-8, 8); b.vz = U.rf(0.5, 3);
              b.shot = null; b.lastTouch = m; m.cd = 0.4;
              this.comment('Zablokovaná strela!'); SFX.ooh();
              break;
            }
          }
        }
      }
      if (b.shot) {
        const gk = this.gkOf(D);
        if (!gk.beaten && b.z < 2.6) {
          const reach = 0.5 + 0.7 * gk.ref / 100 + 0.08 * (gk.tr.ref || 0) + (Math.abs(gk.dive) > 0.3 ? 0.4 : 0) + (this.ch && this.ch.forced === 'nogoal' ? 1.2 : 0);
          if (segDist(gk.x, gk.y, px, py, b.x, b.y) < reach) this.gkContact(gk, reach, segDist(gk.x, gk.y, px, py, b.x, b.y));
        }
      }
    }
    // bránková čiara
    for (const gx of [PL, 0]) {
      const crossed = gx === PL ? (px < PL && b.x >= PL) : (px > 0 && b.x <= 0);
      if (!crossed) continue;
      const k = (gx - px) / (b.x - px);
      const yc = py + (b.y - py) * k, zc = pz + (b.z - pz) * k;
      const scorerSide = this.sides.find(S => (S.dir > 0 ? PL : 0) === gx).i;
      const inside = yc > GY1 + 0.11 && yc < GY2 - 0.11 && zc < GH - 0.11;
      const nearPost = (Math.abs(yc - GY1) < 0.3 || Math.abs(yc - GY2) < 0.3) && zc < GH;
      const bar = yc > GY1 && yc < GY2 && Math.abs(zc - GH) < 0.22;
      if (inside && this.ch && this.ch.forced === 'nogoal' && scorerSide === this.att.i) {
        this.postHit(gx, yc < PW / 2 ? GY1 : GY2); return;
      }
      if (inside) { this.goalScored(scorerSide); return; }
      if (nearPost) { this.postHit(gx, Math.abs(yc - GY1) < 0.3 ? GY1 : GY2); return; }
      if (bar) { b.x = gx === PL ? PL - 0.15 : 0.15; b.vx = -b.vx * 0.4; b.vz = -Math.abs(b.vz) * 0.4 - 1; b.shot = null; this.comment('Brvno!'); SFX.ooh(); return; }
      b.shot = null;
      this.comment(zc >= GH ? 'Nad bránu!' : (Math.abs(yc - PW / 2) < GW / 2 + 2.5 ? 'Tesne vedľa!' : 'Vedľa.'));
      if (Math.abs(yc - PW / 2) < GW / 2 + 2) SFX.ooh();
      this.endChance('out', 0.9);
      return;
    }
    if (b.y < -0.3 || b.y > PW + 0.3) { this.comment('Lopta je v aute.'); this.endChance('out', 0.6); }
  }

  postHit(gx, postY) {
    const b = this.ball;
    b.x = gx === PL ? PL - 0.2 : 0.2;
    b.vx = -b.vx * U.rf(0.3, 0.55);
    b.vy = (b.y < postY ? -1 : 1) * U.rf(2, 6) + b.vy * 0.3;
    b.shot = null;
    this.comment('Žrď!!'); SFX.ooh();
  }

  gkContact(gk, reach, d) {
    const b = this.ball, s = b.shot, ch = this.ch;
    const A = this.sides[s.side];
    if (ch && ch.forced === 'goal') { gk.beaten = true; return; }
    const sp = Math.hypot(b.vx, b.vy);
    let pSave;
    if (ch && ch.forced === 'nogoal') pSave = 1;
    else pSave = U.clamp(0.7 + (gk.han - s.by.sho) / 140 - (sp - 20) / 45 - (d / reach) * 0.25, 0.2, 0.94);
    if (U.chance(pSave)) {
      A.onT++;
      if (sp < 21 && U.chance(0.35 + gk.han / 250)) {
        b.owner = gk; b.shot = null; b.vx = b.vy = b.vz = 0; b.z = 0;
        gk.cd = 1;
        this.comment(`${pName(gk.p)} chytil loptu!`);
        this.endChance('saved', 1.1);
      } else {
        const away = this.sides[gk.side].dir;
        b.vx = -b.vx * U.rf(0.15, 0.3) + away * U.rf(2, 5);
        b.vy = (U.chance(0.5) ? 1 : -1) * U.rf(5, 11);
        b.vz = U.rf(1, 3.5);
        b.shot = null; b.lastTouch = gk; gk.cd = 0.8; b.spin = 0;
        this.comment(`Skvelý zákrok! ${pName(gk.p)} vyrazil loptu!`);
        SFX.ooh();
      }
    } else gk.beaten = true;
  }

  checkPickup() {
    const b = this.ball;
    if (b.owner || b.shot) return;
    const A = this.att;
    // hlavička / volej po centri
    if (b.z > 0.9 && b.z < 2.4 && b.pass && b.pass.lofted) {
      for (const m of A.mps) {
        if (m.isGK || m.cd > 0 || m === b.pass.from) continue;
        if (dist(m, b) < 1.15 + 0.15 * (m.tr ? m.tr.hdr || 0 : 0)) {
          const gx = A.dir > 0 ? PL : 0;
          const ty = PW / 2 + U.rf(-GW / 2 + 0.5, GW / 2 - 0.5);
          this.lastPasser = b.pass.from;
          this.comment(`${pName(m.p)} hlavičkuje!`);
          this.shoot(m, gx - m.x, ty - m.y, 0.5, 0, { vz: U.rf(-1, 1.5), precise: this.ch.forced === 'goal', header: true });
          return;
        }
      }
    }
    if (b.z > 1.4) return;
    let best = null, bd = 1e9;
    const sp = Math.hypot(b.vx, b.vy);
    for (const m of this.all()) {
      if (m.cd > 0) continue;
      const d = dist(m, b);
      const reach = m.isGK ? 1.25 : 0.9;
      if (d > reach || d >= bd) continue;
      if (m.side === this.def.i && !m.isGK && this.ch && this.ch.forced === 'goal') continue;
      if (b.lastTouch && m.side !== b.lastTouch.side && sp > 15 && !m.isGK) {
        if (!U.chance(0.35)) { m.cd = 0.25; continue; }
      }
      best = m; bd = d;
    }
    if (!best) return;
    b.owner = best; b.passTarget = null; b.pass = null; b.spin = 0;
    best.shield = 0.35;
    if (best.side !== this.att.i) {
      this.comment(best.isGK ? `${pName(best.p)} si poradil.` : 'Obrana odvrátila nebezpečenstvo.');
      this.endChance('lost', 0.9);
    } else if (this.lastPasser === best) this.lastPasser = null;
  }

  checkTackles() {
    const b = this.ball, car = b.owner;
    if (!car || car.side !== this.att.i || car.shield > 0 || this.endT != null) return;
    const forcedGoal = this.ch && this.ch.forced === 'goal';
    for (const d of this.def.mps) {
      if (d.tackleCd > 0) continue;
      const dd = dist(d, car);
      if (dd > (d.isGK ? 1.3 : 1.15)) continue;
      d.tackleCd = 0.7;
      if (forcedGoal) continue;
      if (d.stun > 0) continue;
      let p = U.clamp(0.22 + (d.def - car.dri) / 110 + (d.phy - car.phy) / 400 + 0.04 * (d.tr.tkl || 0) - 0.04 * (car.tr.tnk || 0), 0.08, 0.5);
      if (this.userCtrl) p *= 0.85;
      if (d.isGK) p = U.clamp(0.35 + d.rush / 250 + 0.06 * (d.tr.swp || 0), 0.35, 0.75);
      const csp = Math.hypot(car.vx, car.vy);
      const beat = 0.32 + (car.dri - d.def) / 100 + 0.04 * (car.tr.drb || 0) + 0.02 * (car.sk - 3);
      if (!d.isGK && !U.chance(p) && csp > 2.5 && U.chance(U.clamp(beat, 0.15, 0.62))) {
        d.stun = 0.9; car.shield = 0.6; car.boost = 0.7;
        const trick = car.sk >= 4 && U.chance(0.6) ? U.pick(car.sk >= 5 ? ['rabonou', 'elastikom', 'ruletou', 'sombrerom', 'jeslami'] : ['prekročovačkou', 'kľučkou', 'zasekávačkou', 'otočkou']) : null;
        this.comment(trick ? `${pName(car.p)} obišiel ${pName(d.p)} ${trick}!` : `${pName(car.p)} obišiel ${pName(d.p)}!`);
        return;
      }
      if (U.chance(p)) {
        const a = Math.atan2(car.y - d.y, car.x - d.x) + U.rf(-1.2, 1.2);
        b.owner = null; b.vx = Math.cos(a) * U.rf(3, 6); b.vy = Math.sin(a) * U.rf(3, 6); b.vz = 0;
        b.lastTouch = d; car.cd = 0.7; car.shield = 0; d.cd = 0;
        this.comment(d.isGK ? `${pName(d.p)} vybehol a zmaril šancu!` : `${pName(d.p)} odobral loptu!`);
        SFX.kick(0.6);
        return;
      }
    }
  }

  // ─── Penalta ─────────────────────────────────────────────
  updatePen(dt) {
    const b = this.ball, car = b.owner;
    if (car) {
      car.tx = car.x; car.ty = car.y; car.vx = car.vy = 0;
      this.attachBall(car, dt, true);
      if (!this.userCtrl) {
        this.penAIT -= dt;
        if (this.penAIT <= 0) {
          const A = this.att, gx = A.dir > 0 ? PL : 0;
          const corner = U.pick([-1, 1]) * U.rf(1.2, 3.4) * (U.chance(0.12) ? 0 : 1);
          this.shoot(car, gx - car.x, PW / 2 + corner - car.y, U.rf(0.6, 0.9), 0, { precise: this.ch.forced === 'goal', vz: U.rf(0.4, 2.6) });
        }
      }
    } else if (b.shot && this.penGuess == null) {
      // brankár si vyberie stranu
      const gk = this.gkOf(this.def);
      const tt = Math.abs((gk.x - b.x) / (b.vx || 1));
      const realY = b.y + b.vy * tt;
      const right = U.chance(this.ch.forced === 'goal' ? 0.2 : this.ch.forced === 'nogoal' ? 0.9 : 0.4 + 0.1 * (gk.tr.pks || 0));
      this.penGuess = right ? realY : PW / 2 - Math.sign(realY - PW / 2 || 1) * U.rf(1.5, 3);
    }
    for (const m of this.all()) if (m !== car && !m.isGK) { m.tx = m.x; m.ty = m.y; }
    this.gkLogic(this.gkOf(this.def), dt);
    for (const m of this.all()) this.movePlayer(m, dt);
    this.physicsBall(dt, false);
    if (this.state !== 'chance') return;
    if (!b.owner && !b.shot && this.t > 0.5 && this.endT == null) this.endChance('pen', 0.9);
    if (this.t > 20 && this.endT == null) this.endChance('timeout', 0.3);
    if (this.endT != null) { this.endT -= dt; if (this.endT <= 0) this.finishChance(); }
  }

  // ─── Koniec akcie, gól ───────────────────────────────────
  endChance(reason, delay) {
    if (this.endT != null) return;
    this.endT = delay; this.endReason = reason;
    if (reason === 'timeout') this.comment('Akcia vyšumela.');
  }

  finishChance() {
    const ch = this.ch;
    this.endT = null;
    if (ch && ch.shootout) { this.penResult(false); return; }
    this.chIdx++;
    const b = this.ball;
    let poss = b.owner ? b.owner.side : this.def.i;
    if (!b.owner && this.endReason === 'out' && (b.x <= 0.5 || b.x >= PL - 0.5)) {
      const gk = this.gkOf(this.def);
      b.x = gk.x; b.y = gk.y; b.owner = gk; poss = this.def.i;
    }
    this.flowInit(poss);
  }

  skipChance() {
    if (this.state !== 'chance' || this.userCtrl) return;
    const ch = this.ch;
    if (ch.shootout) {
      const goal = U.chance(0.75);
      this.penResult(goal);
      return;
    }
    if (ch.forced === 'goal') {
      const car = this.ball.owner && this.ball.owner.side === this.att.i ? this.ball.owner : null;
      const lp = this.att.mps.map(m => ({ p: m.p, sp: m.role, m }));
      const sc = car || pickShooter(lp).m;
      this.ball.shot = { by: sc, side: this.att.i, t: this.now, speed: 20 };
      this.att.shots++;
      this.goalScored(this.att.i);
    } else {
      this.att.shots += U.chance(0.6) ? 1 : 0;
      this.chIdx++;
      this.flowInit(this.def.i);
    }
  }

  goalScored(side) {
    const S = this.sides[side], b = this.ball;
    if (this.penShootout) {
      b.shot = null;
      this.ballInNet();
      this.penResult(true);
      return;
    }
    S.goals++; S.onT++;
    for (let i = this.shotLog.length - 1; i >= 0; i--) if (this.shotLog[i].side === side) { this.shotLog[i].goal = true; break; }
    let scorer = b.shot && b.shot.by.side === side ? b.shot.by : (b.lastTouch && b.lastTouch.side === side ? b.lastTouch : S.mps.find(m => m.role === 'FW') || S.mps[1]);
    let assist = this.lastPasser && this.lastPasser !== scorer && this.lastPasser.side === side ? this.lastPasser : null;
    b.shot = null;
    this.goalSide = side;
    const min = Math.min(this.half2 ? 120 : 45, Math.max(1, Math.ceil(this.minute)));
    this.events.push({ min, side, pid: scorer.p.id, aid: assist ? assist.p.id : -1 });
    this.addMark(side, min);
    this.ballInNet();
    this.state = 'goal'; this.goalT = 3.0;
    this.chIdx++;
    this.scorerMP = scorer;
    const mine = side === this.userSide;
    this.banner('GÓÓÓL!!', `${pFull(scorer.p)} skóruje!`, mine || this.userSide < 0 ? 'goal' : 'bad', 2.8);
    if (this.varOn && U.chance(0.05)) this.varPend = { side, t: 1.7 };
    this.comment(`${min}' Gól! ${pFull(scorer.p)}${assist ? ' (asist. ' + pName(assist.p) + ')' : ''}`);
    SFX.cheer();
  }

  // poloha hráčov pre heatmapu (len tvoj tím)
  sampleHeat() {
    if (this.userSide < 0 || !(this.state === 'flow' || this.state === 'chance')) return;
    const S = this.sides[this.userSide];
    for (const m of S.mps) {
      const x = S.dir > 0 ? m.x / PL : 1 - m.x / PL, y = S.dir > 0 ? m.y / PW : 1 - m.y / PW;
      const g = this.heat[m.p.id] || (this.heat[m.p.id] = new Array(96).fill(0));
      g[U.clamp(Math.floor(y * 8), 0, 7) * 12 + U.clamp(Math.floor(x * 12), 0, 11)]++;
    }
  }
  halfTalkDo(k) {
    const S = this.sides[this.userSide], O = this.sides[1 - this.userSide];
    const r = halfTalk(S.team, S.goals - O.goals, k);
    for (const m of S.mps) addMor(m.p, r.m);
    this.htDone = r.txt;
    this.retime();
    this.showOverlay('half');
  }

  // VAR zruší gól (ofsajd, faul, ruka)
  varAnnul() {
    const v = this.varPend; this.varPend = null;
    const S = this.sides[v.side], e = this.events.pop();
    if (!e) return;
    S.goals = Math.max(0, S.goals - 1);
    const why = U.pick(VAR_WHY);
    this.varx.push({ min: e.min, side: e.side, pid: e.pid, why });
    const mk = [...this.el.marks.querySelectorAll('.mk.s' + v.side)].pop(); if (mk) mk.remove();
    this.updateHUD();
    this.banner('📺 VAR · GÓL NEPLATÍ', why, v.side === this.userSide ? 'bad' : 'goal', 2.4);
    this.comment(`VAR: gól neplatí – ${why}.`);
    SFX.whistle(2);
    this.goalT = Math.max(this.goalT, 1.2);
  }

  ballInNet() {
    const b = this.ball;
    b.vx *= 0.35; b.vy *= 0.35; b.vz = Math.min(b.vz, 1);
  }

  celebrate(dt) {
    const sc = this.scorerMP;
    const S = this.sides[this.goalSide];
    if (sc) {
      const [x, y] = this.toW(S, 88, sc.y < PW / 2 ? 6 : PW - 6);
      sc.tx = x; sc.ty = y; sc.sf = 0.9;
      for (const m of S.mps) if (m !== sc && !m.isGK) { m.tx = sc.x + (m.fy - 0.5) * 3; m.ty = sc.y + (m.fx - 0.5) * 3; m.sf = 0.8; }
    }
    for (const m of this.sides[1 - this.goalSide].mps) { m.tx = m.x; m.ty = m.y; }
    for (const m of this.all()) this.movePlayer(m, dt);
    this.separate();
  }

  // ─── Polčas, koniec, taktika ─────────────────────────────
  halftime() {
    this.paused = true; this.atHalf = true;
    SFX.whistle(2);
    this.showOverlay('half');
  }
  resumeSecondHalf() {
    this.half2 = true; this.atHalf = false;
    for (const S of this.sides) S.dir *= -1;
    this.paused = false;
    this.hideOverlay();
    this.kickoff(1);
    SFX.whistle(1);
  }

  fulltime() {
    const s0 = this.sides[0].goals, s1 = this.sides[1].goals;
    if (this.cfg.knockout && s0 === s1 && !this.penShootout) { this.startShootout(); return; }
    this.finished = true;
    this.paused = true;
    SFX.whistle(3);
    this.showOverlay('full');
  }

  startShootout() {
    this.penShootout = { kicks: [[], []], turn: 0, n: 0 };
    this.banner('PENALTY', 'Rozstrel z bieleho bodu', 'info', 2);
    this.comment('Zápas rozhodne penaltový rozstrel!');
    this.state = 'pause2'; this.waitT = 1.5;
    this.afterWait = () => this.nextPenKick();
    SFX.whistle(2);
  }

  nextPenKick() {
    const P = this.penShootout;
    const done = this.shootoutDone();
    if (done != null) {
      this.state = 'flow';
      this.finished = true; this.paused = true;
      this.banner(this.sides[done].team.short + ' VYHRÁVA', `Penalty ${P.kicks[0].filter(Boolean).length}:${P.kicks[1].filter(Boolean).length}`, done === this.userSide || this.userSide < 0 ? 'goal' : 'bad', 3);
      SFX.whistle(3);
      this.showOverlay('full');
      return;
    }
    const side = P.turn;
    const S = this.sides[side];
    const takers = S.mps.filter(m => !m.isGK).sort((a, b) => b.sho - a.sho);
    const taker = takers[P.kicks[side].length % takers.length];
    this.startChance({ side, kind: 'pen', shootout: true, taker, min: this.minute });
  }

  penResult(goal) {
    const P = this.penShootout;
    P.kicks[P.turn].push(!!goal);
    this.updateShootoutHUD();
    if (!goal) this.comment('Penalta nepremenená!');
    P.turn = 1 - P.turn;
    this.state = 'pause2'; this.waitT = goal ? 1.2 : 1.4;
    this.ch = null; this.userCtrl = false; this.isPen = false;
    this.afterWait = () => this.nextPenKick();
  }

  shootoutDone() {
    const P = this.penShootout, a = P.kicks[0], b = P.kicks[1];
    const ga = a.filter(Boolean).length, gb = b.filter(Boolean).length;
    if (a.length <= 5 && b.length <= 5) {
      const ra = 5 - a.length, rb = 5 - b.length;
      if (ga > gb + rb) return 0;
      if (gb > ga + ra) return 1;
      if (a.length === 5 && b.length === 5 && ga !== gb) return ga > gb ? 0 : 1;
      return null;
    }
    if (a.length === b.length && ga !== gb) return ga > gb ? 0 : 1;
    return null;
  }

  updateShootoutHUD() {
    const P = this.penShootout;
    const f = k => k.map(x => x ? '●' : '○').join('');
    this.el.comment.textContent = `${this.home.short} ${f(P.kicks[0])}   ${f(P.kicks[1])} ${this.away.short}`;
  }

  showOverlay(kind) {
    const o = this.el.overlay;
    const S = this.sides;
    const pt = S[0].poss + S[1].poss;
    const pos0 = Math.round(S[0].poss / pt * 100);
    const scorers = side => this.events.filter(e => e.side === side).map(e => `${U.esc(pName(G.players[e.pid]))} ${e.min}'`).join('<br>') || '&nbsp;';
    let penTxt = '';
    if (this.penShootout) {
      const P = this.penShootout;
      penTxt = `<div class="ov-pen">Penalty ${P.kicks[0].filter(Boolean).length} : ${P.kicks[1].filter(Boolean).length}</div>`;
    }
    o.innerHTML = `
<div class="ov-card">
  <div class="ov-title">${kind === 'half' ? 'POLČAS' : 'KONIEC ZÁPASU'}</div>
  <div class="ov-score">
    <div class="ov-team">${crestSVG(this.home, 54)}<b>${U.esc(this.home.name)}</b></div>
    <div class="ov-res">${S[0].goals} : ${S[1].goals}</div>
    <div class="ov-team">${crestSVG(this.away, 54)}<b>${U.esc(this.away.name)}</b></div>
  </div>
  ${penTxt}
  <div class="ov-scorers"><div>${scorers(0)}</div><div>${scorers(1)}</div></div>
  <div class="ov-stats">
    ${statRow('Držanie lopty', pos0 + ' %', (100 - pos0) + ' %', pos0)}
    ${statRow('Strely', S[0].shots, S[1].shots, S[0].shots / Math.max(1, S[0].shots + S[1].shots) * 100)}
    ${statRow('Strely na bránu', S[0].onT, S[1].onT, S[0].onT / Math.max(1, S[0].onT + S[1].onT) * 100)}
  </div>
  <div class="ov-btns">
    ${kind === 'half' && this.userSide >= 0 ? (this.htDone ? `<div class="ov-ht done">🗣️ ${U.esc(this.htDone)}</div>` : `<div class="ov-ht"><span>Šatňa:</span>${HT_TALKS.map(([k, n]) => `<button class="btn btn-blue sm ov-talk" data-k="${k}">${n}</button>`).join('')}</div>`) : ''}
    ${kind === 'half' ? `<button class="btn btn-ghost ov-tac">Taktika a striedania</button><button class="btn btn-go ov-go">2. POLČAS ▶</button>`
    : `<button class="btn btn-go ov-end">POKRAČOVAŤ ▶</button>`}
  </div>
</div>`;
    o.hidden = false;
    const q = s => o.querySelector(s);
    if (kind === 'half') {
      q('.ov-go').onclick = () => this.resumeSecondHalf();
      o.querySelectorAll('.ov-talk').forEach(b => b.onclick = () => this.halfTalkDo(b.dataset.k));
      q('.ov-tac').onclick = () => this.openTactics(true);
    } else q('.ov-end').onclick = () => this.end();
  }
  hideOverlay() { this.el.overlay.hidden = true; this.el.overlay.innerHTML = ''; }

  openTactics(fromHalf) {
    if (this.finished) return;
    if (this.atHalf) fromHalf = true;
    const ut = this.userSide >= 0 ? this.sides[this.userSide] : null;
    this.paused = true;
    const o = this.el.overlay;
    const render = () => {
      let html = `<div class="ov-card ov-tactics"><div class="ov-title">${ut ? 'TAKTIKA' : 'PAUZA'}</div>`;
      if (ut) {
        const t = ut.team;
        const onPitch = ut.mps.map(m => m.p.id);
        const bench = availPlayers(t).filter(p => !onPitch.includes(p.id) && !(this.sentOff && this.sentOff.has(p.id)) && !ut.subsOut.includes(p.id));
        html += `<div class="tac-ment">Mentalita: ${['Defenzívna', 'Vyrovnaná', 'Útočná'].map((n, i) => `<button class="chip ${t.ment === i ? 'on' : ''}" data-ment="${i}">${n}</button>`).join('')}</div>
<div class="tac-sub">Striedania: <b>${ut.subs}/5</b> ${this.subSel != null ? '<span class="hl">– vyber hráča z lavičky</span>' : '<span class="muted">– klikni na hráča na ihrisku</span>'}</div>
<div class="tac-cols"><div class="tac-col"><h4>Na ihrisku</h4>${ut.mps.map(m => `<div class="tac-p ${this.subSel === m.p.id ? 'sel' : ''}" data-on="${m.p.id}"><span class="pos pos-${m.role}">${POS_SK[m.role]}</span><span class="nm">${U.esc(pName(m.p))}</span><span class="fit" style="--f:${m.p.fit}%"></span><span class="rt">${m.p.r}</span></div>`).join('')}</div>
<div class="tac-col"><h4>Lavička</h4>${bench.map(p => `<div class="tac-p ${this.subSel != null && ut.subs < 5 ? 'can' : ''}" data-bench="${p.id}"><span class="pos pos-${p.pos}">${POS_SK[p.pos]}</span><span class="nm">${U.esc(pName(p))}</span><span class="fit" style="--f:${p.fit}%"></span><span class="rt">${p.r}</span></div>`).join('')}</div></div>`;
      }
      html += `<div class="ov-btns"><button class="btn btn-ghost ov-sim">Dosimulovať zápas</button><button class="btn btn-go ov-res">${fromHalf ? 'Späť' : 'Pokračovať ▶'}</button></div></div>`;
      o.innerHTML = html; o.hidden = false;
      o.querySelectorAll('[data-ment]').forEach(b => b.onclick = () => { ut.team.ment = +b.dataset.ment; this.retime(); render(); });
      o.querySelectorAll('[data-on]').forEach(b => b.onclick = () => { this.subSel = +b.dataset.on === this.subSel ? null : +b.dataset.on; render(); });
      o.querySelectorAll('[data-bench]').forEach(b => b.onclick = () => {
        if (this.subSel == null || ut.subs >= 5) return;
        this.substitute(ut, this.subSel, +b.dataset.bench);
        this.subSel = null; render();
      });
      o.querySelector('.ov-res').onclick = () => {
        this.subSel = null;
        if (fromHalf) this.showOverlay('half');
        else { this.hideOverlay(); this.paused = false; this.last = performance.now(); }
      };
      o.querySelector('.ov-sim').onclick = () => { this.subSel = null; this.simRest(); };
    };
    render();
  }

  substitute(S, outId, inId) {
    const idx = S.mps.findIndex(m => m.p.id === outId);
    if (idx < 0) return;
    const old = S.mps[idx];
    const p = G.players[inId];
    const slot = FORMATIONS[S.team.form][old.slot];
    const nm = this.makeMP(S, p, old.slot, slot);
    nm.x = old.x; nm.y = old.y; nm.tx = old.tx; nm.ty = old.ty;
    if (this.ball.owner === old) this.ball.owner = nm;
    S.mps[idx] = nm;
    S.subs++; S.subsIn.push(inId); S.subsOut.push(outId);
    S.team.lineup = S.team.lineup.map(id => (id === outId ? inId : id));
    this.str[S.i] = teamStrength(S.team);
    this.retime();
    this.comment(`Striedanie: ${pName(p)} za ${pName(old.p)}.`);
  }

  // žltá / červená karta počas zápasu
  showCard(c) {
    const S = this.sides[c.side];
    let mp = S.mps.find(m => m.p.id === c.pid);
    if (!mp) { const pool = S.mps.filter(m => !m.isGK && !this.cardsOut.some(x => x.c === 'R' && x.pid === m.p.id)); if (!pool.length) return; mp = U.pick(pool); c.pid = mp.p.id; }
    // druhá žltá v tomto zápase = červená
    if (c.c === 'Y' && this.cardsOut.some(x => x.pid === c.pid && x.c === 'Y')) { c.c = 'R'; c.two = true; }
    c.min = Math.max(1, Math.min(90 + this.added, Math.floor(this.minute)));
    this.cardsOut.push(c);
    SFX.whistle(1);
    if (c.c === 'Y') { this.banner('🟨 ŽLTÁ KARTA', `${pName(mp.p)} · ${S.team.short}`, 'card-y', 1.6); this.comment(`Žltá karta pre ${pName(mp.p)}.`); return; }
    this.banner('🟥 ČERVENÁ KARTA', `${pName(mp.p)} · ${S.team.short}${c.two ? ' (druhá žltá)' : ''}`, 'card-r', 2.2);
    this.comment(`${pName(mp.p)} musí z ihriska! ${S.team.short} hrá v oslabení.`);
    SFX.ooh();
    (this.sentOff = this.sentOff || new Set()).add(mp.p.id);
    if (mp.isGK || S.mps.length <= 7) return;
    if (this.ball.owner === mp) {
      const mate = S.mps.filter(m => m !== mp).sort((a, b) => dist(a, mp) - dist(b, mp))[0];
      this.ball.owner = mate || null;
    }
    S.mps = S.mps.filter(m => m !== mp);
    this.men[c.side]--;
    this.retime();
  }

  // zranenie počas zápasu: hráč odíde, za neho nastúpi najvhodnejší z lavičky (ak ešte ide striedať)
  showInjury(e) {
    const S = this.sides[e.side], mp = S.mps.find(m => m.p.id === e.pid);
    if (!mp) return;
    e.min = Math.max(1, Math.min(90 + this.added, Math.floor(this.minute)));
    this.injOut.push(e);
    SFX.whistle(1);
    this.banner('🚑 ZRANENIE', `${pName(mp.p)} · ${S.team.short}`, 'inj', 1.8);
    const slot = FORMATIONS[S.team.form][mp.slot];
    const onPitch = new Set(S.mps.map(m => m.p.id));
    const bench = availPlayers(S.team).filter(p => !onPitch.has(p.id) && !S.subsOut.includes(p.id) && !(this.sentOff && this.sentOff.has(p.id)));
    const sub = S.subs < 5 ? bench.sort((a, b) => slotScore(b, slot) - slotScore(a, slot))[0] : null;
    if (sub) { this.substitute(S, mp.p.id, sub.id); this.comment(`${pName(mp.p)} sa zranil (${INJ_TYPES[e.k][0].toLowerCase()}), nastupuje ${pName(sub)}.`); return; }
    this.comment(`${pName(mp.p)} sa zranil a ${S.team.short} už nemôže striedať – hrá v oslabení.`);
    if (mp.isGK || S.mps.length <= 7) return;
    if (this.ball.owner === mp) this.ball.owner = S.mps.filter(m => m !== mp).sort((a, b) => dist(a, mp) - dist(b, mp))[0] || null;
    S.mps = S.mps.filter(m => m !== mp);
    this.men[e.side]--;
    this.retime();
  }

  // prepočíta zvyšné šance po zmene taktiky
  retime() {
    const from = Math.max(this.minute, this.half2 ? 45 : 0) + 0.5;
    if (from >= 89) return;
    const keep = this.chances.slice(0, this.chIdx + (this.state === 'chance' ? 1 : 0));
    const fresh = buildChances(this.home, this.away, this.cfg.neutral, from, 90, this.men);
    this.chances = keep.concat(fresh.filter(c => c.min > from));
  }

  // dosimuluje zvyšok zápasu bez animácie
  simRest() {
    const lp = S => S.mps.map(m => ({ p: m.p, sp: m.role }));
    const rest = this.chances.slice(this.chIdx + (this.state === 'chance' ? 1 : 0));
    for (const c of rest) {
      if (c.min < this.minute) continue;
      const A = this.sides[c.side], D = this.sides[1 - c.side];
      const sh = pickShooter(lp(A));
      A.shots++;
      if (U.chance(goalProb(shotEff(sh.p, sh.sp), keeperEff(this.gkOf(D).p)))) {
        A.goals++; A.onT++;
        const as = pickAssist(lp(A), sh);
        const min = Math.min(90, Math.max(1, Math.ceil(c.min)));
        this.events.push({ min, side: c.side, pid: sh.p.id, aid: as ? as.p.id : -1 });
        this.addMark(c.side, min);
      } else if (U.chance(0.4)) A.onT++;
    }
    this.chIdx = this.chances.length;
    const restMin = Math.max(0, 90 - this.minute) / MIN_PER_SEC;
    const m0 = this.str[0].mid, m1 = this.str[1].mid;
    this.sides[0].poss += restMin * m0 / (m0 + m1); this.sides[1].poss += restMin * m1 / (m0 + m1);
    this.minute = 90 + this.added;
    this.half2 = true;
    this.state = 'flow';
    const s0 = this.sides[0].goals, s1 = this.sides[1].goals;
    if (this.cfg.knockout && s0 === s1) {
      const pen = simPenalties(this.home, this.away);
      this.penShootout = { kicks: [[], []], sim: pen };
      for (const [s, g] of pen.seq) this.penShootout.kicks[s].push(g);
    }
    this.finished = true; this.paused = true;
    this.showOverlay('full');
  }

  end() {
    if (this.dead) return;
    const S = this.sides;
    // karty, ktoré sa už neukázali (preskočený zvyšok zápasu)
    for (; this.cardIdx < this.cardEv.length; this.cardIdx++) {
      const c = this.cardEv[this.cardIdx];
      if (this.cardsOut.some(x => x.pid === c.pid && x.c === 'R')) continue;
      if (c.c === 'Y' && this.cardsOut.some(x => x.pid === c.pid && x.c === 'Y')) { c.c = 'R'; c.two = true; }
      this.cardsOut.push(c);
    }
    // zranenia z preskočeného zvyšku zápasu (len hráči, ktorí boli ešte na ihrisku)
    for (; this.injIdx < this.injEv.length; this.injIdx++) {
      const e = this.injEv[this.injIdx], Sd = S[e.side];
      if (Sd.mps.some(m => m.p.id === e.pid)) this.injOut.push(e);
    }
    const res = { hg: S[0].goals, ag: S[1].goals, ev: this.events.slice(), cards: this.cardsOut.slice(), shots: [S[0].shots, S[1].shots], pen: null,
      inj: this.injOut.slice(), lu: [this.orig[0].lineup.slice(), this.orig[1].lineup.slice()], sb: [S[0].subsIn.slice(), S[1].subsIn.slice()], varx: this.varx.slice() };
    if (this.penShootout) {
      const P = this.penShootout;
      res.pen = { h: P.kicks[0].filter(Boolean).length, a: P.kicks[1].filter(Boolean).length };
    }
    res.stats = { poss: Math.round(S[0].poss / (S[0].poss + S[1].poss) * 100), onT: [S[0].onT, S[1].onT] };
    // xG z polohy striel (bližšie a stredom = vyššia šanca), mapa striel a heatmapa
    const xgOf = sh => (sh.pk ? 0.76 : U.clamp(0.42 * Math.exp(-Math.hypot((1 - sh.x) * PL, (0.5 - sh.y) * PW) / 9.5), 0.02, 0.6));
    res.stats.xg = [0, 1].map(i => Math.round(this.shotLog.filter(x => x.side === i).reduce((a, x) => a + xgOf(x), 0) * 100) / 100);
    res.shotsL = this.shotLog.map(x => ({ side: x.side, x: x.x, y: x.y, goal: x.goal, xg: Math.round(xgOf(x) * 100) / 100, sp: x.pk ? 'pk' : null }));
    res.heat = this.heat;
    G.htTalk = null;
    // obnov pôvodné zostavy a mentalitu
    this.home.lineup = this.orig[0].lineup; this.home.ment = this.orig[0].ment;
    this.away.lineup = this.orig[1].lineup; this.away.ment = this.orig[1].ment;
    if (this.cfg.record) {
      applyMatchEffects(this.home, this.orig[0].lineup, S[0].subsIn);
      applyMatchEffects(this.away, this.orig[1].lineup, S[1].subsIn);
      applyCards(res.cards, this.home, this.away);
      applyGoals(res.ev);
      applyInjuries(res.inj);
      matchAfterFx(this.home, this.away, res, this.cfg.neutral);
    }
    this.destroy();
    this.cfg.onEnd && this.cfg.onEnd(res);
  }

  destroy() {
    this.dead = true;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
    window.removeEventListener('resize', this.onResize);
    clearTimeout(this.bannerTO);
    SFX.stopCrowd();
  }

  // ─── Kamera a vykresľovanie ──────────────────────────────
  targetScale(close) {
    let W = this.cv.width, H = this.cv.height;
    if (this.rot) [W, H] = [H, W];
    if (this.rot) return close ? Math.min(W / 46, H / 27) : Math.min(W / 80, H / 46);
    return close ? Math.min(W / 50, H / 33) : Math.min(W / 86, H / 60);
  }

  updateCamera(dt) {
    const b = this.ball;
    const close = this.state === 'chance' || this.state === 'goal' || (this.state === 'pause2' && this.penShootout);
    const ts = this.targetScale(close);
    let tx, ty;
    if (close) {
      const A = this.state === 'goal' ? this.sides[this.goalSide] : this.att;
      tx = b.x + (A ? A.dir : 0) * 5; ty = b.y;
    } else { tx = b.x; ty = PW / 2 + (b.y - PW / 2) * 0.5; }
    const c = this.cam;
    c.s += (ts - c.s) * Math.min(1, dt * 3);
    let W = this.cv.width, H = this.cv.height;
    if (this.rot) [W, H] = [H, W];
    const hw = W / 2 / c.s, hh = H / 2 / c.s;
    const clampAx = (v, lo, hi, half) => (hi - lo < half * 2 ? (lo + hi) / 2 : U.clamp(v, lo + half, hi - half));
    tx = clampAx(tx, -9, PL + 9, hw); ty = clampAx(ty, -9, PW + 9, hh);
    c.x += (tx - c.x) * Math.min(1, dt * 4);
    c.y += (ty - c.y) * Math.min(1, dt * 4);
  }

  worldTransform(ctx) {
    const c = this.cam, W = this.cv.width, H = this.cv.height;
    if (this.rot) ctx.setTransform(0, -c.s, c.s, 0, W / 2 - (c.y) * c.s, H / 2 + c.x * c.s);
    else ctx.setTransform(c.s, 0, 0, c.s, W / 2 - c.x * c.s, H / 2 - c.y * c.s);
  }

  render(dt) {
    const ctx = this.ctx, W = this.cv.width, H = this.cv.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#16213a'; ctx.fillRect(0, 0, W, H);
    this.worldTransform(ctx);
    this.drawStadium(ctx);
    this.drawPitch(ctx);
    this.drawGoalsBack(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    // entity zoradené podľa hĺbky
    const u = this.cam.s * 1.05;
    const ents = this.all().map(m => ({ m, sy: this.w2s(m.x, m.y)[1] }));
    const [bsx, bsy] = this.w2s(this.ball.x, this.ball.y);
    ents.push({ ball: true, sy: bsy + 0.01 });
    ents.sort((a, b) => a.sy - b.sy);
    const ctrl = this.controlled();
    for (const e of ents) {
      if (e.ball) {
        const b = this.ball, r = Math.max(2.5, 0.27 * u);
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath(); ctx.ellipse(bsx + b.z * u * 0.25, bsy, r * 1.05, r * 0.45, 0, 0, Math.PI * 2); ctx.fill();
        drawBall(ctx, bsx, bsy - r - b.z * u * 0.85, r, b.rot);
        continue;
      }
      const m = e.m;
      const [sx, sy] = this.w2s(m.x, m.y);
      if (sx < -60 || sx > W + 60 || sy < -80 || sy > H + 60) continue;
      const kit = m.isGK ? this.gkKits[m.side] : this.kits[m.side];
      const moving = Math.hypot(m.vx, m.vy) > 0.5;
      let face = m.face;
      if (this.rot) face = m.vy > 0.4 ? 1 : m.vy < -0.4 ? -1 : (this.sides[m.side].dir > 0 ? -1 : 1);
      drawFigure(ctx, sx, sy, u, kit, m.look, {
        phase: m.phase, moving, face, num: m.num, gloves: m.isGK ? '#e8ff70' : null,
        ring: m === ctrl ? '#ffe14d' : (this.ball.owner === m && this.state === 'chance' ? 'rgba(255,255,255,0.7)' : null),
        dive: m.isGK ? (this.rot ? 0 : m.dive * (this.sides[m.side].dir)) : 0,
      });
      if ((m === ctrl || (this.state === 'chance' && this.ball.owner === m)) && u > 9) {
        ctx.font = `bold ${Math.round(Math.max(11, u * 0.42))}px Nunito, Arial`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
        const label = pName(m.p);
        const tw = ctx.measureText(label).width + 10;
        ctx.fillStyle = 'rgba(10,14,40,0.75)';
        rrect(ctx, sx - tw / 2, sy - 2.45 * u - u * 0.5, tw, u * 0.5 + 4, 4); ctx.fill();
        ctx.fillStyle = m.side === this.userSide ? '#ffe14d' : '#fff';
        ctx.fillText(label, sx, sy - 2.45 * u + 2);
      }
    }
    this.worldTransform(ctx);
    this.drawGoalsFront(ctx);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.drawWeather(ctx, W, H, dt || 0.016);
    // stopa ťahu
    if (this.trailT > 0 && this.trail.length > 1) {
      ctx.strokeStyle = `rgba(255,255,255,${this.trailT * 2})`; ctx.lineWidth = 6 * this.dpr; ctx.lineCap = 'round';
      ctx.beginPath(); this.trail.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    }
    if (this.ptr.down && this.ptr.path.length > 1 && !this.ptr.steer) {
      ctx.strokeStyle = 'rgba(255,225,77,0.85)'; ctx.lineWidth = 5 * this.dpr; ctx.lineCap = 'round';
      ctx.beginPath(); this.ptr.path.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
    }
    if (this.fade > 0) { ctx.fillStyle = `rgba(8,12,30,${this.fade * 0.8})`; ctx.fillRect(0, 0, W, H); }
  }

  drawStadium(ctx) {
    if (!this.crowd) this.crowd = makeCrowd();
    ctx.drawImage(this.crowd, -18, -16, PL + 36, PW + 32);
    // reklamné panely
    const boardH = 1.1;
    const drawBoards = (y0, horizontal, len, start, flipText) => {
      let x = start, i = 0;
      while (x < start + len - 0.1) {
        const ad = AD_BOARDS[(i + (flipText ? 3 : 0)) % AD_BOARDS.length];
        const w = Math.min(14, start + len - x);
        ctx.fillStyle = ad[2];
        if (horizontal) ctx.fillRect(x, y0, w - 0.15, boardH); else ctx.fillRect(y0, x, boardH, w - 0.15);
        ctx.fillStyle = ad[1];
        ctx.save();
        if (horizontal) { ctx.translate(x + w / 2, y0 + boardH / 2 + 0.05); }
        else { ctx.translate(y0 + boardH / 2, x + w / 2); ctx.rotate(Math.PI / 2); }
        ctx.scale(0.05, 0.05);
        ctx.font = 'bold 14px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(ad[0], 0, 0);
        ctx.restore();
        x += w; i++;
      }
    };
    drawBoards(-3.2, true, PL + 6, -3, false);
    drawBoards(PW + 2.1, true, PL + 6, -3, true);
    drawBoards(-4.6, false, PW + 4, -2, false);
    drawBoards(PL + 3.5, false, PW + 4, -2, true);
  }

  // dážď, sneh, hmla, horúčava a blesky cez obraz
  drawWeather(ctx, W, H, dt) {
    const k = this.wx && this.wx.k;
    dt = Math.min(0.05, dt);
    if (!k || k === 'sun' || k === 'cloud') return;
    if (k === 'fog' || k === 'heat') {
      ctx.fillStyle = k === 'fog' ? 'rgba(215,222,232,.2)' : 'rgba(255,170,80,.06)';
      ctx.fillRect(0, 0, W, H);
      return;
    }
    const snow = k === 'snow' || k === 'frost', n = snow ? (k === 'snow' ? 140 : 40) : k === 'wind' ? 0 : k === 'storm' ? 320 : 240;
    if (!this.wxP || this.wxP.length !== n) this.wxP = Array.from({ length: n }, () => ({ x: Math.random() * W, y: Math.random() * H, v: 0.6 + Math.random() * 0.8, r: Math.random() }));
    const d = this.dpr || 1;
    if (snow) {
      ctx.fillStyle = 'rgba(255,255,255,.8)';
      for (const p of this.wxP) {
        p.y += p.v * 60 * dt * d; p.x += Math.sin(p.y / 40 + p.r * 6) * 0.6 * d;
        if (p.y > H) { p.y -= H + 8; p.x = Math.random() * W; }
        ctx.beginPath(); ctx.arc(p.x, p.y, (1.2 + p.r * 1.8) * d, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = k === 'frost' ? 'rgba(200,225,255,.1)' : 'rgba(255,255,255,.07)'; ctx.fillRect(0, 0, W, H);
      return;
    }
    if (n) {
      ctx.strokeStyle = 'rgba(200,220,245,.55)'; ctx.lineWidth = 1.5 * d; ctx.beginPath();
      for (const p of this.wxP) {
        p.y += p.v * 900 * dt * d; p.x -= p.v * 160 * dt * d;
        if (p.y > H) { p.y -= H + 30; p.x = Math.random() * (W + 200); }
        ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 5 * d, p.y + 26 * d * p.v);
      }
      ctx.stroke();
      ctx.fillStyle = 'rgba(20,30,50,.18)'; ctx.fillRect(0, 0, W, H);
    }
    if (k === 'storm') {
      if (this.flashT <= 0 && Math.random() < dt * 0.12) this.flashT = 0.25;
      if (this.flashT > 0) { this.flashT -= dt; ctx.fillStyle = `rgba(235,240,255,${this.flashT * 1.6})`; ctx.fillRect(0, 0, W, H); }
    }
  }

  drawPitch(ctx) {
    ctx.fillStyle = '#4f9a2f'; ctx.fillRect(-3, -2, PL + 6, PW + 4);
    const n = 18, sw = PL / n;
    for (let i = 0; i < n; i++) { ctx.fillStyle = i % 2 ? '#5aa833' : '#63b33a'; ctx.fillRect(i * sw, 0, sw, PW); }
    ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = Math.max(0.13, 1.6 / this.cam.s);
    ctx.strokeRect(0, 0, PL, PW);
    ctx.beginPath(); ctx.moveTo(PL / 2, 0); ctx.lineTo(PL / 2, PW); ctx.stroke();
    ctx.beginPath(); ctx.arc(PL / 2, PW / 2, 9.15, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff';
    const dot = (x, y) => { ctx.beginPath(); ctx.arc(x, y, 0.28, 0, Math.PI * 2); ctx.fill(); };
    dot(PL / 2, PW / 2); dot(11, PW / 2); dot(PL - 11, PW / 2);
    const bw = 40.32, sw2 = 18.32;
    ctx.strokeRect(0, PW / 2 - bw / 2, 16.5, bw); ctx.strokeRect(PL - 16.5, PW / 2 - bw / 2, 16.5, bw);
    ctx.strokeRect(0, PW / 2 - sw2 / 2, 5.5, sw2); ctx.strokeRect(PL - 5.5, PW / 2 - sw2 / 2, 5.5, sw2);
    const a = Math.acos(5.5 / 9.15);
    ctx.beginPath(); ctx.arc(11, PW / 2, 9.15, -a, a); ctx.stroke();
    ctx.beginPath(); ctx.arc(PL - 11, PW / 2, 9.15, Math.PI - a, Math.PI + a); ctx.stroke();
    for (const [x, y, s, e] of [[0, 0, 0, 0.5], [PL, 0, 0.5, 1], [PL, PW, 1, 1.5], [0, PW, 1.5, 2]]) {
      ctx.beginPath(); ctx.arc(x, y, 1, Math.PI * s, Math.PI * e); ctx.stroke();
    }
  }

  drawGoalsBack(ctx) {
    for (const gx of [0, PL]) {
      const d = gx === 0 ? -2 : 2;
      ctx.fillStyle = 'rgba(255,255,255,0.13)';
      ctx.fillRect(Math.min(gx, gx + d), GY1, 2, GW);
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.05;
      ctx.beginPath();
      for (let y = GY1; y <= GY2 + 0.01; y += 0.6) { ctx.moveTo(gx, y); ctx.lineTo(gx + d, y); }
      for (let k = 0; k <= 2.01; k += 0.5) { ctx.moveTo(gx + (d > 0 ? k : -k), GY1); ctx.lineTo(gx + (d > 0 ? k : -k), GY2); }
      ctx.stroke();
    }
  }
  drawGoalsFront(ctx) {
    for (const gx of [0, PL]) {
      const d = gx === 0 ? -2 : 2;
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.22;
      ctx.beginPath(); ctx.moveTo(gx, GY1); ctx.lineTo(gx + d, GY1); ctx.lineTo(gx + d, GY2); ctx.lineTo(gx, GY2); ctx.stroke();
      ctx.lineWidth = 0.3;
      ctx.beginPath(); ctx.moveTo(gx, GY1); ctx.lineTo(gx, GY2); ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(gx, GY1, 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(gx, GY2, 0.22, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
  let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  t = U.clamp(t, 0, 1);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function statRow(label, a, b, pct) {
  return `<div class="st-row"><span>${a}</span><div class="st-mid"><em>${label}</em><div class="st-bar"><i style="width:${U.clamp(pct, 0, 100)}%"></i></div></div><span>${b}</span></div>`;
}

let _crowdCanvas = null;
function makeCrowd() {
  if (_crowdCanvas) return _crowdCanvas;
  const c = document.createElement('canvas');
  const s = 6;
  c.width = (PL + 36) * s; c.height = (PW + 32) * s;
  const x = c.getContext('2d');
  x.fillStyle = '#1d2740'; x.fillRect(0, 0, c.width, c.height);
  const cols = ['#c8102e', '#1d4fa3', '#ffffff', '#ffd200', '#2e7d32', '#f47b20', '#5bb6ec', '#e8b88a', '#3a2616', '#9e9e9e', '#111'];
  for (let i = 0; i < 9000; i++) {
    const px = Math.random() * c.width, py = Math.random() * c.height;
    const wx = px / s - 18, wy = py / s - 16;
    if (wx > -6 && wx < PL + 6 && wy > -5 && wy < PW + 5) continue;
    x.fillStyle = cols[(Math.random() * cols.length) | 0];
    x.globalAlpha = 0.55 + Math.random() * 0.4;
    x.beginPath(); x.arc(px, py, s * 0.32, 0, Math.PI * 2); x.fill();
  }
  x.globalAlpha = 1;
  x.fillStyle = '#2a3552';
  x.fillRect((-6 + 18) * s, (-5 + 16) * s, (PL + 12) * s, (PW + 10) * s);
  x.fillStyle = '#3f8a28';
  x.fillRect((-4.4 + 18) * s, (-3.4 + 16) * s, (PL + 8.8) * s, (PW + 6.8) * s);
  _crowdCanvas = c;
  return c;
}
