import test from 'node:test';
import assert from 'node:assert/strict';
import {countriesOfArea,candidateCountries,shareOfArea,nationalOutlineUrl,outlineOf,NATURAL_EARTH_COUNTRIES} from '../build/area-countries.js';

// A STUDY AREA ACROSS A BORDER (experiment 204).
const box=(w,s,e,n)=>({type:'Polygon',coordinates:[[[w,s],[e,s],[e,n],[w,n],[w,s]]]});

test('a study area states a list of countries; one saved country reads as a list of one, and a boundary states its own',()=>{
  assert.deepEqual(countriesOfArea({countries:['BWA','ZAF','BWA','bad']}),['BWA','ZAF']);
  assert.deepEqual(countriesOfArea({country:'KEN'}),['KEN']);
  assert.deepEqual(countriesOfArea({boundary:{boundaryID:'BWA-ADM1-12345'}}),['BWA']);
  assert.deepEqual(countriesOfArea({}),[]);
  assert.deepEqual(countriesOfArea({countries:[],country:'UGA'}),['UGA']);
});

test('candidates: Gaborone to the border proposes Botswana and South Africa, a field in Botswana\'s interior Botswana alone',()=>{
  const across=candidateCountries(box(25.85,-24.75,26.05,-24.55)).map(c=>c.iso).sort();
  assert.deepEqual(across,['BWA','ZAF']);
  assert.deepEqual(candidateCountries(box(23.9,-21.6,24.1,-21.4)).map(c=>c.iso),['BWA']);
  // Public domain, and not a frame: the asset says so of itself.
  assert.match(NATURAL_EARTH_COUNTRIES.licence,/Public domain/);
  assert.match(NATURAL_EARTH_COUNTRIES.notForFraming,/never to measure/);
});

test('a share is of the area as drawn: a square split by a straight border is half in each, and a country beside it holds none',()=>{
  const area=box(10,0,12,1),west=box(9,-1,11,2),east=box(11,-1,13,2),apart=box(20,0,21,1);
  assert.ok(Math.abs(shareOfArea(area,west)-0.5)<0.001);
  assert.ok(Math.abs(shareOfArea(area,east)-0.5)<0.001);
  assert.equal(shareOfArea(area,apart),0);
});

test('the national outline: the simplified file where published, fetchable from a browser, and its polygons together',()=>{
  assert.equal(nationalOutlineUrl({simplifiedGeometryGeoJSON:'https://github.com/wmgeolab/geoBoundaries/raw/abc/x.geojson',gjDownloadURL:'https://github.com/wmgeolab/geoBoundaries/raw/abc/y.geojson'}),
    'https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/abc/x.geojson');
  assert.equal(nationalOutlineUrl({}),null);
  const outline=outlineOf({features:[{geometry:box(0,0,1,1)},{geometry:{type:'MultiPolygon',coordinates:[box(2,2,3,3).coordinates]}}]});
  assert.equal(outline.coordinates.length,2);
});
