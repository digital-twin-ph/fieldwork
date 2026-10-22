/** Where a workflow's heavy payloads are kept, which until 2026-10-20 was the smallest store the
 *  browser offers.
 *
 *  The practitioner downloaded Bunia with the new driving mode and got "This could not be saved on
 *  this device, so it was not kept." The download had worked; the SAVE had not. A network download
 *  is kept only if it persists, so the graph was rolled back and nothing survived the attempt.
 *
 *  localStorage accepts 5,226,496 bytes measured in both engines, a workflow is written twice on
 *  every save, and a Bunia walking graph is an estimated 14.2 MB from two measured numbers --
 *  42,796 vertices at ~332 bytes each, the latter weighed on the Soho graph this repository ships.
 *  Five to six times the whole quota, so no amount of clearing could have helped. The same probe
 *  measured IndexedDB, Cache and OPFS at 10.7 GB in Chromium and 1.0 GB in WebKit.
 *  See docs/experiments/121-storage-beyond-local-storage.md.
 *
 *  What moves is the PAYLOAD, not the workflow. A workflow stays in localStorage, where a
 *  synchronous read at boot and a synchronous write on every edit are what the editor is built on;
 *  what leaves is the data a `dataRef` points at -- street networks, point collections, tables.
 *  The reference machinery already existed for sharing a payload between the workflows of one
 *  project (experiment 122); this gives it a store that can hold what it addresses.
 *
 *  Everything here is deliberately tolerant. A browser in private mode, a blocked database, a
 *  quota refusal: each falls back to the old localStorage store and SAYS which store is in use,
 *  because a practitioner whose payloads are capped at 5 MB again needs to know that rather than
 *  discover it on a download. */
const DB='fieldwork',STORE='payloads',LEGACY='fieldwork-datasets-v1';
export type PayloadStoreKind='indexeddb'|'local'|'memory';

const memory=new Map<string,unknown>();
let kind:PayloadStoreKind='memory';
let database:IDBDatabase|null=null;
let announce:((kind:PayloadStoreKind,why:string)=>void)|null=null;
let announced=false;

/** What the payloads are actually being kept in, for the UI to report honestly. */
export const payloadStoreKind=():PayloadStoreKind=>kind;
/** Say it ONCE, loudly, when the large store stops being the one in use.
 *
 *  The practitioner, on the first version of this file: *"Store fallback is dangerous especially
 *  when the primary mode keeps on failing."* Right, and the danger is silence rather than the
 *  smaller store. A fallback nobody is told about turns a 10 GB ceiling back into a 5 MB one
 *  while the application keeps reporting "Saved on this device", and the next large download is
 *  refused for reasons that look like the service's. */
export const onStoreDegraded=(handler:(kind:PayloadStoreKind,why:string)=>void):void=>{announce=handler;};
function degrade(to:PayloadStoreKind,why:string):void{
  const changed=kind!==to;kind=to;
  if(changed&&!announced&&announce){announced=true;announce(to,why);}
}
/** The payloads this session knows about, for the synchronous readers that hydrate a workflow. */
export const cachedPayloads=():Record<string,unknown>=>Object.fromEntries(memory);
export const cachedPayload=(digest:string):unknown=>memory.get(digest);

const request=<T>(req:IDBRequest<T>):Promise<T>=>new Promise((resolve,reject)=>{
  req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});
/** A write is kept when the TRANSACTION completes, not when the request succeeds.
 *
 *  This is the IndexedDB trap that matters here: a `put` whose request fires `success` can still
 *  be rolled back when the transaction aborts, which is what a quota refusal looks like. Waiting
 *  on `oncomplete` is the difference between reporting a payload kept and knowing it. */
const committed=(tx:IDBTransaction):Promise<void>=>new Promise((resolve,reject)=>{
  tx.oncomplete=()=>resolve();
  tx.onerror=()=>reject(tx.error);
  tx.onabort=()=>reject(tx.error??new Error('The write was rolled back.'));});

function openDatabase():Promise<IDBDatabase|null>{
  if(typeof indexedDB==='undefined')return Promise.resolve(null);
  return new Promise(resolve=>{
    let settled=false;
    const done=(value:IDBDatabase|null)=>{if(!settled){settled=true;resolve(value);}};
    // A database that neither opens nor fails is the private-mode case in some engines. Boot must
    // not wait on it: five seconds, then carry on with localStorage and say so.
    const timer=setTimeout(()=>done(null),5000);
    try{
      const open=indexedDB.open(DB,1);
      open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains(STORE))open.result.createObjectStore(STORE);};
      open.onsuccess=()=>{clearTimeout(timer);done(open.result);};
      open.onerror=()=>{clearTimeout(timer);done(null);};
      open.onblocked=()=>{clearTimeout(timer);done(null);};
    }catch{clearTimeout(timer);done(null);}
  });
}

function readLegacy():Record<string,unknown>{
  try{const raw=JSON.parse(localStorage.getItem(LEGACY)||'{}');
    return raw&&typeof raw==='object'&&!Array.isArray(raw)?raw as Record<string,unknown>:{};}
  catch{return {};}
}

