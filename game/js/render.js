// Velora Bay — world renderer: ground, roads, buildings, markers, entities, lighting.
import { S, WORLD } from './state.js';
import { districtAt } from './city.js';
import { drawCarShape } from './traffic.js';
import { drawPed } from './pedestrians.js';
import { drawPlayer } from './player.js';
import { drawEffects } from './effects.js';
import { drawBullets } from './combat.js';
import { drawHeli } from './police.js';
import { drawLighting, isNight, sunFactor } from './weather.js';
import { dist } from './utils.js';

export function render(ctx, vw, vh) {
  const cam = S.camera;
  ctx.clearRect(0, 0, vw, vh);
  ctx.save();
  ctx.translate(vw / 2, vh / 2);
  ctx.scale(cam.zoom, cam.zoom);
  ctx.translate(-cam.x + cam.shakeX, -cam.y + cam.shakeY);
  drawGround(ctx);
  drawRoads(ctx);
  drawBuildings(ctx);
  drawRamps(ctx);
  drawPackages(ctx);
  drawMarkers(ctx);
  drawEffects(ctx);
  drawCars(ctx);
  drawPedsAndEnemies(ctx);
  drawPlayer(ctx);
  drawBullets(ctx);
  drawHeli(ctx);
  ctx.restore();
  drawLighting(ctx, vw, vh);
  // vignette
  const g = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.45, vw / 2, vh / 2, vh * 0.85);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.28)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, vw, vh);
}

function drawGround(ctx) {
  const size = WORLD.size;
  // base grass
  ctx.fillStyle = '#3d7a3d';
  ctx.fillRect(-200, -200, size + 400, size + 400);
  // beach sand on the north edge
  ctx.fillStyle = '#d8c080';
  ctx.fillRect(-200, -200, size + 400, 130);
  // sea beyond the beach
  ctx.fillStyle = '#2e7f9e';
  ctx.fillRect(-200, -200, size + 400, 60);
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  for (let x = -100; x < size; x += 90) {
    ctx.fillRect(x, -30, 46, 3);
    ctx.fillRect(x + 40, -48, 30, 3);
  }
  // district tint blocks (subtle)
  const b = WORLD.block;
  for (let i = 0; i < WORLD.roads - 1; i++) {
    for (let j = 0; j < WORLD.roads - 1; j++) {
      const cx = i * b + b / 2, cy = j * b + b / 2;
      const d = districtAt(cx, cy);
      ctx.fillStyle = d.style === 'house' ? '#4d8a4d' : d.style === 'beach' ? '#d8c080' : d.style === 'industrial' ? '#5c5c4d' : '#356b35';
      ctx.fillRect(i * b + WORLD.roadW / 2, j * b + WORLD.roadW / 2, b - WORLD.roadW, b - WORLD.roadW);
    }
  }
}

function drawRoads(ctx) {
  const b = WORLD.block, half = WORLD.roadW / 2;
  ctx.fillStyle = '#2e2e33';
  for (let i = 0; i < WORLD.roads; i++) {
    ctx.fillRect(i * b - half, -100, WORLD.roadW, WORLD.size + 200);
    ctx.fillRect(-100, i * b - half, WORLD.size + 200, WORLD.roadW);
  }
  // sidewalks
  ctx.fillStyle = '#8c8c88';
  for (let i = 0; i < WORLD.roads; i++) {
    ctx.fillRect(i * b - half - 8, -100, 8, WORLD.size + 200);
    ctx.fillRect(i * b + half, -100, 8, WORLD.size + 200);
    ctx.fillRect(-100, i * b - half - 8, WORLD.size + 200, 8);
    ctx.fillRect(-100, i * b + half, WORLD.size + 200, 8);
  }
  // lane dashes
  ctx.fillStyle = '#e8d23f';
  for (let i = 0; i < WORLD.roads; i++) {
    for (let t = 0; t < WORLD.size; t += 90) {
      ctx.fillRect(i * b - 2, t, 4, 44);
      ctx.fillRect(t, i * b - 2, 44, 4);
    }
  }
  // crosswalks at intersections
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (let i = 0; i < WORLD.roads; i++) {
    for (let j = 0; j < WORLD.roads; j++) {
      for (let k = -2; k <= 2; k++) {
        ctx.fillRect(i * b + k * 12 - 3, j * b - half + 4, 6, 12);
        ctx.fillRect(i * b + k * 12 - 3, j * b + half - 16, 6, 12);
      }
    }
  }
}

