// missions.js — the ten-mission story arc: Rex Delgado, a cab driver who
// owes the wrong people money, climbs from his first fare to the takedown
// of the Kane Syndicate. Each mission is a list of objectives the system
// walks through: reach a marker, survive a chase, defeat enemies, deliver.

import { addCash, showMessage, showBanner, setWanted } from "./state.js";
import { dist } from "./utils.js";

export const MISSIONS = [
  {
    id: 0, title: "First Fare", reward: 300,
    briefing: "Mama Luz: 'Rex, my cab driver called in sick. Take the Bay Cab, pick up Mrs. Alvarez at the Marina, and get her to the Neon Strip. No trouble.'",
    objectives: [
      { kind: "reach", text: "Get in the Bay Cab by the diner", x: 2500, y: 1750, radius: 90 },
      { kind: "reach", text: "Pick up Mrs. Alvarez at the Marina", x: 1500, y: 500, radius: 90 },
      { kind: "reach", text: "Drop her at the Neon Strip casino", x: 2600, y: 1200, radius: 90 },
    ],
  },
  {
    id: 1, title: "The Debt Collector", reward: 500,
    briefing: "Dante Cole: 'Kane's boys are leaning on Mama Luz for protection money. Go to Old Town, remind them the diner is off limits.'",
    objectives: [
      { kind: "reach", text: "Reach the Old Town corner", x: 500, y: 2300, radius: 90 },
      { kind: "defeat", text: "Deal with Kane's collectors (0/3)", count: 3 },
      { kind: "reach", text: "Report back to Mama Luz", x: 2500, y: 1800, radius: 90 },
    ],
  },
  {
    id: 2, title: "Hot Wheels", reward: 700,
    briefing: "Dante Cole: 'We need wheels that outrun the VCPD. Steal the Comet GT parked on the Strip — and lose the cops who notice.'",
    objectives: [
      { kind: "reach", text: "Steal the Comet GT on the Neon Strip", x: 2450, y: 1330, radius: 80 },
      { kind: "escape", text: "Lose the cops — drop to 0 stars", seconds: 0 },
      { kind: "reach", text: "Park the Comet at Dante's garage", x: 1300, y: 2600, radius: 90 },
    ],
  },
  {
    id: 3, title: "Harbor Nights", reward: 900,
    briefing: "Dante Cole: 'A Kane shipment lands at Warehouse 7 tonight. Grab the crate, and don't let the guards keep it.'",
    objectives: [
      { kind: "reach", text: "Reach Warehouse 7 at the Harbor", x: 500, y: 1500, radius: 90 },
      { kind: "defeat", text: "Clear the warehouse guards (0/4)", count: 4 },
      { kind: "reach", text: "Take the crate to the diner", x: 2500, y: 1800, radius: 90 },
    ],
  },
  {
    id: 4, title: "The Informant", reward: 1100,
    briefing: "Mama Luz: 'A Kane accountant wants out. Pick him up at the Marina before Kane's hitmen find him — then get him to the church.'",
    objectives: [
      { kind: "reach", text: "Pick up the informant at the Marina", x: 1300, y: 300, radius: 90 },
      { kind: "defeat", text: "Fight off the hitmen (0/3)", count: 3 },
      { kind: "reach", text: "Deliver him to the Old Town church", x: 400, y: 2400, radius: 90 },
    ],
  },
  {
    id: 5, title: "Bank Job", reward: 2500,
    briefing: "Dante Cole: 'The big one. Velora Bank, downtown. Get in, grab the Syndicate's ledger cash, and get out before the VCPD locks the block down.'",
    objectives: [
      { kind: "reach", text: "Reach Velora Bank downtown", x: 1700, y: 1300, radius: 90 },
      { kind: "defeat", text: "Overcome the bank guards (0/4)", count: 4 },
      { kind: "reach", text: "Escape with the cash to the Hills", x: 2300, y: 2300, radius: 110 },
    ],
  },
  {
    id: 6, title: "Ambush at the Docks", reward: 1800,
    briefing: "Dante Cole: 'Kane knows about the bank job. His crew is waiting at the docks. Walk in ready — or don't walk in at all.'",
    objectives: [
      { kind: "reach", text: "Reach the Harbor docks", x: 300, y: 1500, radius: 90 },
      { kind: "defeat", text: "Survive the ambush (0/6)", count: 6 },
      { kind: "reach", text: "Rendezvous with Dante at the Pier", x: 1600, y: 3000, radius: 100 },
    ],
  },
  {
    id: 7, title: "Getaway Driver", reward: 1500,
    briefing: "Dante Cole: 'Mama Luz's nephew lifted a Syndicate car. The whole VCPD is on him. Drive him out of the city dragnet — fast.'",
    objectives: [
      { kind: "reach", text: "Pick up the nephew in Downtown", x: 1400, y: 1400, radius: 90 },
      { kind: "escape", text: "Shake the wanted level to 0 stars", seconds: 0 },
      { kind: "reach", text: "Drop him at the Beach safehouse", x: 1600, y: 2900, radius: 100 },
    ],
  },
  {
    id: 8, title: "Rooftop Meeting", reward: 2200,
    briefing: "Mama Luz: 'Kane's lieutenant meets his buyers on a Downtown rooftop. Climb up there, end the meeting, and take his ledger.'",
    objectives: [
      { kind: "reach", text: "Reach Kane Tower downtown", x: 1500, y: 1500, radius: 100 },
      { kind: "defeat", text: "Take down the rooftop crew (0/5)", count: 5 },
      { kind: "reach", text: "Bring the ledger to Dante", x: 1300, y: 2600, radius: 90 },
    ],
  },
  {
    id: 9, title: "King of Velora", reward: 5000,
    briefing: "Mama Luz: 'This is it, Rex. Kane himself, at his Hills estate. End the Syndicate tonight — and Velora Bay is yours.'",
    objectives: [
      { kind: "reach", text: "Storm the Kane Estate in the Hills", x: 2600, y: 2600, radius: 110 },
      { kind: "defeat", text: "Defeat Kane's guards (0/8)", count: 8 },
      { kind: "reach", text: "Confront Kane at the estate", x: 2700, y: 2700, radius: 80 },
    ],
  },
];

