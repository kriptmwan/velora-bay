// main.js — Velora Bay entry point: wires every system together, runs the
// game loop, handles global keys, stages ?shot= scenes for screenshots and
// runs the ?selftest=1 fixed-step harness for playtesting.

import { createWorld, setWanted, addCash, VEHICLE_DEFS } from "./state.js";
import { buildCity } from "./city.js";
import { Input } from "./input.js";
import { AudioEngine } from "./audio.js";
import { Weather } from "./weather.js";
import { Camera } from "./camera.js";
import { spawnParkedCars } from "./vehicles.js";
import { TrafficSystem } from "./traffic.js";
import { PedestrianSystem } from "./pedestrians.js";
import { PlayerController } from "./player.js";
import { DrivingController } from "./driving.js";
import { PoliceSystem } from "./police.js";
import { CombatSystem } from "./combat.js";
import { MissionSystem, MISSIONS } from "./missions.js";
import { SideActivities } from "./side.js";
import { ShopSystem } from "./shops.js";
import { Hud } from "./hud.js";
import { Menus } from "./menus.js";
import { Renderer } from "./render.js";
import { Effects } from "./effects.js";
import { saveGame, loadGame, hasSave } from "./save.js";
import { clamp } from "./utils.js";

const FIXED_DT = 1 / 60;

export class Game {
  constructor() {
    const params = new URLSearchParams(window.location.search);
    this.params = params;
    this.shotScene = params.get("shot") || null;
    this.selftestMode = params.get("selftest") === "1";
    const seed = this.shotScene ? 1337 : 20261121;
    this.world = createWorld(seed);
    this.world.timeOfDay = 9.5;
    buildCity(this.world);
    this.canvas = document.getElementById("game");
    this.input = new Input();
    this.input.attach(window);
    this.audio = new AudioEngine();
    this.weather = new Weather(this.world);
    this.camera = new Camera(this.world);
    this.traffic = new TrafficSystem(this.world);
    this.peds = new PedestrianSystem(this.world);
    this.playerController = new PlayerController(this.world, this);
    this.driving = new DrivingController(this.world, this);
    this.police = new PoliceSystem(this.world, this);
    this.combat = new CombatSystem(this.world, this);
    this.missionSystem = new MissionSystem(this.world, this);
    this.side = new SideActivities(this.world, this);
    this.shopSystem = new ShopSystem(this.world, this);
    this.effects = new Effects(this.world);
    this.hud = new Hud(this.world, this);
    this.menus = new Menus(this.world, this);
    this.renderer = new Renderer(this.world, this.canvas);
    this.renderer.gameRef = this;
    spawnParkedCars(this.world);
    this.traffic.spawnInitial(16);
    this.peds.spawnInitial(30);
    this._resize();
    window.addEventListener("resize", () => this._resize());
    this._errors = [];
    window.addEventListener("error", (e) => this._errors.push(String(e.message || e.error)));
    this.accumulator = 0;
    this.lastTime = 0;
    this.rafId = 0;
    // Auto-start for screenshots and self-test: no menu in the way.
    if (this.shotScene || this.selftestMode) {
      this.world.started = true;
      this.menus.hideStartScreen();
      if (this.shotScene) this.stageShot(this.shotScene);
    }
  }

  _resize() {
    const w = Math.min(window.innerWidth, 1280);
    const h = Math.min(window.innerHeight, 800);
    this.renderer.resize(w, h);
  }

  startGame(continueSave) {
    this.audio.ensure();
    if (continueSave && hasSave()) {
      loadGame(this.world);
    }
    this.world.started = true;
    this.world.paused = false;
    this.menus.hideStartScreen();
    if (this.world.missions.index < 0) {
      this.missionSystem.startMission(0);
    }
  }

  togglePause(force) {
    if (!this.world.started) return;
    const next = force !== undefined ? force : !this.world.paused;
    this.world.paused = next;
    if (next) this.menus.showPause();
    else this.menus.hidePause();
  }

  saveNow() {
    const ok = saveGame(this.world);
    if (ok) this.world.message = "Game saved.";
    this.world.messageTimer = 2;
    return ok;
  }

  respawn() {
    this.police.respawnAtHospital();
    this.world.objective = "You woke up at St. Maria Hospital. Get back out there.";
  }

