/* Regenerate the accessible, static publication section after editing its data. */
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'data/publications.json'),'utf8'));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const own=name=>/nikhil.*deep/i.test(name)||/^deep,?\s*n\.?\s*r/i.test(name);
const link=(href,label,cls='')=>`<a${cls?` class="${cls}"`:''} href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}</a>`;
const groups=[['pipeline','Preparation, review & press','Work in progress'],['published','Published publications','Articles & book chapters'],['conference','Conference publications & presentations','Research in conversation']];
const ids=new Set();
for(const item of data.items){
 if(ids.has(item.id))throw Error('Duplicate publication '+item.id);ids.add(item.id);
 if(!item.title||!item.authors?.length||!groups.some(g=>g[0]===item.group))throw Error('Incomplete '+item.id);
 for(const key of ['url','scholarUrl','citationUrl','dataUrl','codeUrl','preprintUrl'])if(item[key]&&!item[key].startsWith('https://'))throw Error('Unsafe link '+item.id);
 if(!item.authors.some(own))throw Error('Missing author identity '+item.id);
 if(item.impact&&(!(item.impact.year||item.impact.checked)||!item.impact.url))throw Error('Impact factor needs metric year or source-check date and source');
}
function record(item){
 const role=item.role||(own(item.authors[0])?'First author':'Coauthor');
 const href=item.doi?'https://doi.org/'+item.doi:item.url;
 const authors=item.authors.map(name=>own(name)?'<strong class="publication-self">Nikhil Raj Deep</strong>':esc(name)).join('<span class="author-separator">; </span>');
 const venue=[item.venue,item.volume&&`${item.volume}${item.issue?`(${item.issue})`:''}`,item.pages].filter(Boolean).join(' · ');
 const badges=[`<span class="publication-venue">${esc(venue)}</span>`,`<span>${esc(item.year)}</span>`];
 if(item.kind)badges.push(`<span>${esc(item.kind)}</span>`);
 if(item.status)badges.push(`<span class="publication-status status-${item.status.toLowerCase().replaceAll(' ','-')}">${esc(item.status)}</span>`);
 if(item.impact)badges.push(link(item.impact.url,`IF ${item.impact.value}${item.impact.year?` (${item.impact.year})`:''}`,'publication-impact'));
 badges.push(`<span class="publication-role">${esc(role)}</span>`);
 if(item.corresponding===true)badges.push('<span class="publication-role">Corresponding author</span>');
 if(Number(item.citations)>0)badges.push(link(item.citationUrl||item.scholarUrl,`${item.citations} citation${item.citations===1?'':'s'}`,'publication-citations'));
 const links=[];
 if(item.doi)links.push(link('https://doi.org/'+item.doi,'DOI ↗'));
 else if(item.url)links.push(link(item.url,item.group==='conference'?'Abstract ↗':'Read ↗'));
 if(item.openAccess)links.push(link(href,'Open access ↗'));
 if(item.codeUrl)links.push(link(item.codeUrl,'Code ↗'));
 if(item.dataUrl)links.push(link(item.dataUrl,'Data ↗'));
 if(item.preprintUrl)links.push(link(item.preprintUrl,'Preprint ↗'));
 return `<li class="publication-record" data-year="${item.year}" data-date="${esc(item.date||item.year)}" data-citations="${Number(item.citations)||0}"><div class="publication-authors">${authors}</div><h4>${href?link(href,item.title):esc(item.title)}</h4><div class="publication-badges">${badges.join('')}</div>${item.publisher?`<p class="publication-book">${esc(item.publisher)}${item.editors?` · Edited by ${esc(item.editors)}`:''}</p>`:''}${links.length?`<div class="publication-links">${links.join('')}</div>`:''}</li>`;
}
const latest=(a,b)=>String(b.date||b.year).localeCompare(String(a.date||a.year))||a.title.localeCompare(b.title);
const count=g=>data.items.filter(i=>i.group===g).length;
const upcoming=data.items.filter(i=>i.group==='conference'&&i.status==='Upcoming').length;
const date=new Date(data.updated+'T12:00:00Z').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'});
const html=`<section class="section publication-section" id="publication">
  <div class="wrap">
    <div class="kicker">04 · Publications</div>
    <div class="publication-heading"><div><h2>Research, in print<br>and in progress.</h2><p>Soil, water, vegetation and the methods that connect them.</p></div>${link(data.scholarProfile,'Google Scholar ↗','publication-scholar')}</div>
    <div class="publication-stats" aria-label="Publication summary"><div><strong>${data.scholarTotalCitations}</strong><span>Total citations</span><small>Google Scholar</small></div><div><strong>${count('published')}</strong><span>Published articles</span><small>Excludes preprints and work in press</small></div><div><strong>${count('conference')}</strong><span>Conference presentations</span><small>Includes ${upcoming} upcoming contributions</small></div></div>
    <div class="publication-toolbar"><nav aria-label="Publication categories">${groups.map(([id,title])=>`<a href="#publications-${id}">${id==='pipeline'?'In progress':id==='published'?'Published':'Conferences'} <span>${count(id)}</span></a>`).join('')}</nav><div class="publication-controls" hidden><label><span class="sr-only">Search publications</span><input id="publicationSearch" type="search" placeholder="Search publications" autocomplete="off"></label><label><span class="sr-only">Sort publications</span><select id="publicationSort"><option value="recent">Latest first</option><option value="citations">Most cited</option></select></label></div></div>
    <p class="publication-source-note">${link(data.scholarProfile,'Google Scholar')} · Updated <time datetime="${data.updated}">${date}</time> · IF = journal impact factor; year shown when specified by the publisher.</p>
    <p id="publicationSearchStatus" class="sr-only" aria-live="polite"></p>
    ${groups.map(([id,title])=>`<div class="publication-group" id="publications-${id}"><div class="publication-group-heading"><h3>${esc(title)}</h3><span class="publication-group-count">${count(id)}</span></div><ol class="publication-records">${data.items.filter(i=>i.group===id).sort(latest).map(record).join('\n')}</ol></div>`).join('\n')}
    <p class="publication-footnote">The citation total includes indexed preprints. Published articles and their preprints are counted once. Manuscript status follows the author’s curriculum vitae and verified publication records.</p>
  </div>
</section>`;
const file=path.join(root,'index.html');let page=fs.readFileSync(file,'utf8');
const start=page.search(/<section class="[^"]*" id="publication">/);
if(start<0)throw Error('Publication section missing');
const end=page.indexOf('</section>',start)+10;
page=page.slice(0,start)+html+page.slice(end);fs.writeFileSync(file,page);
console.log(`Generated ${data.items.length} records: ${count('pipeline')} in progress, ${count('published')} published, ${count('conference')} conferences.`);
