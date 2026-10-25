import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {existsSync} from 'node:fs';

// WIRED ON 2026-10-24, and these stopped skipping that day. They were written against a module
// nothing imported -- esbuild emitted no `build/example-catalog.js`, so all three reported SKIP
// with that as the reason, which is what the practitioner met when they asked how to load South
// London and whether it was in a manifest. It was pinned by commit, per-file digest and licence,
// and no interface read any of it: a trust root with nothing standing on it.
//
// The surface is the Worked examples section of the Project tab, because opening a worked example
// is importing a project. The guard below stays: it is what reports an unwired module honestly
// rather than as a green tick, and it would catch the module being dropped from build.mjs.
//
// These run the moment something imports the module, so the coverage arrives with the surface
// instead of being written again later. The same shape as the WorldPop local-file exercise, which
// skips until FIELDWORK_WORLDPOP_FILE names a file.
const built=existsSync(new URL('../build/example-catalog.js',import.meta.url));
const wired=built?await import('../build/example-catalog.js'):null;
const skip=built?false:'src/example-catalog.ts is not imported by anything, so it is not built.';

const south=()=>wired.exampleById('urn:fieldwork:example:south-london-1854');

test('the catalog pins a commit, never a branch', {skip}, ()=>{
  const {curatedExamples,EXAMPLE_CATALOG_VERSION}=wired;
  assert.ok(EXAMPLE_CATALOG_VERSION);
  for(const example of curatedExamples()){
    assert.match(example.commit,/^[0-9a-f]{40}$/,
      `${example.id} must pin a full commit SHA: a digest pinned against a moving ref verifies nothing`);
    assert.ok(example.licence?.data,`${example.id} must state the terms it carries`);
    assert.ok(example.files.length>0);
    for(const file of example.files){
      assert.match(file.sha256,/^[0-9a-f]{64}$/);
      assert.ok(file.bytes>0);
    }
  }
});

test('a URL is built from the pinned commit, and an unpinned path is refused', {skip}, ()=>{
  const {fileURL}=wired;
  const example=south();
  assert.equal(fileURL(example,'provenance.json'),
    `${example.rawBase}/${example.commit}/provenance.json`);
  assert.throws(()=>fileURL(example,'../../etc/passwd'),/not pinned/);
  assert.throws(()=>fileURL(example,'data/does-not-exist.csv'),/not pinned/);
  assert.throws(()=>fileURL({...example,commit:'main'},'provenance.json'),/full commit SHA/);
});

test('a file that matches its digest is returned, and one that does not is refused', {skip}, async ()=>{
  const {verifiedFile}=wired;
  const example=south();
  const path='data/table-ix-first-seven-weeks.csv';
  const real=await readFile(new URL('../../example-1855-cholera-south-london/'+path,import.meta.url));
  const serve=body=>async url=>{
    assert.ok(url.includes(example.commit),'fetched from the pinned commit');
    return {ok:true,status:200,arrayBuffer:async()=>body.buffer.slice(body.byteOffset,body.byteOffset+body.byteLength)};
  };
  const bytes=await verifiedFile(example,path,serve(real));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),
    example.files.find(f=>f.path===path).sha256);

  // One byte changed, same length: the size check cannot catch it and the digest must.
  const tampered=Uint8Array.from(real);tampered[0]^=1;
  await assert.rejects(verifiedFile(example,path,serve(tampered)),/does not match the digest/);

  // Truncated: refused before hashing, and the message says so.
  await assert.rejects(verifiedFile(example,path,serve(real.subarray(0,10))),/Refused without hashing/);

  // A server that answers with an error leaves the example unavailable, not half-loaded.
  await assert.rejects(verifiedFile(example,path,async()=>({ok:false,status:404})),/could not be fetched/);
});
