'use strict';
// ─── Klub: vedenie, licencie, dlhy, B-tím, dorast U19, ženský tím, Sieň slávy, rekordy, výročia ───

const seasonTxt = () => `${G.year}/${String((G.year + 1) % 100).padStart(2, '0')}`;
const isUserSide = t => !!t && (t.id === G.userTid || (t.parent != null && t.parent === G.userTid));
const bTeam = () => (G.userTid >= 0 ? G.teams.find(t => t.parent === G.userTid) || null : null);
function ulRow() {
  const u = userTeam(), tbl = leagueTable(leagueOf(u)), i = tbl.findIndex(r => r.tid === u.id);
  return { pos: i + 1, n: tbl.length, pts: tbl[i] ? tbl[i].pts : 0, p: tbl[i] ? tbl[i].p : 0 };
}
const downCount = lvl => (lvl === 2 ? 3 : lvl === 9 ? 0 : 1);

// ── Vedenie klubu: cieľ sezóny, dôvera, rozpočet na platy ──────
const BOARD_GOALS = { title: 'Boj o titul', promo: 'Postup', top: 'Horná polovica', mid: 'Pokojný stred', stay: 'Záchrana' };
function board() {
  const u = userTeam();
  if (!G.board || G.board.tid !== u.id) G.board = { tid: u.id, conf: 60, year: -1, hist: [], offers: [] };
  if (G.board.year !== G.year) boardNewSeason(G.board);
  if (!G.board.deal || G.board.deal.y !== G.year) boardDeal(G.board);
  return G.board;
}
function boardNewSeason(b) {
  const u = userTeam(), lg = leagueOf(u);
  const ranks = lg.tids.map(id => G.teams[id]).sort((a, c) => teamRating(c) - teamRating(a));
  const r = ranks.indexOf(u) + 1, n = ranks.length;
  let k, target;
  if (r <= 2) { k = lg.lvl === 1 ? 'title' : 'promo'; target = lg.lvl === 1 ? 2 : 1; }
  else if (r <= n / 2) { k = 'top'; target = Math.ceil(n / 2); }
  else if (r <= n - 3) { k = 'mid'; target = n - 2; }
  else { k = 'stay'; target = n - downCount(lg.lvl); }
  b.goal = { k, target, lvl: lg.lvl };
  // odvolanie z konca sezóny platí ďalej (zruší ho až nový klub)
  b.year = G.year; b.warned = false; if (!b.sacked) b.offers = [];
  b.wageCap = U.nice(Math.max(teamWageBill(u) * 1.06, (G.biz ? G.biz.rev : 0) * 0.95, lwb(u.lvl) * 0.9) * (b.conf >= 75 ? 1.08 : 1));
  // zmluvy z minulej sezóny môžu byť nad limitom – vedenie ich toleruje
  b.wageCap = Math.max(b.wageCap, U.nice(teamWageBill(u) * 1.02));
}
const boardGoalTxt = b => `${BOARD_GOALS[b.goal.k]} · do ${b.goal.target}. miesta`;
function wageRoom(extraOld = 0) { const b = board(); return b.wageCap - (teamWageBill(userTeam()) - extraOld); }

