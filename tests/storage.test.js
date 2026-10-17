import { it, expect } from "vitest";
import { load, save } from "../src/storage.js";
it("persists records and handles denied storage", () => {
  const m = new Map(),
    s = { getItem: (k) => m.get(k), setItem: (k, v) => m.set(k, v) };
  save(s, "record", { longest: 16, record: 10 });
  expect(load(s, "record", {})).toEqual({ longest: 16, record: 10 });
  const bad = {
    getItem() {
      throw Error();
    },
    setItem() {
      throw Error();
    },
  };
  expect(load(bad, "record", {})).toEqual({});
  expect(save(bad, "record", {})).toBe(false);
  s.setItem("vector-duel.record", "bad");
  expect(load(s, "record", {})).toEqual({});
});
