'use strict';
// ─── Biznis klubu: sponzori, vstupné, štadión, fanúšikovia, investície, mimoriadne ponuky ───

const REAL_CAPACITY = { slovan: 22500, trnava: 19000, dac: 12700, kosice: 12555, zilina: 10897, trencin: 10000, dukla: 7831, ruzomberok: 4876, michalovce: 4400, podbrezova: 4061, komarno: 4008, skalica: 2494 };
const DEF_CAP = { 1: 6000, 2: 4000, 3: 2500, 4: 1500, 5: 1000, 6: 700, 7: 500, 8: 400, 9: 300 };
const DEF_TICKET = { 1: 10, 2: 6, 3: 4, 4: 3, 5: 2, 6: 2, 7: 1.5, 8: 1, 9: 1 };
const CATER_SPEND = { 1: 3, 2: 2, 3: 1.5, 4: 1.2, 5: 1, 6: 0.8, 7: 0.6, 8: 0.5, 9: 0.5 };
const MERCH_FAN = { 1: 1.2, 2: 0.9, 3: 0.7, 4: 0.5, 5: 0.5, 6: 0.4, 7: 0.4, 8: 0.3, 9: 0.3 };
// náklady na organizáciu zápasu na jedného diváka (usporiadatelia, bezpečnosť, upratovanie, energie)
const MATCH_COST = { 1: 2.6, 2: 1.6, 3: 1.1, 4: 0.85, 5: 0.6, 6: 0.55, 7: 0.42, 8: 0.32, 9: 0.3 };

const SLOTS = {
  main: { name: 'Hlavný sponzor', ic: '👕', w: 0.40, types: ['fixed', 'win', 'goal'], desc: 'Logo na prsiach dresu' },
  kit: { name: 'Výrobca dresov', ic: '🧵', w: 0.15, types: ['fixed', 'merch'], desc: 'Dodáva dresy a podieľa sa na predaji suvenírov' },
  naming: { name: 'Názov štadióna', ic: '🏟️', w: 0.12, types: ['fixed'], desc: 'Štadión ponesie meno sponzora' },
  p1: { name: 'Partner', ic: '🤝', w: 0.08, types: ['fixed', 'win'], desc: 'Reklamné panely a partnerstvo' },
  p2: { name: 'Partner', ic: '🤝', w: 0.08, types: ['fixed', 'win'], desc: 'Reklamné panely a partnerstvo' },
};
const SP_TYPE = { fixed: 'Pevná suma', win: 'Prémia za výhru', goal: 'Bonus za umiestnenie', merch: 'Podiel zo suvenírov' };