function boardAfterMatch(x, res) {
  const u = userTeam(), b = board();
  const home = x.m.h === u.id, my = home ? res.hg : res.ag, op = home ? res.ag : res.hg;
  const opp = G.teams[home ? x.m.a : x.m.h], d = teamRating(opp) - teamRating(u);
  const ko = x.comp === 'C' || x.ko;
  let dc = my > op ? 1.8 + (d > 3 ? 1 : 0) : my < op ? -1.4 - (d < -3 ? 1.1 : 0) : d > 3 ? 0.5 : d < -3 ? -0.6 : 0;
  if (ko && x.m.w != null) {
    if (x.m.w !== u.id && !opp.fx && opp.lvl > u.lvl) dc -= 4;
    if (x.m.w === u.id) dc += 1;
  }
  if (rivalry(u, opp)) dc *= 1.5;
  if (dc < 0) dc *= ownerPat();
  b.conf = U.clamp(b.conf + dc, 0, 100);
}
// každé 4 ligové kolá vedenie porovná miesto s cieľom
function boardReview(ev) {
  const b = board(), u = userTeam(), row = ulRow();
  if (ev.r < 3 || ev.r % 4 !== 3) return;
  const gap = row.pos - b.goal.target;
  b.conf = U.clamp(b.conf + (gap > 0 ? -Math.min(4, gap * 0.8) * ownerPat() : 2) + (u.budget < 0 ? -2 : 0) + (owner().k === 'fans' && G.biz ? ((G.biz.mood ?? 60) - 55) / 15 : 0), 0, 100);
  if (b.conf < 30 && !b.warned) { b.warned = true; inboxAdd({ type: 'info', text: `🏛️ Vedenie stráca trpezlivosť (dôvera ${Math.round(b.conf)} %). Cieľ: ${boardGoalTxt(b)}.` }); }
  if (b.conf < 12 && ev.r >= 7) { b.sacked = true; b.offers = jobOffers(false); }
}
function boardSeasonEnd(sum) {
  const b = board(), u = userTeam();
  const met = b.goal.k === 'promo' ? !!(sum.move && sum.move.dir === 'up') : sum.pos <= b.goal.target;
  const over = b.goal.target - sum.pos;
  b.conf = U.clamp(b.conf + (met ? 14 + Math.min(8, over * 2) : -(6 + Math.min(14, -over * 3))) + (u.budget < 0 ? -8 : 0), 0, 100);
  b.hist.unshift({ season: sum.season, goal: boardGoalTxt(b), pos: sum.pos, met, conf: Math.round(b.conf) });
  if (b.hist.length > 12) b.hist.length = 12;
  sum.board = { met, goal: boardGoalTxt(b), conf: Math.round(b.conf) };
  if (b.conf < 15) { b.sacked = true; b.offers = jobOffers(false); }
  else if (b.conf >= 78 || (met && over >= 2)) b.offers = jobOffers(true);
  else b.offers = [];
  sum.jobs = b.offers.slice();
  boardObjEnd(sum);
}
// ponuky práce: po úspechu z väčších klubov, po odvolaní zo slabších
function jobOffers(up) {
  const u = userTeam(), r0 = teamRating(u);
  const lic = coachLic().lv;
  const pool = G.teams.filter(t => !t.fx && t.parent == null && t.id !== u.id && reqLic(t.lvl) <= lic + 1 && (up ? t.lvl <= u.lvl && teamRating(t) > r0 + 1 : t.lvl >= u.lvl && t.lvl <= u.lvl + 2 && teamRating(t) <= r0));
  // najbližšie k úrovni trénera: po úspechu o niečo silnejšie, po odvolaní o niečo slabšie kluby
  return U.shuffle(pool).sort((a, c) => (up ? teamRating(a) - teamRating(c) : teamRating(c) - teamRating(a))).slice(0, 8).sort(() => Math.random() - 0.5).slice(0, 3).map(t => t.id);
}
// prestup trénera do iného klubu
function switchClub(tid) {
  const old = userTeam(), t = G.teams[tid];
  for (const p of teamPlayers(old)) { p.acad = false; p.it = null; p.prom = null; }
  G.acadQ = [];
  autoLineup(old);
  G.userTid = tid;
  setupCareerMarket();
  G.board = null; G.staff = null; G.trn = null; G.u19 = null; G.wom = null; G.bPending = null; G.retro = null; G.rec = null;
  G.owner = null; G.permit = null; G.grant = null; G.grantReq = null; G.camp = null; G.vt = null; G.maf = null;
  validateLineup(t);
  news(`🏛️ ${G.coach} je novým trénerom klubu ${t.name}.`, 'good');
  board();
}

