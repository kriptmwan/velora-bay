// Velora Bay — combat: weapons, bullets, explosions, enemy shooters.
import { S, addHeat } from './state.js';
import { clamp, dist, angleTo } from './utils.js';
import { sfx } from './audio.js';
import { spawnParticles, explode } from './effects.js';
import { damagePlayer } from './player.js';

export const WEAPONS = {
  pistol:  { name: 'Pistol',   damage: 34, rate: 0.28, spread: 0.05, speed: 780, range: 520, price: 0,    mag: Infinity },
  smg:     { name: 'SMG',      damage: 16, rate: 0.09, spread: 0.11, speed: 820, range: 460, price: 1200, mag: 240 },
  shotgun: { name: 'Shotgun',  damage: 22, rate: 0.75, spread: 0.22, speed: 640, range: 300, price: 1800, mag: 48, pellets: 5 },
  rifle:   { name: 'Rifle',    damage: 55, rate: 0.45, spread: 0.02, speed: 1100, range: 720, price: 3500, mag: 120 },
};

let fireCooldown = 0;

export function updateCombat(dt) {
  const p = S.player;
  fireCooldown -= dt;
  if (!p || !p.onFoot || p.dead) return;
  const aiming = S.mouse.down;
  if (aiming && fireCooldown <= 0) {
    const w = WEAPONS[S.weapon];
    const wstate = S.weapons[S.weapon];
    if (!wstate || !wstate.owned) return;
    if (wstate.ammo <= 0 && w.mag !== Infinity) { S.weapon = 'pistol'; return; }
    fireCooldown = w.rate;
    const base = angleTo(p.x, p.y, S.mouse.wx, S.mouse.wy);
    const pellets = w.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const a = base + (Math.random() - 0.5) * w.spread * 2;
      S.bullets.push({ x: p.x + Math.cos(base) * 16, y: p.y + Math.sin(base) * 16, vx: Math.cos(a) * w.speed, vy: Math.sin(a) * w.speed, life: w.range / w.speed, from: 'player', damage: w.damage });
    }
    if (w.mag !== Infinity) wstate.ammo--;
    S.stats.shotsFired++;
    p.muzzle = 0.06;
    sfx('shot');
    addHeat(2);
  }
  p.muzzle = Math.max(0, p.muzzle - dt);
  // enemies shoot at player
  for (const e of S.enemies) {
    if (e.dead) continue;
    e.shootT -= dt;
    const d = dist(e.x, e.y, p.x, p.y);
    if (d < 420 && e.shootT <= 0) {
      e.shootT = 0.9 + Math.random() * 0.8;
      const a = angleTo(e.x, e.y, p.x, p.y) + (Math.random() - 0.5) * 0.2;
      S.bullets.push({ x: e.x, y: e.y, vx: Math.cos(a) * 620, vy: Math.sin(a) * 620, life: 0.9, from: 'enemy', damage: 8 });
      sfx('shot');
    }
  }
}

export function updateBullets(dt) {
  for (let i = S.bullets.length - 1; i >= 0; i--) {
    const b = S.bullets[i];
    b.life -= dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    let dead = b.life <= 0;
    if (!dead) {
      // hit buildings?
      for (const bd of S.city.buildings) {
        if (b.x > bd.x && b.x < bd.x + bd.w && b.y > bd.y && b.y < bd.y + bd.h) {
          spawnParticles(b.x, b.y, 4, '#c9c9c9', 80, 0.3, 3);
          dead = true; break;
        }
      }
    }
    if (!dead && b.from === 'player') {
      // hit peds
      for (const ped of S.peds) {
        if (!ped.dead && dist(b.x, b.y, ped.x, ped.y) < 12) {
          ped.dead = true; ped.hp = 0;
          S.stats.kills++;
          addHeat(18);
          spawnParticles(ped.x, ped.y, 10, '#c94d4d', 120, 0.5, 4);
          dead = true; break;
        }
      }
      // hit enemies
      if (!dead) for (const e of S.enemies) {
        if (!e.dead && dist(b.x, b.y, e.x, e.y) < 13) {
          e.hp -= b.damage;
          spawnParticles(b.x, b.y, 6, '#ff5b4d', 110, 0.4, 3);
          if (e.hp <= 0) {
            e.dead = true; S.stats.kills++;
            addHeat(8);
            spawnParticles(e.x, e.y, 12, '#c94d4d', 130, 0.5, 4);
            window.__veloraEnemyKilled && window.__veloraEnemyKilled(e);
          }
          dead = true; break;
        }
      }
      // hit cars
      if (!dead) for (const c of S.cars) {
        if (c.driver === 'player') continue;
        if (Math.abs(b.x - c.x) < c.def.len / 2 + 4 && Math.abs(b.y - c.y) < c.def.wid / 2 + 10) {
          c.health -= b.damage;
          spawnParticles(b.x, b.y, 4, '#ffd23f', 90, 0.3, 3);
          if (c.health <= 0 && !c.dead) {
            c.dead = true;
            explode(c.x, c.y, true);
            const ci = S.cars.indexOf(c); if (ci >= 0) S.cars.splice(ci, 1);
            const pi = S.cops.indexOf(c); if (pi >= 0) S.cops.splice(pi, 1);
            addHeat(10);
          }
          dead = true; break;
        }
      }
    }
    if (!dead && (b.from === 'enemy' || b.from === 'cop')) {
      const p = S.player;
      if (p && p.onFoot && dist(b.x, b.y, p.x, p.y) < 12) {
        damagePlayer(b.damage || 8, b.from);
        dead = true;
      }
      if (p && !p.onFoot && p.car && Math.abs(b.x - p.car.x) < p.car.def.len / 2 && Math.abs(b.y - p.car.y) < p.car.def.wid / 2) {
        p.car.health -= b.damage || 8;
        spawnParticles(b.x, b.y, 4, '#ffd23f', 90, 0.3, 3);
        dead = true;
      }
    }
    if (dead) S.bullets.splice(i, 1);
  }
}

export function drawBullets(ctx) {
  ctx.strokeStyle = '#ffe98a'; ctx.lineWidth = 2;
  for (const b of S.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.012, b.y - b.vy * 0.012);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  const p = S.player;
  if (p && p.onFoot && p.muzzle > 0) {
    ctx.fillStyle = '#ffdf5c';
    ctx.beginPath();
    ctx.arc(p.x + Math.cos(p.angle) * 22, p.y + Math.sin(p.angle) * 22, 7, 0, 7);
    ctx.fill();
  }
}

export function spawnEnemy(x, y, hp = 100, tag = 'kane') {
  const e = { x, y, angle: 0, hp, maxHp: hp, dead: false, shootT: 1 + Math.random(), tag, speed: 95, walkPhase: 0 };
  S.enemies.push(e);
  return e;
}