const FAC = {
  stad: { cat: 'stadium', name: 'Štadión', ic: '🏟️', max: 15, cost: [5, 8, 12, 17, 24, 32, 42, 50, 60, 70, 80, 92, 104, 118, 132], days: [3, 4, 5, 6, 8, 10, 12, 13, 14, 15, 16, 18, 20, 22, 24], eff: 'Úrovne 1 – 7: kapacita +18 % za úroveň, 6 a 7 = horná tribúna. Úrovne 8 – 15: veľký štadión až na 50 000 miest' },
  lights: { cat: 'stadium', name: 'Osvetlenie a obrazovka', ic: '💡', max: 3, cost: [3, 6, 10], days: [2, 3, 4], req: { stad: 1 }, eff: '+3 % divákov za úroveň, TV príjmy +10 % za úroveň' },
  vip: { cat: 'stadium', name: 'VIP lóže', ic: '🥂', max: 3, cost: [4, 7, 11], days: [3, 4, 5], req: { stad: 2 }, eff: 'Extra príjem z každého domáceho zápasu' },
  park: { cat: 'stadium', name: 'Parkovisko', ic: '🅿️', max: 3, cost: [2, 3.5, 5], days: [2, 2, 3], eff: '+6 % divákov za úroveň' },
  heat: { cat: 'stadium', name: 'Vyhrievaný trávnik', ic: '♨️', max: 3, cost: [3, 5, 8], days: [2, 3, 3], req: { stad: 1 }, eff: 'Väčšia výhoda domáceho prostredia, trávnik bez chorôb' },
  roof: { cat: 'stadium', name: 'Zastrešenie tribún', ic: '⛱️', max: 3, cost: [6, 9, 13], days: [3, 4, 5], req: { stad: 2 }, eff: 'Viac divákov aj v zlom počasí' },
  seats: { cat: 'stadium', name: 'Moderné sedadlá', ic: '💺', max: 3, cost: [3, 5, 8], days: [2, 3, 3], req: { stad: 1 }, eff: 'Diváci zaplatia viac za lístok, mozaika z farieb klubu' },
  led: { cat: 'stadium', name: 'LED mantinely', ic: '🟩', max: 3, cost: [3, 5, 8], days: [1, 2, 2], req: { lights: 1 }, eff: 'Vyššie príjmy od sponzorov' },
  facade: { cat: 'stadium', name: 'Fasáda a vstup', ic: '🎨', max: 3, cost: [4, 7, 11], days: [3, 4, 5], req: { stad: 3 }, eff: 'Prestíž: lepší sponzori a rýchlejší rast fanúšikov' },
  kotol: { cat: 'stadium', name: 'Fanúšikovský kotol', ic: '🥁', max: 3, cost: [2, 3.5, 5], days: [1, 2, 2], req: { stad: 1 }, eff: 'Väčšia výhoda doma a lepšia nálada, ale vyššie riziko výtržností' },
  family: { cat: 'stadium', name: 'Rodinná zóna', ic: '🧸', max: 2, cost: [2.5, 4], days: [2, 2], eff: 'Viac nových fanúšikov a menej výtržností' },
  fanzone: { cat: 'stadium', name: 'Fanzóna', ic: '🎉', max: 3, cost: [2.5, 4.5, 7], days: [2, 2, 3], eff: 'Lepšia nálada fanúšikov a viac predaných suvenírov' },
  train: { cat: 'football', name: 'Tréningové centrum', ic: '🏋️', max: 5, cost: [4, 7, 11, 16, 22], days: [3, 4, 5, 6, 7], eff: 'Hráči sa rýchlejšie zlepšujú a pomalšie starnú. Hráčom z klubov s horšími podmienkami stúpne potenciál' },
  recov: { cat: 'football', name: 'Regeneračné centrum', ic: '💆', max: 3, cost: [3, 5.5, 9], days: [2, 3, 4], eff: '+2 % kondície denne za úroveň' },
  youth: { cat: 'football', name: 'Mládežnícka akadémia', ic: '🎓', max: 5, cost: [3, 5, 8, 12, 16], days: [3, 4, 5, 6, 7], eff: 'Lepšie talenty z dorastu (vyšší potenciál, viac hráčov)' },
  scout: { cat: 'football', name: 'Skautingová sieť', ic: '🔭', max: 3, cost: [2, 4, 7], days: [2, 3, 3], eff: 'Skauti preskúmajú viac hráčov a dôkladnejšie' },
  video: { cat: 'football', name: 'Videoanalytika', ic: '🎥', max: 3, cost: [3, 5, 8], days: [2, 2, 3], eff: 'Hráči získavajú viac skúseností zo zápasov' },
  medical: { cat: 'football', name: 'Zdravotné stredisko', ic: '🩺', max: 3, cost: [3, 5.5, 9], days: [2, 3, 4], eff: 'Hráči sa v zápase menej unavia' },
  dorm: { cat: 'football', name: 'Internát akadémie', ic: '🛏️', max: 3, cost: [3, 5, 8], days: [2, 3, 4], req: { youth: 1 }, eff: 'Hráči v akadémii rastú rýchlejšie' },
  shop: { cat: 'biz', name: 'Fanshop', ic: '🛍️', max: 5, cost: [3, 5.5, 8.5, 12, 17], days: [2, 2, 3, 3, 4], eff: 'Predaj suvenírov +35 % za úroveň' },
  cater: { cat: 'biz', name: 'Občerstvenie', ic: '🌭', max: 5, cost: [3, 5.5, 8.5, 12, 17], days: [1, 2, 2, 3, 3], eff: 'Tržby z občerstvenia +35 % za úroveň' },
  mkt: { cat: 'biz', name: 'Marketingové oddelenie', ic: '📣', max: 3, cost: [3, 6, 10], days: [2, 3, 4], eff: 'Ponuky sponzorov +8 % a suveníry +5 % za úroveň' },
  museum: { cat: 'biz', name: 'Klubové múzeum', ic: '🏛️', max: 3, cost: [3, 5, 8], days: [2, 3, 4], req: { stad: 2 }, eff: 'Príjem z prehliadok a rýchlejší rast fanúšikov' },
  resto: { cat: 'biz', name: 'Klubová reštaurácia', ic: '🍽️', max: 3, cost: [3, 5, 8], days: [2, 3, 3], req: { cater: 2 }, eff: 'Pravidelný príjem každé kolo' },
  media: { cat: 'biz', name: 'Mediálne centrum', ic: '🎙️', max: 3, cost: [3, 5.5, 9], days: [2, 3, 4], req: { lights: 1 }, eff: 'Vyššie príjmy z TV a lepšie ponuky sponzorov' },
  solar: { cat: 'biz', name: 'Solárne panely', ic: '☀️', max: 3, cost: [2.5, 4, 6], days: [1, 2, 2], eff: 'Nižšie náklady na prevádzku klubu' },
};
const FAC_CATS = [['stadium', '🏟️ Štadión'], ['football', '⚽ Futbal'], ['biz', '💼 Biznis']];
const FAC_KEYS = Object.keys(FAC);

const KIT_BRANDS = ['Strela Sport', 'Kopačka Pro', 'Dres Line', 'Gól Wear', 'Atletik SK', 'Futura Sport', 'Lev Sport', 'Sokol Textil', 'Trávnik Wear', 'Bystrina Sport'];
const REG_ADJ = {
  Z: ['Záhorská', 'Považská', 'Nitrianska', 'Podunajská', 'Trnavská', 'Ponitrianska', 'Žitnoostrovská'],
  S: ['Oravská', 'Liptovská', 'Turčianska', 'Kysucká', 'Pohronská', 'Gemerská', 'Novohradská'],
  V: ['Spišská', 'Šarišská', 'Zemplínska', 'Abovská', 'Tatranská', 'Hornádska', 'Popradská'],
};
const FEM_NOUNS = ['mliekareň', 'pekáreň', 'doprava', 'strojáreň', 'tlačiareň', 'energetika', 'stavebná spoločnosť', 'distribúcia', 'lesná správa', 'poisťovacia agentúra', 'vodárenská spoločnosť', 'realitná kancelária'];
const BIZ_TYPES = ['Stavby', 'Servis', 'Transport', 'Elektro', 'Okná', 'Agro', 'Kovo', 'Drevo', 'Auto', 'Plyn'];