// ── Licencie SFZ (Niké liga) a UEFA (európske poháre) ─────────
const LIC = {
  sfz: [['lights', 1, 'Osvetlenie'], ['youth', 1, 'Mládežnícka akadémia']],
  uefa: [['stad', 2, 'Štadión (úroveň 2)'], ['lights', 2, 'Osvetlenie (úroveň 2)'], ['youth', 1, 'Mládežnícka akadémia'], ['medical', 1, 'Zdravotné stredisko']],
};
function licCheck(kind) {
  const f = G.biz ? G.biz.fac : {};
  const items = LIC[kind].map(([k, lv, n]) => ({ n, ok: (f[k] || 0) >= lv, k }));
  items.push({ n: 'Kladný rozpočet', ok: userTeam().budget >= 0 });
  return { items, ok: items.every(i => i.ok) };
}
function licNotice() {
  const u = userTeam();
  if (u.lvl === 1 && G.biz && !licCheck('sfz').ok) inboxAdd({ type: 'info', text: '📋 Licencia SFZ: do konca sezóny potrebuješ osvetlenie a mládežnícku akadémiu, inak pokuta a −3 body. Pozri Klub → Vedenie.' });
}
// po sezóne (u.lvl je už nová súťaž)
function licSeasonEnd(sum) {
  const u = userTeam(), out = [];
  if (u.lvl === 1 && !licCheck('sfz').ok) {
    const fine = U.nice(lwb(1) * 6);
    book('fines', -fine); u.dedNext = (u.dedNext || 0) + 3;
    out.push(`Licencia SFZ nesplnená: pokuta ${U.money(fine)} a −3 body na začiatku sezóny.`);
  }
  const quali = G.prev && G.prev.l1 && G.prev.l1.slice(0, 4).includes(u.id);
  if (quali && !licCheck('uefa').ok) { G.uefaBan = G.year + 1; out.push('Bez licencie UEFA nemôžeš hrať európske poháre.'); }
  if (u.budget < -lwb(u.lvl) * 4) { u.dedNext = (u.dedNext || 0) + 3; out.push('Dlhy klubu: −3 body na začiatku sezóny.'); }
  for (const t of out) inboxAdd({ type: 'info', text: '📋 ' + t });
  sum.lic = out;
}

// ── Dlhy a bankroty AI klubov ──────────────────────────────────
function aiFinanceSeason() {
  for (const t of G.teams) {
    t.ded = t.dedNext || 0; t.dedNext = 0;
    if (t.fx || isUserSide(t)) continue;
    if (t.debt && U.chance(0.45)) {
      if (t.lvl >= 3 && U.chance(0.5)) {
        // bankrot: vysoký odpočet bodov, polovica kádra odchádza
        t.ded += 30; t.debt = 0; t.budget = Math.round(LEVEL_INFO[t.lvl].budget * 0.2);
        for (const p of sortSquad(teamPlayers(t)).filter((_, i) => i % 2 === 0)) toFreeAgent(p);
        aiRefill(t);
        news(`☠️ ${t.name} skrachoval – odpočet 30 bodov, hráči odchádzajú.`, 'bad');
      } else { t.ded += 3; news(`💸 ${t.name} má stále dlhy – ďalší odpočet 3 bodov.`); }
      continue;
    }
    t.debt = 0;
    if (t.lvl >= 2 && t.lvl <= 6 && U.chance(t.budget < LEVEL_INFO[t.lvl].budget * 0.5 ? 0.06 : 0.012)) {
      t.debt = 1; t.ded += 3;
      for (const p of teamPlayers(t).sort((a, c) => c.r - a.r).slice(0, 2)) p.listedAI = true;
      if (t.lvl <= 3) news(`💸 ${t.name} má finančné problémy – odpočet 3 bodov, predáva najlepších hráčov.`);
    }
  }
}

