import { test, expect } from "@playwright/test";
test("released winning-point movement never leaks into replay", async ({
  page,
}) => {
  test.skip(!!process.env.LIVE_URL, "Scenario hook is localhost only");
  await page.goto("./?test");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.keyboard.down("s");
  await page.evaluate(() => {
    window.__test.scenario({
      state: "playing",
      score: [9, 0],
      ball: { x: 968, y: 10, vx: 500, vy: 0 },
    });
    window.__test.advance(0.02);
  });
  await expect(page.locator("#status")).toHaveText("Match complete");
  await page.keyboard.up("s");
  await page.getByRole("button", { name: "Play again", exact: true }).click();
  await page.waitForTimeout(180);
  expect(await page.evaluate(() => window.vectorDuel.state().paddles[0])).toBe(
    270,
  );
});
test("unrelated secondary pointer release preserves the captured drag", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  const r = await page.locator("canvas").boundingBox();
  await page.mouse.move(r.x + r.width * 0.2, r.y + r.height * 0.5);
  await page.mouse.down();
  await page
    .locator("#drag")
    .dispatchEvent("pointerdown", {
      pointerId: 999,
      pointerType: "touch",
      isPrimary: false,
    });
  await page
    .locator("#drag")
    .dispatchEvent("pointerup", {
      pointerId: 999,
      pointerType: "touch",
      isPrimary: false,
    });
  await page.mouse.move(r.x + r.width * 0.2, r.y + r.height * 0.8);
  expect(
    await page.evaluate(() => window.vectorDuel.state().paddles[0]),
  ).toBeGreaterThan(350);
  await page.mouse.up();
});
test("court interaction restores keyboard focus after volume input", async ({
  page,
}) => {
  await page.goto("./");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.locator("#volume").focus();
  const r = await page.locator("canvas").boundingBox();
  await page.mouse.click(r.x + r.width * 0.2, r.y + r.height * 0.5);
  const before = await page.evaluate(
    () => window.vectorDuel.state().paddles[0],
  );
  await page.keyboard.down("w");
  await page.waitForTimeout(180);
  await page.keyboard.up("w");
  expect(
    await page.evaluate(() => window.vectorDuel.state().paddles[0]),
  ).toBeLessThan(before - 10);
});
