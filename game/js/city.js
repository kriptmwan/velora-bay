// Velora Bay — city generation: road grid, districts, buildings, shops, ramps, packages.
import { WORLD, S } from './state.js';
import { mulberry32, rand, randi, pick } from './utils.js';

export const DISTRICTS = [
  { name: 'Downtown', x0: 0.42, y0: 0.30, x1: 0.62, y1: 0.55, color: '#5b6b8c', style: 'tower' },
  { name: 'Neon Strip', x0: 0.60, y0: 0.55, x1: 0.85, y1: 0.78, color: '#8c3d7a', style: 'neon' },
  { name: 'Marina', x0: 0.78, y0: 0.05, x1: 1.0, y1: 0.35, color: '#2e7f9e', style: 'marina' },
  { name: 'Harbor', x0: 0.0, y0: 0.62, x1: 0.22, y1: 0.95, color: '#6b5a3e', style: 'industrial' },
  { name: 'Old Town', x0: 0.22, y0: 0.30, x1: 0.42, y1: 0.60, color: '#9e7a4d', style: 'old' },
  { name: 'Hills', x0: 0.55, y0: 0.02, x1: 0.80, y1: 0.30, color: '#4d7a4d', style: 'house' },
  { name: 'Beach', x0: 0.0, y0: 0.0, x1: 0.55, y1: 0.30, color: '#c9a86a', style: 'beach' },
];

export function districtAt(x, y) {
  const fx = x / WORLD.size, fy = y / WORLD.size;
  for (const d of DISTRICTS) if (fx >= d.x0 && fx < d.x1 && fy >= d.y0 && fy < d.y1) return d;
  return DISTRICTS[0];
}

