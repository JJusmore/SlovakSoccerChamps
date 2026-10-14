'use strict';
// ─── Kariéra: majiteľ klubu, stavebné povolenie a dotácie, licencie trénera, kariérne ciele,
//     sústredenie s prípravnými zápasmi, talenty z okresných turnajov, predzmluvy ───

// ── Majiteľ klubu ──────────────────────────────────────────────
const OWNERS = {
  inv: { n: 'Investor', ic: '💼', d: 'Každú sezónu vloží peniaze, ale chce rýchle výsledky', pat: 1.4, cash: 18 },
  city: { n: 'Mesto', ic: '🏛️', d: 'Malý rozpočet, trpezlivé vedenie, pomôže s dotáciou na štadión', pat: 0.6, cash: 2 },
  fans: { n: 'Fanúšikovia', ic: '📣', d: 'Klub patrí fanúšikom – ich nálada ovplyvňuje dôveru vedenia', pat: 0.85, cash: 0 },
  spon: { n: 'Generálny sponzor', ic: '🤝', d: 'Pravidelný príspevok od firmy majiteľa', pat: 1, cash: 7 },
};
function owner() {
  const u = userTeam();
  if (!G.owner || G.owner.tid !== u.id) {
    const h = U.hash('own' + u.name);
    const k = u.lvl <= 2 ? ['inv', 'spon', 'fans', 'inv'][h % 4] : u.lvl <= 5 ? ['city', 'spon', 'city'][h % 3] : 'city';
    const nm = genName(false);
    const name = k === 'inv' ? `${nm.ln} Holding` : k === 'city' ? `Mesto ${u.city}` : k === 'fans' ? `OZ fanúšikov ${u.short}` : `${u.city} ${U.pick(['Energy', 'Group', 'Invest', 'Stavby'])}`;
    G.owner = { tid: u.id, k, name, y: -1 };
  }
  return G.owner;
}
const ownerPat = () => OWNERS[owner().k].pat;
function ownerSeason() {
  const o = owner(), u = userTeam();
  if (o.y === G.year) return;
  o.y = G.year;
  const D = OWNERS[o.k];
  if (!D.cash) return;
  const amt = U.nice(lwb(u.lvl) * D.cash * (o.k === 'inv' ? 0.6 + board().conf / 100 : 1));
  book('grant', amt);
  inboxAdd({ type: 'info', text: `${D.ic} ${o.name} vložil do klubu ${U.money(amt)}.` });
}

// ── Stavebné povolenie a dotácie na štadión ────────────────────
const permitNeeded = () => G.biz && (G.biz.fac.stad || 0) + 1 >= 3;
function permitOk() { const p = G.permit, n = (G.biz.fac.stad || 0) + 1; return !permitNeeded() || (p && p.lvl === n && p.ok === true); }
function requestPermit() {
  const n = (G.biz.fac.stad || 0) + 1, p = G.permit;
  if (p && p.lvl === n && (p.ok === true || p.ok == null)) return 'Žiadosť už beží.';
  if (p && p.lvl === n && p.ok === false && p.retry > dayKey()) return 'Úrad ťa zamietol – skús znova o pár dní.';
  G.permit = { lvl: n, done: dayKey() + U.ri(4, 9), ok: null };
  return null;
}
function requestGrant() {
  const n = (G.biz.fac.stad || 0) + 1;
  if (G.grantY === G.year) return 'O dotáciu si už túto sezónu žiadal.';
  G.grantY = G.year;
  G.grantReq = { lvl: n, done: dayKey() + 6 };
  return null;
}
const grantPct = lv => (G.grant && G.grant.lvl === lv ? G.grant.pct : 0);
function permitsDay() {
  const p = G.permit;
  if (p && p.ok == null && dayKey() >= p.done) {
    p.ok = U.chance(0.8 + (owner().k === 'city' ? 0.12 : 0));
    if (!p.ok) p.retry = dayKey() + 5;
    inboxAdd({ type: 'info', text: p.ok ? `🏗️ Stavebné povolenie na štadión (úroveň ${p.lvl}) bolo schválené.` : `🏗️ Stavebný úrad zamietol povolenie na štadión – môžeš požiadať znova.` });
  }
  const g = G.grantReq;
  if (g && dayKey() >= g.done) {
    G.grantReq = null;
    if (U.chance(0.35 + (owner().k === 'city' ? 0.25 : 0) + (userTeam().lvl <= 2 ? 0.1 : 0))) {
      G.grant = { lvl: g.lvl, pct: U.pick([0.2, 0.3, 0.4]) };
      inboxAdd({ type: 'info', text: `💶 ${owner().k === 'city' ? 'Mesto' : 'Ministerstvo'} schválilo dotáciu ${Math.round(G.grant.pct * 100)} % na štadión (úroveň ${g.lvl}).` });
    } else inboxAdd({ type: 'info', text: '💶 Žiadosť o dotáciu na štadión tento rok neprešla.' });
  }
}