function bizName(slot) {
  const u = userTeam();
  if (slot === 'kit') return U.pick(KIT_BRANDS);
  const r = Math.random();
  if (r < 0.45) return `${U.pick(REG_ADJ[u.reg] || REG_ADJ.Z)} ${U.pick(FEM_NOUNS)}`;
  if (r < 0.8) return `${U.pick(SURNAMES)} ${U.pick(BIZ_TYPES)} s.r.o.`;
  return `${U.pick(['Autocentrum', 'Reštaurácia', 'Hotel', 'Stavebniny', 'Pneuservis', 'Kaviareň'])} ${U.pick(['Koliba', 'U Jána', 'Pod Hradom', 'Centrum', u.city, U.pick(SURNAMES)])}`;
}

function biz() { return G.biz; }
const wkTxt = v => `${U.money(v)}/týž.`;
const lwb = l => levelWageBill(l);

function setupBiz() {
  const u = userTeam();
  const cap = REAL_CAPACITY[u.key] || U.nice(DEF_CAP[u.lvl] * U.rf(0.75, 1.3));
  const occ = u.lvl === 1 ? 0.42 : u.lvl === 2 ? 0.5 : u.lvl === 3 ? 0.55 : 0.6;
  const fans = Math.round(cap * occ * U.rf(0.9, 1.1));
  G.biz = {
    rev: Math.max(U.nice(teamWageBill(u) * 1.05), U.nice(lwb(u.lvl) * 0.8)),
    cap0: cap, fans, fans0: fans, ticket: DEF_TICKET[u.lvl], st: 0, stPrice: DEF_TICKET[u.lvl],
    fac: Object.fromEntries(FAC_KEYS.map(k => [k, 0])), build: [],
    sp: { main: null, kit: null, naming: null, p1: null, p2: null }, offers: {}, offersUntil: -1,
    stadium0: u.stadium, attLast: 0, attHist: [], fansHist: [fans], deal: null, attMalus: 1, mood: 60,
  };
}

function bizEnsure() {
  const b = G.biz;
  if (!b) return;
  b.fac = Object.assign(Object.fromEntries(FAC_KEYS.map(k => [k, 0])), b.fac || {});
  b.build = b.build || [];
}
// kapacita štadióna: úrovne 1 – 7 po +18 %, potom rovnomerný rast až na 50 000 miest na 15. úrovni
function stadCap(lv, cap0 = biz().cap0) {
  const c7 = cap0 * (1 + 0.18 * Math.min(lv, 7));
  if (lv <= 7) return Math.round(c7);
  const top = Math.max(50000, c7 * 1.25);
  return Math.round(c7 * Math.pow(top / c7, (lv - 7) / 8) / 10) * 10;
}
function capacity() { return stadCap(biz().fac.stad); }
// cena rozšírenia v násobkoch týždenných platov ligy – pri veľkom štadióne rozhoduje počet nových miest
const SEAT_PRICE = 1100;
function stadUnits(lv) {
  const F = FAC.stad, base = F.cost[lv];
  if (lv < 7) return base;
  const seats = stadCap(lv + 1) - stadCap(lv);
  return Math.max(base, seats * SEAT_PRICE * (1 + 0.06 * (lv - 7)) / lwb(userTeam().lvl));
}
function facDemand() { const f = biz().fac; return 1 + 0.06 * (f.park || 0) + 0.03 * (f.lights || 0) + 0.04 * (f.roof || 0); }
function vipIncome(lv) { const b = biz(); lv = lv ?? (b.fac.vip || 0); return lv ? U.nice(lwb(userTeam().lvl) * 0.12 * lv) : 0; }

// výška „obratu“ klubu pre ponuky sponzorov
function successFactor() {
  const b = biz();
  return U.clamp(1 + (b.fans / Math.max(1, b.fans0) - 1) * 0.5, 0.7, 1.7) * (1 + 0.08 * (b.fac.mkt || 0)) * (1 + 0.04 * (b.fac.media || 0)) * (1 + 0.04 * (b.fac.facade || 0));
}

function genSponsorOffers(slot) {
  const b = biz(), u = userTeam(), def = SLOTS[slot];
  const out = [];
  const types = U.shuffle(def.types.slice());
  for (let i = 0; i < 3; i++) {
    const type = types[i % types.length];
    const base = def.w * b.rev * successFactor() * U.rf(0.8, 1.2);
    let name = bizName(slot), guard = 0;
    while (out.some(x => x.name === name) && guard++ < 10) name = bizName(slot);
    const o = { id: U.ri(1, 1e9), slot, name, type, years: U.ri(1, 3), neg: false };
    if (type === 'fixed') o.weekly = U.nice(base);
    else if (type === 'win') { o.weekly = U.nice(base * 0.72); o.bonus = U.nice(base * 0.65); }
    else if (type === 'goal') {
      const lg = leagueOf(u);
      const rank = lg.tids.map(id => G.teams[id]).sort((a, c) => teamRating(c) - teamRating(a)).indexOf(u) + 1;
      o.weekly = U.nice(base * 0.78); o.target = Math.max(1, rank - U.ri(0, 2)); o.bonus = U.nice(base * 32 * 0.4);
    } else if (type === 'merch') { o.weekly = U.nice(base * 0.8); o.share = 0.3; }
    o.sign = U.nice(base * U.ri(1, 4));
    out.push(o);
  }
  return out;
}

