import assert from "node:assert/strict";
import { writeFile, mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
const url = process.env.LIVE_URL || "https://nateofspades.github.io/pong_game/";
const destination =
  process.env.DELIVERY_DIR || "/root/arcade-projects/delivery";
const results = [];
await mkdir(destination, { recursive: true });
const browser = await chromium.launch();
try {
  for (const [width, height] of [
    [1366, 768],
    [390, 844],
    [844, 390],
  ]) {
    const mobile = width !== 1366;
    const context = await browser.newContext({
      viewport: { width, height },
      isMobile: mobile,
      hasTouch: mobile,
      deviceScaleFactor: mobile ? 2 : 1,
    });
    const page = await context.newPage(),
      errors = [],
      failures = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    page.on("requestfailed", (r) =>
      failures.push({ url: r.url(), error: r.failure()?.errorText }),
    );
    page.on("response", (r) => {
      if (r.status() >= 400)
        failures.push({ url: r.url(), status: r.status() });
    });
    const response = await page.goto(url);
    assert.equal(response.status(), 200);
    assert.equal(await page.evaluate(() => typeof window.__test), "undefined");
    await page
      .getByRole("button", { name: "Start match", exact: true })
      .click();
    await expect
      .poll(() => page.evaluate(() => window.vectorDuel.audio().state), {
        timeout: 15000,
      })
      .toBe("running");
    await page.waitForFunction(
      () => window.vectorDuel.state().state === "playing",
      null,
      { timeout: 30000 },
    );
    const original = await page.evaluate(() => window.vectorDuel.audio());
    if (mobile) {
      const r = await page.locator("canvas").boundingBox();
      await page.touchscreen.tap(r.x + r.width * 0.15, r.y + r.height * 0.25);
      assert.ok(
        Math.abs(
          (await page.evaluate(() => window.vectorDuel.state().paddles[0])) -
            135,
        ) < 2,
      );
      const rail = await page.locator("#drag").boundingBox();
      await page.touchscreen.tap(rail.x + rail.width * 0.9, rail.y + 22);
      assert.ok(
        Math.abs(
          (await page.evaluate(() => window.vectorDuel.state().paddles[0])) -
            442.8,
        ) < 2,
      );
    } else {
      await page.keyboard.down("w");
      await page.waitForTimeout(180);
      await page.keyboard.up("w");
      assert.ok(
        (await page.evaluate(() => window.vectorDuel.state().paddles[0])) < 270,
      );
    }
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    const paused = await page.evaluate(() => window.vectorDuel.state());
    await page.waitForTimeout(100);
    assert.deepEqual(
      await page.evaluate(() => window.vectorDuel.state()),
      paused,
    );
    if (width === 390) {
      await page.setViewportSize({ width: 844, height: 390 });
      assert.deepEqual(
        await page.evaluate(() => window.vectorDuel.state()),
        paused,
      );
      await page.setViewportSize({ width: 390, height: 844 });
    }
    await page.getByRole("button", { name: "Resume", exact: true }).click();
    await page.getByRole("button", { name: "Music On", exact: true }).click();
    assert.equal(
      await page.evaluate(() => window.vectorDuel.audio().enabled),
      false,
    );
    await page.getByRole("button", { name: "Music Off", exact: true }).click();
    await page.locator("#volume").fill("0.4");
    await page.getByRole("button", { name: "Restart", exact: true }).click();
    const after = await page.evaluate(() => window.vectorDuel.audio());
    assert.equal(after.startTimestamp, original.startTimestamp);
    assert.equal(after.contextCount, 1);
    assert.equal(after.sourceCount, 1);
    assert.equal(after.volume, 0.4);
    assert.equal(after.sfxCount, 0);
    const geo = await page.evaluate(() => {
      const r = document.querySelector("canvas").getBoundingClientRect();
      return {
        width: r.width,
        height: r.height,
        left: r.left,
        right: r.right,
        bottom: r.bottom,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth,
        buttons: [
          ...document.querySelectorAll("#pause,#restart,#music,#drag"),
        ].map((e) => {
          const b = e.getBoundingClientRect();
          return {
            id: e.id,
            height: b.height,
            right: b.right,
            bottom: b.bottom,
          };
        }),
      };
    });
    assert.ok(Math.abs(geo.width / geo.height - 16 / 9) < 0.02);
    assert.ok(geo.left >= 0 && geo.right <= width && geo.bottom <= height);
    assert.ok(geo.scrollWidth <= width);
    for (const b of geo.buttons) {
      assert.ok(b.height >= 44);
      assert.ok(b.right <= width);
      if (width > 600) assert.ok(b.bottom <= height);
    }
    await page.waitForFunction(
      () => window.vectorDuel.state().state === "playing",
      null,
      { timeout: 30000 },
    );
    const screenshot = `${destination}/pong_game-live-${width}x${height}.png`;
    await page.screenshot({ path: screenshot, fullPage: true });
    assert.deepEqual(errors, []);
    assert.deepEqual(failures, []);
    results.push({
      viewport: { width, height },
      mobile,
      passed: true,
      httpStatus: response.status(),
      errors,
      requestFailures: failures,
      geometry: geo,
      audioBefore: original,
      audioAfter: after,
      screenshot,
    });
    await context.close();
  }
  const request = await browser.newContext(),
    page = await request.newPage();
  const image = await page.request.get(
    new URL("assets/screenshots/gameplay.png", url).href,
  );
  assert.equal(image.status(), 200);
  const readme = await page.request.get(
    "https://raw.githubusercontent.com/nateofspades/pong_game/main/README.md",
  );
  assert.equal(readme.status(), 200);
  const text = await readme.text();
  assert.equal(text.split("\n")[0], "# Pong");
  assert.ok(text.includes("[Play live — Vector Duel](" + url + ")"));
  assert.ok(
    text.includes("![Active gameplay](assets/screenshots/gameplay.png)"),
  );
  const report = {
    url,
    verifiedAt: new Date().toISOString(),
    browser: "chromium",
    viewports: results,
    screenshotPublicStatus: image.status(),
    readme: {
      firstHeading: "# Pong",
      liveLink: url,
      embeddedScreenshot: true,
      status: readme.status(),
    },
    limitations: [
      "Headless browser emulation, not physical-device touch or subjective loudness testing.",
    ],
  };
  await writeFile(
    `${destination}/pong_game-live.json`,
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
  await request.close();
} finally {
  await browser.close();
}
