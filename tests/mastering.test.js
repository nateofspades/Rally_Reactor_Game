import { it, expect } from "vitest";
import { Music, renderTrack } from "../src/music.js";

it("default and recovered master levels match the arcade collection without clipping", async () => {
  const parameter = {
    value: 0,
    cancelScheduledValues() {},
    setTargetAtTime(value) {
      this.value = value;
    },
  };
  const context = {
    state: "running",
    currentTime: 3,
    destination: {},
    sampleRate: 100,
    createGain: () => ({ gain: parameter, connect() {} }),
    createAnalyser: () => ({ connect() {} }),
    createBuffer: (_, length) => ({
      getChannelData: () => new Float32Array(length),
    }),
    createBufferSource: () => ({ connect() {}, start() {} }),
    resume: async () => {},
    suspend: async () => {},
  };
  const music = new Music({ storage: null, createContext: () => context });
  await music.activate();
  const samples = renderTrack(12000);
  let energy = 0,
    peak = 0;
  for (const sample of samples) {
    energy += sample * sample;
    peak = Math.max(peak, Math.abs(sample));
  }
  const rawRms = Math.sqrt(energy / samples.length);
  // The other two games measure 0.042–0.048 RMS at their defaults.
  expect(rawRms * parameter.value).toBeGreaterThanOrEqual(0.04);
  expect(rawRms * parameter.value).toBeLessThanOrEqual(0.06);
  const initialGain = parameter.value;
  music.setEnabled(false);
  expect(parameter.value).toBe(0);
  music.setEnabled(true);
  expect(parameter.value).toBe(initialGain);
  music.setVolume(1);
  expect(peak * parameter.value).toBeLessThan(0.65);
  expect(music.snapshot().contextCount).toBe(1);
  expect(music.snapshot().sourceCount).toBe(1);
});
