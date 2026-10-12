// Explore, film and community pages. The archive renderer supplies the shared shell.
import { readFileSync } from 'node:fs';
const read = (file) => JSON.parse(readFileSync(`content/${file}.json`, 'utf8'));
export const films = read('films');
export const inside = read('inside');
const stories = read('life');
const community = read('community');
const contact = read('contribute');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g,'');
const json = (v) => JSON.stringify(v).replace(/</g, '\\u003c');
const btn = (href, label) => `<a class="btn" href="${esc(href)}">${esc(label)} &gt;</a>`;
const intro = (title, text) => `<div class="editorial-intro"><h2 class="editorial-title">${esc(title)}</h2><p class="lede">${esc(text)}</p></div>`;
const section = (title, body) => `<section class="editorial-section"><h2 class="editorial-heading">${esc(title)}</h2>${body}</section>`;
const next = (items) => `<div class="editorial-links">${items.map(([url,label]) => btn(url,label)).join('')}</div>`;
const filmUrl = (f) => `https://www.youtube.com/watch?v=${f.youtube_id}`;
for (const f of films) {
  if (!/^[\w-]{11}$/.test(f.youtube_id) || !/^[a-z0-9-]+$/.test(f.slug)) throw new Error('Invalid film identity');
}
for (const s of community) {
  if (!/^[a-z0-9-]+$/.test(s.slug) || !Array.isArray(s.body)) throw new Error('Invalid community story');
  if (s.status === 'published' && (!s.permission_confirmed || !s.reviewed_on || !s.display_name)) throw new Error('Published stories require review and permission');
}
if (contact.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) throw new Error('Invalid contribution inbox');
export function filmPlayer(f) {
  return `<div class="film-player"><button type="button" data-video="${f.youtube_id}" aria-label="Play ${esc(f.title)}"><img src="${esc(f.poster)}" alt="" loading="lazy"><span>PLAY ${f.format.toUpperCase()} &#9654;</span></button></div><p class="film-meta">${esc(f.maker)} / ${esc(f.format)}${f.duration ? ` / ${esc(f.duration)}` : ''}</p><p class="editorial-note"><a href="${filmUrl(f)}">Watch on YouTube</a></p>`;
}
const playerScript = `<script>
document.querySelectorAll('[data-video]').forEach(button => button.addEventListener('click', () => {
 const iframe = document.createElement('iframe');
 iframe.src = 'https://www.youtube-nocookie.com/embed/' + button.dataset.video + '?autoplay=1&playsinline=1&rel=0';
 iframe.title = button.getAttribute('aria-label');
 iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
 iframe.referrerPolicy = 'strict-origin-when-cross-origin';
 iframe.allowFullscreen = true;
 button.replaceWith(iframe); iframe.focus();
}));
</script>`;

