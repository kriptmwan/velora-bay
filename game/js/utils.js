// utils.js — small pure helpers shared by every Velora Bay system.
// No game state lives here: only numbers, angles, randomness and formatting.

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.sqrt(dx * dx + dy * dy);
}

export function distSq(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return dx * dx + dy * dy;
}

// Shortest signed turn from angle `from` toward angle `to`, in (-PI, PI].
export function angleDiff(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

export function angleLerp(from, to, t) {
  return from + angleDiff(from, to) * clamp(t, 0, 1);
}

// Deterministic PRNG so screenshots and the self-test harness are repeatable.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rand(rng, lo, hi) {
  return lo + rng() * (hi - lo);
}

export function randInt(rng, lo, hi) {
  return Math.floor(rand(rng, lo, hi + 1));
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

export function choice(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// "$1,250" style cash formatting for the HUD and shop menus.
export function fmtCash(n) {
  const v = Math.round(n);
  return "$" + v.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

// "07:42" style clock for the HUD.
export function fmtClock(hours) {
  const h = Math.floor(hours) % 24;
  const m = Math.floor((hours - h) * 60);
  return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
}

// Axis-aligned box overlap, used for building and shop collision.
export function rectsOverlap(ax, ay, aw, ah, bx, by, bw, bh) {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

// Keep an entity inside the city bounds.
export function clampToCity(x, y, size, margin) {
  return {
    x: clamp(x, margin, size - margin),
    y: clamp(y, margin, size - margin),
  };
}