// ── Licencie trénera ───────────────────────────────────────────
const LIC_N = ['', 'UEFA C', 'UEFA B', 'UEFA A', 'UEFA Pro'];
const LIC_COST = [0, 0, 3000, 8000, 20000], LIC_DAYS = [0, 0, 12, 18, 25];
const reqLic = lvl => (lvl === 1 ? 4 : lvl === 2 ? 3 : lvl <= 4 ? 2 : 1);
function coachLic() { if (!G.lic) G.lic = { lv: reqLic(userTeam().lvl), course: null }; return G.lic; }
function startCourse() {
  const L = coachLic();
  if (L.lv >= 4) return 'Máš najvyššiu licenciu.';
  if (L.course) return 'Kurz už prebieha.';
  const to = L.lv + 1;
  if (userTeam().budget < LIC_COST[to]) return 'Nemáš dosť peňazí.';
  book('staff', -LIC_COST[to]);
  L.course = { to, done: dayKey() + LIC_DAYS[to] };
  return null;
}
function licDay() {
  const L = coachLic();
  if (L.course && dayKey() >= L.course.done) { L.lv = L.course.to; L.course = null; L.earned = true; inboxAdd({ type: 'info', text: `🎓 Získal si trénerskú licenciu ${LIC_N[L.lv]}!` }); }
}
const licShort = () => coachLic().lv < reqLic(userTeam().lvl) && !coachLic().course;

// ── Kariérne ciele trénera ─────────────────────────────────────
const GOALS = [
  ['promo', '⬆️', 'Postúp s klubom do vyššej súťaže'],
  ['title', '🏆', 'Vyhraj Niké ligu'],
  ['cup', '🥇', 'Vyhraj Slovenský pohár'],
  ['cl', '⭐', 'Zahraj si Ligu majstrov'],
  ['ko', '🌍', 'Postúp v Európe zo skupiny'],
  ['nt', '🇸🇰', 'Hráč tvojho klubu v reprezentácii'],
  ['u21', '🌱', 'Hráč tvojho klubu v reprezentácii U21'],
  ['legend', '🏛️', 'Legenda klubu v Sieni slávy'],
  ['stad', '🏟️', 'Štadión pre 20 000 divákov'],
  ['unb', '🛡️', '10 zápasov bez prehry'],
  ['women', '👩', 'Titul so ženským tímom'],
  ['pro', '🎓', 'Získaj ďalšiu trénerskú licenciu'],
];
function goalsCheck(sum) {
  const D = G.goalsDone || (G.goalsDone = {}), s = seasonTxt(), u = userTeam();
  const mark = k => { if (!D[k]) { D[k] = s; const g = GOALS.find(x => x[0] === k); news(`🎯 Kariérny cieľ splnený: ${g[2]}!`, 'good'); } };
  if (sum && sum.move && sum.move.dir === 'up') mark('promo');
  if (G.trophies.some(t => t.type === 'league' && t.name === 'Niké liga')) mark('title');
  if (G.trophies.some(t => t.name === 'Slovenský pohár')) mark('cup');
  if (typeof userEuro === 'function' && userEuro().some(c => c.id === 'cl')) mark('cl');
  if (typeof userEuro === 'function' && userEuro().some(c => c.cur >= 6 && c.alive.includes(u.id))) mark('ko');
  if (G.nt && G.nt.year === G.year) { if ((G.nt.sq || []).some(id => G.players[id] && G.players[id].tid === u.id)) mark('nt'); if ((G.nt.u21 || []).some(id => G.players[id] && G.players[id].tid === u.id)) mark('u21'); }
  if ((G.hof || []).length) mark('legend');
  if (G.biz && capacity() >= 20000) mark('stad');
  if (G.rec && G.rec.unbB && G.rec.unbB.n >= 10) mark('unb');
  if (G.trophies.some(t => t.name === 'Liga žien')) mark('women');
  if (coachLic().earned) mark('pro');
}

