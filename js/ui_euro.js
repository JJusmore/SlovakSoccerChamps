'use strict';
// ─── Európske poháre v záložke Poháre ───

// názov súťaže a kola pre ľubovoľný zápas (liga, pohár, Európa)
function fixLabel(x, r) {
  if (x.comp === 'L') return `${leagueOf(userTeam()).name} · ${r + 1}. kolo`;
  if (x.comp === 'E') return euroLabel(euroOf(x), r);
  return cupLabel(cupOfMatch(x), r);
}
function fixKind(x) { return x.comp === 'E' ? euroOf(x).kind : x.comp === 'C' ? cupOfMatch(x).kind : ''; }

function euroChips(k) {
  const u = userTeam();
  return euroList().map(c => `<button class="cupc cup-${c.kind} ${c.id === k ? 'on' : ''}" data-a="cupGo" data-v="${c.id}">${trophySVG(c.kind, 22)}<span>${c.name}</span>${c.entrants.includes(u.id) ? `<i class="${c.alive.includes(u.id) ? 'in' : 'out'}"></i>` : ''}</button>`).join('');
}

function euroGroupCard(c, gi) {
  const u = userTeam(), tb = euroGroupTable(c, gi), done = c.cur >= 6;
  return `<div class="eg ${c.groups[gi].includes(u.id) ? 'mine' : ''}"><div class="eg-h">Skupina ${'ABCD'[gi]}</div>
<table class="ltbl eg-t"><tbody>${tb.map((r, i) => {
    const t = G.teams[r.tid], gd = r.gf - r.ga;
    return `<tr class="lrow ${i < 2 ? 'zn-' + (done ? 'up' : 'euro') : ''} ${r.tid === u.id ? 'me' : ''}"><td class="lr-pos"><span class="pb ${i < 2 ? (done ? 'up' : 'euro') : ''}">${i + 1}</span></td>
<td class="tl lr-club"><span class="tt" data-a="team" data-id="${t.id}">${crestSVG(t, 22)}<b>${U.esc(t.name)}</b></span>${t.fx ? `<i class="eg-cc">${t.fx}</i>` : '<i class="eg-cc sk">SVK</i>'}</td>
<td>${r.p}</td><td class="lr-gd ${gd > 0 ? 'p' : gd < 0 ? 'n' : ''}">${gd > 0 ? '+' : ''}${gd}</td><td><span class="lr-pts">${r.pts}</span></td></tr>`;
  }).join('')}</tbody></table></div>`;
}

function tabEuro(c, chips) {
  const u = userTeam(), P = EURO_DEF[c.id].prize;
  const inC = c.entrants.includes(u.id), alive = c.alive.includes(u.id);
  const status = !inC ? '' : c.winner === u.id ? `🏆 Vyhral si ${c.name}!` : alive ? (c.winner != null ? '' : 'Tvoj klub je v hre') : `Tvoj klub skončil (${euroReach(c, u.id)})`;
  const sk = c.entrants.filter(id => !G.teams[id].fx);
  const stages = [...Array.from({ length: 6 }, (_, i) => `${i + 1}. kolo`), ...EURO_KO];
  let r = UI.euroR ?? Math.min(c.cur, 8);
  if (r > 5 && !c.ko[r - 6]) r = Math.min(c.cur, 5);
  const ms = (euroStage(c, r) || []).slice().sort((a, b) => ((b.h === u.id || b.a === u.id) - (a.h === u.id || a.a === u.id)) || (a.g ?? 0) - (b.g ?? 0));
  const path = `<div class="cup-path">${stages.map((nm, i) => {
    const m = euroUserMatch(c, i);
    const won = m && m.hg != null && (i < 6 ? (m.h === u.id ? m.hg > m.ag : m.ag > m.hg) : m.w === u.id), lost = m && m.hg != null && (i < 6 ? (m.h === u.id ? m.hg < m.ag : m.ag < m.hg) : m.w !== u.id);
    const pr = i < 6 ? `+${U.money(P.win)}` : U.money(P.ko[i - 6] || P.champ);
    return `<div class="cpt ${i < c.cur ? 'done' : i === c.cur && c.winner == null ? 'now' : ''} ${won ? 'won' : ''} ${lost ? 'lost' : ''}" data-a="euroR" data-v="${i}"><small>${nm}</small><b>${pr}</b>${won ? '<i>✔</i>' : lost ? '<i>✖</i>' : ''}</div>`;
  }).join('')}</div>`;
  const ko = c.ko.length ? `<div class="eko">${c.ko.map((rd, i) => `<div class="eko-col"><div class="eko-h">${EURO_KO[i]}</div>${rd.map(m => matchLine(m, 'C')).join('')}</div>`).join('')}</div>` : '';
  return `<div class="card cupcard">
<div class="cup-chips">${chips}</div>
<div class="cup-hero cup-${c.kind}" title="16 klubov v 4 skupinách, prví dvaja postupujú do štvrťfinále. Vyraďovačka na jeden zápas, finále na neutrálnej pôde. Prémie: účasť ${U.money(P.entry)}, výhra ${U.money(P.win)}, remíza ${U.money(P.draw)}.">${trophySVG(c.kind, 92)}
<div class="ch-t"><div class="ch-name">${c.name}</div><div class="ch-sub">${seasonLabel()} · ${sk.length ? '🇸🇰 ' + sk.map(id => U.esc(G.teams[id].short)).join(', ') : 'bez slovenského klubu'}${status ? ' · ' + status : ''}</div></div>
${c.earn ? `<div class="ch-earn"><small>Tvoje prémie</small><b>${U.money(c.earn)}</b></div>` : ''}</div>
${path}
${c.winner != null ? `<div class="cup-win">${trophySVG(c.kind, 70)}<div>Víťaz: ${teamTag(G.teams[c.winner], 26)}</div></div>` : ''}
${ko}
<div class="eg-grid">${c.groups.map((_, gi) => euroGroupCard(c, gi)).join('')}</div>
${r < 6 ? `<div class="card-h e-rh"><span>${stages[r]}</span></div>${ms.map(m => matchLine(m, 'L')).join('')}` : c.ko.length ? '' : '<p class="muted">Žreb ešte nebol.</p>'}
</div>`;
}

function homeEuroRows() {
  const u = userTeam();
  return userEuro().map(c => {
    const st = c.winner === u.id ? '<b class="pos">🏆 Víťaz</b>' : c.alive.includes(u.id) && c.winner == null ? `<b class="hc-on">${c.cur <= 5 ? 'skupina ' + 'ABCD'[c.groups.findIndex(g => g.includes(u.id))] : 'v hre · ' + EURO_KO[Math.min(2, c.cur - 6)]}</b>` : `<span class="muted">koniec (${euroReach(c, u.id)})</span>`;
    return `<div class="hc-row" data-a="cupGo" data-v="${c.id}">${trophySVG(c.kind, 26)}<span>${c.name}</span>${st}${c.earn ? `<small class="pos">+${U.money(c.earn)}</small>` : ''}</div>`;
  }).join('');
}

Object.assign(ACT, {
  euroR(el) { UI.euroR = +el.dataset.v; renderTab(); },
});
