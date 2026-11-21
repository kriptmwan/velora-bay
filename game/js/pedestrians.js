// pedestrians.js — people on the sidewalks. They wander between nearby
// points, wait at corners, and run away from gunfire, explosions and fast
// cars. A panicked crowd is the clearest sign a crime just happened.

import { rand, randInt, pick, clamp } from "./utils.js";
import { CITY_SIZE } from "./state.js";

const FIRST_NAMES = ["Ana", "Ben", "Cleo", "Dario", "Elsa", "Felix", "Greta", "Hugo", "Iris", "Jonas", "Kira", "Leo", "Mira", "Nico", "Olga", "Pablo", "Rosa", "Tomas"];
const SHIRT_COLORS = ["#e86a6a", "#6aa8e8", "#7ad06a", "#e8c15a", "#c06ae8", "#e8e8e8", "#5ad0c0", "#e89a5a"];

export class PedestrianSystem {
  constructor(world) {
    this.world = world;
  }

  spawnInitial(count) {
    for (let i = 0; i < count; i++) this.spawnOne(true);
  }

  spawnOne(anywhere) {
    const w = this.world;
    const p = w.player;
    let x, y;
    if (anywhere) {
      x = 150 + w.rng() * (CITY_SIZE - 300);
      y = 150 + w.rng() * (CITY_SIZE - 300);
    } else {
      x = clamp(p.x + (w.rng() - 0.5) * 1200, 120, CITY_SIZE - 120);
      y = clamp(p.y + (w.rng() - 0.5) * 1200, 120, CITY_SIZE - 120);
    }
    const ped = {
      name: pick(w.rng, FIRST_NAMES),
      x, y,
      angle: w.rng() * Math.PI * 2,
      speed: 0,
      color: pick(w.rng, SHIRT_COLORS),
      state: "walk", // walk | idle | flee
      tx: x, ty: y,
      wait: rand(w.rng, 0, 3),
      panic: 0,
    };
    this._pickTarget(ped);
    w.peds.push(ped);
    return ped;
  }

  _pickTarget(ped) {
    const w = this.world;
    ped.tx = clamp(ped.x + (w.rng() - 0.5) * 500, 120, CITY_SIZE - 120);
    ped.ty = clamp(ped.y + (w.rng() - 0.5) * 500, 120, CITY_SIZE - 120);
  }

  // Called by combat and explosions: everyone nearby runs.
  scare(x, y, radius) {
    for (const ped of this.world.peds) {
      const d = Math.hypot(ped.x - x, ped.y - y);
      if (d < radius) {
        ped.state = "flee";
        ped.panic = 3 + Math.random() * 2;
        const away = Math.atan2(ped.y - y, ped.x - x);
        ped.tx = clamp(ped.x + Math.cos(away) * 400, 120, CITY_SIZE - 120);
        ped.ty = clamp(ped.y + Math.sin(away) * 400, 120, CITY_SIZE - 120);
      }
    }
  }

  update(dt) {
    const w = this.world;
    const p = w.player;
    if (w.peds.length < 26) this.spawnOne(false);
    for (const ped of w.peds) {
      if (ped.panic > 0) ped.panic -= dt;
      else if (ped.state === "flee") ped.state = "walk";
      const dx = ped.tx - ped.x;
      const dy = ped.ty - ped.y;
      const d = Math.hypot(dx, dy);
      if (d < 12) {
        if (ped.state === "walk") {
          ped.wait -= dt;
          ped.speed = 0;
          if (ped.wait <= 0) {
            this._pickTarget(ped);
            ped.wait = rand(w.rng, 1, 4);
          }
        } else {
          this._pickTarget(ped);
          ped.state = "walk";
        }
        continue;
      }
      const want = Math.atan2(dy, dx);
      ped.angle = want;
      ped.speed = ped.state === "flee" ? 150 : 55;
      ped.x += Math.cos(want) * ped.speed * dt;
      ped.y += Math.sin(want) * ped.speed * dt;
      // Fleeing peds dodge the player's speeding car.
      if (p.vehicle && Math.abs(p.vehicle.speed) > 120) {
        const cd = Math.hypot(ped.x - p.vehicle.x, ped.y - p.vehicle.y);
        if (cd < 90) this.scare(p.vehicle.x, p.vehicle.y, 120);
      }
    }
    // Recycle distant peds so the crowd stays around the player.
    for (let i = w.peds.length - 1; i >= 0; i--) {
      const ped = w.peds[i];
      if (Math.hypot(ped.x - p.x, ped.y - p.y) > 1500) w.peds.splice(i, 1);
    }
  }
}
