// Velora Bay — wanted system: escalating police response, roadblocks, helicopter, busted.
import { S, WORLD, addHeat, updateStars, showToast } from './state.js';
import { makeCar } from './vehicles.js';
import { clamp, dist, angleDiff, rand, randi } from './utils.js';
import { sfx } from './audio.js';
import { spawnParticles } from './effects.js';
import { damagePlayer } from './player.js';

export function updateWanted(dt) {
  // decay when quiet and no cop close
  const p = S.player;
  let copNear = false;
  for (const cop of S.cops) if (dist(cop.x, cop.y, p.x, p.y) < 420) copNear = true;
  if (S.time - S.lastCrime > 9 && !copNear && S.wantedHeat > 0) {
    S.wantedHeat = Math.max(0, S.wantedHeat - dt * 2.2);
    updateStars();
  }
  const want = S.wanted;
  // spawn cops up to wanted level
  const targetCops = want === 0 ? 0 : want + 1;
  if (S.cops.length < targetCops && S.mode === 'play') {
    spawnCop();
  }
  if (S.cops.length > targetCops) {
    // extra cops give up and drive away
    const extra = S.cops[S.cops.length - 1];
    extra.givingUp = true;
  }
  // helicopter at 4+ stars
  if (want >= 4 && !S.heli) {
    S.heli = { x: p.x + 300, y: p.y - 300, angle: 0, sirenT: 0 };
    showToast('POLICE HELICOPTER INBOUND!', 3);
    sfx('siren');
  }
  if (want < 4 && S.heli) S.heli = null;
  if (S.heli) {
    const h = S.heli;
    h.angle += dt * 0.5;
    const tx = p.x + Math.cos(h.angle) * 220, ty = p.y + Math.sin(h.angle) * 220;
    h.x += (tx - h.x) * dt * 0.8; h.y += (ty - h.y) * dt * 0.8;
    h.sirenT -= dt;
    if (h.sirenT <= 0) { h.sirenT = 1.4; sfx('siren'); }
    // spotlight pins the player: heat creeps up while lit
    if (dist(h.x, h.y, p.x, p.y) < 260) S.wantedHeat = Math.min(100, S.wantedHeat + dt * 0.8);
  }
  // roadblocks at 3+ stars: parked cop cars ahead on the player's road
  if (want >= 3 && Math.random() < dt * 0.15) spawnRoadblock();
}

function spawnCop() {
  const p = S.player;
  const ang = rand(0, Math.PI * 2);
  const d = rand(650, 900);
  const x = clamp(p.x + Math.cos(ang) * d, 60, WORLD.size - 60);
  const y = clamp(p.y + Math.sin(ang) * d, 60, WORLD.size - 60);
  const c = makeCar('police', x, y, Math.atan2(p.y - y, p.x - x), { cop: true, driver: 'cop' });
  c.siren = true;
  S.cars.push(c);
  S.cops.push(c);
}

function spawnRoadblock() {
  const p = S.player;
  if (!p.car) return;
  const ahead = 420;
  const bx = p.car.x + Math.cos(p.car.angle) * ahead;
  const by = p.car.y + Math.sin(p.car.angle) * ahead;
  for (let i = -1; i <= 1; i++) {
    const c = makeCar('police', bx + Math.cos(p.car.angle + Math.PI / 2) * i * 60, by + Math.sin(p.car.angle + Math.PI / 2) * i * 60, p.car.angle + Math.PI / 2, { cop: true, driver: 'cop', parked: true });
    c.siren = true;
    S.cars.push(c); S.cops.push(c);
  }
  showToast('ROADBLOCK AHEAD!', 2.5);
}

