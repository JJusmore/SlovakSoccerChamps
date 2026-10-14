'use strict';
// ─── Záložka Tím: ihrisko s postavičkami, lavička, ťahanie hráčov ───

const fitColor = f => (f > 75 ? '#2ecc71' : f > 55 ? '#f4b400' : '#ff5a5f');
const GK_SHIRT = { p: '#2ecc71', s: '#111111', sh: '#1a1a1a', pat: 'plain', so: '#2ecc71' };
const POS_GROUPS = [['GK', 'Brankári'], ['DF', 'Obrancovia'], ['MF', 'Záložníci'], ['FW', 'Útočníci']];

function pitchSVG() {
  // ihrisko 68 × 80 (zvislo, útok smerom hore)
  const L = 'rgba(255,255,255,.75)';
  return `<svg class="pitch-svg" viewBox="0 0 68 80" preserveAspectRatio="none" aria-hidden="true">
<defs><radialGradient id="pv" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="rgba(0,0,0,0)"/><stop offset="100%" stop-color="rgba(0,0,0,.28)"/></radialGradient></defs>
${Array.from({ length: 10 }, (_, i) => `<rect x="0" y="${i * 8}" width="68" height="8" fill="${i % 2 ? '#5aa833' : '#63b33a'}"/>`).join('')}
<g fill="none" stroke="${L}" stroke-width=".35">
<rect x="1.2" y="1.2" width="65.6" height="77.6"/>
<line x1="1.2" y1="40" x2="66.8" y2="40"/><circle cx="34" cy="40" r="7.5"/>
<rect x="14" y="1.2" width="40" height="12.5"/><rect x="24.5" y="1.2" width="19" height="4.4"/>
<rect x="14" y="66.3" width="40" height="12.5"/><rect x="24.5" y="74.4" width="19" height="4.4"/>
<path d="M27.5 13.7 A7.5 7.5 0 0 0 40.5 13.7"/><path d="M27.5 66.3 A7.5 7.5 0 0 1 40.5 66.3"/>
<path d="M1.2 2.8 A1.6 1.6 0 0 0 2.8 1.2"/><path d="M65.2 1.2 A1.6 1.6 0 0 0 66.8 2.8"/><path d="M1.2 77.2 A1.6 1.6 0 0 1 2.8 78.8"/><path d="M65.2 78.8 A1.6 1.6 0 0 1 66.8 77.2"/>
</g>
<g fill="${L}"><circle cx="34" cy="40" r=".55"/><circle cx="34" cy="10" r=".45"/><circle cx="34" cy="70" r=".45"/></g>
<rect x="29" y="0" width="10" height="1.2" fill="rgba(255,255,255,.9)"/><rect x="29" y="78.8" width="10" height="1.2" fill="rgba(255,255,255,.9)"/>
<rect x="0" y="0" width="68" height="80" fill="url(#pv)"/></svg>`;
}

function strengthGauge(label, v, max = 99) {
  const pct = U.clamp(v / max * 100, 0, 100);
  return `<div class="sg"><span>${label}</span><div class="sg-bar"><i class="${ovrCls(Math.round(v))}" style="width:${pct}%"></i></div><b>${Math.round(v)}</b></div>`;
}

