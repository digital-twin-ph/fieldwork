import test from 'node:test';
import assert from 'node:assert/strict';
const {publicationMarkup}=await import('../build/publication.js');
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
  assert.match(html,/<figure class="pub-figure"><figure class="notes-figure" data-figure="map"><svg><\/svg><\/figure><figcaption class="pub-caption"><strong>Figure 1\.<\/strong> <strong>Cluster map\.<\/strong> 3 layers\./);
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
