'use strict';
// ─── Mafia: kontakty v podsvetí, služby za protislužby, pozornosť polície, vyšetrovanie a súd ───
// Čím vyššia liga, tým viac ľudí sa pozerá (rýchlejšie odhalenie). Trest závisí od toho, koľko si s mafiou robil.

const MAF_BIG = { Z: ['Bratislava', 'Trnava', 'Nitra'], S: ['Žilina', 'Banská Bystrica', 'Trenčín'], V: ['Košice', 'Prešov'] };
const MAF_TOWNS = new Set('Martin,Poprad,Zvolen,Michalovce,Prievidza,Nové Zámky,Komárno,Levice,Dunajská Streda,Ružomberok,Spišská Nová Ves,Humenné,Lučenec,Bardejov,Piešťany,Topoľčany,Liptovský Mikuláš,Senica,Skalica,Púchov,Považská Bystrica,Dubnica nad Váhom,Čadca,Rimavská Sobota,Vranov nad Topľou,Galanta,Šaľa,Malacky,Pezinok,Senec,Partizánske,Handlová,Žiar nad Hronom,Brezno,Rožňava,Trebišov,Kežmarok,Stará Ľubovňa,Svidník,Dolný Kubín,Námestovo,Detva,Hlohovec,Myjava,Nové Mesto nad Váhom,Bánovce nad Bebravou,Sereď,Štúrovo,Veľký Krtíš,Snina,Sabinov,Levoča,Zlaté Moravce,Podbrezová,Michalovce'.split(','));
const MAF_TIER = ['', 'Dedinská partia', 'Mestská skupina', 'Veľká rodina'];
const MAF_CAP = [0, 20000, 300000, 5e6];
const mafVis = lvl => [1, 2.0, 1.6, 1.3, 1.1, 1.0, 0.85, 0.75, 0.65, 0.55][lvl] || 1;
const mafUnit = () => Math.max(300, lwb(userTeam().lvl));

function maf() {
  if (!G.maf) G.maf = { clan: null, rel: 50, heat: 0, inv: 0, debt: null, spons: null, fix: null, disc: 0, ban: 0, build: false, job: 0, dem: [], inq: null, court: null, log: [], cd: {}, down: 0, close: false, uses: 0, sweeps: 0 };
  return G.maf;
}
const mafOn = () => !!(G.maf && G.maf.clan);
function mafLog(t, cls = '') { const M = maf(); M.log.unshift({ t, d: seasonTxt(), cls }); if (M.log.length > 30) M.log.length = 30; }

// ── Kontakty ───────────────────────────────────────────────────
function cityTier(city, reg) {
  if ((MAF_BIG[reg] || []).includes(city)) return 3;
  if (MAF_TOWNS.has(city) || G.teams.some(t => !t.fx && t.city === city && t.lvl <= 3)) return 2;
  return 1;
}
function clanFor(city, tier, out) {
  const R = mdRand(U.hash('maf' + city + tier)), pick = a => a[Math.floor(R() * a.length)];
  const nick = pick(['Šéf', 'Barón', 'Doktor', 'Malý', 'Kladivo', 'Biely', 'Profesor', 'Kapitán', 'Tichý', 'Zlatý']);
  const fn = pick(FIRST_NAMES), ln = pick(SURNAMES);
  const name = tier === 3 ? `${pick(['Rodina', 'Klan'])} ${pick(['Vlk', 'Kobra', 'Sokol', 'Býk', 'Tieň', 'Šakal', 'Vrana', 'Jaguár'])}`
    : tier === 2 ? `${pick(['Skupina', 'Partia', 'Firma'])} ${ln}` : `Partia od ${pick(['krčmy', 'píly', 'družstva', 'benzínky', 'kameňolomu', 'mlyna'])}`;
  return { id: U.hash(name + city), n: name, boss: `${fn} „${nick}“ ${ln}`, tier, city, out: !!out };
}
function mafContacts() {
  const u = userTeam(), own = cityTier(u.city, u.reg), out = [clanFor(u.city, own, false)];
  for (const c of MAF_BIG[u.reg] || []) if (c !== u.city) out.push(clanFor(c, 3, true));
  return out;
}
const contactFee = c => (c.out ? U.nice(mafUnit() * (1 + c.tier)) : 0);
function joinClan(c) {
  const M = maf(), u = userTeam();
  if (M.court) return 'Najprv musí rozhodnúť súd.';
  const fee = contactFee(c);
  if (u.budget < fee) return 'Nemáš dosť peňazí.';
  if (fee) book('eventx', -fee);
  if (M.clan && M.clan.id !== c.id) { M.rel = 25; mafLog(`${M.clan.n} sa urazila, že si ich vymenil.`, 'bad'); }
  M.clan = c; M.rel = c.out ? 40 : 55;
  addHeat(c.out ? 5 : 2);
  mafLog(`Kontakt: ${c.n} (${c.city}).`);
  return null;
}
function leaveClan() {
  const M = maf();
  if (!M.clan) return;
  mafLog(`Koniec spolupráce s ${M.clan.n}.`, 'bad');
  if (M.rel >= 40 && !M.debt) M.rel = 30; else mafThreat(true);
  M.clan = null; M.spons = null; M.job = 0; M.dem = [];
}
function addHeat(h) { const M = maf(); M.heat = U.clamp(M.heat + h * mafVis(userTeam().lvl) * (M.clan && M.clan.out ? 1.25 : 1), 0, 100); }