export function createEditorial({ page, R, HISTORY, BLOCKS, ESTATE, ALL, commons, listings, building, live, card, chart }) {
  const photo = (i, alt, eager=false) => `<img src="${esc(commons(R.history.images[i], alt))}" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'}>`;
  const tile = (href,title,text,i) => `<a class="editorial-card" href="${esc(href)}">${photo(i,title)}<h3>${esc(title)}</h3><p>${esc(text)}</p><div class="m">Read more &gt;</div></a>`;
  const filmCard = (f) => `<article class="editorial-section" data-category="${esc(f.category)}" id="${f.slug}"><a class="editorial-card film-card" href="/watch/${f.slug}/"><img src="${esc(f.poster)}" alt="" loading="lazy"><h3>${esc(f.title)}</h3><p>${esc(f.description)}</p><div class="m">${esc(f.maker)} / ${esc(f.format)}${f.duration ? ` / ${esc(f.duration)}` : ''} &gt;</div></a></article>`;
  const wrap = (path,title,body,extra={}) => page({title:`${title} — Barbican Estate`,depth:path ? path.split('/').filter(Boolean).length : 0,section:'explore',editorial:path.split('/')[0] || 'explore',sidebar:false,body,route:path,...extra});
  const cta = (prompt='',block='') => `<a class="block-link" href="/contribute/?prompt=${encodeURIComponent(prompt)}&amp;block=${encodeURIComponent(block)}"><b>Share a memory &gt;</b><span>Do you have an old photograph or a story about living here?</span></a>`;
  const pages = new Map();

  pages.set('', wrap('', 'History', `${intro('History','How the Barbican was built, and what it’s like to live here.')}
<div class="editorial-grid">${tile('/history/','The story','How the estate replaced the streets of Cripplegate.',5)}${tile('/blocks/','The estate','A map and guide to the blocks.',14)}${tile('/inside/','Inside the flats','Flat layouts and where to find them.',12)}${tile('/life/','Life here','Residents talk about their homes.',18)}</div>
${section('The Barbican on film',`${filmPlayer(films[0])}${next([['/watch/','All films']])}`)}${cta()}${playerScript}`,{hero:photo(7,'The Barbican Estate from above',true)}));

  const milestones = ['1940','1955','1959','1969','1976','1982','2001'];
  pages.set('history', wrap('history','The story',`${intro('The story','From the bombing of Cripplegate in 1940 to the first residents in 1969.')}
<ol class="timeline">${milestones.map(y=>HISTORY.story.find(([year])=>year===y)).map(([year,text])=>`<li><b>${esc(year)}</b><p>${esc(text)}</p></li>`).join('')}</ol>
${section('Above street level',`<div class="editorial-grid">${tile('/blocks/','The highwalks',HISTORY.built[0][1],14)}${tile('/inside/','The homes','A guide to the flat types.',12)}</div>`)}
<div class="folds"><details class="fold"><summary>The full timeline</summary><div class="body"><ol class="timeline">${HISTORY.story.map(([year,text])=>`<li><b>${esc(year)}</b><p>${esc(text)}</p></li>`).join('')}</ol></div></details><details class="fold"><summary>How it was built</summary><div class="body"><dl class="rows">${HISTORY.built.map(([k,v])=>`<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl></div></details><details class="fold"><summary>The architects</summary><div class="body"><dl class="rows">${HISTORY.people.map(([n,d,t])=>`<dt>${esc(n)}<br>${esc(d)}</dt><dd>${esc(t)}</dd>`).join('')}</dl></div></details></div>
<details class="fold"><summary>Things you might not know</summary><div class="body text">${HISTORY.facts.map(f=>`<p>${esc(f)}</p>`).join('')}</div></details>
<details class="fold"><summary>What flats sell for</summary><div class="body">${chart(R.prices.by_year, 'Median sale price by year')}</div></details>
${section('Building the Barbican',`${filmPlayer(films[1])}`)}${cta('moving-in')}${playerScript}`,{hero:photo(8,'Terraces and podium of the Barbican',true)}));

  function estateMap() {
    const features=ESTATE.features.filter(f=>f.geometry.type==='Polygon' || f.geometry.type==='MultiPolygon');
    const polygons=f=>f.geometry.type==='Polygon'?[f.geometry.coordinates]:f.geometry.coordinates;
    const points=features.filter(f=>f.properties.kind==='block').flatMap(f=>polygons(f).flat(2));
    const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    const width=900,height=650,pad=30;
    const scale=Math.min((width-2*pad)/((maxX-minX)*Math.cos(51.52*Math.PI/180)),(height-2*pad)/(maxY-minY));
    const project=([x,y])=>[pad+(x-minX)*Math.cos(51.52*Math.PI/180)*scale,height-pad-(y-minY)*scale];
    return `<div class="estate-plan"><svg viewBox="0 0 ${width} ${height}" aria-label="Map of the Barbican blocks"><text x="850" y="30" font-size="16">N ↑</text>${features.map(f=>{
      const name=f.properties.name, isBlock=f.properties.kind==='block'&&ALL.includes(name);
      const d=polygons(f).map(poly=>poly.map(ring=>ring.map((p,i)=>(i?'L':'M')+project(p).map(n=>n.toFixed(1)).join(',')).join(' ')+'Z').join(' ')).join(' ');
      const path=`<path d="${d}" ${isBlock?'class="map-block"':`fill="${f.properties.kind==='water'?'#c8d6dc':'#f0f0f0'}" stroke="white"`} fill-rule="evenodd"/>`;
      return isBlock?`<a href="/blocks/${slug(name)}/" aria-label="${esc(name)}"><title>${esc(name)}</title>${path}</a>`:path;
    }).join('')}</svg><p class="editorial-note">Choose a block on the map or from the list below.</p></div>`;
  }
  pages.set('blocks',wrap('blocks','The estate',`${intro('The estate','Choose a block to see its history, flats and photographs.')}${estateMap()}<div class="editorial-grid">${ALL.map(name=>{const p=R.blocks[name]?.photos?.[0];return `<a class="editorial-card" href="/blocks/${slug(name)}/">${p?`<img src="${esc(commons(p,name))}" alt="${esc(name)}" loading="lazy">`:''}<h3>${esc(name)}</h3><p>${esc(BLOCKS[name]?.lede||'About this block.')}</p></a>`;}).join('')}</div>${next([['/history/','The story'],['/life/','Life here']])}`));

  pages.set('inside',wrap('inside','Inside the flats',`${intro('Inside the flats','Five flat types explained, with links to plans for the rest.')}<div class="editorial-grid">${inside.map(t=>tile(`/inside/type-${t.type}/`,`Type ${t.type}`,t.lede,t.image)).join('')}</div>${section('Find another type',`<label class="editorial-note" for="type-search">Type number or block</label><input id="type-search" type="search" placeholder="Try 31 or Gilbert House" style="font:16px var(--sans);padding:1rem;border:1px solid;width:100%"><ul class="type-list">${Object.values(R.types).sort((a,b)=>a.type.localeCompare(b.type,undefined,{numeric:true})).map(t=>`<li data-type="${esc((t.type+' '+Object.keys(t.blocks).join(' ')).toLowerCase())}"><a href="${inside.some(x=>x.type===t.type)?`/inside/type-${t.type}/`:esc(t.source)}">Type ${esc(t.type)}${inside.some(x=>x.type===t.type)?'':' ↗'}</a></li>`).join('')}</ul><p id="type-empty" class="editorial-note" hidden>No matching types. Try a block name or another number.</p><p class="editorial-note">The other type links open Barbican Living’s plan guides.</p>`)}${cta('original-detail')}
<script>const search=document.querySelector('#type-search'), types=[...document.querySelectorAll('[data-type]')];search.addEventListener('input',()=>{const q=search.value.trim().toLowerCase();types.forEach(el=>el.hidden=!el.dataset.type.includes(q));document.querySelector('#type-empty').hidden=types.some(el=>!el.hidden);});</script>`));
  for(const t of inside) {
    const data=R.types[t.type];
    const available=listings.filter(d=>live(d)&&String(R.listing_types[String(d.property_id)])===t.type);
    pages.set(`inside/type-${t.type}`,wrap(`inside/type-${t.type}`,`Type ${t.type}`,`${intro(`Type ${t.type}`,t.lede)}${section(t.title,`<div class="text"><p>${esc(t.body)}</p></div>`)}${next([[data.source,'See the plan on Barbican Living'],[`/inside/type-${t.compare}/`,`Compare type ${t.compare}`]])}${section('Find it in',`<div class="editorial-links">${Object.keys(data.blocks).map(n=>btn(`/blocks/${slug(n)}/`,n)).join('')}</div>`)}${available.length?section('On the market',`<div class="cards">${available.map(d=>card(d).replace('href="../','href="/')).join('')}</div>`):''}${cta('original-detail')}`,{hero:photo(t.image,'The Barbican Estate',true)}));
  }

  pages.set('watch',wrap('watch','Watch',`${intro('Watch','Films about the Barbican’s buildings and residents.')}<div class="film-filters" role="group" aria-label="Filter films">${['All','History','Architecture','Life here'].map((c,i)=>`<button class="btn${i?'':' on'}" aria-pressed="${i?'false':'true'}" data-filter="${c}">${c.toUpperCase()}</button>`).join('')}</div><div class="editorial-grid">${films.map(filmCard).join('')}</div>${cta('film')}
<script>document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-filter]').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',String(x===b));});document.querySelectorAll('[data-category]').forEach(el=>el.hidden=b.dataset.filter!=='All'&&el.dataset.category!==b.dataset.filter);}));</script>`));
  for(const f of films) pages.set(`watch/${f.slug}`,wrap(`watch/${f.slug}`,f.title,`${intro(f.title,f.description)}${filmPlayer(f)}${next([[f.related,f.related_label],['/watch/','More films']])}${cta('film')}${playerScript}`));

  const published=community.filter(s=>s.status==='published');
  pages.set('life',wrap('life','Life here',`${intro('Life here','Residents talk about living at the Barbican, from the first years to today.')}${section('Residents on film',`<div class="editorial-grid">${stories.map(s=>tile(`/life/${s.slug}/`,s.title,s.lede,s.image)).join('')}</div>`)}${published.length?section('Readers’ stories',`<div class="editorial-grid">${published.map(s=>`<a class="block-link" href="/life/community-${s.slug}/"><b>${esc(s.title)}</b><span>${esc(s.display_name)}</span></a>`).join('')}</div>`):''}${section('Share a memory',`<div class="editorial-links">${btn('/contribute/?prompt=moving-in','Moving in')}${btn('/contribute/?prompt=original-detail','An original detail')}${btn('/contribute/?prompt=old-photo','An old photograph')}${btn('/contribute/?prompt=small-discovery','A small discovery')}</div>`)}`));
  for(const s of stories) pages.set(`life/${s.slug}`,wrap(`life/${s.slug}`,s.title,`${intro(s.title,s.lede)}<div class="text">${s.body.map(p=>`<p>${esc(p)}</p>`).join('')}</div>${filmPlayer(films.find(f=>f.slug===s.film))}${next([...s.blocks.map(b=>[`/blocks/${slug(b)}/`,b]),['/life/','More stories']])}${cta(s.prompt)}${playerScript}`));
  for(const s of published) pages.set(`life/community-${s.slug}`,wrap(`life/community-${s.slug}`,s.title,`${intro(s.title,`By ${s.display_name}`)}<div class="text">${s.body.map(p=>`<p>${esc(p)}</p>`).join('')}</div>${next((s.blocks||[]).filter(b=>ALL.includes(b)).map(b=>[`/blocks/${slug(b)}/`,b]))}${cta()}`));

  pages.set('contribute',wrap('contribute','Add your story',`${intro('Add your story','Tell us about living here, or share an old photograph.')}
