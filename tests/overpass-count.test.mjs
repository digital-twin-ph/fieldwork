import test from 'node:test';
import assert from 'node:assert/strict';
import {countQuery,readOverpassCount,countWays,osmQuery} from '../build/street-network.js';

// The practitioner drew a study area across the DRC-Uganda border and got, after four requests to
// three donated services, "the last reporting HTTP 504". A 504 is the service saying it gave up
// computing the answer. Overpass will answer `out count;` instead -- the service's own answer to
// "how much is there" -- which is one request rather than six, and a measurement rather than the
// client-side span cap this project removed on purpose.
const BORDER={type:'Polygon',coordinates:[[[29.0,-1.5],[32.5,-1.5],[32.5,2.5],[29.0,2.5],[29.0,-1.5]]]};

test('the count asks for the same ways as the download, and asks only for their number',()=>{
  const counting=countQuery(BORDER,250,50000,'walking'),downloading=osmQuery(BORDER,250,50000,'walking');
  assert.match(counting.query,/out count;$/);
  assert.doesNotMatch(counting.query,/out body/);
  // AND IT COUNTS WHAT WOULD BE SENT. A ways-only count sat inside every limit for an area whose
  // response was over 60 MB, because most of a street download is the nodes the ways reference.
  // 2026-10-21: "Doubling to 100000 did not help."
  assert.match(counting.query,/;>;out count;$/);
  // Same filter, same bounds: a count that asked a different question would measure nothing.
  const filter=/way\["highway"~"\^\(([^)]*)\)\$"\]/;
  assert.equal(counting.query.match(filter)[1],downloading.query.match(filter)[1]);
  assert.deepEqual(counting.bounds,downloading.bounds);
  // And it follows the mode, because a driving count is a different number.
  assert.notEqual(countQuery(BORDER,250,50000,'driving').query,counting.query);
});

test('a count answer is read, and anything else is not mistaken for one',()=>{
  assert.equal(readOverpassCount({elements:[{type:'count',id:0,tags:{nodes:'0',ways:'184230',relations:'0',total:'184230'}}]}),184230);
  assert.equal(readOverpassCount({elements:[{type:'count',id:0,tags:{total:'12'}}]}),12);
  for(const notACount of [null,{},{elements:[]},{elements:[{type:'way',id:1}]},{elements:[{type:'count',tags:{ways:'many'}}]}])
    assert.equal(readOverpassCount(notACount),null);
});

const respond=(body,{ok=true,status=200}={})=>async()=>({ok,status,json:async()=>body});

test('three answers, and only two of them decide anything',async()=>{
  assert.deepEqual(await countWays('https://x.invalid','q',respond({elements:[{type:'count',id:0,tags:{ways:'184230'}}]})),
    {kind:'counted',ways:184230,elements:184230});
  // Ways and elements are different numbers and the second is the one that predicts a response.
  assert.deepEqual(await countWays('https://x.invalid','q',
    respond({elements:[{type:'count',id:0,tags:{nodes:'1500000',ways:'184230',total:'1684230'}}]})),
    {kind:'counted',ways:184230,elements:1684230});
  // The server gave up: that IS evidence about the area.
  assert.deepEqual(await countWays('https://x.invalid','q',respond(null,{ok:false,status:504})),{kind:'refused',status:504});
  // These are not: a probe that could not be taken says nothing about how much is there.
  assert.deepEqual(await countWays('https://x.invalid','q',respond(null,{ok:false,status:429})),{kind:'unknown'});
  assert.deepEqual(await countWays('https://x.invalid','q',respond({elements:[{type:'way'}]})),{kind:'unknown'});
  assert.deepEqual(await countWays('https://x.invalid','q',async()=>{throw new Error('offline');}),{kind:'unknown'});
});

// WHAT IT WOULD COST, BEFORE IT IS SPENT. The practitioner raised the graph limit from 50,000 to
// 100,000 and downloaded 60 MB of a donated service's work for the second time, to have it
// discarded at the cap: the client knew how to refuse and not how to say how much would be enough.
test('a count that predicts more than the cap refuses before the download, and names the setting',async()=>{
  const {requestOSM}=await import('../build/street-network.js');
  const isStatus=url=>String(url).endsWith('/status');
  const isCount=init=>/out\+count|out%20count/.test(String(init?.body??''));
  const statusOk=()=>new Response('Rate limit: 2\n2 slots available now.\n',{status:200});
  const isProbe=init=>String(init?.body??'').includes('node%281%29');
  const probeOk=()=>new Response(JSON.stringify({version:0.6,elements:[]}));
  let downloads=0,counts=0;
  const fetcher=async(url,init)=>{
    if(isStatus(url))return statusOk();
    if(isProbe(init))return probeOk();
    if(isCount(init)){
      counts++;
      // The driving query drops footways, paths and steps, so it is a different -- much smaller --
      // number for the same bounds.
      const driving=/footway/.test(decodeURIComponent(String(init.body)))===false;
      return new Response(JSON.stringify({version:0.6,elements:[{type:'count',id:0,
        tags:driving?{nodes:'90000',ways:'14000',total:'104000'}:{nodes:'1500000',ways:'184230',total:'1684230'}}]}));
    }
    downloads++;return new Response('{}');
  };
  await assert.rejects(requestOSM(BORDER,250,fetcher,50000),err=>
    /184,230 street ways and 1,684,230 elements/.test(err.message)
    &&/about 252\.6 MB/.test(err.message)
    &&/Set the graph limit to 422,000 junctions/.test(err.message)
    &&/nothing was downloaded and nothing was spent/.test(err.message)
    // AND WHAT THE OTHER MODE COSTS, because at province scale that is the question: "we are not
    // even looking at walking mode. It will be driving mode", 2026-10-21.
    &&/The same area in driving mode holds 14,000 ways and 104,000 elements, about 15\.6 MB, which this download accepts/.test(err.message)
    &&/change Travel mode to Driving/.test(err.message));
  assert.equal(downloads,0,'the whole point is that no download is made');
  assert.ok(counts<=3,'the alternative costs one more COUNT, not a download');
});
