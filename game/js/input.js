// input.js — keyboard + mouse state, kept as one small class so the game
// loop, the self-test harness and the shot stager can all drive it the same
// way (real keys in play, injected keys in tests).

export class Input {
  constructor() {
    this.keys = new Set();
    this.pressed = new Set(); // edge-triggered, cleared each frame
    this.mouse = { x: 0, y: 0, down: false };
    this._onKeyDown = (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
      if (!this.keys.has(e.key)) this.pressed.add(e.key);
      this.keys.add(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    };
    this._onMouseMove = (e) => { this.mouse.x = e.clientX; this.mouse.y = e.clientY; };
    this._onMouseDown = () => { this.mouse.down = true; };
    this._onMouseUp = () => { this.mouse.down = false; };
  }

  attach(target) {
    target.addEventListener("keydown", this._onKeyDown);
    target.addEventListener("keyup", this._onKeyUp);
    target.addEventListener("mousemove", this._onMouseMove);
    target.addEventListener("mousedown", this._onMouseDown);
    target.addEventListener("mouseup", this._onMouseUp);
  }

  // WASD + arrows, normalised to one set of names.
  isDown(...names) {
    for (const n of names) if (this.keys.has(n)) return true;
    return false;
  }

  get up() { return this.isDown("w", "ArrowUp"); }
  get down() { return this.isDown("s", "ArrowDown"); }
  get left() { return this.isDown("a", "ArrowLeft"); }
  get right() { return this.isDown("d", "ArrowRight"); }
  get sprint() { return this.isDown("Shift"); }
  get brake() { return this.isDown(" "); }

  // True once, on the frame the key went down.
  wasPressed(name) {
    const k = name.length === 1 ? name.toLowerCase() : name;
    return this.pressed.has(k) || this.pressed.has(name);
  }

  injectKey(name, down) {
    const k = name.length === 1 ? name.toLowerCase() : name;
    if (down) { if (!this.keys.has(k)) this.pressed.add(k); this.keys.add(k); }
    else this.keys.delete(k);
  }

  endFrame() {
    this.pressed.clear();
  }
}