function tabTeam() {
  const u = userTeam();
  validateLineup(u);
  const slots = FORMATIONS[u.form];
  const sel = UI.sel;
  const st = teamStrength(u);
  const pitch = u.lineup.map((pid, i) => {
    const p = G.players[pid];
    if (!p) return '';
    const [pos, fx, fy] = slots[i];
    const top = 87 - (fx - 0.04) / 0.72 * 73, left = 9 + fy * 82;
    const e = Math.round(effR(p, pos, slots[i]));
    // presný post: na svojom poste ✓, na príbuznom „2“, mimo postu „!“
    const fitv = dpFit(p, slotDP(slots[i]));
    const alt = fitv < 1 && fitv >= 0.9;
    const off = fitv < 0.9;
    return `<div class="slot ${sel && sel.pid === pid ? 'sel' : ''} ${off ? 'off' : ''} ${alt ? 'alt' : ''}" style="top:${top}%;left:${left}%" data-drag="slot" data-drop="slot" data-id="${pid}" data-slot="${i}">
<div class="sl-lab">${slotLabel(slots[i])}</div>
<div class="sl-body"><canvas class="sl-fig" width="120" height="140" data-pid="${pid}" data-gk="${pos === 'GK' ? 1 : 0}"></canvas>
<div class="sl-r ${ovrCls(e)}" title="Sila na tomto poste">${e}</div>${off ? `<div class="sl-warn" title="Hrá mimo svoj post (${DP_NAME[dpOf(p)]}) – ${Math.round(fitv * 100)} % sily">!</div>` : alt ? `<div class="sl-alt" title="Príbuzný post – ${Math.round(fitv * 100)} % sily (hlavný post: ${DP_NAME[dpOf(p)]})">2</div>` : ''}${potGap(p) >= 10 ? `<div class="sl-gem" title="${talentLabel(p)[1]} – potenciál ${potOf(p)}">${potGap(p) >= 15 && p.age <= 22 ? '💎' : '⭐'}</div>` : ''}</div>
<div class="sl-n">${U.esc(p.ln)}</div>
<div class="sl-fit" title="Kondícia ${p.fit} %"><i style="width:${p.fit}%;background:${fitColor(p.fit)}"></i></div></div>`;
  }).join('');

  const inXI = new Set(u.lineup);
  const queued = new Set(acadQueue());
  const banned = teamPlayers(u).filter(p => p.ban > 0 && !p.acad && !injured(p)), hurt = teamPlayers(u).filter(p => injured(p) && !p.acad);
  const rest = availPlayers(u).filter(p => !inXI.has(p.id) && !queued.has(p.id));
  const selP = sel ? G.players[sel.pid] : null;
  const detailHtml = cls => `<div class="pdetail ${cls}" id="teamDetail">${lineupActions(selP)}${playerCard(selP)}</div>`;
  const groups = POS_GROUPS.map(([pos, name]) => {
    const ps = rest.filter(p => p.pos === pos).sort((a, b) => effR(b, pos) - effR(a, pos));
    if (!ps.length) return '';
    return `<div class="bgrp"><div class="bgrp-h">${posBadge(pos)}<span>${name}</span><i>${ps.length}</i></div>
${ps.map(p => `<div class="brow ${sel && sel.pid === p.id ? 'sel' : ''}" data-drag="bench" data-drop="bench" data-id="${p.id}">
<canvas class="b-av" width="84" height="84" data-pid="${p.id}" data-gk="${p.pos === 'GK' ? 1 : 0}"></canvas>
<div class="b-main"><b>${morTag(p)} ${U.esc(pFull(p))} ${pBadges(p)}${pos2Badges(p, true)}</b><small>${dpBadge(p)} ${p.age} r. · ${footTag(p)} ${archName(p)} · skús. ${Math.round(p.xp ?? 0)} · ${ctTxt(p)}</small><span>${talentTag(p)}${traitIcons(p)}</span></div>
<div class="b-fit" title="Kondícia"><div><i style="width:${p.fit}%;background:${fitColor(p.fit)}"></i></div><span>${p.fit} %</span></div>
<div class="b-ovr">${ovr(p.r)}${potTxt(p, true)}</div></div>${selP && selP.id === p.id ? detailHtml('inline') : ''}`).join('')}</div>`;
  }).join('');

  const popHtml = selP && selP.tid === u.id && u.lineup.includes(selP.id) ? detailHtml('pop') : '';
  const acad = acadPanel(selP, detailHtml);
  return `<div class="team-wrap">
<div class="pitch-col">
  <div class="card tac-card">
    <div class="tac-top">
      <label class="form-sel"><span>Formácia</span><select class="inp" data-c="form">${Object.keys(FORMATIONS).map(f => `<option ${f === u.form ? 'selected' : ''}>${f}</option>`).join('')}</select></label>
      <div class="tac-ovr"><small>Sila zostavy</small><b class="${ovrCls(Math.round(st.ovr))}">${Math.round(st.ovr)}</b></div>
      <button class="btn btn-blue sm" data-a="autoXI">⚡ Auto zostava</button>
    </div>
    ${UI.formTip && UI.formTip.from === u.form ? `<div class="form-tip">💡 Formácia <b>${UI.formTip.f}</b> by tvojmu kádru sedela lepšie (sila +${UI.formTip.gain.toFixed(1).replace('.', ',')}). <button class="btn btn-go sm" data-a="useFormTip">Použiť</button><button class="link" data-a="noFormTip">✕</button></div>` : ''}
    <div class="sgs">${strengthGauge('Útok', st.att)}${strengthGauge('Zóna', st.mid)}${strengthGauge('Obrana', st.def)}</div>
  </div>
  <div class="pitch-wrap"><div class="pitch">${pitchSVG()}${pitch}</div>${popHtml}</div>
  <div class="card tac-card">
    <div class="card-h">🧠 Taktika</div>
    ${tacticsExtraHTML()}
  </div>
  ${dressingHTML()}
</div>
<div class="side-cols"><div class="list-col">
  <div class="card bench-card" data-drop="benchzone"><div class="card-h">Lavička a rezerva <span class="muted">${rest.length} hráčov · káder ${teamPlayers(u).length}</span></div>
  ${groups || '<p class="muted">Všetci hráči sú v zostave.</p>'}
  ${banned.length ? `<div class="bgrp"><div class="bgrp-h"><span>🚫 Tresty</span><i>${banned.length}</i></div>${banned.map(p => `<div class="brow banned" data-a="player" data-id="${p.id}"><canvas class="b-av" width="84" height="84" data-pid="${p.id}" data-gk="${p.pos === 'GK' ? 1 : 0}"></canvas><div class="b-main"><b>${U.esc(pFull(p))}</b><small>${dpBadge(p)} ${p.s.rc ? '🟥' : '🟨'} vynechá ${p.ban} ${p.ban === 1 ? 'zápas' : 'zápasy'}</small></div><div class="b-ovr">${ovr(p.r)}</div></div>`).join('')}</div>` : ''}
  ${hurt.length ? `<div class="bgrp"><div class="bgrp-h"><span>🚑 Zranení</span><i>${hurt.length}</i></div>${hurt.sort((a, b) => a.inj.d - b.inj.d).map(p => `<div class="brow banned" data-a="player" data-id="${p.id}"><canvas class="b-av" width="84" height="84" data-pid="${p.id}" data-gk="${p.pos === 'GK' ? 1 : 0}"></canvas><div class="b-main"><b>${U.esc(pFull(p))}</b><small>${dpBadge(p)} ${U.esc(injName(p))} · ešte ${dniTxt(p.inj.d)}</small></div><div class="b-ovr">${ovr(p.r)}</div></div>`).join('')}</div>` : ''}</div>
</div>
<div class="acad-col">${acad}</div></div></div>`;
}

