// Velora Bay — central game state. Every system reads and writes this one object.
import { rand } from './utils.js';

export const WORLD = { size: 4080, block: 340, roads: 12, roadW: 66 };

export const S = {
  mode: 'menu',           // menu | play | pause | dead | busted
  time: 0,                // seconds since load
  dayTime: 8 * 3600,      // seconds into the day (starts 08:00)
  weather: 'clear',       // clear | rain | cloudy
  weatherTimer: 240,
  rainDrops: [],
  player: null,
  camera: { x: 0, y: 0, zoom: 1, shake: 0, shakeX: 0, shakeY: 0 },
  keys: {},
  mouse: { x: 640, y: 400, wx: 0, wy: 0, down: false },
  city: null,
  cars: [],               // every car: traffic, parked, player, cops
  peds: [],
  cops: [],
  heli: null,
  bullets: [],
  particles: [],
  skids: [],
  pickups: [],
  enemies: [],            // mission hostiles (armed pedestrians)
  wanted: 0,
  wantedHeat: 0,          // 0..100, stars derive from it
  lastCrime: -99,
  bustedTimer: 0,
  cash: 250,
  respect: 0,
  stats: { kills: 0, carsStolen: 0, fares: 0, jumps: 0, racesWon: 0, packages: 0, vigilante: 0, missionsDone: 0, shotsFired: 0, distanceDriven: 0 },
  missionIndex: 0,
  mission: null,          // active mission runtime {def, stage, data}
  missionDone: {},        // id -> true
  taxi: null,             // active taxi job {pickup, drop, fare, timer}
  race: null,             // active race {checkpoints, next, rivals, timer}
  vigilanteTarget: null,
  ownedCars: [],          // garage cars
  weapons: { pistol: { ammo: 120, owned: true }, smg: { ammo: 0, owned: false }, shotgun: { ammo: 0, owned: false }, rifle: { ammo: 0, owned: false } },
  weapon: 'pistol',
  packagesFound: {},
  dialogQueue: [],
  dialogTimer: 0,
  toastTimer: 0,
  missionBanner: { title: '', obj: '', sub: '' },
  saveSlot: 'velora-bay-save-v2',
  testMode: false,
  shotMode: null,
  errors: [],
};

export function newPlayer(x, y) {
  return {
    x, y, angle: -Math.PI / 2, speed: 0, onFoot: true, car: null,
    health: 100, armor: 0, dead: false, sprint: false,
    walkPhase: 0, invuln: 0, muzzle: 0, jumpV: 0, jumpZ: 0,
  };
}

export function resetRunState() {
  S.cash = 250; S.respect = 0; S.wanted = 0; S.wantedHeat = 0;
  S.missionIndex = 0; S.mission = null; S.missionDone = {};
  S.taxi = null; S.race = null; S.vigilanteTarget = null;
  S.ownedCars = []; S.packagesFound = {};
  S.weapons = { pistol: { ammo: 120, owned: true }, smg: { ammo: 0, owned: false }, shotgun: { ammo: 0, owned: false }, rifle: { ammo: 0, owned: false } };
  S.weapon = 'pistol';
  S.stats = { kills: 0, carsStolen: 0, fares: 0, jumps: 0, racesWon: 0, packages: 0, vigilante: 0, missionsDone: 0, shotsFired: 0, distanceDriven: 0 };
  S.dayTime = 8 * 3600; S.weather = 'clear';
}

export function addCash(n) { S.cash = Math.max(0, S.cash + n); return S.cash; }
export function addHeat(n) {
  S.wantedHeat = Math.min(100, S.wantedHeat + n);
  S.lastCrime = S.time;
  updateStars();
}
export function updateStars() {
  const h = S.wantedHeat;
  S.wanted = h < 12 ? 0 : h < 30 ? 1 : h < 50 ? 2 : h < 68 ? 3 : h < 86 ? 4 : 5;
}
export function showToast(text, dur = 3) {
  const el = document.getElementById('toast');
  if (el) { el.textContent = text; }
  S.toastTimer = dur;
}
export function say(who, text, dur = 4.5) {
  S.dialogQueue.push({ who, text });
  S.dialogTimer = Math.max(S.dialogTimer, 0.01);
  if (S.dialogQueue.length === 1) S.dialogTimer = dur;
}
export function logError(where, err) {
  S.errors.push(where + ': ' + (err && err.message ? err.message : String(err)));
  if (S.errors.length > 40) S.errors.shift();
}
export function randomRoadPoint() {
  const n = WORLD.roads, b = WORLD.block;
  const horizontal = Math.random() < 0.5;
  const i = Math.floor(rand(1, n - 1)), j = Math.floor(rand(0, n));
  if (horizontal) return { x: j * b + rand(60, b - 60), y: i * b };
  return { x: i * b, y: j * b + rand(60, b - 60) };
}
