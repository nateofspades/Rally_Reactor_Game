import { test, expect } from "@playwright/test";
test("real Web Audio loop renders audible RMS and clean headroom", async ({
  page,
}, info) => {
  await page.goto("./");
  const m = await page.evaluate(async () => {
    const { renderTrack, DURATION } = await import("./src/music.js");
    const rate = 22050,
      pcm = renderTrack(rate),
      C = window.OfflineAudioContext || window.webkitOfflineAudioContext,
      c = new C(1, pcm.length, rate),
      b = c.createBuffer(1, pcm.length, rate);
    b.copyToChannel(pcm, 0);
    const s = c.createBufferSource(),
      g = c.createGain();
    s.buffer = b;
    s.loop = true;
    g.gain.value = 0.65 * 0.65;
    s.connect(g).connect(c.destination);
    s.start();
    const rendered = await c.startRendering(),
      data = rendered.getChannelData(0);
    let sum = 0,
      peak = 0;
    for (const v of data) {
      sum += v * v;
      peak = Math.max(peak, Math.abs(v));
    }
    return {
      rms: Math.sqrt(sum / data.length),
      peak,
      duration: DURATION,
      seamDelta: Math.abs(data[0] - data.at(-1)),
    };
  });
  await info.attach("offline-audio-metrics", {
    body: JSON.stringify(m),
    contentType: "application/json",
  });
  expect(m.rms).toBeGreaterThan(0.015);
  expect(m.peak).toBeLessThan(0.85);
  expect(m.seamDelta).toBeLessThan(0.05);
});
test("one audio transport survives every UI transition and persists preferences", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Original = window.AudioContext || window.webkitAudioContext;
    window.audioNodeCounts = { contexts: 0, sources: 0, oscillators: 0 };
    window.AudioContext = function (...args) {
      const c = new Original(...args);
      window.audioNodeCounts.contexts++;
      for (const [method, key] of [
        ["createBufferSource", "sources"],
        ["createOscillator", "oscillators"],
      ]) {
        const fn = c[method].bind(c);
        c[method] = (...args) => {
          window.audioNodeCounts[key]++;
          return fn(...args);
        };
      }
      return c;
    };
  });
  await page.goto("./");
  expect(
    await page.evaluate(() => window.vectorDuel.audio().contextCount),
  ).toBe(0);
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => window.vectorDuel.audio().state))
    .toBe("running");
  const original = await page.evaluate(() => window.vectorDuel.audio());
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect(page.locator("#status")).toHaveText("Paused");
  // Running state can precede the first native audio callback on fast CI.
  await expect
    .poll(() => page.evaluate(() => window.vectorDuel.audio().phase), {
      timeout: 10000,
    })
    .not.toBe(original.phase);
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole("button", { name: "Music On", exact: true }).click();
  expect(await page.evaluate(() => window.vectorDuel.audio().enabled)).toBe(
    false,
  );
  await page.getByRole("button", { name: "Music Off", exact: true }).click();
  await page.locator("#volume").fill("0.35");
  const after = await page.evaluate(() => window.vectorDuel.audio());
  expect(after.startTimestamp).toBe(original.startTimestamp);
  expect(after.contextCount).toBe(1);
  expect(after.sourceCount).toBe(1);
  expect(after.sfxCount).toBe(0);
  expect(await page.evaluate(() => window.audioNodeCounts)).toEqual({
    contexts: 1,
    sources: 1,
    oscillators: 0,
  });
  expect(after.volume).toBe(0.35);
  await page.getByRole("button", { name: "Music On", exact: true }).click();
  await page.reload();
  expect(await page.evaluate(() => window.vectorDuel.audio())).toMatchObject({
    enabled: false,
    volume: 0.35,
    contextCount: 0,
  });
});
test("live analyser responds to mute unmute and volume without new layers", async ({
  page,
}, info) => {
  test.skip(!!process.env.LIVE_URL, "Analyser access is localhost gated");
  await page.goto("./?test");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  const measure = async () =>
    page.evaluate(async () => {
      const a = window.__test.analyser();
      let sum = 0,
        peak = 0,
        n = 0;
      for (let j = 0; j < 12; j++) {
        await new Promise((r) => setTimeout(r, 25));
        const data = new Float32Array(a.fftSize);
        a.getFloatTimeDomainData(data);
        for (const v of data) {
          sum += v * v;
          peak = Math.max(peak, Math.abs(v));
          n++;
        }
      }
      return { rms: Math.sqrt(sum / n), peak };
    });
  let audible;
  await expect
    .poll(
      async () => {
        audible = await measure();
        return audible.rms;
      },
      { timeout: 10000 },
    )
    .toBeGreaterThan(0.004);
  expect(audible.peak).toBeLessThan(0.85);
  await page.getByRole("button", { name: "Music On", exact: true }).click();
  await page.waitForTimeout(300);
  let muted = await measure();
  expect(muted.rms).toBeLessThan(0.001);
  await page.getByRole("button", { name: "Music Off", exact: true }).click();
  let unmuted;
  await expect
    .poll(
      async () => {
        unmuted = await measure();
        return unmuted.rms;
      },
      { timeout: 10000 },
    )
    .toBeGreaterThan(0.004);
  await info.attach("live-audio-metrics", {
    body: JSON.stringify({ audible, muted, unmuted }),
    contentType: "application/json",
  });
});
