import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {facilitiesFrom,facilitiesFromExport,fetchRegister,matchFacilityNames,matchCounts,nameParts,OUTCOME_IRI,MATCH_OUTCOMES} from '../build/facility-matching.js';

/** FACILITIES FOUND FROM A LIST (experiment 190). The catalogue is generated from the ontology; the matcher reads only
 *  a register's own field map and type words, so nothing in it is one country's. Held here two ways: on a register
 *  made up for this test, whose fields are named in French and whose types are not Sierra Leone's, and on Sierra
 *  Leone's real names against GRID3's real list. */
const catalogue=JSON.parse(readFileSync(new URL('../widgets/facility-registers.json',import.meta.url),'utf8'));

// A MADE-UP REGISTER, nothing like Sierra Leone's: French field names, other type words, a name in two areas.
const madeUp={id:'urn:fieldwork:test-register',title:'A made-up register',country:'XXX',licence:'',url:'',readable:true,
  fields:{name:'nom',alternateName:null,type:'genre',area:'zone',identifier:'code',latitude:'y',longitude:'x'}};
const records=[
  {nom:'Bela Dispensaire',genre:'Dispensaire',zone:'Nord',code:'A1',y:1,x:2},
  {nom:'Bela Dispensaire',genre:'Dispensaire',zone:'Sud',code:'A2',y:1.5,x:2.5},
  {nom:'Kanto Poste',genre:'Poste',zone:'Est',code:'B1',y:3,x:4},
  {nom:'Moraga Hôpital',genre:'Hôpital',zone:'Ouest',code:'C1',y:5,x:6},
  {nom:'Tilani Dispensaire',genre:'Dispensaire',zone:'Est',code:'D1',y:7,x:8},
];

test('the outcomes are the ontology\'s six, and each has its term',()=>{
  assert.equal(MATCH_OUTCOMES.length,6);
  const ttl=readFileSync(new URL('../ontology/fieldwork.ttl',import.meta.url),'utf8');
  for(const iri of Object.values(OUTCOME_IRI))assert.match(ttl,new RegExp(`fw:${iri.split(':').pop()} a fw:FacilityMatchOutcome`));
});

test('the catalogue names Sierra Leone, Nigeria and Congo as readable, each with its own field names, and Zambia as not',()=>{
  const by=Object.fromEntries(catalogue.registers.map(r=>[r.country,r]));
  assert.deepEqual(['SLE','NGA','COD'].map(c=>by[c].readable),[true,true,true]);
  assert.equal(by.ZMB.readable,false);
  assert.equal(by.COD.fields.name,'essnom1');
  assert.notEqual(by.SLE.fields.name,by.NGA.fields.name);
});

test('the catalogue names OpenStreetMap\'s country export as a register for any country, matched by name only, under ODbL',()=>{
  const osm=catalogue.registers.find(r=>r.servedAs==='hot-country-export');
  assert.ok(osm,'declared in the ontology');
  assert.deepEqual([osm.anyCountry,osm.nameOnly,osm.country,osm.fields.type],[true,true,null,null]);
  assert.match(osm.licence,/odbl\/1-0/);
  for(const r of catalogue.registers.filter(r=>r.readable&&r.servedAs==='arcgis-feature-layer'))assert.equal(r.nameOnly,false);
});

// A REGISTER WITH NO TYPES, made up beside the French one: read through a country export's geometry.
const nameOnly={id:'urn:fieldwork:test-name-only',title:'A made-up name-only register',country:null,anyCountry:true,nameOnly:true,
  servedAs:'hot-country-export',licence:'',url:'',readable:true,
  fields:{name:'name',alternateName:null,type:null,area:null,identifier:'osm_id',latitude:null,longitude:null}};
const exportPayload={type:'FeatureCollection',features:[
  {type:'Feature',properties:{osm_id:11,name:'Zinder Dispensaire'},geometry:{type:'Point',coordinates:[9,10]}},
  {type:'Feature',properties:{osm_id:12,name:'Wenduuma Dispensaire'},geometry:{type:'Point',coordinates:[11,12]}},
  {type:'Feature',properties:{osm_id:13},geometry:{type:'Point',coordinates:[0,0]}},
]};

