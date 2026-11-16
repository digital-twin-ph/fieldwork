import test from 'node:test';
import assert from 'node:assert/strict';
const {publicationMarkup,roleKey,layoutKey,readLayout,FORMATS,ROLES,promptFor}=await import('../build/publication.js');
const {inWriteUp,LEFT_OUT}=await import('../build/notes.js');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

// Experiment 202's simulation on Hagelloch found each of these; the render handles them.
const notes=[
  {kind:'derived',id:'d1',section:'Methods',fn:'source',text:'Hagelloch line list: 188 cases.',nodeId:'src'},
  {kind:'machined',id:'m1',section:'Methods',fn:'method',text:'Cases were counted by day.',nodeId:'a'},
  {kind:'machined',id:'m2',section:'Methods',fn:'method',text:'Cases were counted by day.',nodeId:'b'},
  {kind:'machined',id:'m3',section:'Methods',fn:'method',text:'The score is\n\n$$\\lambda=c\\log(c/e)$$',nodeId:'c'},
  {kind:'machined',id:'map:description',section:'Results',text:'**Cluster map.** 3 layers.',nodeId:'map'},
  {kind:'machined',id:'t:description',section:'Results',text:'**Cases by class.** 4 rows.',nodeId:'t'},
  {kind:'machined',id:'map:basemap',section:'Results',fn:'limitation',text:'The ground is OpenStreetMap.',nodeId:'map'},
];
const from={a:'Curve',b:'Cluster',c:'Cluster',src:'Curve',map:'Cluster',t:'Curve'};
const html=publicationMarkup({title:'Measles in Hagelloch, 1861',authors:['A. Author'],date:'14 November 2026',notes,
  sourceOf:n=>from[n.nodeId],
  figureOf:n=>n.nodeId==='src'?'<figure class="notes-figure" data-figure="table"><table><tr><td>188 rows</td></tr></table></figure>'
    :n.nodeId==='map'&&n.id.endsWith('description')?'<figure class="notes-figure" data-figure="map"><svg></svg></figure>'
    :n.nodeId==='t'?'<figure class="notes-figure" data-figure="table"><table><tr><td>x</td></tr></table></figure>':undefined,
  references:[{kind:'method',text:'Kulldorff M. 2005.',citedBy:['Cluster']},{kind:'method',text:'No source read.',uncited:true,citedBy:[]}]},esc);

test('the same note from two workflows is printed once',()=>{
  assert.equal(html.split('Cases were counted by day.').length-1,1);
});
test('a source table stays out of the body and is named under Data availability',()=>{
  assert.ok(!html.includes('188 rows'));
  assert.match(html,/Data availability[\s\S]*Hagelloch line list: 188 cases\./);
});
test('a figure is numbered and its note is its caption; a table is numbered apart',()=>{
  assert.match(html,/<figure class="pub-figure pub-w-full pub-p-line" data-pub-note="map:description"><figure class="notes-figure" data-figure="map"><svg><\/svg><\/figure><figcaption class="pub-caption"><strong>Figure 1\.<\/strong> <strong>Cluster map\.<\/strong> 3 layers\./);
  assert.match(html,/<strong>Table 1\.<\/strong> <strong>Cases by class\.<\/strong>/);
});
test('a display formula goes to the Appendix, its pointer left in its place',()=>{
  assert.match(html,/\(Equation A1, in the Appendix\.\)/);
  assert.match(html,/Appendix: equations[\s\S]*Equation A1\.<\/strong> Cluster/);
});
test('limitations are gathered under Discussion',()=>{
  assert.match(html,/4\. Discussion[\s\S]*<h3>Limitations<\/h3>[\s\S]*The ground is OpenStreetMap\./);
  assert.ok(html.indexOf('The ground is OpenStreetMap.')>html.indexOf('4. Discussion'));
});
test('the parts the person writes are prompts, and none is drafted',()=>{
  for(const part of ['Background','Introduction','Discussion','Conclusions'])assert.match(html,new RegExp(`pub-prompt-label">${part} `));
});
test('references are numbered, and a method with no work read is not listed',()=>{
  assert.match(html,/<ol class="pub-references"><li>Kulldorff M\. 2005\.<\/li><\/ol>/);
  assert.ok(!html.includes('No source read.'));
});
test('nothing of the Notes tab comes through',()=>{
  assert.ok(!/notes-kind|data-note|\+ note|words ·/.test(html));
});
test('a figure can be left out of the write-up',()=>{
  assert.equal(inWriteUp({section:LEFT_OUT}),false);
  assert.equal(inWriteUp({section:'Results'}),true);
  assert.equal(inWriteUp({}),true);
});

