'use strict';
// ─── Pomocné funkcie ─────────────────────────────────────────────
const U = {
  ri(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); },
  rf(a, b) { return a + Math.random() * (b - a); },
  pick(a) { return a[Math.floor(Math.random() * a.length)]; },
  shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  },
  chance(p) { return Math.random() < p; },
  gauss() {
    let u = 0, v = 0;
    while (!u) u = Math.random();
    while (!v) v = Math.random();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  },
  clamp(v, a, b) { return v < a ? a : v > b ? b : v; },
  lerp(a, b, t) { return a + (b - a) * t; },
  hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  },
  poisson(l) {
    const L = Math.exp(-l);
    let k = 0, p = 1;
    do { k++; p *= Math.random(); } while (p > L);
    return k - 1;
  },
  weighted(items, wfn) {
    let tot = 0;
    const ws = items.map(it => { const w = Math.max(0, wfn(it)); tot += w; return w; });
    if (tot <= 0) return items[Math.floor(Math.random() * items.length)];
    let r = Math.random() * tot;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  },
  avg(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; },
  money(v) {
    const neg = v < 0; v = Math.abs(v);
    let s;
    if (v >= 1e6) s = (v / 1e6).toFixed(v >= 1e7 ? 1 : 2).replace(/\.?0+$/, '').replace('.', ',') + ' mil. €';
    else if (v >= 1e4) s = Math.round(v / 1e3) + ' tis. €';
    else if (v >= 1e3) s = (Math.round(v / 100) / 10).toString().replace('.', ',') + ' tis. €';
    else s = Math.round(v) + ' €';
    return (neg ? '−' : '') + s;
  },
  esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); },
  plain(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); },
  nice(v) { // zaokrúhli na 2 platné číslice
    if (v < 100) return Math.round(v);
    const m = Math.pow(10, Math.floor(Math.log10(v)) - 1);
    return Math.round(v / m) * m;
  },
  hexToRgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  },
  lum(h) { const [r, g, b] = U.hexToRgb(h); return (0.299 * r + 0.587 * g + 0.114 * b) / 255; },
  colorDist(a, b) {
    const x = U.hexToRgb(a), y = U.hexToRgb(b);
    return Math.sqrt((x[0] - y[0]) ** 2 + (x[1] - y[1]) ** 2 + (x[2] - y[2]) ** 2);
  },
  shade(h, f) { // f < 0 stmaví, f > 0 zosvetlí
    const [r, g, b] = U.hexToRgb(h);
    const t = f < 0 ? 0 : 255, p = Math.abs(f);
    const c = x => Math.round((t - x) * p + x);
    return '#' + [c(r), c(g), c(b)].map(x => x.toString(16).padStart(2, '0')).join('');
  },
};

// Globálny stav kariéry
let G = null;

const POS_ORDER = { GK: 0, DF: 1, MF: 2, FW: 3 };

// ─── Hráči ───────────────────────────────────────────────────────
function newPlayer(o) {
  const p = {
    id: G.players.length, fn: o.fn, ln: o.ln, nat: o.nat || 'SVK', pos: o.pos, r: o.r, pot: o.pot || o.r,
    age: o.age, tid: o.tid, fit: 100, num: 0, s: { gp: 0, g: 0, a: 0 }, c: { gp: 0, g: 0, a: 0 }, real: !!o.real,
  };
  G.players.push(p);
  assignAttrs(p);
  ensureProfile(p);
  initAgg(p);
  initXp(p, p.tid >= 0 && G.teams[p.tid] ? G.teams[p.tid].lvl : 9);
  initContract(p, p.tid >= 0 && G.teams[p.tid] ? G.teams[p.tid].lvl : 9);
  return p;
}

function genName(hu) {
  if (hu) return { fn: U.pick(FIRST_NAMES_HU), ln: U.pick(SURNAMES_HU) };
  return { fn: U.pick(FIRST_NAMES), ln: U.pick(SURNAMES) };
}

