// After one agency's fetch: record which of its listings were seen, and count misses.
// Usage: node reconcile.mjs <agency> <run-start ISO time>
//   agency = frankharris (files named <digits>.json) or the file prefix (nicolalee, thomasmichael, base).
// State lives in data/seen.json, keyed by file name: { first_seen, last_seen, missed }.
// Fetchers rewrite listing files from scratch, so the history cannot live in them.
// A listing re-written in this run (fetched_at >= start) is seen: missed = 0.
// A listing not re-written gets missed + 1. build.mjs treats missed >= 2 as no longer listed.
// A run that saw nothing, when the agency had live stock before, is taken as a failed crawl
// and changes nothing, so one bad fetch cannot retire every listing.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';

const [agency, start] = process.argv.slice(2);
if (!agency || !start) { console.error('usage: node reconcile.mjs <agency> <run-start ISO>'); process.exit(1); }
const STATE = 'data/seen.json';
const seenState = existsSync(STATE) ? JSON.parse(readFileSync(STATE, 'utf8')) : {};
const mine = (f) => (agency === 'frankharris' ? /^\d+\.json$/.test(f) : f.startsWith(agency + '-') && f.endsWith('.json'));
const files = readdirSync('data').filter(mine).map((f) => [f, JSON.parse(readFileSync(`data/${f}`, 'utf8'))]);
const LIVE = /^(to let|for sale|available)$/i;
const seen = files.filter(([, d]) => d.fetched_at >= start);
const wasLive = files.filter(([f, d]) => LIVE.test(d.status) && (seenState[f]?.missed || 0) < 2).length;

if (!seen.length && wasLive) {
  console.error(`${agency}: run saw 0 listings but ${wasLive} were live; treating as a failed crawl, nothing changed`);
  process.exit(0);
}
let missed = 0;
for (const [f, d] of files) {
  const s = (seenState[f] ||= { first_seen: d.fetched_at, last_seen: d.fetched_at, missed: 0 });
  if (d.fetched_at >= start) Object.assign(s, { last_seen: d.fetched_at, missed: 0 });
  else { s.missed += 1; missed++; }
}
writeFileSync(STATE, JSON.stringify(seenState, null, 1));
console.log(`${agency}: ${seen.length} seen, ${missed} not seen this run`);
