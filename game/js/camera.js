// Velora Bay — chase camera: follows the player, zooms out with speed, clamps to the city.
import { S, WORLD } from './state.js';
import { clamp, lerp } from './utils.js';

export function updateCamera(dt, vw, vh) {
  const p = S.player;
  if (!p) return;
  const cam = S.camera;
  let tx = p.x, ty = p.y;
  if (!p.onFoot && p.car) {
    const lead = clamp(Math.abs(p.car.speed) / 500, 0, 1) * 120;
    tx += Math.cos(p.car.angle) * lead;
    ty += Math.sin(p.car.angle) * lead;
  }
  const k = 1 - Math.pow(0.001, dt);
  cam.x = lerp(cam.x, tx, k);
  cam.y = lerp(cam.y, ty, k);
  const targetZoom = (!p.onFoot && p.car) ? clamp(1.05 - Math.abs(p.car.speed) / 2200, 0.78, 1.05) : 1.05;
  cam.zoom = lerp(cam.zoom, targetZoom, 1 - Math.pow(0.01, dt));
  cam.x = clamp(cam.x, (vw / 2) / cam.zoom - 100, WORLD.size + 100 - (vw / 2) / cam.zoom);
  cam.y = clamp(cam.y, (vh / 2) / cam.zoom - 100, WORLD.size + 100 - (vh / 2) / cam.zoom);
}

export function screenToWorld(sx, sy, vw, vh) {
  const cam = S.camera;
  return {
    x: cam.x + (sx - vw / 2) / cam.zoom + cam.shakeX,
    y: cam.y + (sy - vh / 2) / cam.zoom + cam.shakeY,
  };
}
