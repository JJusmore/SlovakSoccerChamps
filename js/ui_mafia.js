'use strict';
// ─── Záložka Mafia: kontakty, služby, protislužby, vyšetrovanie, súd ───

const heatCol = h => (h >= 70 ? '#ff5a5f' : h >= 40 ? '#ff9f43' : h >= 20 ? '#ffd23f' : '#2ecc71');
const tierStars = t => `<span class="stars">${'★'.repeat(t)}<i>${'★'.repeat(3 - t)}</i></span>`;
const mafAlert = () => !!(G.maf && (G.maf.court || G.maf.dem.length || G.maf.inq));

function tabMafia() {
  const M = maf(), u = userTeam(), vis = mafVis(u.lvl), V = VERDICTS[verdictFor(M.inv)];
  const tiles = `<div class="stgrid four">
${tile('Kontakt', M.clan ? U.esc(M.clan.n) : '—', M.clan ? `${MAF_TIER[M.clan.tier]} · ${U.esc(M.clan.city)}` : 'bez kontaktu')}
${tile('Vzťah', M.clan ? `${Math.round(M.rel)} %` : '—', M.clan ? meter(M.rel, 100, confCol(M.rel)) : '')}
${tile('Pozornosť polície', `<span style="color:${heatCol(M.heat)}">${Math.round(M.heat)} %</span>`, meter(M.heat, 100, heatCol(M.heat)) + `<span class="maf-vis">${leagueOf(u).name} · ×${String(vis).replace('.', ',')}</span>`)}
${tile('Dôkazy', Math.round(M.inv), M.inv ? `hrozí: ${V[1].toLowerCase()}` : 'čistý štít')}</div>`;
  const court = M.court ? `<div class="card maf-court"><div class="card-h">⚖️ Súd čaká</div><p>Klub je obžalovaný. Dôkazy: <b>${M.court.s}</b>.</p><div class="m-btns left"><button class="btn btn-bad" data-a="mafCourt">Ísť na súd</button></div></div>` : '';
  const inq = M.inq && !M.court ? `<div class="card maf-inq"><div class="card-h">🚨 Vyšetrovanie <span class="muted">${Math.min(100, Math.round(M.inq.p))} %</span></div>${meter(M.inq.p, 100, '#ff5a5f')}
<div class="m-btns left"><button class="btn btn-ghost sm" data-a="mafSweep" ${M.sweeps >= 2 ? 'disabled' : ''}>🧹 Zamiesť stopy · ${U.money(U.nice(mafUnit() * 3))}</button></div></div>` : '';
  const dem = M.dem.length ? `<div class="card maf-dem"><div class="card-h">🕶️ ${U.esc(M.clan ? M.clan.n : 'Mafia')} chce <span class="muted">ešte ${Math.max(0, M.dem[0].exp - dayKey()) + 1} dní</span></div>
<div class="dem-row"><span class="dem-ic">${MAF_DEM.find(d => d[0] === M.dem[0].k)[1]}</span><b>${U.esc(demText(M.dem[0]))}</b></div>
<div class="m-btns"><button class="btn btn-ghost sm" data-a="mafDem" data-v="0">Odmietnuť</button><button class="btn btn-go sm" data-a="mafDem" data-v="1">Splniť</button></div></div>` : '';
  const debt = M.debt ? `<div class="card"><div class="card-h">💸 Dlh</div><div class="dl-row"><span>Vrátiť</span><b>${U.money(M.debt.amt)}</b><em>${M.debt.due >= dayKey() ? `o ${M.debt.due - dayKey()} dní` : 'po splatnosti'}</em></div><div class="m-btns"><button class="btn btn-go sm" data-a="mafRepay">Vrátiť dlh</button></div></div>` : '';
  const contacts = mafContacts().map(c => {
    const cur = M.clan && M.clan.id === c.id, fee = contactFee(c);
    return `<div class="xr mfk ${cur ? 'cur' : ''}"><span class="ob-ic">${c.tier === 3 ? '🎩' : c.tier === 2 ? '🕴️' : '🍺'}</span><div class="xr-n"><b>${U.esc(c.n)}</b><small>${U.esc(c.boss)} · ${U.esc(c.city)}${c.out ? ' · cudzí' : ''}</small></div>${tierStars(c.tier)}<small class="xr-v">${fee ? U.money(fee) : 'zadarmo'}</small>${cur ? '<span class="tag ok">aktívny</span>' : `<button class="btn btn-blue sm xr-b" data-a="mafJoin" data-v="${c.id}">${c.out ? 'Zavolať' : 'Nadviazať'}</button>`}</div>`;
  }).join('');
  const serv = MAF_SERV.map(s => {
    const [k, ic, n, min, give, want, h, inv] = s, lock = servLock(s), t = M.clan ? M.clan.tier : 1;
    const hh = h > 0 ? `+${Math.round(h * vis * (M.clan && M.clan.out ? 1.25 : 1))}` : h;
    return `<div class="msv ${lock ? 'lock' : ''}"><div class="msv-h"><span>${ic}</span><b>${n}</b>${min > 1 ? tierStars(min) : ''}</div>
<div class="msv-r"><small>Dostaneš</small><b>${give(Math.max(min, t))}</b></div><div class="msv-r"><small>Chcú</small><b>${want(Math.max(min, t))}</b></div>
<div class="msv-c"><i class="${h > 0 ? 'hot' : 'cool'}">🚨 ${hh}</i><i>📁 +${inv}</i></div>
<button class="btn ${lock ? 'btn-ghost' : 'btn-go'} sm" data-a="mafUse" data-v="${k}" ${lock ? `disabled title="${U.esc(lock)}"` : ''}>${lock ? U.esc(lock) : 'Využiť'}</button></div>`;
  }).join('');
  const log = M.log.length ? `<div class="card"><div class="card-h">📓 Denník</div><div class="maf-log">${M.log.slice(0, 12).map(l => `<div class="${l.cls}"><small>${l.d}</small>${U.esc(l.t)}</div>`).join('')}</div></div>` : '';
  return `${tiles}${court}${inq}${dem}
<div class="grid2 eq"><div class="card"><div class="card-h">📇 Kontakty</div><div class="xlist">${contacts}</div>${M.clan ? '<div class="m-btns"><button class="btn btn-ghost sm" data-a="mafLeave">Ukončiť spoluprácu</button></div>' : ''}</div>
<div>${debt}${log || '<div class="card"><div class="card-h">📓 Denník</div><p class="muted small">Zatiaľ čisté.</p></div>'}</div></div>
<div class="card"><div class="card-h">🎲 Služby ${M.clan ? `<span class="muted">${U.esc(M.clan.n)}</span>` : ''}</div><div class="msv-grid">${serv}</div></div>`;
}

