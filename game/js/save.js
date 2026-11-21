// Velora Bay — save/load via localStorage.
import { S } from './state.js';

export function hasSave() {
  try { return !!localStorage.getItem(S.saveSlot); } catch (e) { return false; }
}

export function saveGame() {
  try {
    const p = S.player;
    const data = {
      v: 2, cash: S.cash, respect: S.respect,
      missionIndex: S.missionIndex, missionDone: S.missionDone,
      stats: S.stats, packagesFound: S.packagesFound,
      weapons: S.weapons, weapon: S.weapon,
      dayTime: S.dayTime,
      px: p ? p.x : 0, py: p ? p.y : 0,
      health: p ? p.health : 100, armor: p ? p.armor : 0,
      ownedCars: S.ownedCars,
    };
    localStorage.setItem(S.saveSlot, JSON.stringify(data));
    return true;
  } catch (e) { return false; }
}

export function loadGame() {
  try {
    const raw = localStorage.getItem(S.saveSlot);
    if (!raw) return false;
    const d = JSON.parse(raw);
    if (!d || d.v !== 2) return false;
    S.cash = d.cash; S.respect = d.respect || 0;
    S.missionIndex = d.missionIndex || 0;
    S.missionDone = d.missionDone || {};
    S.stats = Object.assign(S.stats, d.stats || {});
    S.packagesFound = d.packagesFound || {};
    if (d.weapons) S.weapons = d.weapons;
    if (d.weapon) S.weapon = d.weapon;
    if (d.dayTime) S.dayTime = d.dayTime;
    if (d.ownedCars) S.ownedCars = d.ownedCars;
    const p = S.player;
    if (p && d.px) { p.x = d.px; p.y = d.py; p.health = d.health || 100; p.armor = d.armor || 0; }
    // re-mark found packages in the city
    if (S.city) for (const pkg of S.city.packages) if (S.packagesFound[pkg.id]) pkg.found = true;
    return true;
  } catch (e) { return false; }
}