// Potenciál = najvyššia sila, ktorú hráč dosiahne. Odvíja sa od úrovne klubu (ctx), klenoty sú vzácne.
function softPot(v) { return Math.round(v > 74 ? 74 + (v - 74) * 0.5 : v); }
function rollPotential(age, r, ctx, boost = 0) {
  if (ctx == null) ctx = r;
  const x = Math.random();
  let pot;
  if (age <= 21) {
    const span = age <= 18 ? 1 : age <= 20 ? 0.8 : 0.6;
    const pGen = 0.01 + 0.004 * boost, pGem = 0.03 + 0.01 * boost, pBig = 0.11 + 0.02 * boost, pTal = 0.3 + 0.03 * boost;
    let off;
    if (x < pGen) off = U.ri(28, 38);
    else if (x < pGen + pGem) off = U.ri(18, 28);
    else if (x < pGen + pGem + pBig) off = U.ri(10, 18);
    else if (x < pGen + pGem + pBig + pTal) off = U.ri(4, 10);
    else off = U.ri(-4, 4);
    pot = Math.max(r + U.ri(0, 2), ctx + off * span);
  } else if (age <= 24) pot = r + (x < 0.08 ? U.ri(4, 9) : x < 0.5 ? U.ri(1, 4) : 0);
  else if (age <= 27) pot = r + (x < 0.06 ? U.ri(3, 7) : x < 0.32 ? U.ri(1, 3) : 0);
  else if (age <= 29) pot = r + (x < 0.12 ? U.ri(1, 2) : 0);
  else pot = r;
  return Math.max(r, Math.min(88, softPot(pot)));
}

function genPlayer(tid, pos, base, opts = {}) {
  const age = opts.young ? U.ri(17, 21) : U.weighted([17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35],
    a => a < 20 ? 3 : a < 23 ? 6 : a < 30 ? 8 : a < 33 ? 5 : 2);
  const ageAdj = age < 20 ? -3 : age < 23 ? -1 : age <= 30 ? 1 : age <= 33 ? 0 : -2;
  const r = Math.round(U.clamp(base + U.gauss() * 3.5 + ageAdj, 8, 92));
  const pot = rollPotential(age, r, base);
  const ft = tid >= 0 ? G.teams[tid] : null;
  const nm = ft && ft.fx ? foreignName(ft.fx) : genName(U.chance(opts.hu ? 0.35 : 0.04));
  return newPlayer({ ...nm, nat: nm.nat || 'SVK', pos, r, pot, age, tid });
}

// trhová hodnota podľa sily: do úrovne Niké ligy mierne, vyššie strmo (hviezdy stoja desiatky miliónov)
function valueCurve(r) { return 2100 * Math.pow(1.125, r - 20) * (r > 62 ? Math.pow(1.105, r - 62) : 1) * (r > 85 ? Math.pow(0.96, r - 85) : 1); }
function playerValue(p) {
  const ageF = p.age <= 20 ? 1.5 : p.age <= 23 ? 1.25 : p.age <= 27 ? 1 : p.age <= 30 ? 0.75 : p.age <= 32 ? 0.5 : 0.3;
  const gap = Math.max(0, (p.pot || p.r) - p.r);
  const potF = p.age < 27 ? 1 + gap * (p.age < 22 ? 0.035 : p.age < 25 ? 0.025 : 0.015) : 1;
  const cl = p.tid >= 0 && p.ce ? p.ce - G.year : 3;
  const ctF = cl <= 1 ? 0.6 : cl === 2 ? 0.85 : 1;
  const formF = 1 + Math.min(0.2, p.s.g * 0.015 + p.s.a * 0.008);
  const capsF = 1 + Math.min(0.25, (p.caps || 0) * 0.008 + (p.u21 || 0) * 0.003); // reprezentant má vyššiu cenu
  // forma z posledných zápasov (hodnotenia) – hráč v laufe je drahší
  const lr = p.lr && p.lr.length >= 3 ? p.lr.reduce((a, v) => a + v, 0) / p.lr.length : 65;
  const hotF = U.clamp(1 + (lr - 65) / 90, 0.88, 1.15);
  return U.nice(valueCurve(p.r) * ageF * potF * ctF * formF * capsF * hotF);
}

