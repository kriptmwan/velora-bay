// shops.js — the six shops of Velora Bay. Walk up to a shop marker and
// press E: weapons and ammo at Ironworks, armor at SafeHouse, food that
// heals at Mama Luz's, a payphone bribe that lowers your wanted level,
// cars at Velora Motors, and outfits at Strip Threads.

import { WEAPON_DEFS, VEHICLE_DEFS, addCash, showMessage } from "./state.js";
import { dist, fmtCash } from "./utils.js";

export const SHOP_MENU = {
  weapons: [
    { label: "P9 Pistol ammo (24)", price: 120, apply: (w) => { w.player.ammo.pistol += 24; } },
    { label: "K9 SMG — buy gun", price: 2400, apply: (w) => { w.player.ammo.smg += 64; w.player.weapon = "smg"; } },
    { label: "K9 SMG ammo (64)", price: 300, apply: (w) => { w.player.ammo.smg += 64; } },
    { label: "Boomstick 12 — buy gun", price: 3200, apply: (w) => { w.player.ammo.shotgun += 18; w.player.weapon = "shotgun"; } },
    { label: "AR-7 Rifle — buy gun", price: 5500, apply: (w) => { w.player.ammo.rifle += 60; w.player.weapon = "rifle"; } },
    { label: "AR-7 ammo (60)", price: 450, apply: (w) => { w.player.ammo.rifle += 60; } },
  ],
  armor: [
    { label: "Kevlar vest (+50 armor)", price: 600, apply: (w) => { w.player.armor = Math.min(100, w.player.armor + 50); } },
    { label: "Full body armor (+100 armor)", price: 1100, apply: (w) => { w.player.armor = 100; } },
  ],
  food: [
    { label: "Luz's special (+40 health)", price: 25, apply: (w) => { w.player.health = Math.min(100, w.player.health + 40); } },
    { label: "Full meal (+100 health)", price: 50, apply: (w) => { w.player.health = 100; } },
  ],
  bribe: [
    { label: "Bribe the desk sergeant (-2 stars)", price: 500, apply: (w) => { w.player.wanted = Math.max(0, w.player.wanted - 2); w.player.wantedHeat = 0; } },
    { label: "Bribe the whole precinct (clear wanted)", price: 1500, apply: (w) => { w.player.wanted = 0; w.player.wantedHeat = 0; w.police.length = 0; w.heli = null; } },
  ],
  dealer: [
    { label: "Vela Coupe", price: 5200, apply: (w) => { w.ownedCars.push("coupe"); } },
    { label: "Brawler Muscle", price: 9500, apply: (w) => { w.ownedCars.push("muscle"); } },
    { label: "Comet GT", price: 18000, apply: (w) => { w.ownedCars.push("comet"); } },
    { label: "Wasp Bike", price: 6500, apply: (w) => { w.ownedCars.push("bike"); } },
    { label: "Ridgeline SUV", price: 11000, apply: (w) => { w.ownedCars.push("suv"); } },
  ],
  clothes: [
    { label: "Street outfit", price: 150, apply: (w) => { w.player.outfit = 1; } },
    { label: "Neon suit", price: 400, apply: (w) => { w.player.outfit = 2; } },
    { label: "Syndicate tuxedo", price: 900, apply: (w) => { w.player.outfit = 3; } },
  ],
};

export class ShopSystem {
  constructor(world, game) {
    this.world = world;
    this.game = game;
    this.openShop = null; // shop def currently browsed, or null
  }

  nearestShop(maxDist) {
    const w = this.world;
    const p = w.player;
    let best = null;
    let bestD = (maxDist || 90) * (maxDist || 90);
    for (const s of w.shops) {
      const d = (s.x - p.x) * (s.x - p.x) + (s.y - p.y) * (s.y - p.y);
      if (d < bestD) { bestD = d; best = s; }
    }
    return best;
  }

  // Buy menu item `index` from the open shop. Returns a message line.
  buy(index) {
    const w = this.world;
    if (!this.openShop) return "No shop open.";
    const items = SHOP_MENU[this.openShop.kind] || [];
    const item = items[index];
    if (!item) return "Nothing there.";
    if (w.player.cash < item.price) return "Not enough cash — you need " + fmtCash(item.price) + ".";
    w.player.cash -= item.price;
    item.apply(w);
    if (this.game && this.game.audio) this.game.audio.cash();
    return "Bought: " + item.label + " for " + fmtCash(item.price) + ".";
  }

  open(shop) {
    this.openShop = shop;
    if (this.game && this.game.menus) this.game.menus.showShop(shop);
  }

  close() {
    this.openShop = null;
    if (this.game && this.game.menus) this.game.menus.hideShop();
  }

  update(input) {
    const w = this.world;
    if (this.openShop) {
      if (input.wasPressed("Escape") || input.wasPressed("e")) this.close();
      return;
    }
    const shop = this.nearestShop(90);
    if (shop && w.player.onFoot && input.wasPressed("e")) {
      this.open(shop);
    }
  }

  shopHint() {
    const shop = this.nearestShop(90);
    if (!shop || !this.world.player.onFoot) return "";
    return "Press E — " + shop.name;
  }
}

export function weaponCatalog() {
  return Object.entries(WEAPON_DEFS).map(([id, d]) => ({ id, ...d }));
}

export function vehicleCatalog() {
  return Object.entries(VEHICLE_DEFS)
    .filter(([id]) => id !== "police")
    .map(([id, d]) => ({ id, ...d }));
}
