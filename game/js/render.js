// render.js — draws the whole world on one canvas: district ground, the
// road grid, buildings with lit windows, shops, ramps, cars, pedestrians,
// the police helicopter and its spotlight, bullets, particles, rain and the
// night overlay. The camera transform comes from camera.js.

import { ROAD_GAP, ROAD_HALF, DISTRICTS } from "./city.js";
import { clamp } from "./utils.js";

export class Renderer {
  constructor(world, canvas) {
    this.world = world;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
  }

  draw() {
    const w = this.world;
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;
    const cam = w.camera;
    ctx.save();
    ctx.fillStyle = "#1c1f1a";
    ctx.fillRect(0, 0, cw, ch);
    ctx.translate(cw / 2, ch / 2);
    ctx.scale(cam.zoom || 1, cam.zoom || 1);
    const shx = (w.rng() - 0.5) * (cam.shake || 0);
    const shy = (w.rng() - 0.5) * (cam.shake || 0);
    ctx.translate(-cam.x + shx, -cam.y + shy);
    this._drawGround(ctx);
    this._drawRoads(ctx);
    this._drawBuildings(ctx);
    this._drawShopsAndRamps(ctx);
    this._drawPackages(ctx);
    this._drawMarkers(ctx);
    for (const car of w.vehicles) this._drawCar(ctx, car, false);
    for (const car of w.traffic) this._drawCar(ctx, car, false);
    for (const cop of w.police) this._drawCar(ctx, cop, true);
    // The player's own car lives on the player, not in any list: draw it last.
    if (w.player.vehicle) this._drawCar(ctx, w.player.vehicle, false);
    for (const rb of w.roadblocks) this._drawRoadblock(ctx, rb);
    this._drawPeds(ctx);
    this._drawEnemies(ctx);
    this._drawPickups(ctx);
    this._drawPlayer(ctx);
    this._drawBullets(ctx);
    this._drawParticles(ctx);
    if (w.heli) this._drawHeli(ctx, w.heli);
    this._drawRain(ctx);
    this._drawNight(ctx, cw, ch);
    ctx.restore();
  }

  _drawGround(ctx) {
    const w = this.world;
    // Base grass / sand outside the districts.
    ctx.fillStyle = "#3a4a2f";
    ctx.fillRect(0, 0, 3200, 3200);
    for (const d of DISTRICTS) {
      ctx.fillStyle = d.ground;
      ctx.fillRect(d.x, d.y, d.w, d.h);
      // District label painted on the ground.
      ctx.fillStyle = "rgba(255,255,255,0.16)";
      ctx.font = "bold 44px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(d.name.toUpperCase(), d.x + d.w / 2, d.y + d.h / 2);
      ctx.fillStyle = d.accent;
      ctx.fillRect(d.x, d.y, d.w, 4);
    }
    // Beach water strip along the south edge.
    ctx.fillStyle = "#2e6f8e";
    ctx.fillRect(0, 3080, 3200, 120);
    ctx.fillStyle = "#e8d9a0";
    ctx.fillRect(0, 3040, 3200, 40);
  }

  _drawRoads(ctx) {
    ctx.fillStyle = "#26262a";
    for (let i = 0; i <= 8; i++) {
      const line = i * ROAD_GAP;
      ctx.fillRect(line - ROAD_HALF, 0, ROAD_HALF * 2, 3200);
      ctx.fillRect(0, line - ROAD_HALF, 3200, ROAD_HALF * 2);
    }
    // Centre dashes.
    ctx.fillStyle = "#e8d44d";
    for (let i = 0; i <= 8; i++) {
      const line = i * ROAD_GAP;
      for (let d = 0; d < 3200; d += 80) {
        ctx.fillRect(line - 2, d, 4, 36);
        ctx.fillRect(d, line - 2, 36, 4);
      }
    }
    // Sidewalk edging.
    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 3;
    for (let i = 0; i <= 8; i++) {
      const line = i * ROAD_GAP;
      ctx.strokeRect(line - ROAD_HALF - 8, 0, ROAD_HALF * 2 + 16, 3200);
      ctx.strokeRect(0, line - ROAD_HALF - 8, 3200, ROAD_HALF * 2 + 16);
    }
  }