function pName(p) { return p.fn ? p.fn[0] + '. ' + p.ln : p.ln; }
function pFull(p) { return p.fn ? p.fn + ' ' + p.ln : p.ln; }

const DARK_NATS = new Set(['NGR', 'GHA', 'SEN', 'CIV', 'GAM', 'CMR', 'MLI', 'BFA', 'TOG', 'COD', 'SLE', 'GUI', 'CAF', 'ANG', 'CPV']);
const MIXED_NATS = new Set(['BRA', 'PAN', 'ESA', 'VEN', 'COL', 'MEX', 'ARG', 'SYR', 'ALG', 'GEO', 'ARM', 'ALB', 'ESP', 'KOS', 'GRE']);
const ASIAN_NATS = new Set(['JPN', 'KOR', 'MGL']);
const lookCache = new Map();
function playerLook(p) {
  const key = p.id + ':' + p.ln;
  let lk = lookCache.get(key);
  if (lk) return lk;
  const h = U.hash(p.fn + p.ln + p.id);
  let skin, hair;
  if (DARK_NATS.has(p.nat) || (MIXED_NATS.has(p.nat) && h % 5 === 0)) {
    skin = ['#5a3a22', '#6b4528', '#7a4e2d', '#4a2f1c'][h % 4]; hair = '#141414';
  } else if (MIXED_NATS.has(p.nat)) {
    skin = ['#c68c5a', '#a96f44', '#e0ac7e', '#d39a6a'][h % 4]; hair = ['#1a1a1a', '#2b1d12', '#3a2616'][(h >> 3) % 3];
  } else if (ASIAN_NATS.has(p.nat)) {
    skin = '#f0c8a0'; hair = '#151515';
  } else {
    skin = ['#f2c9a0', '#e8b88a', '#f6d3b0', '#dba57a'][h % 4];
    hair = ['#2b1d12', '#4a3020', '#1a1a1a', '#7a5230', '#c9a25a', '#3a2616', '#e0c07a'][(h >> 3) % 7];
  }
  lk = { skin, hair, style: (h >> 7) % 5, beard: ((h >> 10) % 6) === 0 };
  lookCache.set(key, lk);
  return lk;
}

// ─── Tímy ────────────────────────────────────────────────────────
function newTeam(o) {
  const t = {
    id: G.teams.length, key: o.key || null, name: o.name, short: o.short, city: o.city, reg: o.reg, lvl: o.lvl,
    kit: { p: o.kit[0], s: o.kit[1], sh: o.kit[2], pat: o.kit[3] || 'plain' },
    budget: o.budget, stadium: o.stadium, parent: o.parent ?? null, pids: [], form: o.form || '4-4-2', ment: 1, press: 1,
    lineup: [], lid: -1, real: !!o.real,
  };
  G.teams.push(t);
  return t;
}

function teamPlayers(t) { return t.pids.map(id => G.players[id]).filter(Boolean); }

function sortSquad(ps) {
  return ps.sort((a, b) => POS_ORDER[a.pos] - POS_ORDER[b.pos] || b.r - a.r);
}

function assignNumbers(t) {
  const used = new Set();
  const prefer = { GK: [1, 12, 30, 31, 33], DF: [2, 3, 4, 5, 6, 13, 15, 16, 22, 23, 24, 25, 26], MF: [8, 10, 7, 14, 17, 18, 20, 21, 19, 27, 28], FW: [9, 11, 19, 29, 77, 99, 90, 18, 70] };
  for (const p of sortSquad(teamPlayers(t))) {
    if (p.num && !used.has(p.num)) { used.add(p.num); continue; }
    let n = prefer[p.pos].find(x => !used.has(x));
    if (!n) { n = 2; while (used.has(n)) n++; }
    p.num = n; used.add(n);
  }
}

