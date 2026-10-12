// Render data/*.json into site/: listings, flat pages and the history archive (archive.mjs).
// Usage: node build.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync } from 'node:fs';
import { renderArchive } from './archive.mjs';


// Agency text and links go into our pages, so keep only plain formatting and http(s) links.
const TAGS = new Set(['p', 'br', 'b', 'strong', 'i', 'em', 'ul', 'ol', 'li']);
const tidy = (html) => String(html || '')
  .replace(/<(script|style|iframe|object|template)\b[\s\S]*?<\/\1\s*>/gi, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .replace(/<\/?([a-z][a-z0-9]*)\b[^>]*>/gi, (tag, name) => (TAGS.has(name.toLowerCase()) ? (tag[1] === '/' ? `</${name.toLowerCase()}>` : `<${name.toLowerCase()}>`) : ''));
const LIVE = /^(to let|for sale|available)$/i;
const webUrl = (u) => (/^(https?:)?\/\//i.test(String(u || '')) ? String(u) : '');
function clean(d) {
  return {
    ...d,
    description_html: tidy(d.description_html),
    source_url: webUrl(d.source_url),
    photos: (d.photos || []).map(webUrl).filter(Boolean),
    floorplans: (d.floorplans || []).map(webUrl).filter(Boolean),
    features: (d.features || []).map(String),
    // Gone from the agency site on two complete fetches in a row (see reconcile.mjs).
    status: (d.missed || 0) >= 2 && LIVE.test(d.status) ? 'No longer listed' : d.status,
  };
}

// data/seen.json (written by reconcile.mjs): per listing file, first_seen, last_seen, missed.
const SEEN = existsSync('data/seen.json') ? JSON.parse(readFileSync('data/seen.json', 'utf8')) : {};
const flats = readdirSync('data')
  .filter((f) => /^(\d+|[a-z]+-[\w-]+)\.json$/.test(f))
  .map((f) => ({ ...JSON.parse(readFileSync(`data/${f}`, 'utf8')), ...SEEN[f] }))
  .map(clean)
  .sort((a, b) => b.fetched_at.localeCompare(a.fetched_at));

// Pull "Security Deposit: £x" style lines out of the description into facts.
function split(d) {
  const facts = [];
  const body = d.description_html.replace(/<b>([^<:]+):<\/b>\s*([^<]+)(<br>)?/g, (_, k, v) => {
    facts.push([k.trim(), v.trim()]);
    return '';
  }).replace(/(<br>\s*)+<\/p>/g, '</p>').replace(/<p>\s*<\/p>/g, '');
  return { body, facts };
}

function price(d) {
  const m = d.price.match(/^(£[\d,]+)(pcm|pw)?\s*(?:\((£[\d,]+)(pw|pcm)\))?/);
  if (!m) return { main: d.price, sub: '' };
  return { main: m[1], unit: m[2] ?? '', sub: m[3] ? `${m[3]} ${m[4]}` : '' };
}

const estate = JSON.parse(readFileSync('data/estate.geojson', 'utf8'));
const BLOCKS = [...new Set(estate.features.filter((f) => f.properties.kind === 'block').map((f) => f.properties.name))];

// Which building a flat is in: a known Barbican block named in the address,
// then in the description, then any building-like address part, then the road.
function building(d) {
  const parts = d.display_address.split(',').map((x) => x.trim());
  const text = d.description_html.replace(/<[^>]+>/g, ' ');
  return BLOCKS.find((b) => parts.includes(b)) ||
    BLOCKS.find((b) => text.includes(b)) ||
    parts.find((x) => /house|tower|court|building|mansions|lodge|crescent/i.test(x)) ||
    (d.road_name !== 'Barbican' && d.road_name) || 'Barbican';
}
// Live = an explicit on-the-market status. Anything else (let, sold, unknown) is not shown as available.
const live = (d) => LIVE.test(d.status);
const isBarbican = (d) => /^EC2Y 8/i.test(d.postcode || '') || /barbican/i.test(d.display_address);

// The old map URL now lives on as the lettings page.
const oldMapPage = () => '<!doctype html><script>location.replace("../lettings/" + location.search)</script><a href="../lettings/">Lettings</a>';

rmSync('site', { recursive: true, force: true });
mkdirSync('site', { recursive: true });
mkdirSync('site/barbican', { recursive: true });
writeFileSync('site/barbican/index.html', oldMapPage());
// Share card: a crop of CPB's 1966 roof plan (assets/roof-plan-1966.jpg, CC BY-SA 4.0), made with
// magick roof-plan-1966.jpg -crop 1000x526+250+100 +repage -resize 1200x630! og.png
copyFileSync('assets/og.png', 'site/og.png');
const archivePages = renderArchive({ flats, building, split, price, live, isBarbican });
console.log(`built ${flats.length} flat(s) and ${archivePages} archive page(s) into site/`);

// Search: a sitemap of every page with a canonical URL, and robots.txt pointing to it.
const canonicals = [];
(function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(`${dir}/${e.name}`);
    else if (e.name === 'index.html') {
      const m = readFileSync(`${dir}/${e.name}`, 'utf8').match(/<link rel="canonical" href="([^"]+)">/);
      if (m) canonicals.push(m[1]);
    }
  }
})('site');
canonicals.sort();
writeFileSync('site/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${canonicals.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync('site/robots.txt', 'User-agent: *\nAllow: /\n\nSitemap: https://barbican.estate/sitemap.xml\n');
console.log(`sitemap: ${canonicals.length} URLs`);
