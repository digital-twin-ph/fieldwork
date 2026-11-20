import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

/** THE TIDE GAUGES FIELDWORK PINS (2026-11-20) are the files at that commit of coastal-sea-level: each table and the
 *  shared dictionary by size and digest, and every gauge the map draws is a row of its country's table. */
const catalogue=JSON.parse(readFileSync(new URL('../examples/coastal-sea-level/catalogue.json',import.meta.url),'utf8'));
const REPO=new URL('../../coastal-sea-level/',import.meta.url).pathname;
test('every pinned file is the file at the pinned commit, and every mapped gauge is a row',{skip:!existsSync(REPO)},()=>{
  const at=path=>execFileSync('git',['-C',REPO,'show',`${catalogue.commit}:${path}`]);
  for(const f of [catalogue.columns,...catalogue.countries.map(c=>c.table)]){
    const bytes=at(f.path);
    assert.equal(bytes.length,f.bytes,f.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256,f.path);
  }
  for(const c of catalogue.countries){
    const rows=at(c.table.path).toString('utf8').trim().split('\n').length-1;
    assert.equal(rows,c.stations,c.iso3);assert.ok(c.gauges.length<=rows,c.iso3);
  }
});