function posFactor(pp, sp) {
  if (pp === sp) return 1;
  if (pp === 'GK' || sp === 'GK') return 0.35;
  return Math.abs(POS_ORDER[pp] - POS_ORDER[sp]) === 1 ? 0.86 : 0.7;
}
// vedľajší post = len malá strata sily
function posFit(p, sp, slot) {
  // presný post (stopér, krídlo…) – keď poznáme miesto v zostave
  if (slot && slot[0] === sp) return dpFit(p, slotDP(slot));
  if (!sp || p.pos === sp) return 1;
  if (p.pos2 && p.pos2.includes(sp)) return 0.94;
  return posFactor(p.pos, sp);
}
// skúsenosti z ihriska (0 – 100): nováčik hrá o 6 % slabšie, ostrieľaný hráč o 2 % lepšie
function initXp(p, lvl, games = 0) {
  p.xp = U.clamp(Math.round((p.age - 17) * 4.2 + (9 - lvl) * 1.5 + games * 0.5 + U.gauss() * 5), 0, 95);
}
function xpFactor(p) { return 0.94 + 0.08 * Math.min(1, (p.xp ?? 40) / 75); }
function effR(p, sp, slot) { return p.r * posFit(p, sp || p.pos, slot) * (0.7 + 0.3 * p.fit / 100) * xpFactor(p); }
// hráči k dispozícii pre zápas (bez hráčov v akadémii, s trestom a zranených)
function availPlayers(t) { return teamPlayers(t).filter(p => !(p.acad && p.tid === G.userTid) && !(p.ban > 0) && !injured(p)); }