// ── Sústredenie a prípravné zápasy ─────────────────────────────
const CAMPS = [['home', '🏠', 'Doma', 0, { chem: 2, mor: 1 }], ['aut', '🏔️', 'Rakúsko', 1.5, { chem: 5, mor: 3, fit: 4 }], ['tur', '🌴', 'Turecko', 3.5, { chem: 8, mor: 5, fit: 6, dev: 0.04 }]];
function campHalf() { const w = seasonWindows()[1]; return w && G.day >= w[0] ? 'w' : 's'; }
function campAvail() {
  if (G.userTid < 0 || seasonOver()) return null;
  const c = G.camp && G.camp.y === G.year ? G.camp : (G.camp = { y: G.year });
  const w = seasonWindows()[1];
  if (G.day <= 2 && !c.s) return 's';
  if (w && G.day >= w[0] && G.day <= w[1] && !c.w) return 'w';
  return null;
}
const campCost = i => U.nice(lwb(userTeam().lvl) * CAMPS[i][3]);
function doCamp(i) {
  const half = campAvail(), u = userTeam();
  if (!half) return { err: 'Sústredenie teraz nie je možné.' };
  const [k, , n, , ef] = CAMPS[i], cost = campCost(i);
  if (u.budget < cost) return { err: 'Nemáš dosť peňazí.' };
  if (cost) book('eventx', -cost);
  for (const p of teamPlayers(u)) { addMor(p, ef.mor); p.fit = Math.min(100, p.fit + (ef.fit || 0)); p.xp = Math.min(100, (p.xp ?? 30) + 0.6); }
  if (ef.dev) { const t = trn(); t.sum += ef.dev * 40; t.n += 40; }
  // dva prípravné zápasy – so slabším a silnejším súperom
  const r0 = teamRating(u), opp = G.teams.filter(t => t.id !== u.id && t.parent == null && (k === 'home' ? !t.fx : true));
  const pick = up => { const l = opp.filter(t => (up ? teamRating(t) >= r0 + 2 && teamRating(t) <= r0 + 12 : teamRating(t) <= r0 - 2 && teamRating(t) >= r0 - 14)); return U.pick(l.length ? l : opp); };
  const res = [pick(false), pick(true)].filter(Boolean).map(t => { const la = 1.5 * Math.exp((r0 - teamRating(t)) / 12), lb = 1.5 * Math.exp((teamRating(t) - r0) / 12); return { opp: t.id, g: U.poisson(la), ga: U.poisson(lb) }; });
  G.camp[half] = { k, chem: ef.chem, res };
  news(`🏕️ Sústredenie ${n}: ${res.map(r => `${u.short} – ${G.teams[r.opp].short} ${r.g}:${r.ga}`).join(', ')}.`, 'good');
  return { res };
}
const campChem = () => { const c = G.camp && G.camp.y === G.year ? G.camp[campHalf()] : null; return c ? c.chem : 0; };

