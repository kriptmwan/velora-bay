// Velora Bay — 10-mission story chain with a generic stage engine.
import { S, WORLD, addCash, addHeat, showToast, say, updateStars } from './state.js';
import { MISSION_DIALOGUE } from './story.js';
import { makeCar } from './vehicles.js';
import { spawnEnemy } from './combat.js';
import { dist, rand, pick } from './utils.js';
import { sfx } from './audio.js';

const B = WORLD.block; // 340
const P = (i, j, ox = 170, oy = 170) => ({ x: i * B + ox, y: j * B + oy });

// Stage types: goto | drive | kill | pickup | deliver | escape | tail | race | survive
export const MISSIONS = [
  { id: 'm1', title: 'FIRST FARE', giver: 'Mama Luz', reward: 300,
    brief: 'Drive the taxi. Two fares, no excuses.',
    stages: [
      { type: 'goto', at: P(2, 3), text: 'Get in the taxi at the Coral Cafe', radius: 90, needCar: 'taxi' },
      { type: 'drive', at: P(8, 2), text: 'Fare 1: drop off at the Marina', radius: 110 },
      { type: 'drive', at: P(6, 8), text: 'Fare 2: drop off at the Neon Strip', radius: 110 },
    ] },
  { id: 'm2', title: "LUZ'S ERRAND", giver: 'Mama Luz', reward: 400,
    brief: 'Pick up a package at the Marina, deliver it to the Coral Cafe. Quietly.',
    stages: [
      { type: 'pickup', at: P(10, 2), text: 'Pick up the package at the Marina Pier', radius: 80 },
      { type: 'deliver', at: P(3, 4), text: 'Deliver the package to the Coral Cafe', radius: 90 },
    ] },
  { id: 'm3', title: 'HOT WHEELS', giver: 'Dante Cole', reward: 900,
    brief: 'Steal the cherry-red Comet GT from the showroom. Lose the heat.',
    stages: [
      { type: 'goto', at: P(7, 6), text: 'Reach Comet Motors on the Strip', radius: 90, needCar: 'sports' },
      { type: 'escape', at: P(2, 8), text: 'Lose the cops, then reach Dante\'s Garage', radius: 120, needHeat: 0 },
    ] },
  { id: 'm4', title: 'THE SHAKEDOWN', giver: 'Mama Luz', reward: 700,
    brief: 'Three Kane extortionists are shaking down the Strip. Teach them manners.',
    stages: [
      { type: 'kill', at: P(8, 7), text: 'Deal with the extortionists on the Neon Strip (0/3)', radius: 200, count: 3, spawn: 'extortion' },
    ] },
  { id: 'm5', title: 'HARBOR LIGHTS', giver: 'Dante Cole', reward: 1100,
    brief: 'Steal the Kane truck at the Harbor docks. Bring it to the garage.',
    stages: [
      { type: 'goto', at: P(1, 9), text: 'Reach the Kane truck at the Harbor', radius: 90, needCar: 'truck' },
      { type: 'drive', at: P(2, 8), text: 'Deliver the truck to Dante\'s Garage', radius: 120 },
    ] },
  { id: 'm6', title: 'GETAWAY DRIVER', giver: 'Marisol Vega', reward: 2000,
    brief: 'Drive the crew out of the Meridian Bank job. Lose a 3-star wanted level.',
    stages: [
      { type: 'goto', at: P(5, 5), text: 'Reach the Meridian Bank', radius: 100 },
      { type: 'escape', at: P(4, 9), text: 'Escape! Lose the cops, reach the Safehouse', radius: 130, needHeat: 0, heatOnStart: 55 },
    ] },
  { id: 'm7', title: 'VIGILANTE NIGHTS', giver: 'Officer Cruz', reward: 1500,
    brief: 'Four Kane enforcers meet at the Marina tonight. The law cannot touch them. You can.',
    stages: [
      { type: 'kill', at: P(10, 2), text: 'Take down the Kane enforcers at the Marina (0/4)', radius: 220, count: 4, spawn: 'enforcer' },
    ] },
  { id: 'm8', title: 'THE INFORMANT', giver: 'Marisol Vega', reward: 1800,
    brief: 'Tail Kane\'s black courier from the Harbor. Do not let him see you. Then end it.',
    stages: [
      { type: 'tail', at: P(1, 9), text: 'Tail the black Vantara — stay 120-260 away', radius: 260 },
      { type: 'kill', at: P(7, 6), text: 'End the courier', radius: 220, count: 1, spawn: 'courier' },
    ] },
  { id: 'm9', title: 'RACE THE DEVIL', giver: 'Dante Cole', reward: 2500,
    brief: 'Six checkpoints, three of Kane\'s best drivers. Beat them all.',
    stages: [
      { type: 'race', text: 'Win the street race — hit all 6 checkpoints', radius: 120 },
    ] },
  { id: 'm10', title: 'KING OF VELORA', giver: 'Mama Luz', reward: 5000,
    brief: 'Kane is in his penthouse on the Strip, guarded like a king. End him. End all of it.',
    stages: [
      { type: 'kill', at: P(8, 7), text: 'Fight through Kane\'s guards at the penthouse (0/5)', radius: 240, count: 5, spawn: 'guard' },
      { type: 'kill', at: P(8, 7), text: 'Victor Kane himself. End it. (0/1)', radius: 240, count: 1, spawn: 'kane' },
      { type: 'escape', at: P(3, 4), text: 'Escape to the Coral Cafe — Velora Bay is free', radius: 120, needHeat: 0, heatOnStart: 70 },
    ] },
];

