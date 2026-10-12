// Fetch Thomas Michael (thomasmichael.co.uk) Barbican Estate listings, lettings and sales,
// into data/thomasmichael-<theirId>.json (one file per listing).
// Usage: node fetchers/thomasmichael.mjs
// How: the site runs on EstateWeb (server-rendered). /Search?perPage=60 lists every
// listing, /Map-Property-Search-Results gives lat/lng as JSON, and the filter
// ?bedrooms=N (minimum) gives exact bedroom counts. Each detail page is parsed for the rest.
// Plain fetch, sequential, ~40 requests. No browser needed.
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'https://www.thomasmichael.co.uk';
const PHONE = '020 7060 0450';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(path) {
  await sleep(400);
  const res = await fetch(BASE + path, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.text();
}

const BLOCKS = ['Cromwell Tower', 'Shakespeare Tower', 'Lauderdale Tower', 'Andrewes House', 'Ben Jonson House',
  'Breton House', 'Bryer Court', 'Bunyan Court', 'Defoe House', 'Frobisher Crescent', 'Gilbert House',
  'Mountjoy House', 'Speed House', 'Thomas More House', 'Willoughby House', 'Seddon House', 'Wallside',
  'Lambert Jones Mews', 'The Postern', 'Brandon Mews', 'John Trundle Court'];

const decode = (s) => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&pound;/g, '£').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&rsquo;|&lsquo;/g, "'")
  .replace(/&rdquo;|&ldquo;/g, '"').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const text = (s) => decode(s.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const money = (n) => '£' + Math.round(n).toLocaleString('en-GB');

// 1. Every listing id, with its public path.
const searchHtml = await get('/Search?perPage=60');
const listings = [...new Map([...searchHtml.matchAll(/href="(\/property\/residential\/for-(rent|sale)\/[^"]*?\/(TML?\d+))"/g)]
  .map((m) => [m[3], { id: m[3], path: m[1], channel: m[2] === 'rent' ? 'lettings' : 'sales' }])).values()];
console.log(`${listings.length} listings on the site`);

// 2. Coordinates.
const coords = {};
for (const it of JSON.parse(await get('/Map-Property-Search-Results?perPage=60')).items) coords[it.id] = [it.lat, it.lng];

// 3. Exact bedrooms: a listing's bedrooms = highest N whose "min beds N" search still returns it.
const beds = {};
for (let n = 0; n <= 6; n++) {
  const ids = JSON.parse(await get(`/Map-Property-Search-Results?perPage=60&bedrooms=${n}`)).items.map((i) => i.id);
  for (const id of ids) beds[id] = n;
}

// 4. Detail pages.
mkdirSync('data', { recursive: true });
const counts = { lettings: 0, sales: 0 };
for (const l of listings) {
  const html = await get(l.path);
  const h2 = text(html.match(/<h2>([^<]*)<\/h2>/)?.[1] ?? '');
  const desc = html.match(/<em>Description<\/em><br \/>([\s\S]*?)<\/div>\s*<\/div>/)?.[1] ?? '';
  const descText = text(desc);
  const lead = descText.slice(0, 400);
  const block = BLOCKS.find((b) => new RegExp(`\\b${b}\\b`, 'i').test(lead)) || BLOCKS.find((b) => new RegExp(`\\b${b}\\b`, 'i').test(descText));
  const pcFull = (h2 + ' ' + descText).match(/\bEC2Y\s?(\d[A-Z]{2})\b/i);
  const postcode = pcFull ? `EC2Y ${pcFull[1].toUpperCase()}` : (/EC2Y/i.test(h2) ? 'EC2Y' : (h2.match(/\b[A-Z]{1,2}\d[A-Z\d]?\b/)?.[0] ?? ''));
  const barbican = /^EC2Y 8/.test(postcode) || /barbican/i.test(h2 + ' ' + l.path) || (block && BLOCKS.includes(block) && lead.toLowerCase().includes(block.toLowerCase()));
  if (!barbican) { console.log(`skip ${l.id}: ${h2}`); continue; }

  // Status and price.
  const status = text(html.match(/<div class="status">([\s\S]*?)<\/div>/)?.[1] ?? '') || 'Available';
  const h3 = text(html.match(/<h3>([\s\S]*?)<\/h3>/)?.[1] ?? '').replace(/Fees Info[\s\S]*$/, '');
  let price = '', priceValue = '', tenure = '';
  const amount = parseFloat((h3.match(/£\s?([\d,]+(?:\.\d+)?)/)?.[1] ?? '').replace(/,/g, ''));
  if (l.channel === 'lettings' && amount) {
    if (/pw/i.test(h3)) { const pcm = amount * 52 / 12; price = `£${amount}pw (${money(pcm)}pcm)`; priceValue = String(Math.round(pcm)); }
    else { price = `${money(amount)}pcm`; priceValue = String(Math.round(amount)); }
  } else if (amount) { price = money(amount); priceValue = String(Math.round(amount)); }
  tenure = h3.match(/\b(Leasehold|Freehold|Share of Freehold)\b/i)?.[1] ?? '';

  // Photos: largest size the gallery links to, de-duplicated by image number.
  const photoSet = new Map();
  for (const m of html.matchAll(/href="(https:\/\/cdn103\.estateweb\.com\/PhotoServ\/Default\.aspx\?[^"]*?i=(\d+)\.jpg[^"]*?)" rel="propertyphotos"/g)) {
    if (!photoSet.has(m[2])) photoSet.set(m[2], decode(m[1]));
  }
  const photos = [...photoSet.entries()].sort((a, b) => a[0] - b[0]).map((e) => e[1]);

  // Description as simple HTML.
  const clean = decode(desc).replace(/<(script|style)[\s\S]*?<\/\1>/gi, '')
    .split(/<b>Viewing<\/b>/)[0]
    .replace(/<(\/?)p\b[^>]*>/gi, '<$1p>').replace(/<(?!\/?(p|br|b)\b)[^>]+>/gi, '')
    .replace(/<br\s*\/?>/gi, '<br>').replace(/\s*\n\s*/g, ' ').replace(/(<br>\s*){3,}/g, '<br><br>').trim();

  const building = block ?? '';
  const display_address = [building, 'Barbican', 'London'].filter(Boolean).join(', ');
  const features = [];
  const furn = descText.match(/\b(Unfurnished|Furnished|Part[- ]furnished)\b/i)?.[1];
  if (furn) features.push(furn[0].toUpperCase() + furn.slice(1).toLowerCase());
  const tax = descText.match(/Council tax[^.]*?Band ([A-H])/i)?.[1];
  if (tax) features.push(`Council tax band ${tax}`);
  const sqft = descText.match(/\(?(\d[\d,]*)\s*sq\.?\s*ft/i)?.[1];
  if (sqft) features.push(`${sqft} sq ft`);
  const typ = descText.match(/\(Type (\d+[A-Z]?)\)/)?.[1];
  if (typ) features.push(`Barbican flat type ${typ}`);

  const file = `thomasmichael-${l.id.toLowerCase()}`;
  const out = {
    property_id: file, agency_name: 'Thomas Michael', channel: l.channel, status,
    display_address, road_name: building || 'Barbican', postcode,
    lat: coords[l.id]?.[0] ?? null, lng: coords[l.id]?.[1] ?? null,
    price, price_value: priceValue,
    bedrooms: beds[l.id] != null ? String(beds[l.id]) : '', bathrooms: '', reception_rooms: '',
    photos, floorplans: [], epcs: [], features, description_html: clean,
    contact_telephone: PHONE, source_url: BASE + l.path, tenure, fetched_at: new Date().toISOString(),
  };
  writeFileSync(`data/${file}.json`, JSON.stringify(out, null, 2));
  counts[l.channel]++;
  console.log(`${file}: ${display_address} | ${postcode} | ${price} | ${status} | ${out.bedrooms}bd | ${photos.length} photos`);
}
console.log(`wrote ${counts.lettings} lettings, ${counts.sales} sales`);
