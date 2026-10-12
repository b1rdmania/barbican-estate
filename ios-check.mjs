// Load pages in WebKit as an iPhone 15 and report layout problems.
// Usage: node ios-check.mjs <base-url> <out-dir>
import { webkit, devices } from 'playwright';
const [base, out] = process.argv.slice(2);
const browser = await webkit.launch();
const ctx = await browser.newContext({ ...devices['iPhone 15'] });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
for (const path of ['lettings/', 'sales/', 'blocks/', 'blocks/ben-jonson-house/', '22184890/']) {
  await page.goto(base + path, { waitUntil: 'networkidle' });
  const r = await page.evaluate(() => {
    const w = innerWidth;
    const wide = [...document.querySelectorAll('body *')].filter((el) => el.getBoundingClientRect().right > w + 1 && getComputedStyle(el).position !== 'fixed')
      .slice(0, 5).map((el) => el.tagName + '.' + el.className + ' ' + Math.round(el.getBoundingClientRect().right));
    const small = [...document.querySelectorAll('a,button,select')].filter((el) => { const b = el.getBoundingClientRect(); return b.width && b.height && b.height < 32; }).length;
    const tiny = [...document.querySelectorAll('body *')].filter((el) => el.childNodes[0]?.nodeType === 3 && el.textContent.trim() && parseFloat(getComputedStyle(el).fontSize) < 11).length;
    return { w, scrollW: document.documentElement.scrollWidth, wide, smallTapTargets: small, under11px: tiny, h: document.documentElement.scrollHeight };
  });
  console.log(path, JSON.stringify(r));
  await page.screenshot({ path: `${out}/${path.replace(/\//g, '_') || 'root'}.png` });
}
// Interaction: block dropdown on lettings, tap a block on the map.
await page.goto(base + 'lettings/', { waitUntil: 'networkidle' });
await page.selectOption('#blk', { index: 1 });
console.log('dropdown ->', await page.$eval('#blk', (s) => s.value), await page.$$eval('#files .card', (c) => c.filter((e) => !e.hidden).length), 'cards');
await page.locator('#map').scrollIntoViewIfNeeded();
await page.screenshot({ path: `${out}/map.png` });
console.log('errors:', errors.length ? errors : 'none');
await browser.close();