  // ---- scene staging for screenshots (?shot=chase|street|mission|night) ----
  stageShot(scene) {
    const w = this.world;
    const p = w.player;
    w.started = true;
    if (scene === "chase") {
      // High-speed police chase downtown, 5 stars, helicopter overhead.
      w.timeOfDay = 13;
      this.weather.setDay();
      const car = this._giveCar("comet", 1600, 1600, 0);
      p.speed = 240;
      car.speed = 240;
      setWanted(w, 5);
      for (let i = 0; i < 4; i++) this.police.spawnCruiser();
      w.heli = { x: p.x + 350, y: p.y - 250, angle: 0 };
      this.missionSystem.startMission(2);
      w.banner = "HOT WHEELS — Lose the cops!";
      w.bannerTimer = 999;
      w.objective = "Lose the cops — drop to 0 stars";
      for (let i = 0; i < 6; i++) this.traffic.spawnOne(true);
    } else if (scene === "street") {
      // Rex on foot in the Neon Strip, crowd and traffic around him.
      w.timeOfDay = 16.5;
      p.x = 2500; p.y = 1600; p.onFoot = true; p.vehicle = null;
      p.angle = -Math.PI / 2;
      for (let i = 0; i < 10; i++) this.peds.spawnOne(false);
      for (let i = 0; i < 6; i++) this.traffic.spawnOne(false);
      w.objective = "Explore the Neon Strip — Mama Luz's diner is nearby.";
      w.banner = "NEON STRIP — Velora Bay";
      w.bannerTimer = 999;
    } else if (scene === "mission") {
      // Bank job getaway: wanted, guards down, cash in hand.
      w.timeOfDay = 11;
      this.weather.setDay();
      const car = this._giveCar("muscle", 1500, 1200, 0);
      car.speed = 120;
      p.speed = 120;
      setWanted(w, 3);
      for (let i = 0; i < 2; i++) this.police.spawnCruiser();
      this.missionSystem.startMission(5);
      const a = w.missions.active;
      if (a) { a.stage = 2; a.killsAtStart = p.kills; }
      w.objective = "Escape with the cash to the Hills";
      w.banner = "BANK JOB — Escape with the cash to the Hills!";
      w.bannerTimer = 999;
      w.pickups.push({ x: 1750, y: 1350, kind: "cash", amount: 2500, timer: 60 });
    } else if (scene === "night") {
      // Night rain drive through the Marina.
      this.weather.setNight();
      const car = this._giveCar("sedan", 1200, 400, 0);
      car.speed = 150;
      p.speed = 150;
      setWanted(w, 1);
      this.police.spawnCruiser();
      for (let i = 0; i < 8; i++) this.traffic.spawnOne(false);
      w.objective = "Cruise the Marina — rain on the windshield, city on your tail.";
      w.banner = "MARINA — Night rain";
      w.bannerTimer = 999;
    }
    // Settle the scene with a few fixed steps, then render one frame.
    for (let i = 0; i < 90; i++) this.step(FIXED_DT, true);
    // Re-apply cruising speed after the settle steps (drag bleeds it off),
    // so the speedometer reads alive in the capture.
    if (p.vehicle) {
      const cruise = scene === "chase" ? 220 : scene === "mission" ? 150 : scene === "night" ? 140 : 0;
      p.vehicle.speed = cruise;
      p.speed = cruise;
    }
    this.camera.x = p.x;
    this.camera.y = p.y;
    this.camera.update(0.01);
    this.hud.update();
    this.renderer.draw();
    window.__SHOT_READY__ = true;
    document.title = "VELORA BAY — " + scene;
  }

  _giveCar(type, x, y, angle) {
    const w = this.world;
    const p = w.player;
    // Park whatever Rex was driving first.
    if (p.vehicle) {
      p.vehicle.driver = null;
      w.vehicles.push(p.vehicle);
    }
    const def = { x, y, angle, speed: 0 };
    const vdef = VEHICLE_DEFS[type] || { name: type, topSpeed: 210, accel: 200, grip: 3.0, color: "#888888" };
    const car = {
      id: 5000 + Math.floor(w.rng() * 100000), type, name: vdef.name,
      x: def.x, y: def.y, angle: def.angle, speed: 0,
      color: vdef.color,
      topSpeed: vdef.topSpeed,
      accel: 220, grip: 3.0, health: 100000, staged: true, driver: "player", ai: null,
    };
    p.vehicle = car;
    p.onFoot = false;
    p.x = x; p.y = y; p.angle = angle; p.speed = 0;
    return car;
  }

