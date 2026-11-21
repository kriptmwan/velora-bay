// save.js — save / load through localStorage. The save holds the player's
// position, cash, health, armor, wanted level, weapons, owned cars, mission
// progress and side-activity stats — everything needed to resume a run.

import { SAVE_KEY } from "./state.js";

export function saveGame(world) {
  try {
    const p = world.player;
    const data = {
      version: 1,
      savedAt: Date.now(),
      player: {
        x: p.x, y: p.y, angle: p.angle, health: p.health, armor: p.armor,
        cash: p.cash, wanted: p.wanted, weapon: p.weapon, ammo: p.ammo,
        outfit: p.outfit, kills: p.kills, respect: p.respect,
      },
      timeOfDay: world.timeOfDay,
      missionsCompleted: world.missions.completed.slice(),
      stats: { ...world.stats },
      ownedCars: world.ownedCars.slice(),
      packagesFound: world.packages.filter((k) => k.taken).length,
      raceBest: { ...world.race.best },
    };
    window.localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadGame(world) {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || data.version !== 1) return null;
    const p = world.player;
    p.x = data.player.x;
    p.y = data.player.y;
    p.angle = data.player.angle;
    p.health = data.player.health;
    p.armor = data.player.armor;
    p.cash = data.player.cash;
    p.wanted = data.player.wanted;
    p.weapon = data.player.weapon;
    p.ammo = { ...p.ammo, ...data.player.ammo };
    p.outfit = data.player.outfit;
    p.kills = data.player.kills;
    p.respect = data.player.respect;
    p.onFoot = true;
    p.vehicle = null;
    world.timeOfDay = data.timeOfDay;
    world.missions.completed = data.missionsCompleted.slice();
    world.stats = { ...world.stats, ...data.stats };
    world.ownedCars = data.ownedCars.slice();
    // Restore taken packages by index order.
    let taken = data.packagesFound || 0;
    for (const pk of world.packages) {
      if (taken > 0) { pk.taken = true; taken--; }
    }
    world.race.best = { ...data.raceBest };
    return data;
  } catch (e) {
    return null;
  }
}

export function hasSave() {
  try {
    return !!window.localStorage.getItem(SAVE_KEY);
  } catch (e) {
    return false;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
    return true;
  } catch (e) {
    return false;
  }
}

export function saveSummary() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    return {
      savedAt: new Date(data.savedAt).toLocaleString(),
      cash: data.player.cash,
      missions: data.missionsCompleted.length,
    };
  } catch (e) {
    return null;
  }
}
