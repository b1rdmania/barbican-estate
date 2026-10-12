// Fetch Frank Harris listings into data/<id>.json.
// Usage: node fetch.mjs <id-or-url> [...]
//        node fetch.mjs barbican   (every Barbican estate listing, lettings + sales)
// The site sits behind a Cloudflare challenge, so this drives a visible Chrome
// window (headless Chrome does not pass the challenge).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const args = process.argv.slice(2);
const crawl = args.includes('barbican');
const ids = args.map((a) => a.match(/(\d{6,})/)?.[1]).filter(Boolean).map((id) => [id, null]);
if (!ids.length && !crawl) {
  console.error('usage: node fetch.mjs <id-or-url> [...] | barbican');
  process.exit(1);
}

// A persistent profile keeps the Cloudflare clearance cookie between runs.
const browser = await chromium.launchPersistentContext('.chrome-profile', {
  channel: 'chrome',
  headless: false,
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = browser.pages()[0] ?? (await browser.newPage());
await page.goto('https://www.frankharris.co.uk/');
await page.waitForFunction(() => !document.title.includes('Just a moment'), null, { timeout: 30000 });

mkdirSync('data', { recursive: true });

// Barbican estate = EC2Y 8xx postcodes (Golden Lane and Monkwell Sq sit outside it).
const isBarbican = (p) => /^EC2Y 8/i.test(p.postcode || '') || /barbican/i.test(p.display_address || '');

if (crawl) {
  for (const channel of ['lettings', 'sales']) {
    const found = await page.evaluate(async (channel) => {
      const all = [];
      for (let n = 1; n < 50; n++) {
        const j = await (await fetch(n === 1 ? `/properties/${channel}.ljson` : `/properties/${channel}/page-${n}.ljson`)).json();
        all.push(...j.properties);
        if (!j.pagination.has_next_page) break;
      }
      return all.map((p) => ({ id: p.property_id ?? p.id, postcode: p.postcode, display_address: p.display_address }));
    }, channel);
    const hits = found.filter(isBarbican);
    console.log(`${channel}: ${found.length} listings, ${hits.length} in the Barbican`);
    ids.push(...hits.map((p) => [String(p.id), channel]));
  }
}

for (const [id, hint] of ids) {
  const listing = await page.evaluate(async ([id, hint]) => {
    // Homeflow embeds listing data as Ctesius.addConfig('<name>', {...}).
    // Walk braces to find the end of the object.
    const config = (html, name) => {
      const marker = `Ctesius.addConfig('${name}', `;
      const start = html.indexOf(marker);
      if (start < 0) return null;
      let i = start + marker.length, depth = 0, inStr = false, esc = false;
      for (; i < html.length; i++) {
        const c = html[i];
        if (inStr) { if (esc) esc = false; else if (c === '\\') esc = true; else if (c === '"') inStr = false; continue; }
        if (c === '"') inStr = true;
        else if (c === '{') depth++;
        else if (c === '}' && --depth === 0) break;
      }
      return JSON.parse(html.slice(start + marker.length, i + 1));
    };
    for (const channel of hint ? [hint] : ['lettings', 'sales']) {
      const res = await fetch(`/properties/${id}/${channel}`, { redirect: 'manual' });
      if (res.status !== 200) continue;
      const html = await res.text();
      const p = config(html, 'properties')?.properties?.[0];
      if (!p) continue;
      if (String(p.property_id) !== String(id) || p.property_channel !== channel) continue;

      const doc = new DOMParser().parseFromString(html, 'text/html');
      const descEl = doc.querySelector('.property-description');
      const assets = (kind) => [...new Set(
        [...html.matchAll(new RegExp(`//[a-z0-9.]*homeflow-assets\\.co\\.uk/files/${kind}/image/\\d+/\\d+/_x_/[a-f0-9]+\\.\\w+`, 'g'))].map((m) => 'https:' + m[0]),
      )];
      return {
        ...p,
        // The single-property config carries the fuller address (e.g. building name).
        display_address: config(html, 'property')?.display_address || p.display_address,
        channel,
        source_url: `https://www.frankharris.co.uk/properties/${id}/${channel}`,
        description_html: descEl ? descEl.innerHTML.trim() : p.description,
        floorplans: assets('floorplan'),
        epcs: assets('epc'),
        fetched_at: new Date().toISOString(),
      };
    }
    return null;
  }, [id, hint]);

  if (!listing) { console.error(`${id}: not found`); continue; }
  writeFileSync(`data/${id}.json`, JSON.stringify(listing, null, 2));
  console.log(`${id}: ${listing.display_address} — ${listing.price} — ${listing.status}`);
}

await browser.close();
