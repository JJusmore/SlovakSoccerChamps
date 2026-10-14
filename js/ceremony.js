'use strict';
// ─── Ceremónie: úvod pred pohárovým zápasom, oslava trofeje, ohňostroj ───

const CIN_THEME = {
  classic: { colors: ['#ffffff', '#2f6bff', '#ff3b47', '#ffd23f'], tag: 'NAJVÄČŠÍ TURNAJ NA SLOVENSKU' },
  cup: { colors: ['#e9eef8', '#8fb4ff', '#ffffff', '#ffd23f'], tag: 'SLOVENSKÝ POHÁR' },
  super: { colors: ['#c79bff', '#ffd23f', '#ffffff', '#8fb4ff'], tag: 'ZÁPAS MAJSTROV' },
  reg: { colors: ['#f0b27a', '#7fe0a0', '#ffffff', '#ffd23f'], tag: 'REGIONÁLNY POHÁR' },
  league: { colors: ['#ffd23f', '#ffffff', '#ffb02e', '#fff3c4'] },
  derby: { colors: ['#ff5a2a', '#ffd23f', '#ff2a4a', '#ffffff'], tag: 'DERBY' },
  promo: { colors: ['#47e087', '#ffffff', '#ffd23f', '#5a95ff'] },
};
const reduceMotion = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

// ── Zvuky ceremónií (WebAudio, generované) ─────────────────────
SFX.tone = function (freq, t0, dur, type = 'sawtooth', gain = 0.05, cutoff = 2400) {
  if (!this.ctx || !this.on()) return;
  const c = this.ctx, t = c.currentTime + t0;
  const o = c.createOscillator(), f = c.createBiquadFilter(), g = c.createGain();
  o.type = type; o.frequency.value = freq;
  f.type = 'lowpass'; f.frequency.value = cutoff;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.04);
  g.gain.setValueAtTime(gain, t + dur * 0.7); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(f); f.connect(g); g.connect(c.destination);
  o.start(t); o.stop(t + dur + 0.05);
};
SFX.fanfare = function (big) {
  if (!this.ctx || !this.on()) return;
  const N = [392, 523.25, 659.25, 783.99];
  [[0, 0, 0.18], [1, 0.2, 0.18], [2, 0.4, 0.18], [3, 0.6, 0.55]].forEach(([i, t, d]) => { this.tone(N[i], t, d, 'sawtooth', 0.045); this.tone(N[i] / 2, t, d, 'square', 0.02, 900); });
  if (big) [523.25, 659.25, 783.99, 1046.5].forEach(f => this.tone(f, 1.25, 1.4, 'sawtooth', 0.03));
};
SFX.boom = function () {
  if (!this.ctx || !this.on()) return;
  const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
  o.type = 'sine'; o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(38, t + 0.6);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
  o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.85);
  this.noise(0.5, 300, 0.6, 0.25, 0.005);
};

// ── Častice: iskry, ohňostroj, konfety ─────────────────────────
function fxRun(cv, opts) {
  const ctx = cv.getContext('2d');
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  let W = 0, H = 0;
  const fit = () => { W = cv.clientWidth; H = cv.clientHeight; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  fit();
  const P = [], col = opts.colors || ['#ffd23f', '#fff'];
  const low = reduceMotion();
  const MAX = low ? 160 : 700;
  const add = p => { if (P.length < MAX) P.push(p); };
  const api = {
    burst(x, y, n = 70, sp = 260, c) {
      const cc = c || U.pick(col);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, v = sp * (0.35 + Math.random() * 0.65);
        add({ k: 'e', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: U.rf(0.9, 1.6), t: 0, c: Math.random() < 0.25 ? '#ffffff' : cc, r: U.rf(1.2, 2.6) });
      }
    },
    rocket(x) { add({ k: 'r', x: x ?? U.rf(W * 0.15, W * 0.85), y: H + 10, vx: U.rf(-30, 30), vy: -U.rf(H * 0.9, H * 1.25), life: 9, t: 0, c: U.pick(col), ty: U.rf(H * 0.12, H * 0.45) }); },
    confetti(n) {
      for (let i = 0; i < n; i++) add({ k: 'c', x: Math.random() * W, y: -20 - Math.random() * H * 0.6, vx: U.rf(-30, 30), vy: U.rf(60, 150), life: 12, t: 0, c: U.pick(col), w: U.rf(6, 11), h: U.rf(3, 6), a: Math.random() * 6, sp: U.rf(-6, 6), fl: Math.random() * 6, fs: U.rf(4, 10), sw: Math.random() * 6 });
    },
  };
  let last = performance.now(), nextFw = opts.fwDelay || 0.4, t = 0;
  const frame = now => {
    if (!cv.isConnected) return;
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now; t += dt;
    if (cv.clientWidth !== W || cv.clientHeight !== H) fit();
    if (opts.sparks && !low) for (let i = 0; i < opts.sparks * dt; i++) add({ k: 's', x: Math.random() * W, y: H + 5, vx: U.rf(-15, 15), vy: -U.rf(60, 190), life: U.rf(1.4, 3.2), t: 0, c: U.pick(col), r: U.rf(0.8, 2.2) });
    if (opts.fireworks && t > nextFw) { api.rocket(); nextFw = t + U.rf(0.3, 0.85) / (opts.fireworks || 1); }
    ctx.clearRect(0, 0, W, H);
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      p.t += dt;
      if (p.k === 'r') {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 260 * dt;
        if (p.y <= p.ty || p.vy >= 0) { api.burst(p.x, p.y, low ? 30 : U.ri(55, 90), U.rf(180, 320), p.c); if (opts.onBoom) opts.onBoom(); P.splice(i, 1); continue; }
      } else if (p.k === 'c') {
        p.sw += dt * 2; p.x += (p.vx + Math.sin(p.sw) * 40) * dt; p.y += p.vy * dt; p.a += p.sp * dt; p.fl += p.fs * dt;
        if (p.y > H + 20) { if (opts.confettiLoop) { p.y = -10; p.x = Math.random() * W; } else { P.splice(i, 1); continue; } }
      } else {
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.k === 'e') { p.vx *= 1 - 1.6 * dt; p.vy = p.vy * (1 - 1.6 * dt) + 120 * dt; }
        if (p.t > p.life) { P.splice(i, 1); continue; }
      }
      const fade = p.k === 'c' ? 1 : Math.max(0, 1 - p.t / p.life);
      if (p.k === 'c') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a); ctx.scale(1, Math.cos(p.fl));
        ctx.fillStyle = p.c; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      } else {
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = fade * (p.k === 's' ? 0.55 + 0.45 * Math.sin(p.t * 18 + p.x) : 1);
        ctx.fillStyle = p.c;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.k === 'r' ? 2.4 : p.r, 0, Math.PI * 2); ctx.fill();
        if (p.k === 'r') { ctx.globalAlpha = 0.35; ctx.fillRect(p.x - 1, p.y, 2, 16); }
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
    }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return api;
}