// ── Štatistiky v klube, Sieň slávy a rekordy ────────────────────
function clubStat(p, k, n = 1) {
  if (!p.cs || p.cs.t !== G.userTid) p.cs = { t: G.userTid, y0: G.year, gp: 0, g: 0, a: 0 };
  p.cs[k] += n;
}
function hofCheck(p) {
  if (!p.cs || p.cs.t !== G.userTid || p.tid !== G.userTid) return;
  if (p.cs.gp >= 100 || p.cs.g >= 35) {
    G.hof = (G.hof || []).filter(h => h.pid !== p.id);
    G.hof.push({ pid: p.id, n: pFull(p), pos: p.pos, nat: p.nat, y0: p.cs.y0, y1: G.year, gp: p.cs.gp, g: p.cs.g, a: p.cs.a, club: G.userTid });
    news(`🏛️ ${pFull(p)} odchádza ako legenda klubu (${p.cs.gp} zápasov, ${p.cs.g} gólov).`, 'good');
  }
}
function legends() {
  const cur = teamPlayers(userTeam()).filter(p => p.cs && p.cs.t === G.userTid && (p.cs.gp >= 100 || p.cs.g >= 35)).map(p => ({ pid: p.id, n: pFull(p), pos: p.pos, nat: p.nat, y0: p.cs.y0, y1: null, gp: p.cs.gp, g: p.cs.g, a: p.cs.a }));
  return [...(G.hof || []).filter(h => h.club === G.userTid), ...cur].sort((a, b) => b.gp + b.g * 2 - (a.gp + a.g * 2));
}
function rec() { if (!G.rec || G.rec.tid !== G.userTid) G.rec = { tid: G.userTid, unb: 0, win: 0 }; return G.rec; }
function recordsAfterMatch(x, res) {
  const u = userTeam(), R = rec(), home = x.m.h === u.id, side = home ? 0 : 1;
  const my = home ? res.hg : res.ag, op = home ? res.ag : res.hg, opp = G.teams[home ? x.m.a : x.m.h];
  for (const id of [...(res.lu ? res.lu[side] : []), ...(res.sb ? res.sb[side] : [])]) { const p = G.players[id]; if (p) clubStat(p, 'gp'); }
  for (const e of res.ev) if (e.side === side) { const p = G.players[e.pid], a = G.players[e.aid]; if (p) clubStat(p, 'g'); if (a) clubStat(a, 'a'); }
  const tag = { s: `${my}:${op}`, opp: opp.short, y: seasonTxt() };
  if (my - op > 0 && (!R.bigW || my - op > R.bigW.d || (my - op === R.bigW.d && my > R.bigW.g))) R.bigW = { ...tag, d: my - op, g: my };
  if (op - my > 0 && (!R.bigL || op - my > R.bigL.d)) R.bigL = { ...tag, d: op - my };
  if (res.crowd && (!R.att || res.crowd.att > R.att.n)) R.att = { n: res.crowd.att, opp: opp.short, y: seasonTxt() };
  R.unb = my >= op ? R.unb + 1 : 0; R.win = my > op ? R.win + 1 : 0;
  if (!R.unbB || R.unb > R.unbB.n) R.unbB = { n: R.unb, y: seasonTxt() };
  if (!R.winB || R.win > R.winB.n) R.winB = { n: R.win, y: seasonTxt() };
}
function recordsSeasonEnd() {
  const R = rec(), top = teamPlayers(userTeam()).sort((a, b) => b.s.g - a.s.g)[0];
  if (top && top.s.g && (!R.sg || top.s.g > R.sg.n)) R.sg = { n: top.s.g, name: pFull(top), y: seasonTxt() };
}

// ── Výročie klubu a retro dres ──────────────────────────────────
const FOUNDED = { slovan: 1919, trnava: 1923, dac: 1904, kosice: 1952, zilina: 1908, trencin: 1992, dukla: 1965, ruzomberok: 1906, michalovce: 1912, podbrezova: 1920, komarno: 1900, skalica: 1920, presov: 1898, petrzalka: 1898, nitra: 1909, tatran: 1898 };
function founded(t) { return FOUNDED[t.key] || 1905 + (U.hash(t.name) % 80); }
function anniversary(t) { const y = G.year - founded(t); return y > 0 && y % 25 === 0 ? y : 0; }
function retroOn() { return !!(G.retro && G.retro.year === G.year && G.retro.tid === G.userTid); }
function retroCost() { return U.nice(lwb(userTeam().lvl) * 2); }
function retroF() { return retroOn() ? (anniversary(userTeam()) ? 1.3 : 1.15) : 1; }
function orderRetro() {
  const u = userTeam();
  if (retroOn()) return 'Retro dres už máš.';
  if (u.budget < retroCost()) return 'Nemáš dosť peňazí.';
  book('invest', -retroCost());
  G.retro = { year: G.year, tid: u.id, kit0: { ...u.kit } };
  u.kit = { ...u.kit, pat: u.kit.pat === 'plain' ? 'hoops' : 'plain' };
  if (G.biz) G.biz.mood = Math.min(100, (G.biz.mood ?? 60) + 6);
  news(`👕 Retro dres je v predaji – fanúšikovia ho milujú!`, 'good');
  return null;
}
function retroSeasonEnd() {
  if (G.retro && G.retro.kit0 && G.teams[G.retro.tid]) G.teams[G.retro.tid].kit = G.retro.kit0;
  G.retro = null;
}

