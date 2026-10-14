'use strict';
// ─── Vedenie: zmluva na sezónu (rozpočet na prestupy, limit platov, plat trénera), rokovanie, úlohy ───

// ── Zmluva s vedením ───────────────────────────────────────────
function boardDeal(b) {
  const u = userTeam();
  const tb0 = u.budget > 0 ? U.nice(Math.min(u.budget, Math.max(lwb(u.lvl) * 1.5, u.budget * 0.5))) : 0;
  const sal0 = U.nice(Math.max(30, lwb(u.lvl) * 0.07 * (1 + (b.conf - 60) / 200)));
  b.deal = { y: G.year, tb0, tb: tb0, wc0: b.wageCap, wc: b.wageCap, sal0, sal: sal0, bonus: U.nice(sal0 * 5), neg: false, tries: 0 };
  b.tbUsed = 0; b.sales = 0; b.att = []; b.derbyL = 0; b.wageOver = false; b.bud0 = u.budget;
  b.objs = genObjectives(b);
}
const deal = () => board().deal;
function tbLeft() { const b = board(); return Math.round(b.deal.tb + 0.5 * (b.sales || 0) - (b.tbUsed || 0)); }
function tbCheck(amount) { const l = tbLeft(); return amount > l ? `Prekročíš rozpočet na prestupy od vedenia (zostáva ${U.money(Math.max(0, l))}).` : null; }
// výdavky a príjmy z prestupov
function boardBook(cat, amount) {
  const b = G.board;
  if (!b || b.tid !== G.userTid || !b.deal) return;
  if (amount < 0 && (cat === 'buys' || cat === 'agents' || cat === 'loans')) b.tbUsed = (b.tbUsed || 0) - amount;
  if (amount > 0 && cat === 'sales') b.sales = (b.sales || 0) + amount;
}
// žiadosť o vyšší limit platov (2× za sezónu)
function askWageRaise(need) {
  const b = board(), u = userTeam();
  if ((b.wAskY !== G.year)) { b.wAskY = G.year; b.wAsk = 0; }
  if (b.wAsk >= 2) return { res: 'no', msg: 'Vedenie o platoch túto sezónu už nechce hovoriť.' };
  b.wAsk++;
  need = U.nice(Math.max(need, b.wageCap * 0.03));
  const pct = need / b.wageCap, rich = u.budget / Math.max(1, lwb(u.lvl) * 10);
  const p = U.clamp(0.3 + (b.conf - 50) / 90 + (rich > 3 ? 0.15 : rich < 1 ? -0.25 : 0) + (owner().k === 'inv' ? 0.15 : owner().k === 'city' ? -0.12 : 0) - pct * 2.2, 0.03, 0.95);
  if (U.chance(p)) { b.wageCap += need; b.conf = Math.max(0, b.conf - 2); return { res: 'ok', add: need, msg: `Vedenie súhlasí: limit platov +${U.money(need)}/týž.` }; }
  if (pct <= 0.15 && U.chance(p + 0.25)) { const h = U.nice(need / 2); b.wageCap += h; b.conf = Math.max(0, b.conf - 1); return { res: 'part', add: h, msg: `Vedenie pridá len polovicu: +${U.money(h)}/týž.` }; }
  b.conf = Math.max(0, b.conf - 1);
  return { res: 'no', msg: 'Vedenie navýšenie odmietlo.' };
}
const negOpen = () => { const d = deal(), w = seasonWindows()[0]; return !d.neg && w && G.day <= w[1]; };