// ── Služby ─────────────────────────────────────────────────────
// [kľúč, ikona, názov, min. vplyv, čo dostaneš, čo chcú, pozornosť, dôkazy]
const MAF_SERV = [
  ['cash', '💰', 'Čierne peniaze', 1, t => `+${U.money(servCash(t))}`, t => `vrátiť ${U.money(Math.round(servCash(t) * 1.5))} do 12 kôl`, 6, 2],
  ['spons', '🧾', 'Fiktívny sponzor', 1, t => `+${U.money(servSpons(t))}/kolo`, () => 'prať ich peniaze cez klub', 3, 1],
  ['ref', '🧑‍⚖️', 'Rozhodca na zápas', 1, t => `lepší výsledok v najbližšom zápase`, t => U.money(servPrice('ref', t)), 6, 3],
  ['scare', '😨', 'Zastrašiť súpera', 1, () => 'súper bude hrať horšie', () => 'láskavosť neskôr', 5, 2],
  ['opp', '🤝', 'Kúpený zápas', 2, () => 'súper zápas pustí', t => U.money(servPrice('opp', t)), 13, 5],
  ['player', '🕴️', 'Presvedčiť kluby', 2, () => 'prestupy o 25 % lacnejšie (10 dní)', t => U.money(servPrice('player', t)), 6, 3],
  ['permit', '🏗️', 'Povolenie na štadión', 2, () => 'stavebné povolenie hneď', t => U.money(servPrice('permit', t)), 4, 2],
  ['media', '📰', 'Umlčať novinárov', 2, () => 'pozornosť −10', t => U.money(servPrice('media', t)), -10, 3],
  ['police', '👮', 'Známy na polícii', 3, () => 'pozornosť −20, vyšetrovanie −40 %', t => U.money(servPrice('police', t)), -20, 6],
];
const servCash = t => U.nice(Math.min(MAF_CAP[t], mafUnit() * [0, 6, 12, 25][t]));
const servSpons = t => U.nice(Math.min(MAF_CAP[t] / 20, mafUnit() * [0, 0.12, 0.3, 0.55][t]));
function servPrice(k, t) { const u = mafUnit(); return U.nice(u * ({ ref: [0, 0.8, 1.5, 2.5], opp: [0, 0, 4, 7], player: [0, 0, 1.2, 1.6], permit: [0, 0, 1.5, 1.5], media: [0, 0, 2, 3], police: [0, 0, 0, 6] })[k][t]); }
const SERV_CD = { cash: 20, spons: 999, ref: 4, scare: 4, opp: 8, player: 12, permit: 10, media: 14, police: 22 };
function servLock(s) {
  const M = maf(), [k, , , min] = s;
  if (!M.clan) return 'Nemáš kontakt.';
  if (M.clan.tier < min) return `Potrebuješ ${MAF_TIER[min].toLowerCase()}.`;
  if (M.rel < 15) return 'Mafia ti už nedôveruje.';
  if ((M.cd[k] || 0) > dayKey()) return 'Zatiaľ nie.';
  if (k === 'cash' && M.debt) return 'Najprv vráť dlh.';
  if (k === 'spons' && M.spons && M.spons.y === G.year) return 'Sponzora už máš.';
  if (k === 'permit' && !(G.biz && permitNeeded() && !permitOk())) return 'Povolenie teraz netreba.';
  if (k === 'player' && !windowNow().open) return 'Prestupové okno je zatvorené.';
  if ((k === 'ref' || k === 'scare' || k === 'opp') && M.fix) return 'Na najbližší zápas už je dohodnuté.';
  return null;
}
function useServ(k) {
  const M = maf(), s = MAF_SERV.find(x => x[0] === k), u = userTeam(), t = M.clan && M.clan.tier;
  const lock = servLock(s); if (lock) return lock;
  const price = ['ref', 'opp', 'player', 'permit', 'media', 'police'].includes(k) ? servPrice(k, t) : 0;
  if (price && u.budget < price) return 'Nemáš dosť peňazí.';
  if (price) book('eventx', -price);
  if (k === 'cash') { const a = servCash(t); book('mafia', a); M.debt = { amt: Math.round(a * 1.5), due: dayKey() + 16 }; }
  if (k === 'spons') M.spons = { amt: servSpons(t), y: G.year };
  if (k === 'ref') M.fix = { my: 1.1 + 0.03 * t, opp: 0.92 };
  if (k === 'scare') { M.fix = { my: 1, opp: 0.86 }; M.owe = (M.owe || 0) + 1; }
  if (k === 'opp') M.fix = { my: 1.05, opp: 0.55 };
  if (k === 'player') M.disc = dayKey() + 10;
  if (k === 'permit') G.permit = { lvl: (G.biz.fac.stad || 0) + 1, done: dayKey(), ok: true };
  if (k === 'police' && M.inq) M.inq.p = Math.max(0, M.inq.p - 40);
  const h = s[6];
  if (h > 0) addHeat(h); else M.heat = Math.max(0, M.heat + h);
  M.inv += s[7]; M.uses++; M.rel = Math.min(100, M.rel + 3);
  M.cd[k] = dayKey() + SERV_CD[k];
  mafLog(`${s[1]} ${s[2]}`);
  return null;
}
function repayDebt() {
  const M = maf(), u = userTeam();
  if (!M.debt) return 'Nemáš dlh.';
  if (u.budget < M.debt.amt) return 'Nemáš dosť peňazí.';
  book('eventx', -M.debt.amt); mafLog(`Dlh ${U.money(M.debt.amt)} vrátený.`, 'good');
  M.debt = null; M.rel = Math.min(100, M.rel + 8);
  return null;
}
// zápasové služby: násobok šancí (used in matchMods)
function mafMods(A, B) {
  const M = G.maf;
  if (!M || !M.fix || G.userTid < 0) return 1;
  if (A.id === G.userTid) return M.fix.my;
  if (B.id === G.userTid) return M.fix.opp;
  return 1;
}
const mafDisc = t => (G.maf && G.maf.disc > dayKey() && t && !t.fx && t.id !== G.userTid ? 0.75 : 1);
const mafBan = () => !!(G.maf && G.maf.ban > dayKey());