// ── B-tím ──────────────────────────────────────────────────────
function bCost() { return U.nice(lwb(userTeam().lvl) * 8); }
function foundB() {
  const u = userTeam();
  if (bTeam()) return 'B-tím už máš.';
  if (G.bPending === G.year) return 'B-tím už zakladáš.';
  if (u.lvl >= 8) return 'B-tím môže mať len klub z vyšších súťaží.';
  if (u.budget < bCost()) return 'Nemáš dosť peňazí.';
  book('invest', -bCost());
  G.bPending = G.year;
  news('🅱️ B-tím bude hrať od budúcej sezóny v najnižšej súťaži regiónu.', 'good');
  return null;
}
function createBTeam() {
  const u = userTeam();
  const lvls = G.leagues.filter(l => l.reg === u.reg || l.reg == null).map(l => l.lvl);
  const lvl = Math.max(...lvls), lg = G.leagues.find(l => l.lvl === lvl && (l.reg === u.reg || l.reg == null));
  const short = (u.short.slice(0, 2) + 'B').toUpperCase();
  const t = newTeam({ name: u.name + ' B', short, city: u.city, reg: u.reg, lvl, kit: [u.kit.p, u.kit.s, u.kit.sh, u.kit.pat], budget: LEVEL_INFO[lvl].budget, stadium: (u.stadium || u.city) + ' – vedľajšie ihrisko', parent: u.id, form: u.form });
  t.hu = u.hu; t.fa = 20; t.dis = { y: 0, r: 0 }; t.inc = 0;
  t.lid = lg.id; lg.tids.push(t.id);
  const counts = { GK: 2, DF: 6, MF: 6, FW: 4 };
  const base = Math.max(LEVEL_INFO[lvl].base + 4, LEVEL_INFO[u.lvl].base - 18);
  for (const pos in counts) for (let k = 0; k < counts[pos]; k++) { const p = genPlayer(t.id, pos, base, { young: true, hu: t.hu }); t.pids.push(p.id); }
  assignNumbers(t); autoLineup(t);
  G.bPending = null;
  news(`🅱️ ${t.name} začína v súťaži ${lg.name}.`, 'good');
}
function moveToB(p) {
  const B = bTeam();
  if (!B) return 'Nemáš B-tím.';
  if (p.tid !== G.userTid) return null;
  if (teamPlayers(userTeam()).length <= 16) return 'V A-tíme musí ostať aspoň 16 hráčov.';
  const w = p.w, ce = p.ce;
  moveToTeam(p, B, true); p.w = w; p.ce = ce;
  return null;
}
function moveToA(p) {
  const B = bTeam();
  if (!B || p.tid !== B.id) return null;
  if (teamPlayers(userTeam()).length >= 30) return 'A-tím má plný káder.';
  const w = p.w, ce = p.ce;
  moveToTeam(p, userTeam(), true); p.w = w; p.ce = ce;
  return null;
}

