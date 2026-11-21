// driving.js — turns keyboard input into car control for the player's
// vehicle: throttle, steering, braking, handbrake slides, exiting the car,
// and stunt-jump detection when the car crosses a ramp at speed.

import { clamp, dist } from "./utils.js";
import { updateVehiclePhysics } from "./vehicles.js";
import { showMessage } from "./state.js";

export class DrivingController {
  constructor(world, game) {
    this.world = world;
    this.game = game;
    this.airTime = 0;
    this.wasAirborne = false;
  }

  update(dt, input) {
    const w = this.world;
    const p = w.player;
    const car = p.vehicle;
    if (p.onFoot || !car) return;
    if (p.fireCooldown > 0) p.fireCooldown -= dt;
    let steer = 0;
    if (input.left) steer -= 1;
    if (input.right) steer += 1;
    let throttle = 0;
    if (input.up) throttle = 1;
    if (input.down) throttle = -1;
    const control = {
      throttle,
      steer,
      brake: input.brake && input.up === false && throttle === 0,
      handbrake: input.brake && throttle !== 0,
    };
    // Space is the brake when coasting, the handbrake while accelerating.
    if (input.isDown(" ")) {
      if (throttle === 0) control.brake = true;
      else control.handbrake = true;
    }
    const moved = updateVehiclePhysics(w, car, dt, control);
    p.x = car.x;
    p.y = car.y;
    p.angle = car.angle;
    p.speed = car.speed;
    w.stats.distance += moved;
    // Stunt jumps: cross a ramp fast and the car goes airborne.
    for (const ramp of w.ramps) {
      if (dist(car.x, car.y, ramp.x, ramp.y) < 46 && Math.abs(car.speed) > 170) {
        this.airTime = 0.9;
        w.stats.stunts++;
        showMessage(w, "STUNT JUMP! +" + Math.round(Math.abs(car.speed)) + " style points", 2.5);
        if (this.game && this.game.effects) this.game.effects.spawnStuntBurst(car.x, car.y);
      }
    }
    if (this.airTime > 0) {
      this.airTime -= dt;
      this.wasAirborne = true;
    } else if (this.wasAirborne) {
      this.wasAirborne = false;
    }
    // Skid smoke when handbraking at speed.
    if (control.handbrake && Math.abs(car.speed) > 90 && this.game && this.game.effects) {
      this.game.effects.spawnSkid(car.x, car.y, car.angle);
    }
    if (input.wasPressed("e")) {
      if (this.game && this.game.playerController) this.game.playerController.exitVehicle();
    }
    if (input.wasPressed("f")) {
      // F = exit and leave the engine running is the same as E here; kept
      // as an alias so both keys the help lists actually work.
      if (this.game && this.game.playerController) this.game.playerController.exitVehicle();
    }
  }

  speedKmh() {
    const p = this.world.player;
    return Math.round(Math.abs(p.speed || 0) * 0.9);
  }
}
