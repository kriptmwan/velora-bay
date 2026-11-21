// menus.js — start screen, pause, mission-passed card, shop browser and the
// busted / wasted screens. All DOM overlays on top of the canvas; the game
// loop pauses while a menu that blocks play is open.

import { STORY_INTRO, OUTRO, CHARACTERS } from "./story.js";
import { fmtCash } from "./utils.js";
import { SHOP_MENU } from "./shops.js";
import { hasSave, saveSummary } from "./save.js";

export class Menus {
  constructor(world, game) {
    this.world = world;
    this.game = game;
    this.shopEl = null;
    this.overlayEl = document.getElementById("menu-overlay");
    this._buildStartScreen();
  }

  _buildStartScreen() {
    const ov = this.overlayEl;
    if (!ov) return;
    ov.innerHTML = "";
    const box = document.createElement("div");
    box.className = "menu-card";
    box.id = "start-card";
    const save = hasSave() ? saveSummary() : null;
    box.innerHTML =
      "<h1>VELORA BAY</h1>" +
      "<p class='tagline'>An open-world crime story — sun, speed and the Kane Syndicate.</p>" +
      "<p class='story'>" + STORY_INTRO.join("<br>") + "</p>" +
      "<p class='chars'>Rex Delgado &nbsp;•&nbsp; Mama Luz &nbsp;•&nbsp; Dante Cole &nbsp;•&nbsp; Marcus Kane</p>" +
      "<div class='menu-buttons'>" +
      "<button id='btn-start'>▶ START ENGINE</button>" +
      (save ? "<button id='btn-continue'>↻ CONTINUE — " + fmtCash(save.cash) + ", " + save.missions + " missions done</button>" : "") +
      "</div>" +
      "<p class='controls'>WASD / arrows — drive &amp; walk &nbsp;•&nbsp; E — enter car / shop &nbsp;•&nbsp; Q or click — shoot &nbsp;•&nbsp; 1-4 — weapons<br>" +
      "M — next mission &nbsp;•&nbsp; T — taxi fare &nbsp;•&nbsp; R — street race &nbsp;•&nbsp; V — vigilante &nbsp;•&nbsp; F5 — save &nbsp;•&nbsp; P / Esc — pause</p>" +
      "<p class='fine'>10 story missions • 10 cars • 6 shops • 15 hidden packages • 3 races • wanted 0–5 stars • day &amp; night • rain</p>";
    ov.appendChild(box);
    const startBtn = document.getElementById("btn-start");
    if (startBtn) startBtn.addEventListener("click", () => this.game.startGame(false));
    const contBtn = document.getElementById("btn-continue");
    if (contBtn) contBtn.addEventListener("click", () => this.game.startGame(true));
    ov.style.display = "flex";
  }

  hideStartScreen() {
    if (this.overlayEl) this.overlayEl.style.display = "none";
  }

  showPause() {
    const ov = this.overlayEl;
    if (!ov) return;
    ov.innerHTML = "";
    const box = document.createElement("div");
    box.className = "menu-card";
    const p = this.world.player;
    box.innerHTML =
      "<h1>PAUSED</h1>" +
      "<p>Cash " + fmtCash(p.cash) + " &nbsp;•&nbsp; Missions done " + this.world.missions.completed.length + "/10" +
      " &nbsp;•&nbsp; Packages " + this.world.stats.packagesFound + "/15 &nbsp;•&nbsp; Fares " + this.world.stats.faresDone + "</p>" +
      "<div class='menu-buttons'><button id='btn-resume'>▶ RESUME</button>" +
      "<button id='btn-save'>💾 SAVE GAME</button>" +
      "<button id='btn-restart'>↺ RESTART DAY</button></div>" +
      "<p class='controls'>WASD drive • E enter car • Q shoot • M mission • T taxi • R race • V vigilante</p>";
    ov.appendChild(box);
    ov.style.display = "flex";
    document.getElementById("btn-resume").addEventListener("click", () => this.game.togglePause(false));
    document.getElementById("btn-save").addEventListener("click", () => {
      this.game.saveNow();
      document.getElementById("btn-save").textContent = "✓ SAVED";
    });
    document.getElementById("btn-restart").addEventListener("click", () => window.location.reload());
  }

  hidePause() {
    if (this.overlayEl) this.overlayEl.style.display = "none";
  }

  showMissionPassed(def) {
    const ov = this.overlayEl;
    if (!ov) return;
    ov.innerHTML = "";
    const box = document.createElement("div");
    box.className = "menu-card small";
    const next = this.world.missions.completed.length >= 10;
    box.innerHTML =
      "<h1 class='gold'>MISSION PASSED</h1>" +
      "<h2>" + def.title + "</h2>" +
      "<p>Reward: <b>" + fmtCash(def.reward) + "</b> &nbsp;•&nbsp; Respect +10</p>" +
      (next ? "<p class='story'>" + OUTRO.join("<br>") + "</p>" : "<p>Press M whenever you're ready for the next job.</p>") +
      "<div class='menu-buttons'><button id='btn-continue-play'>▶ KEEP DRIVING</button></div>";
    ov.appendChild(box);
    ov.style.display = "flex";
    document.getElementById("btn-continue-play").addEventListener("click", () => this.hidePause());
  }

  showGameOver(kind) {
    const ov = this.overlayEl;
    if (!ov) return;
    ov.innerHTML = "";
    const box = document.createElement("div");
    box.className = "menu-card";
    if (kind === "busted") {
      box.innerHTML = "<h1>BUSTED!</h1><p>The VCPD hauled you in. They kept $200 and your car.</p>" +
        "<p>You'll wake up at St. Maria Hospital — and the city will still be there.</p>";
    } else {
      box.innerHTML = "<h1>WASTED</h1><p>Rex went down in a hail of gunfire on the streets of Velora Bay.</p>" +
        "<p>The paramedics at St. Maria Hospital put him back together. The Syndicate is still out there.</p>";
    }
    box.innerHTML += "<div class='menu-buttons'><button id='btn-hospital'>🏥 WAKE UP AT ST. MARIA HOSPITAL</button></div>";
    ov.appendChild(box);
    ov.style.display = "flex";
    document.getElementById("btn-hospital").addEventListener("click", () => {
      this.game.respawn();
      this.hidePause();
    });
  }

  showShop(shop) {
    this.hideShop();
    const root = document.getElementById("shop-panel");
    if (!root) return;
    const items = SHOP_MENU[shop.kind] || [];
    let html = "<h2>" + shop.name + "</h2><p class='fine'>Your cash: " + fmtCash(this.world.player.cash) + " — click to buy, E or Esc to leave.</p>";
    items.forEach((it, i) => {
      html += "<button class='shop-item' data-i='" + i + "'>" + it.label + " — <b>" + fmtCash(it.price) + "</b></button>";
    });
    html += "<p id='shop-msg' class='fine'></p>";
    root.innerHTML = html;
    root.style.display = "block";
    root.querySelectorAll(".shop-item").forEach((btn) => {
      btn.addEventListener("click", () => {
        const msg = this.game.shopSystem.buy(parseInt(btn.dataset.i, 10));
        const mEl = document.getElementById("shop-msg");
        if (mEl) mEl.textContent = msg;
        this.showShop(shop); // refresh cash + list
        const m2 = document.getElementById("shop-msg");
        if (m2) m2.textContent = msg;
      });
    });
  }

  hideShop() {
    const root = document.getElementById("shop-panel");
    if (root) { root.style.display = "none"; root.innerHTML = ""; }
  }
}