  _drawBuildings(ctx) {
    const w = this.world;
    const night = w.timeOfDay < 6 || w.timeOfDay >= 19;
    for (const b of w.buildings) {
      // Drop shadow for height.
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = "rgba(255,255,255,0.10)";
      ctx.fillRect(b.x, b.y, b.w, 10);
      // Roof detail / windows.
      if (b.windows) {
        ctx.fillStyle = night ? "#ffd76a" : "#2c3440";
        const cols = Math.max(2, Math.floor(b.w / 34));
        const rows = Math.max(2, Math.floor(b.h / 30));
        for (let i = 0; i < cols; i++) {
          for (let j = 0; j < rows; j++) {
            if ((i * 7 + j * 3) % 4 === 0 && !night) continue;
            ctx.fillRect(b.x + 10 + i * ((b.w - 20) / cols), b.y + 12 + j * ((b.h - 24) / rows), 12, 14);
          }
        }
      } else {
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.fillRect(b.x + b.w / 2 - 16, b.y + b.h / 2 - 10, 32, 20);
      }
      ctx.strokeStyle = "rgba(0,0,0,0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x, b.y, b.w, b.h);
    }
    for (const lm of w.landmarks || []) {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 15px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(lm.name, lm.x, lm.y - 14);
    }
  }

  _drawShopsAndRamps(ctx) {
    const w = this.world;
    for (const s of w.shops) {
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 22, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("$", s.x, s.y + 5);
      ctx.font = "bold 13px sans-serif";
      ctx.fillText(s.name, s.x, s.y - 30);
    }
    for (const r of w.ramps) {
      ctx.save();
      ctx.translate(r.x, r.y);
      ctx.rotate(r.angle);
      ctx.fillStyle = "#f2a541";
      ctx.beginPath();
      ctx.moveTo(-30, 18); ctx.lineTo(30, 18); ctx.lineTo(18, -18); ctx.lineTo(-18, -18);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = "#111";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("RAMP", 0, 6);
      ctx.restore();
    }
  }

  _drawPackages(ctx) {
    const w = this.world;
    const pulse = 0.6 + Math.sin(w.time * 4) * 0.4;
    for (const pk of w.packages) {
      if (pk.taken) continue;
      ctx.fillStyle = "rgba(255,213,74," + pulse.toFixed(2) + ")";
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#7a5b00";
      ctx.fillRect(pk.x - 6, pk.y - 5, 12, 10);
    }
  }

