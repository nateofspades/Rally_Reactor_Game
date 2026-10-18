import { test, expect } from '@playwright/test';
for (const [width,height] of [[1920,1080],[1366,768],[768,1024],[390,844],[320,568],[844,390]]) {
  test(`all gameplay and music controls fit ${width}x${height}`, async ({page}) => {
    await page.setViewportSize({width,height});
    await page.goto('./');
    await page.locator('#start').click();
    await expect(page.locator('#overlay')).toBeHidden();
    const geometry = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight,
      controls: [...document.querySelectorAll('#court,#drag,#music,#volume,#pause,#restart,#mode,#difficulty')].map(el => {
        const r=el.getBoundingClientRect(); const hit=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);
        return {id:el.id,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,reachable:hit===el || el.contains(hit)};
      })
    }));
    expect(geometry.width).toBeLessThanOrEqual(width);
    expect(geometry.height).toBeLessThanOrEqual(height);
    for(const r of geometry.controls) {
      expect(r.x,r.id).toBeGreaterThanOrEqual(0); expect(r.y,r.id).toBeGreaterThanOrEqual(0);
      expect(r.right,r.id).toBeLessThanOrEqual(width); expect(r.bottom,r.id).toBeLessThanOrEqual(height);
      expect(r.reachable,r.id).toBe(true);
    }
    await page.screenshot({path:`${process.env.PREPARATION_SCREENSHOTS || 'test-results'}/paddle-${width}x${height}.png`});
  });
}
