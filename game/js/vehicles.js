// vehicles.js — the vehicle catalog, spawning, and the arcade driving
// physics shared by the player car, traffic and police cruisers.

import { VEHICLE_DEFS } from "./state.js";
import { clamp, angleLerp } from "./utils.js";
import { buildingHit } from "./city.js";

let nextVehicleId = 1;

export function spawnVehicle(world, type, x, y, angle) {
  const def = VEHICLE_DEFS[type];
  const v = {
    id: nextVehicleId++,
    type,
    name: def.name,
    x, y,
    angle: angle === undefined ? 0 : angle,
    speed: 0,
    color: def.color,
    topSpeed: def.topSpeed,
    accel: def.accel,
    grip: def.grip,
    health: 100,
    driver: null, // "player" | "traffic" | "police" | null (parked)
    ai: null,
  };
  world.vehicles.push(v);
  return v;
}

export function spawnParkedCars(world) {
  const rng = world.rng;
  const types = ["sedan", "coupe", "muscle", "taxi", "truck", "van", "suv", "pickup", "bike", "comet"];
  for (let i = 0; i < 26; i++) {
    const type = types[i % types.length];
    const line = (1 + Math.floor(rng() * 7)) * 400;
    const along = 150 + rng() * 2900;
    const vertical = rng() < 0.5;
    const x = vertical ? line + (rng() < 0.5 ? -38 : 38) : along;
    const y = vertical ? along : line + (rng() < 0.5 ? -38 : 38);
    if (buildingHit(world, x, y, 20)) continue;
    const v = spawnVehicle(world, type, x, y, vertical ? (rng() < 0.5 ? 0 : Math.PI) : (rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2));
    v.driver = null;
  }
  // A Comet GT waits near the Neon Strip for a bold thief.
  spawnVehicle(world, "comet", 2450, 1330, Math.PI / 2);
}

// Arcade car physics: throttle, steering that bites harder at low speed,
// drag, and a hard stop on building contact. Returns distance travelled.
export function updateVehiclePhysics(world, v, dt, control) {
  const steerInput = (control.steer || 0);
  const throttle = control.throttle || 0;
  const braking = control.brake ? 1 : 0;
  if (throttle > 0) v.speed += v.accel * throttle * dt;
  if (throttle < 0) v.speed += v.accel * 0.6 * throttle * dt;
  if (braking) v.speed -= Math.sign(v.speed) * 320 * dt;
  // Drag + rolling resistance.
  v.speed -= v.speed * 0.55 * dt;
  if (control.handbrake) v.speed -= v.speed * 2.2 * dt;
  v.speed = clamp(v.speed, -v.topSpeed * 0.45, v.topSpeed);
  if (Math.abs(v.speed) < 2 && throttle === 0) v.speed = 0;
  const steerAuthority = clamp(Math.abs(v.speed) / 60, 0, 1) * v.grip;
  const reverse = v.speed < 0 ? -1 : 1;
  v.angle += steerInput * steerAuthority * dt * 1.9 * reverse;
  const nx = v.x + Math.cos(v.angle) * v.speed * dt;
  const ny = v.y + Math.sin(v.angle) * v.speed * dt;
  const hit = buildingHit(world, nx, ny, 16);
  if (hit) {
    v.speed *= -0.25; // bounce off the wall, keep some momentum
    return 0;
  }
  const moved = Math.abs(v.speed) * dt;
  v.x = clamp(nx, 40, 3160);
  v.y = clamp(ny, 40, 3160);
  return moved;
}

// Nearest parked or traffic car to a point, within maxDist.
export function nearestVehicle(world, x, y, maxDist) {
  let best = null;
  let bestD = maxDist * maxDist;
  const all = world.vehicles.concat(world.traffic);
  for (const v of all) {
    if (v.driver === "player") continue;
    const dx = v.x - x;
    const dy = v.y - y;
    const d = dx * dx + dy * dy;
    if (d < bestD) { bestD = d; best = v; }
  }
  return best;
}

export function vehicleDisplayName(v) {
  return v ? v.name : "on foot";
}

// Gentle steering helper for AI drivers chasing a target point.
export function steerToward(v, tx, ty, dt) {
  const want = Math.atan2(ty - v.y, tx - v.x);
  const diff = ((want - v.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  v.angle = angleLerp(v.angle, want, clamp(Math.abs(diff) * dt * 2, 0, 1));
  return diff;
}
