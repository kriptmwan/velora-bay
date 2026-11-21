// Velora Bay — vehicle definitions: 10 drivable models with distinct handling.
import { rand, pick } from './utils.js';

export const VEHICLES = {
  sedan:   { name: 'Vantara Sedan',  len: 52, wid: 26, top: 165, accel: 210, brake: 320, grip: 3.4, max: 420, color: '#4d7ac9', price: 0 },
  coupe:   { name: 'Comet Coupe',   len: 50, wid: 25, top: 180, accel: 250, brake: 340, grip: 3.8, max: 460, color: '#c94d6b', price: 2500 },
  sports:  { name: 'Comet GT',      len: 52, wid: 26, top: 195, accel: 330, brake: 380, grip: 4.4, max: 560, color: '#e84d2e', price: 8000 },
  muscle:  { name: 'Bison Muscle',  len: 54, wid: 27, top: 185, accel: 300, brake: 330, grip: 3.6, max: 500, color: '#7a3dc9', price: 4500 },
  taxi:    { name: 'Velora Taxi',   len: 52, wid: 26, top: 165, accel: 215, brake: 330, grip: 3.5, max: 430, color: '#ffd23f', price: 0 },
  truck:   { name: 'Hauler Truck',  len: 72, wid: 30, top: 130, accel: 150, brake: 260, grip: 2.6, max: 330, color: '#8c7a3d', price: 0 },
  van:     { name: 'Cargo Van',     len: 60, wid: 28, top: 140, accel: 170, brake: 280, grip: 2.9, max: 360, color: '#9e9e9e', price: 0 },
  suv:     { name: 'Trailblazer SUV', len: 58, wid: 29, top: 160, accel: 220, brake: 310, grip: 3.2, max: 410, color: '#2e7f5c', price: 3000 },
  pickup:  { name: 'Desert Pickup', len: 58, wid: 28, top: 165, accel: 230, brake: 310, grip: 3.3, max: 430, color: '#c97a2e', price: 2000 },
  bike:    { name: 'Falcon Bike',   len: 44, wid: 14, top: 200, accel: 360, brake: 400, grip: 5.2, max: 580, color: '#222831', price: 6000 },
  police:  { name: 'V.B.P.D. Cruiser', len: 54, wid: 27, top: 180, accel: 300, brake: 380, grip: 4.2, max: 520, color: '#1a2a4d', price: 0 },
};

export const TRAFFIC_COLORS = ['#c94d4d', '#4d7ac9', '#7ac94d', '#c9a24d', '#8c8c8c', '#5c4d9e', '#2e9e8c', '#d8d8d8', '#3d3d3d', '#c97a9e'];

let carId = 1;
export function makeCar(model, x, y, angle, opts = {}) {
  const def = VEHICLES[model] || VEHICLES.sedan;
  return {
    id: carId++, model, def, x, y, angle,
    speed: 0, steer: 0, health: opts.health || 100,
    color: opts.color || (model === 'taxi' ? '#ffd23f' : model === 'police' ? '#1a2a4d' : pick(TRAFFIC_COLORS)),
    traffic: !!opts.traffic, parked: !!opts.parked, cop: !!opts.cop,
    driver: opts.driver || null, // 'player' | 'traffic' | 'cop' | 'rival' | null
    target: null, dir: 0, ix: 0, iy: 0, wait: 0,
    lights: false, siren: false, sirenPhase: 0,
    smoke: 0, horn: 0, brakeLight: false,
    jumpZ: 0, jumpV: 0, airTime: 0,
    lastX: x, lastY: y,
  };
}

export function randomTrafficCar(x, y, angle) {
  const models = ['sedan', 'coupe', 'taxi', 'van', 'suv', 'pickup', 'muscle'];
  return makeCar(pick(models), x, y, angle, { traffic: true, driver: 'traffic' });
}

export function carCorners(c) {
  const l = c.def.len / 2, w = c.def.wid / 2;
  const cos = Math.cos(c.angle), sin = Math.sin(c.angle);
  return [
    { x: c.x + cos * l - sin * w, y: c.y + sin * l + cos * w },
    { x: c.x + cos * l + sin * w, y: c.y + sin * l - cos * w },
    { x: c.x - cos * l - sin * w, y: c.y - sin * l + cos * w },
    { x: c.x - cos * l + sin * w, y: c.y - sin * l - cos * w },
  ];
}

export function carsOverlap(a, b) {
  // circle approximation for cheap collision
  const dx = a.x - b.x, dy = a.y - b.y;
  const r = (a.def.len + b.def.len) / 2.6;
  return dx * dx + dy * dy < r * r;
}
