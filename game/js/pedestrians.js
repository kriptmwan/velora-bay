// Velora Bay — pedestrians: walk the sidewalks, chat, flee from gunfire and sirens.
import { WORLD, S } from './state.js';
import { rand, randi, pick, clamp, dist } from './utils.js';
import { collideBuildings } from './city.js';
import { PEDESTRIAN_LINES } from './story.js';

const SKIN = ['#e8b88a', '#c98a5c', '#8a5c3d', '#f0c8a0', '#6b4426'];
const SHIRT = ['#c94d4d', '#4d7ac9', '#7ac94d', '#c9a24d', '#8c4d9e', '#2e9e8c', '#e8e8e8', '#3d3d3d', '#ff9a5c', '#5c9ec9'];
const PANTS = ['#2e3d5c', '#3d3d3d', '#5c4d3d', '#2e5c3d', '#6b6b6b'];

export function spawnPeds(count) {
  for (let i = 0; i < count; i++) {
    S.peds.push(makePed());
  }
}

function makePed() {
  const b = WORLD.block, n = WORLD.roads;
  const ix = randi(0, n - 1), iy = randi(0, n - 1);
  const horizontal = Math.random() < 0.5;
  const along = rand(40, b - 40);
  const off = (Math.random() < 0.5 ? 46 : -46);
  return {
    x: horizontal ? ix * b + along : ix * b + off,
    y: horizontal ? iy * b + off : iy * b + along,
    angle: horizontal ? (Math.random() < 0.5 ? 0 : Math.PI) : (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2),
    speed: rand(28, 62), walkPhase: rand(0, 6), fleeing: false,
    skin: pick(SKIN), shirt: pick(SHIRT), pants: pick(PANTS),
    talk: Math.random() < 0.3 ? pick(PEDESTRIAN_LINES) : null,
    talkTimer: rand(0, 8), panic: 0, dead: false, hp: 100,
  };
}

export function updatePeds(dt) {
  const p = S.player;
  for (const ped of S.peds) {
    if (ped.dead) continue;
    // flee if gunfire nearby or player wanted and close, or cop siren near
    let threat = null;
    if (p && dist(ped.x, ped.y, p.x, p.y) < 260 && (S.wanted >= 2 || S.time - S.lastCrime < 2)) threat = p;
    for (const b of S.bullets) {
      if (dist(ped.x, ped.y, b.x, b.y) < 200) { threat = b; break; }
    }
    if (threat) {
      ped.fleeing = true; ped.panic = 2;
      const a = Math.atan2(ped.y - threat.y, ped.x - threat.x);
      ped.angle = a;
      ped.x += Math.cos(a) * 150 * dt;
      ped.y += Math.sin(a) * 150 * dt;
    } else {
      ped.fleeing = false;
      ped.panic = Math.max(0, ped.panic - dt);
      ped.x += Math.cos(ped.angle) * ped.speed * dt;
      ped.y += Math.sin(ped.angle) * ped.speed * dt;
      // at an intersection, sometimes turn
      const b = WORLD.block;
      const nearX = Math.abs(ped.x % b) < 8 || Math.abs(ped.x % b - b) < 8;
      const nearY = Math.abs(ped.y % b) < 8 || Math.abs(ped.y % b - b) < 8;
      if ((nearX || nearY) && Math.random() < dt * 0.5) {
        ped.angle = pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
      }
      if (ped.x < 20 || ped.y < 20 || ped.x > WORLD.size - 20 || ped.y > WORLD.size - 20) {
        ped.angle += Math.PI;
        ped.x = clamp(ped.x, 30, WORLD.size - 30); ped.y = clamp(ped.y, 30, WORLD.size - 30);
      }
    }
    ped.walkPhase += dt * (ped.fleeing ? 14 : 7);
    collideBuildings(ped, 10);
    if (ped.talk) ped.talkTimer -= dt;
  }
  // keep population topped up
  const alive = S.peds.filter(q => !q.dead).length;
  if (alive < 55 && S.mode === 'play') {
    for (let i = 0; i < 3; i++) S.peds.push(makePed());
  }
}

export function drawPed(ctx, ped, night) {
  if (ped.dead) return;
  ctx.save();
  ctx.translate(ped.x, ped.y);
  const bob = Math.sin(ped.walkPhase) * 1.5;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath(); ctx.ellipse(0, 5, 7, 3, 0, 0, 7); ctx.fill();
  // legs
  ctx.fillStyle = ped.pants;
  const legSwing = Math.sin(ped.walkPhase) * 3;
  ctx.fillRect(-3 + legSwing * 0.4, 1, 3, 7);
  ctx.fillRect(0 - legSwing * 0.4, 1, 3, 7);
  // body
  ctx.fillStyle = ped.shirt;
  ctx.beginPath(); ctx.roundRect(-5, -8 + bob * 0.3, 10, 11, 4); ctx.fill();
  // head
  ctx.fillStyle = ped.skin;
  ctx.beginPath(); ctx.arc(0, -12 + bob * 0.3, 5, 0, 7); ctx.fill();
  ctx.fillStyle = '#222';
  ctx.beginPath(); ctx.arc(0, -14 + bob * 0.3, 5, Math.PI, 0); ctx.fill();
  ctx.restore();
  if (ped.fleeing) {
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('!', ped.x, ped.y - 24);
  } else if (ped.talk && ped.talkTimer < 0 && Math.abs(ped.x - S.player.x) < 260 && Math.abs(ped.y - S.player.y) < 260) {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    const w = ctx.measureText(ped.talk).width + 12;
    ctx.beginPath(); ctx.roundRect(ped.x - w / 2, ped.y - 40, w, 16, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = '11px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(ped.talk, ped.x, ped.y - 28);
  }
}
