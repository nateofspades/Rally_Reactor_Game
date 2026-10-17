import { describe, it, expect } from "vitest";
import { createGame, start, step } from "../src/rules.js";
describe("movement", () => {
  it("moves at frame independent speed and clamps paddles", () => {
    let a = createGame(),
      b = createGame();
    start(a);
    start(b);
    step(a, 0.1, { left: 1 });
    for (let i = 0; i < 10; i++) step(b, 0.01, { left: 1 });
    expect(a.paddles[0]).toBeCloseTo(b.paddles[0]);
    step(a, 10, { left: 1 });
    expect(a.paddles[0]).toBe(486);
  });
});
