import test from 'node:test';
import assert from 'node:assert/strict';
import {OVERTURE_BUCKET,OVERTURE_CATEGORY_KINDS,OVERTURE_DEFAULT_CONFIDENCE,OVERTURE_LICENCE,
        latestOvertureRelease,listOverturePlaceParts} from '../build/overture-places.js';
import {FACILITY_KINDS,FACILITY_SOURCES,confidenceOf} from '../build/health-facilities.js';

const reply=body=>new Response(body,{status:200,headers:{'Content-Type':'application/xml'}});

test('the release is discovered, not pinned, and the newest wins',async()=>{
  const listing=`<?xml version="1.0"?><ListBucketResult>
    <Prefix>release/2026-08-19.0/</Prefix><Prefix>release/2026-09-23.1/</Prefix>
    <Prefix>release/2026-09-23.0/</Prefix><Prefix>release/notes/</Prefix></ListBucketResult>`;
  let asked='';
  const release=await latestOvertureRelease(async url=>{asked=String(url);return reply(listing);});
  assert.equal(release,'2026-09-23.1','the later build of the same date is newer');
  assert.match(asked,/prefix=release\//);
});

test('a bucket layout this does not understand is refused rather than guessed at',async()=>{
  await assert.rejects(()=>latestOvertureRelease(async()=>reply('<ListBucketResult/>')),
    /no release this understands/);
  await assert.rejects(()=>latestOvertureRelease(async()=>new Response('',{status:503})),
    /could not be listed: HTTP 503/);
});

test('the places files are listed, and a truncated listing is refused',async()=>{
  const keys=['part-00000-a-c000.zstd.parquet','part-00001-b-c000.zstd.parquet','_metadata'];
  const body=k=>`<ListBucketResult>${k.map(n=>`<Key>release/2026-09-23.1/theme=places/type=place/${n}</Key>`).join('')}</ListBucketResult>`;
  const parts=await listOverturePlaceParts('2026-09-23.1',async()=>reply(body(keys)));
  assert.equal(parts.length,2,'only parquet files are parts');
  assert.ok(parts[0].startsWith(OVERTURE_BUCKET+'/release/2026-09-23.1/theme=places/'));

  // A truncated listing would silently drop files, and with them whole regions of the world. That
  // failure would look like an empty study area, which is indistinguishable from a true absence.
  await assert.rejects(()=>listOverturePlaceParts('2026-09-23.1',
    async()=>reply(body(keys)+'<IsTruncated>true</IsTruncated>')),/truncated/);
  await assert.rejects(()=>listOverturePlaceParts('2026-09-23.1',
    async()=>reply('<ListBucketResult/>')),/no places files/);
});

// The mapping from Overture's categories to this application's facility kinds is a declared
// equivalence and a judgement. These assertions are what stop the judgement drifting unnoticed.
test('every mapped Overture category lands on a facility kind this application knows',()=>{
  for(const [category,kind] of Object.entries(OVERTURE_CATEGORY_KINDS))
    assert.ok(FACILITY_KINDS.includes(kind),
      `${category} maps to "${kind}", which is not one of the offered kinds`);
});

test('the generic Overture categories are deliberately not mapped',()=>{
  // Measured 2026-10-10 in a Manila study area: these three carried the noise — a wellness spa
  // under health_care, individually named doctors, a training course. They name no facility type a
  // practitioner could act on, and a wrong mapping is worse than a dropped record because it is
  // invisible in the result.
  for(const generic of ['health_care','medical_service','specialized_health_care'])
    assert.equal(OVERTURE_CATEGORY_KINDS[generic],undefined,
      `${generic} must stay unmapped, and its records dropped and counted`);
  assert.equal(OVERTURE_CATEGORY_KINDS.dental_clinic,'dentist');
  assert.equal(OVERTURE_CATEGORY_KINDS.pharmacy_and_drug_store,'pharmacy');
  assert.equal(OVERTURE_CATEGORY_KINDS.diagnostics_imaging_or_lab_service,'laboratory');
});

test('the confidence threshold is refused outside 0 to 1, never clamped',()=>{
  assert.equal(confidenceOf(undefined),OVERTURE_DEFAULT_CONFIDENCE);
  assert.equal(confidenceOf(0),0);
  assert.equal(confidenceOf(1),1);
  // Clamping would answer a different question than the one asked, and say nothing about it.
  for(const bad of [-0.1,1.5,Number.NaN,Infinity])
    assert.throws(()=>confidenceOf(bad),/between 0 and 1/);
});

test('Overture is declared as a non-share-alike source, unlike the OpenStreetMap two',()=>{
  const overture=FACILITY_SOURCES['overture-places'];
  assert.equal(overture.licence,OVERTURE_LICENCE);
  assert.equal(overture.licence,'CDLA-Permissive-2.0');
  assert.ok(overture.confidence,'the confidence knob belongs to this source only');
  assert.ok(!overture.needsCountry);
  for(const key of ['openstreetmap-live','hdx-hot-export']){
    assert.equal(FACILITY_SOURCES[key].licence,'ODbL-1.0');
    assert.ok(!FACILITY_SOURCES[key].confidence);
  }
  // The licence must resolve, because a receipt states it as an IRI for comparison.
  for(const source of Object.values(FACILITY_SOURCES))
    assert.match(source.licenceIRI,/^https:\/\//);
});
