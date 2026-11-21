// Velora Bay — traffic AI: cars follow the road grid, stop for cars ahead, honk.
import { WORLD, S } from './state.js';
import { makeCar, randomTrafficCar, carsOverlap } from './vehicles.js';
import { collideBuildings, isOnRoad } from './city.js';
import { rand, randi, clamp, angleDiff } from './utils.js';

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]]; // E S W N

export function spawnTraffic(count) {
  const b = WORLD.block, n = WORLD.roads;
  for (let i = 0; i < count; i++) {
    const ix = randi(0, n - 1), iy = randi(0, n - 1);
    const dir = randi(0, 3);
    const lane = 15;
    const ox = dir === 1 ? lane : dir === 3 ? -lane : 0;
    const oy = dir === 0 ? lane : dir === 2 ? -lane : 0;
    const c = randomTrafficCar(ix * b + ox, iy * b + oy, Math.atan2(DIRS[dir][1], DIRS[dir][0]));
    c.ix = ix; c.iy = iy; c.dir = dir; c.speed = rand(90, 170);
    S.cars.push(c);
  }
}

export function spawnParked(count) {
  const b = WORLD.block, n = WORLD.roads;
  const models = ['sedan', 'coupe', 'sports', 'muscle', 'suv', 'pickup', 'bike', 'van'];
  for (let i = 0; i < count; i++) {
    const ix = randi(0, n - 1), iy = randi(0, n - 1);
    const horizontal = Math.random() < 0.5;
    const along = rand(70, b - 70);
    const x = horizontal ? ix * b + along : ix * b + (Math.random() < 0.5 ? 38 : -38);
    const y = horizontal ? iy * b + (Math.random() < 0.5 ? 38 : -38) : iy * b + along;
    const c = makeCar(models[Math.floor(Math.random() * models.length)], x, y, horizontal ? (Math.random() < 0.5 ? 0 : Math.PI) : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2), { parked: true });
    S.cars.push(c);
  }
}

function pickNextDir(c) {
  const opts = [0, 1, 2, 3].filter(d => d !== (c.dir + 2) % 4);
  // prefer straight
  if (Math.random() < 0.55) return c.dir;
  return opts[Math.floor(Math.random() * opts.length)];
}

export function updateTraffic(dt) {
  const b = WORLD.block, n = WORLD.roads;
  for (const c of S.cars) {
    if (!c.traffic || c.driver !== 'traffic') continue;
    if (c.wait > 0) { c.wait -= dt; c.speed = Math.max(0, c.speed - 200 * dt); continue; }
    const [dx, dy] = DIRS[c.dir];
    const tx = (c.ix + dx) * b, ty = (c.iy + dy) * b;
    const lane = 15;
    const ox = c.dir === 1 ? lane : c.dir === 3 ? -lane : 0;
    const oy = c.dir === 0 ? lane : c.dir === 2 ? -lane : 0;
    const gx = tx + ox, gy = ty + oy;
    const ddx = gx - c.x, ddy = gy - c.y;
    const d = Math.sqrt(ddx * ddx + ddy * ddy);
    const wantAngle = Math.atan2(ddy, ddx);
    c.angle += clamp(angleDiff(c.angle, wantAngle), -2.4 * dt, 2.4 * dt);
    // car ahead? slow down
    let blocked = false;
    for (const o of S.cars) {
      if (o === c || o.parked) continue;
      const fx = o.x - c.x, fy = o.y - c.y;
      const ahead = fx * Math.cos(c.angle) + fy * Math.sin(c.angle);
      const side = Math.abs(-fx * Math.sin(c.angle) + fy * Math.cos(c.angle));
      if (ahead > 0 && ahead < 70 && side < 26) { blocked = true; break; }
    }
    const p = S.player;
    if (p && !p.onFoot && p.car) {
      const fx = p.car.x - c.x, fy = p.car.y - c.y;
      const ahead = fx * Math.cos(c.angle) + fy * Math.sin(c.angle);
      const side = Math.abs(-fx * Math.sin(c.angle) + fy * Math.cos(c.angle));
      if (ahead > 0 && ahead < 80 && side < 30) blocked = true;
    }
    const target = blocked ? 0 : rand(0, 0) + 150;
    c.speed += clamp((blocked ? 0 : 150) - c.speed, -260 * dt, 130 * dt);
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    if (d < 26) {
      c.ix += dx; c.iy += dy;
      if (c.ix < 0 || c.iy < 0 || c.ix >= n || c.iy >= n) {
        // turn around at the edge
        c.dir = (c.dir + 2) % 4;
        c.ix = clamp(c.ix, 0, n - 1); c.iy = clamp(c.iy, 0, n - 1);
      } else {
        c.dir = pickNextDir(c);
      }
    }
  }
  // remove traffic cars that drifted off-grid or got stuck, respawn far away
  for (let i = S.cars.length - 1; i >= 0; i--) {
    const c = S.cars[i];
    if (c.traffic && (c.x < -200 || c.y < -200 || c.x > WORLD.size + 200 || c.y > WORLD.size + 200)) {
      S.cars.splice(i, 1);
    }
  }
  const trafficCount = S.cars.filter(c => c.traffic).length;
  if (trafficCount < 26 && S.mode === 'play') {
    const p = S.player;
    const px = p ? p.x : WORLD.size / 2, py = p ? p.y : WORLD.size / 2;
    const ang = rand(0, Math.PI * 2);
    const ix = Math.round((px + Math.cos(ang) * 900) / WORLD.block);
    const iy = Math.round((py + Math.sin(ang) * 900) / WORLD.block);
    if (ix >= 0 && ix < WORLD.roads && iy >= 0 && iy < WORLD.roads) {
      const dir = randi(0, 3);
      const c = randomTrafficCar(ix * WORLD.block, iy * WORLD.block, Math.atan2(DIRS[dir][1], DIRS[dir][0]));
      c.ix = ix; c.iy = iy; c.dir = dir; c.speed = 140;
      S.cars.push(c);
    }
  }
}

