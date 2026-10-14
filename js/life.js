'use strict';
// ─── Život okolo tímu: osobné udalosti, požiadavky na plat, hviezdne maniere, sociálne siete,
//     správy skautov, šatňa cez polčas, podrobné štatistiky (xG, strely, heatmapa) ───

// ── Osobné udalosti hráčov ─────────────────────────────────────
const LIFE = [
  ['homesick', p => p.nat !== 'SVK' && p.joined === G.year, '🏠', '{n} trápi stesk za domovom.', { mor: -12 }],
  ['family', () => true, '💔', '{n} rieši rodinné problémy.', { mor: -15 }],
  ['wedding', p => p.age >= 23, '💍', '{n} sa oženil!', { mor: 12 }],
  ['baby', p => p.age >= 24, '👶', '{n} sa stal otcom – dostal pár dní voľna.', { mor: 15, off: [8, 2, 3] }],
  ['ill', () => true, '🤒', '{n} ochorel na chrípku.', { off: [7, 2, 5] }],
  ['school', p => p.age <= 19, '🎓', '{n} zmaturoval – teraz sa môže naplno venovať futbalu.', { mor: 8, xp: 2 }],
  ['party', p => p.age <= 27 && mor(p) >= 65, '🍾', '{n} bol do rána na párty – klub ho pokutoval.', { mor: -5, fine: true }],
  ['charity', p => p.r >= 60, '❤️', '{n} navštívil detskú nemocnicu – fanúšikovia sú nadšení.', { mor: 5, fans: 2 }],
];
function lifeDay() {
  for (const p of teamPlayers(userTeam())) {
    if (p.acad || !U.chance(0.004)) continue;
    const opts = LIFE.filter(l => l[1](p));
    const [, , ic, txt, ef] = U.pick(opts);
    if (ef.mor) addMor(p, ef.mor);
    if (ef.xp) p.xp = Math.min(100, (p.xp ?? 20) + ef.xp);
    if (ef.off && !injured(p)) p.inj = { k: ef.off[0], d: U.ri(ef.off[1], ef.off[2]) };
    if (ef.fine) book('events', U.nice(Math.max(100, (p.w || 0) * 0.5)));
    if (ef.fans && G.biz) G.biz.mood = Math.min(100, (G.biz.mood ?? 60) + ef.fans);
    news(`${ic} ${txt.replace('{n}', pFull(p))}`, ef.mor > 0 || ef.fans ? 'good' : 'info');
    return;
  }
}

// ── Forma: požiadavka na vyšší plat, hviezdne maniere ─────────
const formOf = p => (p.lr && p.lr.length >= 3 ? U.avg(p.lr) : 0);
function formDay() {
  const u = userTeam();
  for (const p of teamPlayers(u)) {
    const f = formOf(p);
    if (p.raise && dayKey() >= p.raise) {
      p.raise = 0;
      if ((p.w || 0) < wageFor(p, u.lvl) * 0.85) { addMor(p, -12); news(`😤 ${pFull(p)} je sklamaný – nedostal vyšší plat.`, 'bad'); }
    } else if (!p.raise && f >= 71 && contractLeft(p) >= 2 && (p.w || 0) < wageFor(p, u.lvl) * 0.8 && U.chance(0.15)) {
      p.raise = dayKey() + 10;
      inboxAdd({ type: 'contract', text: `💰 ${pFull(p)} hrá výborne (Ø ${(f / 10).toFixed(1).replace('.', ',')}) a chce vyšší plat. Predĺž mu zmluvu do 10 dní, inak bude nespokojný.` });
    }
    if (!p.ego && mor(p) >= 90 && f >= 73 && U.chance(0.01)) { p.ego = dayKey() + 10; news(`⭐ ${pFull(p)} si začína stavať hlavu – v šatni to škrípe.`, 'bad'); }
    if (p.ego && dayKey() >= p.ego) p.ego = 0;
  }
}
const egoCount = t => teamPlayers(t).filter(p => p.ego).length;

