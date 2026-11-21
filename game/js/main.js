// Velora Bay — bootstrap, main loop, screenshot staging, self-test.
import { S, WORLD, newPlayer, updateStars, addHeat } from './state.js';
import { generateCity } from './city.js';
import { setupInput } from './input.js';
import { initHud, updateHud } from './hud.js';
import { initMenus } from './menus.js';
import { render } from './render.js';
import { updateCamera, screenToWorld } from './camera.js';
import { updatePlayer } from './player.js';
import { updateDriving } from './driving.js';
import { spawnTraffic, spawnParked, updateTraffic } from './traffic.js';
import { spawnPeds, updatePeds } from './pedestrians.js';
import { updateWanted, updateCops } from './police.js';
import { updateCombat, updateBullets } from './combat.js';
import { updateMission, startMission, currentMissionDef, onEnemyKilled } from './missions.js';
import { updateTaxi, updateRace, updatePackages, vigilanteTick, taxiToggle, startRace } from './side.js';
import { garageAction, phoneAction, nearestShop } from './shops.js';
import { updateEffects } from './effects.js';
import { updateWeather } from './weather.js';
import { updateEngineSound, initAudio, resumeAudio } from './audio.js';
import { showMissionList } from './menus.js';
import { saveGame, loadGame } from './save.js';
import { makeCar } from './vehicles.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const VW = 1280, VH = 800;

window.addEventListener('error', (e) => {
  S.errors.push('window: ' + e.message);
  const tl = document.getElementById('testlog');
  if (tl) tl.textContent += '\nERROR: ' + e.message;
});

function boot() {
  S.city = generateCity();
  const cafe = S.city.landmarks.find(l => l.id === 'cafe');
  S.player = newPlayer(cafe.x + 60, cafe.y + 60);
  S.camera.x = S.player.x; S.camera.y = S.player.y;
  spawnTraffic(30);
  spawnParked(26);
  spawnPeds(70);
  // a starter sedan parked by the cafe
  const starter = makeCar('sedan', cafe.x + 120, cafe.y + 90, 0, { parked: true, color: '#0e7a6b' });
  S.cars.push(starter);
  setupInput(canvas);
  initHud();
  initMenus();
  wireHooks();
  const params = new URLSearchParams(location.search);
  S.shotMode = params.get('shot');
  S.testMode = params.get('selftest') === '1';
  if (S.shotMode) stageShot(S.shotMode);
  if (S.testMode) setupSelfTest();
  requestAnimationFrame(loop);
  window.__velora = { S };
  window.__gameReady = true;
}

function wireHooks() {
  window.__veloraTaxiToggle = taxiToggle;
  window.__veloraGarage = garageAction;
  window.__veloraPhone = phoneAction;
  window.__veloraMissionList = showMissionList;
  window.__veloraStartRace = startRace;
  window.__veloraEnemyKilled = onEnemyKilled;
  window.__veloraNearestShop = nearestShop;
}

let lastT = performance.now();
function loop(now) {
  requestAnimationFrame(loop);
  let dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  S.time += dt;
  try {
    // staged screenshots: keep the hero car rolling so the speedo and chase read live
    if (S.shotMode && (S.shotMode === 'chase' || S.shotMode === 'mission' || S.shotMode === 'night')) {
      if (S.player && !S.player.onFoot && S.player.car) S.keys['w'] = true;
    }
    if (S.mode === 'play') update(dt);
    else if (S.mode === 'menu') updateAmbient(dt);
    // mouse world position
    const w = screenToWorld(S.mouse.x, S.mouse.y, VW, VH);
    S.mouse.wx = w.x; S.mouse.wy = w.y;
    if (S.testMode) selfTestTick(dt);
    updateCamera(dt, VW, VH);
    render(ctx, VW, VH);
    updateHud();
  } catch (err) {
    S.errors.push('loop: ' + err.message);
    const tl = document.getElementById('testlog');
    if (tl) tl.textContent += '\nLOOP ERROR: ' + err.message;
  }
}