test('Hagelloch cites its own source: a source note and Pfeilsticker in References',async()=>{
  const {hagellochExample}=await import('../build/hagelloch-example.js');
  const {derivedNotes}=await import('../build/notes-derived.js');
  const {referenceList}=await import('../build/references.js');
  const derived=derivedNotes(hagellochExample().nodes,'hagelloch');
  assert.ok(derived.some(n=>n.fn==='source'&&/188 cases/.test(n.text)));
  const refs=referenceList([{workflowName:'Hagelloch',machined:[],derived}],[]);
  assert.ok(refs.some(r=>/^Pfeilsticker A\. .*1863\.$/.test(r.text)));
});

test('a map in the publication drops its own title, which its caption carries, and the band it stood in',async()=>{
  const {standaloneMapSvg}=await import('../build/map-communication.js');
  const {withoutHeading}=await import('../build/publication.js');
  const spec={title:'The cluster, Hagelloch',subtitle:'Cases and the most likely cluster',sourceNote:'Source: Pfeilsticker 1863',items:[],legend:false};
  const figure=`<figure class="notes-figure" data-figure="map">${standaloneMapSvg('<rect width="850" height="295"/>','0 0 850 295',spec)}</figure>`;
  assert.match(figure,/The cluster, Hagelloch<\/text>/);
  const cropped=withoutHeading(figure);
  assert.doesNotMatch(cropped,/The cluster, Hagelloch<\/text>|Cases and the most likely cluster<\/text>/);
  assert.match(cropped,/Source: Pfeilsticker 1863/);
  const [,top]=/viewBox="0 (\d+) 850 \d+"/.exec(cropped);
  assert.ok(Number(top)>0);
});


// FORMATS AS MAPPINGS ONTO ROLES (experiment 202, 2026-11-15), declared in widgets/report-formats.json.
const base={title:'Measles in Hagelloch, 1861',authors:[],date:'15 November 2026',
  notes:[...notes,{kind:'authored',id:'i1',section:'Introduction',text:'Measles came to the village in October.'},
    {kind:'authored',id:'d2',section:'Discussion',text:'The school drove the spread.'}],
  sourceOf:n=>from[n.nodeId],
  figureOf:n=>n.nodeId==='map'&&n.id.endsWith('description')?'<figure class="notes-figure" data-figure="map"><svg></svg></figure>':undefined,
  references:[{kind:'method',text:'Kulldorff M. 2005.',citedBy:['Cluster']}]};
