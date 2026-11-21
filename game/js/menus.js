// Velora Bay — menus: start, pause, mission complete, wasted/busted, mission list.
import { S, addCash, showToast } from './state.js';
import { MISSIONS, retryMission } from './missions.js';
import { saveGame, loadGame, hasSave } from './save.js';
import { initAudio, resumeAudio, startMusic } from './audio.js';

export function initMenus() {
  const startBtn = document.getElementById('startbtn');
  if (startBtn) startBtn.addEventListener('click', () => startGame());
  const resumeBtn = document.getElementById('resumebtn');
  if (resumeBtn) resumeBtn.addEventListener('click', () => { S.mode = 'play'; hidePause(); });
  const saveBtn = document.getElementById('savebtn');
  if (saveBtn) saveBtn.addEventListener('click', () => { saveGame(); showToast('Game saved!', 2); });
  const md = document.getElementById('mddismiss');
  if (md) md.addEventListener('click', () => { document.getElementById('missiondone').classList.add('hidden'); });
  const go = document.getElementById('gorespawn');
  if (go) go.addEventListener('click', () => respawn());
  const ch = document.getElementById('continuehint');
  if (ch && hasSave()) ch.textContent = 'A saved game was found — press START to continue it.';
  window.__veloraShowPause = showPause;
  window.__veloraHidePause = hidePause;
  window.__veloraWasted = wasted;
  window.__veloraBusted = busted;
  window.__veloraMissionPassed = missionPassed;
  window.__veloraMissionFailed = () => {};
  window.__veloraToast = (t) => showToast(t, 3);
}

export function startGame() {
  initAudio(); resumeAudio(); startMusic();
  const loaded = loadGame();
  document.getElementById('startmenu').classList.add('hidden');
  S.mode = 'play';
  if (loaded) showToast('Welcome back to Velora Bay, Rex.', 3);
  else showToast('Welcome to Velora Bay — follow the yellow marker!', 4);
}

export function showPause() {
  const el = document.getElementById('pausemenu');
  if (!el) return;
  el.classList.remove('hidden');
  const st = document.getElementById('pausestats');
  if (st) st.textContent = `Cash ${Math.round(S.cash)} • Respect ${S.respect} • Missions ${S.stats.missionsDone}/10 • Packages ${S.stats.packages}/15 • Kills ${S.stats.kills} • Fares ${S.stats.fares}`;
  const pm = document.getElementById('pausemission');
  if (pm) {
    const def = MISSIONS[S.missionIndex];
    pm.innerHTML = def ? `<b>Current mission:</b> ${def.title} — ${def.brief}<br><b>All missions:</b> ` + MISSIONS.map((m, i) => (S.missionDone[m.id] ? '✓ ' : i === S.missionIndex ? '▶ ' : '· ') + m.title).join('<br>') : 'Free roam — all missions done!';
  }
}

export function hidePause() {
  const el = document.getElementById('pausemenu');
  if (el) el.classList.add('hidden');
}

export function missionPassed(def) {
  const el = document.getElementById('missiondone');
  if (!el) return;
  document.getElementById('mdtitle').textContent = 'MISSION PASSED';
  document.getElementById('mdsub').textContent = def.title + ' — ' + def.giver;
  document.getElementById('mdreward').textContent = `Reward: $${def.reward}. Respect +10. Next mission: ${(MISSIONS[S.missionIndex] || {}).title || 'free roam'}.`;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 5000);
  saveGame();
}

export function wasted(from) {
  S.mode = 'dead';
  const el = document.getElementById('gameover');
  document.getElementById('gotitle').textContent = 'WASTED';
  document.getElementById('gosub').textContent = 'Rex got taken down' + (from ? ' by ' + from : '') + '. The city keeps moving without you... for now.';
  el.classList.remove('hidden');
}

export function busted() {
  S.mode = 'dead';
  const lost = Math.min(S.cash, 200);
  addCash(-lost);
  S.wantedHeat = 0; S.wanted = 0;
  S.cops.forEach(c => { c.givingUp = true; });
  const el = document.getElementById('gameover');
  document.getElementById('gotitle').textContent = 'BUSTED';
  document.getElementById('gosub').textContent = `The V.B.P.D. hauled Rex in. Bail: $${lost}. The cops let him go — this time.`;
  el.classList.remove('hidden');
}

export function respawn() {
  const el = document.getElementById('gameover');
  el.classList.add('hidden');
  const p = S.player;
  const hosp = S.city.landmarks.find(l => l.id === 'hospital');
  p.x = hosp.x + 40; p.y = hosp.y + 40;
  p.health = 100; p.armor = 0; p.dead = false; p.invuln = 2;
  if (p.car) { p.car.driver = null; p.car = null; }
  p.onFoot = true;
  S.camera.x = p.x; S.camera.y = p.y;
  S.mode = 'play';
  showToast('St. Maria Hospital — patched up and back on the streets.', 3);
  saveGame();
}

export function showMissionList() {
  const lines = MISSIONS.map((m, i) => `${S.missionDone[m.id] ? '✓' : i === S.missionIndex ? '▶' : '·'} ${i + 1}. ${m.title} — ${m.giver} ($${m.reward})`).join('\n');
  showToast('MISSIONS:\n' + lines, 6);
  const def = MISSIONS[S.missionIndex];
  if (def && !S.mission && !S.missionDone[def.id]) {
    // retry a failed mission
    retryMission();
  }
}