function letters(txt, cls, delay0, step) {
  return [...txt].map((ch, i) => ch === ' ' ? '<i class="sp"> </i>' : `<i class="${cls}" style="animation-delay:${(delay0 + i * step).toFixed(2)}s">${U.esc(ch)}</i>`).join('');
}

function overlayClose(el, cb) {
  if (!el || el.closing) return;
  el.closing = true;
  el.classList.add('out');
  document.removeEventListener('keydown', el.onKey);
  setTimeout(() => { el.remove(); if (!document.querySelector('.cin, .cel, .cine')) document.body.classList.remove('fx-open'); if (cb) cb(); }, 420);
}

// ── Filmový úvod pred zápasom: tunel → celok štadióna → detail trofeje ──
const CINE = { tun: 3.6, wide: 2.6 };
const CINE_GRADE = { classic: ['#123462', '#ffc66e'], cup: ['#17304d', '#ffd9a4'], super: ['#261b54', '#ffcf8c'], reg: ['#123b2f', '#ffd49c'], derby: ['#3d1110', '#ffad66'], cl: ['#0a1640', '#c9d8ff'], el: ['#2a1606', '#ffb352'], ecl: ['#08281a', '#8dffc0'] };
function svgImg(svg) { const im = new Image(); im.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ')); return im; }
const imgOk = im => im && im.complete && im.naturalWidth > 0;
const easeIO = k => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
function introKits(home, away) {
  let kA = away.kit;
  if (U.colorDist(home.kit.p, away.kit.p) < 150) kA = kitAway(away);
  if (U.colorDist(home.kit.p, kA.p) < 150) kA = { p: '#222244', s: '#ffd200', sh: '#222244', pat: 'plain' };
  return [home.kit, kA];
}

// filmové zrno ako obrázok (posúva ho CSS – nestojí nič pri vykresľovaní)
let CINE_GRAIN = null;
function cineGrain() {
  if (CINE_GRAIN) return CINE_GRAIN;
  const c = document.createElement('canvas'); c.width = c.height = 180;
  const g = c.getContext('2d'), d = g.createImageData(180, 180);
  for (let i = 0; i < d.data.length; i += 4) { const v = (Math.random() * 255) | 0; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; }
  g.putImageData(d, 0, 0);
  return (CINE_GRAIN = c.toDataURL('image/png'));
}

function introScene(cv, o) {
  const main = cv.getContext('2d', { alpha: false });
  let dpr = 1, ctx = main, W = 0, H = 0, DT = 1 / 60, q = 1;
  let crowdCv = null, view = null, closeBg = null, layer = null, zbA = null, zbB = null, troS = null, troB = null, crestS = null, flameS = null;
  const sprites = new Map();
  // plátno s pevným rozlíšením (pri veľkých obrazovkách max. 1920 px šírky – kvôli 60 fps)
  const mkC = (w, h, r = dpr) => { const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(w * r)); c.height = Math.max(1, Math.round(h * r)); const x = c.getContext('2d'); x.setTransform(r, 0, 0, r, 0, 0); return { cv: c, ctx: x, w, h }; };
  // rozlíšenie hlavného plátna a pracovných vrstiev (q klesne, keď počítač nestíha 60 fps)
  const scaleTo = () => {
    dpr = Math.min(1.5, window.devicePixelRatio || 1, 1920 / Math.max(1, W)) * q;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); main.setTransform(dpr, 0, 0, dpr, 0, 0);
    layer = mkC(W, H);
    // pomocné vrstvy pre rozmazanie a žiaru – v nízkom rozlíšení (sú rozmazané, takže to nevidno)
    zbA = mkC(W, H, dpr * 0.35); zbB = mkC(W, H, dpr * 0.35);
  };
  const fit = () => {
    W = cv.clientWidth || innerWidth; H = cv.clientHeight || innerHeight;
    scaleTo();
    crowdCv = view = closeBg = troS = troB = crestS = null;
    bloom.width = Math.max(1, Math.round(W / 8)); bloom.height = Math.max(1, Math.round(H / 8)); bctx.imageSmoothingQuality = 'medium';
  };
  // žiara (halation): malé plátno, ktoré GPU roztiahne, rozmaže, nechá len svetlá a primieša cez „screen“
  const bloom = document.createElement('canvas'), bctx = bloom.getContext('2d');
  bloom.className = 'cine-bloom'; cv.after(bloom);
  const flash = document.createElement('div'); flash.className = 'cine-flash'; bloom.after(flash);
  const into = (L, fn, keep) => { const prev = ctx; ctx = L.ctx; if (!keep) ctx.clearRect(0, 0, L.w, L.h); fn(); ctx = prev; return L.cv; };
  fit();
  const kits = introKits(o.home, o.away);
  const GKK = [{ p: '#2ecc71', s: '#111111', sh: '#1a1a1a', pat: 'plain', so: '#2ecc71' }, { p: '#ff9800', s: '#111111', sh: '#4a2a00', pat: 'plain', so: '#ff9800' }];
  const squad = t => { const ids = (t.lineup && t.lineup.length ? t.lineup : t.pids).slice(0, 11); return ids.map(id => G.players[id]).filter(Boolean); };
  const teams = [squad(o.home), squad(o.away)];
  const low = reduceMotion();
  const T1 = low ? 0.5 : CINE.tun, T2 = T1 + (low ? 0.5 : CINE.wide);
  const trophy = o.trophy ? svgImg(o.trophy) : null;
  const crests = o.trophy ? null : [svgImg(crestSVG(o.home, 240)), svgImg(crestSVG(o.away, 240))];
  const R = campusRand(U.hash(o.home.name + o.away.name));
  const dust = Array.from({ length: 70 }, () => ({ x: Math.random() * 2 - 1, y: Math.random() * 2 - 1, r: 0.5 + Math.random() * 1.6, v: 0.04 + Math.random() * 0.12, p: Math.random() * 6 }));
  const bokeh = Array.from({ length: 30 }, (_, i) => ({ x: Math.random(), y: 0.06 + Math.random() * 0.46, r: 8 + Math.random() * 34, c: [kits[0].p, '#ffffff', '#ffe2a0', kits[1].p][i % 4], a: 0.06 + Math.random() * 0.14, v: (Math.random() - 0.5) * 0.012 }));

  // ── predpripravené postavičky v tuneli (8 fáz chôdze × 2 osvetlenia) – tieň a žiara sa počítajú len raz
  const UREF = Math.round(U.clamp(Math.min(W, H) * 0.1, 56, 110)), SPW = Math.round(UREF * 1.7), SPH = Math.round(UREF * 2.45), FOOT = SPH - UREF * 0.25, NPH = 8;
  const sprite = (pl, kit, f, lit) => {
    const key = pl.id + ':' + f + ':' + lit;
    let c = sprites.get(key);
    if (c) return c;
    const tmp = mkC(SPW, SPH, 1);
    drawFigure(tmp.ctx, SPW / 2, FOOT, UREF, kit, playerLook(pl), { back: true, moving: true, phase: (f / NPH) * Math.PI * 2, num: pl.num || '' });
    tmp.ctx.globalCompositeOperation = 'source-atop'; tmp.ctx.fillStyle = `rgba(4,5,9,${lit ? 0.5 : 0.82})`; tmp.ctx.fillRect(0, 0, SPW, SPH);
    const L = mkC(SPW, SPH, 1);
    L.ctx.filter = lit ? 'drop-shadow(0 0 2px rgba(255,236,196,.35))' : 'drop-shadow(0 0 6px rgba(255,236,196,.95))';
    L.ctx.drawImage(tmp.cv, 0, 0, SPW, SPH);
    sprites.set(key, L.cv);
    return L.cv;
  };

  // fázy chôdze sa pripravia vopred: osvetlené hneď, siluety v protisvetle (drahší filter) postupne počas tunela
  const tunnelCast = [];
  for (let side = 0; side < 2; side++) for (let i = 0; i < 6; i++) {
    const pl = teams[side][i === 5 ? 0 : 5 - i] || teams[side][i];
    if (pl) tunnelCast.push({ pl, side, i, kit: i === 5 ? GKK[side] : kits[side] });
  }
  const warmQ = [];
  if (!low) {
    for (const w of tunnelCast) for (let f = 0; f < NPH; f++) sprite(w.pl, w.kit, f, 1);
    // najskôr hráči, ktorí sú najďalej (prví sa dostanú do protisvetla)
    for (const w of tunnelCast.slice().sort((p, q) => p.i - q.i)) for (let f = 0; f < NPH; f++) warmQ.push(w);
  }

  // ── záber 1: tunel – kamera ide za hráčmi a prejde otvorom von na štadión
  const EXIT = 11.5;
  const drawTunnel = (t, mid, wa = 1) => {
    const k = Math.min(1, t / T1);
    const cx = W / 2 + Math.sin(t * 0.7) * W * 0.006 * (1 - k), cy = H * 0.47 + Math.sin(t * 7.2) * 1.6 * (1 - k), F = Math.min(W, H) * 0.95;
    const camZ = (EXIT - 0.75) * (0.62 * k + 0.38 * k * k * k), camH = 1.45;
    const P = (x, y, z) => { const sc = F / Math.max(0.05, z - camZ); return [cx + x * sc, cy + (camH - y) * sc, sc]; };
    const near = U.clamp(camZ / (EXIT - 0.75), 0, 1);
    ctx.fillStyle = '#030408'; ctx.fillRect(0, 0, W, H);
    const [ex0, ey0] = P(-2, 3, EXIT), [ex1, ey1] = P(2, 0, EXIT), ecy = (ey0 + ey1) / 2, ew0 = ex1 - ex0, eh0 = ey1 - ey0;
    ensureView();
    ctx.save(); ctx.beginPath(); ctx.rect(ex0, ey0, ew0, eh0); ctx.clip();
    const cs = Math.max(ew0 / W, eh0 / H), dw = W * cs, dh = H * cs;
    ctx.drawImage(view.cv, cx - dw / 2, ecy - dh * 0.5, dw, dh);
    let g = ctx.createRadialGradient(cx, ecy, 0, cx, ecy, Math.max(ew0, eh0) * 0.75);
    g.addColorStop(0, `rgba(255,250,235,${0.42 - 0.34 * near})`); g.addColorStop(1, `rgba(255,250,235,${0.7 - 0.52 * near})`);
    ctx.fillStyle = g; ctx.fillRect(ex0, ey0, ew0, eh0);
    ctx.restore();
    const seg = 1.25;
    const quad = (pts, fill) => { ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); };
    for (let z = EXIT; z > camZ + 0.2; z -= seg) {
      const z2 = z, z1 = Math.max(camZ + 0.2, z - seg);
      const lit = U.clamp(0.18 + 0.82 * Math.pow(U.clamp(1 - (EXIT - z2) / 12, 0, 1), 1.6), 0, 1);
      const sh = (c, kk) => U.shade(c, -0.9 + 0.78 * lit * kk);
      const a = P(-2, 0, z1), b = P(2, 0, z1), c2 = P(2, 3, z1), d = P(-2, 3, z1);
      const a2 = P(-2, 0, z2), b2 = P(2, 0, z2), c3 = P(2, 3, z2), d2 = P(-2, 3, z2);
      quad([a, a2, b2, b], sh('#3c4049', 1));
      quad([d, d2, c3, c2], sh('#25282f', 0.8));
      quad([a, a2, d2, d], sh('#474c58', 1));
      quad([b, b2, c3, c2], sh('#474c58', 1));
      quad([P(-0.55, 0, z1), P(-0.55, 0, z2), P(0.55, 0, z2), P(0.55, 0, z1)], sh('#1d5a33', 1.05));
      const bz1 = z1 + seg * 0.15, bz2 = z2 - seg * 0.15;
      if (bz2 > bz1) {
        quad([P(-1.99, 1.25, bz1), P(-1.99, 1.25, bz2), P(-1.99, 2.35, bz2), P(-1.99, 2.35, bz1)], sh(kits[0].p, 0.95));
        quad([P(1.99, 1.25, bz1), P(1.99, 1.25, bz2), P(1.99, 2.35, bz2), P(1.99, 2.35, bz1)], sh(kits[1].p, 0.95));
      }
      const [lx, ly, ls] = P(0, 2.96, z2);
      ctx.fillStyle = `rgba(255,246,214,${0.25 + 0.6 * lit})`; ctx.fillRect(lx - ls * 0.35, ly, ls * 0.7, Math.max(1, ls * 0.05));
    }
    // svetlo sa vylieva z otvoru, lúče a prach
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const br = Math.max(ew0, eh0) * 1.25;
    g = ctx.createRadialGradient(cx, ecy, Math.min(ew0, eh0) * 0.3, cx, ecy, br);
    g.addColorStop(0, 'rgba(255,238,200,.22)'); g.addColorStop(1, 'rgba(255,238,200,0)');
    ctx.fillStyle = g; ctx.fillRect(Math.max(0, cx - br), Math.max(0, ecy - br), Math.min(W, br * 2), Math.min(H, br * 2));
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.rect(ex0, ey0, ew0, eh0); ctx.clip('evenodd');
    for (let i = 0; i < 5; i++) {
      const ang = -Math.PI / 2 + (i - 2) * 0.42 + Math.sin(t * 0.4 + i) * 0.03, len = Math.max(W, H) * 0.9, sp = 0.035;
      g = ctx.createLinearGradient(cx, ecy, cx + Math.cos(ang) * len, ecy + Math.sin(ang) * len);
      g.addColorStop(0, `rgba(255,240,205,${0.03 + 0.03 * near})`); g.addColorStop(1, 'rgba(255,240,205,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx, ecy);
      ctx.lineTo(cx + Math.cos(ang - sp) * len, ecy + Math.sin(ang - sp) * len); ctx.lineTo(cx + Math.cos(ang + sp) * len, ecy + Math.sin(ang + sp) * len); ctx.closePath(); ctx.fill();
    }
    const ew = ew0 * 1.6, eh = eh0 * 1.1;
    ctx.fillStyle = 'rgba(255,248,225,.4)';
    for (const d of dust) {
      const y = ((d.y - d.v * t + 3) % 2) - 1, x = d.x + Math.sin(t * 0.8 + d.p) * 0.05;
      ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(t * 1.4 + d.p));
      ctx.fillRect(cx + x * ew - d.r, ecy + y * eh - d.r, d.r * 2, d.r * 2);
    }
    ctx.restore();
    if (mid) mid();
    // hráči kráčajú pred kamerou von na ihrisko – v protisvetle ako siluety
    const walkers = [];
    for (const c of tunnelCast) {
      const z = 4 + c.i * 1.05 + t * 2.55;
      if (z < camZ + 0.5 || z > EXIT + 12) continue;
      walkers.push({ ...c, z, x: c.side ? 0.72 : -0.72 });
    }
    walkers.sort((p, q) => q.z - p.z);
    if (wa > 0) for (const w of walkers) {
      const [X, Y, sc] = P(w.x, 0, w.z), u = sc * 0.4, m = u / UREF;
      const back = U.clamp((w.z - (EXIT - 4)) / 4, 0, 1);
      const f = (((Math.floor(((t * 9 + w.i * 1.7 + w.side) / (Math.PI * 2)) * NPH) % NPH) + NPH) % NPH);
      const kit = w.kit;
      const dx = X - (SPW / 2) * m, dy = Y - FOOT * m;
      if (back < 1) { ctx.globalAlpha = wa; ctx.drawImage(sprite(w.pl, kit, f, 1), dx, dy, SPW * m, SPH * m); }
      if (back > 0) { ctx.globalAlpha = back * wa; ctx.drawImage(sprite(w.pl, kit, f, 0), dx, dy, SPW * m, SPH * m); }
      ctx.globalAlpha = 1;
    }
    // anamorfný záblesk + odlesky šošovky
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    g = ctx.createLinearGradient(0, 0, W, 0);
    g.addColorStop(0, 'rgba(120,190,255,0)'); g.addColorStop(0.5, `rgba(170,215,255,${0.3 + 0.3 * near})`); g.addColorStop(1, 'rgba(120,190,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, ecy - 1.5, W, 3);
    ctx.globalAlpha = 0.22; ctx.fillRect(0, ecy - 6, W, 12);
    ctx.globalAlpha = 0.035 + 0.04 * near;
    for (const [fx, r, c] of [[0.35, 0.035, '#8fc4ff'], [0.62, 0.02, '#ffd9a0'], [0.8, 0.05, '#9fe0ff']]) {
      ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + (W * 0.5 - cx) * 2 * fx + (fx - 0.5) * W * 0.5, ecy + (H * 0.62 - ecy) * fx, Math.min(W, H) * r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  };

  // ── záber 2: celok štadióna
  const buildCrowd = () => {
    const w = W, h = Math.round(H * 0.52);
    const L = mkC(w, h, Math.min(2, dpr * 1.15)), c = L.ctx;
    let g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#05070f'); g.addColorStop(0.25, '#10152c'); g.addColorStop(1, '#262c48');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    c.fillStyle = '#070912'; c.fillRect(0, 0, w, h * 0.1);
    for (let x = 20; x < w; x += 60) { c.fillStyle = 'rgba(255,248,215,.75)'; c.fillRect(x, h * 0.085, 18, 2); }
    const rows = 22, top = h * 0.12, rh = (h * 0.84 - top) / rows;
    const hk = kits[0], ak = kits[1];
    for (let i = 0; i < rows; i++) {
      const y = top + i * rh;
      c.fillStyle = i % 2 ? 'rgba(255,255,255,.03)' : 'rgba(0,0,0,.14)'; c.fillRect(0, y, w, rh);
      const sz = 1.5 + (i / rows) * 2.4, step = sz * 1.9;
      for (let x = R() * step; x < w; x += step * (0.8 + R() * 0.5)) {
        const pal = x > w * 0.8 ? [ak.p, ak.s, ak.p, '#d9b48e', '#1a1a1a'] : [hk.p, hk.s, hk.p, '#d9b48e', '#c99c74', '#1a1a1a', '#e8e8e8'];
        c.fillStyle = pal[(R() * pal.length) | 0];
        c.fillRect(x, y + R() * (rh - sz), sz, sz);
      }
    }
    const tw = Math.min(w * 0.3, h * 0.9), tx = Math.max(w * 0.04, w * 0.33 - tw / 2), ty = top + rh * 3, thh = Math.min(rh * 11, tw * 0.42);
    c.fillStyle = hk.p; c.fillRect(tx, ty, tw, thh);
    c.fillStyle = hk.s; for (let i = 0; i < 6; i++) c.fillRect(tx + i * tw / 6, ty, tw / 12, thh);
    c.fillStyle = U.lum(hk.p) > 0.6 ? '#1a1a2e' : '#ffffff'; c.font = `700 ${Math.round(Math.min(thh * 0.55, tw / Math.max(2, o.home.short.length) * 1.1))}px Oswald, Nunito, Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText(o.home.short, tx + tw / 2, ty + thh / 2);
    const cols = ['#d9b23a', '#1d4fa3', '#2e9e57', hk.p, '#c8414a', '#d8dce6'];
    for (let x = 0, i = 0; x < w; x += 70, i++) { c.fillStyle = cols[i % 6]; c.fillRect(x, h * 0.9, 66, h * 0.07); }
    crowdCv = L.cv;
  };
  const flames = [], flashes = [];
  let flameAcc = 0, flameN = 0;
  // nehybná časť štadióna (tribúny, trávnik, reflektory) sa nakreslí raz vo vyššom rozlíšení – kamera do nej zoomuje
  const paintStill = () => {
    if (!crowdCv) buildCrowd();
    const sh = Math.round(H * 0.52), pY = H * 0.5;
    ctx.fillStyle = '#030408'; ctx.fillRect(0, 0, W, H);
    ctx.drawImage(crowdCv, 0, 0, W, sh);
    let g = ctx.createLinearGradient(0, pY, 0, H); g.addColorStop(0, '#2f6e22'); g.addColorStop(1, '#4b9a37');
    ctx.fillStyle = g; ctx.fillRect(0, pY, W, H - pY);
    ctx.fillStyle = 'rgba(255,255,255,.04)';
    for (let k = 0; k < 10; k += 2) {
      const y1 = pY + (H - pY) * Math.pow(k / 10, 1.5), y2 = pY + (H - pY) * Math.pow((k + 1) / 10, 1.5);
      ctx.fillRect(0, y1, W, y2 - y1);
    }
    ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, pY + 6); ctx.lineTo(W, pY + 6); ctx.moveTo(W / 2, pY + 6); ctx.lineTo(W / 2, H); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(W / 2, H * 0.8, W * 0.17, H * 0.07, 0, 0, Math.PI * 2); ctx.stroke();
    for (const lx of [W * 0.07, W * 0.93]) {
      g = ctx.createRadialGradient(lx, H * 0.05, 0, lx, H * 0.05, H * 0.16); g.addColorStop(0, 'rgba(255,250,222,.95)'); g.addColorStop(1, 'rgba(255,250,222,0)');
      ctx.fillStyle = g; ctx.fillRect(lx - H * 0.16, 0, H * 0.32, H * 0.22);
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      g = ctx.createLinearGradient(lx, 0, W / 2, H * 0.8); g.addColorStop(0, 'rgba(255,248,210,.12)'); g.addColorStop(1, 'rgba(255,248,210,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(lx - 10, H * 0.05); ctx.lineTo(lx + 10, H * 0.05); ctx.lineTo(W / 2 + (lx < W / 2 ? 80 : -80), H); ctx.lineTo(W / 2 + (lx < W / 2 ? -260 : 260), H); ctx.closePath(); ctx.fill();
      // vodorovný záblesk reflektora
      g = ctx.createLinearGradient(lx - W * 0.3, 0, lx + W * 0.3, 0); g.addColorStop(0, 'rgba(160,210,255,0)'); g.addColorStop(0.5, 'rgba(190,225,255,.5)'); g.addColorStop(1, 'rgba(160,210,255,0)');
      ctx.fillStyle = g; ctx.fillRect(lx - W * 0.3, H * 0.05 - 1, W * 0.6, 2);
      ctx.restore();
    }
  };
  const ensureView = () => { if (!view) { view = mkC(W, H, Math.min(2, dpr * 1.15)); into(view, paintStill); } };
  const drawStadium = s => {
    ensureView();
    const pY = H * 0.5;
    ctx.drawImage(view.cv, 0, 0, W, H);
    // blesky fotoaparátov v hľadisku
    if (Math.random() < 60 * DT) for (let i = 0; i < 3; i++) flashes.push({ x: Math.random() * W, y: H * 0.08 + Math.random() * H * 0.36, t: 0 });
    ctx.fillStyle = '#ffffff';
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i]; f.t += DT;
      if (f.t > 0.1) { flashes.splice(i, 1); continue; }
      ctx.globalAlpha = 1 - f.t / 0.1; ctx.fillRect(f.x - 1.5, f.y - 1.5, 3, 3);
    }
    ctx.globalAlpha = 1;
    let g;
    // pohyblivé svetelné kužele nad ihriskom
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 2; i++) {
      const ox = i ? W * 0.84 : W * 0.16, ang = Math.PI / 2 + (i ? 1 : -1) * (0.35 + Math.sin(s * 1.1 + i * 1.7) * 0.3), len = H * 1.2;
      g = ctx.createLinearGradient(ox, 0, ox + Math.cos(ang) * len, Math.sin(ang) * len); g.addColorStop(0, 'rgba(220,235,255,.13)'); g.addColorStop(1, 'rgba(220,235,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(ox, 0); ctx.lineTo(ox + Math.cos(ang - 0.06) * len, Math.sin(ang - 0.06) * len); ctx.lineTo(ox + Math.cos(ang + 0.06) * len, Math.sin(ang + 0.06) * len); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    // ohňové stĺpy pri mantineli (počet častíc nezávisí od fps)
    if (s > 0.35 && s < 1.9) for (flameAcc += DT * 160; flameAcc >= 1; flameAcc--) {
      const jx = [0.1, 0.3, 0.7, 0.9][flameN++ % 4];
      flames.push({ x: W * jx + (Math.random() - 0.5) * 10, y: pY, vx: (Math.random() - 0.5) * 30, vy: -(H * 0.5 + Math.random() * H * 0.35), t: 0, life: 0.55 + Math.random() * 0.35 });
    }
    if (!flameS) flameS = [['255,244,200', '255,170,60'], ['255,150,50', '200,40,10']].map(([a, b]) => {
      const L = mkC(64, 64, 1), x = L.ctx, g2 = x.createRadialGradient(32, 32, 0, 32, 32, 32);
      g2.addColorStop(0, `rgba(${a},1)`); g2.addColorStop(0.35, `rgba(${b},.55)`); g2.addColorStop(1, `rgba(${b},0)`);
      x.fillStyle = g2; x.fillRect(0, 0, 64, 64); return L.cv;
    });
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = flames.length - 1; i >= 0; i--) {
      const f = flames[i]; f.t += DT;
      if (f.t > f.life) { flames.splice(i, 1); continue; }
      f.x += f.vx * DT; f.y += f.vy * DT; f.vy *= Math.pow(0.97, DT * 60);
      const k = f.t / f.life, r = 14 + 30 * (1 - k) + 16 * k;
      ctx.globalAlpha = 0.9 * (1 - k); ctx.drawImage(flameS[k < 0.45 ? 0 : 1], f.x - r, f.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1; ctx.restore();
    // tímy vychádzajú spod kamery (z tunela) v dvoch zástupoch a zoradia sa
    const narrow = W < 640, u = narrow ? Math.min(H * 0.045, W * 0.045) : Math.min(H * 0.052, W * 0.036 / 0.95);
    const figs = [];
    for (let side = 0; side < 2; side++) {
      const ps = teams[side], n = Math.max(1, ps.length);
      ps.forEach((pl, i) => {
        const row = narrow ? i % 2 : 0, col = narrow ? Math.floor(i / 2) : i, cols = narrow ? Math.ceil(n / 2) : n;
        const fy = H * 0.86 - row * u * 2.3;
        const tx = side ? W * (0.57 + 0.38 * (col / Math.max(1, cols - 1))) : W * (0.43 - 0.38 * (col / Math.max(1, cols - 1)));
        const k = U.clamp((s - i * 0.11) / 1.5, 0, 1), e = 1 - Math.pow(1 - k, 3), ex = easeIO(k);
        const sx = W / 2 + (side ? 1 : -1) * W * 0.07, sy = H * 1.08 + i * u * 0.5;
        const x = sx + (tx - sx) * ex, y = sy + (fy - sy) * e;
        if (y > H + u * 2.2) return;
        figs.push({ x, y, uu: u * (1 + 0.55 * (1 - e)), pl, kit: i === 0 ? GKK[side] : kits[side], k, i });
      });
    }
    figs.sort((a, b) => a.y - b.y);
    for (const f of figs) drawFigure(ctx, f.x, f.y, f.uu, f.kit, playerLook(f.pl), { face: 1, back: f.k < 0.86, moving: f.k < 1, phase: s * 10 + f.i, num: f.pl.num || '' });
  };
  // kamera celku: začína nízko pri tuneli, pomaly sa dvíha a odďaľuje
  const drawWide = s => {
    const k = easeIO(U.clamp(s / (T2 - T1 + 0.6), 0, 1)), z = 1.34 - 0.34 * k, fy = H * (0.82 - 0.27 * k);
    ctx.save(); ctx.translate(W / 2 + (1 - k) * W * 0.03, fy); ctx.scale(z, z); ctx.translate(-W / 2, -fy);
    drawStadium(s); ctx.restore();
  };

  // ── záber 3: detail trofeje (alebo erbov pri derby)
  const sz = Math.min(H * 0.38, W * 0.6), pedY = H * 0.565, pw = sz * 0.62;
  const raster = (img, size, blur) => { const L = mkC(size, size); if (blur) L.ctx.filter = `blur(${blur}px)`; L.ctx.drawImage(img, 0, 0, size, size); return L.cv; };
  const gl = { L: null };
  const glint = (src, size, ph) => {
    if (!gl.L || gl.L.w !== size) gl.L = mkC(size, size);
    const x = gl.L.ctx;
    x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, size, size); x.drawImage(src, 0, 0, size, size);
    x.globalCompositeOperation = 'source-atop';
    const bx = ((ph % 3) / 3) * size * 2.2 - size * 0.6;
    const g = x.createLinearGradient(bx - size * 0.22, 0, bx + size * 0.22, size * 0.55);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return gl.L.cv;
  };
  const buildCloseBg = () => {
    if (!crowdCv) buildCrowd();
    closeBg = mkC(W, H);
    const c = closeBg.ctx;
    c.fillStyle = '#030408'; c.fillRect(0, 0, W, H);
    // rozmazané hľadisko – rozmazáva sa v štvrtinovom rozlíšení, potom roztiahne
    const sm = mkC(W + 60, H * 0.8, 0.25);
    sm.ctx.filter = 'blur(2.5px) brightness(.45) saturate(1.15)'; sm.ctx.drawImage(crowdCv, 0, 0, W + 60, H * 0.8);
    c.drawImage(sm.cv, -30, -20, W + 60, H * 0.8);
    let g = c.createLinearGradient(0, H * 0.6, 0, H); g.addColorStop(0, '#173a14'); g.addColorStop(1, '#060c05');
    c.fillStyle = g; c.fillRect(0, H * 0.6, W, H * 0.4);
    // svetelný kužeľ, podstavec a žiara pod trofejou sa nehýbu – patria do pozadia
    c.save(); c.globalCompositeOperation = 'lighter';
    g = c.createLinearGradient(0, 0, 0, pedY); g.addColorStop(0, 'rgba(255,244,212,.22)'); g.addColorStop(1, 'rgba(255,244,212,.02)');
    c.fillStyle = g; c.beginPath(); c.moveTo(W / 2 - W * 0.03, 0); c.lineTo(W / 2 + W * 0.03, 0); c.lineTo(W / 2 + pw * 1.25, pedY); c.lineTo(W / 2 - pw * 1.25, pedY); c.closePath(); c.fill();
    c.restore();
    if (trophy) {
      g = c.createLinearGradient(W / 2 - pw, 0, W / 2 + pw, 0); g.addColorStop(0, '#07080f'); g.addColorStop(0.5, '#262a3d'); g.addColorStop(1, '#07080f');
      c.fillStyle = g; c.fillRect(W / 2 - pw, pedY, pw * 2, H - pedY);
      c.fillStyle = '#323850'; c.beginPath(); c.ellipse(W / 2, pedY, pw, pw * 0.11, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(226,194,122,.7)'; c.lineWidth = 1.4; c.stroke();
    }
    g = c.createRadialGradient(W / 2, pedY, 0, W / 2, pedY, pw * 1.1); g.addColorStop(0, 'rgba(255,214,130,.35)'); g.addColorStop(1, 'rgba(255,214,130,0)');
    c.fillStyle = g; c.fillRect(W / 2 - pw * 1.2, pedY - pw * 0.5, pw * 2.4, pw);
  };
  const drawClose = s => {
    if (!closeBg) buildCloseBg();
    // pomalý nájazd kamery
    const push = 1 + 0.035 * s;
    ctx.save(); ctx.translate(W / 2, pedY); ctx.scale(1 + 0.015 * s, 1 + 0.015 * s); ctx.translate(-W / 2, -pedY);
    ctx.drawImage(closeBg.cv, 0, 0, W, H);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (const b of bokeh) {
      const x = ((((b.x + b.v * s) % 1) + 1) % 1) * W, y = b.y * H;
      ctx.globalAlpha = b.a; ctx.fillStyle = b.c; ctx.beginPath(); ctx.arc(x, y, b.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
    let g;
    // zaostrenie: trofej sa z rozmazania zaostrí
    const focus = easeIO(U.clamp((s - 0.1) / 0.7, 0, 1));
    if (trophy && imgOk(trophy)) {
      if (!troS) { troS = raster(trophy, Math.ceil(sz * 1.2)); troB = raster(trophy, Math.ceil(sz * 1.2), 9); }
      const ts = sz * push, x = W / 2 - ts / 2, y = pedY - ts * 0.97;
      if (focus < 1) { ctx.globalAlpha = 1 - focus; ctx.drawImage(troB, x, y, ts, ts); }
      ctx.globalAlpha = focus; ctx.drawImage(glint(troS, Math.ceil(sz * 1.2), s), x, y, ts, ts); ctx.globalAlpha = 1;
    } else if (crests && imgOk(crests[0]) && imgOk(crests[1])) {
      const cs0 = Math.min(H * 0.28, W * 0.28);
      if (!crestS) crestS = crests.map(im => raster(im, Math.ceil(cs0 * 1.2)));
      const cs = cs0 * push, k = easeIO(U.clamp(s / 0.9, 0, 1));
      for (let i = 0; i < 2; i++) {
        const dir = i ? 1 : -1, x = W / 2 + dir * (cs * 0.72 + (1 - k) * W * 0.22), y = pedY - cs * 0.62;
        g = ctx.createRadialGradient(x, y, 0, x, y, cs * 0.9); g.addColorStop(0, U.shade(kits[i].p, 0.1)); g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35; ctx.fillStyle = g; ctx.fillRect(x - cs, y - cs, cs * 2, cs * 2); ctx.restore();
        ctx.globalAlpha = k; ctx.drawImage(glint(crestS[i], Math.ceil(cs0 * 1.2), s + i * 1.5), x - cs / 2, y - cs / 2, cs, cs); ctx.globalAlpha = 1;
      }
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      g = ctx.createLinearGradient(W / 2, pedY - cs * 1.4, W / 2, pedY); g.addColorStop(0, 'rgba(255,170,90,0)'); g.addColorStop(0.5, `rgba(255,190,110,${0.5 * k})`); g.addColorStop(1, 'rgba(255,170,90,0)');
      ctx.fillStyle = g; ctx.fillRect(W / 2 - 1.5, pedY - cs * 1.4, 3, cs * 1.4); ctx.restore();
    }
    ctx.restore();
  };

  let t0 = 0, last = 0, lastStep = 0, resized = false, slow = 0;
  const onResize = () => { resized = true; };
  addEventListener('resize', onResize);
  const XF1 = low ? 0.2 : 0.8, XF2 = low ? 0.2 : 0.7;
  const A1 = T1 - XF1 / 2, B1 = T1 + XF1 / 2, A2 = T2 - XF2 / 2, B2 = T2 + XF2 / 2;
  const blend = (img, a, sc = 1, ox = W / 2, oy = H / 2, c = main) => { c.globalAlpha = a; c.drawImage(img, ox - (W * sc) / 2, oy - (H * sc) / 2, W * sc, H * sc); c.globalAlpha = 1; };
  // rýchlostné rozmazanie pri výbehu z tunela: obraz sa 3× zmiešava so zväčšenou kópiou (8 vzoriek) v nízkom rozlíšení
  const zoomBlur = amt => {
    if (amt <= 0.01 || low) return;
    let A = zbA, B = zbB;
    A.ctx.globalAlpha = 1; A.ctx.drawImage(cv, 0, 0, W, H);
    for (let p = 0; p < 3; p++) {
      B.ctx.globalAlpha = 1; B.ctx.drawImage(A.cv, 0, 0, W, H);
      blend(A.cv, 0.5, 1 + 0.045 * amt * (1 << p), W / 2, H * 0.47, B.ctx);
      [A, B] = [B, A];
    }
    blend(A.cv, Math.min(1, amt * 1.15));
  };
  // jemná žiara svetiel (halation) – zmenšený a rozmazaný obraz cez „screen“
  let glowA = -1, flashA = 0;
  const setFlash = a => { a = Math.round(a * 100) / 100; if (a !== flashA) { flashA = a; flash.style.opacity = a; } };
  const glow = a => {
    if (low) return;
    bctx.drawImage(cv, 0, 0, bloom.width, bloom.height);
    if (a !== glowA) { glowA = a; bloom.style.opacity = a; }
  };
  const render = t => {
    if (t < A1) {
      drawTunnel(t, () => zoomBlur(U.clamp((t - (T1 - 1.15)) / 0.75, 0, 1)));
      glow(0.34);
    } else if (t < B1) {
      const k = easeIO((t - A1) / XF1);
      drawTunnel(t, k < 0.6 ? () => zoomBlur(1 - k) : null, U.clamp(1 - k * 1.6, 0, 1));
      blend(into(layer, () => drawWide(t - A1)), k);
      setFlash(Math.sin(Math.PI * k) * 0.24);
      glow(0.34);
    } else if (t < A2) { setFlash(0); drawWide(t - A1); glow(0.3); }
    else if (t < B2) {
      drawWide(t - A1);
      blend(into(layer, () => drawClose(t - A2)), easeIO((t - A2) / XF2));
      glow(0.32);
    } else { drawClose(t - A2); glow(0.36); }
  };
  const frame = now => {
    if (!cv.isConnected) { removeEventListener('resize', onResize); sprites.clear(); return; }
    if (resized) { resized = false; fit(); }
    DT = Math.min(0.05, Math.max(0.001, (now - last) / 1000)); last = now;
    const t = (now - t0) / 1000;
    // keď snímky trvajú dlhšie ako ~22 ms, zníži sa rozlíšenie (max. 3×), aby animácia ostala plynulá
    slow = DT > 0.022 ? slow + 1 : Math.max(0, slow - 1);
    if (slow > 12 && q > 0.6) { q *= 0.8; slow = 0; scaleTo(); }
    const r0 = performance.now();
    render(t);
    if (warmQ.length && t < A1) for (let n = 0; n < 4 && warmQ.length && performance.now() - r0 < 9; n++) { const w = warmQ.pop(); sprite(w.pl, w.kit, warmQ.length % NPH, 0); }
    if (!troS && t > A1 && trophy && imgOk(trophy)) { troS = raster(trophy, Math.ceil(sz * 1.2)); troB = raster(trophy, Math.ceil(sz * 1.2), 9); }
    if (t < A1 && t - lastStep > 0.36) { lastStep = t; SFX.noise(0.05, 220, 1.2, 0.035, 0.004); }
    requestAnimationFrame(frame);
  };
  // ťažké vrstvy (štadión, rozmazané pozadie detailu) sa pripravia ešte pred prvou snímkou
  ensureView(); buildCloseBg();
  t0 = last = performance.now();
  requestAnimationFrame(frame);
  return { T1, T2, render };
}

// filmové zvuky
SFX.whoosh = function () {
  if (!this.ctx || !this.on()) return;
  const c = this.ctx, src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(), t = c.currentTime;
  src.buffer = this.noiseBuf; src.loop = true; f.type = 'bandpass'; f.Q.value = 1.1;
  f.frequency.setValueAtTime(260, t); f.frequency.exponentialRampToValueAtTime(3200, t + 0.38);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22, t + 0.28); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
  src.connect(f); f.connect(g); g.connect(c.destination); src.start(t); src.stop(t + 0.55);
};
SFX.pad = function (big) {
  if (!this.ctx || !this.on()) return;
  const c = this.ctx, t = c.currentTime;
  for (const f0 of big ? [130.81, 196, 261.63, 329.63, 392] : [146.83, 220, 293.66, 369.99]) {
    const o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
    o.type = 'triangle'; o.frequency.value = f0; lp.type = 'lowpass'; lp.frequency.value = 1300;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.032, t + 0.9); g.gain.setValueAtTime(0.032, t + 2.2); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
    o.connect(lp); lp.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 3.9);
  }
};

// o = { kind, final, comp, round, home, away, venue, extra, trophy, onDone }
function matchCinema(o) {
  const el = document.createElement('div');
  el.className = `cine k-${o.kind} ${o.final ? 'final' : ''}`;
  const gr = CINE_GRADE[o.kind] || CINE_GRADE.cup;
  el.innerHTML = `<canvas class="cine-cv"></canvas><canvas class="cin-fx"></canvas>
<div class="cine-post cine-grade" style="background:linear-gradient(180deg, ${gr[0]}, ${gr[1]})"></div><div class="cine-post cine-vig"></div><div class="cine-post cine-grain" style="background-image:url(${cineGrain()})"></div>
<div class="lb t"></div><div class="lb b"></div>
<div class="cine-cap"><small>${U.esc(o.comp)}</small><b>${U.esc(o.round)}</b></div>
<div class="cine-title">
  <div class="ct-comp"><i></i><span>${U.esc(o.comp)}</span><i></i></div>
  <div class="ct-round">${U.esc(o.round)} · ${seasonLabel()}</div>
  <div class="ct-vs"><div class="ct-t">${crestSVG(o.home, 56)}<b>${U.esc(o.home.name)}</b></div><em>vs</em><div class="ct-t r"><b>${U.esc(o.away.name)}</b>${crestSVG(o.away, 56)}</div></div>
  <div class="ct-venue">${U.esc(o.venue)}${o.extra ? ' · ' + U.esc(o.extra) : ''}</div>
</div>
<div class="cine-skip">Preskočiť ›</div>`;
  document.body.appendChild(el);
  document.body.classList.add('fx-open');
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
  SFX.init(); SFX.startCrowd(); SFX.noise(3, 70, 0.7, 0.14, 0.8);
  const sc = introScene(el.querySelector('.cine-cv'), o);
  const T1 = sc.T1 * 1000, T2 = sc.T2 * 1000, END = T2 + (o.final ? 3900 : 3200);
  const timers = [
    setTimeout(() => { el.classList.add('wide'); SFX.cheer(); }, T1),
    setTimeout(() => SFX.whoosh(), T2 - 300),
    setTimeout(() => {
      el.classList.add('close'); SFX.boom(); SFX.pad(o.final);
      if (o.final) { const fx = fxRun(el.querySelector('.cin-fx'), { colors: ['#ffe2a0', '#ffffff', '#ffc66e'], fireworks: 0.9, fwDelay: 0.6 }); setTimeout(() => fx.confetti(90), 500); }
    }, T2),
    setTimeout(() => close(), END),
  ];
  function close() { timers.forEach(clearTimeout); SFX.stopCrowd(); overlayClose(el, o.onDone); }
  el.addEventListener('click', close);
  el.onKey = e => { if (['Escape', 'Enter', ' '].includes(e.key)) { e.preventDefault(); close(); } };
  document.addEventListener('keydown', el.onKey);
  return el;
}

function cupIntro(c, r, home, away, onDone) {
  const rn = c.id === 'sup' ? 'Zápas o trofej' : cupRoundName(c, r);
  const final = rn === 'Finále' || c.id === 'sup';
  const m = cupUserMatch(c, r);
  return matchCinema({
    kind: c.kind, final, comp: c.name, round: final && c.id !== 'sup' ? 'Finále' : rn, home, away,
    venue: m && m.neutral ? 'Národný štadión, Bratislava' : (home.stadium || home.city || ''),
    extra: c.id === 'cls' ? `prémia ${U.money(cupPrize(c, r))}` : '', trophy: trophySVG(c.kind, 240), onDone,
  });
}

// ── Oslava trofeje / postupu ───────────────────────────────────
// items: [{ kind, title, name, sub }]
function celebrate(items, onDone) {
  if (!items.length) { if (onDone) onDone(); return; }
  const it = items[0], u = userTeam();
  const th = CIN_THEME[it.kind] || CIN_THEME.league;
  const colors = [u.kit.p, u.kit.s === '#ffffff' && u.kit.p === '#ffffff' ? '#ffd23f' : u.kit.s, ...th.colors];
  const icon = it.kind === 'promo'
    ? `<svg class="promo-arrow" width="200" height="200" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="pg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7dffb0"/><stop offset="1" stop-color="#16a35a"/></linearGradient></defs><path d="M32 4l22 24H41v28H23V28H10z" fill="url(#pg)" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/><path d="M26 30h4v22h-4z" fill="#fff" opacity=".35"/></svg>`
    : trophySVG(it.kind, 220);
  const el = document.createElement('div');
  el.className = `cel cel-${it.kind}`;
  el.innerHTML = `<canvas class="cel-fx"></canvas><div class="cin-rays"></div><div class="cel-spot"></div>
<div class="cel-stage">
  <div class="cel-title">${letters(it.title, 'l', 0.15, 0.06)}</div>
  <div class="cel-trophy"><div class="cel-shine"></div>${icon}</div>
  <div class="cel-club">${crestSVG(u, 60)}<b>${U.esc(u.name)}</b></div>
  <div class="cel-name">${U.esc(it.name)}</div>
  <div class="cel-sub">${U.esc(it.sub || '')}</div>
  <button class="btn btn-go big cel-btn">${items.length > 1 ? 'ĎALEJ ▶' : 'POKRAČOVAŤ ▶'}</button>
</div>`;
  document.body.appendChild(el);
  document.body.classList.add('fx-open');
  const fx = fxRun(el.querySelector('.cel-fx'), { colors, fireworks: 1.6, sparks: 30, confettiLoop: true, fwDelay: 0.9, onBoom: () => { if (U.chance(0.25)) SFX.kick(0.4); } });
  setTimeout(() => fx.confetti(reduceMotion() ? 60 : 220), 900);
  SFX.init(); SFX.fanfare(true); setTimeout(() => SFX.cheer(), 900); setTimeout(() => SFX.cheer(), 3600);
  const next = () => overlayClose(el, () => celebrate(items.slice(1), onDone));
  el.querySelector('.cel-btn').addEventListener('click', e => { e.stopPropagation(); next(); });
  el.onKey = e => { if (['Escape', 'Enter'].includes(e.key)) { e.preventDefault(); next(); } };
  document.addEventListener('keydown', el.onKey);
  return el;
}

// ── Úvod pred derby ────────────────────────────────────────────
function derbyIntro(der, home, away, onDone) {
  return matchCinema({ kind: 'derby', final: der[0] >= 3, comp: der[1], round: leagueOf(home).name, home, away, venue: home.stadium || home.city || '', extra: '', trophy: null, onDone });
}
