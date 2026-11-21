import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

/** THE BOUNDARIES FIELDWORK HOLDS (2026-11-20) are the files at that commit of digital-twin-ph/boundaries: every level's
 *  description and parts by size and digest, and each level's units all in its parts. */
const catalogue=JSON.parse(readFileSync(new URL('../examples/boundaries/catalogue.json',import.meta.url),'utf8'));
const REPO=new URL('../../boundaries/',import.meta.url).pathname;
test('every pinned level is the files at the pinned commit, its units all in its parts',{skip:!existsSync(REPO)},()=>{
  const at=path=>execFileSync('git',['-C',REPO,'show',`${catalogue.commit}:${path}`],{maxBuffer:1<<28});
  for(const level of catalogue.levels){
    for(const f of [level.level,...level.parts]){
      const bytes=at(f.path);
      assert.equal(bytes.length,f.bytes,f.path);assert.equal(createHash('sha256').update(bytes).digest('hex'),f.sha256,f.path);
    }
    const units=at(`${level.iso}/${level.adm}/units.csv`).toString('utf8').trim().split('\n').length-1;
    const features=level.parts.reduce((n,p)=>n+JSON.parse(at(p.path)).features.length,0);
    assert.equal(features,units,`${level.iso} ${level.adm}: every unit is in a part`);
    assert.equal(JSON.parse(at(level.level.path)).boundaryID,level.boundaryID,`${level.iso} ${level.adm}`);
  }
});
