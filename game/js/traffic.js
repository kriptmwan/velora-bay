// traffic.js — ambient AI cars that follow the road grid. Each car picks a
// road line and a direction, drives it, turns at intersections, slows for
// the car ahead, and respawns near the player when it drifts too far away.

import { VEHICLE_DEFS } from "./state.js";
import { ROAD_GAP, randomRoadPoint } from "./city.js";
import { clamp, rand, randInt, pick } from "./utils.js";
import { updateVehiclePhysics, steerToward } from "./vehicles.js";

const TRAFFIC_TYPES = ["sedan", "coupe", "taxi", "truck", "van", "suv", "pickup"];

export class TrafficSystem {
  constructor(world) {
    this.world = world;
  }

  spawnInitial(count) {
    for (let i = 0; i < count; i++) this.spawnOne(true);
  }

  spawnOne(anywhere) {
    const w = this.world;
    const p = w.player;
    let pt;
    if (anywhere) {
      pt = randomRoadPoint(w.rng);
    } else {
      pt = randomRoadPoint(w.rng);
      // Bias the respawn to somewhere near the player.
      pt.x = clamp(pt.x, p.x - 900, p.x + 900);
      pt.y = clamp(pt.y, p.y - 900, p.y + 900);
    }
    const type = pick(w.rng, TRAFFIC_TYPES);
    const def = VEHICLE_DEFS[type];
    const vertical = w.rng() < 0.5;
    const car = {
      id: 9000 + w.traffic.length + Math.floor(w.rng() * 100000),
      type, name: def.name,
      x: pt.x, y: pt.y,
      angle: vertical ? (w.rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2) : (w.rng() < 0.5 ? 0 : Math.PI),
      speed: 0, color: def.color,
      topSpeed: 90 + w.rng() * 50, accel: 120, grip: 2.4,
      health: 100, driver: "traffic",
      cruise: 80 + w.rng() * 60,
      target: null, // {x, y} intersection to drive toward
      stuck: 0,
    };
    car.target = this._nextTarget(car);
    w.traffic.push(car);
    return car;
  }

  _nextTarget(car) {
    const w = this.world;
    const vertical = Math.abs(Math.cos(car.angle)) < 0.5;
    const dir = vertical ? Math.sign(Math.sin(car.angle)) || 1 : Math.sign(Math.cos(car.angle)) || 1;
    if (vertical) {
      const nextLine = clamp(Math.round(car.y / ROAD_GAP) * ROAD_GAP + dir * ROAD_GAP, 100, 3100);
      return { x: car.x, y: nextLine, turnAtEnd: true };
    }
    const nextLine = clamp(Math.round(car.x / ROAD_GAP) * ROAD_GAP + dir * ROAD_GAP, 100, 3100);
    return { x: nextLine, y: car.y, turnAtEnd: true };
  }

  update(dt) {
    const w = this.world;
    const p = w.player;
    if (w.traffic.length < 14) this.spawnOne(false);
    for (const car of w.traffic) {
      const dx = car.target.x - car.x;
      const dy = car.target.y - car.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 30) {
        // At the intersection: keep going or turn onto the cross road.
        if (w.rng() < 0.45) {
          car.angle += (w.rng() < 0.5 ? 1 : -1) * Math.PI / 2;
        }
        car.target = this._nextTarget(car);
      }
      // Slow down for the car ahead.
      let ahead = false;
      for (const other of w.traffic) {
        if (other === car) continue;
        const ox = other.x - car.x;
        const oy = other.y - car.y;
        const od = Math.sqrt(ox * ox + oy * oy);
        if (od < 70 && ox * Math.cos(car.angle) + oy * Math.sin(car.angle) > 0) { ahead = true; break; }
      }
      const playerCar = p.vehicle;
      if (playerCar) {
        const ox = playerCar.x - car.x;
        const oy = playerCar.y - car.y;
        const od = Math.sqrt(ox * ox + oy * oy);
        if (od < 60 && ox * Math.cos(car.angle) + oy * Math.sin(car.angle) > 0) ahead = true;
      }
      steerToward(car, car.target.x, car.target.y, dt);
      const control = { throttle: ahead ? 0 : 0.7, steer: 0, brake: ahead };
      const before = car.speed;
      updateVehiclePhysics(w, car, dt, control);
      car.speed = clamp(car.speed, 0, car.cruise);
      if (Math.abs(car.speed) < 1 && !ahead) car.stuck += dt;
      else car.stuck = 0;
      if (car.stuck > 3) { car.target = this._nextTarget(car); car.stuck = 0; }
      void before;
    }
    // Recycle cars that drifted far from the player.
    for (let i = w.traffic.length - 1; i >= 0; i--) {
      const car = w.traffic[i];
      const d = Math.hypot(car.x - p.x, car.y - p.y);
      if (d > 1600) {
        const fresh = this.spawnOne(false);
        void fresh;
        w.traffic.splice(i, 1);
      }
    }
  }
}