test('a country export is read through its geometry, and a record with no name is not a facility',()=>{
  const f=facilitiesFromExport(nameOnly,exportPayload);
  assert.deepEqual(f.map(x=>[x.id,x.name,x.longitude,x.latitude]),[['11','Zinder Dispensaire',9,10],['12','Wenduuma Dispensaire',11,12]]);
});

test('a register matched by name only hands on an exact name, holds a spelling for review, and a choice releases it',()=>{
  const regs=[{register:madeUp,facilities:facilitiesFrom(madeUp,records)},{register:nameOnly,facilities:facilitiesFromExport(nameOnly,exportPayload)}];
  const list=[{name:'Moraga Hôpital'},{name:'Zinder Dispensaire'},{name:'Wenduma Dispensaire'}];
  const r=matchFacilityNames(list,regs,{threshold:0.88,areaMarkers:[]});
  assert.equal(r.get('Moraga Hôpital').register,madeUp.id,'the first register is matched first');
  assert.equal(r.get('Zinder Dispensaire').outcome,'exact');
  assert.equal(r.get('Zinder Dispensaire').facility.id,'11');
  assert.equal(r.get('Wenduma Dispensaire').outcome,'spelling');
  assert.equal(r.get('Wenduma Dispensaire').held,true);
  assert.equal(r.get('Wenduma Dispensaire').facility,undefined,'held, not handed on');
  const chosen=matchFacilityNames(list,regs,{threshold:0.88,areaMarkers:[],decisions:{'Wenduma Dispensaire':'12'}});
  assert.equal(chosen.get('Wenduma Dispensaire').facility.id,'12');
  assert.equal(chosen.get('Wenduma Dispensaire').decided,true);
});

test('a register for every country is fetched for the country chosen, through the download handed in',async()=>{
  const asked=[];
  const f=await fetchRegister(nameOnly,fetch,{country:'XXX',readExport:async iso=>{asked.push(iso);return exportPayload;}});
  assert.deepEqual(asked,['XXX']);
  assert.equal(f.length,2);
  await assert.rejects(fetchRegister(nameOnly,fetch,{readExport:async()=>exportPayload}),/choose the country/);
});

test('a name is read into its bare part, its type and its bracket, by the register\'s own type words',()=>{
  const types=new Set(['dispensaire','poste','hopital']);
  assert.deepEqual(nameParts('Bela (Nord) Dispensaire',types),{bare:'bela',type:'dispensaire',qualifier:'nord'});
  // A last word that is not a type word stays in the name.
  assert.deepEqual(nameParts('Bela Clinic',types),{bare:'bela clinic',type:'',qualifier:''});
});

test('on a made-up register with French fields, each of the six outcomes is reached',()=>{
  const facilities=facilitiesFrom(madeUp,records);
  const list=[
    {name:'Moraga Hôpital'},                       // exact
    {name:'Tilanni Dispensaire'},                  // a letter doubled: allowing for spelling
    {name:'Kanto Hôpital'},                        // the name is Kanto's, the type is not: type differs
    {name:'Bela Dispensaire'},                     // two Belas, nothing to tell them apart: ambiguous
    {name:'Bela Dispensaire',area:'Sud'},          // the same name with its area is still matched once, as listed first
    {name:'Nord Communautés'},                     // an area marker
    {name:'Zinder Dispensaire'},                   // in no register
  ];
  const result=matchFacilityNames(list,[{register:madeUp,facilities}],{threshold:0.88,areaMarkers:['Communautés']});
  assert.equal(result.get('Moraga Hôpital').outcome,'exact');
  assert.equal(result.get('Moraga Hôpital').facility.id,'C1');
  assert.equal(result.get('Tilanni Dispensaire').outcome,'spelling');
  assert.equal(result.get('Kanto Hôpital').outcome,'type-differs');
  assert.equal(result.get('Kanto Hôpital').facility,undefined,'a type that differs is not handed on as matched');
  assert.equal(result.get('Bela Dispensaire').outcome,'ambiguous');
  assert.equal(result.get('Bela Dispensaire').candidates.length,2);
  assert.equal(result.get('Nord Communautés').outcome,'area');
  assert.equal(result.get('Zinder Dispensaire').outcome,'not-found');
});

