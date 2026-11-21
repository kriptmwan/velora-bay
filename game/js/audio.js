// Velora Bay — synthesized sound: WebAudio only, no audio files, no network.
import { S } from './state.js';

let ctx = null, master = null, musicGain = null, engineOsc = null, engineGain = null;
let musicOn = true, musicTimer = null, nextNoteTime = 0, beat = 0;
const BASSLINE = [55, 0, 55, 65.41, 55, 0, 49, 58.27, 55, 0, 55, 65.41, 82.41, 73.42, 65.41, 49];
const LEAD = [220, 0, 261.63, 329.63, 0, 293.66, 261.63, 0, 220, 0, 246.94, 293.66, 329.63, 0, 293.66, 261.63];

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
    musicGain = ctx.createGain(); musicGain.gain.value = 0.14; musicGain.connect(master);
    engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 60;
    engineGain = ctx.createGain(); engineGain.gain.value = 0;
    const filt = ctx.createBiquadFilter(); filt.type = 'lowpass'; filt.frequency.value = 700;
    engineOsc.connect(filt); filt.connect(engineGain); engineGain.connect(master);
    engineOsc.start();
  } catch (e) { ctx = null; }
}

export function resumeAudio() { if (ctx && ctx.state === 'suspended') ctx.resume(); }

function noiseBuffer(dur = 0.3) {
  const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  return buf;
}

export function sfx(name, opt = {}) {
  if (!ctx || !master) return;
  try {
    const t = ctx.currentTime;
    if (name === 'shot') {
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.12);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      src.connect(g); g.connect(master); src.start();
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(180, t); o.frequency.exponentialRampToValueAtTime(60, t + 0.08);
      const og = ctx.createGain(); og.gain.setValueAtTime(0.25, t); og.gain.exponentialRampToValueAtTime(0.01, t + 0.09);
      o.connect(og); og.connect(master); o.start(); o.stop(t + 0.1);
    } else if (name === 'explosion') {
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.8);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.8);
      const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(900, t); f.frequency.exponentialRampToValueAtTime(80, t + 0.7);
      src.connect(f); f.connect(g); g.connect(master); src.start();
    } else if (name === 'pickup' || name === 'cash') {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(name === 'cash' ? 880 : 660, t);
      o.frequency.setValueAtTime(name === 'cash' ? 1320 : 990, t + 0.09);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      o.connect(g); g.connect(master); o.start(); o.stop(t + 0.26);
    } else if (name === 'mission') {
      [523.25, 659.25, 783.99, 1046.5].forEach((fr, i) => {
        const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = fr;
        const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t + i * 0.12);
        g.gain.exponentialRampToValueAtTime(0.3, t + i * 0.12 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.01, t + i * 0.12 + 0.35);
        o.connect(g); g.connect(master); o.start(t + i * 0.12); o.stop(t + i * 0.12 + 0.4);
      });
    } else if (name === 'fail') {
      const o = ctx.createOscillator(); o.type = 'sawtooth';
      o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(110, t + 0.5);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.25, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.55);
      o.connect(g); g.connect(master); o.start(); o.stop(t + 0.55);
    } else if (name === 'horn') {
      const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = 370;
      const g = ctx.createGain(); g.gain.setValueAtTime(0.15, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      o.connect(g); g.connect(master); o.start(); o.stop(t + 0.26);
    } else if (name === 'crash') {
      const src = ctx.createBufferSource(); src.buffer = noiseBuffer(0.25);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.4, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      src.connect(g); g.connect(master); src.start();
    } else if (name === 'jump') {
      const o = ctx.createOscillator(); o.type = 'sine';
      o.frequency.setValueAtTime(300, t); o.frequency.exponentialRampToValueAtTime(700, t + 0.25);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
      o.connect(g); g.connect(master); o.start(); o.stop(t + 0.3);
    } else if (name === 'siren') {
      // one two-tone wail, called repeatedly by police update
      const o = ctx.createOscillator(); o.type = 'triangle';
      o.frequency.setValueAtTime(660, t); o.frequency.linearRampToValueAtTime(880, t + 0.35);
      o.frequency.linearRampToValueAtTime(660, t + 0.7);
      const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.06, t + 0.1);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      o.connect(g); g.connect(master); o.start(); o.stop(t + 0.72);
    }
  } catch (e) { /* audio is best-effort */ }
}

export function updateEngineSound(speed, max) {
  if (!ctx || !engineOsc) return;
  const ratio = Math.abs(speed) / Math.max(1, max);
  engineOsc.frequency.value = 55 + ratio * 160 + (S.player && !S.player.onFoot ? 10 : 0);
  engineGain.gain.value = S.player && !S.player.onFoot ? 0.05 + ratio * 0.06 : 0;
}

export function startMusic() {
  if (!ctx || musicTimer) return;
  nextNoteTime = ctx.currentTime + 0.1; beat = 0;
  musicTimer = setInterval(() => {
    if (!ctx || !musicOn) return;
    while (nextNoteTime < ctx.currentTime + 0.25) {
      const step = beat % 16;
      const bass = BASSLINE[step], lead = LEAD[step];
      if (bass) playNote(bass, nextNoteTime, 0.22, 'triangle', 0.5);
      if (lead && step % 2 === 0) playNote(lead, nextNoteTime, 0.18, 'sine', 0.16);
      if (step % 4 === 0) playNote(1200, nextNoteTime, 0.03, 'square', 0.05);
      nextNoteTime += 0.24; beat++;
    }
  }, 100);
}

function playNote(freq, when, dur, type, vol) {
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, when);
  g.gain.exponentialRampToValueAtTime(vol, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  o.connect(g); g.connect(musicGain); o.start(when); o.stop(when + dur + 0.05);
}

export function toggleMusic() {
  musicOn = !musicOn;
  if (musicGain) musicGain.gain.value = musicOn ? 0.14 : 0;
  return musicOn;
}
window.__veloraToggleMusic = toggleMusic;