function drawBuildings(ctx) {
  const night = isNight();
  for (const bd of S.city.buildings) {
    // shadow / base
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(bd.x + 6, bd.y + 8, bd.w, bd.h);
    ctx.fillStyle = bd.roof;
    ctx.fillRect(bd.x, bd.y, bd.w, bd.h);
    // roof edge
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = 3;
    ctx.strokeRect(bd.x, bd.y, bd.w, bd.h);
    // inner roof detail
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(bd.x + 10, bd.y + 10, bd.w - 20, bd.h - 20);
    // rooftop clutter: AC units, gardens, pools — deterministic per building
    const seed = (bd.x * 7 + bd.y * 13) % 100;
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fillRect(bd.x + 16, bd.y + 16, 26, 18);
    ctx.fillRect(bd.x + bd.w - 46, bd.y + bd.h - 36, 30, 20);
    if (seed < 30) {
      ctx.fillStyle = 'rgba(60,140,200,0.75)'; // rooftop pool
      ctx.beginPath(); ctx.roundRect(bd.x + bd.w * 0.3, bd.y + bd.h * 0.35, bd.w * 0.4, bd.h * 0.3, 10); ctx.fill();
    } else if (seed < 60) {
      ctx.fillStyle = 'rgba(70,160,80,0.55)'; // rooftop garden
      ctx.beginPath(); ctx.roundRect(bd.x + bd.w * 0.25, bd.y + bd.h * 0.3, bd.w * 0.5, bd.h * 0.4, 8); ctx.fill();
      ctx.fillStyle = 'rgba(40,110,50,0.8)';
      ctx.beginPath(); ctx.arc(bd.x + bd.w * 0.4, bd.y + bd.h * 0.45, 10, 0, 7); ctx.arc(bd.x + bd.w * 0.6, bd.y + bd.h * 0.55, 8, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(bd.x + bd.w * 0.35, bd.y + bd.h * 0.35, bd.w * 0.3, bd.h * 0.3);
    }
    if (bd.style === 'tower') {
      // rooftop AC + helipad mark
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(bd.x + bd.w / 2 - 14, bd.y + bd.h / 2 - 14, 28, 28);
      ctx.strokeStyle = 'rgba(255,210,63,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(bd.x + bd.w / 2, bd.y + bd.h / 2, 18, 0, 7); ctx.stroke();
    } else if (bd.style === 'neon') {
      ctx.strokeStyle = night ? '#ff5ce1' : '#c94d9e';
      ctx.lineWidth = 3;
      ctx.strokeRect(bd.x + 4, bd.y + 4, bd.w - 8, bd.h - 8);
      if (night) {
        ctx.fillStyle = 'rgba(255,92,225,0.5)';
        ctx.fillRect(bd.x + 4, bd.y + 4, bd.w - 8, 3);
      }
    } else if (bd.style === 'warehouse') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(bd.x + 12, bd.y + bd.h - 26, bd.w - 24, 16);
    } else if (bd.style === 'house') {
      ctx.fillStyle = '#c94d4d';
      ctx.beginPath();
      ctx.moveTo(bd.x, bd.y + bd.h * 0.4);
      ctx.lineTo(bd.x + bd.w / 2, bd.y);
      ctx.lineTo(bd.x + bd.w, bd.y + bd.h * 0.4);
      ctx.closePath(); ctx.fill();
    }
    // lit windows at night
    if (night && bd.hgt >= 2) {
      ctx.fillStyle = 'rgba(255,220,120,0.85)';
      const cols = Math.floor(bd.w / 34), rows = Math.floor(bd.h / 34);
      for (let cx = 0; cx < cols; cx++) {
        for (let cy = 0; cy < rows; cy++) {
          if ((cx * 7 + cy * 13 + bd.x) % 5 < 2) {
            ctx.fillRect(bd.x + 12 + cx * 34, bd.y + 12 + cy * 34, 12, 14);
          }
        }
      }
    }
  }
  // landmark labels
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  for (const lm of S.city.landmarks) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const w = ctx.measureText(lm.name).width + 14;
    ctx.beginPath(); ctx.roundRect(lm.x - w / 2, lm.y - 30, w, 18, 8); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.fillText(lm.name, lm.x, lm.y - 17);
    ctx.fillStyle = lm.color;
    ctx.beginPath(); ctx.arc(lm.x, lm.y, 7, 0, 7); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  }
  // shop signs
  ctx.font = 'bold 11px sans-serif';
  for (const sh of S.city.shops) {
    ctx.fillStyle = '#7dff8a';
    ctx.beginPath(); ctx.arc(sh.x, sh.y, 9, 0, 7); ctx.fill();
    ctx.fillStyle = '#0b2a12';
    ctx.fillText('$', sh.x, sh.y + 4);
  }
}

function drawRamps(ctx) {
  for (const r of S.city.ramps) {
    ctx.save();
    ctx.translate(r.x, r.y); ctx.rotate(r.angle);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(-30, 18); ctx.lineTo(30, 18); ctx.lineTo(30, -18); ctx.lineTo(-30, 6);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#111'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('JUMP', 0, 12);
    ctx.restore();
  }
}