test('an area tells two facilities of one name apart, and a choice settles what nothing else could',()=>{
  const facilities=facilitiesFrom(madeUp,records);
  const byArea=matchFacilityNames([{name:'Bela Dispensaire',area:'Sud'}],[{register:madeUp,facilities}],{threshold:0.88,areaMarkers:[]});
  assert.equal(byArea.get('Bela Dispensaire').facility.id,'A2');
  const chosen=matchFacilityNames([{name:'Bela Dispensaire'},{name:'Kanto Hôpital'}],[{register:madeUp,facilities}],
    {threshold:0.88,areaMarkers:[],decisions:{'Bela Dispensaire':'A1','Kanto Hôpital':'none'}});
  assert.equal(chosen.get('Bela Dispensaire').outcome,'ambiguous','the outcome stays what matching found');
  assert.equal(chosen.get('Bela Dispensaire').facility.id,'A1');
  assert.equal(chosen.get('Bela Dispensaire').decided,true);
  assert.equal(chosen.get('Kanto Hôpital').facility,undefined);
  assert.equal(chosen.get('Kanto Hôpital').decided,true);
});

test('a name that is another\'s words and more is not a spelling of it',()=>{
  const facilities=facilitiesFrom(madeUp,[...records,{nom:'Bela Nord Dispensaire',genre:'Dispensaire',zone:'Nord',code:'E1',y:0,x:0}]);
  const r=matchFacilityNames([{name:'Kanto Bana Poste'}],[{register:madeUp,facilities}],{threshold:0.88,areaMarkers:[]});
  assert.equal(r.get('Kanto Bana Poste').outcome,'not-found');
});

// SIERRA LEONE'S REAL NAMES against GRID3's real list (a CC BY 4.0 fixture), as measured on 2026-11-08 (experiment 190).
const LIST=new URL('../../example-2019-sierra-leone-measles/data/measles-sierra-leone-semisynthetic.csv',import.meta.url);
test('Sierra Leone\'s 333 facility names against GRID3: every row has one outcome, none is dropped',{skip:existsSync(LIST)?false:'example-2019-sierra-leone-measles is not checked out beside this repository.'},()=>{
  const sle=catalogue.registers.find(r=>r.country==='SLE');
  const fixture=JSON.parse(readFileSync(new URL('fixtures/grid3-sle-facilities.json',import.meta.url),'utf8'));
  const facilities=facilitiesFrom(sle,fixture.records);
  assert.equal(facilities.length,1616);
  const lines=readFileSync(LIST,'utf8').trim().split('\n');
  const split=line=>{const out=[];let cur='',q=false;for(const ch of line){if(ch==='"'){q=!q;continue;}if(ch===','&&!q){out.push(cur);cur='';continue;}cur+=ch;}out.push(cur);return out;};
  const head=split(lines[0]),ni=head.indexOf('Organisation unit name'),di=head.indexOf('Residential District');
  const list=lines.slice(1).map(l=>{const c=split(l);return {name:c[ni],area:c[di]};});
  const result=matchFacilityNames(list,[{register:sle,facilities}],{threshold:0.88,areaMarkers:['Communities']});
  const counts=Object.fromEntries(matchCounts(list.map(r=>r.name),result).map(c=>[c.outcome,[c.names,c.rows]]));
  assert.deepEqual(counts,{exact:[247,2188],spelling:[15,66],'type-differs':[34,244],ambiguous:[5,10],area:[14,38],'not-found':[18,60]});
  assert.equal(Object.values(counts).reduce((n,[,rows])=>n+rows,0),list.length,'every row is counted once');
  // Hand-checked 2026-11-08: the register's own spellings.
  assert.equal(result.get('Makeni Government Hospital').facility.name,'Makeni Govt. Hospital');
  assert.equal(result.get('Sanya MCHP').outcome,'type-differs');
  assert.equal(result.get('Yoni Mabanta Communities').outcome,'area');
});

