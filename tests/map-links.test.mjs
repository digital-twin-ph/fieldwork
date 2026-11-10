import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {mapLinks,linkSentence,linkLinesSvg} from '../build/map-links.js';
import {mapOutput} from '../build/map-output.js';

// A LINE FROM EACH POINT TO THE POINT IT NAMES (experiment 200, step 4): Hagelloch's cases to their infectors, and the
// records a real line list holds that a map must count rather than lose.
const cases=JSON.parse(readFileSync(new URL('../examples/hagelloch-1861/cases.json',import.meta.url),'utf8'));
const rowsOf=features=>features.map(f=>({id:`cases_${f.id}`,sourceNodeId:'cases',coordinates:f.geometry?.coordinates??null,attributes:f.properties}));

test('Hagelloch: 184 links found, 94 drawn, 90 within one house, 4 naming no infector',()=>{
  const {links,counts}=mapLinks(rowsOf(cases.features),{cases:{column:'infector',matches:'case_ID'}});
  const c=counts.cases;
  assert.deepEqual({records:c.records,drawn:c.drawn,same:c.sameLocation,none:c.noValue,other:c.notFound+c.self+c.ambiguous+c.unlocated},
    {records:188,drawn:94,same:90,none:4,other:0});
  assert.equal(links.length,94);
  // Infector to case: case 1 names 45, so the line runs from 45's row to 1's, unless they share a house.
  const one=cases.features.find(f=>f.properties.case_ID===1),infector=cases.features.find(f=>f.properties.case_ID===45);
  const sameHouse=one.geometry.coordinates.join()===infector.geometry.coordinates.join();
  assert.equal(links.some(l=>l.from==='cases_case-45'&&l.to==='cases_case-1'),!sameHouse);
  assert.match(linkSentence(c,'Cases'),/94 lines .*90 links join two records at the same place.*4 records name nothing in infector/);
});

test('every record is counted under exactly one outcome',()=>{
  const at=(x)=>[x,0];
  const rows=[
    {id:'a',sourceNodeId:'s',coordinates:at(0),attributes:{id:'A',by:''}},
    {id:'b',sourceNodeId:'s',coordinates:at(1),attributes:{id:'B',by:'A'}},       // drawn
    {id:'c',sourceNodeId:'s',coordinates:at(0),attributes:{id:'C',by:'A'}},       // same place as A
    {id:'d',sourceNodeId:'s',coordinates:at(2),attributes:{id:'D',by:'Z'}},       // not in the layer
    {id:'e',sourceNodeId:'s',coordinates:at(3),attributes:{id:'E',by:'E'}},       // itself
    {id:'f',sourceNodeId:'s',coordinates:at(4),attributes:{id:'F',by:'G'}},       // G held twice
    {id:'g1',sourceNodeId:'s',coordinates:at(5),attributes:{id:'G',by:''}},
    {id:'g2',sourceNodeId:'s',coordinates:at(6),attributes:{id:'G',by:''}},
    {id:'h',sourceNodeId:'s',coordinates:null,attributes:{id:'H',by:'B'}},        // no location
    {id:'x',sourceNodeId:'other',coordinates:at(9),attributes:{id:'X',by:'A'}},   // another layer: not linked
  ];
  const {links,counts}=mapLinks(rows,{s:{column:'by',matches:'id'}});
  const c=counts.s;
  assert.deepEqual(links,[{sourceNodeId:'s',from:'a',to:'b',generation:2}]);
  assert.deepEqual({drawn:c.drawn,same:c.sameLocation,none:c.noValue,notFound:c.notFound,self:c.self,ambiguous:c.ambiguous,unlocated:c.unlocated},
    {drawn:1,same:1,none:3,notFound:1,self:1,ambiguous:1,unlocated:1});
  assert.equal(c.drawn+c.sameLocation+c.noValue+c.notFound+c.self+c.ambiguous+c.unlocated,c.records);
  assert.equal(c.records,9);
});

test('the lines are drawn under the marks, stopped short of the case, and hidden with their layer',()=>{
  const rows=[{id:'a',coordinates:[0,0]},{id:'b',coordinates:[100,0]}];
  const svg=linkLinesSvg([{sourceNodeId:'s',from:'a',to:'b'}],rows,c=>c);
  assert.match(svg,/<line x1="0.0" y1="0.0" x2="94.0" y2="0.0"/);
  assert.match(svg,/marker-end="url\(#map-link-arrow-0\)"/);
  assert.match(linkLinesSvg([{sourceNodeId:'s',from:'a',to:'b'}],rows,c=>c,new Set(['s'])),/display:none/);
  assert.equal(linkLinesSvg([],rows,c=>c),'');
});

test('Map carries the links, the counts and the receipt facts',()=>{
  const area={boundary:{type:'Polygon',coordinates:[[[9.0117,48.5406],[9.0161,48.5406],[9.0161,48.5433],[9.0117,48.5433],[9.0117,48.5406]]]},
    areaId:'urn:fieldwork:area:v',geometryId:'urn:fieldwork:area:v:g',label:'Hagelloch'};
  const node={id:'m',type:'map_output',params:{label:'Map',linkField:{cases:{column:'infector',matches:'case_ID'},gone:{column:'a',matches:'b'}}}};
  const points={sourceNodeId:'cases',label:'Cases',...cases};
  const {value,receipt}=mapOutput(node,{area,points},'r1');
  assert.equal(value.links.length,94);
  assert.deepEqual(Object.keys(value.linkCounts),['cases']);
  assert.match(receipt.facts,/a fw:MapLinks; .*fw:linksDrawn 94; fw:linksAtSameLocation 90; fw:recordsNamingNothing 4;/);
  assert.match(receipt.method,/94 lines from the record named in infector, found by case_ID/);
});

test('each line carries its case generation, counted as the transmission tree counts it, coloured from one ramp',async()=>{
  const {generationColours}=await import('../build/presentation.js');
  const {transmissionTree}=await import('../build/transmission-tree.js');
  const {pointsAsTable}=await import('../build/core.js');
  const {links}=mapLinks(rowsOf(cases.features),{cases:{column:'infector',matches:'case_ID'}});
  const tree=transmissionTree(pointsAsTable(cases),{id:'case_ID',parent:'infector',date:'date_of_prodrome'});
  const treeGeneration=new Map(tree.cases.map(c=>['cases_case-'+c.id,c.generation+1]));
  for(const l of links)assert.equal(l.generation,treeGeneration.get(l.to),l.to);
  const svg=linkLinesSvg(links,rowsOf(cases.features),c=>c);
  const hues=generationColours(Math.max(...links.map(l=>l.generation)));
  for(const l of links.slice(0,20))
    assert.ok(svg.includes('stroke="'+hues[l.generation-1]+'" marker-end="url(#map-link-arrow-'+l.generation+')"'));
});