// ── Protislužby ────────────────────────────────────────────────
const MAF_DEM = [
  ['cut', '💵', t => `Chcú svoj podiel: ${U.money(U.nice(mafUnit() * [0, 1.5, 3, 6][t]))}`, 20, 2, 1],
  ['sign', '✍️', () => 'Daj zmluvu ich chlapcovi (vysoký plat)', 15, 2, 1],
  ['job', '👔', () => 'Zamestnaj v klube ich človeka', 10, 1, 1],
  ['throw', '🎲', () => 'Prehrajte najbližší zápas', 25, 9, 5],
  ['sell', '🔁', () => 'Predaj lacno hráča klubu, ktorý určia', 20, 3, 2],
  ['build', '🏗️', () => 'Ďalšiu stavbu robí ich firma (+30 %)', 12, 2, 1],
];
function newDemand(force) {
  const M = maf();
  if (!M.clan || M.dem.length) return;
  const pool = MAF_DEM.filter(d => d[0] !== 'sell' || windowNow().open).filter(d => d[0] !== 'throw' || M.clan.tier >= 2);
  const d = U.pick(pool);
  M.dem.push({ k: d[0], exp: dayKey() + 5, force: !!force });
  inboxAdd({ type: 'info', text: `🕶️ ${M.clan.n} niečo chce za svoju pomoc. Pozri záložku Mafia.` });
}
function demText(dm) { const d = MAF_DEM.find(x => x[0] === dm.k); return d[2](maf().clan ? maf().clan.tier : 1); }
function answerDemand(yes) {
  const M = maf(), dm = M.dem[0], u = userTeam();
  if (!dm) return null;
  const d = MAF_DEM.find(x => x[0] === dm.k), t = M.clan ? M.clan.tier : 1;
  M.dem = [];
  if (!yes) { M.rel = Math.max(0, M.rel - d[3]); mafLog(`Odmietol si: ${demText(dm)}.`, 'bad'); if (M.rel < 25) mafThreat(); return null; }
  if (dm.k === 'cut') { const a = U.nice(mafUnit() * [0, 1.5, 3, 6][t]); if (u.budget < a) { M.dem = [dm]; return 'Nemáš dosť peňazí.'; } book('eventx', -a); }
  if (dm.k === 'sign') {
    if (teamPlayers(u).length >= 30) { M.dem = [dm]; return 'Máš plný káder.'; }
    const p = genPlayer(u.id, U.pick(['DF', 'MF', 'FW']), Math.max(10, teamBase(u) - 14));
    p.age = U.ri(24, 31); p.w = U.nice(wageFor(p, u.lvl) * 3.5); p.ce = G.year + 2; u.pids.push(p.id); assignNumbers(u);
    news(`✍️ ${pFull(p)} podpísal zmluvu (${wkTxt(p.w)}).`);
  }
  if (dm.k === 'job') M.job = U.nice(mafUnit() * 0.08);
  if (dm.k === 'throw') M.fix = { my: 0.4, opp: 1.15, thrown: true };
  if (dm.k === 'sell') {
    const p = teamPlayers(u).filter(p => !p.loan && p.age <= 25).sort((a, b) => playerValue(b) - playerValue(a))[0];
    const buyers = G.teams.filter(t2 => !isUserSide(t2) && !t2.fx && Math.abs(t2.lvl - u.lvl) <= 1 && teamPlayers(t2).length < 28);
    if (p && buyers.length && teamPlayers(u).length > 16) { const b = U.pick(buyers), fee = U.nice(playerValue(p) * 0.45); b.budget += fee; sellTo(p, b, fee); }
  }
  if (dm.k === 'build') M.build = true;
  addHeat(d[4]); M.inv += d[5]; M.rel = Math.min(100, M.rel + 8); M.owe = Math.max(0, (M.owe || 0) - 1);
  mafLog(`Splnil si: ${demText(dm)}.`);
  return null;
}
// hrozby, keď sa mafia hnevá
function mafThreat(sure) {
  const M = maf(), u = userTeam();
  if (!sure && !U.chance(0.3)) return;
  const r = Math.random();
  if (r < 0.4) { const a = U.nice(mafUnit() * U.rf(1, 3)); book('eventx', -a); news(`🔥 Neznámi páchatelia zdemolovali šatne – škoda ${U.money(a)}.`, 'bad'); mafLog('Zdemolované šatne.', 'bad'); }
  else if (r < 0.75) { for (const p of teamPlayers(u)) addMor(p, -8); news('😨 Hráčom sa niekto vyhrážal – v kabíne je strach.', 'bad'); mafLog('Vyhrážky hráčom.', 'bad'); }
  else {
    const p = teamPlayers(u).filter(p => !injured(p)).sort((a, b) => b.r - a.r)[0];
    if (p) { p.inj = { k: 2, d: U.ri(8, 15) }; news(`🚑 ${pFull(p)} bol napadnutý – vynechá ${dniTxt(p.inj.d)}.`, 'bad'); mafLog(`Napadnutý ${pName(p)}.`, 'bad'); }
  }
  if (M.rel <= 5 && U.chance(0.4) && !M.inq) { M.inq = { p: 30 }; inboxAdd({ type: 'info', text: '🚨 Niekto z podsvetia ťa udal. Polícia začala vyšetrovanie.' }); mafLog('Udavač – začalo vyšetrovanie.', 'bad'); }
}

