import test from 'node:test';
import assert from 'node:assert/strict';
import {populationRastersFor,iso3Of,fileFor,WORLDPOP_LICENCE} from '../build/worldpop-catalogue.js';

// The practitioner is working on an Ebola outbreak in the DRC, where a population denominator
// for Ituri is what a response needs. The country comes from the study area's own provenance --
// a boundary acquired from geoBoundaries carries COD-ADM2-63176286 -- never from coordinates.
const ituri={boundaryID:'COD-ADM1-63176286',unitID:'x',unitName:'Ituri',source:'OCHA DR Congo',
  licence:'CC BY 4.0',licenceSource:'geoBoundaries',yearRepresented:'2017'};

test('a study area that states its country is offered that country’s rasters',()=>{
  const rasters=populationRastersFor(ituri);
  assert.ok(rasters.length>=20,'WorldPop publishes 2000 to 2020');
  assert.equal(rasters[0].iso3,'COD');
  assert.equal(rasters[0].year,'2020','newest first, because a denominator wants the latest');
  assert.match(rasters[0].url,/data\.worldpop\.org.*\/COD\/cod_ppp_2020\.tif$/);
  assert.ok(rasters[0].bytes>1e9,'and says it is over a gigabyte before you commit to it');
});

test('a polygon that states no country is offered nothing, rather than a guess',()=>{
  assert.deepEqual(populationRastersFor(undefined),[]);
  assert.deepEqual(populationRastersFor(null),[]);
  assert.deepEqual(populationRastersFor({boundaryID:''}),[]);
  // Ituri borders Uganda. A country inferred from coordinates would be wrong exactly where it
  // mattered, and wrong invisibly: a denominator carries no sign of which country it came from.
  assert.equal(iso3Of({boundaryID:'drawn-by-hand'}),null,
    'this returned the country "DRA" when it took the first three characters');
  assert.equal(iso3Of({boundaryID:'COD'}),null,'a code without a level is not an identifier');
  assert.equal(iso3Of({boundaryID:'COD-XYZ-1'}),null);
});

test('the country is read from the boundary the study area names',()=>{
  assert.equal(iso3Of(ituri),'COD');
  assert.equal(iso3Of({boundaryID:'UGA-ADM2-11111'}),'UGA');
  assert.equal(iso3Of({boundaryID:'bwa-ADM1-22222'}),'BWA','case is not identity');
});

test('the published path is the one measured, not one invented',()=>{
  assert.equal(fileFor('COD','2020'),
    'https://data.worldpop.org/GIS/Population/Global_2000_2020/2020/COD/cod_ppp_2020.tif');
  assert.match(WORLDPOP_LICENCE,/CC BY 4\.0/);
});

test('an unpublished country is absent rather than linked into a 404',()=>{
  assert.deepEqual(populationRastersFor({boundaryID:'ZZZ-ADM0-1'}),[]);
});
