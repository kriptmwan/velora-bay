// Velora Bay — side activities: taxi fares, street races, hidden packages, vigilante jobs.
import { S, WORLD, addCash, addHeat, showToast, say } from './state.js';
import { TAXI_LINES } from './story.js';
import { makeCar } from './vehicles.js';
import { dist, rand, pick, clamp } from './utils.js';
import { sfx } from './audio.js';
import { spawnEnemy } from './combat.js';
import { spawnParticles } from './effects.js';

const B = WORLD.block;
const P = (i, j) => ({ x: i * B + 170, y: j * B + 170 });

export function taxiToggle() {
  const p = S.player;
  if (S.taxi) { cancelTaxi('Job cancelled.'); return; }
  if (!p.car || p.car.model !== 'taxi') {
    showToast('You need a TAXI for fares — steal one (yellow) or buy one at the garage. Press H in a taxi.', 3.5);
    return;
  }
  const pickup = P(Math.floor(rand(0, 11)), Math.floor(rand(0, 11)));
  S.taxi = { pickup, drop: null, fare: 0, timer: 0, state: 'toPickup' };
  showToast('TAXI JOB: pick up the passenger at the green marker', 3);
  say('DISPATCH', 'Fare waiting. Get there, Rex.');
}

export function cancelTaxi(msg) {
  S.taxi = null;
  if (msg) showToast(msg, 2.5);
}

export function updateTaxi(dt) {
  const t = S.taxi;
  if (!t) return;
  const p = S.player;
  t.timer += dt;
  if (t.state === 'toPickup') {
    if (dist(p.x, p.y, t.pickup.x, t.pickup.y) < 80) {
      t.state = 'toDrop';
      t.drop = P(Math.floor(rand(0, 11)), Math.floor(rand(0, 11)));
      t.fare = 60 + Math.floor(dist(t.pickup.x, t.pickup.y, t.drop.x, t.drop.y) / 40);
      showToast('Passenger aboard: "' + pick(TAXI_LINES) + '" — fare $' + t.fare, 3);
      sfx('pickup');
    }
  } else if (t.state === 'toDrop') {
    if (dist(p.x, p.y, t.drop.x, t.drop.y) < 90) {
      const tip = t.timer < 75 ? 25 : 0;
      const total = t.fare + tip;
      addCash(total);
      S.stats.fares++;
      showToast(`Fare complete! +$${total}${tip ? ' (incl. $25 speed tip)' : ''}`, 3);
      sfx('cash');
      S.taxi = null;
    }
    if (t.timer > 180) cancelTaxi('Too slow — the passenger got out and walked.');
  }
}

const RACE_ROUTES = [
  { name: 'Strip Sprint', cps: [P(7, 6), P(9, 6), P(9, 9), P(6, 9), P(6, 6), P(7, 6)] },
  { name: 'Harbor Loop', cps: [P(1, 9), P(1, 6), P(4, 6), P(4, 9), P(2, 9), P(1, 9)] },
  { name: 'Beach Run', cps: [P(2, 1), P(5, 1), P(5, 4), P(2, 4), P(3, 2), P(2, 1)] },
];

export function startRace() {
  const route = RACE_ROUTES[Math.floor(Math.random() * RACE_ROUTES.length)];
  const p = S.player;
  const rivals = [];
  const models = ['sports', 'muscle', 'coupe'];
  for (let i = 0; i < 3; i++) {
    const c = makeCar(models[i], p.x + 60 + i * 30, p.y + (i - 1) * 40, p.angle, { driver: 'rival', color: ['#e84d2e', '#7a3dc9', '#c94d6b'][i] });
    S.cars.push(c);
    rivals.push({ car: c, wp: 0, speed: 0 });
  }
  S.race = { route, cps: route.cps, next: 0, rivals, timer: 0, won: false, lost: false, playerCp: 0 };
  showToast('RACE: ' + route.name + ' — hit all 6 checkpoints before the rivals!', 4);
  say('DANTE', 'Six checkpoints. Do not let Kane\'s boys beat you.');
}

export function updateRace(dt) {
  const r = S.race;
  if (!r || r.won || r.lost) return;
  const p = S.player;
  r.timer += dt;
  const cp = r.cps[r.next];
  if (dist(p.x, p.y, cp.x, cp.y) < 110) {
    r.next++; r.playerCp++;
    sfx('pickup');
    spawnParticles(cp.x, cp.y, 12, '#7dff8a', 120, 0.5, 4);
    if (r.next >= r.cps.length) {
      r.won = true;
      const prize = 600;
      addCash(prize); S.stats.racesWon++;
      showToast('RACE WON! +$' + prize + ' — ' + r.route.name, 4);
      sfx('mission');
      return;
    }
    showToast('Checkpoint ' + r.next + '/' + r.cps.length, 1.5);
  }
  // rivals drive the route
  for (const rv of r.rivals) {
    const c = rv.car;
    if (c.dead) continue;
    const wp = r.cps[rv.wp];
    const d = dist(c.x, c.y, wp.x, wp.y);
    if (d < 60) rv.wp = (rv.wp + 1) % r.cps.length;
    const a = Math.atan2(wp.y - c.y, wp.x - c.x);
    c.angle += clampAngle(c.angle, a, dt);
    c.speed = 330 + Math.sin(S.time + rv.wp) * 40;
    c.x += Math.cos(c.angle) * c.speed * dt;
    c.y += Math.sin(c.angle) * c.speed * dt;
    if (rv.wp >= r.cps.length - 1 && dist(c.x, c.y, r.cps[r.cps.length - 1].x, r.cps[r.cps.length - 1].y) < 110) {
      // a rival finished first
      r.lost = true;
      showToast('A rival finished first — race lost!', 3);
      sfx('fail');
      return;
    }
  }
  if (r.timer > 240) { r.lost = true; showToast('Race timed out!', 3); }
}

function clampAngle(cur, want, dt) {
  let d = want - cur;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.max(-3 * dt, Math.min(3 * dt, d));
}

export function updatePackages() {
  const p = S.player;
  if (!p) return;
  for (const pkg of S.city.packages) {
    if (pkg.found) continue;
    if (dist(p.x, p.y, pkg.x, pkg.y) < 34) {
      pkg.found = true;
      S.packagesFound[pkg.id] = true;
      S.stats.packages++;
      addCash(150);
      showToast(`Hidden package found! (${S.stats.packages}/15) +$150`, 3);
      sfx('cash');
      spawnParticles(pkg.x, pkg.y, 16, '#ffd23f', 140, 0.7, 4);
    }
  }
}

export function vigilanteTick(dt) {
  // spawn a vigilante target every ~90s when free-roaming with no mission
  if (S.vigilanteTarget || S.mission) return;
  if (Math.random() < dt / 90) {
    const spot = P(Math.floor(rand(0, 11)), Math.floor(rand(0, 11)));
    const e = spawnEnemy(spot.x, spot.y, 100, 'vigilante');
    S.vigilanteTarget = { enemy: e, x: spot.x, y: spot.y };
    showToast('VIGILANTE: a Kane thug is causing trouble at the marked spot. Take him down! +$200', 4);
  }
  if (S.vigilanteTarget) {
    const t = S.vigilanteTarget;
    if (t.enemy.dead) {
      addCash(200); S.stats.vigilante++;
      showToast('Vigilante justice! +$200 — the streets are safer.', 3);
      sfx('cash');
      S.vigilanteTarget = null;
    }
  }
}
