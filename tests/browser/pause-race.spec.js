import { test, expect } from "@playwright/test";
test("pause click survives serve transition between pointer down and up", async ({
  page,
}, info) => {
  test.skip(!!process.env.LIVE_URL, "Scenario hook is localhost only");
  await page.goto("./?test");
  await page.getByRole("button", { name: "Start match", exact: true }).click();
  await page.evaluate(() => {
    window.__events = [];
    for (const name of ["click", "blur", "visibilitychange"])
      window.addEventListener(
        name,
        (e) =>
          window.__events.push({
            event: name,
            target: e.target.id || e.target.nodeName || "window",
            state: window.vectorDuel.state().state,
          }),
        true,
      );
    window.__test.scenario({ state: "countdown", countdown: 60 });
  });
  const b = await page.locator("#pause").boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
  await page.mouse.down();
  await page.evaluate(() => {
    window.__test.scenario({ countdown: 0.001 });
    window.__test.advance(0.01);
  });
  await page.mouse.up();
  await info.attach("pause-event-trace", {
    body: JSON.stringify(await page.evaluate(() => window.__events)),
    contentType: "application/json",
  });
  await expect(page.locator("#status")).toHaveText("Paused");
});
