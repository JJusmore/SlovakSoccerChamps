'use strict';
// ─── Zápasový deň: taktika a štandardky, počasie a terén, rozhodcovia a VAR, cestovanie, tlačovky, analýza súpera ───

// ── Taktické pokyny ────────────────────────────────────────────
const TAC_S = ['Držanie lopty', 'Vyvážený', 'Priame lopty', 'Protiútoky'];
const TAC_W = ['Úzka', 'Normálna', 'Široká'];
const TAC_B = ['Hlboká', 'Stredná', 'Vysoká'];
function tacOf(t) { return t.tac || (t.tac = { s: 1, w: 1, b: 1 }); }
// profil zostavy: silní útočníci do vzduchu, rýchle krídla
function tacProfile(t) {
  if (t._tp && t._tp.d === G.day && t._tp.y === G.year) return t._tp;
  const xi = (t.lineup || []).map(id => G.players[id]).filter(Boolean);
  const fw = xi.filter(p => p.pos === 'FW'), att = xi.filter(p => p.pos !== 'GK' && p.pos !== 'DF');
  const phys = fw.some(p => trLvl(p, 'hdr') >= 2) || (fw.length && U.avg(fw.map(p => playerAttrs(p)[5])) >= 66);
  const pace = att.length && U.avg(att.map(p => playerAttrs(p)[0])) >= 66;
  return (t._tp = { d: G.day, y: G.year, phys, pace });
}
// násobok šancí tímu A podľa taktiky A a súpera B
function tacMods(A, B, sA, sB) {
  const a = tacOf(A), b = tacOf(B), pa = tacProfile(A);
  let f = [sA.mid >= sB.mid ? 1.05 : 0.97, 1, pa.phys ? 1.05 : 1, (b.b === 2 || B.ment === 2 || B.press === 2) ? 1.12 : 0.94][a.s];
  f *= a.w === 2 ? (pa.pace ? 1.05 : 0.99) : a.w === 0 ? 0.97 : 1;
  f *= [0.93, 1, 1.05][a.b] * [0.9, 1, 1.07][b.b];
  if (b.s === 0 && sB.mid >= sA.mid) f *= 0.95;
  if (b.w === 0) f *= a.w === 2 ? 1.03 : 0.97;
  return f;
}
// AI si vyberá taktiku podľa sily a súpera (proti tebe reaguje na tvoje pokyny)
function aiTactic(t, opp) {
  const d = teamRating(t) - teamRating(opp), ot = tacOf(opp), pr = tacProfile(t);
  let s = 1, b = 1, w = 1;
  if (d <= -5) { s = 3; b = 0; } else if (d >= 5) { s = 0; b = 2; }
  if (opp.id === G.userTid) { if (ot.b === 2 && s !== 0) s = 3; if (ot.s === 3) b = 0; if (ot.w === 0) w = 2; }
  if (s === 1 && pr.phys) s = 2;
  if (pr.pace && w === 1) w = 2;
  t.tac = { s, b, w };
}
function bestTac(u, opp) {
  const sU = teamStrength(u), sO = teamStrength(opp), keep = tacOf(u);
  let best = null, bv = 0;
  for (let s = 0; s < 4; s++) for (let w = 0; w < 3; w++) for (let b = 0; b < 3; b++) {
    u.tac = { s, w, b };
    const v = tacMods(u, opp, sU, sO) / tacMods(opp, u, sO, sU);
    if (v > bv + 0.001) { bv = v; best = { s, w, b }; }
  }
  u.tac = keep;
  return best;
}

// ── Štandardné situácie ────────────────────────────────────────
const SP_K = [['pk', 'Penalty'], ['fk', 'Priame kopy'], ['ck', 'Rohy']];
function spTaker(t, k) {
  const xi = (t.lineup || []).map(id => G.players[id]).filter(p => p && p.pos !== 'GK');
  if (!xi.length) return null;
  const pick = t.sp && t.sp[k] != null ? xi.find(p => p.id === t.sp[k]) : null;
  if (pick) return pick;
  const sc = p => { const a = playerAttrs(p); return k === 'pk' ? a[1] + 3 * trLvl(p, 'fin') : a[1] * 0.5 + a[3] * 0.5 + 3 * trLvl(p, 'lng'); };
  return xi.sort((a, b) => sc(b) - sc(a))[0];
}
function spHeader(lp) { return U.weighted(lp.filter(x => x.sp !== 'GK'), x => Math.pow(playerAttrs(x.p)[5] / 50, 2) * (1 + trLvl(x.p, 'hdr')) * (x.sp === 'MF' ? 0.6 : 1)); }
function spF(t) { const k = spTaker(t, 'fk'); return (k ? 0.8 + U.clamp(playerAttrs(k)[3] / 100, 0.3, 0.95) * 0.4 : 1) * trSpF(t); }

