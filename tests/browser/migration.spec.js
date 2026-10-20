import { test, expect } from '@playwright/test';

test('exact final identity and legacy origin-wide records survive path migration', async ({ page }) => {
  const target = process.env.LIVE_URL || 'http://127.0.0.1:4187/';
  const oldPath = new URL('/pong_game/', target).href;
  // Mock only the retired path document, keeping real browser origin-wide storage.
  await page.route(oldPath, route => route.fulfill({contentType:'text/html', body:'<!doctype html><title>Storage seed</title>'}));
  await page.goto(oldPath);
  await page.evaluate(() => {
    localStorage.setItem('vector-duel.record', JSON.stringify({longest:23,record:9}));
    localStorage.setItem('vector-duel.music', JSON.stringify({enabled:false,volume:0.37}));
  });
  await page.goto(target);
  await expect(page).toHaveTitle('Rally Reactor');
  await expect(page.locator('h1')).toHaveText('Rally Reactor');
  await expect(page.locator('#best')).toHaveText('23');
  await expect(page.locator('#record')).toHaveText('9');
  await expect(page.locator('#music')).toHaveText('Music Off');
  await expect(page.locator('#volume')).toHaveValue('0.37');
});

for (const [width,height] of [[1920,1080],[1366,768],[768,1024],[390,844],[320,568],[844,390]]) {
  test(`initial fit and native context play ${width}x${height}`, async ({ browser, browserName }) => {
    const mobile = width < 1000;
    test.skip(mobile && browserName === 'firefox', 'Firefox does not support isMobile; desktop geometry covered separately');
    const context = await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1});
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror', e=>errors.push(e.message));
    page.on('console', m=>{if(m.type()==='error') errors.push(m.text());});
    page.on('requestfailed', r=>errors.push(r.url()+': '+r.failure()?.errorText));
    page.on('response', r=>{if(r.status()>=400) errors.push(`${r.status()} ${r.url()}`);});
    try {
      await page.goto(process.env.LIVE_URL || 'http://127.0.0.1:4187/');
      await expect(page).toHaveTitle('Rally Reactor');
      const fit=async()=>{
        const result=await page.evaluate(()=>({width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight,rects:[...document.querySelectorAll('#court,#drag,#music,#volume,#pause,#restart,#mode,#difficulty')].map(e=>{const r=e.getBoundingClientRect();return {id:e.id,x:r.x,y:r.y,right:r.right,bottom:r.bottom};})}));
        expect(result.width).toBeLessThanOrEqual(width);expect(result.height).toBeLessThanOrEqual(height);
        for(const r of result.rects){expect(r.x,r.id).toBeGreaterThanOrEqual(0);expect(r.y,r.id).toBeGreaterThanOrEqual(0);expect(r.right,r.id).toBeLessThanOrEqual(width);expect(r.bottom,r.id).toBeLessThanOrEqual(height);}
      };
      await fit();
      if(mobile) await page.locator('#start').tap(); else await page.locator('#start').click();
      await expect.poll(()=>page.evaluate(()=>window.vectorDuel.audio().state),{timeout:15000}).toBe('running');
      // High-resolution software rendering on a single CPU can delay RAF;
      // wait for real simulation readiness, never replace it with a scenario.
      await expect.poll(()=>page.evaluate(()=>window.vectorDuel.state().state), {timeout:30000}).toBe('playing');
      if(mobile){
        const r=await page.locator('#drag').boundingBox();
        await page.touchscreen.tap(r.x+r.width*0.85,r.y+r.height/2);
        await expect.poll(()=>page.evaluate(()=>window.vectorDuel.state().paddles[0])).toBeGreaterThan(400);
      } else {
        await page.keyboard.down('w');await page.waitForTimeout(120);await page.keyboard.up('w');
        expect(await page.evaluate(()=>window.vectorDuel.state().paddles[0])).toBeLessThan(270);
      }
      await fit();
      expect(errors).toEqual([]);
    } finally { await context.close(); }
  });
}
