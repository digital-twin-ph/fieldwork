import {test,expect} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const ex='urn:fieldwork:example:gadm:',fw='urn:fieldwork:';
const read=file=>readFile(file,'utf8');
const ontology=(await Promise.all(['ontology/fieldwork.ttl','ontology/jurisdictions.ttl','ontology/gadm.ttl'].map(read))).join('\n');
const fixture=await read('ontology/examples/gadm-study-area.ttl');
const sourceMetadata=await read('ontology/examples/gadm-botswana-distribution.ttl');
const rules=await read('ontology/rules/jurisdiction-selection.n3');
async function reason(page,data,extra=''){
  await page.goto('/?example=blank');
  return page.evaluate(input=>new Promise((resolve,reject)=>{
    const worker=new Worker('./build/reasoning-worker.js');
    worker.onmessage=({data})=>{worker.terminate();data.error?reject(new Error(data.error)):resolve(data.quads);};
    worker.onerror=e=>{worker.terminate();reject(new Error(e.message));};
    worker.postMessage({id:1,input});
  }),ontology+'\n'+sourceMetadata+'\n'+data+'\n'+rules+'\n'+extra);
}
const members=q=>q.filter(t=>t.predicate===fw+'hasStudyAreaMember').map(t=>[t.subject,t.object]).sort();

test('jurisdiction selection retains two same-name places, multipart geometry and original asset lineage',async({page})=>{
  const q=await reason(page,fixture,`
    { ?f fw:sha256 ?h; fw:byteSize ?b; fw:filename ?n. } => { ?f ex:hash ?h; ex:bytes ?b; ex:filename ?n. }.
    { ?s fw:hasStudyAreaMember ?b. ?b geo:hasGeometry ?g. ?g geo:asWKT ?w. } => { ?s ex:memberWKT ?w. }.
    { ?s fw:hasStudyAreaMember ?b. ?d rdfs:member ?b; prov:wasDerivedFrom ?file. ?file prov:wasDerivedFrom ?distribution. } => { ?s ex:sourceDistribution ?distribution. }.
    { ?b fw:attribute ?a. ?a fw:fieldKey ?key; rdf:value ?value. } => { ?b ex:rawAttribute ?a. ?a ex:key ?key; ex:value ?value. }.
    { ?s a fw:DownloadedAsset. } => { ?s ex:acquired true. }.
  `);
  expect(members(q)).toEqual([[ex+'study',ex+'boundaryA'],[ex+'study',ex+'boundaryB']]);
  expect(q.filter(t=>t.predicate===ex+'sourceDistribution').map(t=>t.object).sort()).toEqual([ex+'distributionA',ex+'distributionB']);
  const wkts=q.filter(t=>t.predicate===ex+'memberWKT');expect(wkts).toHaveLength(2);
  expect(wkts.every(t=>t.datatype==='http://www.opengis.net/ont/geosparql#wktLiteral')).toBe(true);
  expect(wkts.some(t=>t.object.includes('MULTIPOLYGON'))).toBe(true);
  expect(wkts.some(t=>t.object.includes('(11 11,11 12'))).toBe(true);
  expect(q.filter(t=>t.predicate===ex+'acquired').map(t=>t.subject).sort()).toEqual([ex+'fileA',ex+'fileB']);
  for(const suffix of ['a','b']){
    const file=await readFile(`ontology/examples/synthetic-gadm-${suffix}.geojson`),subject=ex+'file'+suffix.toUpperCase();
    expect(q.find(t=>t.subject===subject&&t.predicate===ex+'hash').object).toBe(createHash('sha256').update(file).digest('hex'));
    expect(Number(q.find(t=>t.subject===subject&&t.predicate===ex+'bytes').object)).toBe(file.length);
    const boundary=ex+'boundary'+suffix.toUpperCase(),attributes={};
    for(const link of q.filter(t=>t.subject===boundary&&t.predicate===ex+'rawAttribute'))attributes[q.find(t=>t.subject===link.object&&t.predicate===ex+'key').object]=q.find(t=>t.subject===link.object&&t.predicate===ex+'value').object;
    expect(attributes).toEqual(JSON.parse(file).features[0].properties);
  }
});

test('selection cannot silently admit an unavailable boundary or an incomplete dataset',async({page})=>{
  const incomplete=fixture.replace('fw:importComplete true; rdfs:member ex:boundaryB','fw:importComplete false; rdfs:member ex:boundaryB');
  const q=await reason(page,incomplete+'\nex:select fw:requestedBoundary ex:missing. ex:missing a fw:JurisdictionBoundary.');
  expect(members(q)).toEqual([[ex+'study',ex+'boundaryA']]);
  // Absence of an eligibility conclusion is not a completeness verdict or automatic exclusion.
  expect(q.some(t=>t.predicate===fw+'importComplete'||t.predicate===fw+'excluded')).toBe(false);
  const unknown=await reason(page,incomplete.replace('fw:importComplete false; rdfs:member ex:boundaryB','rdfs:member ex:boundaryB'));
  expect(members(unknown)).toEqual([[ex+'study',ex+'boundaryA']]);
});

test('selection isolates runs and does not substitute another release of the same jurisdiction',async({page})=>{
  const data=fixture+`
    ex:otherRelease a fw:JurisdictionBoundary; fw:representsJurisdiction ex:jurisdictionA; rdfs:label "Harbor".
    ex:otherDataset a fw:ImportedBoundaryDataset; fw:importComplete true; rdfs:member ex:otherRelease.
    ex:select fw:inputDataset ex:otherDataset.
    ex:selectOther a fw:JurisdictionSelection; fw:inputDataset ex:otherDataset; fw:requestedBoundary ex:otherRelease; fw:outputStudyArea ex:otherStudy.
  `;
  const q=await reason(page,data);
  expect(members(q)).toEqual([[ex+'otherStudy',ex+'otherRelease'],[ex+'study',ex+'boundaryA'],[ex+'study',ex+'boundaryB']]);
  expect(q.some(t=>t.predicate==='http://www.w3.org/2002/07/owl#sameAs'||t.predicate==='http://www.opengis.net/ont/geosparql#sfWithin')).toBe(false);
});