export function drawCarShape(ctx, c, night) {
  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(c.angle);
  const L = c.def.len, W = c.def.wid;
  ctx.shadowColor = 'rgba(0,0,0,0.45)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#111';
  ctx.beginPath(); ctx.roundRect(-L / 2 - 2, -W / 2 - 2, L + 4, W + 4, 8); ctx.fill();
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  ctx.fillStyle = c.color;
  ctx.beginPath(); ctx.roundRect(-L / 2, -W / 2, L, W, 7); ctx.fill();
  // roof / cabin
  ctx.fillStyle = 'rgba(20,30,45,0.85)';
  ctx.beginPath(); ctx.roundRect(-L * 0.18, -W * 0.36, L * 0.36, W * 0.72, 5); ctx.fill();
  ctx.fillStyle = 'rgba(160,210,255,0.55)';
  ctx.beginPath(); ctx.roundRect(L * 0.10, -W * 0.30, L * 0.10, W * 0.60, 3); ctx.fill();
  // headlights / tail lights
  ctx.fillStyle = night ? '#ffe9a8' : '#fff8d0';
  ctx.fillRect(L / 2 - 2, -W / 2 + 2, 3, 6); ctx.fillRect(L / 2 - 2, W / 2 - 8, 3, 6);
  ctx.fillStyle = '#ff2d2d';
  ctx.fillRect(-L / 2 - 1, -W / 2 + 2, 3, 6); ctx.fillRect(-L / 2 - 1, W / 2 - 8, 3, 6);
  if (c.brakeLight) { ctx.fillStyle = '#ff0000'; ctx.fillRect(-L / 2 - 3, -W / 2, 4, W); }
  if (c.model === 'taxi') {
    ctx.fillStyle = '#111'; ctx.font = 'bold 9px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('TAXI', 0, 3);
    ctx.fillStyle = '#ffd23f'; ctx.fillRect(-L * 0.18, -W / 2 - 4, L * 0.36, 4);
  }
  if (c.model === 'police') {
    ctx.fillStyle = '#fff'; ctx.fillRect(-L * 0.28, -W / 2, L * 0.56, 5); ctx.fillRect(-L * 0.28, W / 2 - 5, L * 0.56, 5);
    ctx.fillStyle = '#111'; ctx.font = 'bold 8px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('VBPD', 0, 3);
    const phase = Math.floor(S.time * 4) % 2 === 0;
    ctx.fillStyle = phase ? '#ff2d2d' : '#2d7dff';
    ctx.beginPath(); ctx.arc(-4, -W / 2 - 1, 4, 0, 7); ctx.fill();
    ctx.fillStyle = phase ? '#2d7dff' : '#ff2d2d';
    ctx.beginPath(); ctx.arc(4, -W / 2 - 1, 4, 0, 7); ctx.fill();
  }
  if (c.model === 'bike') {
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(L * 0.32, 0, 5, 0, 7); ctx.arc(-L * 0.32, 0, 5, 0, 7); ctx.fill();
  }
  ctx.restore();
  if (c.health < 60 && c.health > 0) {
    // smoke
    if (Math.random() < 0.3) {
      S.particles.push({ x: c.x - Math.cos(c.angle) * c.def.len / 2, y: c.y - Math.sin(c.angle) * c.def.len / 2, vx: rand(-15, 15), vy: rand(-30, -10), life: 0.8, max: 0.8, size: rand(6, 12), color: 'rgba(80,80,80,0.5)', type: 'smoke' });
    }
  }
}