export class MissionSystem {
  constructor(world, game) {
    this.world = world;
    this.game = game;
  }

  nextMission() {
    const done = this.world.missions.completed;
    for (const m of MISSIONS) if (!done.includes(m.id)) return m;
    return null;
  }

  startMission(id) {
    const w = this.world;
    const def = MISSIONS.find((m) => m.id === id);
    if (!def) return false;
    if (w.missions.active) return false;
    w.missions.index = id;
    w.missions.active = { def, stage: 0, killsAtStart: w.player.kills, timer: 0 };
    w.objective = def.objectives[0].text;
    showBanner(w, def.title + " — " + def.objectives[0].text, 6);
    showMessage(w, def.briefing, 8);
    if (this.game && this.game.audio) this.game.audio.pickup();
    return true;
  }

  startNext() {
    const next = this.nextMission();
    if (!next) {
      showMessage(this.world, "Every mission is done. You are the King of Velora.", 6);
      return false;
    }
    return this.startMission(next.id);
  }

  marker() {
    const a = this.world.missions.active;
    if (!a) return null;
    const obj = a.def.objectives[a.stage];
    if (!obj || obj.kind === "defeat" || obj.kind === "escape") return null;
    return { x: obj.x, y: obj.y, text: obj.text };
  }

  update(dt) {
    const w = this.world;
    const a = w.missions.active;
    if (!a) return;
    a.timer += dt;
    const obj = a.def.objectives[a.stage];
    if (!obj) { this.completeMission(); return; }
    const p = w.player;
    if (obj.kind === "reach") {
      if (dist(p.x, p.y, obj.x, obj.y) < obj.radius) this.advanceStage();
    } else if (obj.kind === "defeat") {
      const killed = p.kills - a.killsAtStart;
      w.objective = obj.text.replace(/\(0\/\d+\)/, "(" + Math.min(killed, obj.count) + "/" + obj.count + ")");
      if (killed >= obj.count) this.advanceStage();
    } else if (obj.kind === "escape") {
      if (p.wanted === 0) this.advanceStage();
    }
    // Entering a mission with enemies: spawn the objective's guards.
    if (obj.kind === "defeat" && !a.spawnedForStage && w.enemies.length === 0) {
      a.spawnedForStage = true;
      const cx = obj.x || p.x;
      const cy = obj.y || p.y;
      for (let i = 0; i < obj.count; i++) {
        const ex = cx + (w.rng() - 0.5) * 300;
        const ey = cy + (w.rng() - 0.5) * 300;
        if (this.game && this.game.combat) this.game.combat.spawnEnemy(ex, ey, 60);
      }
      setWanted(w, Math.max(p.wanted, 2));
      showMessage(w, "Kane's men are here. Take them down!", 3);
    }
  }

  advanceStage() {
    const w = this.world;
    const a = w.missions.active;
    if (!a) return;
    a.stage++;
    a.killsAtStart = w.player.kills;
    a.spawnedForStage = false;
    const next = a.def.objectives[a.stage];
    if (!next) { this.completeMission(); return; }
    w.objective = next.text;
    showBanner(w, next.text, 4);
    if (this.game && this.game.audio) this.game.audio.pickup();
  }

  completeMission() {
    const w = this.world;
    const a = w.missions.active;
    if (!a) return;
    const def = a.def;
    w.missions.completed.push(def.id);
    w.missions.active = null;
    w.stats.missionsDone++;
    addCash(w, def.reward);
    w.player.respect += 10;
    w.objective = "Mission passed! Press M for your next mission.";
    showBanner(w, "MISSION PASSED — " + def.title + "  +$" + def.reward, 6);
    showMessage(w, def.title + " complete. You earned $" + def.reward + ".", 5);
    if (this.game && this.game.audio) this.game.audio.missionPass();
    if (this.game && this.game.menus) this.game.menus.showMissionPassed(def);
    if (w.missions.completed.length >= MISSIONS.length) {
      w.objective = "KING OF VELORA — the Syndicate is finished. Free roam!";
      showBanner(w, "KING OF VELORA — you own this city now.", 8);
    }
  }

  failMission(reason) {
    const w = this.world;
    const a = w.missions.active;
    if (!a) return;
    w.missions.active = null;
    w.missions.failed++;
    w.objective = "Mission failed — " + reason + ". Press M to retry.";
    showBanner(w, "MISSION FAILED — " + reason, 5);
  }
}