// ── Vyšetrovanie a súd ─────────────────────────────────────────
function sweep() {
  const M = maf(), u = userTeam(), c = U.nice(mafUnit() * 3);
  if (!M.inq) return 'Nikto ťa nevyšetruje.';
  if (M.sweeps >= 2) return 'Viac stôp už zamiesť nejde.';
  if (u.budget < c) return 'Nemáš dosť peňazí.';
  book('eventx', -c); M.inq.p = Math.max(0, M.inq.p - 22); M.heat = Math.max(0, M.heat - 5); M.sweeps++;
  mafLog('Zametené stopy.');
  return null;
}
const LAWYERS = [['Bez advokáta', 0, 1], ['Advokát', 3, 0.85], ['Top advokát', 8, 0.65]];
const lawyerCost = i => U.nice(mafUnit() * LAWYERS[i][1]);
// tresty podľa závažnosti (dôkazy po obhajobe)
const VERDICTS = [
  [8, 'Oslobodený', 'Nedostatok dôkazov.'],
  [18, 'Pokuta', 'pokuta'],
  [32, 'Pokuta a −6 bodov', 'pokuta, −6 bodov'],
  [50, 'Pokuta, −12 bodov a zákaz prestupov', 'pokuta, −12 bodov, zákaz prestupov'],
  [75, 'Preradenie o súťaž nižšie', 'po sezóne o ligu nižšie, pokuta, −6 bodov'],
  [100, 'Preradenie o dve súťaže nižšie', 'po sezóne o dve ligy nižšie, pokuta, zákaz prestupov'],
  [Infinity, 'Zrušenie klubu', 'klub po sezóne zaniká a začína v najnižšej súťaži'],
];
function verdictFor(s) { return VERDICTS.findIndex(v => s < v[0]); }
function holdCourt(law, confess) {
  const M = maf(), u = userTeam(), unit = mafUnit();
  if (!M.court) return null;
  const lc = lawyerCost(law);
  if (lc) book('eventx', -lc);
  let s = M.court.s * LAWYERS[law][2], luck = null;
  if (confess) s *= 0.75;
  else { luck = U.chance(s < 40 ? 0.55 : 0.35); s *= luck ? 0.4 : 1.2; }
  const v = verdictFor(s), V = VERDICTS[v];
  const fine = v ? U.nice(unit * [0, 3, 4, 8, 12, 12, 14][v]) : 0, cfine = v ? U.nice(unit * [0, 1, 1, 2, 3, 3, 4][v]) : 0;
  if (v >= 1) { book('fines', -fine); G.coachCash = Math.max(0, (G.coachCash || 0) - cfine); }
  const ded = [0, 0, 6, 12, 6, 0, 0][v];
  if (ded) u.ded = (u.ded || 0) + ded;
  if (v === 3 || v === 5) M.ban = dayKey() + 45;
  if (v === 4) M.down = Math.max(M.down, 1);
  if (v === 5) M.down = Math.max(M.down, 2);
  if (v === 6) M.close = true;
  if (v >= 2) { const b = board(); b.conf = Math.max(0, b.conf - [0, 0, 10, 20, 30, 40, 100][v]); }
  if (G.biz && v >= 2) { G.biz.mood = Math.max(0, (G.biz.mood ?? 60) - 10 * v); G.biz.fans = Math.round(G.biz.fans * (1 - 0.04 * v)); }
  const res = { v, title: V[1], txt: V[2], fine: v >= 1 ? fine : 0, cfine: v >= 1 ? cfine : 0, ded, luck, confess, s: Math.round(s) };
  news(`⚖️ Rozsudok: ${V[1]}.`, v === 0 ? 'good' : 'bad');
  mafLog(`Súd: ${V[1]}.`, v === 0 ? 'good' : 'bad');
  // mafia sa stiahne, časť dôkazov ostáva
  M.court = null; M.inq = null; M.clan = null; M.spons = null; M.job = 0; M.dem = []; M.fix = null; M.debt = null;
  M.heat = 10; M.inv = Math.round(M.inv * 0.3); M.sweeps = 0;
  return res;
}

