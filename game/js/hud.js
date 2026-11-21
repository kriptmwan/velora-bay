// hud.js — the heads-up display: wanted stars, health/armor bars, cash,
// clock, district name, mission objective banner, speedometer, message
// toasts and the circular minimap (its own small canvas, drawn every frame).

import { fmtCash, fmtClock, clamp } from "./utils.js";
import { districtAt, DISTRICTS } from "./city.js";
import { WEAPON_DEFS } from "./state.js";

export class Hud {
  constructor(world, game) {
    this.world = world;
    this.game = game;
    this.root = document.getElementById("hud");
    this.minimap = document.getElementById("minimap");
    this.mmCtx = this.minimap ? this.minimap.getContext("2d") : null;
    this._build();
  }

  _build() {
    if (!this.root) return;
    this.root.innerHTML = "";
    const mk = (id, cls, html) => {
      const el = document.createElement("div");
      el.id = id;
      el.className = cls;
      el.innerHTML = html || "";
      this.root.appendChild(el);
      return el;
    };
    this.starsEl = mk("hud-stars", "hud-box", "");
    this.vitalsEl = mk("hud-vitals", "hud-box", "");
    this.cashEl = mk("hud-cash", "hud-box", "");
    this.clockEl = mk("hud-clock", "hud-box", "");
    this.districtEl = mk("hud-district", "hud-box", "");
    this.bannerEl = mk("hud-banner", "hud-banner", "");
    this.objectiveEl = mk("hud-objective", "hud-box", "");
    this.speedEl = mk("hud-speed", "hud-box", "");
    this.msgEl = mk("hud-message", "hud-box", "");
    this.hintEl = mk("hud-hint", "hud-box", "");
    this.weaponEl = mk("hud-weapon", "hud-box", "");
    // Minimap lives in its own corner box with the canvas inside.
    const mmBox = document.createElement("div");
    mmBox.id = "hud-minimap-box";
    mmBox.className = "hud-box";
    const canvas = document.createElement("canvas");
    canvas.id = "minimap";
    canvas.width = 168;
    canvas.height = 168;
    mmBox.appendChild(canvas);
    this.root.appendChild(mmBox);
    this.minimap = canvas;
    this.mmCtx = canvas.getContext("2d");
  }

  update() {
    const w = this.world;
    const p = w.player;
    if (!this.root) return;
    // Wanted stars: filled gold, empty dim.
    let stars = "";
    for (let i = 0; i < 5; i++) stars += i < p.wanted ? "★" : "☆";
    this.starsEl.textContent = stars;
    this.starsEl.style.color = p.wanted >= 3 ? "#ff5252" : "#ffd54a";
    // Health / armor bars.
    this.vitalsEl.innerHTML =
      "HEALTH <span class='bar'><span style='width:" + Math.round(p.health) + "%;background:#4caf50'></span></span> " + Math.round(p.health) +
      "<br>ARMOR <span class='bar'><span style='width:" + Math.round(p.armor) + "%;background:#42a5f5'></span></span> " + Math.round(p.armor);
    this.cashEl.textContent = fmtCash(p.cash) + "   ◆ " + p.respect + " respect";
    this.clockEl.textContent = fmtClock(w.timeOfDay) + (w.weather.rain > 0.3 ? "  🌧 rain" : "");
    const d = districtAt(p.x, p.y);
    this.districtEl.textContent = d.name + " — " + d.desc;
    // Objective banner: big, centre-top, fades with its timer.
    if (w.bannerTimer > 0 && w.banner) {
      this.bannerEl.style.display = "block";
      this.bannerEl.textContent = w.banner;
    } else {
      this.bannerEl.style.display = "none";
    }
    this.objectiveEl.textContent = "▸ " + w.objective;
    const kmh = Math.round(Math.abs(p.speed || 0) * 0.9);
    this.speedEl.innerHTML = p.onFoot ? "ON FOOT" : kmh + "<small> km/h</small><br>" + (p.vehicle ? p.vehicle.name : "");
    if (w.messageTimer > 0 && w.message) {
      this.msgEl.style.display = "block";
      this.msgEl.textContent = w.message;
    } else {
      this.msgEl.style.display = "none";
    }
    const hint = this.game && this.game.shopSystem ? this.game.shopSystem.shopHint() : "";
    this.hintEl.textContent = hint;
    this.hintEl.style.display = hint ? "block" : "none";
    const def = WEAPON_DEFS[p.weapon];
    this.weaponEl.textContent = def.name + "  •  " + (p.ammo[p.weapon] || 0) + " ammo  •  [1-4] switch  •  [Q] fire";
    this.drawMinimap();
  }

  drawMinimap() {
    const ctx = this.mmCtx;
    if (!ctx) return;
    const w = this.world;
    const p = w.player;
    const S = 168;
    const scale = S / 3200;
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = "#20241f";
    ctx.fillRect(0, 0, S, S);
    // District blocks.
    for (const d of DISTRICTS) {
      ctx.fillStyle = d.ground;
      ctx.fillRect(d.x * scale, d.y * scale, d.w * scale, d.h * scale);
    }
    // Roads.
    ctx.strokeStyle = "#3a3a3a";
    ctx.lineWidth = 3;
    for (let i = 0; i <= 8; i++) {
      ctx.beginPath(); ctx.moveTo(i * 400 * scale, 0); ctx.lineTo(i * 400 * scale, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i * 400 * scale); ctx.lineTo(S, i * 400 * scale); ctx.stroke();
    }
    const dot = (x, y, color, r) => {
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(x * scale, y * scale, r, 0, Math.PI * 2); ctx.fill();
    };
    for (const pk of w.packages) if (!pk.taken) dot(pk.x, pk.y, "#ffd54a", 2);
    for (const s of w.shops) dot(s.x, s.y, "#4caf50", 3);
    const marker = this._currentMarker();
    if (marker) {
      const pulse = 4 + Math.sin(w.time * 5) * 2;
      dot(marker.x, marker.y, "#ff5252", pulse);
    }
    for (const cop of w.police) dot(cop.x, cop.y, "#3d7bff", 3);
    if (w.heli) dot(w.heli.x, w.heli.y, "#9fd8ff", 3);
    // Player: white triangle pointing along the heading.
    ctx.save();
    ctx.translate(p.x * scale, p.y * scale);
    ctx.rotate(p.angle);
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(7, 0); ctx.lineTo(-5, -4.5); ctx.lineTo(-5, 4.5); ctx.closePath(); ctx.fill();
    ctx.restore();
    // View frame.
    ctx.strokeStyle = "rgba(255,255,255,0.5)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, S - 1, S - 1);
  }

  _currentMarker() {
    const w = this.world;
    if (this.game && this.game.missionSystem) {
      const m = this.game.missionSystem.marker();
      if (m) return m;
    }
    if (this.game && this.game.side) {
      const t = this.game.side.taxiMarker();
      if (t) return t;
      const r = this.game.side.raceMarker();
      if (r) return r;
    }
    return null;
  }
}
