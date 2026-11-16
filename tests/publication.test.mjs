import test from 'node:test';
import assert from 'node:assert/strict';
const {publicationMarkup,partKey,layoutKey,readLayout}=await import('../build/publication.js');
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


// DRAFT AS, AND A FIGURE'S PLACE (experiment 202, 2026-11-15).
const base={title:'Measles in Hagelloch, 1861',authors:[],date:'15 November 2026',notes,sourceOf:n=>from[n.nodeId],
  figureOf:n=>n.nodeId==='map'&&n.id.endsWith('description')?'<figure class="notes-figure" data-figure="map"><svg></svg></figure>':undefined,
  references:[{kind:'method',text:'Kulldorff M. 2005.',citedBy:['Cluster']}]};
test('a surveillance report and a sit rep lay out the same notes in their own sections',()=>{
  const report=publicationMarkup({...base,kind:'surveillance'},esc),sitrep=publicationMarkup({...base,kind:'sitrep'},esc);
  assert.match(report,/Surveillance report[\s\S]*Key points[\s\S]*The situation[\s\S]*Figure 1\.[\s\S]*Data and methods[\s\S]*Recommendations/);
  assert.match(sitrep,/Situation report[\s\S]*Report details[\s\S]*Highlights[\s\S]*The situation in numbers[\s\S]*Figure 1\.[\s\S]*Response actions[\s\S]*Gaps and needs[\s\S]*Next steps/);
  assert.doesNotMatch(report,/Abstract/);
  // The same note, once each, in each.
  for(const html of [report,sitrep])assert.equal(html.split('Cases were counted by day.').length-1,1);
});
test('what is written is kept per kind; the publication keeps the keys it always had',()=>{
  assert.equal(partKey('publication','title'),'title');
  assert.equal(partKey('sitrep','highlights'),'sitrep:highlights');
  const html=publicationMarkup({...base,kind:'sitrep',written:{'sitrep:highlights':'Three new cases.',highlights:'Not this one.'}},esc);
  assert.match(html,/Three new cases\./);
  assert.doesNotMatch(html,/Not this one/);
});
test('a figure\'s width and place are kept per product, by its note',()=>{
  const written={[layoutKey('sitrep','map:description')]:'half|right'};
  const sitrep=publicationMarkup({...base,kind:'sitrep',written},esc),pub=publicationMarkup({...base,written},esc);
  assert.match(sitrep,/class="pub-figure pub-w-half pub-p-right"/);
  assert.match(pub,/class="pub-figure pub-w-full pub-p-line"/,'another product keeps its own');
  assert.deepEqual(readLayout('third|beside'),{width:'third',place:'beside'});
  assert.deepEqual(readLayout('wide|everywhere'),{width:'full',place:'line'},'anything else is the default');
});
test('the layout controls are offered only where the layout can be kept',()=>{
  assert.match(publicationMarkup({...base,writable:true},esc),/data-pub-layout="map:description"/);
  assert.doesNotMatch(publicationMarkup({...base,writable:false},esc),/data-pub-layout/);
});

test('a figure set side by side draws the next figure beside it, numbered in the order drawn',()=>{
  const two=[...notes,{kind:'authored',id:'a1',section:'Results',text:'Between the two figures.'},
    {kind:'machined',id:'chart:description',section:'Results',text:'**A chart.** 3 bars.',nodeId:'chart'}];
  const figureOf=n=>n.nodeId==='map'&&n.id.endsWith('description')?'<figure class="notes-figure" data-figure="map"><svg></svg></figure>'
    :n.nodeId==='chart'?'<figure class="notes-figure" data-figure="chart"><svg></svg></figure>':undefined;
  const html=publicationMarkup({...base,notes:two,figureOf,kind:'sitrep',written:{[layoutKey('sitrep','map:description')]:'half|beside'}},esc);
  assert.match(html,/<div class="pub-row"><figure class="pub-figure pub-w-half pub-p-beside" data-pub-note="map:description">[\s\S]*?Figure 1\.[\s\S]*?<figure class="pub-figure pub-w-full pub-p-line" data-pub-note="chart:description">[\s\S]*?Figure 2\.[\s\S]*?<\/div>/);
  assert.ok(html.indexOf('Figure 2.')<html.indexOf('Between the two figures.'),'the second figure is pulled up past the text');
});

test('a figure left out of one product is gone from it, kept in the others, and can be brought back where it is kept',()=>{
  const written={[layoutKey('sitrep','map:description')]:'full|out'};
  const read=publicationMarkup({...base,kind:'sitrep',written},esc);
  assert.doesNotMatch(read,/data-figure="map"/);
  assert.doesNotMatch(read,/pub-left-out/,'nothing where it cannot be kept');
  const kept=publicationMarkup({...base,kind:'sitrep',written,writable:true},esc);
  assert.match(kept,/class="pub-left-out" data-pub-note="map:description"[\s\S]*Cluster map\. is left out of this product|class="pub-left-out" data-pub-note="map:description"/);
  assert.match(publicationMarkup({...base,written},esc),/data-figure="map"/,'the publication keeps it');
});
