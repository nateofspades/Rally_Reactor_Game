import { load, save, browserStorage } from "./storage.js";
// Orbital Relay: original composition and synthesis, Nathan Burns, MIT.
export const SCORE = Object.freeze({
  title: "Orbital Relay",
  key: "F minor",
  bpm: 112,
  motif: [
    65,
    null,
    72,
    68,
    null,
    70,
    75,
    72,
    65,
    null,
    68,
    72,
    70,
    null,
    68,
    63,
  ],
  roots: [41, 41, 49, 49, 44, 44, 51, 51],
  chords: [
    [53, 56, 60, 67],
    [53, 56, 60, 63],
    [49, 53, 56, 60],
    [49, 56, 60, 65],
    [56, 60, 63, 70],
    [56, 60, 65, 70],
    [51, 55, 58, 60],
    [51, 58, 60, 65],
  ],
});
export const DURATION = (32 * 60) / SCORE.bpm;
// Matched to the collection at default volume; full-volume peak stays below 0.37.
export const MASTER_GAIN = 1.4;
const hz = (n) => 440 * 2 ** ((n - 69) / 12);
/** Circular accumulation makes reverb-like chord tails wrap the exact loop seam. No samples or SFX. */
export function renderTrack(rate = 22050) {
  const out = new Float32Array(Math.round(DURATION * rate)),
    beat = 60 / SCORE.bpm;
  function note(midi, at, duration, level, kind) {
    const start = Math.round(at * rate),
      length = Math.round(duration * rate),
      freq = hz(midi);
    for (let j = 0; j < length; j++) {
      const t = j / rate,
        p = 2 * Math.PI * freq * t;
      let tone =
        kind === "bass"
          ? 0.8 * Math.sin(p) + 0.2 * Math.sin(3 * p)
          : kind === "lead"
            ? 0.7 * Math.sin(p) +
              0.22 * Math.sin(2 * p) +
              0.08 * Math.sin(4 * p)
            : kind === "bell"
              ? Math.sin(p) * Math.sin(1.003 * p)
              : Math.sin(p) + 0.12 * Math.sin(2.002 * p);
      const env =
        Math.min(1, t / (kind === "pad" ? 0.22 : 0.006)) *
        Math.pow(Math.max(0, 1 - j / length), kind === "pad" ? 1.5 : 2);
      out[(start + j) % out.length] += tone * env * level;
    }
  }
  for (let bar = 0; bar < 8; bar++) {
    const base = bar * 4 * beat;
    for (const n of SCORE.chords[bar]) note(n, base, 4.8 * beat, 0.025, "pad");
    for (let e = 0; e < 8; e++) {
      const at = base + (Math.floor(e / 2) + (e % 2 ? 0.58 : 0)) * beat;
      note(
        SCORE.roots[bar] + (e === 6 ? 12 : 0),
        at,
        0.42 * beat,
        0.19,
        "bass",
      );
      const m = SCORE.motif[(e + (bar % 2) * 8) % 16];
      if (m !== null)
        note(m + (bar === 5 ? 12 : 0), at + 0.02, beat * 0.3, 0.11, "lead");
      if (e % 2 === 1) note(89 + (e % 3) * 2, at, beat * 0.12, 0.025, "bell");
    }
    for (let q = 0; q < 4; q++)
      note(29, base + q * beat, 0.24 * beat, 0.13, "bass");
    if (bar % 2 === 1) {
      note(84, base + 3.5 * beat, 0.22 * beat, 0.035, "lead");
    }
  }
  return out;
}
export class Music {
  constructor({
    storage = browserStorage(),
    createContext = () => {
      const C = globalThis.AudioContext || globalThis.webkitAudioContext;
      return C ? new C() : null;
    },
  } = {}) {
    this.storage = storage;
    this.createContext = createContext;
    const p = load(storage, "music", {});
    this.enabled = p?.enabled !== false;
    this.volume = Number.isFinite(p?.volume)
      ? Math.max(0, Math.min(1, p.volume))
      : 0.65;
    this.context = null;
    this.contextCount = 0;
    this.startTimestamp = null;
    this.hidden = false;
  }
  async activate() {
    try {
      if (!this.context) {
        const c = this.createContext();
        if (!c) return false;
        this.context = c;
        this.contextCount++;
        this.master = c.createGain();
        this.master.gain.value = this.enabled ? this.volume * MASTER_GAIN : 0;
        this.analyser = c.createAnalyser();
        this.analyser.fftSize = 2048;
        this.master.connect(this.analyser);
        this.analyser.connect(c.destination);
        const pcm = renderTrack(22050),
          buffer = c.createBuffer(1, pcm.length, 22050);
        buffer.getChannelData(0).set(pcm);
        this.source = c.createBufferSource();
        this.source.buffer = buffer;
        this.source.loop = true;
        this.source.connect(this.master);
        this.startTimestamp = c.currentTime;
        this.source.start(this.startTimestamp);
        c.onstatechange = () => {
          if (c.state === "interrupted" && !this.hidden) void this.recover();
        };
      }
      return await this.recover();
    } catch {
      return false;
    }
  }
  async recover() {
    try {
      if (this.context && !this.hidden && this.context.state !== "running")
        await this.context.resume();
      if (this.hidden && this.context?.state === "running")
        await this.context.suspend();
      return this.context?.state === "running";
    } catch {
      return false;
    }
  }
  update() {
    save(this.storage, "music", { enabled: this.enabled, volume: this.volume });
    if (this.master) {
      const now = this.context.currentTime;
      this.master.gain.cancelScheduledValues(now);
      this.master.gain.setTargetAtTime(
        this.enabled ? this.volume * MASTER_GAIN : 0,
        now,
        0.025,
      );
    }
  }
  setEnabled(v) {
    this.enabled = Boolean(v);
    this.update();
  }
  setVolume(v) {
    if (Number.isFinite(v)) this.volume = Math.max(0, Math.min(1, v));
    this.update();
  }
  async visibility(hidden) {
    this.hidden = hidden;
    try {
      if (hidden) await this.context?.suspend();
      else await this.recover();
    } catch {}
  }
  snapshot() {
    return Object.freeze({
      contextCount: this.contextCount,
      startTimestamp: this.startTimestamp,
      phase: this.context
        ? (this.context.currentTime - this.startTimestamp) % DURATION
        : 0,
      enabled: this.enabled,
      volume: this.volume,
      state: this.context?.state || "idle",
      sourceCount: this.source ? 1 : 0,
      sfxCount: 0,
    });
  }
}
