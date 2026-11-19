import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync,readdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

/** NO EXAMPLE CARRIES A TEST'S MADE-UP FILES (2026-11-19). The Brazil example was published on 2026-11-07 holding the
 *  satellite search its from-scratch test made up, MOD11A2.p0.fixture to p700-odd, saved by an export of a stubbed run;
 *  every gate passed for twelve days and the practitioner found it running the example. Each example checked out beside
 *  this repository is read here, and any address or name a test's stub writes is refused. */
const STUB=/[./_-]fixture[./_-]|_FIXTURE_|st=fixture|\.fixture\b/i;
const root=new URL('../../',import.meta.url);
const bundles=existsSync(root)?readdirSync(root).filter(d=>d.startsWith('example-'))
  .map(d=>({name:d,file:new URL(`${d}/fieldwork-project.json.gz`,root)})).filter(b=>existsSync(b.file)):[];

test('no example\'s published project holds an address or file name made up by a test',{skip:!bundles.length&&'no example repository is checked out beside this one'},()=>{
  for(const {name,file} of bundles){
    const text=gunzipSync(readFileSync(file)).toString('utf8');
    const found=text.match(new RegExp(`.{0,60}${STUB.source}.{0,40}`,'i'));
    assert.ok(!found,`${name} holds a test fixture: ${found?.[0]}`);
  }
});
