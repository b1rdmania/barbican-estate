// Fetch Nicola Lee Ltd (nicolalee.co.uk) Barbican Estate listings into data/nicolalee-<id>.json.
// Usage: node fetchers/nicolalee.mjs        (run from the flatview folder)
// Writes every lettings and sales listing on the Barbican Estate, including let agreed,
// sold STC and sold ones (status is kept). One file per listing.
// The site (a Webdadi platform) is server-rendered HTML with no public JSON feed: the
// index pages list the property URLs (page 2+ load by a click), and each detail page
// carries everything else. It sits behind a Cloudflare challenge, so this drives a
// visible Chrome window (headless Chrome and curl do not pass). Own profile dir, so it
// can run beside fetch.mjs.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'https://www.nicolalee.co.uk';
const delay = (ms) => new Promise((r) => setTimeout(r, ms + Math.random() * 300));

const browser = await chromium.launchPersistentContext('.chrome-profile-nicolalee', {
  channel: 'chrome',
  headless: false,
  ignoreDefaultArgs: ['--enable-automation'],
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = browser.pages()[0] ?? (await browser.newPage());
await page.goto(BASE + '/');
await page.waitForFunction(() => !document.title.includes('Just a moment'), null, { timeout: 45000 });

mkdirSync('data', { recursive: true });

const links = () => page.locator('a.property-description-link').evaluateAll((a) => a.map((x) => x.getAttribute('href')));

// Collect listing paths from an index, clicking through the pager.
async function indexPaths(path) {
  await page.goto(BASE + path);
  await page.waitForFunction(() => !document.title.includes('Just a moment'), null, { timeout: 45000 });
  await page.waitForSelector('a.property-description-link', { timeout: 15000 }).catch(() => {});
  const all = new Set(await links());
  for (let n = 2; n < 20; n++) {
    const next = page.locator(`.pagination-wrapper a.page-link[data-page="${n}"]`).first();
    if (!(await next.count())) break;
    const before = (await links())[0];
    await delay(800);
    await next.click();
    await page.waitForFunction((b) => document.querySelector('a.property-description-link')?.getAttribute('href') !== b, before, { timeout: 15000 });
    await page.waitForTimeout(500);
    (await links()).forEach((l) => all.add(l));
  }
  return [...all];
}

const isBarbican = (p) => /^EC2Y 8/i.test(p.postcode || '') || /barbican/i.test(p.display_address || '');

let counts = { lettings: 0, sales: 0 };
const seen = [];
for (const [channel, path] of [['lettings', '/let/property-to-let'], ['sales', '/buy/property-for-sale']]) {
  const paths = await indexPaths(path);
  console.log(`${channel}: ${paths.length} listed`);
  for (const p of paths) {
    await delay(1200);
    const html = await page.evaluate(async (u) => {
      const r = await fetch(u);
      return r.status === 200 ? r.text() : null;
    }, p);
    if (!html) { console.error(`${p}: fetch failed`); continue; }
    const listing = await page.evaluate(({ html, p, channel }) => {
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const text = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
      const abs = (u) => (u ? new URL(u, 'https://www.nicolalee.co.uk').href : '');

      // Address: building name + "Barbican, London, EC2Y".
      const h1 = doc.querySelector('.property-address h1');
      const road = text(h1?.querySelector('.address1'));
      const rest = text(h1).slice(road.length).trim().replace(/,?\s*[A-Z]{1,2}\d[A-Z\d]?\s*$/, '').replace(/^,\s*/, '');
      const display_address = [road, rest].filter(Boolean).join(', ');

      const postcode = doc.querySelector('#fpostcode')?.value?.trim() || (text(h1).match(/[A-Z]{1,2}\d[A-Z\d]?$/) || [''])[0];
      let lat = null, lng = null;
      try {
        const c = JSON.parse(doc.querySelector('#maps')?.getAttribute('data-cords') || '{}');
        lat = c.lat ? Number(c.lat) : null;
        lng = c.lng ? Number(c.lng) : null;
      } catch {}

      // Status: a span in the description heading; absent means on the market.
      const statusText = text(doc.querySelector('#description .property-status'));
      const status = statusText || (channel === 'lettings' ? 'Available' : 'For Sale');

      // Price. The visible figure is replaced by "Sold" on sold ones; the hidden form field keeps it.
      const money = (s) => {
        const m = String(s).match(/£\s*([\d,]+(?:\.\d+)?)/);
        return m ? Math.round(Number(m[1].replace(/,/g, ''))) : null;
      };
      const priceText = text(doc.querySelector('.property-price h2'));
      const hidden = money(doc.querySelector('#price')?.value || '');
      let price = '', price_value = '';
      if (channel === 'lettings') {
        const pcm = /pcm/i.test(priceText) ? money(priceText) : null;
        const pw = /pw/i.test(priceText) ? money(priceText) : null;
        const m = pcm ?? (pw ? Math.round((pw * 52) / 12) : hidden);
        if (m) {
          price = pcm ? `£${pcm.toLocaleString('en-GB')}pcm` : pw ? `£${pw.toLocaleString('en-GB')}pw (£${m.toLocaleString('en-GB')}pcm)` : `£${m.toLocaleString('en-GB')}pcm`;
          price_value = String(m);
        }
      } else {
        const v = money(priceText) ?? hidden;
        if (v) { price = `£${v.toLocaleString('en-GB')}`; price_value = String(v); }
      }

      // Rooms. A missing bedrooms stat means a studio.
      const stat = (k) => text(doc.querySelector(`.FeaturedProperty__list-stats-item--${k} span`)).replace(/\D/g, '');
      const title = text(doc.querySelector('#description h2'));
      const bedrooms = stat('bedrooms') || (/studio/i.test(p + title) ? '0' : (title.match(/(\d+)\s*bedroom/i) || [, ''])[1]);

      const features = [...doc.querySelectorAll('#collapseOne li')].map(text).filter(Boolean);

      // Description: paragraphs under the heading, reduced to p / br / b.
      const clean = (node) => {
        let out = '';
        for (const c of node.childNodes) {
          if (c.nodeType === 3) out += c.textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
          else if (c.nodeType === 1) {
            const t = c.tagName.toLowerCase();
            if (t === 'br') out += '<br>';
            else if (t === 'b' || t === 'strong') out += `<b>${clean(c)}</b>`;
            else if (!['script', 'style'].includes(t)) out += clean(c);
          }
        }
        return out;
      };
      const description_html = [...doc.querySelectorAll('#description > p')].map((el) => `<p>${clean(el).trim()}</p>`).join('\n');

      const imgs = (sel) => [...new Set([...doc.querySelectorAll(sel)].map((i) => abs(i.getAttribute('data-src') || i.getAttribute('src'))).filter(Boolean))];
      const photos = imgs('#gallery img').filter((u) => /\/media\/image\//i.test(u)).map((u) => u.replace(/\/image\/[lms]\//i, '/image/xl/')); // gallery serves "l"; "xl" is larger
      const floorplans = imgs('img[id^="fpimg"]');
      const epcs = [...new Set([...doc.querySelectorAll('#epc a[href]')].map((a) => abs(a.getAttribute('href'))).filter((u) => /^https?:/.test(u)))];

      const tel = doc.querySelector('a[href^="tel:"].color-white')?.getAttribute('href')?.replace('tel:', '');
      const tenure = text(doc.querySelector('h3.tenure')).replace(/^Tenure:\s*/i, '');

      return {
        display_address, road, postcode, lat, lng, status, price, price_value, bedrooms,
        bathrooms: stat('bathrooms'), reception_rooms: stat('receptions'),
        photos, floorplans, epcs, features, description_html,
        contact_telephone: tel ? tel.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1 $2 $3').replace(/^(\d{5})(\d{6})$/, '$1 $2') : '',
        tenure,
      };
    }, { html, p, channel });

    const rawId = p.split('/')[2];
    const id = `nicolalee-${rawId.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const out = {
      property_id: id,
      agency_name: 'Nicola Lee',
      channel,
      status: listing.status,
      display_address: listing.display_address,
      road_name: listing.road,
      postcode: listing.postcode,
      lat: listing.lat,
      lng: listing.lng,
      price: listing.price,
      price_value: listing.price_value,
      bedrooms: listing.bedrooms,
      bathrooms: listing.bathrooms,
      reception_rooms: listing.reception_rooms,
      photos: listing.photos,
      floorplans: listing.floorplans,
      epcs: listing.epcs,
      features: listing.features,
      description_html: listing.description_html,
      contact_telephone: listing.contact_telephone,
      source_url: BASE + p,
      tenure: listing.tenure,
      fetched_at: new Date().toISOString(),
    };
    if (!isBarbican(out)) { console.log(`skip (not Barbican): ${out.display_address} ${out.postcode}`); continue; }
    writeFileSync(`data/${id}.json`, JSON.stringify(out, null, 2));
    counts[channel]++;
    seen.push(id);
    console.log(`${id}: ${out.display_address} ${out.postcode} — ${out.price || '(no price)'} — ${out.status}`);
  }
}
console.log(`done: ${counts.lettings} lettings, ${counts.sales} sales`);
await browser.close();
