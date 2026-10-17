import { it, expect } from "vitest";
import { renderTrack, Music, DURATION, SCORE } from "../src/music.js";
it("original F minor 112 BPM composition has audible headroom and seam", () => {
  let samples = renderTrack(12000);
  let sum = 0,
    peak = 0;
  for (const x of samples) {
    sum += x * x;
    peak = Math.max(peak, Math.abs(x));
  }
  expect(SCORE.bpm).toBe(112);
  expect(SCORE.key).toBe("F minor");
  expect(samples.length).toBe(Math.round(DURATION * 12000));
  expect(Math.sqrt(sum / samples.length)).toBeGreaterThan(0.03);
  expect(peak).toBeLessThan(0.9);
  expect(Math.abs(samples[0] - samples.at(-1))).toBeLessThan(0.08);
});
it("single context and looping source survive mute volume visibility and repeated gestures", async () => {
  let contexts = 0,
    sources = 0,
    starts = 0;
  const param = { value: 0, setTargetAtTime() {}, cancelScheduledValues() {} };
  const ctx = {
    currentTime: 2,
    sampleRate: 100,
    state: "running",
    destination: {},
    createGain: () => ({ gain: param, connect() {} }),
    createAnalyser: () => ({ connect() {}, fftSize: 0 }),
    createBuffer: (_, l) => ({ getChannelData: () => new Float32Array(l) }),
    createBufferSource: () => {
      sources++;
      return {
        connect() {},
        start() {
          starts++;
        },
      };
    },
    resume: async () => {
      ctx.state = "running";
    },
    suspend: async () => {
      ctx.state = "suspended";
    },
  };
  let data = new Map(),
    storage = {
      getItem: (k) => data.get(k),
      setItem: (k, v) => data.set(k, v),
    };
  let m = new Music({
    storage,
    createContext: () => {
      contexts++;
      return ctx;
    },
  });
  expect(m.snapshot().contextCount).toBe(0);
  await m.activate();
  await m.activate();
  expect(m.source.loop).toBe(true);
  let origin = m.snapshot().startTimestamp;
  m.setEnabled(false);
  m.setVolume(0.3);
  m.setEnabled(true);
  await m.visibility(true);
  await m.visibility(false);
  await m.activate();
  expect([contexts, sources, starts]).toEqual([1, 1, 1]);
  expect(m.snapshot().startTimestamp).toBe(origin);
  expect(m.snapshot().volume).toBe(0.3);
  expect(new Music({ storage }).volume).toBe(0.3);
  m.setEnabled(false);
  expect(new Music({ storage }).enabled).toBe(false);
});
it("audio preference failure is nonfatal and bad volume bounded", () => {
  let m = new Music({
    storage: {
      getItem() {
        throw Error();
      },
      setItem() {
        throw Error();
      },
    },
  });
  m.setVolume(4);
  expect(m.volume).toBe(1);
  m.setEnabled(false);
  expect(m.enabled).toBe(false);
});
