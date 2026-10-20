import { test, expect } from "@playwright/test";
test("real startup keyboard pause restart and continuous music", async ({
  page,
}) => {
  await page.goto("./");
  await expect(page.locator("h1")).toHaveText("Rally Reactor");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await expect(page.locator("#status")).toHaveText("Serve incoming");
  await page.waitForTimeout(1700);
  await expect(page.locator("#status")).toHaveText("Rally live");
  await page.keyboard.down("w");
  await page.waitForTimeout(120);
  await page.keyboard.up("w");
  await page.keyboard.press("p");
  await expect(page.locator("#status")).toHaveText("Paused");
  const origin = await page.evaluate(
    () => window.vectorDuel.audio().startTimestamp,
  );
  await page.getByRole("button", { name: "Resume", exact: true }).click();
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  expect(
    await page.evaluate(() => window.vectorDuel.audio().startTimestamp),
  ).toBe(origin);
});