// ── Akadémia a čakáreň ──────────────────────────────────────────
function acadPanel(selP, detailHtml) {
  const u = userTeam(), ps = acadPlayers().sort((a, b) => (b.acadD || 0) - (a.acadD || 0)), lv = acadLvl();
  const inXI = new Set(u.lineup), q = acadQueue();
  const isSel = p => selP && selP.id === p.id;
  const rows = ps.map(p => {
    const gap = potOf(p) - p.r, rate = acadRate(p), left = rate > 0 ? Math.max(1, Math.ceil((100 - (p.tp || 0)) / rate)) : 0;
    const stay = Math.max(0, ACAD_DAYS - (p.acadD || 0));
    return `<div class="arow ${isSel(p) ? 'sel' : ''}" data-drag="acad" data-id="${p.id}">
<canvas class="b-av" width="84" height="84" data-pid="${p.id}" data-gk="${p.pos === 'GK' ? 1 : 0}"></canvas>
<div class="a-main"><b>${U.esc(pFull(p))}</b><small>${dpBadge(p)} ${p.age} r.${p.acadR0 != null && p.r > p.acadR0 ? ` · <i class="pos">+${p.r - p.acadR0}</i>` : ''}<em class="a-left" title="Zostáva v akadémii">⏱ ${stay}</em></small>
<div class="a-prog"><div class="fb-bar"><i style="width:${Math.round(p.tp || 0)}%"></i></div><span>${gap <= 0 || left > stay ? '' : `+1 o ${left} k.`}</span></div></div>
<div class="b-ovr">${ovr(p.r)}${potTxt(p, true)}</div>
<button class="btn btn-ghost sm a-out" data-a="acadOut" data-id="${p.id}" title="Späť na lavičku">↩</button></div>${isSel(p) ? detailHtml('inline') : ''}`;
  }).join('');
  const qrows = q.map((id, i) => {
    const p = G.players[id];
    return `<div class="arow wrow ${isSel(p) ? 'sel' : ''}" data-drag="wait" data-id="${p.id}">
<span class="w-no">${i + 1}.</span><canvas class="b-av" width="84" height="84" data-pid="${p.id}" data-gk="${p.pos === 'GK' ? 1 : 0}"></canvas>
<div class="a-main"><b>${U.esc(pFull(p))}</b><small>${dpBadge(p)} ${p.age} r.</small></div>
<div class="b-ovr">${ovr(p.r)}${potTxt(p, true)}</div>
<button class="btn btn-ghost sm a-out" data-a="acadOut" data-id="${p.id}" title="Zrušiť čakanie">✕</button></div>${isSel(p) ? detailHtml('inline') : ''}`;
  }).join('');
  const full = ps.length >= ACAD_CAP;
  const cands = full && q.length >= ACAD_WAIT ? [] : availPlayers(u).filter(p => !inXI.has(p.id) && !q.includes(p.id) && p.age <= ACAD_MAX_AGE && !p.loan && potOf(p) > p.r).sort((a, b) => potGap(b) - potGap(a)).slice(0, 3);
  return `<div class="card acad-card" data-drop="acad"><div class="card-h"><span title="Hráči do ${ACAD_MAX_AGE} rokov rastú rýchlejšie, ale nehrajú zápasy. Po ${ACAD_DAYS} kolách idú na lavičku a nastúpi prvý z čakárne.">🎓 Akadémia <i class="a-help">?</i></span><span class="muted">${ps.length}/${ACAD_CAP}</span></div>
<p class="muted small acad-info">Do 21 r. · rýchlejší rast · nehrajú · 1 sezóna</p>
${rows}${full ? '' : '<div class="a-slot">＋ Voľné miesto</div>'}
<div class="wait-box" data-drop="wait"><div class="wait-h"><span title="Hráči v čakárni ešte hrajú. Keď sa v akadémii uvoľní miesto, prvý nastúpi sám.">⏳ Čakáreň</span><span>${q.length}/${ACAD_WAIT}</span></div>
${qrows}${q.length < ACAD_WAIT && full ? '<div class="a-slot w-slot">＋ Voľné miesto</div>' : ''}${!q.length && !full ? '<p class="muted small">Prázdna</p>' : ''}</div>
${cands.length ? `<div class="a-cands"><small>Návrh</small>${cands.map(p => `<button class="chip" data-a="acadIn" data-id="${p.id}">＋ ${U.esc(pName(p))} <i>${p.r}→${know(p) >= 70 ? potOf(p) : '?'}</i></button>`).join('')}</div>` : ''}
<div class="a-rates" title="Rýchlosť rastu za sezónu. Hráč v zostave navyše zbiera skúsenosti."><div><span>Lavička</span><b>55 %</b></div><div class="on"><span>Akadémia</span><b>${Math.round(acadFactor() * 100)} %</b></div><div><span>Zostava</span><b>145 %</b></div></div>
<button class="link" data-a="facFocus" data-v="youth">Vylepšiť akadémiu (úr. ${lv}) ›</button></div>`;
}