// ── Auto zostava: každý post podľa toho, čo vyžaduje (krídlo = rýchlosť, stopér = obrana a fyzička…) ──
const ROLE_W = { // váhy atribútov [RÝC, STR, PRI, TEC, OBR, FYZ]
  DFc: [0.15, 0, 0.1, 0.05, 0.4, 0.3], DFw: [0.3, 0, 0.2, 0.15, 0.25, 0.1],
  MFc: [0.1, 0.1, 0.35, 0.25, 0.1, 0.1], MFd: [0.05, 0.05, 0.3, 0.1, 0.3, 0.2], MFa: [0.1, 0.25, 0.3, 0.3, 0, 0.05], MFw: [0.3, 0.1, 0.2, 0.3, 0.05, 0.05],
  FWc: [0.15, 0.45, 0.05, 0.15, 0, 0.2], FWw: [0.35, 0.25, 0.1, 0.25, 0, 0.05],
};
function slotRole(slot) { const d = slotDP(slot); return d === 'B' ? 'GK' : DP_ROLE[d]; }
function slotKey(slot) { return slotDP(slot); }
function slotScore(p, slot) {
  const pos = slot[0];
  let v = effR(p, pos, slot);
  if (pos === 'GK' || p.pos === 'GK') return v;
  const w = ROLE_W[slotRole(slot)], a = playerAttrs(p);
  const fitR = w.reduce((s, x, i) => s + x * a[i], 0) / Math.max(1, p.r);
  v *= 0.86 + 0.14 * U.clamp(fitR, 0.8, 1.25);
  // krídla: silnejšia noha na svojej strane
  const fy = slot[2];
  if (fy < 0.3 || fy > 0.7) {
    const ft = p.ft || 'R', ok = ft === 'B' || (fy < 0.5 ? ft === 'L' : ft === 'R');
    v *= ok ? 1.02 : 0.985 + 0.003 * (p.wf || 3);
  }
  return v;
}
// Najlepšia zostava pre formáciu: hladný výber + vylepšovanie výmenami
function bestLineup(t, form) {
  const slots = FORMATIONS[form || t.form];
  const ps = availPlayers(t);
  if (!ps.length) return new Array(11).fill(-1);
  const cache = {};
  const sc = slots.map(sl => { const k = slotKey(sl); return cache[k] || (cache[k] = ps.map(p => slotScore(p, sl))); });
  const n = ps.length, asg = new Array(11).fill(-1), used = new Array(n).fill(false);
  const pairs = [];
  for (let i = 0; i < 11; i++) for (let j = 0; j < n; j++) pairs.push([sc[i][j], i, j]);
  pairs.sort((a, b) => b[0] - a[0]);
  for (const [, i, j] of pairs) if (asg[i] < 0 && !used[j]) { asg[i] = j; used[j] = true; }
  for (let pass = 0; pass < 6; pass++) {
    let imp = false;
    for (let i = 0; i < 11; i++) {
      if (asg[i] < 0) continue;
      for (let i2 = i + 1; i2 < 11; i2++) {
        if (asg[i2] < 0) continue;
        const d = sc[i][asg[i2]] + sc[i2][asg[i]] - sc[i][asg[i]] - sc[i2][asg[i2]];
        if (d > 0.01) { [asg[i], asg[i2]] = [asg[i2], asg[i]]; imp = true; }
      }
      for (let j = 0; j < n; j++) {
        if (used[j] || sc[i][j] <= sc[i][asg[i]] + 0.01) continue;
        used[asg[i]] = false; asg[i] = j; used[j] = true; imp = true;
      }
    }
    if (!imp) break;
  }
  return asg.map(j => (j >= 0 ? ps[j].id : -1));
}
function autoLineup(t) {
  t.lineup = bestLineup(t);
  return t.lineup;
}
// sila celej zostavy (pre porovnanie formácií)
function lineupPower(t, lineup, form) { const s = teamStrength(t, lineup, form); return (s.att + s.def) / 2; }

// Skontroluje zostavu (napr. po predaji hráča) a doplní chýbajúcich
function validateLineup(t) {
  const set = new Set(availPlayers(t).map(p => p.id));
  if (!t.lineup || t.lineup.length !== 11) return autoLineup(t);
  const seen = new Set();
  let broken = false;
  t.lineup = t.lineup.map(id => {
    if (id < 0 || !set.has(id) || seen.has(id)) { broken = true; return -1; }
    seen.add(id); return id;
  });
  if (broken) {
    const slots = FORMATIONS[t.form];
    t.lineup.forEach((id, i) => {
      if (id >= 0) return;
      let best = null, bv = -1;
      for (const p of availPlayers(t)) {
        if (seen.has(p.id)) continue;
        const v = slotScore(p, slots[i]);
        if (v > bv) { bv = v; best = p; }
      }
      if (best) { t.lineup[i] = best.id; seen.add(best.id); }
    });
  }
  return t.lineup;
}

function teamStrength(t, lineup, form) {
  lineup = lineup || t.lineup;
  const slots = FORMATIONS[form || t.form];
  let gk = 20;
  const df = [], mf = [], fw = [], all = [];
  lineup.forEach((pid, i) => {
    const p = G.players[pid];
    const sp = slots[i][0];
    const e = p ? effR(p, sp, slots[i]) : 8;
    all.push(e);
    if (sp === 'GK') gk = e; else ({ DF: df, MF: mf, FW: fw })[sp].push(e);
  });
  const A = U.avg(fw) || U.avg(mf) * 0.9, M = U.avg(mf) || U.avg(df) * 0.9, D = U.avg(df) || U.avg(mf) * 0.9;
  const lead = Math.min(3, lineup.reduce((a, id) => a + trLvl(G.players[id], 'ldr'), 0)) * 0.5;
  return {
    att: 0.5 * A + 0.38 * M + 0.12 * D + (fw.length - 2) * 1.0 + (mf.length - 4) * 0.3 + lead,
    def: 0.5 * D + 0.3 * M + 0.2 * gk + (df.length - 4) * 1.0 + lead,
    mid: M, gk, ovr: U.avg(all),
  };
}

