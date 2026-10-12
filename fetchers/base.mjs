// Fetch Base Property Specialists (baseps.co.uk) Barbican Estate listings into data/base-<slug>.json.
// Usage: node fetchers/base.mjs
// The site is Webflow CMS, with no JSON feed. /portfolio holds every listing as a map
// item (status Available / Tenanted / Historical, plus lat/lng and slug); it is paged
// with Webflow ?<hash>_page=N params. Barbican candidates are picked by map position
// or slug, then each /our-homes/<slug> page is parsed (Webflow HTML) and checked for
// a Barbican address. Plain fetch, sequential, 400 ms apart. Base lists lettings only.
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'https://www.baseps.co.uk';
const PHONE = '0207 033 1901';
const BLOCKS = ['Cromwell Tower', 'Shakespeare Tower', 'Lauderdale Tower', 'Andrewes House', 'Ben Jonson House',
  'Breton House', 'Bryer Court', 'Bunyan Court', 'Defoe House', 'Frobisher Crescent', 'Gilbert House',
  'Mountjoy House', 'Speed House', 'Thomas More House', 'Willoughby House', 'Seddon House', 'Wallside',
  'Lambert Jones Mews', 'The Postern', 'Brandon Mews', 'John Trundle Court'];
const blockRe = new RegExp(BLOCKS.join('|'), 'i');
const slugRe = new RegExp(['barbican', ...BLOCKS.map((b) => b.toLowerCase().replace(/ /g, '-'))].join('|'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const get = async (path) => {
  await sleep(400);
  const res = await fetch(BASE + path, { headers: { 'user-agent': 'Mozilla/5.0 (flatview fetcher)' } });
  if (!res.ok) throw new Error(`${res.status} ${path}`);
  return res.text();
};
const text = (s) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>');

// 1. Every portfolio item: slug, status, lat, lng.
const items = new Map();
const addItems = (html) => {
  for (const m of html.matchAll(/data-ncf-status="([^"]*)" data-ncf-lat="([^"]*)" data-ncf-long="([^"]*)" data-ncf-slug="([^"]*)"/g))
    items.set(m[4], { status: m[1].trim(), lat: parseFloat(m[2]), lng: parseFloat(m[3]) });
};
const first = await get('/portfolio');
addItems(first);
const params = [...new Set([...first.matchAll(/\?([0-9a-f]{8})_page=\d+/g)].map((m) => m[1]))];
for (const p of params) {
  for (let n = 2; n <= 6; n++) {
    const before = items.size;
    addItems(await get(`/portfolio?${p}_page=${n}`));
    if (items.size === before) break;
  }
}
console.log(`portfolio: ${items.size} listings`);

// 2. Barbican candidates (rough box around the estate, or a Barbican slug).
const near = (i) => i.lat > 51.514 && i.lat < 51.524 && i.lng > -0.105 && i.lng < -0.085;
const candidates = [...items].filter(([slug, i]) => slugRe.test(slug) || near(i));

// 3. Parse each candidate page.
mkdirSync('data', { recursive: true });
const STATUS = { Available: 'Available', Tenanted: 'Let', Historical: 'Let' };
let saved = 0;
for (const [slug, info] of candidates) {
  const html = await get(`/our-homes/${slug}`);
  const title = decode(text(html.match(/<h1 class="detail-work-title">(.*?)<\/h1>/s)?.[1] ?? ''));
  const area = decode(text(html.match(/<h2 class="h2-work-details">(.*?)<\/h2>/s)?.[1] ?? ''));
  const rich = html.match(/<div class="stage-details-description w-richtext">(.*?)<\/div><\/div><\/div>/s)?.[1] ?? '';
  const blob = `${title} ${area} ${text(rich)}`;
  if (/golden lane/i.test(blob) || !(/\bEC2Y\b/i.test(title) || /barbican/i.test(area) || blockRe.test(title))) {
    console.log(`skip (not Barbican): ${slug} - ${title}`);
    continue;
  }
  const pm = html.match(/Rent Per Month<\/div>.*?<h4[^>]*>£<\/h4><h4[^>]*>([\d,.]+)<\/h4>/s);
  const rent = pm ? Math.round(parseFloat(pm[1].replace(/,/g, ''))) : null;
  const meta = (label) => decode(text(html.match(new RegExp(`${label}</div><h4[^>]*>(.*?)</h4>`, 's'))?.[1] ?? ''));
  const part = html.match(/Property particulars<\/div><div[^>]*>(.*?)<\/div><\/div>/s)?.[1] ?? '';
  const nums = [...part.matchAll(/<h4[^>]*>\s*(\d+)\s*<\/h4>/g)].map((m) => m[1]);
  // Lightbox images only: the w-json blocks inside the Gallery / Floor Plan sections.
  const section = (from, to) => {
    const a = html.indexOf(`id="${from}"`);
    const b = html.indexOf(`id="${to}"`, a);
    return a < 0 ? '' : html.slice(a, b < 0 ? undefined : b);
  };
  const urls = (s) => [...new Set([...s.matchAll(/"url":\s*"(https:[^"]+)"/g)].map((m) => m[1]))];
  const building = title.replace(/,?\s*EC2Y.*$/i, '').trim();
  const block = BLOCKS.find((b) => new RegExp(b, 'i').test(building));
  const desc = rich
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, '')
    .replace(/<(\/?)(strong|b)\b[^>]*>/g, '<$1b>')
    .replace(/<br\s*\/?>/g, '<br>')
    .replace(/<(?!\/?(p|br|b)\b)[^>]+>/g, '')
    .replace(/<(p|b)\s[^>]*>/g, '<$1>')
    .replace(/<p><\/p>/g, '').trim();
  const epc = html.match(/href="(https:\/\/find-energy-certificate[^"]+)"/)?.[1];
  const tour = html.match(/<iframe src="(https:\/\/tour\.[^"]+)"/)?.[1];
  const avail = meta('Available Date');
  const ptype = meta('Property Type');
  const id = `base-${slug.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;
  const listing = {
    property_id: id,
    agency_name: 'Base Property Specialists',
    channel: 'lettings',
    status: STATUS[info.status] ?? info.status,
    display_address: `${building}, Barbican, London`,
    road_name: block ?? building,
    postcode: title.match(/EC2Y(?: ?\d[A-Z]{2})?/i)?.[0].toUpperCase() ?? 'EC2Y',
    lat: Number.isFinite(info.lat) ? info.lat : null,
    lng: Number.isFinite(info.lng) ? info.lng : null,
    price: rent ? `£${rent.toLocaleString('en-GB')}pcm` : '',
    price_value: rent ? String(rent) : '',
    bedrooms: nums[0] ?? '',
    bathrooms: nums[1] ?? '',
    reception_rooms: '',
    photos: urls(section('GalleryID', 'Floor-PlanID')).filter((u) => !urls(section('Floor-PlanID', 'LocationID')).includes(u)),
    floorplans: urls(section('Floor-PlanID', 'LocationID')),
    epcs: epc ? [epc] : [],
    features: [ptype && `Property type: ${ptype}`, avail && `Available ${avail}`, tour && `Virtual tour: ${tour}`].filter(Boolean),
    description_html: desc,
    contact_telephone: PHONE,
    source_url: `${BASE}/our-homes/${slug}`,
    tenure: '',
    fetched_at: new Date().toISOString(),
  };
  writeFileSync(`data/${id}.json`, JSON.stringify(listing, null, 2));
  console.log(`${id}: ${listing.display_address} - ${listing.price} - ${listing.status} (site: ${info.status})`);
  saved++;
}
console.log(`saved ${saved} Barbican listing(s), lettings only`);