  _drawMarkers(ctx) {
    const w = this.world;
    const game = this._game;
    const markers = [];
    if (game && game.missionSystem) {
      const m = game.missionSystem.marker();
      if (m) markers.push({ x: m.x, y: m.y, color: "#ff5252", label: "MISSION" });
    }
    if (game && game.side) {
      const t = game.side.taxiMarker();
      if (t) markers.push({ x: t.x, y: t.y, color: "#ffd54a", label: "FARE" });
      const r = game.side.raceMarker();
      if (r) markers.push({ x: r.x, y: r.y, color: "#4fd8ff", label: "RACE" });
      if (w.vigilante.active && w.vigilante.target) {
        markers.push({ x: w.vigilante.target.x, y: w.vigilante.target.y, color: "#ff8a3d", label: "TARGET" });
      }
    }
    for (const m of markers) {
      const bob = Math.sin(w.time * 4) * 6;
      ctx.fillStyle = m.color;
      ctx.beginPath();
      ctx.moveTo(m.x, m.y - 46 + bob);
      ctx.lineTo(m.x - 12, m.y - 22 + bob);
      ctx.lineTo(m.x + 12, m.y - 22 + bob);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 13px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(m.label, m.x, m.y - 54 + bob);
      ctx.strokeStyle = m.color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(m.x, m.y, 26 + Math.sin(w.time * 3) * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  _drawCar(ctx, car, isPolice) {
    const isBike = car.type === "bike";
    const len = isBike ? 30 : 46;
    const wid = isBike ? 12 : 22;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(-len / 2 + 3, -wid / 2 + 4, len, wid);
    // Wheels.
    ctx.fillStyle = "#111";
    ctx.fillRect(-len / 2 + 4, -wid / 2 - 3, 10, 5);
    ctx.fillRect(-len / 2 + 4, wid / 2 - 2, 10, 5);
    ctx.fillRect(len / 2 - 14, -wid / 2 - 3, 10, 5);
    ctx.fillRect(len / 2 - 14, wid / 2 - 2, 10, 5);
    // Body.
    ctx.fillStyle = car.color;
    ctx.beginPath();
    const r = 7;
    ctx.roundRect(-len / 2, -wid / 2, len, wid, r);
    ctx.fill();
    // Windshield + roof.
    ctx.fillStyle = "rgba(20,30,45,0.85)";
    ctx.fillRect(-4, -wid / 2 + 3, 12, wid - 6);
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(-len / 2 + 6, -wid / 2 + 3, 8, wid - 6);
    if (car.type === "taxi") {
      ctx.fillStyle = "#111";
      ctx.font = "bold 9px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("TAXI", 0, 3);
    }
    if (isPolice) {
      const flash = Math.floor(this.world.time * 6) % 2 === 0;
      ctx.fillStyle = flash ? "#ff2222" : "#2266ff";
      ctx.fillRect(-2, -wid / 2 - 2, 8, 5);
      ctx.fillStyle = flash ? "#2266ff" : "#ff2222";
      ctx.fillRect(-2, wid / 2 - 3, 8, 5);
      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VCPD", -14, 3);
    }
    // Headlights at night.
    const night = this.world.timeOfDay < 6 || this.world.timeOfDay >= 19;
    if (night) {
      ctx.fillStyle = "rgba(255,240,180,0.9)";
      ctx.fillRect(len / 2 - 2, -wid / 2 + 3, 4, 4);
      ctx.fillRect(len / 2 - 2, wid / 2 - 7, 4, 4);
    }
    ctx.restore();
  }

  _drawRoadblock(ctx, rb) {
    ctx.save();
    ctx.translate(rb.x, rb.y);
    ctx.rotate(rb.angle);
    ctx.fillStyle = "#ff6a00";
    ctx.fillRect(-40, -8, 80, 16);
    ctx.fillStyle = "#fff";
    for (let i = -30; i < 40; i += 20) ctx.fillRect(i, -8, 10, 16);
    ctx.restore();
  }

  _drawPeds(ctx) {
    const w = this.world;
    for (const ped of w.peds) {
      ctx.save();
      ctx.translate(ped.x, ped.y);
      ctx.rotate(ped.angle);
      ctx.fillStyle = ped.color;
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e8c39a";
      ctx.beginPath();
      ctx.arc(3, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      if (ped.state === "flee") {
        ctx.fillStyle = "#ff5252";
        ctx.font = "bold 12px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("!", 0, -14);
      }
      ctx.restore();
    }
  }

  _drawEnemies(ctx) {
    const w = this.world;
    for (const e of w.enemies) {
      ctx.save();
      ctx.translate(e.x, e.y);
      ctx.rotate(e.angle);
      ctx.fillStyle = "#8a1f2d";
      ctx.beginPath();
      ctx.arc(0, 0, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#222";
      ctx.fillRect(6, -2, 16, 4);
      ctx.restore();
      // HP bar.
      ctx.fillStyle = "#111";
      ctx.fillRect(e.x - 14, e.y - 20, 28, 5);
      ctx.fillStyle = "#ff5252";
      ctx.fillRect(e.x - 14, e.y - 20, 28 * clamp(e.hp / 60, 0, 1), 5);
    }
  }

  _drawPickups(ctx) {
    const w = this.world;
    for (const pk of w.pickups) {
      ctx.fillStyle = pk.kind === "cash" ? "#4caf50" : pk.kind === "health" ? "#ff5252" : "#42a5f5";
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "bold 12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(pk.kind === "cash" ? "$" : pk.kind === "health" ? "+" : "A", pk.x, pk.y + 4);
    }
  }

  _drawPlayer(ctx) {
    const w = this.world;
    const p = w.player;
    if (!p.onFoot) return; // drawn as the car otherwise
    const outfitColors = ["#2e7d32", "#c23b4e", "#ff4fd8", "#111111"];
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = outfitColors[p.outfit] || outfitColors[0];
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8c39a";
    ctx.beginPath();
    ctx.arc(4, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    // Gun in hand when aiming.
    ctx.fillStyle = "#222";
    ctx.fillRect(8, -2, 12, 4);
    ctx.restore();
    // Name tag.
    ctx.fillStyle = "#fff";
    ctx.font = "bold 12px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("REX", p.x, p.y - 18);
  }

  _drawBullets(ctx) {
    const w = this.world;
    ctx.fillStyle = "#ffe27a";
    for (const b of w.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  _drawParticles(ctx) {
    const w = this.world;
    for (const pt of w.particles) {
      const alpha = clamp(pt.life / (pt.maxLife || 1), 0, 1);
      ctx.globalAlpha = alpha;
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size * (pt.kind === "smoke" ? 1 : alpha + 0.3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  _drawHeli(ctx, heli) {
    const w = this.world;
    // Spotlight cone onto the player.
    const p = w.player;
    const grad = ctx.createRadialGradient(p.x, p.y, 10, p.x, p.y, 220);
    grad.addColorStop(0, "rgba(255,250,200,0.35)");
    grad.addColorStop(1, "rgba(255,250,200,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 220, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(heli.x, heli.y);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(4, 6, 22, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#37474f";
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    const blade = w.time * 14;
    ctx.strokeStyle = "#222";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(blade) * -30, Math.sin(blade) * -8);
    ctx.lineTo(Math.cos(blade) * 30, Math.sin(blade) * 8);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("VCPD AIR", 0, 3);
    ctx.restore();
  }

  _drawRain(ctx) {
    const w = this.world;
    if (!w.weather || w.weather.rain <= 0.05) return;
    const drops = (this._game && this._game.weather) ? this._game.weather.rainDrops : [];
    ctx.strokeStyle = "rgba(180,200,255,0.5)";
    ctx.lineWidth = 1;
    for (const d of drops) {
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 6, d.y + 18);
      ctx.stroke();
    }
  }

  _drawNight(ctx, cw, ch) {
    const w = this.world;
    const h = w.timeOfDay;
    let dark = 0;
    if (h >= 17 && h < 19) dark = (h - 17) / 2 * 0.55;
    else if (h >= 5 && h < 7) dark = (7 - h) / 2 * 0.55;
    else if (h < 5 || h >= 19) dark = 0.55;
    if (dark <= 0) return;
    ctx.fillStyle = "rgba(8,10,40," + dark.toFixed(2) + ")";
    const cam = w.camera;
    ctx.fillRect(cam.x - cw / 2, cam.y - ch / 2, cw, ch);
    // Warm pools of light around the player and shops at night.
    const px = w.player.x;
    const py = w.player.y;
    const grad = ctx.createRadialGradient(px, py, 20, px, py, 260);
    grad.addColorStop(0, "rgba(255,220,140,0.18)");
    grad.addColorStop(1, "rgba(255,220,140,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, 260, 0, Math.PI * 2);
    ctx.fill();
  }

  // The weather system owns the rain streaks; the renderer reads them here.
  set gameRef(g) {
    this._game = g;
  }
  get gameRef() {
    return this._game;
  }
}