function update(dt) {
  updateWeather(dt);
  updatePlayer(dt);
  updateDriving(dt);
  updateTraffic(dt);
  updatePeds(dt);
  updateWanted(dt);
  updateCops(dt);
  updateCombat(dt);
  updateBullets(dt);
  updateMission(dt);
  updateTaxi(dt);
  updateRace(dt);
  updatePackages();
  vigilanteTick(dt);
  updateEffects(dt);
  const p = S.player;
  updateEngineSound(p && p.car ? p.car.speed : 0, p && p.car ? p.car.def.max : 1);
}

function updateAmbient(dt) {
  // living backdrop behind the start menu
  updateWeather(dt);
  updateTraffic(dt);
  updatePeds(dt);
  updateEffects(dt);
  S.camera.x += Math.sin(S.time * 0.05) * 12 * dt;
  S.camera.y += Math.cos(S.time * 0.04) * 10 * dt;
}

// ---------- screenshot staging: real game state, no image editing ----------
function stageShot(kind) {
  const B = WORLD.block;
  const P = (i, j) => ({ x: i * B + 170, y: j * B + 170 });
  document.getElementById('startmenu').classList.add('hidden');
  S.mode = 'play';
  initAudio();
  const p = S.player;
  const putCar = (model, x, y, angle, color) => {
    const c = makeCar(model, x, y, angle, { color });
    c.driver = 'player';
    S.cars.push(c);
    p.car = c; p.onFoot = false; p.x = x; p.y = y; p.angle = angle;
    return c;
  };
  const addCop = (x, y, angle) => {
    const c = makeCar('police', x, y, angle, { cop: true, driver: 'cop' });
    c.siren = true; c.speed = 380;
    S.cars.push(c); S.cops.push(c);
    return c;
  };
  const addTrafficNear = (cx, cy, n) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 220 + Math.random() * 420; // keep clear of the hero
      const x = Math.max(80, Math.min(WORLD.size - 80, cx + Math.cos(a) * d));
      const y = Math.max(80, Math.min(WORLD.size - 80, cy + Math.sin(a) * d));
      const c = makeCar(['sedan', 'coupe', 'taxi', 'van', 'suv', 'pickup'][i % 6], x, y, Math.random() * Math.PI * 2, { traffic: true, driver: 'traffic' });
      c.ix = Math.round(x / B); c.iy = Math.round(y / B); c.dir = i % 4; c.speed = 140;
      S.cars.push(c);
    }
  };
  if (kind === 'chase') {
    // hero car on the east-west road through Downtown, heading east at speed
    const car = putCar('sports', 1500, 5 * B, 0, '#e84d2e');
    car.speed = 420;
    const at = { x: 1500, y: 5 * B };
    S.dayTime = 17.5 * 3600; // golden hour
    S.weather = 'clear';
    S.wantedHeat = 72; updateStars();
    addCop(at.x - 260, at.y + 60, 0.2);
    addCop(at.x - 180, at.y - 140, 0.5);
    addCop(at.x + 320, at.y + 120, Math.PI);
    addCop(at.x + 420, at.y - 80, Math.PI - 0.3);
    addTrafficNear(at.x, at.y, 8);
    startMission(5); // m6 GETAWAY DRIVER
    S.mission.stage = 1;
    S.wantedHeat = 72; updateStars();
  } else if (kind === 'street') {
    const at = P(8, 7); // Neon Strip
    // on foot on the sidewalk corner, clear of traffic
    p.x = at.x + 90; p.y = at.y + 90; p.onFoot = true; p.car = null;
    S.dayTime = 11 * 3600;
    S.weather = 'clear';
    S.wantedHeat = 0; updateStars();
    addTrafficNear(at.x, at.y, 10);
    for (let i = 0; i < 14; i++) {
      S.peds.push({ x: at.x + (Math.random() - 0.5) * 500, y: at.y + (Math.random() - 0.5) * 500, angle: Math.random() * 6.28, speed: 40, walkPhase: Math.random() * 6, fleeing: false, skin: '#e8b88a', shirt: ['#c94d4d', '#4d7ac9', '#7ac94d'][i % 3], pants: '#2e3d5c', talk: null, talkTimer: 0, panic: 0, dead: false, hp: 100 });
    }
    startMission(0);
  } else if (kind === 'mission') {
    // getaway from the Meridian Bank, east along the road
    const car = putCar('sedan', 1400, 5 * B, 0, '#c94d4d');
    car.speed = 300;
    const at = { x: 1400, y: 5 * B };
    S.dayTime = 13 * 3600;
    S.weather = 'cloudy';
    S.wantedHeat = 38; updateStars();
    addCop(at.x - 300, at.y + 100, 0.3);
    addCop(at.x + 360, at.y - 120, Math.PI);
    addTrafficNear(at.x, at.y, 6);
    startMission(5);
    S.mission.stage = 1; // already mid-getaway: lose the cops, reach the safehouse
  } else if (kind === 'night') {
    // neon Strip at night, east along the road
    const car = putCar('muscle', 2300, 7 * B, 0, '#7a3dc9');
    car.speed = 260;
    const at = { x: 2300, y: 7 * B };
    S.dayTime = 22 * 3600;
    S.weather = 'rain';
    S.wantedHeat = 22; updateStars();
    addCop(at.x - 280, at.y - 60, 0.4);
    addTrafficNear(at.x, at.y, 9);
    startMission(3);
  }
  S.camera.x = p.x; S.camera.y = p.y;
  window.__shotReady = true;
}

