// side.js — everything outside the story: taxi fares, three street races,
// stunt jumps, fifteen hidden packages and vigilante jobs. Each one pays
// cash and feeds the same HUD objective line.

import { addCash, showMessage, showBanner } from "./state.js";
import { dist } from "./utils.js";
import { RACE_ROUTES, randomRoadPoint } from "./city.js";

export class SideActivities {
  constructor(world, game) {
    this.world = world;
    this.game = game;
  }

  // --- Taxi fares: pick up the passenger, drop them off, get paid. ---
  startFare() {
    const w = this.world;
    if (w.taxi.active) return false;
    const from = randomRoadPoint(w.rng);
    const to = randomRoadPoint(w.rng);
    const fare = 60 + Math.floor(w.rng() * 140);
    w.taxi.active = true;
    w.taxi.fare = { from, to, pay: fare, state: "pickup" };
    w.taxi.timer = 0;
    w.objective = "Taxi fare: pick up the passenger.";
    showBanner(w, "TAXI FARE — pick up the passenger ($" + fare + ")", 4);
    return true;
  }

  updateTaxi(dt) {
    const w = this.world;
    if (!w.taxi.active || !w.taxi.fare) return;
    const f = w.taxi.fare;
    const p = w.player;
    w.taxi.timer += dt;
    if (f.state === "pickup") {
      if (dist(p.x, p.y, f.from.x, f.from.y) < 80) {
        f.state = "dropoff";
        w.objective = "Taxi fare: drive the passenger to the destination.";
        showMessage(w, "Passenger aboard. Drive them to the marker.", 3);
      }
    } else if (dist(p.x, p.y, f.to.x, f.to.y) < 90) {
      const tip = Math.max(0, 40 - Math.floor(w.taxi.timer / 10) * 5);
      const total = f.pay + tip;
      addCash(w, total);
      w.stats.faresDone++;
      w.taxi.active = false;
      w.taxi.fare = null;
      w.objective = "Fare complete. Press T near a road for another.";
      showBanner(w, "FARE COMPLETE — +$" + total + (tip > 0 ? " (incl. $" + tip + " tip)" : ""), 4);
      if (this.game && this.game.audio) this.game.audio.cash();
    }
    if (w.taxi.timer > 240) {
      w.taxi.active = false;
      w.taxi.fare = null;
      showMessage(w, "The passenger gave up waiting. Fare cancelled.", 3);
    }
  }

  taxiMarker() {
    const w = this.world;
    if (!w.taxi.active || !w.taxi.fare) return null;
    const f = w.taxi.fare;
    return f.state === "pickup" ? { x: f.from.x, y: f.from.y } : { x: f.to.x, y: f.to.y };
  }

  // --- Street races: three routes, checkpoints in order, best times kept. ---
  startRace(routeId) {
    const w = this.world;
    const route = RACE_ROUTES.find((r) => r.id === routeId) || RACE_ROUTES[0];
    if (w.race.active) return false;
    w.race.active = true;
    w.race.route = route;
    w.race.checkpoint = 0;
    w.race.lap = 1;
    w.race.timer = 0;
    w.objective = route.name + ": hit the checkpoints in order.";
    showBanner(w, route.name + " — race the checkpoints!", 4);
    return true;
  }

  raceMarker() {
    const w = this.world;
    if (!w.race.active || !w.race.route) return null;
    const pt = w.race.route.points[w.race.checkpoint % w.race.route.points.length];
    return { x: pt[0], y: pt[1] };
  }

  updateRace(dt) {
    const w = this.world;
    if (!w.race.active || !w.race.route) return;
    const p = w.player;
    w.race.timer += dt;
    const m = this.raceMarker();
    if (m && dist(p.x, p.y, m.x, m.y) < 100) {
      w.race.checkpoint++;
      if (w.race.checkpoint >= w.race.route.points.length) {
        w.race.checkpoint = 0;
        w.race.lap++;
        if (w.race.lap > w.race.route.laps) {
          this.finishRace();
          return;
        }
        showMessage(w, "Lap " + w.race.lap + " — keep pushing!", 2);
      } else {
        showMessage(w, "Checkpoint " + w.race.checkpoint + "/" + w.race.route.points.length, 1.5);
      }
    }
    if (w.race.timer > 300) {
      w.race.active = false;
      showMessage(w, "Race abandoned — too slow.", 3);
    }
  }

  finishRace() {
    const w = this.world;
    const route = w.race.route;
    const t = w.race.timer;
    const best = w.race.best[route.id];
    const isBest = !best || t < best;
    if (isBest) w.race.best[route.id] = t;
    const prize = 400 + Math.floor(Math.max(0, 120 - t) * 5);
    addCash(w, prize);
    w.stats.racesWon++;
    w.race.active = false;
    showBanner(w, "RACE WON — " + route.name + " in " + t.toFixed(1) + "s  +$" + prize, 5);
    if (this.game && this.game.audio) this.game.audio.missionPass();
  }

  // --- Hidden packages: 15 across the city, $150 each, one near the pier glows. ---
  updatePackages() {
    const w = this.world;
    const p = w.player;
    for (const pk of w.packages) {
      if (!pk.taken && dist(p.x, p.y, pk.x, pk.y) < 36) {
        pk.taken = true;
        w.stats.packagesFound++;
        addCash(w, 150);
        showMessage(w, "Hidden package found! (" + w.stats.packagesFound + "/15) +$150", 3);
        if (this.game && this.game.audio) this.game.audio.pickup();
      }
    }
  }

  // --- Vigilante: hunt a marked Syndicate car before the timer runs out. ---
  startVigilante() {
    const w = this.world;
    if (w.vigilante.active) return false;
    const pt = randomRoadPoint(w.rng);
    w.vigilante.active = true;
    w.vigilante.target = { x: pt.x, y: pt.y };
    w.vigilante.timer = 90;
    w.objective = "Vigilante: stop the Syndicate car at the marker.";
    showBanner(w, "VIGILANTE — stop the marked car in 90 seconds!", 4);
    return true;
  }

  updateVigilante(dt) {
    const w = this.world;
    if (!w.vigilante.active) return;
    const p = w.player;
    w.vigilante.timer -= dt;
    if (dist(p.x, p.y, w.vigilante.target.x, w.vigilante.target.y) < 80) {
      w.vigilante.active = false;
      w.vigilante.done++;
      addCash(w, 350);
      showMessage(w, "Vigilante job done. +$350 — the streets notice.", 3);
      if (this.game && this.game.audio) this.game.audio.cash();
    } else if (w.vigilante.timer <= 0) {
      w.vigilante.active = false;
      showMessage(w, "The Syndicate car got away.", 3);
    }
  }
}