// ── Sociálne siete po zápase ───────────────────────────────────
function socialPosts(x, res) {
  const u = userTeam(), home = x.m.h === u.id, side = home ? 0 : 1, my = home ? res.hg : res.ag, op = home ? res.ag : res.hg;
  const opp = G.teams[home ? x.m.a : x.m.h], der = rivalry(u, opp);
  const fan = '@' + (U.plain ? U.plain(u.short) : u.short).toLowerCase() + '_ultras', oppFan = '@' + opp.short.toLowerCase() + '_fans';
  const ids = [...(res.lu ? res.lu[side] : []), ...(res.sb ? res.sb[side] : [])];
  const rt = res.rt || {}, best = ids.filter(id => rt[id]).sort((a, b) => rt[b] - rt[a])[0], worst = ids.filter(id => rt[id]).sort((a, b) => rt[a] - rt[b])[0];
  const nm = id => (G.players[id] ? pName(G.players[id]) : '');
  const posts = [];
  const lg = leagueOf(u), recent = (lg.rounds || []).flat().filter(m => m.hg != null && (m.h === u.id || m.a === u.id)).slice(-3);
  const slump = recent.length >= 3 && recent.every(m => (m.h === u.id ? m.hg < m.ag : m.ag < m.hg));
  if (my > op) posts.push([fan, my - op >= 3 ? `Čo to bolo?! ${my}:${op} 🔥🔥 ${der ? 'Derby je naše!' : 'Takto chceme hrať každý týždeň!'}` : `${der ? 'DERBY JE NAŠE! 💪' : 'Tri body doma 💪'} ${my}:${op}`, 900 + my * 300]);
  else if (my < op) posts.push([fan, op - my >= 3 ? `${my}:${op}… hanba. Takto nie. 😡` : `Škoda, ${my}:${op}. Hore hlavy, ďalší zápas to otočíme.`, 400]);
  else posts.push([fan, `${my}:${op}. Bod je bod, ale chceli sme viac.`, 300]);
  if (best && rt[best] >= 78) posts.push(['@futbal_sk', `${nm(best)} dnes ťahal celý tím – hodnotenie ${(rt[best] / 10).toFixed(1).replace('.', ',')} ⭐`, 1200]);
  if (worst && rt[worst] <= 52) posts.push([fan, `${nm(worst)} dnes úplne mimo. Do základu už nie… 🙈`, 260]);
  if ((res.varx || []).some(v => v.side === side)) posts.push([fan, 'VAR nám zobral gól. Kto to má pochopiť? 📺🤬', 780]);
  if (der && my < op) posts.push([oppFan, `Mesto je naše! ${op}:${my} 😎`, 1500]);
  if (slump) posts.push(['@slovenskyfutbal', `Ďalšia prehra – na sieťach sa šíri #trénervon. Ako dlho ešte vydrží ${G.coach}?`, 2100]);
  return { posts: posts.slice(0, 4), slump };
}
function socialAfterMatch(x, res) {
  const s = socialPosts(x, res);
  if (s.slump) { const b = board(); b.conf = U.clamp(b.conf - 1.5 * ownerPat(), 0, 100); }
  return s;
}

// ── Správa skauta ──────────────────────────────────────────────
const ADJ_HI = ['vynikajúca', 'veľmi dobrá', 'silná'], ADJ_LO = ['slabšia', 'priemerná'];
function scoutReport(p) {
  if (know(p) < 70 || p.tid === G.userTid) return null;
  const a = playerAttrs(p), names = attrNames(p, true).map(s => s.toLowerCase());
  const ord = a.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0]);
  const out = [];
  const lead = `${p.age <= 21 ? 'mladý ' : p.age >= 31 ? 'skúsený ' : ''}${POS_NAME_SK[p.pos].toLowerCase()}`;
  out.push(`${lead[0].toUpperCase() + lead.slice(1)}, štýl: ${archName(p).toLowerCase()}.`);
  out.push(`Silné stránky: ${names[ord[0][1]]} (${ADJ_HI[ord[0][0] >= 75 ? 0 : ord[0][0] >= 62 ? 1 : 2]}) a ${names[ord[1][1]]}. Slabšia je ${names[ord[5][1]]}.`);
  const tr = Object.keys(p.tr || {}).filter(k => p.tr[k]).map(k => TRAITS[k] && TRAITS[k].n.toLowerCase()).filter(Boolean);
  if (tr.length) out.push(`Špeciality: ${tr.slice(0, 3).join(', ')}.`);
  const g = potGap(p);
  if (p.age <= 23) out.push(g >= 12 ? 'Má veľký potenciál – môže sa výrazne zlepšiť.' : g >= 6 ? 'Ešte sa zlepší.' : 'Veľa priestoru na rast už nemá.');
  const mine = teamPlayers(userTeam()).filter(x => x.pos === p.pos).sort((x, y) => y.r - x.r)[0];
  if (mine) { const d = p.r - mine.r; out.push(d >= 2 ? `Bol by u teba v základe – lepší ako ${pName(mine)} (+${d}).` : d >= -3 ? `Je na úrovni ${pName(mine)} – konkurencia na poste.` : `Bol by náhradník za ${pName(mine)} (${d}).`); }
  const f = formOf(p);
  if (f) out.push(f >= 70 ? 'Je vo výbornej forme.' : f < 58 ? 'Momentálne sa mu nedarí.' : '');
  return out.filter(Boolean).join(' ');
}