function sponsorDesc(c) {
  if (c.type === 'win') return `+${U.money(c.bonus)} za každú výhru`;
  if (c.type === 'goal') return `+${U.money(c.bonus)} ak skončíš do ${c.target}. miesta`;
  if (c.type === 'merch') return `+${Math.round(c.share * 100)} % k predaju suvenírov`;
  return 'bez podmienok';
}

function refreshOffers(force) {
  const b = biz();
  for (const s in SLOTS) if (!b.sp[s] && (force || !b.offers[s] || !b.offers[s].length)) b.offers[s] = genSponsorOffers(s);
  b.offersUntil = G.day + 6;
}

function signSponsor(slot, offerId) {
  const b = biz(), u = userTeam();
  const o = (b.offers[slot] || []).find(x => x.id === offerId);
  if (!o || b.sp[slot]) return 'Ponuka už nie je platná.';
  b.sp[slot] = { ...o, until: G.year + o.years, wins: 0 };
  b.offers[slot] = [];
  book('spons', o.sign);
  if (slot === 'naming') u.stadium = `${o.name} Aréna`;
  news(`Nový sponzor: ${o.name} (${SLOTS[slot].name}) – ${wkTxt(o.weekly)} do leta ${G.year + o.years}.`, 'good');
  return null;
}

function negotiateSponsor(slot, offerId) {
  const b = biz();
  const o = (b.offers[slot] || []).find(x => x.id === offerId);
  if (!o || o.neg) return { err: 'S týmto sponzorom už vyjednávaš.' };
  o.neg = true;
  if (U.chance(0.55)) {
    const k = U.rf(1.08, 1.18);
    o.weekly = U.nice(o.weekly * k); if (o.bonus) o.bonus = U.nice(o.bonus * k); o.sign = U.nice(o.sign * k);
    return { ok: true, k };
  }
  b.offers[slot] = b.offers[slot].filter(x => x.id !== offerId);
  return { lost: true };
}

function autoSignSponsors() {
  const b = biz();
  const signed = [];
  for (const s in SLOTS) {
    if (b.sp[s] || !(b.offers[s] || []).length) continue;
    const o = b.offers[s].slice().sort((a, c) => a.weekly - c.weekly)[Math.min(1, b.offers[s].length - 1)];
    signSponsor(s, o.id);
    signed.push(`${SLOTS[s].name}: ${o.name}`);
  }
  if (signed.length) inboxAdd({ type: 'info', text: `Vedenie klubu podpísalo zmluvy za teba, lebo si nevybral sponzorov: ${signed.join(', ')}.` });
}

function sponsorWeekly() {
  const b = biz();
  let s = 0;
  for (const k in b.sp) if (b.sp[k]) s += b.sp[k].weekly;
  return Math.round(s * (1 + 0.05 * ((b.fac && b.fac.led) || 0)));
}
function tvWeekly() { const u = userTeam(), b = biz(), k = 1 + 0.1 * (b.fac.lights || 0) + 0.1 * (b.fac.media || 0); return u.lvl === 1 ? U.nice(b.rev * 0.2 * k) : u.lvl === 2 ? U.nice(b.rev * 0.08 * k) : 0; }
function merchWeekly() {
  const b = biz(), u = userTeam();
  const kit = b.sp.kit && b.sp.kit.type === 'merch' ? 1 + b.sp.kit.share : 1;
  const star = Math.max(...teamPlayers(u).map(p => p.r)) - teamBase(u);
  return Math.round(retroF() * b.fans * MERCH_FAN[u.lvl] * (1 + 0.35 * b.fac.shop) * (1 + 0.05 * (b.fac.mkt || 0)) * kit * (1 + U.clamp(star, 0, 15) / 50) * (0.9 + 0.2 * mood() / 100) * (1 + 0.06 * (b.fac.fanzone || 0)));
}
function bizWeeklyIncome() { return weeklyParts().inc; }