function teamRating(t) { // celkové hodnotenie tímu (priemer najlepšej 11)
  if (!t.lineup || t.lineup.length !== 11) autoLineup(t);
  const ps = t.lineup.map(id => G.players[id]).filter(Boolean);
  return Math.round(U.avg(ps.map(p => p.r)));
}

function kitAway(t) {
  const k = t.kit;
  if (U.lum(k.p) > 0.75) return { p: U.lum(k.s) < 0.75 ? k.s : '#222244', s: '#ffffff', sh: U.lum(k.s) < 0.75 ? k.s : '#222244', pat: 'plain' };
  return { p: '#ffffff', s: k.p, sh: '#ffffff', pat: 'sleeves' };
}

// ─── Generovanie sveta ───────────────────────────────────────────
function parseSquad(text) {
  return text.trim().split('\n').map(l => l.trim()).filter(Boolean).map(l => {
    const tk = l.split(/\s+/);
    const pos = tk[0], age = +tk[tk.length - 1], r = +tk[tk.length - 2], nat = tk[tk.length - 3];
    const names = tk.slice(1, tk.length - 3);
    const fn = names.length > 1 ? names[0] : '';
    const ln = names.length > 1 ? names.slice(1).join(' ') : names[0];
    return { pos, fn, ln, nat, r, age };
  });
}

const SQUAD_MIN = { GK: 2, DF: 6, MF: 6, FW: 4 };

function fillSquad(t, base, young) {
  const ps = teamPlayers(t);
  for (const pos of ['GK', 'DF', 'MF', 'FW']) {
    let have = ps.filter(p => p.pos === pos).length;
    while (have < SQUAD_MIN[pos]) {
      const p = genPlayer(t.id, pos, base, { young, hu: t.hu });
      t.pids.push(p.id); have++;
    }
  }
}

function makeShort(town, taken) {
  const clean = U.plain(town).toUpperCase().replace(/[^A-Z\s-]/g, '');
  const words = clean.split(/[\s-]+/).filter(w => w.length > 2 && !['NAD', 'POD', 'PRI'].includes(w));
  const cands = [];
  if (words.length >= 2) cands.push(words.slice(0, 3).map(w => w[0]).join('').padEnd(3, words[0][1]));
  const w0 = words[0] || clean.replace(/\s/g, '');
  cands.push(w0.slice(0, 3));
  for (let i = 2; i < w0.length; i++) cands.push(w0[0] + w0[1] + w0[i]);
  for (let i = 1; i < w0.length; i++) for (let j = i + 1; j < w0.length; j++) cands.push(w0[0] + w0[i] + w0[j]);
  for (const c of cands) if (c.length === 3 && !taken.has(c)) { taken.add(c); return c; }
  let n = 2;
  while (taken.has(w0.slice(0, 2) + n)) n++;
  taken.add(w0.slice(0, 2) + n);
  return w0.slice(0, 2) + n;
}

function genKit() {
  const p = U.pick(KIT_COLORS);
  let s = U.pick(KIT_COLORS), guard = 0;
  while (U.colorDist(p, s) < 160 && guard++ < 30) s = U.pick(KIT_COLORS);
  return [p, s, U.chance(0.5) ? s : (U.lum(p) > 0.8 ? s : '#ffffff'), U.pick(KIT_PATTERNS)];
}