function lineupActions(p) {
  const u = userTeam();
  const idx = u.lineup.indexOf(p.id);
  const slots = FORMATIONS[u.form];
  const qi = acadQueue().indexOf(p.id);
  const info = p.acad ? `🎓 V akadémii · tréning ${Math.round(p.tp || 0)} % · ešte ${Math.max(0, ACAD_DAYS - (p.acadD || 0))} kôl` : qi >= 0 ? `⏳ V čakárni na akadémiu (${qi + 1}. v poradí)` : idx >= 0 ? `V zostave na poste <b>${slotLabel(slots[idx])}</b> · sila na poste ${ovr(Math.round(effR(p, slots[idx][0])))}` : 'Na lavičke';
  const canAcad = !p.acad && qi < 0 && p.age <= ACAD_MAX_AGE && !p.loan;
  const acadFull = acadPlayers().length >= ACAD_CAP;
  return `<div class="lu-act"><span>${info}</span><div>
${p.acad ? `<button class="btn btn-ghost sm" data-a="acadOut" data-id="${p.id}">↩ Späť na lavičku</button>` : qi >= 0 ? `<button class="btn btn-ghost sm" data-a="acadOut" data-id="${p.id}">✕ Zrušiť čakanie</button>` : ''}
${idx >= 0 ? `<button class="btn btn-ghost sm" data-a="benchP" data-id="${p.id}">⬇ Posadiť na lavičku</button>` : `<button class="btn btn-go sm" data-a="startP" data-id="${p.id}">⬆ Postaviť do zostavy</button>`}
${canAcad ? `<button class="btn btn-ghost sm" data-a="acadIn" data-id="${p.id}">${acadFull ? '⏳ Do čakárne' : '🎓 Do akadémie'}</button>` : ''}
<button class="btn btn-ghost sm" data-a="unsel">✕</button></div></div>`;
}