// ── Rokovanie ──────────────────────────────────────────────────
// koľko si môžeš dovoliť pýtať navyše (podľa dôvery, majiteľa a peňazí klubu)
function negAllow() {
  const b = board(), u = userTeam();
  return 0.04 + Math.max(0, b.conf - 40) / 100 * 0.32 + (owner().k === 'inv' ? 0.08 : owner().k === 'city' ? -0.03 : 0) + (u.budget > lwb(u.lvl) * 25 ? 0.05 : 0);
}
function negAsk(p) { const d = deal(); return 0.35 * (p.tb / Math.max(1, d.tb0) - 1) * (d.tb0 ? 1 : 0) + 1.0 * (p.wc / d.wc0 - 1) + 0.3 * (p.sal / d.sal0 - 1); }
// 0 = súhlas, 1 – 2 = súhlas s prísnejšími podmienkami, 3 = odmietnutie, −1 = skromná ponuka
function negLevel(p) {
  const a = negAsk(p), al = negAllow();
  if (a < -0.08) return -1;
  if (a <= al) return 0;
  if (a <= al + 0.12) return 1;
  if (a <= al + 0.24) return 2;
  return 3;
}
function negTerms(lv) {
  const b = board(), t = b.goal.target, out = [];
  if (lv === -1) out.push('Vedenie ocení skromnosť – dôvera +5 %');
  if (lv >= 1) out.push(t > 1 ? `Cieľ sezóny: do ${t - 1}. miesta` : 'Jedna úloha navyše bude povinná');
  if (lv >= 2) out.push('Ďalšia povinná úloha');
  return out;
}
function negotiate(p) {
  const b = board(), d = b.deal, lv = negLevel(p);
  if (d.neg) return { err: 'O zmluve si sa už tento rok dohodol.' };
  if (lv === 3) {
    d.tries++;
    if (d.tries >= 3) { d.neg = true; b.conf = U.clamp(b.conf - 3, 0, 100); return { res: 'angry' }; }
    return { res: 'reject' };
  }
  d.tb = p.tb; d.wc = p.wc; d.sal = p.sal; d.bonus = U.nice(p.sal * 5); d.neg = true;
  b.wageCap = p.wc;
  if (lv === -1) b.conf = U.clamp(b.conf + 5, 0, 100);
  if (lv >= 1) {
    if (b.goal.target > 1) b.goal.target--;
    else { const o = b.objs.find(o => !o.must && o.k !== 'league'); if (o) o.must = true; }
  }
  if (lv >= 2) {
    const o = b.objs.find(o => !o.must && o.k !== 'league');
    if (o) o.must = true; else { const n = genObjectives(b, 1, true)[0]; if (n) b.objs.push(n); }
  }
  inboxAdd({ type: 'info', text: `🤝 Dohoda s vedením: na prestupy ${U.money(d.tb)}, platy do ${U.money(d.wc)}/týž., tvoj plat ${U.money(d.sal)}/týž.` });
  return { res: 'ok', lv };
}
function acceptDefault() { const d = deal(); d.neg = true; }