const HU_TOWNS = /Veľký Meder|Okoč|Kvetoslavov|Orechová Potôň|Vrakúň|Topoľníky|Horná Potôň|Lehnice|Kolárovo|Hurbanovo|Nesvady|Zemné|Tvrdošovce|Štúrovo|Želiezovce|Šahy|Tornaľa|Jesenské|Hajnáčka|Bušince|Kráľovský Chlmec|Čierna nad Tisou|Veľké Kapušany|Moldava nad Bodvou|Gabčíkovo|Dunajská|Komárno|Veľké Ludince|Fiľakovo|Medzev|Šamorín|Galanta|Senec|Častkovce/;

function buildWorld() {
  G = {
    v: 16, year: 2026, acadQ: [], rivals: {}, teams: [], players: [], leagues: [], userTid: -1, day: 0, calendar: [], cup: null,
    news: [], trophies: [], history: [], freeAgents: [], seasonNo: 1, seed: U.ri(1, 1e9),
    know: {}, scouts: [], scoutPool: [], scoutQueue: [], inbox: [], short: [], tlog: [], neg: {}, scouted: [],
    fin: { cur: {}, hist: [], bal: [] },
    settings: { control: 'manual', sound: true, speed: 1 },
  };
  const keyToTid = {};
  const taken = new Set();
  const FORMS = ['4-4-2', '4-4-2', '4-3-3', '4-3-3', '4-2-3-1', '4-2-3-1', '4-1-4-1', '3-5-2', '5-3-2', '4-5-1'];

  // Niké liga a 2. liga – reálne kluby
  for (const c of REAL_CLUBS) {
    const t = newTeam({ ...c, real: true, form: U.pick(FORMS) });
    t.hu = HU_TOWNS.test(c.city);
    keyToTid[c.key] = t.id;
    taken.add(c.short);
    const sq = c.squad ? parseSquad(c.squad) : [];
    const ctxB = sq.length ? Math.round(U.avg(sq.map(x => x.r))) : LEVEL_INFO[c.lvl].base;
    for (const s of sq) {
      const pot = rollPotential(s.age, s.r, ctxB);
      const p = newPlayer({ ...s, pot, tid: t.id, real: true });
      t.pids.push(p.id);
    }
    const base = c.base || (sq.length ? Math.round(U.avg(sq.map(s => s.r))) - 2 : LEVEL_INFO[c.lvl].base);
    fillSquad(t, base, c.young);
    if (!sq.length) { // celý káder generovaný
      const extra = { GK: 1, DF: 2, MF: 2, FW: 1 };
      for (const pos in extra) for (let i = 0; i < extra[pos]; i++) { const p = genPlayer(t.id, pos, base, { young: c.young, hu: t.hu }); t.pids.push(p.id); }
    }
  }
  for (const c of REAL_CLUBS) if (c.parent) G.teams[keyToTid[c.key]].parent = keyToTid[c.parent];

  const mkGroupTeams = (list, lvl, reg) => {
    const n = list.length;
    const offs = U.shuffle(list.map((_, i) => Math.round(5 - (10 * i) / Math.max(1, n - 1))));
    return list.map((c, i) => {
      const [name, short, city, parentKey] = c;
      const big = c.big;
      const t = newTeam({
        name, short, city, reg, lvl, kit: c.kit || genKit(), real: true,
        budget: U.nice(LEVEL_INFO[lvl].budget * U.rf(0.6, 1.5) * (big ? 1.5 : 1)),
        stadium: c.stadium || ((lvl <= 5 ? 'Štadión ' : 'Ihrisko ') + city), form: U.pick(FORMS),
        parent: parentKey ? keyToTid[parentKey] : null,
      });
      t.hu = HU_TOWNS.test(city);
      taken.add(short);
      const base = LEVEL_INFO[lvl].base + offs[i];
      const counts = { GK: 2, DF: 6, MF: 6, FW: 4 };
      if (U.chance(0.5)) counts.MF++;
      if (U.chance(0.3)) counts.DF++;
      for (const pos in counts) for (let k = 0; k < counts[pos]; k++) {
        const p = genPlayer(t.id, pos, base, { young: !!parentKey, hu: t.hu });
        t.pids.push(p.id);
      }
      return t;
    });
  };

  // Ligy
  const L1 = { id: 0, lvl: 1, reg: null, name: 'Niké liga', short: 'Niké liga', tids: [] };
  const L2 = { id: 1, lvl: 2, reg: null, name: '2. liga', short: '2. liga', tids: [] };
  G.leagues.push(L1, L2);
  for (const t of G.teams) (t.lvl === 1 ? L1 : L2).tids.push(t.id);

  // 3. liga – reálne kluby
  for (const reg of ['Z', 'S', 'V']) {
    const lg = { id: G.leagues.length, lvl: 3, reg, name: '3. liga ' + REGIONS[reg].name, short: '3. liga ' + REGIONS[reg].name, tids: [] };
    G.leagues.push(lg);
    lg.tids = mkGroupTeams(L3_CLUBS[reg], 3, reg).map(t => t.id);
  }

  // 4. – 9. liga – generované kluby z reálnych obcí
  const pools = {};
  for (const reg of ['Z', 'S', 'V']) pools[reg] = U.shuffle(TOWNS[reg].slice());
  for (let lvl = 4; lvl <= 9; lvl++) {
    for (const reg of ['Z', 'S', 'V']) {
      const list = [];
      if (lvl === 4) for (const x of L4_EXTRA[reg]) list.push(x);
      while (list.length < 14) {
        let town = pools[reg].pop();
        const isTown = town.startsWith('*');
        town = town.replace('*', '');
        const prefix = isTown ? U.pick(CLUB_PREFIX_TOWN) : U.pick(CLUB_PREFIX_VILLAGE);
        list.push([prefix + ' ' + town, makeShort(town, taken), town]);
      }
      const lg = { id: G.leagues.length, lvl, reg, name: lvl + '. liga ' + REGIONS[reg].name, short: lvl + '. liga ' + REGIONS[reg].name, tids: [] };
      G.leagues.push(lg);
      lg.tids = mkGroupTeams(list, lvl, reg).map(t => t.id);
    }
  }
  for (const lg of G.leagues) for (const tid of lg.tids) G.teams[tid].lid = lg.id;

  // Voľní hráči
  refreshFreeAgents();

  buildEuroTeams();
  for (const t of G.teams) assignTeamDPs(t);
  // silnejšie kluby si vyberú formáciu podľa kádra
  for (const t of G.teams) if (t.fx || t.lvl <= 3) aiPickForm(t);
  initFans();
  for (const t of G.teams) { assignNumbers(t); autoLineup(t); }
  return G;
}