function paintTeamFigures(root) {
  const u = G && G.userTid >= 0 ? userTeam() : null;
  if (!u) return;
  requestAnimationFrame(positionTeamPop);
  root.querySelectorAll('canvas.sl-fig').forEach(cv => {
    const p = G.players[+cv.dataset.pid]; if (!p) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    drawFigure(ctx, 60, 128, 52, cv.dataset.gk === '1' ? GK_SHIRT : u.kit, playerLook(p), { face: 1, num: p.num, gloves: cv.dataset.gk === '1' ? '#e8ff70' : null });
  });
  root.querySelectorAll('canvas.b-av').forEach(cv => {
    const p = G.players[+cv.dataset.pid]; if (!p) return;
    const ctx = cv.getContext('2d');
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.beginPath(); ctx.arc(42, 42, 42, 0, Math.PI * 2); ctx.clip();
    const g = ctx.createLinearGradient(0, 0, 0, 84); g.addColorStop(0, '#3a4aa8'); g.addColorStop(1, '#1c2458');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 84, 84);
    drawFigure(ctx, 42, 101, 40, cv.dataset.gk === '1' ? GK_SHIRT : u.kit, playerLook(p), { face: 1 });
    ctx.restore();
  });
}

// ── Ťahanie hráčov (myš aj dotyk) ───────────────────────────────
const DND = { s: null };