// ── Úlohy na sezónu ────────────────────────────────────────────
const OBJ_W = { inv: { cup: 3, goals: 3, euro: 4, sell: 1, fac: 1 }, city: { youth: 4, svk: 3, profit: 3, fac: 2, att: 1 }, fans: { att: 4, derby: 3, goals: 2, youth: 1 }, spon: { profit: 3, att: 3, cup: 2, sell: 2 } };
const objIc = { league: '🏆', cup: '🥇', youth: '🌱', goals: '⚽', att: '👥', profit: '💶', sell: '💰', svk: '🇸🇰', wage: '📋', euro: '🌍', derby: '⚔️', fac: '🏗️' };
function spCup() { return G.cups && G.cups.sp; }
function cupWins(c, tid) { if (!c) return 0; let n = 0; for (const rd of c.rounds) { const m = rd.find(m => m.h === tid || m.a === tid); if (m && m.w === tid) n++; } return n; }
// extra = úloha navyše k existujúcim (pri rokovaní), inak nové úlohy na sezónu vrátane hlavného cieľa
function genObjectives(b, n = 3, extra = false) {
  const u = userTeam(), lg = leagueOf(u), have = new Set(extra ? (b.objs || []).map(o => o.k) : []);
  const out = extra ? [] : [{ k: 'league', must: true }];
  const forceMust = extra;
  const W = Object.assign({ wage: 1, goals: 1, profit: 1 }, OBJ_W[owner().k]);
  const ranks = lg.tids.map(id => G.teams[id]).sort((a, c) => teamRating(c) - teamRating(a)), r = ranks.indexOf(u) + 1, nT = ranks.length;
  const sp = spCup();
  const can = {
    cup: sp && sp.entrants.includes(u.id),
    youth: teamPlayers(u).filter(p => p.age <= 21).length >= 4,
    goals: true, att: !!G.biz, profit: true, sell: u.lvl <= 3, svk: true, wage: true,
    euro: typeof userEuro === 'function' && userEuro().length > 0,
    derby: lg.tids.some(id => id !== u.id && rivalry(u, G.teams[id])),
    fac: !!G.biz,
  };
  const pool = Object.keys(W).filter(k => can[k] && !have.has(k) && !out.some(o => o.k === k));
  for (let i = 0; i < n && pool.length; i++) {
    const k = U.weighted(pool, x => W[x]);
    pool.splice(pool.indexOf(k), 1);
    const o = { k, must: forceMust };
    if (k === 'cup') { const R = sp.names.length; o.t = U.clamp(u.lvl === 1 ? R - 2 : u.lvl === 2 ? R - 3 : Math.ceil(R / 2), 1, R); }
    else if (k === 'youth') o.t = u.lvl <= 2 ? 25 : 35;
    else if (k === 'goals') o.t = Math.round(leagueRoundCount(lg) * (r <= nT / 3 ? 1.85 : r <= nT * 2 / 3 ? 1.45 : 1.15));
    else if (k === 'att') { const cap = capacity(), occ = G.biz.attLast ? U.clamp(G.biz.attLast / cap, 0.3, 0.9) : 0.55; o.t = U.nice(cap * Math.min(0.95, occ + 0.08)); }
    else if (k === 'sell') o.t = U.nice(lwb(u.lvl) * 12);
    else if (k === 'svk') o.t = u.lvl <= 2 ? 12 : 16;
    else if (k === 'euro') o.c = userEuro()[0].id;
    else if (k === 'fac') { const f = G.biz.fac, opts = ['youth', 'train', 'lights', 'medical', 'stad'].filter(x => (f[x] || 0) < FAC[x].max); o.f = U.pick(opts); o.t = (f[o.f] || 0) + 1; }
    out.push(o);
  }
  return out;
}
// priebeh úlohy: { cur, t, txt, done: true | false | null (ešte sa rozhodne), pct }
function objState(o, final) {
  const b = board(), u = userTeam(), row = ulRow();
  const r = (cur, t, txt, done, pct) => ({ cur, t, txt, done, pct: U.clamp(pct ?? (t ? cur / t : 0), 0, 1) });
  switch (o.k) {
    case 'league': return r(row.pos, b.goal.target, `${BOARD_GOALS[b.goal.k]} – do ${b.goal.target}. miesta`, final ? (b.goal.k === 'promo' ? null : row.pos <= b.goal.target) : null, row.pos <= b.goal.target ? 1 : b.goal.target / row.pos);
    case 'cup': { const c = spCup(), w = cupWins(c, u.id), out = c && !c.alive.includes(u.id) && c.winner !== u.id; return r(w, o.t, `Slovenský pohár – postup do: ${cupRoundName(c, o.t)}`, w >= o.t ? true : out || final ? false : null); }
    case 'youth': { const n = teamPlayers(u).filter(p => p.age <= 21).reduce((a, p) => a + p.s.gp, 0); return r(n, o.t, `Hráči do 21 rokov odohrajú ${o.t} zápasov`, n >= o.t ? true : final ? false : null); }
    case 'goals': { const t = leagueTable(leagueOf(u)).find(x => x.tid === u.id), g = t ? t.gf : 0; return r(g, o.t, `Strelíme ${o.t} ligových gólov`, g >= o.t ? true : final ? false : null); }
    case 'att': { const a = b.att && b.att.length ? Math.round(U.avg(b.att)) : 0; return r(a, o.t, `Priemerná návštevnosť ${o.t.toLocaleString('sk-SK')}`, final ? a >= o.t : null); }
    case 'profit': { const d = u.budget - b.bud0; return r(d, 0, 'Sezóna bez straty', final ? d >= 0 : null, d >= 0 ? 1 : 0.4); }
    case 'sell': return r(b.sales || 0, o.t, `Predaj hráčov aspoň za ${U.money(o.t)}`, (b.sales || 0) >= o.t ? true : final ? false : null);
    case 'svk': { const n = teamPlayers(u).filter(p => p.nat === 'SVK').length; return r(n, o.t, `Aspoň ${o.t} Slovákov v kádri`, final ? n >= o.t : null); }
    case 'wage': return r(b.wageOver ? 0 : 1, 1, 'Platy celú sezónu pod limitom', b.wageOver ? false : final ? true : null, b.wageOver ? 0 : 1);
    case 'euro': { const c = (typeof euroList === 'function' ? euroList() : []).find(x => x.id === o.c); const ok = c && c.cur >= 6 && (c.alive.includes(u.id) || c.ko.some(rd => rd.some(m => m.h === u.id || m.a === u.id))); const out = c && !c.alive.includes(u.id) && !ok; return r(ok ? 1 : 0, 1, `${c ? c.name : 'Európa'} – postup zo skupiny`, ok ? true : out || final ? false : null); }
    case 'derby': return r(b.derbyL || 0, 0, 'Neprehrať ani jedno derby', b.derbyL ? false : final ? true : null, b.derbyL ? 0 : 1);
    case 'fac': { const lv = (G.biz.fac[o.f] || 0); return r(lv, o.t, `${FAC[o.f].name} – úroveň ${o.t}`, lv >= o.t ? true : final ? false : null); }
  }
  return r(0, 0, '?', null);
}
const objReward = o => (o.must ? { conf: 6, cash: 0 } : { conf: 4, cash: U.nice(lwb(userTeam().lvl) * 3) });
const objPenalty = o => (o.must ? 9 : 2);
// priebežne: platy nad limitom, splnené úlohy
function boardObjDay(ev) {
  const b = board();
  if (!b.deal) return;
  if (ev && ev.t === 'L') {
    if (teamWageBill(userTeam()) > b.wageCap * 1.001) b.wageOver = true;
    book('staff', -b.deal.sal); G.coachCash = (G.coachCash || 0) + b.deal.sal;
  }
  for (const o of b.objs) {
    if (o.k === 'league' || o.ann) continue;
    const s = objState(o, false);
    if (s.done === true) { o.ann = 1; news(`🎯 Úloha od vedenia splnená: ${s.txt}`, 'good'); }
    if (s.done === false) { o.ann = 1; news(`❌ Úloha od vedenia nesplnená: ${s.txt}`, 'bad'); }
  }
}
function boardObjAfterMatch(x, res) {
  const b = board(), u = userTeam(), home = x.m.h === u.id;
  if (home && !x.m.neutral && res.crowd) (b.att = b.att || []).push(res.crowd.att);
  const opp = G.teams[home ? x.m.a : x.m.h], my = home ? res.hg : res.ag, op = home ? res.ag : res.hg;
  const lost = my < op || ((x.comp === 'C' || x.ko) && x.m.w != null && x.m.w !== u.id);
  if (lost && rivalry(u, opp)) b.derbyL = (b.derbyL || 0) + 1;
}
// stav úloh na konci sezóny – ešte pred postupmi a zostupmi
function boardObjSnap() {
  const b = G.board;
  if (!b || b.tid !== G.userTid || !b.objs) return [];
  return b.objs.filter(o => o.k !== 'league').map(o => ({ o, s: objState(o, true) }));
}
const coachSal = () => (G.board && G.board.tid === G.userTid && G.board.deal ? G.board.deal.sal : 0);
// koniec sezóny: vyhodnotenie úloh (hlavný cieľ rieši boardSeasonEnd)
function boardObjEnd(sum) {
  const b = board(), u = userTeam(), out = [];
  let done = 0, dc = 0, cash = 0;
  for (const { o, s } of sum.objSnap || []) {
    const ok = s.done === true;
    if (ok) { done++; const rw = objReward(o); dc += rw.conf; cash += rw.cash; }
    else dc -= objPenalty(o);
    out.push({ txt: s.txt, ok, must: o.must });
  }
  if (cash) book('grant', cash);
  const mainOk = sum.board ? sum.board.met : false;
  const n = done + (mainOk ? 1 : 0);
  if (n && b.deal) { const bon = b.deal.bonus * n; book('staff', -bon); G.coachCash = (G.coachCash || 0) + bon; sum.coachBonus = bon; }
  b.conf = U.clamp(b.conf + dc, 0, 100);
  sum.objs = out; sum.objCash = cash;
  if (sum.board) sum.board.conf = Math.round(b.conf);
  if (b.hist[0]) { b.hist[0].objs = `${done}/${out.length}`; b.hist[0].conf = Math.round(b.conf); }
  if (b.conf < 15) { b.sacked = true; b.offers = jobOffers(false); sum.jobs = b.offers.slice(); }
}
