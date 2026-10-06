import test from 'node:test';
import assert from 'node:assert/strict';
import {DataFactory,Store} from 'n3';
import {loadGraph,validateGraph,summarize,ontologyFiles,exampleFiles} from '../scripts/validate-ontology.mjs';
const {namedNode:n,literal:l,quad}=DataFactory;
const fw='urn:fieldwork:',stac='urn:fieldwork:stac:',ex='urn:fieldwork:example:stac:',sample='urn:fieldwork:example:gadm:';
const rdf='http://www.w3.org/1999/02/22-rdf-syntax-ns#',xsd='http://www.w3.org/2001/XMLSchema#',geo='http://www.opengis.net/ont/geosparql#';
const base=await loadGraph([...ontologyFiles,...exampleFiles]);
const fresh=()=>new Store([...base]);
const remove=(g,s,p)=>g.removeQuads(g.getQuads(n(s),n(p),null,null));
const set=(g,s,p,o)=>{remove(g,s,p);g.addQuad(n(s),n(p),o);};
const add=(g,s,p,o)=>g.addQuad(n(s),n(p),o);

test('all worked graphs satisfy the shared SHACL Core profiles without network imports',async()=>{
  const report=await validateGraph(base);assert.equal(report.conforms,true,JSON.stringify(summarize(report)));
});
test('SHACL rejects missing identity, provenance, CRS, malformed bytes and invalid boundary metadata',async()=>{
  const cases=[
    ['missing digest',g=>remove(g,sample+'fileA',fw+'sha256')],
    ['bad digest',g=>set(g,sample+'fileA',fw+'sha256',l('bad'))],
    ['negative bytes',g=>set(g,sample+'fileA',fw+'byteSize',l('-1',n(xsd+'integer')))],
    ['missing acquisition',g=>remove(g,sample+'fileA','http://www.w3.org/ns/prov#wasGeneratedBy')],
    ['unknown CRS',g=>remove(g,sample+'importA',fw+'sourceCRS')],
    ['empty GID',g=>set(g,sample+'jurisdictionA','http://purl.org/dc/terms/identifier',l(''))],
    ['missing boundary version',g=>remove(g,sample+'datasetA','http://www.w3.org/ns/dcat#version')],
    ['GADM level 6',g=>set(g,sample+'boundaryA',fw+'administrativeLevel',l('6',n(xsd+'integer')))],
    ['point presented as boundary',g=>set(g,sample+'geometryA',rdf+'type',n('http://www.opengis.net/ont/sf#Point'))],
    ['untyped WKT',g=>set(g,sample+'geometryA',geo+'asWKT',l('POLYGON EMPTY'))],
    ['incomplete selection input',g=>set(g,sample+'localA',fw+'importComplete',l('false',n(xsd+'boolean')))],
  ];
  for(const [label,change] of cases){const g=fresh();change(g);const report=await validateGraph(g);assert.equal(report.conforms,false,label);assert.ok(report.results.length,label);}
});
test('STAC shapes allow instant or interval time and reject broken links and incomplete time pairs',async()=>{
  const instant=fresh();remove(instant,ex+'item',stac+'startDatetime');remove(instant,ex+'item',stac+'endDatetime');add(instant,ex+'item',stac+'datetime',l('2026-10-06T00:00:00Z',n(xsd+'dateTime')));
  assert.equal((await validateGraph(instant)).conforms,true);
  for(const [label,change] of [
    ['missing asset key',g=>remove(g,ex+'asset',stac+'assetKey')],
    ['bad owner',g=>set(g,ex+'asset',stac+'assetOwner',n(ex+'notAnItem'))],
    ['relative unresolved URL',g=>set(g,ex+'asset','http://www.w3.org/ns/dcat#downloadURL',n('urn:unresolved:relative'))],
    ['two collections',g=>add(g,ex+'item',stac+'collection',n(ex+'otherCollection'))],
    ['reverse interval',g=>set(g,ex+'item',stac+'startDatetime',l('2027-01-01T00:00:00Z',n(xsd+'dateTime')))],
    ['no time',g=>{remove(g,ex+'item',stac+'startDatetime');remove(g,ex+'item',stac+'endDatetime');}],
    ['missing interval end',g=>remove(g,ex+'item',stac+'endDatetime')],
    ['incomplete pair even with instant',g=>{add(g,ex+'item',stac+'datetime',l('2026-10-06T00:00:00Z',n(xsd+'dateTime')));remove(g,ex+'item',stac+'endDatetime');}],
    ['null and footprint simultaneously',g=>add(g,ex+'item',stac+'footprint',n(sample+'geometryA'))],
  ]){const g=fresh();change(g);assert.equal((await validateGraph(g)).conforms,false,label);}
});
test('SHACL enforces processing requirements and inspection identity instead of trusting a filename',async()=>{
  for(const [label,change] of [
    ['missing output contract',g=>remove(g,fw+'GeoJSONReader',fw+'producesKind')],
    ['missing shape contract',g=>remove(g,fw+'GeoJSONReader',fw+'requiresInputShape')],
    ['unknown shape contract',g=>set(g,fw+'GeoJSONReader',fw+'requiresInputShape',n('urn:unknown:shape'))],
    ['missing reader format',g=>remove(g,fw+'GeoJSONReader',fw+'acceptsFormat')],
    ['wrong inspection asset',g=>set(g,ex+'inspectionA',fw+'inspectedAsset',n(sample+'fileB'))],
    ['two observed formats',g=>add(g,ex+'inspectionA',fw+'observedFormat',n(fw+'GeoPackage'))],
    ['format route hiding profile requirement',g=>add(g,fw+'GeoJSONReader',fw+'requiresProfile',n('urn:fieldwork:gadm:Profile'))],
  ]){const g=fresh();change(g);assert.equal((await validateGraph(g)).conforms,false,label);}
});
test('post-selection SHACL rejects partial, extra and shared outputs while pre-selection validation allows a plan',async()=>{
  const g=fresh();assert.equal((await validateGraph(g)).conforms,true);assert.equal((await validateGraph(g,{postSelection:true})).conforms,false);
  add(g,sample+'study',rdf+'type',n(fw+'StudyArea'));add(g,sample+'study',fw+'hasStudyAreaMember',n(sample+'boundaryA'));
  assert.equal((await validateGraph(g,{postSelection:true})).conforms,false);
  add(g,sample+'study',fw+'hasStudyAreaMember',n(sample+'boundaryB'));
  assert.equal((await validateGraph(g,{postSelection:true})).conforms,true);
  add(g,sample+'study',fw+'hasStudyAreaMember',n(sample+'unrequested'));
  assert.equal((await validateGraph(g,{postSelection:true})).conforms,false);
  g.removeQuad(quad(n(sample+'study'),n(fw+'hasStudyAreaMember'),n(sample+'unrequested')));
  add(g,ex+'anotherSelection',fw+'outputStudyArea',n(sample+'study'));
  assert.equal((await validateGraph(g,{postSelection:true})).conforms,false);
});
test('candidate routes bind their declared input shape to the actual request input',async()=>{
  const g=fresh();add(g,ex+'processA',fw+'candidateOperation',n('urn:fieldwork:gadm:NormalizeJurisdictions'));
  assert.equal((await validateGraph(g)).conforms,true);
  remove(g,sample+'localA',fw+'dataProfile');
  assert.equal((await validateGraph(g)).conforms,false);
  const raw=fresh();add(raw,ex+'processB',fw+'candidateOperation',n(fw+'PolygonAreaRoutine'));
  // A generic polygon routine does not require jurisdiction identity on its members.
  remove(raw,sample+'boundaryB',rdf+'type');add(raw,sample+'boundaryB',rdf+'type',n(geo+'Feature'));
  // This collection is now decoded features, not a normalized jurisdiction collection.
  remove(raw,sample+'localB',rdf+'type');add(raw,sample+'localB',rdf+'type',n(fw+'ImportedFeatureDataset'));
  remove(raw,sample+'select',rdf+'type');
  assert.equal((await validateGraph(raw)).conforms,true);
});