function initTeamDnD() {
  document.addEventListener('click', e => {
    if (UI.tab !== 'team' || !UI.sel || !document.querySelector('.team-wrap')) return;
    if (performance.now() - (UI.selAt || 0) < 350) return;
    if (e.target.closest('.pdetail, [data-drag], .modal-bg, .toast, .dnd-ghost')) return;
    closeTeamDetail();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && UI.tab === 'team' && UI.sel && document.querySelector('.team-wrap') && !document.querySelector('.modal-bg')) closeTeamDetail();
  });
  window.addEventListener('resize', () => { if (UI.tab === 'team') positionTeamPop(); });
  UI.root.addEventListener('pointerdown', e => {
    const el = e.target.closest('[data-drag]');
    if (!el || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (e.target.closest('button, a, select, input')) return;
    DND.s = { el, pid: +el.dataset.id, slot: el.dataset.slot != null ? +el.dataset.slot : null, kind: el.dataset.drag, x0: e.clientX, y0: e.clientY, mouse: e.pointerType === 'mouse', drag: false };
    if (e.pointerType === 'mouse') e.preventDefault();
    else if (el.dataset.drag === 'bench' || el.dataset.drag === 'acad' || el.dataset.drag === 'wait') {
      DND.s.timer = setTimeout(() => { if (DND.s && !DND.s.drag && !DND.s.moved) { startDrag(DND.s.x0, DND.s.y0); navigator.vibrate && navigator.vibrate(25); } }, 300);
    }
  });
  window.addEventListener('pointermove', e => {
    const s = DND.s;
    if (!s) return;
    const d = Math.hypot(e.clientX - s.x0, e.clientY - s.y0);
    if (!s.drag) {
      if (d < 7) return;
      if (s.mouse || s.kind === 'slot') startDrag(e.clientX, e.clientY);
      else { s.moved = true; clearTimeout(s.timer); DND.s = null; return; }
    }
    e.preventDefault();
    moveGhost(e.clientX, e.clientY);
  }, { passive: false });
  window.addEventListener('pointerup', e => endDrag(e, false));
  window.addEventListener('pointercancel', e => endDrag(e, true));
  // počas ťahania na dotyk zablokuj posúvanie stránky
  window.addEventListener('touchmove', e => { if (DND.s && DND.s.drag) e.preventDefault(); }, { passive: false });
}

function startDrag(x, y) {
  const s = DND.s;
  if (!s) return;
  s.drag = true;
  const p = G.players[s.pid], u = userTeam();
  const g = document.createElement('div');
  g.className = 'dnd-ghost';
  g.innerHTML = `<canvas width="120" height="140"></canvas><span>${U.esc(p.ln)}</span>`;
  document.body.appendChild(g);
  drawFigure(g.querySelector('canvas').getContext('2d'), 60, 128, 52, p.pos === 'GK' ? GK_SHIRT : u.kit, playerLook(p), { face: 1, num: p.num, moving: true, phase: 1 });
  s.ghost = g;
  s.el.classList.add('dragging');
  document.body.classList.add('dnd-on');
  moveGhost(x, y);
}

function dropTarget(x, y) {
  const s = DND.s;
  if (s.ghost) s.ghost.style.display = 'none';
  const el = document.elementFromPoint(x, y);
  if (s.ghost) s.ghost.style.display = '';
  const t = el && el.closest('[data-drop]');
  return t && t !== s.el ? t : null;
}

function moveGhost(x, y) {
  const s = DND.s;
  if (!s || !s.ghost) return;
  s.ghost.style.transform = `translate(${x - 30}px, ${y - 52}px)`;
  const t = dropTarget(x, y);
  if (s.over && s.over !== t) s.over.classList.remove('dnd-over');
  if (t && dropOk(s, t)) { t.classList.add('dnd-over'); s.over = t; } else s.over = null;
}