// ── Súd ────────────────────────────────────────────────────────
function openCourt() {
  const M = maf();
  if (!M.court) return;
  const st = { law: 1, conf: true };
  const html = () => `<div class="court"><div class="court-h">⚖️ Súd</div>
<div class="stgrid three">${tile('Obžalovaný', U.esc(userTeam().name))}${tile('Dôkazy', M.court.s)}${tile('Hrozí', VERDICTS[verdictFor(M.court.s)][1])}</div>
${frow('Advokát', seg(LAWYERS.map(([n], i) => [i, `${n}<small>${lawyerCost(i) ? U.money(lawyerCost(i)) : 'zadarmo'}</small>`]), st.law, 'x', 'data-m="law"'))}
${frow('Obhajoba', seg([[1, 'Priznať sa<small>istejší, menší trest</small>'], [0, 'Zapierať<small>risk: oslobodenie alebo prísnejší</small>']], st.conf ? 1 : 0, 'x', 'data-m="conf"'))}
<div class="m-btns"><button class="btn btn-bad" data-m="go">Vyniesť rozsudok</button></div></div>`;
  const m = modal(html(), {
    cls: 'court-m', locked: true,
    on: (k, b) => {
      if (k === 'law') { st.law = +b.dataset.v; m.el.querySelector('.modal').innerHTML = html(); return false; }
      if (k === 'conf') { st.conf = b.dataset.v === '1'; m.el.querySelector('.modal').innerHTML = html(); return false; }
      if (k === 'go') {
        if (userTeam().budget < lawyerCost(st.law) && st.law) { toast('Na advokáta nemáš peniaze.', 'bad'); return false; }
        const r = holdCourt(st.law, st.conf);
        saveGame();
        m.el.querySelector('.modal').innerHTML = `<div class="court verdict v${r.v}"><div class="court-h">⚖️ Rozsudok</div><div class="vd-t">${U.esc(r.title)}</div><p class="muted">${U.esc(r.txt)}</p>
${r.luck === true ? '<p class="pos">Zapieranie vyšlo – dôkazy neobstáli.</p>' : r.luck === false ? '<p class="neg">Zapieranie nevyšlo – súd bol prísnejší.</p>' : ''}
<div class="stgrid three">${tile('Pokuta klubu', r.fine ? U.money(r.fine) : '—')}${tile('Body', r.ded ? `−${r.ded}` : '—')}${tile('Tvoja pokuta', r.cfine ? U.money(r.cfine) : '—')}</div>
<div class="m-btns"><button class="btn btn-go" data-m="ok">Pokračovať</button></div></div>`;
        return false;
      }
      if (k === 'ok') { rerenderAny(); return true; }
      return false;
    },
  });
}

Object.assign(ACT, {
  mafJoin(el) { const c = mafContacts().find(x => String(x.id) === el.dataset.v); const e = c ? joinClan(c) : 'Kontakt neexistuje.'; toast(e || `🕶️ Kontakt nadviazaný: ${c.n}`, e ? 'bad' : 'good'); saveGame(); renderTab(); },
  mafLeave() { confirmBox('Ukončiť spoluprácu', 'Mafia to nemusí zobrať dobre.', 'Ukončiť', () => { leaveClan(); saveGame(); renderTab(); }, 'btn-bad'); },
  mafUse(el) { const e = useServ(el.dataset.v); toast(e || '🕶️ Dohodnuté.', e ? 'bad' : 'good'); saveGame(); screenHub(); },
  mafDem(el) { const e = answerDemand(el.dataset.v === '1'); if (e) toast(e, 'bad'); saveGame(); screenHub(); },
  mafRepay() { const e = repayDebt(); toast(e || 'Dlh vrátený.', e ? 'bad' : 'good'); saveGame(); screenHub(); },
  mafSweep() { const e = sweep(); toast(e || '🧹 Stopy zametené.', e ? 'bad' : 'good'); saveGame(); renderTab(); },
  mafCourt() { openCourt(); },
});