/** Open the store, read what is in it, and carry anything the old store held across.
 *
 *  Called once, before the first workflow is hydrated, because a reference whose payload is
 *  missing is a refusal and not an empty input -- `hydrateWorkflow` is explicit about that, and it
 *  is right: an input that silently became zero records would run and produce a clean wrong
 *  answer. So the payloads have to be in hand before anything is validated. */
export async function loadPayloads():Promise<PayloadStoreKind>{
  const legacy=readLegacy();
  for(const [digest,payload] of Object.entries(legacy))memory.set(digest,payload);
  database=await openDatabase();
  if(!database){
    // NOT `kind='local'` first: degrade() announces on a change, and setting it here would make
    // the change invisible to it. Found by the test for this case, 2026-10-20.
    degrade('local','This browser would not open the large store, so payloads are kept in the small one.');
    return kind;
  }
  kind='indexeddb';
  try{
    const tx=database.transaction(STORE,'readonly'),store=tx.objectStore(STORE);
    const keys=await request(store.getAllKeys()),values=await request(store.getAll());
    keys.forEach((key,index)=>memory.set(String(key),values[index]));
  }catch{/* an unreadable store is an empty one; the references it cannot answer refuse by name */}
  // Carry the old store across, and drop from it ONLY what the new store is confirmed to hold.
  //
  // The first version of this deleted the whole legacy key once every write "succeeded" -- and a
  // write counted as a success when it had fallen back to the legacy store itself. A database
  // that opened and then refused every write would therefore have deleted the only copy of a
  // practitioner's payloads. That is the failure the practitioner named on 2026-10-20: a fallback
  // is dangerous exactly when the primary keeps failing, because the two get confused for each
  // other. Confirmation is now per payload and comes from the destination store.
  const remaining:Record<string,unknown>={};
  for(const [digest,payload] of Object.entries(legacy))
    if(await putPayload(digest,payload)!=='indexeddb')remaining[digest]=payload;
  if(Object.keys(legacy).length)
    try{
      if(Object.keys(remaining).length){
        localStorage.setItem(LEGACY,JSON.stringify(remaining));
        degrade('local',`${Object.keys(remaining).length} saved payload(s) could not be moved into the large store and are still in the small one.`);
      }else localStorage.removeItem(LEGACY);
    }catch{/* leaving the old store in place costs space and loses nothing */}
  return kind;
}

/** Keep a payload, and say WHERE it is kept rather than whether something somewhere worked.
 *
 *  Three outcomes, and the caller needs to tell them apart: in the large store, in the small one,
 *  or nowhere. A boolean collapsed the middle case into the first, which is how the migration
 *  above came to delete payloads it believed it had moved. */
export async function putPayload(digest:string,payload:unknown):Promise<PayloadStoreKind|null>{
  memory.set(digest,payload);
  if(database)
    try{
      const tx=database.transaction(STORE,'readwrite');
      tx.objectStore(STORE).put(payload,digest);
      await committed(tx);
      return 'indexeddb';
    }catch(error){
      // A database that opened and then refused is the dangerous state: it looks healthy and is
      // not. Say so once, and stop reporting the large store as the one in use.
      degrade('local',`The large store refused a ${(payloadBytes(payload)/1e6).toFixed(1)} MB payload (${error instanceof Error?error.message:'no reason given'}), so this device is back to the small one.`);
    }
  try{
    const legacy=readLegacy();
    if(digest in legacy)return 'local';
    localStorage.setItem(LEGACY,JSON.stringify({...legacy,[digest]:payload}));
    return 'local';
  }catch{return null;}
}

/** Take one back out, for a payload nothing refers to.
 *
 *  A download writes its payload to the store and THEN asks the workflow to accept it. When the
 *  workflow refuses -- validation, a full workspace store, a changed workflow -- the bytes stayed
 *  behind, referred to by nothing and counted in the storage figure forever. Measured 2026-10-21:
 *  a device showing "data 416.2 MB" beside a Street network widget reading "0 nodes, 0 directed
 *  edges". There is no way to reach such a payload from the application, so it has to be removed
 *  where it was written. */
export async function dropPayload(digest:string):Promise<void>{
  memory.delete(digest);
  if(database)
    try{
      const tx=database.transaction(STORE,'readwrite');
      tx.objectStore(STORE).delete(digest);
      await committed(tx);
    }catch{/* A store that will not delete keeps the payload; it is still unreferenced. */}
  try{
    const legacy=readLegacy();
    if(digest in legacy){const {[digest]:_dropped,...rest}=legacy;localStorage.setItem(LEGACY,JSON.stringify(rest));}
  }catch{/* nothing to clear */}
}

/** What a payload costs, so a refusal can quote it. Serialized length, not an estimate from a
 *  record count: the same rule `geometryBytes` follows, for the same reason. */
export const payloadBytes=(payload:unknown):number=>JSON.stringify(payload).length;