// ── Pravidelné náklady ──────────────────────────────────────────
// prevádzka klubu: realizačný tím, cestovanie, administratíva, energie
function opCost() { const b = biz(); return U.nice(Math.max(b.rev, lwb(userTeam().lvl) * 0.6) * 0.12 * (1 - 0.06 * (b.fac.solar || 0))); }
// múzeum a reštaurácia – príjem za kolo
function toursFor(l) { const b = biz(); return l ? Math.round(b.fans * MERCH_FAN[userTeam().lvl] * 0.22 * l) : 0; }
function restoFor(l) { return l ? U.nice(lwb(userTeam().lvl) * 0.05 * l) : 0; }
function toursWeekly() { return toursFor(biz().fac.museum || 0); }
function restoWeekly() { return restoFor(biz().fac.resto || 0); }
// hodnota postavených zariadení (v násobkoch týždenných platov ligy)
// (pri údržbe sa veľký štadión – úrovne 8 až 15 – počíta len zo 40 %)
function facBuiltUnits(fac, upkeep) {
  const f = fac || biz().fac;
  return FAC_KEYS.reduce((a, k) => a + Array.from({ length: f[k] || 0 }, (_, i) => facUnits(k, i) * (k === 'stad' && upkeep && i >= 7 ? 0.4 : 1)).reduce((x, y) => x + y, 0), 0);
}
function facValue() { return U.nice(lwb(userTeam().lvl) * facBuiltUnits()); }
// údržba areálu: 0,2 % hodnoty zariadení týždenne
function upkeepWeekly(fac) { const n = facBuiltUnits(fac, true); return n ? U.nice(lwb(userTeam().lvl) * n * 0.002) : 0; }
function upkeepNext(k) {
  const b = biz(), f = { ...b.fac, [k]: Math.min(FAC[k].max, (b.fac[k] || 0) + 1) };
  return upkeepWeekly(f) - upkeepWeekly();
}
function matchCost(att) { const u = userTeam(); return Math.round(att * MATCH_COST[u.lvl] + lwb(u.lvl) * 0.04); }

// Odhad domáceho zápasu (pri danej cene lístka)
function homeMatchEstimate(opp, price) {
  const b = biz(), u = userTeam();
  price = price ?? b.ticket;
  const att = expectedAttendance(opp, false, price);
  const paying = Math.max(0, att - b.st);
  const gate = Math.round(paying * price), cater = Math.round(att * CATER_SPEND[u.lvl] * (1 + 0.35 * b.fac.cater));
  const vip = vipIncome(), cost = matchCost(att);
  return { att, gate, cater, vip, cost, total: gate + cater + vip, net: gate + cater + vip - cost };
}
// Priemerný týždeň (= jedno ligové kolo, doma sa hrá každé druhé kolo)
function weeklyParts() {
  const u = userTeam(), b = biz();
  const scouts = (G.scouts || []).reduce((a, s) => a + s.wage, 0);
  if (!b) { const w = teamWageBill(u); return { inc: u.spons || 0, exp: w + scouts, I: {}, E: { wages: w, scouts } }; }
  const h = homeMatchEstimate(null);
  const cur = fin().cur, rounds = Math.max(1, leagueRoundCount(leagueOf(u)));
  const I = { spons: sponsorWeekly(), tv: tvWeekly(), merch: merchWeekly(), gate: Math.round((h.gate + h.cater) / 2), vip: Math.round(h.vip / 2), tours: toursWeekly(), resto: restoWeekly(), season: Math.round(((cur.grant || 0) + (cur.st || 0)) / rounds) };
  const B = bTeam();
  const E = { wages: teamWageBill(u) + (B ? teamWageBill(B) : 0), ops: opCost(), upkeep: upkeepWeekly(), matchday: Math.round(h.cost / 2), scouts, staff: staffWeekly() + coachSal(), women: womWeekly() };
  const sum = o => Object.values(o).reduce((a, v) => a + v, 0);
  return { I, E, inc: sum(I), exp: sum(E) };
}

// ── Návštevnosť ─────────────────────────────────────────────────
function recentForm() {
  const u = userTeam(), lg = leagueOf(u);
  const row = leagueTable(lg).find(r => r.tid === u.id);
  const f = row ? row.form.slice(-5) : [];
  if (!f.length) return 0.5;
  return f.reduce((a, x) => a + (x === 'V' ? 3 : x === 'R' ? 1 : 0), 0) / (f.length * 3);
}
function priceFactor(price) { const u = userTeam(), sl = G.biz && G.biz.fac ? G.biz.fac.seats || 0 : 0; return U.clamp(Math.pow(DEF_TICKET[u.lvl] * (1 + 0.07 * sl) / Math.max(0.1, price), 0.9), 0.25, 1.6); }
function expectedAttendance(opp, cup, price) {
  const b = biz(), u = userTeam();
  price = price ?? b.ticket;
  let oppF = 1;
  if (opp) {
    if (opp.lvl < u.lvl) oppF += 0.35 * (u.lvl - opp.lvl);
    else if (opp.lvl > u.lvl) oppF -= 0.1;
    if (opp.city === u.city) oppF += 0.4;
    else if (opp.reg === u.reg) oppF += 0.1;
    oppF += U.clamp((teamRating(opp) - teamRating(u)) / 40, -0.1, 0.25);
  }
  const der = opp && rivalry(u, opp) ? 1 + 0.15 * rivalry(u, opp)[0] : 1;
  const demand = b.fans * (0.8 + 0.4 * recentForm()) * oppF * der * priceFactor(price) * (cup ? 1.1 : 1) * (b.attMalus ?? 1) * facDemand() * moodAttF();
  return Math.round(Math.min(capacity(), demand));
}