function dropOk(s, t) {
  const k = t.dataset.drop;
  if (k === 'acad') return s.kind !== 'acad';
  if (k === 'wait') return s.kind !== 'wait' && s.kind !== 'acad';
  if (k === 'benchzone') return s.kind !== 'bench';
  if (k === 'bench') return s.kind !== 'bench';
  return true;
}
function acadAddToast(p) {
  const r = acadAdd(p);
  if (r.err) { toast(r.err, 'bad'); return false; }
  toast(r.where === 'acad' ? `🎓 ${pName(p)} ide do akadémie.` : `⏳ Akadémia je plná – ${pName(p)} čaká v čakárni (${r.pos}. v poradí).`, 'good');
  return true;
}
function bestSubFor(slot, except) {
  const u = userTeam(), inXI = new Set(u.lineup);
  let best = null, bv = -1;
  for (const p of availPlayers(u)) { if (inXI.has(p.id) || p.id === except) continue; const v = slotScore(p, slot); if (v > bv) { bv = v; best = p; } }
  return best;
}
function endDrag(e, cancel) {
  const s = DND.s;
  if (!s) return;
  clearTimeout(s.timer);
  DND.s = null;
  if (s.over) s.over.classList.remove('dnd-over');
  if (s.ghost) s.ghost.remove();
  s.el.classList.remove('dragging');
  document.body.classList.remove('dnd-on');
  if (cancel) return;
  if (!s.drag) { selectTeamPlayer(s.pid); return; }
  DND.s = s; const t = dropTarget(e.clientX, e.clientY); DND.s = null;
  if (!t || !dropOk(s, t)) return;
  const u = userTeam(), L = u.lineup;
  const tPid = +t.dataset.id, tSlot = t.dataset.slot != null ? +t.dataset.slot : null, tk = t.dataset.drop;
  const a = G.players[s.pid], b = G.players[tPid];
  if (tk === 'acad' || tk === 'wait') {
    if (s.kind === 'wait') {
      if (acadPlayers().length >= ACAD_CAP) { toast(`Akadémia je plná (${ACAD_CAP}). Hráč nastúpi, keď sa uvoľní miesto.`, 'bad'); return; }
      fromQueue(a);
    }
    if (!acadAddToast(a)) return;
  } else if (s.kind === 'acad' || s.kind === 'wait') {
    const wasAcad = a.acad;
    fromAcademy(a);
    if (tSlot != null) { L[tSlot] = s.pid; toast(`${pName(a)} ide ${wasAcad ? 'z akadémie' : 'z čakárne'} do zostavy za ${pName(b)}.`); }
    else toast(wasAcad ? `${pName(a)} sa vrátil z akadémie na lavičku.` : `${pName(a)} už nečaká na akadémiu.`);
  } else if (tk === 'benchzone') {
    const sub = bestSubFor(FORMATIONS[u.form][s.slot], s.pid);
    if (!sub) return;
    L[s.slot] = sub.id; toast(`${pName(sub)} ide do zostavy za ${pName(a)}.`);
  } else if (s.slot != null && tSlot != null) { [L[s.slot], L[tSlot]] = [L[tSlot], L[s.slot]]; toast(`${pName(a)} ⇄ ${pName(b)}`); }
  else if (s.slot == null && tSlot != null) { L[tSlot] = s.pid; toast(`${pName(a)} ide do zostavy za ${pName(b)}`); }
  else if (s.slot != null && tSlot == null) { L[s.slot] = tPid; toast(`${pName(b)} ide do zostavy za ${pName(a)}`); }
  else return;
  saveGame();
  renderTab();
}

function selectTeamPlayer(pid) {
  UI.sel = UI.sel && UI.sel.pid === pid ? null : { pid };
  UI.selAt = performance.now();
  renderTab();
  const d = document.getElementById('teamDetail');
  if (d) {
    const r = d.getBoundingClientRect();
    if (r.bottom > window.innerHeight - 10 || r.top < 80) d.scrollIntoView({ behavior: 'smooth', block: r.height > window.innerHeight - 120 ? 'start' : 'nearest' });
  }
}

// okienko s detailom pod hráčom na ihrisku
function positionTeamPop() {
  const pop = document.querySelector('.pdetail.pop');
  if (!pop || !UI.sel) return;
  const wrap = pop.parentElement, slot = wrap.querySelector(`.slot[data-id="${UI.sel.pid}"]`);
  if (!slot) return;
  const wr = wrap.getBoundingClientRect(), sr = slot.getBoundingClientRect();
  const w = Math.min(540, wr.width);
  const cx = sr.left + sr.width / 2 - wr.left;
  const left = U.clamp(cx - w / 2, 0, wr.width - w);
  pop.style.width = w + 'px';
  pop.style.left = left + 'px';
  pop.style.top = (sr.bottom - wr.top + 10) + 'px';
  pop.style.setProperty('--ax', (cx - left) + 'px');
  pop.classList.add('ready');
}

function closeTeamDetail() { if (UI.sel) { UI.sel = null; renderTab(); } }

