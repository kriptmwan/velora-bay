// state.js — the single shared world object and the game's static catalogs.
// Every system reads and writes this one object, so the self-test harness can
// drive the whole game by stepping the world without touching the DOM.

import { mulberry32 } from "./utils.js";

export const CITY_SIZE = 3200;
export const SAVE_KEY = "velora-bay-save-v1";

// Ten drivable vehicles plus the police cruiser (not buyable, not stealable
// from the dealer — it is earned the hard way, by jacking one).
export const VEHICLE_DEFS = {
  sedan: { name: "Marlin Sedan", topSpeed: 210, accel: 150, grip: 2.6, color: "#4a7fb5", price: 2500, seats: 4 },
  coupe: { name: "Vela Coupe", topSpeed: 235, accel: 175, grip: 2.9, color: "#c23b4e", price: 5200, seats: 2 },
  comet: { name: "Comet GT", topSpeed: 305, accel: 240, grip: 3.4, color: "#f2a541", price: 18000, seats: 2 },
  muscle: { name: "Brawler Muscle", topSpeed: 265, accel: 215, grip: 2.4, color: "#7a3fd1", price: 9500, seats: 2 },
  taxi: { name: "Bay Cab", topSpeed: 200, accel: 145, grip: 2.6, color: "#f2c531", price: 4000, seats: 4 },
  truck: { name: "Hauler Truck", topSpeed: 170, accel: 110, grip: 2.2, color: "#5b7a4a", price: 8000, seats: 2 },
  van: { name: "Courier Van", topSpeed: 185, accel: 120, grip: 2.3, color: "#8a8f96", price: 6000, seats: 3 },
  suv: { name: "Ridgeline SUV", topSpeed: 220, accel: 160, grip: 2.7, color: "#2e5d4b", price: 11000, seats: 5 },
  pickup: { name: "Dune Pickup", topSpeed: 225, accel: 165, grip: 2.5, color: "#b5651d", price: 7500, seats: 3 },
  bike: { name: "Wasp Bike", topSpeed: 285, accel: 260, grip: 3.1, color: "#222831", price: 6500, seats: 1 },
  police: { name: "VCPD Cruiser", topSpeed: 260, accel: 220, grip: 3.0, color: "#1d3fae", price: 0, seats: 4 },
};

export const VEHICLE_TYPES = Object.keys(VEHICLE_DEFS).filter((t) => t !== "police");

// Four weapons, each with its own damage, fire rate and magazine.
export const WEAPON_DEFS = {
  pistol: { name: "P9 Pistol", damage: 22, rate: 0.28, mag: 12, range: 420, price: 800, bulletSpeed: 900, spread: 0.03 },
  smg: { name: "K9 SMG", damage: 14, rate: 0.09, mag: 32, range: 380, price: 2400, bulletSpeed: 950, spread: 0.07 },
  shotgun: { name: "Boomstick 12", damage: 16, rate: 0.85, mag: 6, range: 260, price: 3200, bulletSpeed: 800, spread: 0.16, pellets: 6 },
  rifle: { name: "AR-7 Rifle", damage: 38, rate: 0.14, mag: 30, range: 620, price: 5500, bulletSpeed: 1200, spread: 0.015 },
};

export const WEAPON_ORDER = ["pistol", "smg", "shotgun", "rifle"];

export function createWorld(seed) {
  const rng = mulberry32(seed === undefined ? 20261121 : seed);
  return {
    rng,
    seed: seed === undefined ? 20261121 : seed,
    time: 0, // seconds since boot
    timeOfDay: 9.5, // hours, 0-24; morning start
    weather: { rain: 0, targetRain: 0, storm: false },
    started: false,
    paused: false,
    gameOver: null, // "busted" | "wasted" | null
    player: {
      x: 1600, y: 1600, angle: -Math.PI / 2, speed: 0,
      onFoot: true, health: 100, armor: 0, cash: 500,
      wanted: 0, wantedHeat: 0, vehicle: null,
      weapon: "pistol", ammo: { pistol: 48, smg: 0, shotgun: 0, rifle: 0 },
      fireCooldown: 0, outfit: 0, kills: 0, respect: 0,
    },
    camera: { x: 1600, y: 1600, zoom: 1, shake: 0 },
    vehicles: [], // parked / abandoned cars the player can steal
    traffic: [], // AI cars on the road grid
    peds: [], // pedestrians on sidewalks
    police: [], // active cruisers
    heli: null, // {x, y, angle} or null
    roadblocks: [], // {x, y, angle} barrier cars at 3+ stars
    bullets: [],
    enemies: [], // armed gang members spawned by missions
    particles: [],
    pickups: [], // cash / health / armor drops
    packages: [], // 15 hidden packages {x, y, taken}
    ramps: [], // stunt jump ramps {x, y, angle}
    buildings: [],
    shops: [],
    missions: {
      index: -1, // -1 = none started yet
      active: null, // runtime mission state
      completed: [], // mission ids finished
      failed: 0,
    },
    taxi: { active: false, fare: null, passenger: null, timer: 0 },
    race: { active: false, route: null, checkpoint: 0, timer: 0, best: {} },
    vigilante: { active: false, target: null, timer: 0, done: 0 },
    stats: {
      missionsDone: 0, faresDone: 0, racesWon: 0, stunts: 0,
      packagesFound: 0, carsStolen: 0, distance: 0, shotsFired: 0,
    },
    garage: [], // owned vehicle types stored at the garage
    ownedCars: ["sedan"],
    message: "", // toast line shown on the HUD
    messageTimer: 0,
    banner: "", // mission objective banner text
    bannerTimer: 0,
    objective: "Visit Mama Luz at the diner to start your story.",
    selftest: null,
  };
}

export function setWanted(world, stars) {
  const p = world.player;
  p.wanted = Math.max(0, Math.min(5, Math.round(stars)));
  p.wantedHeat = p.wanted > 0 ? 100 : 0;
}

export function addCash(world, amount) {
  world.player.cash = Math.max(0, world.player.cash + Math.round(amount));
  return world.player.cash;
}

export function hurtPlayer(world, amount) {
  const p = world.player;
  let left = amount;
  if (p.armor > 0) {
    const absorbed = Math.min(p.armor, left * 0.7);
    p.armor -= absorbed;
    left -= absorbed;
  }
  p.health -= left;
  if (p.health <= 0) {
    p.health = 0;
    world.gameOver = "wasted";
  }
}

export function showMessage(world, text, seconds) {
  world.message = text;
  world.messageTimer = seconds === undefined ? 3 : seconds;
}

export function showBanner(world, text, seconds) {
  world.banner = text;
  world.bannerTimer = seconds === undefined ? 5 : seconds;
}
