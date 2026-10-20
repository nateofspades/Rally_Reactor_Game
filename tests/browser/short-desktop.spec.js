import { test, expect } from '@playwright/test';

test('short desktop overlays keep text and primary controls fully inside the court', async ({ page }) => {
  for (const height of [601, 620, 660]) {
    await page.setViewportSize({width:1366, height});
    await page.goto(process.env.LIVE_URL ? './' : './?test');
    const fit = async () => {
      const geometry = await page.evaluate(() => {
        const court = document.querySelector('#court').getBoundingClientRect();
        return [...document.querySelector('#overlay').children].map(el => {
          const r = el.getBoundingClientRect();
          return {id:el.id, top:r.top, bottom:r.bottom, left:r.left, right:r.right, court:{top:court.top,bottom:court.bottom,left:court.left,right:court.right}};
        });
      });
      for (const r of geometry) {
        expect(r.top, r.id).toBeGreaterThanOrEqual(r.court.top);
        expect(r.bottom, r.id).toBeLessThanOrEqual(r.court.bottom);
        expect(r.left, r.id).toBeGreaterThanOrEqual(r.court.left);
        expect(r.right, r.id).toBeLessThanOrEqual(r.court.right);
      }
    };
    await fit();
    await page.locator('#start').click();
    await page.locator('#pause').click();
    await expect(page.locator('#status')).toHaveText('Paused');
    await fit();
    await page.locator('#start').click();
    await expect(page.locator('#status')).not.toHaveText('Paused');
    if (!process.env.LIVE_URL) {
      for (const mode of ['solo', 'duo']) {
        for (const winner of [0, 1]) {
          await page.evaluate(({mode, winner}) => window.__test.scenario({state:'over', mode, winner, score:winner === 0 ? [10,4] : [4,10]}), {mode, winner});
          await fit();
        }
      }
    }
  }
});