export function currentMissionDef() { return MISSIONS[S.missionIndex] || null; }

export function startMission(i) {
  const def = MISSIONS[i];
  if (!def) return false;
  S.mission = { def, stage: 0, data: {}, startedAt: S.time, kills: 0 };
  S.missionIndex = i;
  const dlg = MISSION_DIALOGUE[def.id + '_start'];
  if (dlg) for (const [who, text] of dlg) say(who, text);
  setBanner(def.title, stageText(def.stages[0]), def.brief);
  showToast('MISSION: ' + def.title, 3);
  sfx('mission');
  enterStage(def.stages[0]);
  return true;
}

export function setBanner(title, obj, sub = '') {
  S.missionBanner = { title, obj, sub };
  const t = document.getElementById('missiontitle');
  const o = document.getElementById('missionobj');
  const s = document.getElementById('missionsub');
  if (t) t.textContent = title;
  if (o) o.textContent = obj;
  if (s) s.textContent = sub;
}

function stageText(stage) {
  if (!stage) return '';
  return stage.text;
}

function enterStage(stage) {
  const m = S.mission;
  if (!m) return;
  m.data = {};
  if (stage.type === 'kill') {
    m.data.need = stage.count;
    m.data.kills = 0;
    for (let k = 0; k < stage.count; k++) {
      const hp = stage.spawn === 'kane' ? 220 : stage.spawn === 'guard' ? 130 : 100;
      spawnEnemy(stage.at.x + rand(-90, 90), stage.at.y + rand(-90, 90), hp, stage.spawn);
    }
  }
  if (stage.type === 'tail') {
    const c = makeCar('sedan', stage.at.x, stage.at.y, 0, { color: '#111111', driver: 'courier' });
    S.cars.push(c);
    m.data.tailCar = c;
    m.data.tailPath = [P(1, 9), P(4, 9), P(4, 6), P(7, 6), P(7, 4), P(8, 4)];
    m.data.tailWp = 0;
    m.data.spotted = 0;
  }
  if (stage.type === 'race') {
    window.__veloraStartRace && window.__veloraStartRace();
  }
  if (stage.heatOnStart) {
    S.wantedHeat = Math.max(S.wantedHeat, stage.heatOnStart);
    S.lastCrime = S.time;
    updateStars();
  }
  setBanner(m.def.title, stageText(stage), m.def.brief);
}

