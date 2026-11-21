// weather.js — day/night cycle plus rain. The clock advances slowly in
// play (one full day per ~8 minutes) and the renderer asks this system
// whether it is night and how hard it is raining.

import { clamp, lerp } from "./utils.js";

export class Weather {
  constructor(world) {
    this.world = world;
    this.rainDrops = [];
  }

  update(dt) {
    const w = this.world;
    // One in-game hour every 20 real seconds.
    w.timeOfDay = (w.timeOfDay + dt / 20) % 24;
    // Rain drifts toward its target; storms roll in and out on their own.
    if (w.rng() < dt * 0.01) {
      w.weather.targetRain = w.rng() < 0.35 ? 0.3 + w.rng() * 0.6 : 0;
      w.weather.storm = w.weather.targetRain > 0.7;
    }
    w.weather.rain = lerp(w.weather.rain, w.weather.targetRain, dt * 0.2);
    // Keep a pool of rain streaks alive around the camera.
    if (w.weather.rain > 0.05) {
      const want = Math.floor(w.weather.rain * 90);
      while (this.rainDrops.length < want) {
        this.rainDrops.push({
          x: w.camera.x + (w.rng() - 0.5) * 1400,
          y: w.camera.y + (w.rng() - 0.5) * 1000,
          speed: 700 + w.rng() * 400,
        });
      }
    } else {
      this.rainDrops.length = 0;
    }
    for (const d of this.rainDrops) {
      d.y += d.speed * dt;
      d.x -= d.speed * 0.25 * dt;
      if (d.y > w.camera.y + 550) {
        d.y = w.camera.y - 550;
        d.x = w.camera.x + (w.rng() - 0.5) * 1400;
      }
    }
    if (this.rainDrops.length > 120) this.rainDrops.length = 120;
  }

  isNight() {
    const h = this.world.timeOfDay;
    return h < 6 || h >= 19;
  }

  // 0 = noon brightness, 1 = full night darkness.
  darkness() {
    const h = this.world.timeOfDay;
    if (h >= 7 && h < 17) return 0;
    if (h >= 17 && h < 19) return (h - 17) / 2 * 0.75;
    if (h >= 5 && h < 7) return (7 - h) / 2 * 0.75;
    return 0.75;
  }

  setNight() {
    this.world.timeOfDay = 23;
    this.world.weather.rain = 0.7;
    this.world.weather.targetRain = 0.7;
  }

  setDay() {
    this.world.timeOfDay = 13;
    this.world.weather.rain = 0;
    this.world.weather.targetRain = 0;
  }
}

export function clamp01(v) {
  return clamp(v, 0, 1);
}
