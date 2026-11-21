// Velora Bay — on-foot player: walk, sprint, jump, enter cars, take damage, get busted.
import { S, WORLD, addHeat, showToast, say } from './state.js';
import { walkInput, pressedOnce } from './input.js';
import { collideBuildings } from './city.js';
import { clamp, dist } from './utils.js';
import { sfx } from './audio.js';
import { spawnParticles } from './effects.js';

export function updatePlayer(dt) {
  const p = S.player;
  if (!p || p.dead) return;
  p.invuln = Math.max(0, p.invuln - dt);
  if (!p.onFoot) return;
  const inp = walkInput();
  let mx = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  let my = (inp.down ? 1 : 0) - (inp.up ? 1 : 0);
  const len = Math.hypot(mx, my);
  if (len > 0) { mx /= len; my /= len; }
  const speed = inp.sprint ? 330 : 215;
  p.x += mx * speed * dt;
  p.y += my * speed * dt;
  if (len > 0) {
    p.angle = Math.atan2(my, mx);
    p.walkPhase += dt * (inp.sprint ? 13 : 9);
  }
  // jump
  if (inp.jump && p.jumpZ === 0) { p.jumpV = 320; sfx('jump'); }
  if (p.jumpZ > 0 || p.jumpV !== 0) {
    p.jumpZ += p.jumpV * dt; p.jumpV -= 900 * dt;
    if (p.jumpZ <= 0) { p.jumpZ = 0; p.jumpV = 0; }
  }
  p.x = clamp(p.x, 16, WORLD.size - 16);
  p.y = clamp(p.y, 16, WORLD.size - 16);
  collideBuildings(p, 12);
  // enter nearest car
  if (pressedOnce('e')) tryEnterCar();
  // weapon switch
  if (pressedOnce('1')) setWeapon('pistol');
  if (pressedOnce('2')) setWeapon('smg');
  if (pressedOnce('3')) setWeapon('shotgun');
  if (pressedOnce('4')) setWeapon('rifle');
  // taxi job, garage, phone, mission list
  if (pressedOnce('h')) window.__veloraTaxiToggle && window.__veloraTaxiToggle();
  if (pressedOnce('g')) window.__veloraGarage && window.__veloraGarage();
  if (pressedOnce('c')) window.__veloraPhone && window.__veloraPhone();
  if (pressedOnce('tab')) window.__veloraMissionList && window.__veloraMissionList();
}

export function setWeapon(name) {
  const w = S.weapons[name];
  if (w && w.owned) {
    S.weapon = name;
    showToast(name.toUpperCase() + ' equipped', 1.2);
  } else {
    showToast(name.toUpperCase() + ' not owned — buy it at Ironworks Guns', 2);
  }
}

export function tryEnterCar() {
  const p = S.player;
  let best = null, bd = 70;
  for (const c of S.cars) {
    const d = dist(p.x, p.y, c.x, c.y);
    if (d < bd) { bd = d; best = c; }
  }
  if (!best) return;
  p.car = best; p.onFoot = false;
  best.driver = 'player';
  best.traffic = false; best.parked = false;
  p.x = best.x; p.y = best.y;
  if (best.model !== 'police' && !S.ownedCars.includes(best.id)) {
    S.stats.carsStolen++;
    addHeat(12);
    showToast('Stole a ' + best.def.name + ' — the law noticed!', 2.5);
    say('REX', 'This baby is mine now.');
  } else {
    showToast(best.def.name, 1.5);
  }
  sfx('pickup');
}

export function exitCar() {
  const p = S.player;
  if (!p.car) return;
  const c = p.car;
  const side = c.angle + Math.PI / 2;
  p.x = c.x + Math.cos(side) * 34;
  p.y = c.y + Math.sin(side) * 34;
  p.onFoot = true; p.car = null;
  c.driver = null;
}

export function damagePlayer(n, from) {
  const p = S.player;
  if (!p || p.dead || p.invuln > 0) return;
  let left = n;
  if (p.armor > 0) { const absorbed = Math.min(p.armor, left); p.armor -= absorbed; left -= absorbed; }
  p.health -= left;
  p.invuln = 0.25;
  spawnParticles(p.x, p.y, 6, '#ff5b4d', 90, 0.4, 3);
  if (p.health <= 0) {
    p.health = 0; p.dead = true;
    window.__veloraWasted && window.__veloraWasted(from);
  }
}

export function drawPlayer(ctx) {
  const p = S.player;
  if (!p || !p.onFoot || p.dead) return;
  ctx.save();
  ctx.translate(p.x, p.y - p.jumpZ * 0.12);
  // hero ring so Rex always reads at a glance
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.ellipse(0, 7, 11, 5, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = 'rgba(255,210,63,0.25)';
  ctx.beginPath(); ctx.ellipse(0, 7, 11, 5, 0, 0, 7); ctx.fill();
  const bob = Math.sin(p.walkPhase) * 1.6;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 6, 8, 3.5, 0, 0, 7); ctx.fill();
  // legs
  ctx.fillStyle = '#2e3d5c';
  const sw = Math.sin(p.walkPhase) * 3.5;
  ctx.fillRect(-4 + sw * 0.4, 0, 3.5, 8);
  ctx.fillRect(0.5 - sw * 0.4, 0, 3.5, 8);
  // jacket — Rex wears a teal jacket
  ctx.fillStyle = '#0e7a6b';
  ctx.beginPath(); ctx.roundRect(-6, -10 + bob * 0.3, 12, 13, 5); ctx.fill();
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-6, -4 + bob * 0.3, 12, 2);
  // head
  ctx.fillStyle = '#e8b88a';
  ctx.beginPath(); ctx.arc(0, -15 + bob * 0.3, 5.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath(); ctx.arc(0, -17 + bob * 0.3, 5.5, Math.PI, 0); ctx.fill();
  // gun in hand when aiming
  const aiming = S.mouse.down || S.keys['f'];
  if (aiming) {
    ctx.rotate(p.angle);
    ctx.fillStyle = '#222';
    ctx.fillRect(4, -2, 12, 3);
    ctx.rotate(-p.angle);
  }
  ctx.restore();
  // aim line
  if (aiming && S.mode === 'play') {
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(S.mouse.wx, S.mouse.wy); ctx.stroke();
  }
}