export function updateCops(dt) {
  const p = S.player;
  for (let i = S.cops.length - 1; i >= 0; i--) {
    const c = S.cops[i];
    if (c.dead) { S.cops.splice(i, 1); continue; }
    if (c.givingUp) {
      // drive away and despawn
      c.speed = Math.min(c.speed + 200 * dt, 300);
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      if (dist(c.x, c.y, p.x, p.y) > 1100) {
        const ci = S.cars.indexOf(c); if (ci >= 0) S.cars.splice(ci, 1);
        S.cops.splice(i, 1);
      }
      continue;
    }
    if (c.parked) {
      // roadblock car: stays, but rams if player gets close
      if (dist(c.x, c.y, p.x, p.y) < 130 && p.car) {
        c.parked = false;
      }
      continue;
    }
    // pursuit steering: aim at player, with some error at low stars
    const err = S.wanted <= 1 ? rand(-0.25, 0.25) : 0;
    const wantAngle = Math.atan2(p.y - c.y, p.x - c.x) + err;
    c.angle += clamp(angleDiff(c.angle, wantAngle), -3.2 * dt, 3.2 * dt);
    const top = c.def.max * (0.82 + S.wanted * 0.05);
    c.speed += clamp(top - c.speed, -500 * dt, 320 * dt);
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    // ram the player's car
    if (p.car && dist(c.x, c.y, p.car.x, p.car.y) < 56) {
      p.car.health -= 14 * dt;
      p.car.speed *= 0.94;
      c.speed *= 0.8;
      if (Math.random() < dt * 4) spawnParticles(p.car.x, p.car.y, 5, '#c9c9c9', 90, 0.4, 3);
    }
    // cop shoots at player on foot when close
    if (p.onFoot && dist(c.x, c.y, p.x, p.y) < 320) {
      c.shootT = (c.shootT || 0) - dt;
      if (c.shootT <= 0) {
        c.shootT = rand(0.7, 1.4);
        damagePlayer(6, 'police');
        S.bullets.push({ x: c.x, y: c.y, vx: Math.cos(wantAngle) * 620, vy: Math.sin(wantAngle) * 620, life: 0.8, from: 'cop' });
        sfx('shot');
      }
    }
    // busted: cop touches player on foot
    if (p.onFoot && dist(c.x, c.y, p.x, p.y) < 30) {
      S.bustedTimer += dt;
      if (S.bustedTimer > 1.2) {
        S.bustedTimer = 0;
        window.__veloraBusted && window.__veloraBusted();
      }
    } else {
      S.bustedTimer = Math.max(0, S.bustedTimer - dt);
    }
    // cop car destroyed?
    if (c.health <= 0) {
      c.dead = true;
      const ci = S.cars.indexOf(c); if (ci >= 0) S.cars.splice(ci, 1);
      S.cops.splice(i, 1);
      S.stats.kills++;
      addHeat(10);
    }
    // siren wail occasionally
    c.sirenT = (c.sirenT || 0) - dt;
    if (c.sirenT <= 0 && dist(c.x, c.y, p.x, p.y) < 700) { c.sirenT = rand(2.5, 4.5); sfx('siren'); }
  }
}

export function drawHeli(ctx) {
  const h = S.heli;
  if (!h) return;
  ctx.save();
  ctx.translate(h.x, h.y);
  // searchlight cone to player
  const p = S.player;
  ctx.fillStyle = 'rgba(255,244,180,0.10)';
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(p.x - h.x - 40, p.y - h.y);
  ctx.lineTo(p.x - h.x + 40, p.y - h.y);
  ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(255,244,180,0.35)';
  ctx.beginPath(); ctx.arc(p.x - h.x, p.y - h.y, 46, 0, 7); ctx.fill();
  // body
  ctx.fillStyle = '#1a2a4d';
  ctx.beginPath(); ctx.ellipse(0, 0, 26, 12, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#9fd8ff';
  ctx.beginPath(); ctx.ellipse(14, 0, 8, 6, 0, 0, 7); ctx.fill();
  // rotor
  const rot = S.time * 40;
  ctx.strokeStyle = 'rgba(200,200,200,0.8)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(Math.cos(rot) * 34, Math.sin(rot) * 34);
  ctx.lineTo(-Math.cos(rot) * 34, -Math.sin(rot) * 34);
  ctx.stroke();
  ctx.restore();
}