function pickSlotFor(p, onPick) {
  const u = userTeam(), slots = FORMATIONS[u.form];
  const opts = u.lineup.map((id, i) => ({ i, cur: G.players[id], gain: effR(p, slots[i][0], slots[i]) - (G.players[id] ? effR(G.players[id], slots[i][0], slots[i]) : 0) }))
    .sort((a, b) => b.gain - a.gain);
  modal(`<h3>Postaviť ${U.esc(pName(p))} namiesto…</h3><div class="plist modal-list">${opts.map(o => `<button class="pick-row" data-m="s${o.i}"><span class="sl-chip">${slotLabel(slots[o.i])}</span><span class="pr-n">${o.cur ? U.esc(pFull(o.cur)) : '—'}</span>${o.cur ? ovr(Math.round(effR(o.cur, slots[o.i][0], slots[o.i]))) : ''}<span class="arrow">→</span>${ovr(Math.round(effR(p, slots[o.i][0])))}<span class="gain ${o.gain >= 0 ? 'pos' : 'neg'}">${o.gain >= 0 ? '+' : ''}${Math.round(o.gain)}</span></button>`).join('')}</div>
<div class="m-btns"><button class="btn btn-ghost" data-m="x">Zrušiť</button></div>`, { cls: 'wide', on: k => { if (k[0] === 's') onPick(+k.slice(1)); } });
}

function pickBenchFor(p, onPick) {
  const u = userTeam(), slots = FORMATIONS[u.form];
  const idx = u.lineup.indexOf(p.id), pos = slots[idx][0];
  const inXI = new Set(u.lineup);
  const opts = availPlayers(u).filter(x => !inXI.has(x.id)).sort((a, b) => slotScore(b, slots[idx]) - slotScore(a, slots[idx]));
  modal(`<h3>Kto pôjde za ${U.esc(pName(p))} (${slotLabel(slots[idx])})?</h3><div class="plist modal-list">${opts.map(x => { const g = effR(x, pos, slots[idx]) - effR(p, pos, slots[idx]); return `<button class="pick-row" data-m="p${x.id}">${dpBadge(x)}<span class="pr-n">${U.esc(pFull(x))}</span><span class="muted small">${x.fit} %</span>${ovr(Math.round(effR(x, pos)))}<span class="gain ${g >= 0 ? 'pos' : 'neg'}">${g >= 0 ? '+' : ''}${Math.round(g)}</span></button>`; }).join('')}</div>
<div class="m-btns"><button class="btn btn-ghost" data-m="x">Zrušiť</button></div>`, { cls: 'wide', on: k => { if (k[0] === 'p') onPick(+k.slice(1)); } });
}

Object.assign(ACT, {
  unsel() { UI.sel = null; renderTab(); },
  startP(el) {
    const p = G.players[+el.dataset.id];
    pickSlotFor(p, i => { const u = userTeam(); const old = G.players[u.lineup[i]]; fromAcademy(p); u.lineup[i] = p.id; saveGame(); renderTab(); toast(`${pName(p)} ide do zostavy${old ? ' za ' + pName(old) : ''}.`); });
  },
  acadIn(el) {
    const p = G.players[+el.dataset.id];
    if (acadAddToast(p)) { saveGame(); renderTab(); }
  },
  acadOut(el) {
    const p = G.players[+el.dataset.id], wasAcad = p.acad;
    fromAcademy(p);
    toast(wasAcad ? `${pName(p)} sa vrátil z akadémie na lavičku.` : `${pName(p)} už nečaká na akadémiu.`);
    saveGame(); renderTab();
  },
  useFormTip() {
    const u = userTeam(), f = UI.formTip && UI.formTip.f;
    if (!f) return;
    u.form = f; autoLineup(u); UI.formTip = null; UI.sel = null; saveGame(); renderTab();
    toast(`Formácia ${f} a nová zostava sú nastavené.`, 'good');
  },
  noFormTip() { UI.formTip = null; renderTab(); },
  benchP(el) {
    const p = G.players[+el.dataset.id];
    pickBenchFor(p, id => { const u = userTeam(); const i = u.lineup.indexOf(p.id); u.lineup[i] = id; UI.sel = { pid: id }; saveGame(); renderTab(); toast(`${pName(G.players[id])} ide do zostavy za ${pName(p)}.`); });
  },
});