function drawPackages(ctx) {
  const pulse = 0.6 + Math.sin(S.time * 4) * 0.4;
  for (const pkg of S.city.packages) {
    if (pkg.found) continue;
    ctx.save();
    ctx.translate(pkg.x, pkg.y);
    ctx.fillStyle = `rgba(255,210,63,${0.25 + pulse * 0.3})`;
    ctx.beginPath(); ctx.arc(0, 0, 26 + pulse * 6, 0, 7); ctx.fill();
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.roundRect(-8, -8, 16, 16, 3); ctx.fill();
    ctx.fillStyle = '#7a5c00'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('?', 0, 4);
    ctx.restore();
  }
}

function drawMarkers(ctx) {
  const p = S.player;
  const drawMarker = (x, y, color, label) => {
    const bob = Math.sin(S.time * 3) * 6;
    ctx.save();
    ctx.translate(x, y + bob - 30);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-12, -26); ctx.lineTo(12, -26);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.arc(0, -18, 4, 0, 7); ctx.fill();
    ctx.restore();
    ctx.fillStyle = 'rgba(255,210,63,0.25)';
    ctx.beginPath(); ctx.ellipse(x, y, 34, 12, 0, 0, 7); ctx.fill();
    if (label) {
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(label, x, y - 46);
    }
  };
  if (S.mission) {
    const st = S.mission.def.stages[S.mission.stage];
    if (st && st.at) drawMarker(st.at.x, st.at.y, '#ffd23f', st.type.toUpperCase());
    else if (st && st.type === 'race' && S.race) drawMarker(S.race.cps[S.race.next].x, S.race.cps[S.race.next].y, '#7dff8a', 'CHECKPOINT ' + (S.race.next + 1));
    else if (st && st.type === 'tail' && S.mission.data.tailCar) {
      const c = S.mission.data.tailCar;
      drawMarker(c.x, c.y, '#ff5b4d', 'TAIL');
    }
  }
  if (S.taxi) {
    const t = S.taxi.state === 'toPickup' ? S.taxi.pickup : S.taxi.drop;
    drawMarker(t.x, t.y, '#7dff8a', S.taxi.state === 'toPickup' ? 'PICKUP' : 'DROPOFF');
  }
  if (S.race && !S.race.won) drawMarker(S.race.cps[S.race.next].x, S.race.cps[S.race.next].y, '#7dff8a', 'CHECKPOINT ' + (S.race.next + 1));
  if (S.vigilanteTarget) drawMarker(S.vigilanteTarget.x, S.vigilanteTarget.y, '#ff5b4d', 'THUG');
  // objective distance readout
  if (S.mission) {
    const st = S.mission.def.stages[S.mission.stage];
    if (st && st.at) {
      const d = Math.round(dist(p.x, p.y, st.at.x, st.at.y));
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath(); ctx.roundRect(p.x - 40, p.y - 78, 80, 18, 8); ctx.fill();
      ctx.fillStyle = '#ffd23f'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(d + 'm', p.x, p.y - 65);
    }
  }
}

function drawCars(ctx) {
  const night = isNight();
  // parked + traffic + cops, sorted by y for depth
  const sorted = [...S.cars].sort((a, b) => a.y - b.y);
  for (const c of sorted) {
    if (c.dead) continue;
    drawCarShape(ctx, c, night);
  }
  // headlight cones at night
  if (night) {
    for (const c of S.cars) {
      if (c.dead) continue;
      const fx = c.x + Math.cos(c.angle) * c.def.len / 2;
      const fy = c.y + Math.sin(c.angle) * c.def.len / 2;
      ctx.fillStyle = 'rgba(255,240,180,0.07)';
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.lineTo(fx + Math.cos(c.angle - 0.25) * 170, fy + Math.sin(c.angle - 0.25) * 170);
      ctx.lineTo(fx + Math.cos(c.angle + 0.25) * 170, fy + Math.sin(c.angle + 0.25) * 170);
      ctx.closePath(); ctx.fill();
    }
  }
}

function drawPedsAndEnemies(ctx) {
  const night = isNight();
  const all = [...S.peds.filter(p => !p.dead), ...S.enemies.filter(e => !e.dead)];
  all.sort((a, b) => a.y - b.y);
  for (const e of all) {
    if (e.tag) {
      // enemy: dark jacket, red band
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(0, 5, 7, 3, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#1a1a1a';
      ctx.beginPath(); ctx.roundRect(-5, -8, 10, 11, 4); ctx.fill();
      ctx.fillStyle = '#ff2d2d'; ctx.fillRect(-5, -2, 10, 3);
      ctx.fillStyle = '#e8b88a';
      ctx.beginPath(); ctx.arc(0, -12, 5, 0, 7); ctx.fill();
      ctx.fillStyle = '#111';
      ctx.fillRect(2, -14, 12, 3); // gun
      ctx.restore();
      // hp bar
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(e.x - 14, e.y - 26, 28, 4);
      ctx.fillStyle = '#ff2d2d';
      ctx.fillRect(e.x - 14, e.y - 26, 28 * Math.max(0, e.hp / e.maxHp), 4);
    } else {
      drawPed(ctx, e, night);
    }
  }
}
