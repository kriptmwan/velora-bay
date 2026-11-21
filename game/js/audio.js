// audio.js — WebAudio synth: no audio files, every sound is generated.
// Engine hum, sirens, gunfire, explosions and a bass-line music loop.
// Everything is guarded: with no user gesture yet, or no AudioContext,
// every call is a silent no-op and the game keeps running.

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.enabled = true;
    this.sirenOn = false;
  }

  ensure() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.35;
      this.master.connect(this.ctx.destination);
      this._startEngineLoop();
      this._startMusic();
    } catch (e) {
      this.ctx = null;
    }
  }

  _startEngineLoop() {
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = "sawtooth";
    this.engineOsc.frequency.value = 55;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0.0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 320;
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
  }

  setEngine(speedNorm, onFoot) {
    if (!this.ctx || !this.engineGain) return;
    const target = onFoot ? 0 : 0.02 + speedNorm * 0.06;
    this.engineGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.1);
    this.engineOsc.frequency.setTargetAtTime(55 + speedNorm * 140, this.ctx.currentTime, 0.1);
  }

  setSiren(on) {
    if (on === this.sirenOn) return;
    this.sirenOn = on;
    if (!this.ctx) return;
    if (on && !this.sirenOsc) {
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenOsc.type = "sine";
      this.sirenOsc.frequency.value = 750;
      this.sirenGain = this.ctx.createGain();
      this.sirenGain.gain.value = 0.05;
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.7;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 350;
      lfo.connect(lfoGain);
      lfoGain.connect(this.sirenOsc.frequency);
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.master);
      this.sirenOsc.start();
      lfo.start();
      this._sirenLfo = lfo;
    } else if (!on && this.sirenOsc) {
      try { this.sirenOsc.stop(); if (this._sirenLfo) this._sirenLfo.stop(); } catch (e) {}
      this.sirenOsc = null;
      this.sirenGain = null;
    }
  }

  _blip(freq, dur, type, vol) {
    if (!this.ctx) return;
    try {
      const o = this.ctx.createOscillator();
      o.type = type || "square";
      o.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol || 0.15, this.ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
      o.connect(g);
      g.connect(this.master);
      o.start();
      o.stop(this.ctx.currentTime + dur);
    } catch (e) {}
  }

  _noise(dur, vol, lowpass) {
    if (!this.ctx) return;
    try {
      const len = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = lowpass || 1200;
      src.connect(f);
      f.connect(g);
      g.connect(this.master);
      src.start();
    } catch (e) {}
  }

  gunshot() { this._noise(0.12, 0.35, 2600); this._blip(140, 0.08, "square", 0.12); }
  explosion() { this._noise(0.7, 0.5, 500); this._blip(55, 0.6, "sine", 0.3); }
  pickup() { this._blip(880, 0.12, "sine", 0.18); this._blip(1320, 0.16, "sine", 0.14); }
  cash() { this._blip(1046, 0.1, "triangle", 0.2); this._blip(1568, 0.18, "triangle", 0.16); }
  missionPass() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this._blip(f, 0.22, "triangle", 0.2), i * 110)); }
  crash() { this._noise(0.25, 0.3, 800); }

  // Slow minor-key bass loop, scheduled a bar ahead, two notes per bar.
  _startMusic() {
    const bassLine = [55, 0, 65.4, 0, 49, 0, 58.3, 73.4];
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== "running") return;
      const note = bassLine[this.musicStep % bassLine.length];
      this.musicStep++;
      if (note) this._blip(note, 0.42, "triangle", 0.07);
      if (this.musicStep % 8 === 4) this._blip(220, 0.2, "sine", 0.04);
    }, 260);
  }
}
