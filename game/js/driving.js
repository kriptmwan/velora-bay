// Velora Bay — driving physics: arcade handling, collisions, ramps, damage, explosions.
import { S, WORLD, addHeat } from './state.js';
import { driveInput, pressedOnce } from './input.js';
import { clamp, dist } from './utils.js';
import { collideBuildings, isOnRoad } from './city.js';
import { carsOverlap } from './vehicles.js';
import { sfx } from './audio.js';
import { explode, addSkid, spawnParticles, spawnSmoke } from './effects.js';
import { exitCar } from './player.js';

export function updateDriving(dt) {
  const p = S.player;
  if (!p || p.onFoot || !p.car) return;
  const c = p.car;
  const inp = driveInput();
  const def = c.def;
  const forward = inp.up ? 1 : inp.down ? -1 : 0;
  const steer = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  // acceleration
  if (forward > 0) c.speed += def.accel * dt * (c.speed < 0 ? 2.2 : 1);
  else if (forward < 0) c.speed -= def.brake * dt * (c.speed > 0 ? 1 : 0.55);
  else c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 140 * dt);
  if (inp.handbrake) c.speed -= Math.sign(c.speed) * Math.min(Math.abs(c.speed), 420 * dt);
  c.speed = clamp(c.speed, -def.max * 0.45, def.max);
  // steering scales with speed
  const spd = Math.abs(c.speed);
  const steerPower = def.grip * clamp(spd / 120, 0, 1) * (inp.handbrake ? 1.7 : 1);
  c.angle += steer * steerPower * dt * Math.sign(c.speed || 1) * (c.speed < 0 ? -1 : 1);
  const px = c.x, py = c.y;
  c.x += Math.cos(c.angle) * c.speed * dt;
  c.y += Math.sin(c.angle) * c.speed * dt;
  // skids when drifting
  if (inp.handbrake && spd > 200 && Math.random() < 0.7) {
    addSkid(c.x - Math.cos(c.angle) * def.len / 2, c.y - Math.sin(c.angle) * def.len / 2, c.angle);
  }
  // world bounds
  if (c.x < 30 || c.y < 30 || c.x > WORLD.size - 30 || c.y > WORLD.size - 30) {
    c.x = clamp(c.x, 30, WORLD.size - 30); c.y = clamp(c.y, 30, WORLD.size - 30);
    if (Math.abs(c.speed) > 150) { crashCar(c, 8); }
    c.speed *= 0.4;
  }
  // building collision
  const hitWall = collideBuildings(c, def.len / 2 - 4);
  if (hitWall && Math.abs(c.speed) > 120) {
    crashCar(c, Math.min(22, Math.abs(c.speed) / 22));
    c.speed *= 0.45;
  } else if (hitWall) c.speed *= 0.8;
  // car-car collisions
  for (const o of S.cars) {
    if (o === c || o.parked && o === c) continue;
    if (carsOverlap(c, o)) {
      const d = dist(c.x, c.y, o.x, o.y) || 1;
      const push = 8;
      const nx = (c.x - o.x) / d, ny = (c.y - o.y) / d;
      c.x += nx * push; c.y += ny * push;
      if (!o.traffic && o.driver !== 'player') { o.x -= nx * push; o.y -= ny * push; }
      const impact = Math.abs(c.speed) + Math.abs(o.speed || 0);
      if (impact > 260) {
        crashCar(c, 6); sfx('crash');
        if (o.traffic) { o.speed = Math.max(0, o.speed - 120); o.wait = 1.2; }
        if (o.cop) addHeat(4);
      }
      c.speed *= 0.86;
    }
  }
  // ramps — stunt jumps
  if (c.jumpZ === 0) {
    for (const r of S.city.ramps) {
      if (dist(c.x, c.y, r.x, r.y) < 46 && Math.abs(c.speed) > 200) {
        c.jumpV = 260 + Math.abs(c.speed) * 0.35;
        c.jumpZ = 1; c.airTime = 0;
        sfx('jump');
        break;
      }
    }
  }
  if (c.jumpZ > 0) {
    c.jumpZ += c.jumpV * dt; c.jumpV -= 640 * dt; c.airTime += dt;
    if (c.jumpZ <= 0) {
      c.jumpZ = 0; c.jumpV = 0;
      const air = c.airTime;
      if (air > 0.55) {
        const bonus = Math.round(air * 120);
        S.cash += bonus; S.stats.jumps++;
        window.__veloraToast && window.__veloraToast(`STUNT JUMP! +$${bonus}  (${air.toFixed(1)}s air)`);
        spawnParticles(c.x, c.y, 14, '#ffd23f', 140, 0.6, 4);
      }
      c.airTime = 0;
    }
  }
  // sync player to car
  p.x = c.x; p.y = c.y; p.angle = c.angle;
  S.stats.distanceDriven += Math.abs(c.speed) * dt;
  // exit car
  if (pressedOnce('e')) exitCar();
  // horn
  if (pressedOnce('q')) sfx('horn');
  // car destroyed?
  if (c.health <= 0 && !c.dead) {
    c.dead = true;
    explode(c.x, c.y, true);
    exitCar();
    p.x = c.x + 40; p.y = c.y + 40;
    p.health = Math.max(10, p.health - 25);
    const i = S.cars.indexOf(c);
    if (i >= 0) S.cars.splice(i, 1);
    addHeat(6);
  }
  c.brakeLight = inp.down || inp.handbrake;
}

function crashCar(c, dmg) {
  c.health -= dmg;
  spawnParticles(c.x, c.y, 8, '#c9c9c9', 110, 0.5, 4);
  if (c.health < 40) spawnSmoke(c.x, c.y, 3);
  sfx('crash');
  S.camera.shake = Math.max(S.camera.shake, 4);
}
