import test from 'node:test';
import assert from 'node:assert/strict';
import {grid3RasterFor,GRID3_COUNTRIES,GRID3_LICENCE,GRID3_CITATION,GRID3_NOTE} from '../build/grid3-catalogue.js';

// GRID3 BESIDE WORLDPOP (TODO 24, 2026-11-11).
test('GRID3 names one 2025 file per country of sub-Saharan Africa, and none elsewhere',()=>{
  assert.equal(GRID3_COUNTRIES,52);
  const bwa=grid3RasterFor('BWA');
  assert.match(bwa.url,/^https:\/\/data\.worldpop\.org\/repo\/wopr\/_MULT\/population\/GRID3_SSA2025\/.*bwa_SSApopulation_%202025_v1_0_gridded\.tif$/);
  assert.ok(bwa.bytes>10e6&&bwa.bytes<13e6,'about 11.6 MB, against WorldPop\'s 293 MB');
  assert.ok(grid3RasterFor('SSD')&&grid3RasterFor('COD'));
  assert.equal(grid3RasterFor('DEU'),null);
  assert.equal(grid3RasterFor(null),null);
  assert.match(GRID3_LICENCE,/CC BY 4\.0/);
  assert.match(GRID3_CITATION,/doi:10\.5258\/SOTON\/WP00851/);
  assert.match(GRID3_NOTE,/Not official government statistics/);
});
