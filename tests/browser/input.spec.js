import { test, expect } from "@playwright/test";
test("captured drag outside scaled court clamps and releases", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  const r = await page.locator("canvas").boundingBox();
  await page.mouse.move(r.x + r.width * 0.2, r.y + r.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(r.x + r.width * 0.2, r.y - 20, { steps: 4 });
  expect(await page.evaluate(() => window.vectorDuel.state().paddles[0])).toBe(
    54,
  );
  await page.mouse.move(r.x + r.width * 0.2, r.y + r.height + 50, { steps: 4 });
  expect(await page.evaluate(() => window.vectorDuel.state().paddles[0])).toBe(
    486,
  );
  await page.mouse.up();
  await page.mouse.move(r.x + r.width * 0.2, r.y);
  expect(await page.evaluate(() => window.vectorDuel.state().paddles[0])).toBe(
    486,
  );
});
test("Chromium native mobile touch drag uses capture across court bounds", async ({
  browser,
  browserName,
}) => {
  test.skip(
    browserName !== "chromium",
    "CDP touch injection is Chromium-only; WebKit has a separate real touch-context tap test",
  );
  const c = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 2,
  });
  const p = await c.newPage();
  await p.goto(process.env.LIVE_URL || "http://127.0.0.1:4187/");
  await p.getByRole("button", { name: "Start match", exact: true }).tap();
  const r = await p.locator("canvas").boundingBox(),
    cdp = await c.newCDPSession(p);
  const x = r.x + r.width * 0.15;
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x, y: r.y + r.height * 0.5 }],
  });
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: r.y + r.height * 0.8 }],
  });
  expect(
    await p.evaluate(() => window.vectorDuel.state().paddles[0]),
  ).toBeCloseTo(432, 0);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x, y: r.y + r.height + 30 }],
  });
  expect(await p.evaluate(() => window.vectorDuel.state().paddles[0])).toBe(
    486,
  );
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  await c.close();
});
test("touch rail provides a keyboard-accessible slider", async ({ page }) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.locator("#drag").focus();
  await page.keyboard.press("Home");
  expect(await page.evaluate(() => window.vectorDuel.state().paddles[0])).toBe(
    54,
  );
  await page.keyboard.press("End");
  expect(await page.evaluate(() => window.vectorDuel.state().paddles[0])).toBe(
    486,
  );
});
