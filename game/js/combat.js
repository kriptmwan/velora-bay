// combat.js — shooting on foot and drive-by, bullets, enemy gang members
// and explosions. Firing a gun in public raises the wanted level and sends
// nearby pedestrians running.

import { WEAPON_DEFS, setWanted, hurtPlayer, showMessage } from "./state.js";
import { clamp, dist, rand } from "./utils.js";

export class CombatSystem {
  constructor(world, game) {
    this.world = world;
    this.game = game;
  }

  currentWeapon() {
    return WEAPON_DEFS[this.world.player.weapon];
  }

  // Fire from the player toward an angle. Returns true if a shot left the gun.
  shoot(angle) {
    const w = this.world;
    const p = w.player;
    if (p.fireCooldown > 0) return false;
    const def = this.currentWeapon();
    if ((p.ammo[p.weapon] || 0) <= 0) {
      showMessage(w, "Out of ammo for the " + def.name + " — buy more at Ironworks Guns.", 2.5);
      p.fireCooldown = 0.3;
      return false;
    }
    const pellets = def.pellets || 1;
    for (let i = 0; i < pellets; i++) {
      const spread = (w.rng() - 0.5) * 2 * def.spread;
      w.bullets.push({
        x: p.x + Math.cos(angle) * 22,
        y: p.y + Math.sin(angle) * 22,
        vx: Math.cos(angle + spread) * def.bulletSpeed,
        vy: Math.sin(angle + spread) * def.bulletSpeed,
        damage: def.damage,
        range: def.range,
        travelled: 0,
        from: "player",
      });
    }
    p.ammo[p.weapon] -= 1;
    p.fireCooldown = def.rate;
    w.stats.shotsFired++;
    if (this.game && this.game.audio) this.game.audio.gunshot();
    if (this.game && this.game.effects) this.game.effects.spawnMuzzle(p.x, p.y, angle);
    if (this.game && this.game.peds) this.game.peds.scare(p.x, p.y, 420);
    if (p.wanted < 2) setWanted(w, 2);
    return true;
  }

  // Aim from the player toward the mouse (screen) or, in tests, a fixed angle.
  aimAngle(mouseX, mouseY, canvasW, canvasH) {
    const w = this.world;
    const p = w.player;
    const cam = w.camera;
    const worldX = (mouseX - canvasW / 2) / (cam.zoom || 1) + cam.x;
    const worldY = (mouseY - canvasH / 2) / (cam.zoom || 1) + cam.y;
    return Math.atan2(worldY - p.y, worldX - p.x);
  }

  spawnEnemy(x, y, hp) {
    const w = this.world;
    const e = {
      x, y, angle: 0, hp: hp || 60, speed: 95,
      fireCooldown: 1 + w.rng(), state: "hunt",
    };
    w.enemies.push(e);
    return e;
  }

  explode(x, y, radius, damage) {
    const w = this.world;
    if (this.game && this.game.effects) this.game.effects.spawnExplosion(x, y);
    if (this.game && this.game.audio) this.game.audio.explosion();
    if (this.game && this.game.peds) this.game.peds.scare(x, y, radius + 200);
    const p = w.player;
    const dp = dist(x, y, p.x, p.y);
    if (dp < radius) hurtPlayer(w, damage * (1 - dp / radius));
    for (let i = w.enemies.length - 1; i >= 0; i--) {
      const e = w.enemies[i];
      if (dist(x, y, e.x, e.y) < radius) {
        e.hp -= damage;
        if (e.hp <= 0) this.killEnemy(i);
      }
    }
    for (const cop of w.police) {
      if (dist(x, y, cop.x, cop.y) < radius) cop.health -= damage;
    }
  }

  killEnemy(index) {
    const w = this.world;
    const e = w.enemies[index];
    w.enemies.splice(index, 1);
    w.player.kills++;
    w.pickups.push({ x: e.x, y: e.y, kind: "cash", amount: 80 + Math.floor(w.rng() * 120), timer: 30 });
    if (this.game && this.game.effects) this.game.effects.spawnExplosion(e.x, e.y, true);
  }

  update(dt) {
    const w = this.world;
    const p = w.player;
    // Bullets fly, expire at range, and hit enemies, cops and the player.
    for (let i = w.bullets.length - 1; i >= 0; i--) {
      const b = w.bullets[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.travelled += Math.hypot(b.vx, b.vy) * dt;
      let dead = b.travelled > b.range;
      if (!dead && b.from === "player") {
        for (let j = w.enemies.length - 1; j >= 0; j--) {
          const e = w.enemies[j];
          if (dist(b.x, b.y, e.x, e.y) < 20) {
            e.hp -= b.damage;
            dead = true;
            if (e.hp <= 0) this.killEnemy(j);
            break;
          }
        }
        if (!dead) {
          for (const cop of w.police) {
            if (dist(b.x, b.y, cop.x, cop.y) < 24) {
              cop.health -= b.damage;
              dead = true;
              break;
            }
          }
        }
      }
      if (!dead && b.from === "enemy") {
        if (dist(b.x, b.y, p.x, p.y) < 18) {
          hurtPlayer(w, b.damage * 0.6);
          dead = true;
        }
      }
      if (dead) w.bullets.splice(i, 1);
    }
    // Enemy gang members hunt the player and shoot when close.
    for (let i = w.enemies.length - 1; i >= 0; i--) {
      const e = w.enemies[i];
      const d = dist(e.x, e.y, p.x, p.y);
      const want = Math.atan2(p.y - e.y, p.x - e.x);
      e.angle = want;
      if (d > 260) {
        e.x += Math.cos(want) * e.speed * dt;
        e.y += Math.sin(want) * e.speed * dt;
      } else if (d > 40) {
        e.x += Math.cos(want) * e.speed * 0.4 * dt;
        e.y += Math.sin(want) * e.speed * 0.4 * dt;
      }
      e.fireCooldown -= dt;
      if (d < 420 && e.fireCooldown <= 0) {
        e.fireCooldown = 1.1 + w.rng() * 0.8;
        const spread = (w.rng() - 0.5) * 0.14;
        w.bullets.push({
          x: e.x + Math.cos(want) * 20, y: e.y + Math.sin(want) * 20,
          vx: Math.cos(want + spread) * 700, vy: Math.sin(want + spread) * 700,
          damage: 12, range: 420, travelled: 0, from: "enemy",
        });
        if (this.game && this.game.audio) this.game.audio.gunshot();
      }
    }
    // Pickups: walk or drive over cash, health and armor.
    for (let i = w.pickups.length - 1; i >= 0; i--) {
      const pk = w.pickups[i];
      pk.timer -= dt;
      if (pk.timer <= 0) { w.pickups.splice(i, 1); continue; }
      if (dist(pk.x, pk.y, p.x, p.y) < 34) {
        if (pk.kind === "cash") {
          p.cash += pk.amount;
          showMessage(w, "Picked up " + "$" + pk.amount + ".", 2);
          if (this.game && this.game.audio) this.game.audio.cash();
        } else if (pk.kind === "health") {
          p.health = Math.min(100, p.health + 40);
          showMessage(w, "Health restored.", 2);
        } else if (pk.kind === "armor") {
          p.armor = Math.min(100, p.armor + 50);
          showMessage(w, "Armor up.", 2);
        }
        if (this.game && this.game.audio) this.game.audio.pickup();
        w.pickups.splice(i, 1);
      }
    }
  }
}