// ── Denné a sezónne napojenie ──────────────────────────────────
function mafiaDay(ev) {
  const M = G.maf;
  if (!M || G.userTid < 0) return;
  if (!ev || ev.t !== 'L') return;
  const u = userTeam();
  if (M.spons && M.spons.y === G.year && M.clan) { book('mafia', M.spons.amt); addHeat(1); M.inv += 0.25; }
  if (M.job) book('staff', -M.job);
  // dlh po splatnosti
  if (M.debt && dayKey() > M.debt.due) { M.rel = Math.max(0, M.rel - 15); M.debt.amt = Math.round(M.debt.amt * 1.1); M.debt.due = dayKey() + 4; mafLog('Dlh po splatnosti – úrok +10 %.', 'bad'); mafThreat(true); }
  if (M.dem.length && dayKey() > M.dem[0].exp) answerDemand(false);
  if (M.clan && !M.dem.length && U.chance(0.08 + 0.02 * Math.min(6, M.uses) + 0.15 * (M.owe || 0))) newDemand();
  if (M.clan && M.rel < 25) mafThreat();
  M.heat = Math.max(0, M.heat - (M.clan ? 1.2 : 2.5));
  // polícia
  // pri veľa dôkazoch sa raz niekto prerieknie aj bez veľkej pozornosti
  const leak = M.inv > 25 ? (M.inv - 25) / 900 * mafVis(u.lvl) : 0;
  if (!M.inq && !M.court && (M.heat >= 90 || (M.heat >= 30 && U.chance((M.heat - 25) / 220)) || U.chance(leak))) {
    M.inq = { p: 0 };
    inboxAdd({ type: 'info', text: '🚨 Polícia začala vyšetrovať klub. Pozri záložku Mafia.' });
    news('🚨 Polícia vyšetruje podozrivé peniaze v klube.', 'bad');
    mafLog('Začalo vyšetrovanie.', 'bad');
  }
  if (M.inq && !M.court) {
    M.inq.p += 7 + M.heat / 8;
    if (M.inq.p >= 100) { M.court = { s: Math.round(M.inv) }; inboxAdd({ type: 'info', text: `⚖️ Klub je obžalovaný. Súd čaká – rozhodni o obhajobe (záložka Mafia).` }); mafLog('Obžaloba – súd.', 'bad'); }
  }
}
// po sezóne: tresty preradenia a zrušenia klubu
function mafiaSeasonEnd(sum) {
  const M = G.maf;
  if (!M) return;
  const u = userTeam();
  if (M.close) {
    sum.mafia = `Klub ${u.name} bol súdom zrušený – začína odznova v najnižšej súťaži.`;
    mafForceDown(9);
    for (const p of teamPlayers(u).filter(p => p.age > 19)) toFreeAgent(p);
    while (teamPlayers(u).length < 16) { const p = genPlayer(u.id, U.pick(['GK', 'DF', 'DF', 'MF', 'MF', 'FW']), LEVEL_INFO[9].base); u.pids.push(p.id); }
    u.budget = Math.min(u.budget, LEVEL_INFO[9].budget);
    const b = board(); b.sacked = true; b.offers = jobOffers(false); sum.jobs = b.offers.slice();
    M.close = false; M.down = 0;
  } else if (M.down) {
    // z najnižšej súťaže už nie je kam zostúpiť – namiesto toho odpočet bodov
    const over = Math.max(0, u.lvl + M.down - 9);
    if (over) u.dedNext = (u.dedNext || 0) + 15 * over;
    sum.mafia = over === M.down ? `Trest súdu: −${15 * over} bodov na začiatku novej sezóny.` : `Trest súdu: ${u.name} hrá od novej sezóny o ${M.down - over === 1 ? 'súťaž' : 'dve súťaže'} nižšie${over ? ` a začína s −${15 * over} bodmi` : ''}.`;
    mafForceDown(Math.min(9, u.lvl + M.down));
    M.down = 0;
  }
  M.heat = Math.round(M.heat * 0.5); M.inv = Math.round(M.inv * 0.8); M.cd = {}; M.spons = null; M.job = 0;
  if (sum.mafia) { inboxAdd({ type: 'info', text: '⚖️ ' + sum.mafia }); news('⚖️ ' + sum.mafia, 'bad'); }
}
function mafForceDown(lvl) {
  const u = userTeam();
  if (u.lvl >= lvl) return;
  const target = G.leagues.find(l => l.lvl === lvl && (l.reg === u.reg || l.reg == null)) || G.leagues.find(l => l.lvl === lvl);
  const from = G.leagues[u.lid];
  const swap = leagueTable(target).map(r => G.teams[r.tid]).find(t => t.parent == null && eligibleFor(t, from.lvl));
  moveTeam(u.id, target);
  if (swap) moveTeam(swap.id, from);
  const B = bTeam();
  if (B && B.lvl <= u.lvl && B.lvl < 9) { const dn = G.leagues.find(l => l.lvl === Math.min(9, u.lvl + 1) && (l.reg === u.reg || l.reg == null)); if (dn) { const sw = leagueTable(dn).map(r => G.teams[r.tid]).find(t => t.parent == null); const fl = G.leagues[B.lid]; moveTeam(B.id, dn); if (sw) moveTeam(sw.id, fl); } }
}