// ── Dorast U19: liga a letný turnaj ────────────────────────────
const U19_CUP = ['Sparta Praha U19', 'Rapid Viedeň U19', 'Ferencváros U19', 'Legia Varšava U19', 'Dinamo Záhreb U19', 'Slavia Praha U19', 'Austria Viedeň U19', 'Wisła Krakov U19'];
function u19Name(lvl) { return lvl === 1 ? 'I. liga dorastu U19' : lvl === 2 ? 'II. liga dorastu U19' : 'Krajská liga dorastu U19'; }
function u19Squad() {
  const B = bTeam();
  return [...teamPlayers(userTeam()), ...(B ? teamPlayers(B) : [])].filter(p => p.age <= 19).sort((a, b) => b.r - a.r);
}
function u19Rating() {
  // najlepších 11 – chýbajúcich doplnia hráči z dorastu klubu (podľa akadémie)
  const u = userTeam(), fill = LEVEL_INFO[u.lvl].base - 12 + 2 * ((G.biz && G.biz.fac.youth) || 0);
  const sq = u19Squad().map(p => p.r).concat(Array(11).fill(fill)).sort((a, b) => b - a).slice(0, 11);
  return U.avg(sq);
}
function u19() {
  const u = userTeam();
  if (G.u19 && G.u19.year === G.year && G.u19.tid === u.id) return G.u19;
  const lg = leagueOf(u);
  const others = lg.tids.filter(id => id !== u.id && G.teams[id].parent == null).map(id => G.teams[id]);
  const pool = others.length >= 11 ? others.sort((a, b) => Math.abs(teamBase(a) - teamBase(u)) - Math.abs(teamBase(b) - teamBase(u))).slice(0, 11)
    : others.concat(G.teams.filter(t => !t.fx && t.parent == null && t.id !== u.id && !others.includes(t) && Math.abs(t.lvl - u.lvl) <= 1).slice(0, 11 - others.length));
  const teams = [{ tid: u.id, r: 0 }, ...pool.map(t => ({ tid: t.id, r: Math.round(teamBase(t) - 13 + U.rf(-3, 3)) }))];
  const sched = roundRobin(teams.map((_, i) => i)); const rounds = sched.concat(sched.map(rd => rd.map(([h, a]) => [a, h])));
  G.u19 = { year: G.year, tid: u.id, name: u19Name(u.lvl), teams, rounds, res: [], cur: 0, sc: {} };
  // letný medzinárodný turnaj dorastu
  const field = U.shuffle(U19_CUP.slice()).slice(0, 7).map(n => ({ n, r: LEVEL_INFO[Math.min(3, u.lvl)].base - 8 + U.rf(-4, 6) }));
  let alive = [{ n: u.name + ' U19', r: u19Rating(), me: true }, ...field];
  const log = [];
  while (alive.length > 1) {
    const nx = [];
    for (let i = 0; i < alive.length; i += 2) {
      const a = alive[i], b = alive[i + 1], [ga, gb] = u19Score(a.r, b.r, false);
      const w = ga > gb || (ga === gb && U.chance(0.5)) ? a : b;
      if (a.me || b.me) log.push(`${a.me ? 'Tvoj dorast' : a.n} ${ga}:${gb} ${b.me ? 'tvoj dorast' : b.n}`);
      nx.push(w);
    }
    alive = nx;
  }
  G.u19.cup = { won: !!alive[0].me, winner: alive[0].me ? u.name + ' U19' : alive[0].n, log };
  if (alive[0].me) { G.trophies.push({ season: seasonTxt(), name: 'Medzinárodný turnaj dorastu', type: 'reg', lvl: 0 }); news('🏆 Tvoj dorast vyhral medzinárodný letný turnaj!', 'good'); }
  return G.u19;
}
function u19Score(ra, rb, home = true) {
  const la = Math.min(4.5, 1.35 * Math.exp((ra - rb) / 12) * (home ? 1.1 : 1)), lb = Math.min(4.5, 1.35 * Math.exp((rb - ra) / 12));
  return [U.poisson(la), U.poisson(lb)];
}
function u19Day(ev) {
  if (ev.t !== 'L') return;
  const y = u19();
  if (y.cur >= y.rounds.length) return;
  const u = userTeam(), ur = u19Rating(), sq = u19Squad().filter(p => !u.lineup.includes(p.id));
  for (const [hi, ai] of y.rounds[y.cur]) {
    const H = y.teams[hi], A = y.teams[ai];
    const rh = H.tid === u.id ? ur : H.r, ra = A.tid === u.id ? ur : A.r;
    const [hg, ag] = u19Score(rh, ra);
    y.res.push([hi, ai, hg, ag]);
    const myG = H.tid === u.id ? hg : A.tid === u.id ? ag : -1;
    if (myG < 0) continue;
    for (const p of sq) { p.s.yg = (p.s.yg || 0) + 1; p.xp = Math.min(100, (p.xp ?? 20) + 0.3); }
    for (let g = 0; g < myG && sq.length; g++) { const s = U.weighted(sq, p => ({ FW: 3, MF: 1.5, DF: 0.4, GK: 0 })[p.pos]); s.s.yG = (s.s.yG || 0) + 1; y.sc[s.id] = (y.sc[s.id] || 0) + 1; }
  }
  y.cur++;
  if (y.cur === y.rounds.length) {
    const tb = u19Table(y);
    if (tb[0].tid === u.id) { G.trophies.push({ season: seasonTxt(), name: y.name, type: 'reg', lvl: 0 }); news(`🏆 Tvoj dorast vyhral ${y.name}!`, 'good'); }
  }
}
function u19Table(y) {
  const rows = y.teams.map((t, i) => ({ i, tid: t.tid, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 }));
  for (const [h, a, hg, ag] of y.res) {
    const H = rows[h], A = rows[a];
    H.p++; A.p++; H.gf += hg; H.ga += ag; A.gf += ag; A.ga += hg;
    if (hg > ag) { H.w++; A.l++; H.pts += 3; } else if (hg < ag) { A.w++; H.l++; A.pts += 3; } else { H.d++; A.d++; H.pts++; A.pts++; }
  }
  return rows.sort((a, b) => b.pts - a.pts || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
}

// ── Ženský tím ────────────────────────────────────────────────
const WOM_CLUBS = ['Slovan Bratislava', 'Spartak Myjava', 'Partizán Bardejov', 'MFK Ružomberok', 'FC Petržalka', 'Spartak Trnava', 'FC Nitra', 'MŠK Žilina', 'FK Poprad', 'FC Košice', 'Dukla B. Bystrica', 'Spartak Bánovce'];
function womCost() { return U.nice(lwb(userTeam().lvl) * 5); }
function womWeekly() { const w = G.womOn && G.womOn.tid === G.userTid ? G.womOn : null; return w ? U.nice(lwb(userTeam().lvl) * 0.025 * (1 + w.sup)) : 0; }
function foundWomen() {
  const u = userTeam();
  if (G.womOn && G.womOn.tid === u.id) return 'Ženský tím už máš.';
  if (u.budget < womCost()) return 'Nemáš dosť peňazí.';
  book('invest', -womCost());
  G.womOn = { tid: u.id, sup: 0, since: G.year };
  G.wom = null;
  news('⚽ Klub založil ženský tím – začína hrať ligu žien.', 'good');
  return null;
}
function supportWomen() {
  const w = G.womOn;
  if (!w || w.tid !== G.userTid) return 'Nemáš ženský tím.';
  if (w.sup >= 3) return 'Ženský tím má maximálnu podporu.';
  const c = U.nice(womCost() * (w.sup + 1) * 0.8);
  if (userTeam().budget < c) return 'Nemáš dosť peňazí.';
  book('invest', -c); w.sup++;
  if (G.wom) G.wom.teams[0].r += 5;
  return null;
}
function wom() {
  const u = userTeam(), w = G.womOn;
  if (!w || w.tid !== u.id) return null;
  if (G.wom && G.wom.year === G.year && G.wom.tid === u.id) return G.wom;
  const short = u.name.replace(/^(FK|FC|MFK|MŠK|ŠK|OFK|TJ|1\.|AS|KFC)\s+/i, '');
  const names = U.shuffle(WOM_CLUBS.filter(n => !n.includes(short.split(' ')[0]))).slice(0, 7);
  const teams = [{ n: u.name, r: 46 + w.sup * 6 + U.rf(-3, 3), me: true }, ...names.map(n => ({ n, r: U.rf(40, 62) }))];
  const sched = roundRobin(teams.map((_, i) => i));
  G.wom = { year: G.year, tid: u.id, teams, rounds: sched.concat(sched.map(rd => rd.map(([h, a]) => [a, h]))), res: [], cur: 0 };
  return G.wom;
}
function womDay(ev) {
  if (ev.t !== 'L' || ev.r % 2) return;
  const y = wom();
  if (!y || y.cur >= y.rounds.length) return;
  for (const [hi, ai] of y.rounds[y.cur]) { const [hg, ag] = u19Score(y.teams[hi].r, y.teams[ai].r); y.res.push([hi, ai, hg, ag]); }
  y.cur++;
  book('women', -womWeekly() * 2);
  if (y.cur === y.rounds.length) {
    const tb = u19Table(y);
    if (tb[0].i === 0) {
      G.trophies.push({ season: seasonTxt(), name: 'Liga žien', type: 'league', lvl: 0 });
      if (G.biz) { G.biz.fans = Math.round(G.biz.fans * 1.02); G.biz.mood = Math.min(100, (G.biz.mood ?? 60) + 4); }
      news('🏆 Ženský tím vyhral ligu žien!', 'good');
    }
  }
}

// ── Denné a sezónne napojenie ──────────────────────────────────
function clubDay(ev) {
  if (!ev || G.userTid < 0) return;
  boardObjDay(ev);
  if (ev.t === 'L') { boardReview(ev); u19Day(ev); womDay(ev); }
}
function onSeasonStart() {
  aiFinanceSeason();
  if (G.userTid < 0) return;
  const u = userTeam(), an = anniversary(u);
  licNotice();
  if (an) inboxAdd({ type: 'info', text: `🎂 ${u.name} oslavuje ${an} rokov od založenia (${founded(u)}). Retro dres k výročiu predá ešte viac suvenírov.` });
}
function clubSeasonEnd(sum) {
  recordsSeasonEnd();
  goalsCheck(sum);
  boardSeasonEnd(sum);
  retroSeasonEnd();
  mafiaSeasonEnd(sum);
}
