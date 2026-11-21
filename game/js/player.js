// player.js — Rex Delgado on foot: movement, entering and leaving cars,
// and slow health recovery when out of trouble.

import { clamp } from "./utils.js";
import { buildingHit } from "./city.js";
import { nearestVehicle } from "./vehicles.js";
import { showMessage, setWanted } from "./state.js";

export class PlayerController {
  constructor(world, game) {
    this.world = world;
    this.game = game; // for audio + effects hooks
  }

  update(dt, input) {
    const w = this.world;
    const p = w.player;
    if (!p.onFoot) return;
    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    let mx = 0;
    let my = 0;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;
    const moving = mx !== 0 || my !== 0;
    if (moving) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      const speed = input.sprint ? 235 : 150;
      const nx = p.x + mx * speed * dt;
      const ny = p.y + my * speed * dt;
      if (!buildingHit(w, nx, p.y, 12)) p.x = clamp(nx, 40, 3160);
      if (!buildingHit(w, p.x, ny, 12)) p.y = clamp(ny, 40, 3160);
      p.angle = Math.atan2(my, mx);
      p.speed = speed;
    } else {
      p.speed = 0;
    }
    // Slow recovery while calm and unhurt by the law.
    if (p.wanted === 0 && p.health > 0 && p.health < 100) {
      p.health = Math.min(100, p.health + dt * 1.5);
    }
    if (input.wasPressed("e")) this.tryEnterVehicle();
  }

  tryEnterVehicle() {
    const w = this.world;
    const p = w.player;
    const car = nearestVehicle(w, p.x, p.y, 70);
    if (!car) {
      showMessage(w, "No car close enough — walk up to one and press E.", 2);
      return false;
    }
    const wasParked = car.driver === null;
    if (car.driver === "traffic") {
      // Jacking a moving car is a crime: the law notices.
      const idx = w.traffic.indexOf(car);
      if (idx >= 0) w.traffic.splice(idx, 1);
      setWanted(w, Math.max(p.wanted, 1));
      showMessage(w, "You jacked the " + car.name + "! The cops saw that.", 3);
      if (this.game && this.game.audio) this.game.audio.crash();
    } else if (wasParked) {
      showMessage(w, "You took the " + car.name + ".", 2.5);
    }
    const vIdx = w.vehicles.indexOf(car);
    if (vIdx >= 0) w.vehicles.splice(vIdx, 1);
    car.driver = "player";
    p.vehicle = car;
    p.onFoot = false;
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    p.speed = car.speed;
    w.stats.carsStolen++;
    return true;
  }

  exitVehicle() {
    const w = this.world;
    const p = w.player;
    if (!p.vehicle || p.onFoot) return false;
    const car = p.vehicle;
    car.driver = null;
    car.speed = 0;
    w.vehicles.push(car);
    p.vehicle = null;
    p.onFoot = true;
    p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
    p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
    p.angle = car.angle;
    p.speed = 0;
    return true;
  }
}
