// camera.js — follow camera with smoothing, a speed-based zoom-out and
// trauma-based screen shake. The renderer asks it for the view transform.

import { clamp, lerp } from "./utils.js";

export class Camera {
  constructor(world) {
    this.world = world;
    this.x = world.player.x;
    this.y = world.player.y;
    this.zoom = 1;
    this.shake = 0;
  }

  addShake(amount) {
    this.shake = Math.min(18, this.shake + amount);
  }

  update(dt) {
    const w = this.world;
    const p = w.player;
    const speed = Math.abs(p.speed || 0);
    const targetZoom = speed > 160 ? 0.82 : speed > 80 ? 0.92 : 1;
    this.zoom = lerp(this.zoom, targetZoom, dt * 2);
    this.x = lerp(this.x, p.x, 1 - Math.pow(0.001, dt));
    this.y = lerp(this.y, p.y, 1 - Math.pow(0.001, dt));
    this.shake = Math.max(0, this.shake - dt * 30);
    w.camera.x = this.x;
    w.camera.y = this.y;
    w.camera.zoom = this.zoom;
    w.camera.shake = this.shake;
  }

  // Screen offset of a world point, including shake jitter.
  viewOffset(canvasW, canvasH) {
    const sx = (this.world.rng() - 0.5) * this.shake;
    const sy = (this.world.rng() - 0.5) * this.shake;
    return {
      ox: canvasW / 2 - this.x * this.zoom + sx,
      oy: canvasH / 2 - this.y * this.zoom + sy,
    };
  }

  clampView(canvasW, canvasH) {
    const w = this.world;
    const vw = canvasW / this.zoom;
    const vh = canvasH / this.zoom;
    this.x = clamp(this.x, vw / 2 - 200, 3200 - vw / 2 + 200);
    this.y = clamp(this.y, vh / 2 - 200, 3200 - vh / 2 + 200);
    w.camera.x = this.x;
    w.camera.y = this.y;
  }
}
