// Velora Bay — keyboard and mouse input.
import { S } from './state.js';

export function setupInput(canvas) {
  const down = (e) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' ', 'Tab'].includes(e.key)) e.preventDefault();
    S.keys[e.key.toLowerCase()] = true;
    if (e.key === 'Escape' || e.key.toLowerCase() === 'p') togglePause();
    if (e.key.toLowerCase() === 'm') window.__veloraToggleMusic && window.__veloraToggleMusic();
  };
  const up = (e) => { S.keys[e.key.toLowerCase()] = false; };
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  window.addEventListener('blur', () => { S.keys = {}; });
  canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    S.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    S.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', (e) => { if (e.button === 0) S.mouse.down = true; });
  window.addEventListener('mouseup', () => { S.mouse.down = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function togglePause() {
  if (S.mode === 'play') { S.mode = 'pause'; window.__veloraShowPause && window.__veloraShowPause(); }
  else if (S.mode === 'pause') { S.mode = 'play'; window.__veloraHidePause && window.__veloraHidePause(); }
}

export function key(name) { return !!S.keys[name]; }
export function pressedOnce(name) {
  if (S.keys[name] && !S.keys['__p_' + name]) { S.keys['__p_' + name] = true; return true; }
  if (!S.keys[name]) S.keys['__p_' + name] = false;
  return false;
}
export function driveInput() {
  return {
    up: key('w') || key('arrowup'),
    down: key('s') || key('arrowdown'),
    left: key('a') || key('arrowleft'),
    right: key('d') || key('arrowright'),
    handbrake: key('shift'),
    jump: key(' '),
  };
}
export function walkInput() {
  return {
    up: key('w') || key('arrowup'),
    down: key('s') || key('arrowdown'),
    left: key('a') || key('arrowleft'),
    right: key('d') || key('arrowright'),
    sprint: key('shift'),
    jump: key(' '),
  };
}