const h2s=html=>[...html.matchAll(/<h2>([^<]*)<\/h2>/g)].map(m=>m[1]);
test('every format maps only roles that are declared, and names the reports it follows',()=>{
  assert.ok(FORMATS.length>=4);
  for(const f of FORMATS){
    assert.ok(f.follows&&f.kicker&&f.label,f.id);
    for(const r of [...f.masthead.map(m=>m.role),...f.sections.flatMap(x=>x.roles)])assert.ok(r in ROLES,`${f.id}: ${r}`);
  }
});
test('each format lays out the same notes under its own headings, in its own order',()=>{
  const who=publicationMarkup({...base,kind:'sitrep-who'},esc),ecdc=publicationMarkup({...base,kind:'surveillance-ecdc'},esc);
  assert.deepEqual(h2s(who),['Highlights','Situation in numbers','Background','Epidemiological update','Risk assessment',
    'Preparedness and response','Recommendations','Data notes','Resources and references','Annex: equations']);
  assert.deepEqual(h2s(ecdc),['Key facts','Introduction','Methods','Epidemiology','Discussion','Public health implications','References','Annex: equations']);
  for(const html of [who,ecdc]){
    assert.equal(html.split('Cases were counted by day.').length-1,1,'a note once');
    assert.match(html,/Figure 1\./);
  }
  // Background before the situation, as every source puts it; methods in a sit rep are its data notes, at the end.
  assert.ok(who.indexOf('Measles came to the village')<who.indexOf('Figure 1.'));
  assert.ok(who.indexOf('Cases were counted by day.')>who.indexOf('Figure 1.'));
  assert.match(who,/Laid out as Situation report, WHO style, after WHO situation reports/);
});
test('what is written is kept by role and appears under each format\'s heading for it',()=>{
  const written={[roleKey('highlights')]:'Three new cases this week.',[roleKey('keyFigures')]:'- 188 cases'};
  const who=publicationMarkup({...base,kind:'sitrep-who',written},esc),ocha=publicationMarkup({...base,kind:'sitrep-ocha',written},esc),
    ecdc=publicationMarkup({...base,kind:'surveillance-ecdc',written},esc);
  for(const html of [who,ocha,ecdc])assert.match(html,/Three new cases this week\./);
  assert.match(ecdc,/<h2>Key facts<\/h2><div class="pub-written" data-pub-part="role:highlights">/);
  assert.match(who,/<h2>Situation in numbers<\/h2><div class="pub-keyfigures">/);
  // The surveillance report has no key figures: named, not lost.
  assert.match(ecdc,/Not in this format, kept for the others: Key figures\./);
  assert.doesNotMatch(who,/pub-leftover/);
});
test('a role unwritten shows the format\'s own prompt for it',()=>{
  const ocha=publicationMarkup({...base,kind:'sitrep-ocha'},esc);
  assert.match(ocha,/Highlights <span>· two to five bullets<\/span>/);
  assert.deepEqual([...promptFor('role:highlights','surveillance-ecdc')],['Key facts','three to five bullets','What a reader must know, each one sentence with its number.']);
  assert.equal(promptFor('title')[0],'Title','the publication keeps its own parts');
});
test('a figure\'s width and place are kept per format, by its note',()=>{
  const written={[layoutKey('sitrep-who','map:description')]:'half|right'};
  assert.match(publicationMarkup({...base,kind:'sitrep-who',written},esc),/class="pub-figure pub-w-half pub-p-right"/);
  assert.match(publicationMarkup({...base,kind:'sitrep-ocha',written},esc),/class="pub-figure pub-w-full pub-p-line"/);
  assert.deepEqual(readLayout('third|beside'),{width:'third',place:'beside'});
  assert.deepEqual(readLayout('wide|everywhere'),{width:'full',place:'line'});
});
test('the layout controls are offered only where the layout can be kept',()=>{
  assert.match(publicationMarkup({...base,kind:'sitrep-who',writable:true},esc),/data-pub-layout="map:description"/);
  assert.doesNotMatch(publicationMarkup({...base,kind:'sitrep-who'},esc),/data-pub-layout/);
});
test('a figure set side by side draws the next figure beside it, numbered in the order drawn',()=>{
  const two=[...notes,{kind:'authored',id:'a1',section:'Results',text:'Between the two figures.'},
    {kind:'machined',id:'chart:description',section:'Results',text:'**A chart.** 3 bars.',nodeId:'chart'}];
  const figureOf=n=>n.nodeId==='map'&&n.id.endsWith('description')?'<figure class="notes-figure" data-figure="map"><svg></svg></figure>'
    :n.nodeId==='chart'?'<figure class="notes-figure" data-figure="chart"><svg></svg></figure>':undefined;
  const html=publicationMarkup({...base,notes:two,figureOf,kind:'sitrep-who',written:{[layoutKey('sitrep-who','map:description')]:'half|beside'}},esc);
  assert.match(html,/<div class="pub-row"><figure class="pub-figure pub-w-half pub-p-beside" data-pub-note="map:description">[\s\S]*?Figure 1\.[\s\S]*?data-pub-note="chart:description">[\s\S]*?Figure 2\.[\s\S]*?<\/div>/);
  assert.ok(html.indexOf('Figure 2.')<html.indexOf('Between the two figures.'));
});
test('a figure left out of one format is gone from it, kept in the others, and can be brought back where it is kept',()=>{
  const written={[layoutKey('sitrep-who','map:description')]:'full|out'};
  assert.doesNotMatch(publicationMarkup({...base,kind:'sitrep-who',written},esc),/data-figure="map"|pub-left-out/);
  assert.match(publicationMarkup({...base,kind:'sitrep-who',written,writable:true},esc),/class="pub-left-out" data-pub-note="map:description"/);
  assert.match(publicationMarkup({...base,written},esc),/data-figure="map"/,'the publication keeps it');
});
