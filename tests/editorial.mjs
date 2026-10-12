// Run after node build.mjs. Checks routes and interactions without fetching agency data.
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { webkit, devices } from 'playwright';
const root=path.resolve('site');
const walk=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(f=>f.isDirectory()?walk(path.join(dir,f.name)):[path.join(dir,f.name)]);
let links=0;
for(const file of walk(root).filter(f=>f.endsWith('.html'))) {
 for(const [,raw] of readFileSync(file,'utf8').matchAll(/href="([^"]+)"/g)) {
  const href=raw.replaceAll('&amp;','&');
  if(/^(https?:|mailto:|tel:|#)/.test(href))continue;
  const local=decodeURIComponent(href.split(/[?#]/)[0]);
  let target=local.startsWith('/')?path.join(root,local):path.resolve(path.dirname(file),local);
  if(!path.extname(target))target=path.join(target,'index.html');
  assert.ok(statSync(target).isFile(),`${file}: ${href}`);links++;
 }
}
const server=createServer((req,res)=>{
 try {let file=path.join(root,decodeURIComponent(new URL(req.url,'http://localhost').pathname));if(statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',file.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream');res.end(readFileSync(file));}
 catch {res.statusCode=404;res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}`;
let browser;
try {
 browser=await webkit.launch();
 const context=await browser.newContext({...devices['iPhone 15'],acceptDownloads:true});
 // Offline third-party resources keep the editorial checks deterministic.
 await context.route('**/*',route=>route.request().url().startsWith(base)?route.continue():route.abort());
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const route of ['/', '/history/','/blocks/','/inside/','/inside/type-31/','/life/','/life/first-years/','/watch/','/watch/a-middle-class-council-estate/','/contribute/']) {
  const response=await page.goto(base+route);assert.equal(response.status(),200);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),route+' overflows');
 }
 await page.goto(base+'/blocks/');assert.ok(await page.locator('.estate-plan a').count()>=21);await page.locator('.estate-plan a[aria-label="Gilbert House"]').first().click();assert.ok(page.url().endsWith('/blocks/gilbert-house/'));
 await page.goto(base+'/watch/');await page.locator('[data-filter="Life here"]').click();assert.equal(await page.locator('[data-category]:visible').count(),3);
 await page.goto(base+'/inside/');await page.locator('#type-search').fill('zzz');assert.ok(await page.locator('#type-empty').isVisible());await page.locator('#type-search').fill('31');assert.ok(await page.getByRole('link',{name:'Type 31',exact:true}).isVisible());
 await page.goto(base+'/watch/a-middle-class-council-estate/');assert.equal(await page.locator('iframe').count(),0);await page.locator('[data-video]').click();assert.match(await page.locator('iframe').getAttribute('src'),/^https:\/\/www.youtube-nocookie.com\/embed\/FFDpqRxym_A/);
 await page.goto(base+'/contribute/?prompt=old-photo&block=Gilbert%20House');assert.equal(await page.locator('[name=block]').inputValue(),'Gilbert House');
 await page.locator('[name=name]').fill('Test resident');await page.locator('[name=title]').fill('<script>test</script>');await page.locator('[name=story]').fill('An original memory.');
 await page.locator('button[type=submit]').click();assert.ok(await page.locator('#draft').isHidden());
 await page.locator('[name=permission]').check();await page.locator('button[type=submit]').click();assert.match(await page.locator('#draft-text').textContent(),/<script>test<\/script>/);assert.equal(await page.locator('#draft-text script').count(),0);
 const download=page.waitForEvent('download');await page.locator('#download').click();assert.equal((await download).suggestedFilename(),'barbican-contribution.txt');
 await page.locator('[name=story]').fill('An edited memory.');assert.ok(await page.locator('#draft').isHidden());
 assert.deepEqual(errors,[]);
 console.log(`Editorial checks passed: ${links} internal links, 10 iPhone routes, map navigation, filters, video activation and contribution flow.`);
} finally {await browser?.close();await new Promise(resolve=>server.close(resolve));}
