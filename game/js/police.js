// police.js — the wanted system and the VCPD response. Cruisers chase and
// ram, roadblocks appear at 3 stars, the helicopter joins at 4 stars, and
// the heat cools off when the player stays out of sight.

import { VEHICLE_DEFS, setWanted, hurtPlayer, showMessage } from "./state.js";
import { clamp, dist } from "./utils.js";
import { spawnVehicle, updateVehiclePhysics, steerToward } from "./vehicles.js";
import { randomRoadPoint } from "./city.js";

export class PoliceSystem {
  constructor(world, game) {
    this.world = world;
    this.game = game;
    this.spawnTimer = 0;
    this.roadblockTimer = 0;
  }

  wantedCount() {
    const w = this.world.player.wanted;
    return Math.min(5, w);
  }

  update(dt) {
    const w = this.world;
    const p = w.player;
    this.spawnTimer -= dt;
    // Heat cools when the player is slow, hidden and far from any cruiser.
    if (p.wanted > 0) {
      const nearestCop = this.nearestCopDist();
      const quiet = Math.abs(p.speed || 0) < 30 && nearestCop > 500;
      if (quiet) {
        p.wantedHeat -= dt * 6;
        if (p.wantedHeat <= 0) {
          p.wanted = 0;
          p.wantedHeat = 0;
          showMessage(w, "You lost the cops. Heat is off.", 3);
        }
      } else {
        p.wantedHeat = Math.min(100, p.wantedHeat + dt * 2);
      }
    }
    // Spawn cruisers up to the wanted level — but only while the player is
    // moving or a cruiser is already close: a still, hidden player is not
    // "seen", so no fresh cruiser materialises on top of them.
    const want = this.wantedCount();
    const playerVisible = Math.abs(p.speed || 0) > 40 || this.nearestCopDist() < 700;
    if (want > 0 && playerVisible && w.police.length < want + 1 && this.spawnTimer <= 0) {
      this.spawnCruiser();
      this.spawnTimer = 2.5;
    }
    // Helicopter at 4+ stars.
    if (p.wanted >= 4 && !w.heli) {
      w.heli = { x: p.x + 300, y: p.y - 300, angle: 0 };
      showMessage(w, "VCPD helicopter overhead! The spotlight is on you.", 3);
    }
    if (p.wanted < 4 && w.heli) w.heli = null;
    if (w.heli) {
      const h = w.heli;
      h.angle += dt * 0.4;
      h.x += (p.x + Math.cos(h.angle) * 320 - h.x) * dt * 0.8;
      h.y += (p.y + Math.sin(h.angle) * 320 - h.y) * dt * 0.8;
    }
    // Roadblocks at 3+ stars, refreshed every few seconds.
    this.roadblockTimer -= dt;
    if (p.wanted >= 3 && this.roadblockTimer <= 0 && w.roadblocks.length < 2) {
      this.spawnRoadblock();
      this.roadblockTimer = 6;
    }
    if (p.wanted < 3) w.roadblocks.length = 0;
    // Chase behaviour: seek the player, ram, and bust them when slow.
    // A cruiser that falls more than 1500 away loses the trail and leaves.
    for (let ci = w.police.length - 1; ci >= 0; ci--) {
      const cop = w.police[ci];
      const dLost = dist(cop.x, cop.y, p.x, p.y);
      if (dLost > 1500) { w.police.splice(ci, 1); continue; }
      steerToward(cop, p.x, p.y, dt);
      const d = dist(cop.x, cop.y, p.x, p.y);
      const control = { throttle: d > 40 ? 1 : 0.4, steer: 0, brake: d < 25 };
      updateVehiclePhysics(w, cop, dt, control);
      // Far off, cruisers cruise instead of sprinting: the player can break away.
      cop.speed = clamp(cop.speed, 0, d > 700 ? 150 : cop.topSpeed);
      if (d < 34 && (!this.game || !this.game.shotScene)) {
        // Ram: damage the player's car or the player, and slow them.
        // (Staged screenshot scenes are cosmetic only: no wreck, no bust.)
        if (p.vehicle) {
          p.vehicle.health -= 6 * dt * 10;
          p.speed *= 0.92;
          if (this.game && this.game.audio) this.game.audio.crash();
        } else {
          hurtPlayer(w, 8 * dt * 10);
        }
        if (Math.abs(p.speed || 0) < 25 && !p.onFoot) {
          // Busted: slow and cornered in a car.
          if (d < 30 && w.police.length >= 2) this.bustPlayer();
        }
        if (!p.onFoot && p.vehicle && p.vehicle.health <= 0) {
          showMessage(w, "Your car is wrecked! Run!", 3);
          if (this.game && this.game.playerController) this.game.playerController.exitVehicle();
        }
      }
    }
    // Despawn cruisers that fell far behind once the heat is gone.
    if (p.wanted === 0) {
      for (let i = w.police.length - 1; i >= 0; i--) {
        if (dist(w.police[i].x, w.police[i].y, p.x, p.y) > 1200) w.police.splice(i, 1);
      }
    }
    if (this.game && this.game.audio) {
      this.game.audio.setSiren(w.police.length > 0);
    }
  }

  nearestCopDist() {
    const w = this.world;
    const p = w.player;
    let best = Infinity;
    for (const cop of w.police) best = Math.min(best, dist(cop.x, cop.y, p.x, p.y));
    return best;
  }

  spawnCruiser() {
    const w = this.world;
    const p = w.player;
    const pt = randomRoadPoint(w.rng);
    const cop = spawnVehicle(w, "police", pt.x, pt.y, 0);
    cop.driver = "police";
    // Move it out of the parked pool and into the police list.
    const idx = w.vehicles.indexOf(cop);
    if (idx >= 0) w.vehicles.splice(idx, 1);
    cop.x = clamp(p.x + (w.rng() < 0.5 ? -1 : 1) * (350 + w.rng() * 300), 100, 3100);
    cop.y = clamp(p.y + (w.rng() < 0.5 ? -1 : 1) * (350 + w.rng() * 300), 100, 3100);
    w.police.push(cop);
    return cop;
  }

  spawnRoadblock() {
    const w = this.world;
    const p = w.player;
    const ahead = p.angle;
    const bx = p.x + Math.cos(ahead) * 420;
    const by = p.y + Math.sin(ahead) * 420;
    w.roadblocks.push({ x: clamp(bx, 120, 3080), y: clamp(by, 120, 3080), angle: ahead + Math.PI / 2 });
    showMessage(w, "Roadblock ahead! Find another way around.", 3);
  }

  raiseWanted(stars) {
    const w = this.world;
    setWanted(w, Math.max(w.player.wanted, stars));
  }

  bustPlayer() {
    const w = this.world;
    const p = w.player;
    if (w.gameOver) return;
    w.gameOver = "busted";
    p.cash = Math.max(0, p.cash - 200);
    showMessage(w, "BUSTED! The VCPD took $200 and your car.", 4);
  }

  respawnAtHospital() {
    const w = this.world;
    const p = w.player;
    p.x = 500;
    p.y = 2500;
    p.health = 100;
    p.armor = 0;
    p.wanted = 0;
    p.wantedHeat = 0;
    p.onFoot = true;
    p.vehicle = null;
    p.speed = 0;
    w.police.length = 0;
    w.heli = null;
    w.roadblocks.length = 0;
    w.gameOver = null;
    w.objective = "You woke up at St. Maria Hospital. Get back out there.";
  }
}
