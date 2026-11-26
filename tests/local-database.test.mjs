import test from 'node:test';
import assert from 'node:assert/strict';
import {openLocalDatabase,LocalDatabaseUnavailable} from '../build/local-database.js';

// ONE OPEN, THAT ALWAYS SETTLES (code review, 2026-11-25). Only the payload store bounded the wait for an open that
// neither succeeds nor fails, which some engines in private mode do; four other stores could wait forever. A stub
// factory stands in for each way an open can go, since Node has no IndexedDB.
const stub=behave=>{
  const opened=[];
  const factory={open(name,version){
    const request={result:undefined,error:undefined};opened.push({name,version,request});
    queueMicrotask(()=>behave(request));
    return request;
  }};
  return {factory,opened};
};
const withFactory=async(factory,run)=>{
  const had=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');
  Object.defineProperty(globalThis,'indexedDB',{value:factory,configurable:true,writable:true});
  try{return await run();}finally{if(had)Object.defineProperty(globalThis,'indexedDB',had);else delete globalThis.indexedDB;}
};
const database=()=>{const stores=new Set(),db={closed:false,objectStoreNames:{contains:n=>stores.has(n)},
  createObjectStore:n=>{stores.add(n);},close(){db.closed=true;}};return {db,stores};};
const why=async(promise,expected)=>{
  await assert.rejects(promise,error=>error instanceof LocalDatabaseUnavailable&&error.why===expected,`rejects as ${expected}`);
};

test('an open that succeeds gives the database, its store made on first use',async()=>{
  const {db,stores}=database();
  const {factory,opened}=stub(r=>{r.result=db;r.onupgradeneeded?.();r.onsuccess?.();});
  const got=await withFactory(factory,()=>openLocalDatabase('fieldwork-test','things'));
  assert.equal(got,db);
  assert.deepEqual([...stores],['things']);
  assert.deepEqual(opened.map(o=>[o.name,o.version]),[['fieldwork-test',1]]);
});

test('an upgrade does not make a store that is already there',async()=>{
  const {db,stores}=database();stores.add('things');
  let made=0;const create=db.createObjectStore;db.createObjectStore=n=>{made++;create(n);};
  const {factory}=stub(r=>{r.result=db;r.onupgradeneeded?.();r.onsuccess?.();});
  await withFactory(factory,()=>openLocalDatabase('fieldwork-test','things'));
  assert.equal(made,0);
});

test('no IndexedDB at all is said, not thrown as a TypeError',async()=>{
  await withFactory(undefined,()=>why(openLocalDatabase('fieldwork-test','things'),'absent'));
});

test('a failed open and a blocked one each reject with their reason',async()=>{
  const failed=stub(r=>{r.error=new Error('QuotaExceededError');r.onerror?.();});
  await withFactory(failed.factory,()=>why(openLocalDatabase('fieldwork-test','things'),'failed'));
  const blocked=stub(r=>{r.onblocked?.();});
  await withFactory(blocked.factory,()=>why(openLocalDatabase('fieldwork-test','things'),'blocked'));
  const throws={open(){throw new Error('SecurityError');}};
  await withFactory(throws,()=>why(openLocalDatabase('fieldwork-test','things'),'failed'));
});

test('an open that never answers settles at the timeout, and a late success is closed',async()=>{
  let late;
  const {db}=database();
  const {factory}=stub(r=>{late=()=>{r.result=db;r.onsuccess?.();};});
  const began=Date.now();
  await withFactory(factory,()=>why(openLocalDatabase('fieldwork-test','things',{timeoutMs:50}),'timeout'));
  assert.ok(Date.now()-began<1000,'settled near the timeout, not at a default');
  late();
  assert.equal(db.closed,true,'the connection that arrived after the wait was given up is closed');
});