function bizHomeMatch(x, opp) {
  const b = biz(), u = userTeam();
  const cup = x.comp === 'C' || x.comp === 'E';
  if (x.m.neutral) {
    const share = U.nice(LEVEL_INFO[u.lvl].income * 4 + 20000);
    book('gate', share);
    return;
  }
  const att = Math.round(expectedAttendance(opp, cup) * U.rf(0.9, 1.08));
  const paying = Math.max(0, att - b.st);
  book('gate', Math.round(paying * b.ticket));
  book('cater', Math.round(att * CATER_SPEND[u.lvl] * (1 + 0.35 * b.fac.cater)));
  if (b.fac.vip) book('vip', vipIncome());
  book('matchday', -matchCost(att));
  b.attLast = att;
  b.attHist.push(att); if (b.attHist.length > 20) b.attHist.shift();
  b.attMalus = 1;
}

function bizAfterMatch(x, res) {
  const b = biz(), u = userTeam();
  if (!b) return;
  const home = x.m.h === u.id;
  const my = home ? res.hg : res.ag, op = home ? res.ag : res.hg;
  const won = my > op || (x.comp !== 'L' && x.m.w === u.id && my === op);
  const growth = 1 + 0.02 * b.fac.stad + 0.03 * Math.max(0, b.fac.stad - 7) + 0.1 * (b.fac.museum || 0) + 0.05 * (b.fac.facade || 0) + 0.1 * (b.fac.family || 0);
  if (my > op) b.fans = Math.round(b.fans * (1 + 0.012 * growth));
  else if (my < op) b.fans = Math.round(b.fans * 0.992);
  b.fans = U.clamp(b.fans, Math.round(b.fans0 * 0.4), capacity() * 3);
  if (won) for (const k in b.sp) { const c = b.sp[k]; if (c && c.type === 'win') { book('spons', c.bonus); c.wins = (c.wins || 0) + 1; } }
  moodAfterMatch(x, my, op, won);
}

// ── Sezóna ──────────────────────────────────────────────────────
function bizSeasonStart() {
  const b = biz(), u = userTeam();
  if (!b) return;
  // dotácia od mesta / obce
  const grant = U.nice(lwb(u.lvl) * (u.lvl <= 2 ? 0.8 : U.rf(1.5, 2.5)));
  book('grant', grant);
  // permanentky
  b.stPrice = b.ticket;
  b.st = Math.min(Math.round(capacity() * 0.6), Math.round(b.fans * 0.22 * priceFactor(b.ticket)));
  const stIncome = Math.round(b.st * b.ticket * 12);
  book('st', stIncome);
  refreshOffers(true);
  inboxAdd({ type: 'sponsor', text: `Nová sezóna: mesto prispelo dotáciou ${U.money(grant)}, predal si ${b.st} permanentiek za ${U.money(stIncome)}. Prišli nové ponuky od sponzorov – vyber si do ${b.offersUntil + 1}. hracieho dňa.` });
}

function bizSeasonEnd(pos, n, oldLvl) {
  const b = biz(), u = userTeam();
  if (!b) return;
  for (const k in b.sp) {
    const c = b.sp[k];
    if (!c) continue;
    if (c.type === 'goal' && pos <= c.target) { book('spons', c.bonus); news(`Sponzor ${c.name} vyplatil bonus ${U.money(c.bonus)} za splnený cieľ (${pos}. miesto).`, 'good'); }
    if (c.until <= G.year + 1) {
      if (k === 'naming') u.stadium = b.stadium0;
      b.sp[k] = null;
    }
  }
  if (u.lvl < oldLvl) { b.fans = Math.round(b.fans * 1.15); moodAdd(15); }
  else if (u.lvl > oldLvl) { b.fans = Math.round(b.fans * 0.88); moodAdd(-20); }
  if (pos === 1) { b.fans = Math.round(b.fans * 1.1); moodAdd(12); }
  for (const c of cupList()) if (c.winner === u.id) b.fans = Math.round(b.fans * (c.id === 'cls' ? 1.12 : c.grp === 'reg' ? 1.03 : 1.06));
  if (u.lvl !== oldLvl) {
    b.rev = U.nice(b.rev * lwb(u.lvl) / lwb(oldLvl));
    b.ticket = Math.max(0.5, Math.round(b.ticket * DEF_TICKET[u.lvl] / DEF_TICKET[oldLvl] * 2) / 2);
    if (u.lvl < oldLvl && b.cap0 < DEF_CAP[u.lvl] * 0.6) b.cap0 = U.nice(DEF_CAP[u.lvl] * 0.6);
  } else if (pos <= 3) b.rev = U.nice(b.rev * 1.05);
  b.rev = Math.max(b.rev, U.nice(lwb(u.lvl) * 0.6));
  b.fansHist.push(b.fans); if (b.fansHist.length > 12) b.fansHist.shift();
  b.offers = {};
}

