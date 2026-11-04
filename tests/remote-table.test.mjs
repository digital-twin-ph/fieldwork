import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {withoutRemoteRows,tablesInArchive,archiveEntry} from '../build/remote-table.js';

/** A TABLE FETCHED AT OPEN leaves the device as a spec, without its rows. Experiment 170. */
test('an exported workflow keeps the spec and the read settings of a remote table, and none of its rows',()=>{
  const workflow={nodes:[
    {id:'t',type:'table_input',params:{keys:['date'],valueField:'count',remote:{url:'https://x.test/a.zip',entry:'d/a.csv',sha256:'aa',bytes:9},
      data:{kind:'data-table',keys:['date'],valueField:'count',rows:[{key:{date:'2016-01-01'},value:31}],rowCount:1,missingValueCount:0,findings:[]},
      sourceTable:{headers:['date','count'],rows:[['2016-01-01','31']]}}},
    {id:'local',type:'table_input',params:{keys:['k'],valueField:'v',data:{kind:'data-table',keys:['k'],valueField:'v',rows:[{key:{k:'a'},value:1}],rowCount:1,missingValueCount:0}}}]};
  const out=withoutRemoteRows(structuredClone(workflow));
  assert.deepEqual(out.nodes[0].params.data.rows,[]);
  assert.equal(out.nodes[0].params.data.rowCount,0);
  assert.equal(out.nodes[0].params.sourceTable,undefined);
  assert.equal(out.nodes[0].params.remote.sha256,'aa');
  assert.deepEqual(out.nodes[0].params.keys,['date']);
  assert.equal(out.nodes[1].params.data.rows.length,1,'a table read from a local file travels as before');
});

test('an archive lists its tables and gives one back',()=>{
  const zip=zipSync({'pkg/data/a.csv':strToU8('date,count\n2016-01-01,31\n'),'pkg/README.md':strToU8('x'),'pkg/b.dta':new Uint8Array([115])});
  assert.deepEqual(tablesInArchive(zip),['pkg/data/a.csv','pkg/b.dta']);
  assert.equal(new TextDecoder().decode(archiveEntry(zip,'pkg/data/a.csv')),'date,count\n2016-01-01,31\n');
  assert.deepEqual(tablesInArchive(strToU8('date,count\n')),[]);
});

/** ONE DOWNLOAD PER FILE. The practitioner, 2026-11-04: *"I had to download the data set for NYC twice for 2
 *  workflows. Double download."* `fetch` is counted; the store stands in for the device's byte store. */
import {fetchRemoteTable,fetchOrDeviceCopy,useDeviceCopies,deviceCopyOf} from '../build/remote-table.js';
import {contentHash} from '../build/project-files.js';
const setUp=async()=>{
  const zip=zipSync({'pkg/a.csv':strToU8('date,count\n2016-01-01,31\n')});
  const held=new Map(),calls={n:0};
  globalThis.fetch=async()=>{calls.n++;return new Response(zip);};
  const memory=new Map();
  globalThis.localStorage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
  useDeviceCopies({read:async d=>held.get(d)??null,keep:async(d,b)=>{held.set(d,b);}});
  const spec={url:'https://x.test/pkg.zip',entry:'pkg/a.csv',archiveSha256:await contentHash(zip),
    sha256:await contentHash(strToU8('date,count\n2016-01-01,31\n')),bytes:26};
  return {zip,held,calls,spec};
};

test('three workflows on one file fetch it once, and read the device copy after',async()=>{
  const {calls,spec}=await setUp();
  const first=await fetchRemoteTable(spec);
  assert.equal(first.from,'source');
  for(let i=0;i<2;i++)assert.equal((await fetchRemoteTable(spec)).from,'device');
  assert.equal(calls.n,1);
  assert.equal(await first.text(),'date,count\n2016-01-01,31\n');
});

test('a damaged copy is fetched again rather than read',async()=>{
  const {held,calls,spec}=await setUp();
  held.set(spec.archiveSha256,new Uint8Array([1,2,3]));
  assert.equal((await fetchRemoteTable(spec)).from,'source');
  assert.equal(calls.n,1);
});

test('a URL typed again in the dialog reads the copy, and Fetch again goes to the source',async()=>{
  const {calls,spec}=await setUp();
  assert.equal((await fetchOrDeviceCopy(spec.url)).from,'source');
  assert.equal(deviceCopyOf(spec.url).sha256,spec.archiveSha256);
  const again=await fetchOrDeviceCopy(spec.url);
  assert.equal(again.from,'device');assert.ok(again.fetchedAt);
  assert.equal((await fetchOrDeviceCopy(spec.url,{fresh:true})).from,'source');
  assert.equal(calls.n,2);
});

test('a source that does not answer is stopped and said to be late, not left fetching',async()=>{
  const {fetchBytes}=await import('../build/remote-table.js');
  globalThis.fetch=(url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>reject(new Error('aborted'))));
  await assert.rejects(()=>fetchBytes('https://slow.test/a.zip',30),/did not finish answering within 0 minutes. Nothing was read/);
});