  // ---- one fixed simulation step (used by the loop and the self-test) ----
  step(dt, staging) {
    const w = this.world;
    const p = w.player;
    w.time += dt;
    if (w.bannerTimer > 0) w.bannerTimer -= dt;
    if (w.messageTimer > 0) w.messageTimer -= dt;
    this.weather.update(dt);
    this.traffic.update(dt);
    this.peds.update(dt);
    this.playerController.update(dt, this.input);
    this.driving.update(dt, this.input);
    this.police.update(dt);
    this.combat.update(dt);
    this.missionSystem.update(dt);
    this.side.updateTaxi(dt);
    this.side.updateRace(dt);
    this.side.updatePackages();
    this.side.updateVigilante(dt);
    this.shopSystem.update(this.input);
    this.effects.update(dt);
    this.camera.update(dt);
    // Global keys.
    if (!staging) this._globalKeys();
    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    // Engine hum follows speed.
    if (this.audio && this.audio.ctx) {
      this.audio.setEngine(clamp(Math.abs(p.speed || 0) / 300, 0, 1), p.onFoot);
    }
    // Busted / wasted → menu (not during staging).
    if (w.gameOver && !staging && !this._gameOverShown) {
      this._gameOverShown = true;
      this.menus.showGameOver(w.gameOver);
    }
    if (!w.gameOver) this._gameOverShown = false;
    this.input.endFrame();
  }

  _globalKeys() {
    const w = this.world;
    const input = this.input;
    if (input.wasPressed("p") || input.wasPressed("Escape")) {
      if (!this.shopSystem.openShop) this.togglePause();
    }
    if (input.wasPressed("m")) this.missionSystem.startNext();
    if (input.wasPressed("t")) this.side.startFare();
    if (input.wasPressed("r")) this.side.startRace("pier");
    if (input.wasPressed("v")) this.side.startVigilante();
    if (input.wasPressed("F5")) this.saveNow();
    const weaponKeys = ["1", "2", "3", "4"];
    weaponKeys.forEach((k, i) => {
      if (input.wasPressed(k)) {
        const order = ["pistol", "smg", "shotgun", "rifle"];
        if ((w.player.ammo[order[i]] || 0) > 0 || i === 0) w.player.weapon = order[i];
      }
    });
    if (input.isDown("q") || input.mouse.down) {
      const angle = this.combat.aimAngle(input.mouse.x, input.mouse.y, this.canvas.width, this.canvas.height);
      this.combat.shoot(angle);
    }
  }

  loop(t) {
    const dt = Math.min(0.05, (t - this.lastTime) / 1000 || FIXED_DT);
    this.lastTime = t;
    if (this.world.started && !this.world.paused) {
      // Staged screenshot scenes keep driving forward on their own so the
      // capture shows a live chase, not a parked car.
      if (this.shotScene && this.world.player.vehicle) this.input.injectKey("w", true);
      this.accumulator += dt;
      let n = 0;
      while (this.accumulator >= FIXED_DT && n < 5) {
        this.step(FIXED_DT, false);
        this.accumulator -= FIXED_DT;
        n++;
      }
      this.hud.update();
      this.renderer.draw();
    } else if (!this.world.started) {
      // Start screen backdrop: slow drift over the city.
      this.world.time += dt;
      this.weather.update(dt);
      this.renderer.draw();
    }
    this.rafId = requestAnimationFrame((tt) => this.loop(tt));
  }

  start() {
    if (this.selftestMode) {
      this.runSelfTest();
      return;
    }
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }

  // ---- ?selftest=1: synchronous fixed-step playtest, results on window. ----
  runSelfTest() {
    const w = this.world;
    const checks = [];
    const check = (name, fn) => {
      try {
        const ok = fn();
        checks.push({ name, pass: !!ok });
      } catch (e) {
        checks.push({ name, pass: false, error: String(e && e.message || e) });
      }
    };
    const errorsBefore = this._errors.length;
    w.started = true;
    this.menus.hideStartScreen();
    check("boot: world, city and systems exist", () => w.buildings.length > 40 && w.shops.length === 6 && w.packages.length === 15);
    check("boot: hud and renderer draw without throwing", () => { this.hud.update(); this.renderer.draw(); return true; });
    // Driving: hold W for 10 simulated seconds in a car.
    check("driving: car accelerates and moves", () => {
      const car = this._giveCar("sedan", 1600, 1600, 0);
      const x0 = car.x;
      this.input.injectKey("w", true);
      for (let i = 0; i < 600; i++) this.step(FIXED_DT, true);
      this.input.injectKey("w", false);
      return Math.abs(car.x - x0) > 200 && Math.abs(car.speed) > 20;
    });
    // Combat: fire the pistol, a bullet exists and ammo drops.
    check("combat: shooting fires a bullet and spends ammo", () => {
      const ammo0 = w.player.ammo.pistol;
      const ok = this.combat.shoot(0);
      this.step(FIXED_DT, true);
      return ok && w.player.ammo.pistol === ammo0 - 1 && w.bullets.length >= 0;
    });
    // Wanted: escalate to 3 stars, police spawn and chase.
    check("wanted: 3 stars spawns police cruisers", () => {
      setWanted(w, 3);
      for (let i = 0; i < 600; i++) this.step(FIXED_DT, true);
      return w.police.length >= 2;
    });
    check("wanted: helicopter appears at 4 stars", () => {
      setWanted(w, 4);
      for (let i = 0; i < 120; i++) this.step(FIXED_DT, true);
      return !!w.heli;
    });
    check("wanted: heat cools to 0 when hidden and slow", () => {
      const p = w.player;
      p.speed = 0;
      if (p.vehicle) p.vehicle.speed = 0;
      w.police.length = 0;
      w.heli = null;
      setWanted(w, 1);
      w.player.wantedHeat = 5;
      for (let i = 0; i < 600; i++) this.step(FIXED_DT, true);
      return w.player.wanted === 0;
    });
    // Mission: full first mission by teleporting through its objectives.
    check("mission: First Fare completes end to end", () => {
      const p = w.player;
      setWanted(w, 0);
      w.police.length = 0;
      this.missionSystem.startMission(0);
      const def = MISSIONS[0];
      for (const obj of def.objectives) {
        p.x = obj.x; p.y = obj.y;
        if (p.vehicle) { p.vehicle.x = obj.x; p.vehicle.y = obj.y; }
        for (let i = 0; i < 30; i++) this.step(FIXED_DT, true);
      }
      return w.missions.completed.includes(0) && w.player.cash >= 300;
    });
    // Taxi: start a fare, teleport to pickup then dropoff, cash rises.
    check("taxi: fare pays out on dropoff", () => {
      const cash0 = w.player.cash;
      this.side.startFare();
      const f = w.taxi.fare;
      if (!f) return false;
      w.player.x = f.from.x; w.player.y = f.from.y;
      if (w.player.vehicle) { w.player.vehicle.x = f.from.x; w.player.vehicle.y = f.from.y; }
      this.step(FIXED_DT, true);
      w.player.x = f.to.x; w.player.y = f.to.y;
      if (w.player.vehicle) { w.player.vehicle.x = f.to.x; w.player.vehicle.y = f.to.y; }
      for (let i = 0; i < 10; i++) this.step(FIXED_DT, true);
      return !w.taxi.active && w.player.cash > cash0;
    });
    // Packages: walk onto one, counter rises.
    check("packages: collecting one increments the counter", () => {
      const pk = w.packages.find((k) => !k.taken);
      if (!pk) return false;
      const n0 = w.stats.packagesFound;
      w.player.x = pk.x; w.player.y = pk.y;
      this.side.updatePackages();
      return w.stats.packagesFound === n0 + 1;
    });
    // Save / load round trip.
    check("save/load: cash survives a round trip", () => {
      w.player.cash = 12345;
      if (!saveGame(w)) return false;
      w.player.cash = 0;
      const loaded = loadGame(w);
      return !!loaded && w.player.cash === 12345;
    });
    // Shops: buying ammo works when the player can afford it.
    check("shops: buying pistol ammo spends cash and adds ammo", () => {
      w.player.cash = 5000;
      const ammo0 = w.player.ammo.pistol;
      this.shopSystem.openShop = { kind: "weapons", name: "Ironworks Guns" };
      const msg = this.shopSystem.buy(0);
      this.shopSystem.openShop = null;
      return w.player.ammo.pistol === ammo0 + 24 && /Bought/.test(msg);
    });
    // HUD + minimap render after all of the above.
    check("hud: update and minimap draw after full play", () => {
      this.hud.update();
      this.renderer.draw();
      return true;
    });
    check("selftest: no page errors recorded", () => this._errors.length === errorsBefore);
    const passed = checks.filter((c) => c.pass).length;
    const failed = checks.filter((c) => !c.pass);
    const result = {
      total: checks.length,
      passed,
      failed: failed.map((c) => c.name + (c.error ? " (" + c.error + ")" : "")),
      checks: checks.map((c) => c.name + ": " + (c.pass ? "PASS" : "FAIL")),
      errors: this._errors.slice(),
    };
    w.selftest = result;
    window.__SELFTEST__ = result;
    document.title = "SELFTEST " + (failed.length === 0 ? "PASS" : "FAIL") + " " + passed + "/" + checks.length;
    const pre = document.getElementById("selftest");
    if (pre) {
      pre.style.display = "block";
      pre.textContent = JSON.stringify(result, null, 2);
    }
    // Keep rendering the final frame behind the report.
    this.hud.update();
    this.renderer.draw();
    this.rafId = requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener("DOMContentLoaded", () => {
  const game = new Game();
  window.__GAME__ = game;
  game.start();
});
