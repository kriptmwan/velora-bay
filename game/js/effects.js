// effects.js — particles: explosions, muzzle flashes, smoke, sparks, skid
// marks and stunt bursts. All visual, all cheap, all pooled in one array
// on the world object so the renderer can draw them in one pass.

export class Effects {
  constructor(world) {
    this.world = world;
  }

  _push(p) {
    const w = this.world;
    w.particles.push(p);
    if (w.particles.length > 400) w.particles.splice(0, w.particles.length - 400);
  }

  spawnExplosion(x, y, small) {
    const w = this.world;
    const n = small ? 10 : 26;
    for (let i = 0; i < n; i++) {
      const a = w.rng() * Math.PI * 2;
      const sp = 60 + w.rng() * (small ? 160 : 320);
      this._push({
        kind: "fire", x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        life: 0.5 + w.rng() * 0.5, maxLife: 1,
        size: small ? 4 + w.rng() * 6 : 6 + w.rng() * 12,
        color: ["#ffdd55", "#ff8833", "#ff4422", "#888888"][Math.floor(w.rng() * 4)],
      });
    }
    this._push({ kind: "flash", x, y, vx: 0, vy: 0, life: 0.18, maxLife: 0.18, size: small ? 30 : 70, color: "#fff2aa" });
  }

  spawnMuzzle(x, y, angle) {
    this._push({
      kind: "flash", x: x + Math.cos(angle) * 26, y: y + Math.sin(angle) * 26,
      vx: 0, vy: 0, life: 0.08, maxLife: 0.08, size: 16, color: "#ffe27a",
    });
  }

  spawnSmoke(x, y) {
    const w = this.world;
    this._push({
      kind: "smoke", x, y,
      vx: (w.rng() - 0.5) * 20, vy: -30 - w.rng() * 20,
      life: 1.2, maxLife: 1.2, size: 8 + w.rng() * 8, color: "#9a9a9a",
    });
  }

  spawnSkid(x, y, angle) {
    this._push({
      kind: "smoke", x: x - Math.cos(angle) * 14, y: y - Math.sin(angle) * 14,
      vx: 0, vy: 0, life: 0.5, maxLife: 0.5, size: 5, color: "#555555",
    });
  }

  spawnStuntBurst(x, y) {
    const w = this.world;
    for (let i = 0; i < 16; i++) {
      const a = w.rng() * Math.PI * 2;
      this._push({
        kind: "spark", x, y,
        vx: Math.cos(a) * 200, vy: Math.sin(a) * 200,
        life: 0.6, maxLife: 0.6, size: 3, color: "#ffd54a",
      });
    }
  }

  update(dt) {
    const w = this.world;
    for (let i = w.particles.length - 1; i >= 0; i--) {
      const p = w.particles[i];
      p.life -= dt;
      if (p.life <= 0) { w.particles.splice(i, 1); continue; }
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      if (p.kind === "fire" || p.kind === "spark") {
        p.vx *= 1 - dt * 2;
        p.vy *= 1 - dt * 2;
      }
      if (p.kind === "smoke") p.size += dt * 12;
    }
  }
}