// ── Talenty z okresných turnajov (skauti v regióne) ────────────
function villageScout() {
  if (!(G.scouts || []).length) return;
  const u = userTeam(), net = (G.biz && G.biz.fac.scout) || 0, best = Math.max(...G.scouts.map(s => s.q));
  const clubs = G.teams.filter(t => !t.fx && t.lvl >= 7 && (t.reg === u.reg || U.chance(0.2)) && t.parent == null);
  const n = 1 + (net >= 2 ? 1 : 0) + (net >= 3 ? 1 : 0);
  const found = [];
  for (let i = 0; i < n && clubs.length; i++) {
    const t = U.pick(clubs), age = U.ri(15, 17);
    const p = genPlayer(t.id, U.pick(['DF', 'MF', 'FW', 'MF', 'FW', 'GK']), LEVEL_INFO[t.lvl].base + U.ri(-2, 6), { young: true, hu: t.hu });
    p.age = age;
    // klenot je vzácny – závisí od kvality skauta a siete
    const gem = U.chance(0.04 + 0.02 * best + 0.03 * net);
    // potenciál primeraný – väčšinou na nižšie súťaže, klenot až na Niké ligu
    p.pot = gem ? U.ri(LEVEL_INFO[2].base + 4, LEVEL_INFO[1].base + 8) : U.ri(LEVEL_INFO[t.lvl].base + 6, LEVEL_INFO[Math.max(3, t.lvl - 3)].base + 4);
    p.r = Math.max(8, p.pot - (gem ? U.ri(16, 24) : U.ri(7, 13)) - (17 - age) * 2);
    p.vt = G.year; t.pids.push(p.id);
    G.know[p.id] = Math.max(G.know[p.id] || 0, 70);
    found.push(p.id);
  }
  G.vt = { y: G.year, ids: [...found, ...((G.vt && G.vt.ids) || [])].filter(id => G.players[id] && G.players[id].tid !== u.id).slice(0, 6) };
  if (found.length) inboxAdd({ type: 'scout', text: `🌾 Skauti na okresnom turnaji objavili ${found.length === 1 ? 'talent' : found.length + ' talenty'}: ${found.map(id => `${pFull(G.players[id])} (${G.players[id].age} r., ${G.teams[G.players[id].tid].name})`).join(', ')}. Pozri Skauting.` });
}
const vtFee = p => U.nice(Math.max(500, playerValue(p) * 0.6));
function signVillage(id) {
  const p = G.players[id], u = userTeam();
  if (!p || !p.vt || p.tid === u.id) return 'Hráč už nie je k dispozícii.';
  if (teamPlayers(u).length >= 30) return 'Máš plný káder.';
  const fee = vtFee(p), from = G.teams[p.tid];
  if (u.budget < fee) return 'Nemáš dosť peňazí.';
  const tb = tbCheck(fee); if (tb) return tb;
  book('buys', -fee); from.budget += fee;
  moveToTeam(p, u);
  p.w = MIN_WAGE[u.lvl]; p.ce = G.year + 3;
  logTransfer(p, from, u, fee, 'buy');
  news(`🌾 ${pFull(p)} prichádza z klubu ${from.name} (výchovné ${U.money(fee)}).`, 'good');
  return null;
}

// ── Predzmluva s hráčom, ktorému končí zmluva ──────────────────
function preAllowed(p) {
  const w = seasonWindows()[1];
  return p.tid >= 0 && p.tid !== G.userTid && !G.teams[p.tid].fx && !isUserSide(G.teams[p.tid]) && contractLeft(p) === 1 && !p.loan && w && G.day >= w[0] && !(p.pre && p.pre.tid === G.userTid);
}
function preArrivals() {
  const u = userTeam(), out = [];
  for (const p of G.players) {
    if (!p || !p.pre || p.pre.tid !== u.id || p.tid === u.id) continue;
    const pre = p.pre, from = p.tid >= 0 ? G.teams[p.tid] : null;
    delete p.pre;
    moveToTeam(p, u);
    p.w = pre.w; p.ce = pre.end;
    if (pre.fee) book('buys', -pre.fee);
    logTransfer(p, from, u, 0, 'free');
    out.push(pFull(p));
  }
  if (out.length) news(`📝 Na základe predzmluvy prichádzajú: ${out.join(', ')}.`, 'good');
}

// ── Denné napojenie ────────────────────────────────────────────
function careerDay(ev) {
  if (G.userTid < 0) return;
  if (G.biz) permitsDay();
  licDay();
  goalsCheck(null);
  if (ev && ev.t === 'L' && licShort() && ev.r % 4 === 3) { const b = board(); b.conf = U.clamp(b.conf - 2, 0, 100); if (!b.licWarn) { b.licWarn = true; inboxAdd({ type: 'info', text: `🎓 Na túto súťaž potrebuješ licenciu ${LIC_N[reqLic(userTeam().lvl)]}. Prihlás sa na kurz (Klub → Vedenie).` }); } }
}
