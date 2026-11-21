// city.js — Velora Bay itself: seven districts, the road grid, buildings,
// shops, stunt ramps, hidden packages and race routes. Everything is laid
// out from one deterministic seed so the map is identical every run.

import { CITY_SIZE } from "./state.js";
import { rand, randInt, pick } from "./utils.js";

export const ROAD_GAP = 400;
export const ROAD_HALF = 26;

export const DISTRICTS = [
  { id: "downtown", name: "Downtown", x: 1100, y: 1100, w: 1000, h: 1000, ground: "#3d3a33", accent: "#e8c15a", desc: "Glass towers and the Kane Syndicate bank." },
  { id: "neon", name: "Neon Strip", x: 2100, y: 1100, w: 1000, h: 1000, ground: "#33283d", accent: "#ff4fd8", desc: "Casinos, clubs and Mama Luz's diner." },
  { id: "marina", name: "Marina", x: 1100, y: 100, w: 1000, h: 1000, ground: "#24404d", accent: "#4fd8ff", desc: "Yachts, boardwalk and the night market." },
  { id: "harbor", name: "Harbor", x: 100, y: 1100, w: 1000, h: 1000, ground: "#3a3630", accent: "#ff8a3d", desc: "Cranes, containers and smugglers' docks." },
  { id: "oldtown", name: "Old Town", x: 100, y: 2100, w: 1000, h: 1000, ground: "#4d3f2a", accent: "#d8b25a", desc: "Brick lanes, the church and St. Maria Hospital." },
  { id: "hills", name: "Hills", x: 2100, y: 2100, w: 1000, h: 1000, ground: "#2f4530", accent: "#8aff6a", desc: "Mansions, winding roads and the Kane estate." },
  { id: "beach", name: "Beach", x: 1100, y: 2100, w: 1000, h: 1000, ground: "#c2a878", accent: "#ffdf6a", desc: "Sand, surf shops and the pier races." },
];

export const SHOP_DEFS = [
  { id: "ammo", name: "Ironworks Guns", kind: "weapons", x: 2400, y: 1500, color: "#c23b4e" },
  { id: "armor", name: "SafeHouse Gear", kind: "armor", x: 1500, y: 2400, color: "#4a7fb5" },
  { id: "food", name: "Mama Luz's Diner", kind: "food", x: 2500, y: 1800, color: "#f2a541" },
  { id: "phone", name: "Payphone Row", kind: "bribe", x: 1800, y: 1300, color: "#7a3fd1" },
  { id: "dealer", name: "Velora Motors", kind: "dealer", x: 1300, y: 2600, color: "#2e9e6b" },
  { id: "clothes", name: "Strip Threads", kind: "clothes", x: 2700, y: 1300, color: "#ff4fd8" },
];

export const RACE_ROUTES = [
  { id: "pier", name: "Pier Sprint", laps: 2, points: [[1300, 2900], [2900, 2900], [2900, 2300], [1300, 2300]] },
  { id: "strip", name: "Neon Loop", laps: 2, points: [[2300, 1300], [2900, 1300], [2900, 1900], [2300, 1900]] },
  { id: "harbor", name: "Harbor Dash", laps: 2, points: [[300, 1300], [900, 1300], [900, 1900], [300, 1900]] },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x && x < d.x + d.w && y >= d.y && y < d.y + d.h) return d;
  }
  return DISTRICTS[0];
}

// True when the point sits on a road (roads run every ROAD_GAP in both axes).
export function isOnRoad(x, y) {
  const mx = ((x % ROAD_GAP) + ROAD_GAP) % ROAD_GAP;
  const my = ((y % ROAD_GAP) + ROAD_GAP) % ROAD_GAP;
  return mx < ROAD_HALF * 2 || mx > ROAD_GAP - ROAD_HALF * 2 ||
    my < ROAD_HALF * 2 || my > ROAD_GAP - ROAD_HALF * 2;
}

export function nearestRoadPoint(x, y) {
  const rx = Math.round(x / ROAD_GAP) * ROAD_GAP;
  const ry = Math.round(y / ROAD_GAP) * ROAD_GAP;
  return { x: rx, y: ry };
}

export function buildCity(world) {
  const rng = world.rng;
  world.buildings = [];
  world.shops = SHOP_DEFS.map((s) => ({ ...s }));
  world.ramps = [
    { x: 1500, y: 2900, angle: 0, name: "Pier Ramp" },
    { x: 2900, y: 1500, angle: Math.PI / 2, name: "Strip Ramp" },
    { x: 500, y: 1500, angle: -Math.PI / 2, name: "Harbor Ramp" },
    { x: 2300, y: 2700, angle: Math.PI, name: "Hills Ramp" },
  ];
  world.packages = [];
  const packageSpots = [
    [1250, 250], [2750, 350], [350, 1250], [3050, 1250], [1250, 3050],
    [2450, 2450], [450, 2450], [1650, 1650], [2850, 2850], [650, 650],
    [1950, 450], [450, 1950], [2950, 1950], [1950, 2950], [1650, 850],
  ];
  for (const [x, y] of packageSpots) world.packages.push({ x, y, taken: false });

  // One building per city block, kept clear of roads and shop fronts.
  const palette = ["#5a5148", "#6b5a3e", "#4a5a6b", "#6b4a5a", "#4a6b4a", "#7a6a4a", "#54424a"];
  for (let bx = 0; bx < 8; bx++) {
    for (let by = 0; by < 8; by++) {
      const cx = bx * ROAD_GAP + ROAD_GAP / 2;
      const cy = by * ROAD_GAP + ROAD_GAP / 2;
      if (rng() < 0.12) continue; // empty lot / plaza
      const w = rand(rng, 130, 230);
      const h = rand(rng, 110, 210);
      const tall = rng() < 0.3;
      world.buildings.push({
        x: cx - w / 2, y: cy - h / 2, w, h,
        color: pick(rng, palette),
        height: tall ? randInt(rng, 3, 6) : randInt(rng, 1, 2),
        windows: tall,
      });
    }
  }
  // Landmarks the story points at.
  world.landmarks = [
    { name: "Kane Tower", x: 1500, y: 1500, kind: "tower" },
    { name: "St. Maria Hospital", x: 500, y: 2500, kind: "hospital" },
    { name: "Velora Bank", x: 1700, y: 1300, kind: "bank" },
    { name: "Harbor Warehouse 7", x: 500, y: 1500, kind: "warehouse" },
    { name: "Kane Estate", x: 2600, y: 2600, kind: "estate" },
    { name: "The Pier", x: 1600, y: 3050, kind: "pier" },
  ];
  return world;
}

// Circle-vs-buildings collision: returns the building hit, or null.
export function buildingHit(world, x, y, radius) {
  for (const b of world.buildings) {
    if (x + radius > b.x && x - radius < b.x + b.w &&
      y + radius > b.y && y - radius < b.y + b.h) return b;
  }
  return null;
}

export function randomRoadPoint(rng) {
  const vertical = rng() < 0.5;
  const line = randInt(rng, 1, 7) * ROAD_GAP;
  const along = rand(rng, 150, CITY_SIZE - 150);
  return vertical ? { x: line, y: along } : { x: along, y: line };
}