// ── Šatňa cez polčas ───────────────────────────────────────────
const HT_TALKS = [['praise', '👏 Pochváliť'], ['shout', '😤 Zvýšiť hlas'], ['calm', '🧘 Pokojne']];
function halfTalk(team, diff, k) {
  let f = 1, m = 0, txt;
  if (k === 'praise') { f = diff >= 0 ? 1.04 : 0.98; m = diff >= 0 ? 4 : -1; txt = diff >= 0 ? 'Hráči sú sebavedomí.' : 'Pochvala pri prehre nezabrala.'; }
  else if (k === 'shout') {
    if (diff < 0 && U.chance(0.6)) { f = 1.1; m = 1; txt = 'Hráči sa nahecovali!'; }
    else { f = diff > 0 ? 0.96 : 0.95; m = -4; txt = 'Hráči sú zaskočení.'; }
  } else { f = diff > 0 ? 1 : 1.02; m = 1; txt = 'Hráči sú pokojní a sústredení.'; }
  G.htTalk = { tid: team.id, f };
  return { m, txt };
}

// ── Podrobné štatistiky simulovaného zápasu ────────────────────
function simStats(home, away, res, shots) {
  const sH = teamStrength(home), sA = teamStrength(away), tH = tacOf(home), tA = tacOf(away);
  let poss = 50 + (sH.mid - sA.mid) * 1.2 + (tH.s === 0 ? 5 : tH.s === 3 ? -5 : 0) - (tA.s === 0 ? 5 : tA.s === 3 ? -5 : 0);
  poss = Math.round(U.clamp(poss + U.rf(-3, 3), 28, 72));
  const xg = [0, 0], onT = [0, 0], big = [0, 0], ck = [0, 0];
  for (const s of shots) { xg[s.side] += s.p; if (s.goal || U.chance(0.22 + s.p)) onT[s.side]++; if (s.p >= 0.4) big[s.side]++; if (s.sp === 'ck') ck[s.side]++; }
  for (let i = 0; i < 2; i++) { ck[i] += U.poisson(2.6); onT[i] = Math.max(onT[i], [res.hg, res.ag][i]); }
  const pas = [Math.round(260 + poss * 4.6 + U.rf(-25, 25)), Math.round(260 + (100 - poss) * 4.6 + U.rf(-25, 25))];
  const acc = [Math.round(U.clamp(68 + (sH.mid - 50) / 2.5 + (tH.s === 0 ? 4 : tH.s === 2 ? -4 : 0), 60, 92)), Math.round(U.clamp(68 + (sA.mid - 50) / 2.5 + (tA.s === 0 ? 4 : tA.s === 2 ? -4 : 0), 60, 92))];
  const du = Math.round(U.clamp(50 + (sH.def - sA.att) / 3 + U.rf(-4, 4), 32, 68));
  return { poss, onT, xg: xg.map(v => Math.round(v * 100) / 100), big, ck, pas, acc, duel: [du, 100 - du] };
}
// pozícia strely pre mapu striel (hosťujúci tím útočí doprava, domáci doľava – normalizované na útok doprava)
function shotSpot(s) {
  if (s.sp === 'pk') return [0.89, 0.5];
  const near = U.clamp(s.p * 1.6, 0.05, 0.9);
  return [U.clamp(0.97 - (1 - near) * 0.28 - Math.random() * 0.05, 0.6, 0.97), U.clamp(0.5 + U.gauss() * (0.12 + (1 - near) * 0.08), 0.12, 0.88)];
}
// odhad heatmapy hráča zo simulácie (podľa postu v zostave)
function heatGuess(t, pid) {
  const i = (t.lineup || []).indexOf(pid);
  const slot = i >= 0 ? FORMATIONS[t.form][i] : null, g = new Array(96).fill(0);
  if (!slot) return g;
  const [, fx, fy] = slot;
  for (let k = 0; k < 160; k++) {
    const x = U.clamp(fx + U.gauss() * 0.14 + (slot[0] === 'DF' ? 0.05 : slot[0] === 'FW' ? -0.05 : 0), 0, 0.999), y = U.clamp(fy + U.gauss() * 0.13, 0, 0.999);
    g[Math.floor(y * 8) * 12 + Math.floor(x * 12)]++;
  }
  return g;
}

// ── Denné napojenie ────────────────────────────────────────────
function lifeDayAll() {
  if (G.userTid < 0) return;
  lifeDay();
  if (G.day % 3 === 0) formDay();
}
