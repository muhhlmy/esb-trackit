// Local built-app check; no production credentials or API writes.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
const root = resolve('frontend/dist');
const server = createServer(async (req, res) => {
  try {
    const path = new URL(req.url, 'http://localhost').pathname;
    const file = resolve(root, path.startsWith('/assets/') ? '.' + path : 'index.html');
    res.setHeader('Content-Type', {'.js':'text/javascript','.css':'text/css','.html':'text/html'}[extname(file)] || 'application/octet-stream');
    res.end(await readFile(file));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch();
try {
  for (const reducedMotion of ['no-preference', 'reduce']) {
    for (const width of [360, 390, 768, 1023, 1024, 1440]) {
      const context = await browser.newContext({viewport:{width,height:800}, reducedMotion});
      const user = {id:1,nama:'Fixture',role:'superadmin',permissions:{dashboard:'full'}};
      await context.addInitScript(user => localStorage.setItem('user',JSON.stringify(user)),user);
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        if (!url.pathname.startsWith('/api/')) return route.continue();
        assert.equal(route.request().method(),'GET');
        return route.fulfill({json:url.pathname === '/api/auth/me' ? user : url.pathname === '/api/assets/stats' ? {totalAssets:0,byStatus:[],byLocation:[],recentAssets:[]} : []});
      });
      const page = await context.newPage();
      await page.goto(origin+'/dashboard');
      const input = page.locator('#global-main-search');
      await expect(input).toBeHidden();
      if (width >= 768) {
        const search = page.getByRole('button', {name:'Buka pencarian',exact:true});
        await search.click();
        await expect(input).toBeVisible();
        await expect(input).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(input).toBeHidden();
        await expect(search).toBeFocused();
      }
      await page.keyboard.press('Control+k');
      await expect(page.locator(width < 768 ? '#mobile-overlay-search-input' : '#global-main-search')).toBeFocused();
      await page.keyboard.press('Escape');
      await expect(input).toBeHidden();
      const sidebar = page.locator('#app-navigation');
      const nav = page.locator('.clean-bottom-nav');
      if (width >= 1024) {
        await expect(sidebar).toBeVisible();
        await expect(nav).toBeHidden();
      } else {
        await expect(sidebar).toBeHidden();
        const button = nav.getByRole('button',{name:'Menu lainnya'});
        await button.click();
        const menu = page.locator('#mobile-more-menu');
        await expect(menu).toBeVisible();
        await expect.poll(() => menu.evaluate(el => getComputedStyle(el).transform)).toBe('none');
        const geometry = await menu.evaluate(el => {
          const r = el.getBoundingClientRect();
          const n = document.querySelector('.clean-bottom-nav').getBoundingClientRect();
          return {gap:n.top-r.bottom,left:r.left,right:r.right,width:innerWidth,overflow:document.documentElement.scrollWidth>innerWidth};
        });
        assert.ok(Math.abs(geometry.gap)<1,JSON.stringify(geometry));
        assert.equal(geometry.left,0);
        assert.equal(geometry.right,width);
        assert.equal(geometry.overflow,false);
        await button.click();
        await expect(menu).toHaveCount(0);
        await button.click();
        await page.keyboard.press('Escape');
        await expect(menu).toHaveCount(0);
      }
      console.log(`PASS ${width}px ${reducedMotion}`);
      await context.close();
    }
  }
} finally { await browser.close(); await new Promise(r=>server.close(r)); }
