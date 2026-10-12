// The Barbican site: Lettings and Sales (listing cards + estate map) and History
// (overview + one page per block). Layout comes from the Variant "archive" design,
// copied verbatim into archive.css; the theme (white, Helvetica) is overridden in page().
// Called from build.mjs with the listings and its helpers.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createEditorial, inside } from './editorial.mjs';
const EDITORIAL_CSS = readFileSync('editorial.css', 'utf8');

const CSS = readFileSync('archive.css', 'utf8');
const R = JSON.parse(readFileSync('data/research.json', 'utf8'));
const ESTATE = JSON.parse(readFileSync('data/estate.geojson', 'utf8'));
const HISTORY = JSON.parse(readFileSync('content/history.json', 'utf8'));
const BLOCKS = JSON.parse(readFileSync('content/blocks.json', 'utf8'));

const THEME = `
  :root {
    --paper: #ffffff;
    --ink: #111111;
    --faded-ink: rgba(17, 17, 17, 0.55);
    --grid-line: rgba(17, 17, 17, 0.12);
    --mono: "Helvetica Neue", Helvetica, Arial, sans-serif;
    --sans: "Helvetica Neue", Helvetica, Arial, sans-serif;
  }
  html { background-color: #ffffff; }
  body { font-size: 12px; letter-spacing: 0.02em; -webkit-font-smoothing: antialiased; }
  body::before { display: none; }
  header { margin-bottom: 2rem; }
  .brand h1 { font-weight: 700; letter-spacing: -0.03em; }
  .brand h1 a { color: inherit; text-decoration: none; }
  ul.block-list a { position: relative; }
  ul.block-list a.active::before { position: absolute; left: -1.4em; }
  [hidden] { display: none !important; }

  nav.sections { display: grid; grid-template-columns: repeat(3, 1fr); margin: 0 0 4rem; border-bottom: 1px solid var(--ink); }
  nav.sections a { font-family: var(--sans); font-weight: 700; font-size: 22px; letter-spacing: -0.02em; text-transform: uppercase; color: var(--ink); text-decoration: none; padding: 0.6rem 0.75rem 0.6rem 0; display: flex; align-items: baseline; gap: 0.75rem; }
  nav.sections a + a { border-left: 1px solid var(--grid-line); padding-left: 0.75rem; }
  nav.sections a.on { background: var(--ink); color: var(--paper); padding-left: 0.75rem; }
  nav.sections .n { font-size: 11px; font-weight: 400; letter-spacing: 0.02em; }

  .hero { margin: -2rem 0 4rem; }
  .hero img { width: 100%; height: min(72vh, 760px); object-fit: cover; display: block; }
  .hero figcaption { margin-top: 0.5rem; color: var(--faded-ink); text-transform: uppercase; }

  .lede { font: 400 clamp(20px, 2vw, 28px)/1.3 var(--sans); letter-spacing: -0.01em; max-width: 34ch; }
  .prose { display: grid; grid-template-columns: 140px 1fr; gap: 0.9rem 1.5rem; max-width: 62ch; }
  .prose dt { color: var(--faded-ink); text-transform: uppercase; padding-top: 0.2rem; }
  .prose dd { margin: 0; font-size: 15px; line-height: 1.5; letter-spacing: 0; }
  .numbers { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--ink); }
  .numbers div { padding: 0.9rem 1rem 0.9rem 0; border-bottom: 1px solid var(--grid-line); }
  .numbers b { display: block; font: 700 28px/1.05 var(--sans); letter-spacing: -0.03em; }
  .numbers span { color: var(--faded-ink); text-transform: uppercase; }

  .plates { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
  .plates figure { margin: 0; }
  .plates a { color: inherit; text-decoration: none; }
  .plates img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; }
  .plates figcaption { color: var(--faded-ink); text-transform: uppercase; font-size: 10px; margin-top: 0.35rem; }

  .fold { border-top: 1px solid var(--ink); }
  .fold:last-child { border-bottom: 1px solid var(--ink); }
  .fold summary { list-style: none; display: flex; justify-content: space-between; align-items: baseline; padding: 1.1rem 0; font: 700 22px/1 var(--sans); letter-spacing: -0.02em; text-transform: uppercase; cursor: pointer; }
  .fold summary::-webkit-details-marker { display: none; }
  .fold summary::after { content: "+"; font-weight: 400; }
  .fold[open] summary::after { content: "\\2212"; }
  .fold .body { padding: 0.5rem 0 2.5rem; }
  .rows { display: grid; grid-template-columns: 140px 1fr; gap: 0.75rem 1.5rem; }
  .rows dt { color: var(--faded-ink); text-transform: uppercase; padding-top: 0.15rem; }
  .rows dd { margin: 0; font-size: 15px; line-height: 1.5; letter-spacing: 0; max-width: 62ch; }
  .rows.table { grid-template-columns: 80px 120px 1fr; }
  .rows.table dd { font-size: 13px; }

  .chart svg { width: 100%; height: auto; display: block; overflow: visible; }
  .chart rect.bar { fill: var(--ink); }
  .chart rect.bar.thin { fill: var(--faded-ink); }
  /* Chart hover stays ungated on purpose: on a phone, a tap is the only way to read a bar. */
  .chart g:hover rect.bar { fill: var(--paper); stroke: var(--ink); stroke-width: 1; }
  .chart text { font-family: var(--sans); font-size: 9px; fill: var(--faded-ink); }
  .chart .tip { display: none; }
  .chart g:hover .tip { display: block; }
  .chart .tip text { fill: var(--ink); font-size: 10px; }
  .chart .tip rect { fill: var(--paper); stroke: var(--ink); stroke-width: 1; }

  .btn { text-decoration: none; display: inline-block; }
  .btn.on { background: var(--ink); color: var(--paper); }
  select.btn { border-radius: 0; }
  .controls { display: flex; flex-wrap: wrap; gap: 0.5rem 1.5rem; align-items: center; }
  .controls .grp { display: flex; }
  .controls .grp .btn + .btn { border-left: 0; }

  .cards { display: grid; grid-template-columns: repeat(2, 1fr); gap: 4.5rem 2rem; }
  .card { display: block; color: var(--ink); text-decoration: none; position: relative; }
  .card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; display: block; background: #eee; }
  .card .tag { position: absolute; top: 0; left: 0; background: var(--ink); color: var(--paper); padding: 0.4rem 0.6rem; text-transform: uppercase; font-weight: 700; }
  .card .t { font: 700 clamp(28px, 3.2vw, 46px)/0.92 var(--sans); letter-spacing: -0.045em; text-transform: uppercase; margin-top: 1.1rem; }
  .card .p { font: 700 clamp(22px, 2.2vw, 32px)/1 var(--sans); letter-spacing: -0.03em; margin-top: 0.5rem; }
  .card .p small { font-size: 0.45em; letter-spacing: 0.02em; margin-left: 0.3em; }
  .card .m { display: flex; justify-content: space-between; margin-top: 0.9rem; padding-top: 0.5rem; border-top: 1px solid var(--ink); text-transform: uppercase; }
  .card.off { opacity: 0.45; }
  .empty { font: 700 22px var(--sans); text-transform: uppercase; }
  .btn.more { display: block; width: 100%; margin: 0 0 3rem; padding: 1.25rem; font-size: 18px; }

  #map { height: 420px; border: 1px solid var(--ink); background: var(--paper); cursor: crosshair; }
  .leaflet-container { font-family: var(--sans); background: var(--paper); }
  .leaflet-tooltip.lbl { background: none; border: 0; box-shadow: none; padding: 0; font: 700 9px/1.1 var(--sans); letter-spacing: .06em; text-transform: uppercase; color: var(--faded-ink); text-align: center; text-shadow: 0 0 3px #fff, 0 0 3px #fff, 0 0 3px #fff; }
  .leaflet-tooltip.lbl:before { display: none; }
  .leaflet-tooltip.lbl.dark { color: var(--ink); }
  .dot { background: var(--ink); width: 12px; height: 12px; transform: translate(-50%, -50%); display: inline-block; cursor: crosshair; }
  .dot.sel { background: var(--paper); box-shadow: inset 0 0 0 2px var(--ink); }
  .leaflet-div-icon { background: none; border: 0; }
  .leaflet-control-zoom a { border-radius: 0 !important; color: var(--ink) !important; font-family: var(--sans); }
  .leaflet-bar { border-radius: 0 !important; border: 1px solid var(--ink) !important; box-shadow: none !important; }
  .section-title { font-weight: bold; border-bottom: 1px solid var(--ink); padding-bottom: 0.25rem; display: block; text-transform: uppercase; }
  .flat-head .t { font: 700 clamp(40px, 6vw, 88px)/0.9 var(--sans); letter-spacing: -0.05em; text-transform: uppercase; }
  .flat-head .p { font: 700 clamp(28px, 3.4vw, 48px)/1 var(--sans); letter-spacing: -0.03em; margin-top: 0.75rem; }
  .flat-head .p small { font-size: 0.4em; letter-spacing: 0.02em; margin-left: 0.3em; }
  .flat-head .m { margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid var(--ink); text-transform: uppercase; display: flex; justify-content: space-between; gap: 1rem; flex-wrap: wrap; }
  .text { max-width: 62ch; font-size: 16px; line-height: 1.55; letter-spacing: 0; }
  .text p + p { margin-top: 0.9em; }
  .tags { display: flex; flex-wrap: wrap; gap: 6px; }
  .tags span { border: 1px solid var(--ink); padding: 0.35rem 0.6rem; text-transform: uppercase; }
  .plan img { width: 100%; max-height: 900px; object-fit: contain; display: block; }
  .plates img[data-i] { cursor: zoom-in; }
  .block-link { display: block; color: var(--ink); text-decoration: none; border-top: 1px solid var(--ink); border-bottom: 1px solid var(--ink); padding: 1.25rem 0; }
  .block-link b { display: block; font: 700 22px/1 var(--sans); letter-spacing: -0.02em; text-transform: uppercase; margin-bottom: 0.5rem; }
  .block-link span { font-size: 16px; letter-spacing: 0; }
  .lb { position: fixed; inset: 0; background: rgba(255,255,255,0.97); display: none; align-items: center; justify-content: center; z-index: 10; }
  .lb.on { display: flex; }
  .lb img { max-width: 94vw; max-height: 88vh; }
  .lb button { position: absolute; background: none; border: 0; color: var(--ink); font: 700 40px var(--sans); padding: 20px; cursor: pointer; }
  .lb .p { left: 0; top: 50%; transform: translateY(-50%); } .lb .n { right: 0; top: 50%; transform: translateY(-50%); } .lb .x { top: 0; right: 0; font-size: 28px; }
  /* Interaction (good-css): one focus ring, hover only with a mouse, press feedback everywhere. */
  :focus-visible { outline: max(2px, 0.08em) solid currentColor; outline-offset: 0.25em; }
  .btn.on:focus-visible, nav.sections a.on:focus-visible { outline-color: var(--ink); }
  @media (hover: hover) and (pointer: fine) {
    .card:hover .t, .block-link:hover b { text-decoration: underline; text-decoration-thickness: 3px; }
  }
  .btn:active, nav.sections a:active, ul.block-list a:active { transform: scale(0.97); }
  .card:active, .block-link:active, .plates a:active { transform: scale(0.98); }
  @media (prefers-reduced-motion: no-preference) {
    .btn, nav.sections a, ul.block-list a, .card, .block-link, .plates a { transition: transform 160ms ease-out; }
  }
  .credits { display: block; color: var(--faded-ink); text-transform: uppercase; margin-bottom: 1.5rem; }

  /* Phones (checked in WebKit as an iPhone 15). */
  @media (max-width: 900px) {
    .document-wrapper { padding: 16px 16px 0; }
    header { padding-bottom: 1rem; margin-bottom: 1.5rem; }
    .brand h1 { font-size: 30px; }
    nav.sections { margin: 0 0 1.5rem; }
    nav.sections a { padding: 0.9rem 0.5rem; min-height: 44px; font-size: 15px; gap: 0.4rem; }
    .hero { margin: 0 0 1.5rem; }
    .hero img { height: 46vh; }
    main { gap: 2rem; }
    article.dossier { gap: 2.5rem; order: 1; }
    aside.index { order: 2; border-top: 1px solid var(--ink); padding-top: 1.5rem; }
    ul.block-list li { margin-bottom: 0; }
    ul.block-list a { padding: 0.7rem 0; border-bottom: 1px solid var(--grid-line); }
    ul.block-list a.active::before { position: static; }
    .btn { padding: 0.85rem 1rem; font-size: 12px; }
    select.btn { font-size: 16px; padding: 0.6rem 0.75rem; width: 100%; }
    .controls { gap: 0.75rem; }
    .controls .grp { flex-wrap: wrap; }
    .plates { grid-template-columns: 1fr 1fr; gap: 6px; }
    .plates figcaption { font-size: 11px; }
    .numbers { grid-template-columns: 1fr 1fr; }
    .prose, .rows { grid-template-columns: 1fr; gap: 0.2rem; }
    .prose dt, .rows dt { margin-top: 0.8rem; }
    .rows.table { grid-template-columns: 60px 90px 1fr; gap: 0.4rem 0.75rem; }
    .rows.table dt { margin-top: 0; }
    .fold summary { font-size: 18px; padding: 1rem 0; min-height: 44px; }
    .cards { grid-template-columns: 1fr; gap: 3rem; }
    #map { height: 60vh; }
    .leaflet-tooltip.lbl:not(.dark) { display: none; }
    footer { margin-top: 4rem; }
  }
`;

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const up = (s) => esc(String(s ?? '').toUpperCase());
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const pad = (n) => String(n).padStart(2, '0');
const money = (n) => '£' + Math.round(n).toLocaleString('en-GB');
const resize = (u, size) => 'https:' + u.replace(/^https?:/, '').replace(/\/\d+x\d*\//, `/${size}/`);
const num = (v) => Number(String(v).replace(/[^\d.]/g, '')) || 0;

const GROUPS = [
  ['TOWER BLOCKS', ['Cromwell Tower', 'Lauderdale Tower', 'Shakespeare Tower']],
  ['TERRACE BLOCKS', ['Andrewes House', 'Ben Jonson House', 'Breton House', 'Defoe House', 'Gilbert House', 'Mountjoy House', 'Seddon House', 'Speed House', 'Thomas More House', 'Willoughby House']],
  ['COURTS + CRESCENT', ['Bryer Court', 'Bunyan Court', 'John Trundle Court', 'Frobisher Crescent']],
  ['MEWS + HOUSES', ['Brandon Mews', 'Lambert Jones Mews', 'The Postern', 'Wallside']],
];
const ALL = GROUPS.flatMap(([, names]) => names);
const SECTIONS = [['explore', 'HISTORY'], ['sales', 'SALES'], ['lettings', 'LETTINGS']];
const EXPLORE_NAV = [['explore', '', 'Overview'], ['history', 'history/', 'The story'], ['blocks', 'blocks/', 'The estate'], ['inside', 'inside/', 'Inside the flats'], ['life', 'life/', 'Life here'], ['watch', 'watch/', 'Watch']];
// Absolute base for share-card URLs (Telegram and others need a full URL).
const SITE = 'https://barbican.estate/';

export function renderArchive({ flats, building, split, price, live, isBarbican }) {
  const listings = flats.filter(isBarbican);
  const inBlock = (name) => listings.filter((d) => building(d) === name);
  const credits = new Map(); // every Commons photo shown, for the credits page

  const page = ({ title, depth, active, section, body, head = '', sidebar = true, hero = '', image = '', share = null, editorial = '', route = null }) => {
    const root = '../'.repeat(depth);
    const link = (name) => `<li><a href="${root}blocks/${slug(name)}/"${active === name ? ' class="active"' : ''}>${up(name)}</a></li>`;
    return `<!doctype html><html lang="en"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#ffffff">
<title>${esc(title)}</title>
${route !== null ? `<link rel="canonical" href="${SITE}${route ? route + '/' : ''}">` : ''}
<meta property="og:title" content="${esc(share?.title || 'BARBICAN ESTATE')}">
<meta property="og:description" content="${esc(share?.description || 'HISTORY / SALES / LETTINGS')}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Barbican Estate">
${image ? `<meta property="og:image" content="${esc(image)}">` : `<meta property="og:image" content="${SITE}og.png">\n<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">`}
<meta name="twitter:card" content="summary_large_image">
<style>${CSS}${THEME}${EDITORIAL_CSS}</style>${head}</head><body>
<a class="skip-link" href="#main-content">Skip to content</a>
<div class="document-wrapper">
  <header>
    <div class="brand">
      <h1><a href="${root || './'}">BARBICAN ESTATE</a></h1>
      <p>HISTORY / SALES / LETTINGS</p>
    </div>
  </header>
  <nav class="sections" aria-label="Main navigation">
    ${SECTIONS.map(([key, label], i) => `<a href="${key === 'explore' ? root || './' : root + key + '/'}"${(section === key || key === 'explore' && section === 'blocks') ? ' class="on" aria-current="page"' : ''}><span class="n">${pad(i + 1)}</span>${label}</a>`).join('\n    ')}
  </nav>
  ${section === 'explore' || section === 'blocks' ? `<nav class="explore-nav" aria-label="History">${EXPLORE_NAV.map(([key, path, label]) => `<a href="${root + path || './'}"${(editorial || (section === 'blocks' ? 'blocks' : 'explore')) === key ? ' aria-current="page"' : ''}>${label}</a>`).join('')}</nav>` : ''}
  ${hero ? `<figure class="hero">${hero}</figure>` : ''}
  <main id="main-content"${sidebar ? '' : ' style="grid-template-columns:1fr"'}>
    ${sidebar ? `<aside class="index">
      ${GROUPS.map(([t, names]) => `<div class="index-group"><span class="index-title">${t}</span><ul class="block-list">${names.map(link).join('')}</ul></div>`).join('\n      ')}
    </aside>` : ''}
    <article class="dossier">
${body}
    </article>
  </main>
  <footer>
    <a class="credits" href="${root}credits/">Photo credits</a>
    <div class="bottom-decor">
    <div class="brutalist-logo"><svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <path d="M50 0 L65 20 L65 35 L80 35 L100 50 L80 65 L65 65 L65 80 L50 100 L35 80 L35 65 L20 65 L0 50 L20 35 L35 35 L35 20 Z" fill="#181818"></path>
      <circle cx="50" cy="50" r="15" fill="#e4e4e0"></circle>
    </svg></div>
    <div class="graph-paper-grid"></div>
  </div></footer>
</div>
</body></html>`;
  };

  // Commons photos go through here so the credits page lists each one.
  const commons = (img, caption) => { credits.set(img.url, { ...img, caption }); return img.url; };
  const heroImg = (img, caption) => img ? `<img src="${esc(commons(img, caption))}" alt="${esc(caption)}">${caption ? `<figcaption>${up(caption)}</figcaption>` : ''}` : '';
  commons(R.history.images[2], 'Share image: roof plan (cropped)');
  const plates = (items) => items.length ? `<div class="plates">${items.map((p) => `<figure>${p.href ? `<a href="${esc(p.href)}">` : ''}<img src="${esc(p.url)}" alt="${esc(p.caption)}" loading="lazy">${p.href ? '</a>' : ''}<figcaption>${up(p.caption)}</figcaption></figure>`).join('')}</div>` : '';
  const fold = (title, inner) => inner ? `<details class="fold"><summary>${esc(title)}</summary><div class="body">${inner}</div></details>` : '';
  const rows = (pairs, cls = '') => `<dl class="rows${cls ? ' ' + cls : ''}">${pairs.map(([k, v]) => `<dt>${up(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;

  // Median sale price by year, one series in ink. Thin years (<3 sales) are faded; hover for figures.
  function chart(byYear, label) {
    const ys = Object.entries(byYear || {}).map(([y, v]) => ({ y: +y, n: v.count, m: v.median })).sort((a, b) => a.y - b.y);
    if (ys.length < 3) return '';
    const W = 720, H = 180, top = 10, base = H - 18, max = Math.max(...ys.map((d) => d.m));
    const step = W / ys.length, bw = Math.max(step - 2, 2);
    const bars = ys.map((d, i) => {
      const h = Math.max((d.m / max) * (base - top), 1), x = i * step, tx = Math.min(Math.max(x - 50, 0), W - 140);
      return `<g><rect class="bar${d.n < 3 ? ' thin' : ''}" x="${x.toFixed(1)}" y="${(base - h).toFixed(1)}" width="${bw.toFixed(1)}" height="${h.toFixed(1)}" rx="1"></rect>
<rect x="${x.toFixed(1)}" y="${top}" width="${step.toFixed(1)}" height="${base - top}" fill="transparent"></rect>
${i % 5 === 0 || (i === ys.length - 1 && i % 5 > 2) ? `<text x="${x.toFixed(1)}" y="${H - 4}">${d.y}</text>` : ''}
<g class="tip"><rect x="${tx.toFixed(1)}" y="${top}" width="140" height="34"></rect><text x="${(tx + 8).toFixed(1)}" y="${top + 14}">${d.y} // ${money(d.m)}</text><text x="${(tx + 8).toFixed(1)}" y="${top + 27}">${d.n} SALE${d.n === 1 ? '' : 'S'}</text></g></g>`;
    }).join('');
    return `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
<line x1="0" y1="${base}" x2="${W}" y2="${base}" stroke="rgba(17,17,17,0.15)"></line>
<text x="0" y="${top - 2}">${money(max)}</text>${bars}</svg></div>`;
  }

  function blockPage(name) {
    const c = BLOCKS[name] || {};
    const r = R.blocks[name] || {};
    const types = Object.values(R.types).filter((t) => t.blocks[name]).sort((a, b) => (b.blocks[name] || 0) - (a.blocks[name] || 0));
    const outside = (r.photos || []).slice(1).map((p) => ({ url: commons(p, name), caption: name }));
    const inside = inBlock(name).flatMap((d) => d.photos.slice(0, 2).map((u) => ({
      url: resize(u, '900x'), caption: `From a flat ${d.channel === 'sales' ? 'for sale' : 'to let'}`, href: `../../${d.property_id}/`,
    }))).slice(0, 9);
    const numbers = [['Completed', c.completed], ['Floors', c.floors], ['Flats', c.flats]].filter(([, v]) => v);
    const prose = [['Named after', [c.named_after, c.namesake].filter(Boolean).join('. ')], ['Where', c.setting], ['Inside', c.inside], ['Way in', c.getting_in]].filter(([, v]) => v);
    const beds = (b) => (b === 0 ? 'Studio' : b == null ? '' : `${b} bed`);
    const body = `
${c.lede ? `<p class="lede">${esc(c.lede)}</p>` : ''}
${plates([...outside, ...inside])}
<div class="numbers">${numbers.map(([k, v]) => `<div><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div>
<dl class="prose">${prose.map(([k, v]) => `<dt>${up(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>
<div class="folds">
${types.length ? fold('Flat types', `<dl class="rows table">${types.map((t) => `<dt><a href="${inside.some(x => x.type === t.type) ? `/inside/type-${t.type}/` : esc(t.source)}">${up(t.type)}</a></dt><dd>${esc(beds(t.beds))}</dd><dd>${esc(t.blocks[name])} flat${t.blocks[name] === 1 ? '' : 's'}</dd>`).join('')}</dl>`) : ''}
${fold('What flats sell for', chart(R.prices.by_block_year[name], `${name} median sale price by year`))}
</div>
${editorialPages.blockExtras(name)}
<div class="actions">
  <a class="btn" href="../../lettings/?block=${encodeURIComponent(name)}">TO LET IN ${up(name)}</a>
  <a class="btn" href="../../sales/?block=${encodeURIComponent(name)}">FOR SALE IN ${up(name)}</a>
</div>`;
    return page({ title: `${name} — Barbican Estate`, depth: 2, active: name, section: 'blocks', body, hero: heroImg(r.photos?.[0], '') });
  }

  function card(d, market = false) {
    const p = price(d);
    const type = R.listing_types[String(d.property_id)];
    const beds = Number(d.bedrooms) === 0 ? 'Studio' : `${d.bedrooms} bed`;
    return `<a class="card${live(d) ? '' : ' off'}"${live(d) || !market ? '' : ' hidden'} href="../${d.property_id}/" data-block="${esc(building(d))}" data-beds="${Number(d.bedrooms)}" data-live="${live(d) ? 1 : 0}" data-price="${num(d.price_value)}">
${d.photos[0] ? `<img src="${esc(resize(d.photos[0], '1200x'))}" alt="" loading="lazy">` : ''}
${live(d) ? '' : `<span class="tag">${up(d.status)}</span>`}
<div class="t">${up(building(d))}</div>
<div class="p">${esc(p.main)}<small>${up(p.unit)}</small></div>
<div class="m"><span>${up(beds)}${type ? ' // TYPE ' + up(type) : ''}</span><span>VIEW &gt;</span></div>
</a>`;
  }

  function marketPage(channel) {
    const rent = channel === 'lettings';
    const here = listings.filter((d) => d.channel === channel).sort((a, b) => live(b) - live(a) || num(b.price_value) - num(a.price_value));
    const rowsData = here.map((d) => ({ block: building(d), lat: d.lat, lng: d.lng }));
    const blocks = [...new Set(rowsData.map((r) => r.block))].sort();
    const head = `<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css">
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>`;
    const body = `
<div class="controls">
  <select class="btn" id="blk"><option value="">ALL BLOCKS</option>${blocks.map((n) => `<option value="${esc(n)}">${up(n)}</option>`).join('')}</select>
  <div class="grp" data-k="st"><button class="btn" data-v="live">AVAILABLE</button><button class="btn" data-v="all">INCL. ${rent ? 'LET' : 'SOLD'}</button></div>
  <div class="grp" data-k="beds"><button class="btn" data-v="any">ANY</button><button class="btn" data-v="0">STUDIO</button><button class="btn" data-v="1">1 BED</button><button class="btn" data-v="2">2 BED</button><button class="btn" data-v="3">3+</button></div>
  <div class="grp" data-k="sort"><button class="btn" data-v="desc">£ HIGH</button><button class="btn" data-v="asc">£ LOW</button></div>
</div>
<div class="cards" id="files">
${here.map((d) => card(d, true)).join('\n')}
</div>
<div class="empty" id="empty" hidden>Nothing matches. Try incl. ${rent ? 'let' : 'sold'}.</div>
<button class="btn more" id="more" hidden>VIEW ${rent ? 'LET' : 'SOLD'} FLATS &gt;</button>
<div>
<span class="section-title">The estate // shaded blocks have flats ${rent ? 'to let' : 'for sale'}</span>
<div id="map" style="margin-top:1rem"></div>
</div>
<script>
const ROWS = ${JSON.stringify(rowsData)};
const ESTATE = ${JSON.stringify(ESTATE)};
const S = { st: 'live', beds: 'any', sort: 'desc', block: new URLSearchParams(location.search).get('block') };
const files = [...document.querySelectorAll('#files .card')];
// The map is extra: if Leaflet fails to load, the filters and cards still work.
const M = typeof L === 'undefined' ? null : drawEstate();

function render() {
  document.querySelectorAll('.grp').forEach((g) => g.querySelectorAll('.btn').forEach((b) => b.classList.toggle('on', S[g.dataset.k] === b.dataset.v)));
  const ok = (el) => (S.st === 'all' || el.dataset.live === '1') && (S.beds === 'any' || (S.beds === '3' ? +el.dataset.beds >= 3 : +el.dataset.beds === +S.beds));
  const pool = files.filter(ok);
  let shown = pool.filter((el) => !S.block || el.dataset.block === S.block);
  // A block with nothing available shows its let/sold flats rather than an empty page.
  if (!shown.length && S.block && S.st === 'live') { S.st = 'all'; return render(); }
  files.forEach((el) => (el.hidden = !shown.includes(el)));
  shown.sort((a, b) => (S.sort === 'asc' ? 1 : -1) * (a.dataset.price - b.dataset.price)).forEach((el) => el.parentNode.appendChild(el));
  document.getElementById('empty').hidden = shown.length > 0;
  // Under the available flats: a way into the let/sold ones the filter hides.
  document.getElementById('more').hidden = S.st !== 'live' || !files.some((el) => el.dataset.live === '0');
  document.getElementById('blk').value = S.block || '';
  if (M) M.shade(pool);
}
function pick(n, scroll) {
  S.block = S.block === n ? null : n;
  history.replaceState(null, '', S.block ? '?block=' + encodeURIComponent(S.block) : location.pathname);
  render();
  if (scroll) document.querySelector('.controls').scrollIntoView({ behavior: 'smooth' });
}

function drawEstate() {
  const map = L.map('map', { zoomControl: false, scrollWheelZoom: false, zoomSnap: 0.25 }).setView([51.5195, -0.0945], 17);
  L.control.zoom({ position: 'bottomright' }).addTo(map);
  map.attributionControl.setPrefix('').addAttribution('© OpenStreetMap contributors');
  const style = { road: { color: '#e6e6e6', weight: 6, opacity: 1 }, walk: { color: '#d9d9d9', weight: 1, dashArray: '2 3' },
    green: { fillColor: '#f1f1f1', weight: 0, fillOpacity: 1 }, water: { fillColor: '#e4e4e4', weight: 0, fillOpacity: 1 },
    landmark: { fillColor: '#ffffff', color: '#b5b5b5', weight: 0.8, fillOpacity: 1 } };
  const order = { road: 0, walk: 1, green: 2, water: 3, landmark: 4, block: 5 };
  ESTATE.features.sort((a, b) => order[a.properties.kind] - order[b.properties.kind]);
  const blockLayers = {};
  L.geoJSON(ESTATE, {
    style: (f) => style[f.properties.kind] || { fillColor: '#d4d4d4', color: '#a8a8a8', weight: 0.6, fillOpacity: 1 },
    onEachFeature: (f, layer) => { if (f.properties.kind === 'block') { (blockLayers[f.properties.name] ||= []).push(layer); layer.on('click', () => pick(f.properties.name, true)); } },
  }).addTo(map);
  const area = (b) => (b.getNorth() - b.getSouth()) * (b.getEast() - b.getWest());
  const centre = {};
  for (const [n, ls] of Object.entries(blockLayers)) centre[n] = ls.map((l) => l.getBounds()).sort((a, b) => area(b) - area(a))[0].getCenter();
  const label = (n, at, dark) => L.tooltip({ permanent: true, direction: 'center', className: 'lbl' + (dark ? ' dark' : ''), offset: [0, 10] })
    .setLatLng(at).setContent(n.replace(/ (House|Court|Tower|Crescent|Mews|Building)$/, '<br>$1'));
  const marks = L.layerGroup().addTo(map);
  map.fitBounds(L.featureGroup(Object.values(blockLayers).flat()).getBounds(), { padding: [12, 12] });
  map.setMaxBounds(map.getBounds().pad(0.6));
  return {
    shade(pool) {
      marks.clearLayers();
      const by = {};
      pool.forEach((el) => (by[el.dataset.block] = true));
      for (const [n, ls] of Object.entries(blockLayers)) {
        label(n, centre[n], by[n]).addTo(marks);
        ls.forEach((l) => l.setStyle({ fillColor: n === S.block ? '#ffffff' : by[n] ? '#111111' : '#d4d4d4', color: by[n] || n === S.block ? '#111111' : '#a8a8a8', weight: n === S.block ? 2 : 0.6 }));
      }
      // Listings outside a mapped block (e.g. the Cobalt Building) get a small square.
      for (const n of Object.keys(by).filter((n) => !centre[n])) {
        const r = ROWS.find((x) => x.block === n);
        L.marker([r.lat, r.lng], { icon: L.divIcon({ className: '', html: '<span class="dot' + (n === S.block ? ' sel' : '') + '"></span>', iconSize: [0, 0] }), title: n }).on('click', () => pick(n, true)).addTo(marks);
        label(n, [r.lat, r.lng], true).addTo(marks);
      }
    },
  };
}

document.getElementById('blk').onchange = (e) => { S.block = null; pick(e.target.value || null); };
document.getElementById('more').onclick = () => { S.st = 'all'; render(); document.querySelector('.card.off:not([hidden])')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
document.querySelectorAll('.grp').forEach((g) => (g.onclick = (e) => { const v = e.target.dataset.v; if (v) { S[g.dataset.k] = v; render(); } }));
render();
</script>`;
    return page({ title: `Barbican Estate — ${rent ? 'to let' : 'for sale'}`, depth: 1, section: channel, body, head, sidebar: false });
  }

  function flatPage(d) {
    const { body: text, facts } = split(d);
    const f = Object.fromEntries(facts);
    const p = price(d);
    const name = building(d);
    const type = R.listing_types[String(d.property_id)];
    const typeGuide = inside.find(t => t.type === String(type));
    const rent = d.channel !== 'sales';
    const photos = d.photos.map((u) => resize(u, '1600x'));
    const c = BLOCKS[name];
    const numbers = [
      ['Bedrooms', Number(d.bedrooms) === 0 ? 'Studio' : d.bedrooms],
      ['Bathrooms', d.bathrooms], ['Receptions', d.reception_rooms],
      ['Flat type', type], ['Council tax', f['Council Tax Band'] && `Band ${f['Council Tax Band']}`],
    ].filter(([, v]) => v !== '' && v != null && v !== '0');
    const details = facts.filter(([k]) => k !== 'Council Tax Band').map(([k, v]) => [k, v]);
    const body = `
<div class="flat-head">
  <div class="t">${up(name)}</div>
  <div class="p">${esc(p.main)}<small>${up(p.unit)}${p.sub ? ' // ' + up(p.sub) : ''}</small></div>
  <div class="m"><span>${up(d.status)}</span><span>${up(d.display_address)}${d.postcode ? ', ' + up(d.postcode) : ''}</span></div>
</div>
<div class="numbers">${numbers.map(([k, v]) => `<div><b>${esc(v)}</b><span>${esc(k)}</span></div>`).join('')}</div>
<div class="text">${text}</div>
${d.features.length ? `<div class="tags">${d.features.map((x) => `<span>${esc(x)}</span>`).join('')}</div>` : ''}
${d.floorplans.map((u) => `<figure class="plan"><img src="${esc(u)}" alt="Floorplan" loading="lazy"></figure>`).join('')}
<div class="plates">${photos.slice(1).map((u, i) => `<figure><img src="${esc(u)}" data-i="${i + 1}" alt="" loading="lazy"></figure>`).join('')}</div>
<div class="folds">
${fold('Details', rows(details.length ? details : [['Status', d.status]]))}
</div>
${typeGuide ? `<a class="block-link" href="/inside/type-${typeGuide.type}/"><b>Inside type ${typeGuide.type} &gt;</b><span>${esc(typeGuide.lede)}</span></a>` : ''}
${c ? `<a class="block-link" href="../blocks/${slug(name)}/"><b>About ${esc(name)} &gt;</b><span>${esc(c.lede)}</span></a>` : ''}
<div class="actions">
  <a class="btn" href="tel:${esc((d.contact_telephone || '').replace(/\s/g, ''))}">CALL ${up(d.agency_name)} ${esc(d.contact_telephone)}</a>
  <a class="btn" href="${esc(d.source_url)}">ORIGINAL LISTING</a>
  <a class="btn" href="https://www.google.com/maps/search/?api=1&query=${d.lat},${d.lng}">MAP</a>
</div>
<div class="lb"><button class="x" aria-label="Close">×</button><button class="p" aria-label="Previous">‹</button><img alt=""><button class="n" aria-label="Next">›</button></div>
<script>
const P = ${JSON.stringify(photos)}, lb = document.querySelector('.lb'), im = lb.querySelector('img'); let i = 0;
const show = (n) => { i = (n + P.length) % P.length; im.src = P[i]; lb.classList.add('on'); };
const hide = () => lb.classList.remove('on');
document.querySelectorAll('img[data-i]').forEach((e) => (e.onclick = () => show(+e.dataset.i)));
lb.querySelector('.p').onclick = () => show(i - 1); lb.querySelector('.n').onclick = () => show(i + 1); lb.querySelector('.x').onclick = hide;
lb.onclick = (e) => { if (e.target === lb) hide(); };
addEventListener('keydown', (e) => { if (!lb.classList.contains('on')) return; if (e.key === 'Escape') hide(); if (e.key === 'ArrowLeft') show(i - 1); if (e.key === 'ArrowRight') show(i + 1); });
</script>`;
    const hero = photos[0] ? `<img src="${esc(photos[0])}" data-i="0" alt="${esc(name)}" style="cursor:zoom-in">` : '';
    return page({ title: `${name} — ${p.main}${p.unit ? ' ' + p.unit : ''} — Barbican Estate`, depth: 1, section: channel(d), body, sidebar: false, hero,
      image: photos[0], share: { title: `${name.toUpperCase()} — ${p.main}${p.unit ? ' ' + p.unit.toUpperCase() : ''}`, description: `${Number(d.bedrooms) === 0 ? 'STUDIO' : d.bedrooms + ' BED'} ${rent ? 'TO LET' : 'FOR SALE'} // BARBICAN ESTATE` } });
  }
  const channel = (d) => (d.channel === 'sales' ? 'sales' : 'lettings');

  function creditsPage() {
    const body = `<span class="section-title">Photo credits</span>
${rows([...credits.values()].map((c) => [c.caption || 'Photo', `${c.author}, ${c.licence}. ${c.page}`]))}
<p style="color:var(--faded-ink)">Photos of flats come from the agents' listings. Map data © OpenStreetMap contributors.</p>`;
    return page({ title: 'Photo credits — Barbican Estate', depth: 1, section: '', body, sidebar: false });
  }

  const editorialPages = createEditorial({ page, R, HISTORY, BLOCKS, ESTATE, ALL, commons, listings, building, live, card, chart });
  for (const [path, html] of editorialPages.pages) {
    mkdirSync(`site/${path}`, { recursive: true });
    writeFileSync(`site/${path ? path + '/' : ''}index.html`, html);
  }
  for (const d of flats) { mkdirSync(`site/${d.property_id}`, { recursive: true }); writeFileSync(`site/${d.property_id}/index.html`, flatPage(d)); }
  for (const ch of ['lettings', 'sales']) { mkdirSync(`site/${ch}`, { recursive: true }); writeFileSync(`site/${ch}/index.html`, marketPage(ch)); }
  mkdirSync('site/blocks', { recursive: true });
  for (const name of ALL) {
    mkdirSync(`site/blocks/${slug(name)}`, { recursive: true });
    writeFileSync(`site/blocks/${slug(name)}/index.html`, blockPage(name));
  }
  // Credits last, once every page has registered its photos.
  mkdirSync('site/credits', { recursive: true });
  writeFileSync('site/credits/index.html', creditsPage());
  return ALL.length + 3 + flats.length + editorialPages.pages.size;
}
