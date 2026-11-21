// Velora Bay — day/night cycle and weather.
import { S } from './state.js';
import { rand, clamp } from './utils.js';

export function updateWeather(dt) {
  S.dayTime = (S.dayTime + dt * 60) % 86400; // 1 real second = 1 game minute
  S.weatherTimer -= dt;
  if (S.weatherTimer <= 0) {
    S.weatherTimer = rand(180, 420);
    const r = Math.random();
    S.weather = r < 0.6 ? 'clear' : r < 0.8 ? 'cloudy' : 'rain';
    if (S.weather === 'rain') {
      for (let i = 0; i < 120; i++) S.rainDrops.push({ x: rand(0, 1280), y: rand(0, 800), v: rand(500, 800) });
    } else S.rainDrops = [];
  }
  if (S.weather === 'rain') {
    for (const d of S.rainDrops) {
      d.y += d.v * dt; d.x += 60 * dt;
      if (d.y > 820) { d.y = -20; d.x = rand(0, 1280); }
    }
  }
}

export function sunFactor() {
  // 0 = deep night, 1 = full noon sun
  const h = S.dayTime / 3600;
  if (h >= 6 && h < 8) return (h - 6) / 2 * 0.8;
  if (h >= 8 && h < 17) return 1;
  if (h >= 17 && h < 20) return 1 - (h - 17) / 3 * 0.85;
  if (h >= 20 || h < 5) return 0.12;
  return 0.12 + (h - 5) * 0.8; // 5..6 dawn
}

export function isNight() { return sunFactor() < 0.4; }

export function drawLighting(ctx, w, h) {
  const sun = sunFactor();
  if (sun < 0.95) {
    const dark = (1 - sun) * 0.55;
    const h = S.dayTime / 3600;
    const warm = (h >= 17 && h < 20) || (h >= 5 && h < 7);
    ctx.fillStyle = warm ? `rgba(30,16,60,${dark})` : `rgba(8,14,40,${dark})`;
    ctx.fillRect(0, 0, w, h);
  }
  if (S.weather === 'cloudy') { ctx.fillStyle = 'rgba(60,70,90,0.12)'; ctx.fillRect(0, 0, w, h); }
  if (S.weather === 'rain') {
    ctx.strokeStyle = 'rgba(180,200,255,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (const d of S.rainDrops) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - 3, d.y + 14); }
    ctx.stroke();
    ctx.fillStyle = 'rgba(40,60,90,0.10)'; ctx.fillRect(0, 0, w, h);
  }
}