// OPENSTREETMAP AFTER GRID3, on the same names (an ODbL fixture: Sierra Leone's export of 2026-05-06, measured 2026-11-08).
test('Sierra Leone against GRID3 then OpenStreetMap: OpenStreetMap adds one right name and no false one',{skip:existsSync(LIST)?false:'example-2019-sierra-leone-measles is not checked out beside this repository.'},()=>{
  const sle=catalogue.registers.find(r=>r.country==='SLE');
  const osm=catalogue.registers.find(r=>r.servedAs==='hot-country-export');
  const grid=facilitiesFrom(sle,JSON.parse(readFileSync(new URL('fixtures/grid3-sle-facilities.json',import.meta.url),'utf8')).records);
  const fromOsm=facilitiesFromExport(osm,JSON.parse(readFileSync(new URL('fixtures/osm-sle-health-facilities.json',import.meta.url),'utf8')));
  assert.equal(fromOsm.length,375,'399 points, 375 named');
  const lines=readFileSync(LIST,'utf8').trim().split('\n');
  const split=line=>{const out=[];let cur='',q=false;for(const ch of line){if(ch==='"'){q=!q;continue;}if(ch===','&&!q){out.push(cur);cur='';continue;}cur+=ch;}out.push(cur);return out;};
  const head=split(lines[0]),ni=head.indexOf('Organisation unit name'),di=head.indexOf('Residential District');
  const list=lines.slice(1).map(l=>{const c=split(l);return {name:c[ni],area:c[di]};});
  const both=matchFacilityNames(list,[{register:sle,facilities:grid},{register:osm,facilities:fromOsm}],{threshold:0.88,areaMarkers:['Communities']});
  // Read without type words, OpenStreetMap gave "Makump CHP" as a spelling of "Makondu MCHP" and "Connaught Chest
  // Clinic" of "Connaught Hospital". By GRID3's type words it gives neither.
  assert.equal(both.get('Makump CHP').outcome,'not-found');
  assert.equal(both.get('Connaught Chest Clinic').outcome,'not-found');
  // AN EXACT NAME IN ANY REGISTER before a spelling in an earlier one: GRID3 offered only "Sengbeh Community MCHP",
  // about 97 km away, for "Magbenteh Community Hospital", which OpenStreetMap has by that name. One name, 7 rows, moves.
  assert.equal(both.get('Magbenteh Community Hospital').outcome,'exact');
  assert.equal(both.get('Magbenteh Community Hospital').register,osm.id);
  const counts=Object.fromEntries(matchCounts(list.map(r=>r.name),both).map(c=>[c.outcome,[c.names,c.rows]]));
  assert.deepEqual(counts,{exact:[248,2195],spelling:[15,66],'type-differs':[33,237],ambiguous:[5,10],area:[14,38],'not-found':[18,60]});
  // ALONE, read by the list's own type words: its spelling matches are held, its exact ones handed on.
  const alone=matchFacilityNames(list,[{register:osm,facilities:fromOsm}],{threshold:0.88,areaMarkers:['Communities']});
  assert.deepEqual(Object.fromEntries(matchCounts(list.map(r=>r.name),alone).map(c=>[c.outcome,[c.names,c.rows]])),
    {exact:[4,11],spelling:[10,40],'type-differs':[7,18],ambiguous:[4,25],area:[14,38],'not-found':[294,2474]});
  const spelt=[...alone.values()].filter(m=>m.outcome==='spelling');
  assert.ok(spelt.length>0&&spelt.every(m=>m.held&&!m.facility));
  assert.ok([...alone.values()].filter(m=>m.outcome==='exact').every(m=>m.facility));
});
