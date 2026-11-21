// Velora Bay — HUD: stars, cash, bars, clock, minimap, speedometer, dialogue, toasts.
import { S, WORLD } from './state.js';
import { fmtCash, fmtClock } from './utils.js';
import { WEAPONS } from './combat.js';
import { isNight } from './weather.js';

let mmCtx = null;

export function initHud() {
  const mm = document.getElementById('minimap');
  if (mm) mmCtx = mm.getContext('2d');
}

export function updateHud() {
  const starsEl = document.getElementById('stars');
  if (starsEl) {
    let html = '';
    for (let i = 0; i < 5; i++) html += `<span class="${i < S.wanted ? '' : 'off'}">★</span>`;
    starsEl.innerHTML = html;
  }
  const cash = document.getElementById('cash');
  if (cash) cash.textContent = fmtCash(S.cash) + (S.respect ? '  •  RESPECT ' + S.respect : '');
  const hf = document.getElementById('healthfill');
  if (hf) hf.style.width = Math.max(0, S.player.health) + '%';
  const af = document.getElementById('armorfill');
  if (af) af.style.width = Math.max(0, S.player.armor) + '%';
  const ct = document.getElementById('clocktime');
  if (ct) ct.textContent = fmtClock(S.dayTime) + (isNight() ? '  🌙' : '  ☀️');
  const cw = document.getElementById('clockweather');
  if (cw) cw.textContent = 'VELORA BAY — ' + S.weather.toUpperCase() + (S.mission ? '  •  MISSION ' + (S.missionIndex + 1) + '/10' : '  •  FREE ROAM');
  const vn = document.getElementById('vehname');
  const sp = document.getElementById('speed');
  const wp = document.getElementById('weapon');
  const p = S.player;
  if (p && !p.onFoot && p.car) {
    if (vn) vn.textContent = p.car.def.name + (p.car.health < 40 ? ' — DAMAGED!' : '');
    if (sp) sp.innerHTML = Math.round(Math.abs(p.car.speed) * 0.36) + ' <small>km/h</small>';
  } else {
    if (vn) vn.textContent = 'ON FOOT';
    if (sp) sp.innerHTML = '';
  }
  if (wp) {
    const w = WEAPONS[S.weapon];
    const ws = S.weapons[S.weapon];
    wp.textContent = w.name + (ws && ws.ammo !== undefined && w.mag !== Infinity ? ' • ' + ws.ammo + ' ammo' : ' • ∞');
  }
  // toast expiry
  if (S.toastTimer > 0) {
    S.toastTimer -= 1 / 60;
    if (S.toastTimer <= 0) { const t = document.getElementById('toast'); if (t) t.textContent = ''; }
  }
  // dialogue
  const dlg = document.getElementById('dialog');
  if (dlg) {
    if (S.dialogQueue.length > 0) {
      S.dialogTimer -= 1 / 60;
      const cur = S.dialogQueue[0];
      dlg.innerHTML = `<b>${cur.who}:</b> ${cur.text}`;
      dlg.classList.remove('hidden');
      if (S.dialogTimer <= 0) { S.dialogQueue.shift(); S.dialogTimer = 4.5; }
    } else {
      dlg.classList.add('hidden');
      dlg.textContent = '';
    }
  }
  // contextual hint
  const hint = document.getElementById('hint');
  if (hint) {
    const sh = window.__veloraNearestShop && window.__veloraNearestShop();
    if (S.taxi) hint.textContent = S.taxi.state === 'toPickup' ? 'TAXI: reach the green marker to pick up' : 'TAXI: drop the passenger at the green marker';
    else if (sh) hint.textContent = 'Press G — ' + sh.name;
    else if (p && p.onFoot) hint.textContent = 'E — steal / enter car • H — taxi job (in a taxi) • G — shop • C — payphone bribe';
    else hint.textContent = 'WASD drive • SHIFT handbrake • E exit car • Q horn • H taxi job';
  }
  drawMinimap();
}

export function drawMinimap() {
  if (!mmCtx || !S.city) return;
  const ctx = mmCtx, W = 200, H = 200;
  const scale = W / (WORLD.size + 200);
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0e2418';
  ctx.fillRect(0, 0, W, H);
  // water / beach on north edge
  ctx.fillStyle = '#2e7f9e';
  ctx.fillRect(0, 0, W, 12);
  ctx.fillStyle = '#c9a86a';
  ctx.fillRect(0, 12, W, 6);
  // roads
  ctx.strokeStyle = '#3d4a3d'; ctx.lineWidth = 3;
  const b = WORLD.block;
  for (let i = 0; i < WORLD.roads; i++) {
    ctx.beginPath(); ctx.moveTo((i * b + 100) * scale, 0); ctx.lineTo((i * b + 100) * scale, H); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, (i * b + 100) * scale); ctx.lineTo(W, (i * b + 100) * scale); ctx.stroke();
  }
  // buildings
  ctx.fillStyle = 'rgba(120,130,150,0.8)';
  for (const bd of S.city.buildings) {
    ctx.fillRect((bd.x + 100) * scale, (bd.y + 100) * scale, Math.max(1, bd.w * scale), Math.max(1, bd.h * scale));
  }
  // shops
  ctx.fillStyle = '#7dff8a';
  for (const sh of S.city.shops) { ctx.fillRect((sh.x + 100) * scale - 2, (sh.y + 100) * scale - 2, 4, 4); }
  // packages
  ctx.fillStyle = '#ffd23f';
  for (const pkg of S.city.packages) if (!pkg.found) ctx.fillRect((pkg.x + 100) * scale - 1.5, (pkg.y + 100) * scale - 1.5, 3, 3);
  const dot = (x, y, color, r) => {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc((x + 100) * scale, (y + 100) * scale, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.stroke();
  };
  // taxi marker
  if (S.taxi) {
    const t = S.taxi.state === 'toPickup' ? S.taxi.pickup : S.taxi.drop;
    dot(t.x, t.y, '#7dff8a', 5);
  }
  // race checkpoint
  if (S.race && !S.race.won) dot(S.race.cps[S.race.next].x, S.race.cps[S.race.next].y, '#7dff8a', 5);
  // mission marker
  if (S.mission) {
    const st = S.mission.def.stages[S.mission.stage];
    if (st && st.at) dot(st.at.x, st.at.y, '#ffd23f', 5);
    else if (st && st.type === 'race' && S.race) dot(S.race.cps[S.race.next].x, S.race.cps[S.race.next].y, '#ffd23f', 5);
  }
  // vigilante target
  if (S.vigilanteTarget) dot(S.vigilanteTarget.x, S.vigilanteTarget.y, '#ff5b4d', 4);
  // cops
  for (const c of S.cops) dot(c.x, c.y, '#ff2d2d', 3);
  // player
  const p = S.player;
  if (p) {
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc((p.x + 100) * scale, (p.y + 100) * scale, 4, 0, 7); ctx.fill();
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.stroke();
    // view cone
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.moveTo((p.x + 100) * scale, (p.y + 100) * scale);
    ctx.lineTo((p.x + 100) * scale + Math.cos(p.angle) * 12, (p.y + 100) * scale + Math.sin(p.angle) * 12);
    ctx.stroke();
  }
  // north indicator
  ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'left';
  ctx.fillText('N', 5, 13);
}