function refreshFreeAgents() {
  // ponechá voľných hráčov (napr. po skončení zmluvy), starých a nadbytočných odstráni
  let fa = G.freeAgents.map(id => G.players[id]).filter(p => p && p.tid === -1);
  for (const p of fa) if (p.age >= 35) G.players[p.id] = null;
  fa = fa.filter(p => p.age < 35).sort((a, b) => b.r - a.r);
  for (const p of fa.slice(220)) G.players[p.id] = null;
  G.freeAgents = fa.slice(0, 220).map(p => p.id);
  for (let lvl = 1; lvl <= 9; lvl++) {
    const n = lvl <= 2 ? 4 : 6;
    for (let i = 0; i < n; i++) {
      const pos = U.pick(['GK', 'DF', 'DF', 'MF', 'MF', 'FW', 'FW']);
      const p = genPlayer(-1, pos, LEVEL_INFO[lvl].base - 2);
      G.freeAgents.push(p.id);
    }
  }
}

function leagueOf(t) { return t.fx ? foreignLeague(t) : G.leagues[t.lid]; }
function userTeam() { return G.teams[G.userTid]; }

function news(text, type = 'info') {
  G.news.unshift({ text, type, day: G.day, year: G.year });
  if (G.news.length > 60) G.news.length = 60;
}