// ---------- headless self-test (?selftest=1) ----------
// Runs synchronously in fixed steps (no reliance on rAF timing under virtual time).
let testResults = [];

function setupSelfTest() {
  document.getElementById('startmenu').classList.add('hidden');
  S.mode = 'play';
  const log = (name, ok, detail = '') => {
    testResults.push({ name, ok, detail });
    const tl = document.getElementById('testlog');
    if (tl) tl.textContent += `\n${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`;
  };
  setTimeout(() => {
    try { runSelfTestSync(log); } catch (err) {
      log('selftest-run', false, err.message);
    }
    const fails = testResults.filter(r => !r.ok);
    const summary = `SELFTEST ${testResults.length - fails.length}/${testResults.length} passed, errors=${S.errors.length}`;
    const tl = document.getElementById('testlog');
    if (tl) tl.textContent += '\n' + summary;
    document.title = summary;
    window.__selftestDone = true;
  }, 300);
}

function step(n) { for (let i = 0; i < n; i++) update(1 / 60); }

function runSelfTestSync(log) {
  const p = S.player;
  p.invuln = 1e9; // test god-mode: cops/enemies cannot kill the test player
  log('boot-no-errors', S.errors.length === 0, S.errors.join(';') || 'clean');
  log('world-built', !!S.city && S.city.buildings.length > 100, S.city.buildings.length + ' buildings, ' + S.city.shops.length + ' shops, ' + S.city.packages.length + ' packages');
  log('traffic-spawned', S.cars.length >= 40, S.cars.length + ' cars');
  log('peds-spawned', S.peds.length >= 50, S.peds.length + ' peds');
  // shoot on foot
  S.mouse.wx = p.x + 100; S.mouse.wy = p.y; S.mouse.down = true;
  step(40);
  S.mouse.down = false;
  log('shoot-fires', S.stats.shotsFired > 0, 'shots=' + S.stats.shotsFired);
  // enter a car: teleport to the starter sedan and press E
  const parked = S.cars.find(x => x.parked);
  p.x = parked.x + 10; p.y = parked.y + 10;
  S.keys['e'] = true; step(3); S.keys['e'] = false; step(3);
  log('enter-car', !p.onFoot && !!p.car, p.car ? p.car.def.name : 'on foot');
  // drive
  S.keys['w'] = true; step(180); S.keys['w'] = false;
  log('drive-moves', S.stats.distanceDriven > 100, 'dist=' + Math.round(S.stats.distanceDriven) + ' speed=' + Math.round(p.car ? p.car.speed : 0));
  // wanted escalation while in the car
  addHeat(60);
  step(150);
  log('wanted-spawns-cops', S.wanted >= 3 && S.cops.length >= 2, S.wanted + ' stars, ' + S.cops.length + ' cops');
  addHeat(30); // push to 5 stars
  step(60);
  log('heli-at-4plus-stars', !!S.heli, S.heli ? 'heli inbound' : 'no heli');
  // clear heat for the mission flow
  S.wantedHeat = 0; updateStars();
  S.cops.forEach(c => { c.givingUp = true; });
  step(30);
  // mission 1: get in a taxi at the cafe, then teleport through its drive stages
  const cafe = S.city.landmarks.find(l => l.id === 'cafe');
  const taxi = makeCar('taxi', cafe.x + 40, cafe.y + 40, 0, {});
  taxi.driver = 'player'; S.cars.push(taxi);
  p.car = taxi; p.onFoot = false; p.x = taxi.x; p.y = taxi.y;
  startMission(0);
  log('mission-starts', !!S.mission && S.mission.def.id === 'm1', S.mission ? S.mission.def.title : 'none');
  step(5);
  const st0 = S.mission.def.stages[0];
  p.x = st0.at.x; p.y = st0.at.y; if (p.car) { p.car.x = p.x; p.car.y = p.y; } step(5);
  log('mission-stage-advances', S.mission && S.mission.stage >= 1, 'stage=' + (S.mission ? S.mission.stage : 'null'));
  for (let k = 0; k < 4 && S.mission; k++) {
    const st = S.mission.def.stages[S.mission.stage];
    if (!st || !st.at) break;
    p.x = st.at.x; p.y = st.at.y;
    if (p.car) { p.car.x = st.at.x; p.car.y = st.at.y; }
    step(5);
  }
  log('mission-1-completes', !!S.missionDone['m1'], 'done=' + Object.keys(S.missionDone).join(','));
  // mission 4 kill stage: spawn and eliminate enemies
  startMission(3);
  step(5);
  const m4 = S.mission;
  log('mission-4-spawns-enemies', !!m4 && S.enemies.filter(e => !e.dead).length >= 3, S.enemies.filter(e => !e.dead).length + ' alive');
  for (const e of [...S.enemies]) { e.hp = 0; e.dead = true; window.__veloraEnemyKilled && window.__veloraEnemyKilled(e); }
  step(5);
  log('mission-4-completes', !!S.missionDone['m4'], 'done=' + Object.keys(S.missionDone).join(','));
  // taxi side job
  const t2 = makeCar('taxi', p.x, p.y, 0, {});
  t2.driver = 'player'; S.cars.push(t2);
  p.car = t2; p.onFoot = false; p.x = t2.x; p.y = t2.y;
  taxiToggle();
  log('taxi-starts', !!S.taxi, S.taxi ? S.taxi.state : 'none');
  if (S.taxi) { p.x = S.taxi.pickup.x; p.y = S.taxi.pickup.y; p.car.x = p.x; p.car.y = p.y; step(5); }
  log('taxi-pickup', !!S.taxi && S.taxi.state === 'toDrop', S.taxi ? S.taxi.state : 'none');
  if (S.taxi) { p.x = S.taxi.drop.x; p.y = S.taxi.drop.y; p.car.x = p.x; p.car.y = p.y; step(5); }
  log('taxi-completes', S.stats.fares >= 1, 'fares=' + S.stats.fares);
  // package pickup
  const pkg = S.city.packages.find(q => !q.found);
  p.x = pkg.x; p.y = pkg.y; if (p.car) { p.car.x = p.x; p.car.y = p.y; } step(3);
  log('package-pickup', S.stats.packages >= 1, 'packages=' + S.stats.packages);
  // save / load
  const okSave = saveGame();
  S.cash = 99999;
  const okLoad = loadGame();
  log('save-load', okSave && okLoad && S.cash !== 99999, 'cash=' + Math.round(S.cash));
  // HUD + minimap alive
  log('hud-alive', !!document.getElementById('stars') && !!document.getElementById('minimap'), '');
  log('no-runtime-errors', S.errors.length === 0, S.errors.join(';') || 'clean');
}

function selfTestTick(dt) { /* synchronous test; nothing per-frame */ }

boot();
