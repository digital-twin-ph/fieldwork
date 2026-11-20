import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {figureWordsOf,fillWords,filledParams} from '../build/figure-words.js';

/** WORDS A FIGURE TAKES FROM ITS WORKFLOW (2026-11-20): a DR Congo copy of Botswana's workflow kept "Botswana", "by
 *  district" and "Census 2022" in every chart. With placeholders it reads its own country, units and census. */
const catalogue=JSON.parse(readFileSync(new URL('../examples/census-tables/catalogue.json',import.meta.url),'utf8'));
const cod=catalogue.countries.find(c=>c.iso3==='COD');
const workflow=(boundary,census)=>({schema:'fieldwork/workflow/1',name:'w',nodes:[
  {id:'area',type:'study_area',x:0,y:0,params:{source:'drawn',label:'Area',selectionMode:'polygon',boundary}},
  ...(census?[{id:'census',type:'table_input',x:0,y:0,params:{label:'Census',keys:[],valueField:'',remote:{url:census},data:{kind:'data-table',keys:[],valueField:'',rows:[],rowCount:0,missingValueCount:0}}}]:[])],edges:[]});

test('a DR Congo study area and its census give the country, its provinces and the 1984 census',()=>{
  const words=figureWordsOf(workflow({boundaryID:'COD-ADM1-28894549',canonical:'Provinces'},catalogue.raw+cod.counts.path));
  assert.match(words.country,/Congo/);
  assert.equal(words.units,'provinces');assert.equal(words.unit,'province');
  assert.equal(words.census,'1984 census');
  assert.equal(fillWords('Each model’s share minus the {census}’s, by {unit}, {country}',words),
    `Each model’s share minus the 1984 census’s, by province, ${words.country}`);
});
test('a word the workflow does not state is written as the gap, never guessed',()=>{
  const words=figureWordsOf(workflow({},undefined));
  assert.equal(fillWords('Share by {unit}, {country}, {census}',words),'Share by [unit not stated], [country not stated], [census not stated]');
});
test('a Botswana copy reads Botswana, and text with no placeholder is left as written',()=>{
  const words=figureWordsOf(workflow({boundaryID:'BWA-ADM2-1',canonical:'Districts'}));
  const p=filledParams({chartTitle:'Each {unit}’s share of {country}’s people',subtitle:'Written by hand.',labels:['{census}','WorldPop 2025'],mark:'bar'},words);
  assert.equal(p.chartTitle,'Each district’s share of Botswana’s people');
  assert.equal(p.subtitle,'Written by hand.');assert.deepEqual(p.labels,['[census not stated]','WorldPop 2025']);assert.equal(p.mark,'bar');
});
test('what the area says its units are called comes first; a boundary\'s "Unknown" names nothing',()=>{
  const said=figureWordsOf(workflow({boundaryID:'RWA-ADM2-1',canonical:'Unknown'}));
  assert.equal(said.units,undefined);assert.match(said.country,/Rwanda/);
  const w=workflow({boundaryID:'RWA-ADM2-1',canonical:'Unknown'});w.nodes[0].params.unitName='districts';
  const named=figureWordsOf(w);assert.equal(named.units,'districts');assert.equal(named.unit,'district');
  const local=workflow({boundaryID:'local:geoBoundaries-BWA-ADM2.geojson',canonical:'as published in the file'});local.nodes[0].params.countries=['BWA'];
  assert.equal(figureWordsOf(local).country,'Botswana');assert.equal(figureWordsOf(local).units,undefined);
});

test('a census read at an earlier commit of census-tables still names its census',()=>{
  const old='https://raw.githubusercontent.com/digital-twin-ph/census-tables/ea43c4bd4fe4e86435eeb600530e1f3369ac1aa4/COD/counts.csv';
  assert.equal(figureWordsOf(workflow({},old)).census,'1984 census');
});