export function updateMission(dt) {
  const m = S.mission;
  if (!m) {
    const def = currentMissionDef();
    if (def && !S.missionDone[def.id] && S.mode === 'play' && !S.shotMode) {
      startMission(S.missionIndex);
    }
    return;
  }
  const stage = m.def.stages[m.stage];
  if (!stage) return;
  const p = S.player;
  const d = dist(p.x, p.y, stage.at ? stage.at.x : 0, stage.at ? stage.at.y : 0);
  switch (stage.type) {
    case 'goto':
      if (d < stage.radius) {
        if (stage.needCar) {
          if (!p.onFoot && p.car && p.car.model === stage.needCar) advanceStage();
          else if (!p.onFoot && p.car) setBanner(m.def.title, 'Wrong car! You need a ' + stage.needCar, m.def.brief);
          else setBanner(m.def.title, 'Get in a ' + stage.needCar + ' first', m.def.brief);
        } else advanceStage();
      }
      break;
    case 'drive':
      if (!p.onFoot && d < stage.radius) advanceStage();
      break;
    case 'pickup':
      if (d < stage.radius) { addCash(0); showToast('Package picked up', 2); sfx('pickup'); advanceStage(); }
      break;
    case 'deliver':
      if (d < stage.radius) advanceStage();
      break;
    case 'escape':
      if (S.wanted === 0 && d < stage.radius) advanceStage();
      else if (S.wanted > 0) setBanner(m.def.title, 'Lose the cops first! (' + S.wanted + '★) Then reach the marker', m.def.brief);
      break;
    case 'kill': {
      const txt = stage.text.replace(/\(\d+\/\d+\)/, `(${m.data.kills || 0}/${m.data.need})`);
      setBanner(m.def.title, txt, m.def.brief);
      if ((m.data.kills || 0) >= m.data.need) advanceStage();
      break;
    }
    case 'tail': {
      const c = m.data.tailCar;
      if (!c || c.dead) { advanceStage(); break; }
      // move courier along path
      const wp = m.data.tailPath[m.data.tailWp];
      const cd = dist(c.x, c.y, wp.x, wp.y);
      if (cd < 40) m.data.tailWp = (m.data.tailWp + 1) % m.data.tailPath.length;
      const a = Math.atan2(wp.y - c.y, wp.x - c.x);
      c.angle = a; c.speed = 150;
      c.x += Math.cos(a) * 150 * dt; c.y += Math.sin(a) * 150 * dt;
      const pd = dist(p.x, p.y, c.x, c.y);
      if (pd < 110) {
        m.data.spotted += dt;
        setBanner(m.def.title, 'TOO CLOSE! He sees you! Back off!', m.def.brief);
        if (m.data.spotted > 2.5) { failMission('You were spotted tailing the courier.'); return; }
      } else if (pd > 300) {
        setBanner(m.def.title, 'You lost him! Get closer!', m.def.brief);
        m.data.lost = (m.data.lost || 0) + dt;
        if (m.data.lost > 8) { failMission('You lost the courier.'); return; }
      } else {
        m.data.lost = 0;
        setBanner(m.def.title, stage.text, m.def.brief);
      }
      break;
    }
    case 'race':
      if (S.race && S.race.won) advanceStage();
      else if (S.race && S.race.lost) failMission('You lost the race. Dante is not impressed.');
      break;
  }
}

export function onEnemyKilled(e) {
  const m = S.mission;
  if (!m) return;
  const stage = m.def.stages[m.stage];
  if (stage && stage.type === 'kill') {
    m.data.kills = (m.data.kills || 0) + 1;
  }
}

function advanceStage() {
  const m = S.mission;
  m.stage++;
  if (m.stage >= m.def.stages.length) {
    completeMission();
    return;
  }
  sfx('pickup');
  enterStage(m.def.stages[m.stage]);
}

export function completeMission() {
  const m = S.mission;
  if (!m) return;
  const def = m.def;
  S.missionDone[def.id] = true;
  S.stats.missionsDone++;
  addCash(def.reward);
  S.respect += 10;
  S.mission = null;
  S.missionIndex = Math.min(S.missionIndex + 1, MISSIONS.length - 1);
  sfx('mission');
  showToast('MISSION PASSED — ' + def.title + '  +$' + def.reward, 4);
  if (def.id === 'm10') {
    const dlg = MISSION_DIALOGUE.m10_end;
    if (dlg) for (const [who, text] of dlg) say(who, text);
    setBanner('VELORA BAY IS FREE', 'You are the King of Velora Bay. Free roam — the city is yours.', 'All 10 missions complete!');
  } else {
    setBanner('MISSION PASSED', def.title + ' — next: ' + (MISSIONS[S.missionIndex] ? MISSIONS[S.missionIndex].title : 'free roam'), 'Reward $' + def.reward);
  }
  window.__veloraMissionPassed && window.__veloraMissionPassed(def);
}

export function failMission(reason) {
  const m = S.mission;
  if (!m) return;
  const def = m.def;
  S.mission = null;
  S.enemies = S.enemies.filter(e => e.dead);
  showToast('MISSION FAILED — ' + reason, 4);
  sfx('fail');
  setBanner('MISSION FAILED', def.title + ' — ' + reason, 'Talk to ' + def.giver + ' to retry. Press TAB for missions.');
  window.__veloraMissionFailed && window.__veloraMissionFailed(def, reason);
}

export function retryMission() {
  const def = currentMissionDef();
  if (def) startMission(S.missionIndex);
}