// ── Počasie a terén ────────────────────────────────────────────
const WX = { sun: ['☀️', 'Slnečno'], cloud: ['⛅', 'Oblačno'], rain: ['🌧️', 'Dážď'], storm: ['⛈️', 'Búrka'], fog: ['🌫️', 'Hmla'], snow: ['❄️', 'Sneh'], frost: ['🥶', 'Mráz'], heat: ['🔥', 'Horúčava'], wind: ['💨', 'Vietor'] };
const WX_P = { sum: [['sun', 5], ['heat', 3], ['storm', 1.5], ['cloud', 2]], aut: [['cloud', 3], ['rain', 3], ['fog', 1.5], ['wind', 1.5], ['sun', 2]], win: [['snow', 2.5], ['frost', 2.5], ['cloud', 2], ['rain', 1.5], ['fog', 1]], win2: [['snow', 2], ['frost', 2], ['rain', 2], ['cloud', 2]], spr: [['sun', 3], ['cloud', 3], ['rain', 2.5], ['wind', 1]], sum2: [['sun', 4], ['heat', 1.5], ['storm', 1], ['cloud', 2]] };
const WX_T = { sum: [22, 33], aut: [6, 18], win: [-6, 4], win2: [-4, 8], spr: [10, 20], sum2: [18, 28] };
function mdRand(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const WX_GOAL = { sun: 1, cloud: 1, rain: 0.96, storm: 0.92, fog: 0.95, snow: 0.88, frost: 0.94, heat: 0.96, wind: 0.97 };
function seasonPhase(day) { const f = day / Math.max(1, (G.calendar || []).length); return f < 0.12 ? 'sum' : f < 0.36 ? 'aut' : f < 0.5 ? 'win' : f < 0.6 ? 'win2' : f < 0.82 ? 'spr' : 'sum2'; }
function weatherFor(home, day = G.day) {
  if (!home) return { k: 'sun', temp: 20 };
  const ph = seasonPhase(day), R = mdRand(U.hash(`${G.year}:${day}:${home.reg || home.fx || home.city}`));
  const list = WX_P[ph];
  let x = R() * list.reduce((a, w) => a + w[1], 0), k = list[0][0];
  for (const [kk, w] of list) if ((x -= w) <= 0) { k = kk; break; }
  const [t0, t1] = WX_T[ph];
  let temp = Math.round(t0 + (t1 - t0) * R());
  if (k === 'heat') temp = Math.max(temp, 30);
  if (k === 'snow' || k === 'frost') temp = Math.min(temp, 0);
  return { k, temp };
}
function pitchOf(t) {
  if (t.id === G.userTid) return { art: false, heat: !!(G.biz && G.biz.fac.heat) };
  const h = U.hash('pitch' + (t.key || t.name));
  return { art: !t.fx && t.lvl >= 3 && h % 4 === 0, heat: !!t.fx || t.lvl === 1 || (t.lvl <= 3 && h % 5 === 0) };
}
function wxF(wx, host, team, isHome) {
  const pi = pitchOf(host);
  let f = WX_GOAL[wx.k] || 1;
  if ((wx.k === 'snow' || wx.k === 'frost') && pi.heat) f = 1 - (1 - f) * 0.4;
  if (!pi.heat && ['rain', 'snow', 'storm'].includes(wx.k) && tacOf(team).s === 0) f *= 0.96;
  if (isHome && pi.art) f *= 1.04;
  return f;
}
const wxTxt = wx => `${WX[wx.k][0]} ${WX[wx.k][1]} · ${wx.temp} °C`;

// ── Rozhodcovia a VAR ──────────────────────────────────────────
function refs() {
  if (!G.refs) G.refs = Array.from({ length: 18 }, (_, i) => { const nm = genName(false); return { n: `${nm.fn} ${nm.ln}`, st: 1 + (i * 7) % 5 }; });
  return G.refs;
}
function refFor(home, away, day = G.day) { const r = refs(); return r[U.hash(`${G.year}:${day}:${home.id}:${away.id}`) % r.length]; }
const refK = r => [0.75, 0.88, 1, 1.13, 1.28][r.st - 1];
const varOn = (home, away) => home.lvl === 1 || !!home.fx || !!away.fx;
const VAR_WHY = ['ofsajd', 'faul v útoku', 'ruka'];

// ── Cestovanie ─────────────────────────────────────────────────
const REG_KM = { ZS: 190, SZ: 190, SV: 210, VS: 210, ZV: 400, VZ: 400 };
function travelKm(home, away, neutral) {
  if (neutral) return home.fx || away.fx ? 900 : 150;
  if (home.fx || away.fx) return 1300;
  if (home.city === away.city) return 5;
  if (!home.reg || !away.reg || home.reg === away.reg) return 70;
  return REG_KM[away.reg + home.reg] || 200;
}
const travelF = km => 1 - Math.min(0.06, km / 10000);
const travelTxt = km => (km >= 900 ? `✈️ ${km.toLocaleString('sk-SK')} km` : km <= 10 ? '🏠 mestské derby' : `🚌 ${km} km · ~${Math.max(1, Math.round(km / 75))} h`);

// ── Spolu: násobok šancí tímu A proti B ────────────────────────
function matchMods(A, B, sA, sB, isHome, neutral, wx) {
  let f = tacMods(A, B, sA, sB) * chemF(A) * moraleF(A) * trAttF(A) * trDefF(B) * wxF(wx, isHome ? A : B, A, isHome && !neutral);
  if (!isHome) f *= travelF(travelKm(B, A, neutral));
  const po = G.pressOpp;
  if (po && po.tid === A.id && po.vs === B.id && po.until >= G.day) f *= po.f;
  if (G.htTalk && G.htTalk.tid === A.id) f *= G.htTalk.f;
  f *= mafMods(A, B) * cohF(A);
  return f;
}
// únava po zápase: cesta a horúčava
function matchAfterFx(home, away, res, neutral) {
  const wx = weatherFor(home), km = travelKm(home, away, neutral);
  const fc = away.id === G.userTid && staff().fit ? 1 - 0.1 * staff().fit.q : 1;
  for (const [t, side] of [[home, 0], [away, 1]]) {
    const ids = [...(res.lu ? res.lu[side] : []), ...(res.sb ? res.sb[side] : [])];
    const loss = (side ? Math.round(km / 90 * fc) : 0) + (wx.k === 'heat' ? 3 : 0);
    if (loss) for (const id of ids) { const p = G.players[id]; if (p) p.fit = Math.max(25, p.fit - loss); }
  }
}

// ── Tlačové konferencie ───────────────────────────────────────
const PRESS = {
  derby: ['Čo čakáte od derby proti {opp}?', [['Vyhráme, sme lepší tím.', { mor: 4, fans: 6, opp: 1.05 }], ['Rešpektujeme súpera, bude to ťažké.', { mor: 1, fans: -1 }], ['Derby je len ďalší zápas.', { fans: -5, mor: -1 }]]],
  big: ['Čaká vás veľký zápas proti {opp}. Aký je cieľ?', [['Ideme po víťazstve.', { mor: 3, conf: 1, opp: 1.03 }], ['Remíza by nebola zlá.', { mor: -2 }], ['Hráči sú pripravení, verím im.', { mor: 4 }]]],
  slump: ['Tím dlho nevyhral. Hrozí vám odvolanie?', [['Mám dôveru vedenia aj hráčov.', { mor: 2, conf: -1 }], ['Potrebujeme čas, výsledky prídu.', { mor: 1 }], ['Ak to nepôjde, vyvodím dôsledky.', { conf: 3, mor: -2 }]]],
  star: ['O hráča {star} sa zaujímajú väčšie kluby. Predáte ho?', [['Nie je na predaj.', { star: 6, fans: 3 }], ['Každý hráč má svoju cenu.', { star: -8, conf: 2 }], ['O tom teraz nehovorím.', {}]]],
  win: ['Skvelý výsledok proti {opp}. Kto si zaslúži pochvalu?', [['Celý tím, makali všetci.', { mor: 4 }], ['Fanúšikovia nás hnali dopredu.', { fans: 6, mor: 1 }], ['Ešte nie sme hotoví.', { mor: -1, conf: 2 }]]],
  loss: ['Prehra s {opp}. Čo sa stalo?', [['Beriem to na seba.', { conf: 2, mor: 2 }], ['Hráči nesplnili, čo sme chceli.', { mor: -6, conf: 1 }], ['Rozhodca nám nepomohol.', { fans: 3, fine: 1 }]]],
  ref: ['Ako hodnotíte výkon rozhodcu?', [['Bez komentára.', {}], ['Rozhodol zápas, je to škandál.', { fans: 5, fine: 1, mor: 2 }], ['Rozhodcovia to majú ťažké.', { conf: 1 }]]],
};
function pressPre(x) {
  if (x.m.pr || x.m.pr0) return null;
  const u = userTeam(), opp = G.teams[x.m.h === u.id ? x.m.a : x.m.h];
  const der = rivalry(u, opp), lg = leagueOf(u);
  const recent = (lg.rounds || []).flat().filter(m => m.hg != null && (m.h === u.id || m.a === u.id)).slice(-4);
  const slump = recent.length >= 4 && recent.every(m => (m.h === u.id ? m.hg <= m.ag : m.ag <= m.hg));
  const star = teamPlayers(u).sort((a, b) => b.r - a.r)[0];
  let k = null;
  if (der && der[0] >= 2) k = 'derby';
  else if (x.comp === 'E' || (x.comp === 'C' && x.m.neutral)) k = 'big';
  else if (slump && U.chance(0.6)) k = 'slump';
  else if (star && windowNow().open && star.r >= teamBase(u) + 6 && U.chance(0.12)) k = 'star';
  x.m.pr0 = 1;
  return k ? { k, x, opp, star } : null;
}
function pressPost(x, res) {
  if (x.m.pr) return null;
  const u = userTeam(), home = x.m.h === u.id, side = home ? 0 : 1, my = home ? res.hg : res.ag, op = home ? res.ag : res.hg;
  const opp = G.teams[home ? x.m.a : x.m.h];
  const red = (res.cards || []).some(c => c.side === side && c.c === 'R') || (res.varx || []).some(v => v.side === side);
  let k = null;
  if (red && U.chance(0.55)) k = 'ref';
  else if (my - op >= 3 && U.chance(0.55)) k = 'win';
  else if (op - my >= 2 && U.chance(0.65)) k = 'loss';
  x.m.pr = 1;
  return k ? { k, x, opp } : null;
}
function pressQ(pc) { return PRESS[pc.k][0].replace('{opp}', pc.opp ? pc.opp.name : '').replace('{star}', pc.star ? pFull(pc.star) : ''); }
function pressAnswer(pc, i) {
  const ef = PRESS[pc.k][1][i][1], u = userTeam(), out = [];
  if (ef.mor) { for (const p of teamPlayers(u)) addMor(p, ef.mor); out.push(`morálka ${ef.mor > 0 ? '+' : ''}${ef.mor}`); }
  if (ef.fans && G.biz) { G.biz.mood = U.clamp((G.biz.mood ?? 60) + ef.fans, 0, 100); out.push(`fanúšikovia ${ef.fans > 0 ? '+' : ''}${ef.fans}`); }
  if (ef.conf) { const b = board(); b.conf = U.clamp(b.conf + ef.conf, 0, 100); out.push(`vedenie ${ef.conf > 0 ? '+' : ''}${ef.conf}`); }
  if (ef.star && pc.star) { addMor(pc.star, ef.star); out.push(`${pName(pc.star)} ${ef.star > 0 ? '+' : ''}${ef.star}`); }
  if (ef.opp && pc.opp) { G.pressOpp = { tid: pc.opp.id, vs: u.id, f: ef.opp, until: G.day }; out.push('súper je namotivovaný'); }
  if (ef.fine && U.chance(0.45)) { const f = U.nice(lwb(u.lvl) * 0.6); book('fines', -f); inboxAdd({ type: 'info', text: `⚖️ Disciplinárna komisia: pokuta ${U.money(f)} za výroky o rozhodcovi.` }); out.push(`pokuta ${U.money(f)}`); }
  return out;
}

// ── Analýza súpera ─────────────────────────────────────────────
function oppAnalysis(x) {
  const u = userTeam(), opp = G.teams[x.m.h === u.id ? x.m.a : x.m.h];
  const sO = teamStrength(opp), sU = teamStrength(u);
  let form = [];
  if (!opp.fx) { const row = leagueTable(leagueOf(opp)).find(r => r.tid === opp.id); form = row ? row.form.slice(-5) : []; }
  const ps = teamPlayers(opp);
  const top = ps.slice().sort((a, b) => b.s.g - a.s.g)[0];
  const key = (opp.lineup || []).map(id => G.players[id]).filter(Boolean).sort((a, b) => b.r - a.r)[0];
  const ast = staff().ast, sure = ast && ast.q >= 3;
  const tac = { ...tacOf(opp) };
  if (!sure && U.hash(`an${G.year}${G.day}${opp.id}`) % 4 === 0) tac.s = (tac.s + 1) % 4;
  const weak = sO.def < sO.att - 3 ? 'obrana' : sO.att < sO.def - 3 ? 'útok' : sO.mid < (sO.att + sO.def) / 2 - 3 ? 'stred poľa' : null;
  return { opp, form, top: top && top.s.g ? top : null, key, tac, weak, s: sO, me: sU, rec: bestTac(u, opp) };
}