export function generateCity() {
  const rng = mulberry32(20261121);
  const b = WORLD.block, n = WORLD.roads, size = WORLD.size;
  const buildings = [];
  const roofPalettes = {
    tower: ['#3d4a6b', '#4a5878', '#5b6b8c', '#37415c', '#6b7a9e'],
    neon: ['#7a2d63', '#8c3d7a', '#5c2d6b', '#a04d8c', '#6b2d5c'],
    marina: ['#2e6b85', '#3d8cae', '#2a5a75', '#4d9ebb'],
    industrial: ['#6b5a3e', '#7a6a4d', '#5c4d33', '#8c7a5c'],
    old: ['#9e7a4d', '#b08a5c', '#8c6a3e', '#a87a4d'],
    house: ['#7a4d3e', '#8c5c4d', '#6b4d3e', '#9e6a4d'],
    beach: ['#c9a86a', '#d8b87a', '#b89a5c', '#e0c080'],
  };
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - 1; j++) {
      const x0 = i * b + WORLD.roadW / 2 + 14, y0 = j * b + WORLD.roadW / 2 + 14;
      const w = b - WORLD.roadW - 28, h = b - WORLD.roadW - 28;
      const cx = x0 + w / 2, cy = y0 + h / 2;
      const d = districtAt(cx, cy);
      if (d.style === 'beach' && j === 0) continue; // open sand on the north edge
      const roll = rng();
      if (d.style === 'house' && roll < 0.45) {
        buildings.push(makeHouse(x0, y0, w, h, rng, d));
        continue;
      }
      if (d.style === 'industrial' && roll < 0.35) {
        buildings.push({ x: x0, y: y0, w, h, hgt: 1, roof: pick(roofPalettes.industrial), style: 'warehouse', district: d.name });
        continue;
      }
      const hgt = d.style === 'tower' ? randi(3, 9) : d.style === 'neon' ? randi(2, 5) : d.style === 'marina' ? randi(2, 4) : randi(1, 3);
      buildings.push({ x: x0, y: y0, w, h, hgt, roof: pick(roofPalettes[d.style] || roofPalettes.old), style: d.style, district: d.name });
    }
  }
  // Landmarks: hospital, police HQ, bank, garage, cafe, penthouse, showroom, safehouse
  const landmarks = [
    { id: 'hospital', name: 'St. Maria Hospital', x: 3 * b, y: 6 * b, color: '#e8e8e8' },
    { id: 'police', name: 'V.B.P.D. HQ', x: 6 * b, y: 4 * b, color: '#2e4d7a' },
    { id: 'bank', name: 'Meridian Bank', x: 5 * b, y: 5 * b, color: '#c9a227' },
    { id: 'garage', name: "Dante's Garage", x: 2 * b, y: 8 * b, color: '#c94d3d' },
    { id: 'cafe', name: 'Coral Cafe', x: 3 * b, y: 4 * b, color: '#ff9a5c' },
    { id: 'penthouse', name: 'Kane Penthouse', x: 8 * b, y: 7 * b, color: '#1a1a2e' },
    { id: 'showroom', name: 'Comet Motors', x: 7 * b, y: 6 * b, color: '#e84d6b' },
    { id: 'safehouse', name: 'Safehouse', x: 4 * b, y: 9 * b, color: '#4d9e6b' },
    { id: 'harbor', name: 'Harbor Docks', x: 1 * b, y: 9 * b, color: '#7a6a4d' },
    { id: 'marina', name: 'Marina Pier', x: 10 * b, y: 2 * b, color: '#2e7f9e' },
  ];
  // Shops: gun store, armor, clothes, burger, bribe phone, paint shop
  const shops = [
    { id: 'gun', name: 'Ironworks Guns', kind: 'gun', x: 4 * b, y: 6 * b },
    { id: 'armor', name: 'Vest & Co.', kind: 'armor', x: 6 * b, y: 7 * b },
    { id: 'food', name: 'Burger Bay', kind: 'food', x: 5 * b, y: 3 * b },
    { id: 'phone', name: 'Payphone', kind: 'phone', x: 7 * b, y: 4 * b },
    { id: 'paint', name: 'Spray & Shine', kind: 'paint', x: 2 * b, y: 7 * b },
    { id: 'clothes', name: 'Velora Threads', kind: 'clothes', x: 8 * b, y: 5 * b },
  ];
  const ramps = [
    { x: 3 * b + 170, y: 2 * b, angle: 0 },
    { x: 8 * b, y: 3 * b + 170, angle: Math.PI / 2 },
    { x: 5 * b + 170, y: 9 * b, angle: 0 },
    { x: 1 * b, y: 5 * b + 170, angle: Math.PI / 2 },
    { x: 9 * b + 170, y: 8 * b, angle: 0 },
  ];
  const packages = [];
  const pkgSpots = [
    [1, 1], [10, 1], [1, 10], [10, 10], [5, 1], [1, 5], [10, 6], [6, 10],
    [3, 3], [8, 2], [2, 8], [9, 9], [4, 7], [7, 3], [6, 6],
  ];
  for (const [i, j] of pkgSpots) {
    packages.push({ x: i * b + rand(90, b - 90), y: j * b + rand(90, b - 90), found: false, id: packages.length });
  }
  return { buildings, landmarks, shops, ramps, packages, rng };
}

function makeHouse(x0, y0, w, h, rng, d) {
  return { x: x0 + rng() * 60, y: y0 + rng() * 60, w: w * 0.45, h: h * 0.45, hgt: 1, roof: pick(['#7a4d3e', '#8c5c4d', '#6b4d3e']), style: 'house', district: d.name };
}

export function isOnRoad(x, y) {
  const b = WORLD.block, half = WORLD.roadW / 2;
  const fx = ((x % b) + b) % b, fy = ((y % b) + b) % b;
  return fx < half || fx > b - half || fy < half || fy > b - half;
}

export function collideBuildings(ent, r) {
  // Push a circle entity out of building AABBs. Returns true if it hit something.
  let hit = false;
  for (const bd of S.city.buildings) {
    const nx = Math.max(bd.x, Math.min(ent.x, bd.x + bd.w));
    const ny = Math.max(bd.y, Math.min(ent.y, bd.y + bd.h));
    const dx = ent.x - nx, dy = ent.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      hit = true;
      if (d2 > 0.01) {
        const d = Math.sqrt(d2);
        ent.x = nx + (dx / d) * r; ent.y = ny + (dy / d) * r;
      } else {
        ent.x += r; // inside: shove out east
      }
    }
  }
  return hit;
}

export function nearestRoadPoint(x, y) {
  const b = WORLD.block;
  const ix = Math.round(x / b) * b, iy = Math.round(y / b) * b;
  return { x: ix, y: iy };
}