// ── Investície ──────────────────────────────────────────────────
function facCost(k) {
  const b = biz(), lv = b.fac[k] || 0, F = FAC[k];
  return lv >= F.max ? null : U.nice(lwb(userTeam().lvl) * facUnits(k, lv) * (k === 'stad' ? 1 - grantPct(lv + 1) : 1) * (G.maf && G.maf.build ? 1.3 : 1));
}
// nová stavba je drahšia a trvá dlhšie ako vylepšenie existujúcej
const FAC_NEW = 2.2, FAC_UP = 0.75;
function facUnits(k, lv) { return k === 'stad' ? stadUnits(lv) : FAC[k].cost[lv] * (lv === 0 ? FAC_NEW : FAC_UP); }
function facDays(k) { const lv = biz().fac[k] || 0, F = FAC[k], d = F.days[Math.min(lv, F.days.length - 1)]; return lv === 0 && k !== 'stad' ? Math.round(d * 1.6) : d; }
function facBuilding(k) { return (biz().build || []).find(x => x.k === k) || null; }
function facReq(k) {
  const F = FAC[k], b = biz();
  if (!F.req) return null;
  for (const r in F.req) if ((b.fac[r] || 0) < F.req[r]) return `Najprv potrebuješ: ${FAC[r].name} (úroveň ${F.req[r]})`;
  return null;
}
function upgradeFac(k) {
  const b = biz(), cost = facCost(k), u = userTeam();
  bizEnsure();
  if (cost == null) return 'Maximálna úroveň.';
  if (facBuilding(k)) return 'Toto zariadenie sa už stavia.';
  if (b.build.length >= 2) return 'Naraz môžeš stavať najviac 2 zariadenia.';
  const req = facReq(k); if (req) return req;
  if (k === 'stad' && !permitOk()) return 'Na rozšírenie štadióna potrebuješ stavebné povolenie.';
  if (u.budget < cost) return 'Nemáš dosť peňazí.';
  book('invest', -cost);
  if (G.maf && G.maf.build) { G.maf.build = false; mafLog(`Stavbu ${FAC[k].name.toLowerCase()} robí ich firma.`); }
  const days = facDays(k);
  b.build.push({ k, to: (b.fac[k] || 0) + 1, start: dayKey(), done: dayKey() + days, days });
  news(`Stavba: ${FAC[k].name} – úroveň ${(b.fac[k] || 0) + 1} (${U.money(cost)}), hotovo o ${days} hracích dní.`, 'good');
  return null;
}
function buildProgress(x) { return U.clamp((dayKey() - x.start) / Math.max(1, x.done - x.start), 0, 1); }
function buildLeft(x) { return Math.max(0, x.done - dayKey()); }
function finishBuilds() {
  const b = biz();
  if (!b || !b.build) return;
  for (const x of b.build.slice()) {
    if (dayKey() < x.done) continue;
    b.fac[x.k] = x.to;
    b.build = b.build.filter(y => y !== x);
    // nové tréningové centrum: hráči v klube majú lepšie podmienky (polovičný efekt oproti prestupu)
    if (x.k === 'train') {
      const up = [];
      for (const p of teamPlayers(userTeam())) { const g = trainBoost(p, x.to, Math.max(p.tq ?? 0, x.to - 1), 0.5); if (g) up.push(`${pName(p)} +${g}`); }
      if (up.length) news(`🏋️ Lepšie tréningové podmienky: vyšší potenciál – ${up.join(', ')}.`, 'good');
    }
    inboxAdd({ type: 'info', text: `🏗️ Dokončená stavba: ${FAC[x.k].name} – úroveň ${x.to}!` });
    news(`Dokončená stavba: ${FAC[x.k].name} (úroveň ${x.to}).`, 'good');
  }
}

// Mimoriadne udalosti sú v js/events.js

// ── Denné napojenie ─────────────────────────────────────────────
function bizDay(ev) {
  const b = biz();
  if (!b) return;
  bizEnsure();
  finishBuilds();
  if (b.fac.recov) for (const p of teamPlayers(userTeam())) p.fit = Math.min(100, p.fit + 2 * b.fac.recov);
  if (ev && ev.t === 'L') {
    book('ops', -opCost());
    const up = upkeepWeekly(); if (up) book('upkeep', -up);
    book('spons', sponsorWeekly());
    const to = toursWeekly(), re = restoWeekly(); if (to) book('tours', to); if (re) book('resto', re);
    const tv = tvWeekly(); if (tv) book('tv', tv);
    book('merch', merchWeekly());
    if (U.chance(0.3)) genDeal();
  }
  if (b.deal && (b.deal.year !== G.year || b.deal.exp < G.day)) expireDeal();
  if (b.offersUntil >= 0 && G.day >= b.offersUntil) { autoSignSponsors(); b.offersUntil = -1; }
}

function migrateBiz() {
  if (G.userTid == null || G.userTid < 0) return;
  const u = userTeam();
  if (!G.biz) setupBiz();
  const b = G.biz;
  bizEnsure();
  b.sp = Object.assign({ main: null, kit: null, naming: null, p1: null, p2: null }, b.sp || {});
  b.offers = b.offers || {}; b.attHist = b.attHist || []; b.fansHist = b.fansHist || [b.fans];
  if (b.st == null) b.st = 0;
  if (u.spons) {
    b.rev = Math.max(b.rev, u.spons);
    if (!b.sp.main) b.sp.main = { id: 1, slot: 'main', name: bizName('main'), type: 'fixed', weekly: U.nice(u.spons * 0.7), years: 1, until: G.year + 1, wins: 0, sign: 0 };
    delete u.spons;
  }
  refreshOffers(false);
  inboxAdd({ type: 'sponsor', text: 'Nové možnosti zárobku: sponzorské zmluvy, vstupné a permanentky, fanshop, občerstvenie, investície a mimoriadne ponuky. Pozri si záložku Financie → Sponzori.' });
}

