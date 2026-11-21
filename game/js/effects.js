// Velora Bay — particles, explosions, skid marks, screen shake.
import { S } from './state.js';
import { rand } from './utils.js';
import { sfx } from './audio.js';

export function spawnParticles(x, y, n, color, speed = 120, life = 0.7, size = 4) {
  for (let i = 0; i < n; i++) {
    const a = rand(0, Math.PI * 2), v = rand(speed * 0.3, speed);
    S.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(life * 0.5, life), max: life, size: rand(size * 0.5, size * 1.5), color, type: 'spark' });
  }
}

export function spawnSmoke(x, y, n = 8) {
  for (let i = 0; i < n; i++) {
    S.particles.push({ x: x + rand(-8, 8), y: y + rand(-8, 8), vx: rand(-12, 12), vy: rand(-34, -8), life: rand(0.8, 1.6), max: 1.6, size: rand(8, 18), color: 'rgba(90,90,90,0.45)', type: 'smoke' });
  }
}

export function explode(x, y, big = false) {
  spawnParticles(x, y, big ? 46 : 26, '#ffb13d', 260, 0.9, 6);
  spawnParticles(x, y, big ? 30 : 16, '#ff5b2d', 180, 0.7, 5);
  spawnSmoke(x, y, big ? 16 : 8);
  S.camera.shake = big ? 14 : 8;
  sfx('explosion');
}

export function addSkid(x, y, angle) {
  S.skids.push({ x, y, angle, life: 6 });
  if (S.skids.length > 400) S.skids.shift();
}

export function updateEffects(dt) {
  for (let i = S.particles.length - 1; i >= 0; i--) {
    const p = S.particles[i];
    p.life -= dt;
    if (p.life <= 0) { S.particles.splice(i, 1); continue; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.98; p.vy *= 0.98;
    if (p.type === 'smoke') { p.size += 14 * dt; p.vy -= 8 * dt; }
  }
  for (let i = S.skids.length - 1; i >= 0; i--) {
    S.skids[i].life -= dt;
    if (S.skids[i].life <= 0) S.skids.splice(i, 1);
  }
  if (S.camera.shake > 0) {
    S.camera.shake = Math.max(0, S.camera.shake - dt * 30);
    S.camera.shakeX = rand(-S.camera.shake, S.camera.shake);
    S.camera.shakeY = rand(-S.camera.shake, S.camera.shake);
  } else { S.camera.shakeX = 0; S.camera.shakeY = 0; }
}

export function drawEffects(ctx) {
  for (const s of S.skids) {
    ctx.save();
    ctx.translate(s.x, s.y); ctx.rotate(s.angle);
    ctx.fillStyle = `rgba(15,15,15,${Math.min(0.55, s.life / 6)})`;
    ctx.fillRect(-8, -2, 16, 4);
    ctx.restore();
  }
  for (const p of S.particles) {
    const a = Math.max(0, p.life / p.max);
    ctx.globalAlpha = a;
    if (p.type === 'smoke') {
      ctx.fillStyle = p.color;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;
}