<p class="text">${contact.email?'Write your story below, then email it to us. We read each story before publishing it.':'We’re not accepting stories yet. You can write one below and save a copy. It won’t be sent.'}</p>
<form class="contribution-form" id="contribution-form">
<label>What is it about?<select name="prompt"><option value="moving-in">Moving in</option><option value="original-detail">An original detail</option><option value="old-photo">An old photograph</option><option value="small-discovery">A small discovery</option><option value="film">A film to include</option><option value="other">Something else</option></select></label>
<label>Block or place <span class="editorial-note">Optional. Please leave out your flat number.</span><select name="block"><option value="">The estate</option>${ALL.map(n=>`<option>${esc(n)}</option>`).join('')}</select></label>
<label>Name to show with your story<input name="name" required maxlength="80" autocomplete="nickname"><span class="editorial-note">A first name or pen name is fine.</span></label>
<label>Title<input name="title" required maxlength="120"></label>
<label>Your memory or story<textarea name="story" required maxlength="6000"></textarea></label>
<label>When was this? <span class="editorial-note">A year or decade is enough.</span><input name="date" maxlength="80"></label>
<label>Photo or film link <span class="editorial-note">Optional. You can attach your own photograph when you send an email.</span><input name="media" type="url" placeholder="https://" maxlength="1000"></label>
<label class="permission"><input name="permission" type="checkbox" required><span>This is my contribution, and I give permission for it to be edited and published on Barbican Estate. I have permission to share any photographs I supply.</span></label>
<p class="editorial-note">Please leave out other people’s contact details and private addresses. Your text stays in this page until you download it${contact.email?' or choose to email it':''}.</p>
<button class="btn" type="submit">PREVIEW YOUR STORY &gt;</button>
</form><section id="draft" class="editorial-section" hidden aria-label="Story preview"><h2 class="editorial-heading">Your story</h2><div class="contribution-preview" id="draft-text"></div><div class="editorial-links"><button class="btn" id="download" type="button">SAVE A COPY</button>${contact.email?'<a class="btn" id="send">SEND BY EMAIL &gt;</a>':''}</div><p class="editorial-note" id="draft-status" role="status"></p></section>
<script>
const form=document.querySelector('#contribution-form'), params=new URLSearchParams(location.search);
for(const key of ['prompt','block']) { const val=params.get(key); if([...form.elements[key].options].some(o=>o.value===val)) form.elements[key].value=val; }
let draft='';
form.addEventListener('submit',e=>{e.preventDefault();if(!form.reportValidity())return; const d=Object.fromEntries(new FormData(form));
 draft=d.title+'\\n\\nBy '+d.name+'\\n'+(d.block||'Barbican Estate')+(d.date?' / '+d.date:'')+'\\n\\n'+d.story+(d.media?'\\n\\nPhoto or film: '+d.media:'')+'\\n\\nPermission to edit and publish: confirmed by contributor.\\n';
 document.querySelector('#draft-text').textContent=draft;document.querySelector('#draft').hidden=false;
 const send=document.querySelector('#send');if(send)send.href='mailto:'+${json(contact.email || '')}+'?subject='+encodeURIComponent('Barbican contribution: '+d.title)+'&body='+encodeURIComponent(draft);
 document.querySelector('#draft-status').textContent='Your story has not been sent.';
 document.querySelector('#draft').scrollIntoView({behavior:'auto'});
});
document.querySelector('#download').addEventListener('click',()=>{const url=URL.createObjectURL(new Blob([draft],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='barbican-contribution.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);document.querySelector('#draft-status').textContent='Copy saved. Your story has not been sent.';});
form.addEventListener('input',()=>{document.querySelector('#draft').hidden=true;});
</script>`));

  function blockExtras(name) {
    const related=stories.filter(s=>s.blocks.includes(name));
    const residents=published.filter(s=>(s.blocks||[]).includes(name));
    return `${related.length?section('Life here',`<div class="editorial-links">${related.map(s=>btn(`/life/${s.slug}/`,s.title)).join('')}</div>`):''}${residents.length?section('Readers’ stories',next(residents.map(s=>[`/life/community-${s.slug}/`,s.title]))):''}${cta('',name)}`;
  }
  return { pages, blockExtras };
}