// ── Odhady pre rozhodovanie ─────────────────────────────────────
function teamRank() {
  const u = userTeam(), lg = leagueOf(u);
  const ts = lg.tids.map(id => G.teams[id]).sort((a, c) => teamRating(c) - teamRating(a));
  return { rank: ts.indexOf(u) + 1, n: ts.length, rounds: leagueRoundCount(lg) };
}
function expectedWins() {
  const { rank, n, rounds } = teamRank();
  return Math.round(U.clamp(0.55 - (rank - 1) / Math.max(1, n - 1) * 0.38, 0.15, 0.62) * rounds);
}
function goalChance(target) { const { rank } = teamRank(); return U.clamp(0.5 + (target - rank) * 0.15, 0.05, 0.9); }
function offerSeasonValue(o) {
  let v = o.weekly * 32;
  if (o.type === 'win') v += o.bonus * expectedWins();
  if (o.type === 'goal') v += o.bonus * goalChance(o.target);
  if (o.type === 'merch') v += merchWeekly() * o.share * 32;
  return Math.round(v);
}
function bestOffer(slot) {
  const os = (biz().offers[slot] || []);
  return os.length ? os.slice().sort((a, c) => offerSeasonValue(c) * c.years + c.sign - (offerSeasonValue(a) * a.years + a.sign))[0] : null;
}
// nekapacitný dopyt divákov (na odhad prínosu rozšírenia štadióna)
function rawDemand(price) {
  const b = biz();
  return b.fans * (0.8 + 0.4 * recentForm()) * priceFactor(price ?? b.ticket) * (b.attMalus ?? 1) * facDemand() * moodAttF();
}
function facGain(k) {
  const b = biz(), u = userTeam(), lv = b.fac[k];
  const homes = Math.round(leagueRoundCount(leagueOf(u)) / 2);
  if (k === 'stad') {
    const d = rawDemand() * 1.1, cap = capacity(), nc = stadCap(lv + 1);
    const extra = Math.max(0, Math.min(d, nc) - Math.min(d, cap));
    return Math.round(extra * (b.ticket + CATER_SPEND[u.lvl] * (1 + 0.35 * b.fac.cater) - MATCH_COST[u.lvl]) * homes);
  }
  if (k === 'shop') return Math.round(merchWeekly() * 0.35 / (1 + 0.35 * lv) * 32);
  if (k === 'cater') return Math.round(Math.min(capacity(), rawDemand()) * CATER_SPEND[u.lvl] * 0.35 * homes);
  if (k === 'vip') return (vipIncome(lv + 1) - vipIncome(lv)) * homes;
  if (k === 'led') return Math.round(sponsorWeekly() * 0.05 / (1 + 0.05 * lv) * 32);
  if (k === 'facade') return Math.round(sponsorWeekly() * 0.04 * 32 * 0.5);
  if (k === 'seats') { const h = homeMatchEstimate(null); return Math.round(h.gate * 0.06 * homes); }
  if (k === 'park' || k === 'lights' || k === 'roof') {
    const now = Math.min(capacity(), rawDemand()), k2 = k === 'park' ? 0.06 : k === 'roof' ? 0.04 : 0.03;
    const extra = Math.min(capacity(), rawDemand() * (facDemand() + k2) / facDemand()) - now;
    let g = Math.round(Math.max(0, extra) * (b.ticket + CATER_SPEND[u.lvl] * (1 + 0.35 * b.fac.cater) - MATCH_COST[u.lvl]) * homes);
    if (k === 'lights') g += Math.round(tvWeekly() * 0.1 / (1 + 0.1 * lv) * 32);
    return g;
  }
  if (k === 'mkt') return Math.round(sponsorWeekly() * 0.08 * 32 * 0.5 + merchWeekly() * 0.05 * 32);
  if (k === 'museum') return (toursFor(lv + 1) - toursFor(lv)) * 32;
  if (k === 'resto') return (restoFor(lv + 1) - restoFor(lv)) * 32;
  if (k === 'solar') return Math.round(opCost() / (1 - 0.06 * lv) * 0.06 * 32);
  if (k === 'fanzone') return Math.round(merchWeekly() * 0.06 / (1 + 0.06 * lv) * 32);
  if (k === 'media') return Math.round(tvWeekly() * 0.1 / (1 + 0.1 * ((b.fac.lights || 0) + lv)) * 32 + sponsorWeekly() * 0.04 * 32 * 0.5);
  return 0;
}
function bestTicket(opp) {
  const u = userTeam(), def = DEF_TICKET[u.lvl];
  let best = def, bv = -1;
  for (let p = 0.5; p <= def * 3 + 0.01; p += 0.5) {
    const att = expectedAttendance(opp, false, p), b = biz();
    const v = Math.max(0, att - b.st) * p + att * (CATER_SPEND[u.lvl] * (1 + 0.35 * b.fac.cater) - MATCH_COST[u.lvl]);
    if (v > bv) { bv = v; best = p; }
  }
  return best;
}
function fillTicket(opp) {
  const u = userTeam(), def = DEF_TICKET[u.lvl], cap = capacity();
  for (let p = def * 3; p >= 0.5; p -= 0.5) if (expectedAttendance(opp, false, p) >= cap * 0.98) return p;
  return 0.5;
}
