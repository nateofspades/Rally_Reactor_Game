import { test, expect } from "@playwright/test";
const sizes = [
  [1920, 1080],
  [1366, 768],
  [768, 1024],
  [390, 844],
  [320, 568],
  [844, 390],
];
test("full court and controls across all six sizes", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.status() >= 400) errors.push(r.url());
  });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto("./");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  for (const [width, height] of sizes)
    await test.step(`${width}x${height}`, async () => {
      await page.setViewportSize({ width, height });
      const geo = await page.evaluate(() => {
        const r = document.querySelector("canvas").getBoundingClientRect();
        return {
          width: r.width,
          height: r.height,
          x: r.x,
          y: r.y,
          bottom: r.bottom,
          scroll: document.documentElement.scrollWidth,
          inner: innerWidth,
          paddlePixel: [
            ...document
              .querySelector("canvas")
              .getContext("2d")
              .getImageData(
                Math.floor((35 / 960) * document.querySelector("canvas").width),
                Math.floor(
                  (270 / 540) * document.querySelector("canvas").height,
                ),
                1,
                1,
              ).data,
          ],
          controls: [
            ...document.querySelectorAll("#pause,#restart,#drag,#music"),
          ].map((e) => {
            const b = e.getBoundingClientRect();
            return { height: b.height, right: b.right, bottom: b.bottom };
          }),
        };
      });
      expect(geo.width / geo.height).toBeCloseTo(16 / 9, 1);
      expect(geo.x).toBeGreaterThanOrEqual(0);
      expect(geo.bottom).toBeLessThanOrEqual(height);
      expect(geo.scroll).toBeLessThanOrEqual(width);
      expect(geo.paddlePixel[1]).toBeGreaterThan(200);
      expect(geo.paddlePixel[0]).toBeLessThan(180);
      for (const c of geo.controls) {
        expect(c.height).toBeGreaterThanOrEqual(44);
        expect(c.right).toBeLessThanOrEqual(width);
        if (width > 600) expect(c.bottom).toBeLessThanOrEqual(height);
      }
      expect(errors).toEqual([]);
    });
});
test("keyboard actually moves both players independently", async ({ page }) => {
  await page.goto("./");
  await page.locator("#mode").selectOption("duo");
  await expect(page.locator("#drag")).toContainText("KEYBOARD ONLY");
  await expect(page.locator("#instructions")).toContainText(
    "requires a keyboard",
  );
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.keyboard.down("w");
  await page.keyboard.down("ArrowDown");
  await page.waitForTimeout(150);
  await page.keyboard.up("w");
  await page.keyboard.up("ArrowDown");
  const g = await page.evaluate(() => window.vectorDuel.state());
  expect(g.paddles[0]).toBeLessThan(270);
  expect(g.paddles[1]).toBeGreaterThan(270);
});
test("pause freezes and scoring victory persists across reload", async ({
  page,
}) => {
  test.skip(!!process.env.LIVE_URL, "Scenarios are localhost only");
  await page.goto("./?test");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  const transport = await page.evaluate(() => window.vectorDuel.audio());
  await page.keyboard.press("p");
  let before = await page.evaluate(() => window.vectorDuel.state());
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => window.vectorDuel.state())).toEqual(before);
  await page.evaluate(() => {
    window.__test.scenario({
      state: "playing",
      score: [9, 4],
      longest: 14,
      ball: { x: 968, y: 10, vx: 500, vy: 0 },
    });
    window.__test.advance(0.02);
  });
  await expect(page.locator("#overlayTitle")).toHaveText("Victory.");
  expect(
    await page.evaluate(() => window.vectorDuel.audio().startTimestamp),
  ).toBe(transport.startTimestamp);
  await expect(page.locator("#scoreLeft")).toHaveText("10");
  await expect(page.locator("#scoreRight")).toHaveText("04");
  await page.reload();
  await expect(page.locator("#best")).toHaveText("14");
  await expect(page.locator("#record")).toHaveText("10");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.evaluate(() => {
    window.__test.scenario({
      state: "playing",
      score: [1, 9],
      ball: { x: -8, y: 10, vx: -500, vy: 0 },
    });
    window.__test.advance(0.02);
  });
  await expect(page.locator("#overlayTitle")).toHaveText("Game Over.");
  const overAudio = await page.evaluate(() => window.vectorDuel.audio());
  expect(overAudio.contextCount).toBe(1);
  expect(overAudio.sourceCount).toBe(1);
  await page.getByRole("button", { name: "Play again", exact: true }).click();
  await expect(page.locator("#scoreLeft")).toHaveText("00");
});
test("resize orientation and visibility pause keep transport identity", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.keyboard.press("p");
  let g = await page.evaluate(() => window.vectorDuel.state()),
    a = await page.evaluate(() => window.vectorDuel.audio());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.setViewportSize({ width: 844, height: 390 });
  expect(await page.evaluate(() => window.vectorDuel.state())).toEqual(g);
  const b = await page.evaluate(() => window.vectorDuel.audio());
  expect(b.contextCount).toBe(1);
  expect(b.startTimestamp).toBe(a.startTimestamp);
  expect(b.phase).not.toBe(a.phase);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#status")).toHaveText("Paused");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(page.locator("#status")).toHaveText("Paused");
});
test("true touch context maps scaled court and obstruction-free rail", async ({
  browser,
  browserName,
}) => {
  test.skip(browserName === "firefox", "Firefox does not support isMobile");
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(process.env.LIVE_URL || "http://127.0.0.1:4187/");
  await page.getByRole("button", { name: "Start match", exact: true }).tap();
  let r = await page.locator("canvas").boundingBox();
  await page.touchscreen.tap(r.x + r.width * 0.2, r.y + r.height * 0.25);
  // WebKit quantizes injected touch positions to CSS pixels. Tolerance is one
  // CSS pixel mapped into logical court units, independent of backing DPI.
  await expect
    .poll(async () =>
      Math.abs(
        (await page.evaluate(() => window.vectorDuel.state())).paddles[0] - 135,
      ),
    )
    .toBeLessThanOrEqual(540 / r.height + 0.01);
  let rail = await page.locator("#drag").boundingBox();
  await page.touchscreen.tap(rail.x + rail.width * 0.9, rail.y + 22);
  await expect
    .poll(async () =>
      Math.abs(
        (await page.evaluate(() => window.vectorDuel.state())).paddles[0] -
          442.8,
      ),
    )
    .toBeLessThanOrEqual(432 / rail.width + 0.01);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await context.close();
});
