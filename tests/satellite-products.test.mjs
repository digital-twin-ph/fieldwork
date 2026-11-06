import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {Parser,Store} from 'n3';
import {validateGraph} from '../scripts/validate-ontology.mjs';
import {resolve,productsFor,productFor,productFacts,productSentence,SATELLITE_TOPICS,VENDORED}
  from '../build/satellite-products.js';

/** FIND SATELLITE PRODUCTS (experiment 179): JLT's curated topics and routes, vendored unchanged, with Fieldwork's
 *  additions; the open ones first; the receipt says what was read and what was not. */

test('JLT\'s file is vendored unchanged, at the digest the additions record',()=>{
  const bytes=readFileSync(new URL('../examples/eo/research-topics.json',import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    JSON.parse(readFileSync(new URL('../examples/eo/routes-fieldwork.json',import.meta.url),'utf8')).vendored.files['research-topics.json']);
  assert.equal(VENDORED.commit,'684833c9013bfa003bddeb7ff20edb2d4fad3347');
});

test('JLT\'s matcher, ported: whole phrases, and a named pollutant drops its broad parent',()=>{
  assert.deepEqual(resolve('NO2 air pollution in New York City').topics.map(t=>t.id),['no2']);
  assert.deepEqual(resolve('NO20 readings').topics,[]);
  assert.deepEqual(resolve('aerosols and PM2.5').topics.map(t=>t.id),['aerosol']);
  // Fieldwork's addition: ozone, which JLT's guide has no topic for.
  assert.deepEqual(resolve('ozone over the city').topics.map(t=>t.id),['ozone']);
  assert.ok(SATELLITE_TOPICS.some(t=>t.id==='ozone'));
});

test('products needing no sign-in come first; what nobody has read is null, not guessed',()=>{
  const no2=productsFor(SATELLITE_TOPICS.find(t=>t.id==='no2'));
  assert.deepEqual(no2.map(p=>[p.route.id,p.facts?.signIn]),
    [['pc-s5p-no2','anonymous-token'],['s5p-no2','account'],['tempo-no2','account'],['omi-no2','account']]);
  const open=no2[0];
  assert.equal(open.licence.open,true);
  assert.equal(open.licence.readOn,'2026-11-05');
  assert.equal(open.facts.unit,'mol m-2');
  // THE CITATION ESA ASKS FOR, read from its product page with the DOI for processor 2.x (2026-11-06).
  assert.equal(open.facts.citation.doi,'10.5270/S5P-9bnp8q8');
  assert.match(open.facts.citation.text,/^Copernicus Sentinel-5P \(processed by ESA\), 2021, TROPOMI Level 2 Nitrogen Dioxide total column products\. Version 02\./);
  assert.equal(no2.find(p=>p.route.id==='tempo-no2').facts.citation,null);
  assert.equal(no2.find(p=>p.route.id==='tempo-no2').facts.coverageStart,'2023-08-02');
  assert.equal(no2.find(p=>p.route.id==='tempo-no2').licence,null);
  // A route of JLT's that Fieldwork has no facts for says so.
  const heat=productsFor(SATELLITE_TOPICS.find(t=>t.id==='heat'));
  assert.ok(heat.every(p=>p.facts===null&&p.curatedBy==='eo-satellite-guide'));
});

const conforms=async facts=>validateGraph(new Store(new Parser().parse(facts)));

test('the receipt states the choice and what was read, and conforms; an unread licence says so',async()=>{
  const open=productFor('no2','pc-s5p-no2');
  const facts=productFacts('<urn:fieldwork:run:r:output:p>',open);
  assert.match(facts,/fw:licenceRead \[ fw:licenceName/);
  assert.equal((await conforms(facts)).conforms,true);
  assert.match(productSentence(open),/No account \(anonymous token\)\. Open: Legal notice/);
  const unread=productFacts('<urn:fieldwork:run:r:output:p>',productFor('no2','tempo-no2'));
  assert.match(unread,/fw:licenceUnread true/);
  assert.equal((await conforms(unread)).conforms,true);
  // Neither read nor said to be unread is refused: an unread licence must not pass as an open one.
  assert.equal((await conforms(unread.replace(/  fw:licenceUnread true;\n/,''))).conforms,false);
  // So is a citation: read, with its DOI and the files it covers, or said to be unread.
  assert.match(facts,/fw:citationRead \[ fw:citationText "Copernicus Sentinel-5P[^"]*"; fw:citationDoi "10\.5270\/S5P-9bnp8q8"; fw:citationAppliesTo "processor 2\.x/);
  assert.match(unread,/fw:citationUnread true/);
  assert.equal((await conforms(unread.replace(/  fw:citationUnread true;\n/,''))).conforms,false);
  assert.equal((await conforms(facts.replace('fw:measuredQuantity "column"','fw:measuredQuantity "concentration"'))).conforms,false);
});
