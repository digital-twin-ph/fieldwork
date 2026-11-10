/** WHAT A SATELLITE FILE GAVE, KEPT ON THIS DEVICE (2026-11-09).
 *
 *  The practitioner, watching Brazil's lag workflow read 180 MODIS files again: *"This workflow in Brazil needs to be
 *  able to cache the satellite data read to save time."* Each file was read once per page; a reload, or coming back the
 *  next day, read every file again over the network.
 *
 *  What is kept is the READING, not the file: for each place, the sums the mean is made from, a few numbers. 180 files
 *  over 92 municipalities is about a megabyte, where the files themselves are hundreds. A published file does not change
 *  (its name carries the collection's version), so the same file read the same way at the same places gives the same
 *  sums. The key says what "the same way" is: the file, the layer, the quality rule, the places, and READER_VERSION,
 *  which a release that changes how a file is read raises, so nothing read the old way is reused.
 *
 *  A database of its own, `fieldwork-satellite`, not the payload store: that one reads everything into memory at start,
 *  which suits a workflow's data and not a cache that only a run asks for, one key at a time.
 *
 *  Tolerant, as the payload store is: no IndexedDB (Node, a blocked database, private mode) means nothing is kept and
 *  every file is read, which is slower and never wrong. */
const DB='fieldwork-satellite',STORE='readings';
/** Raised when the way a file is read changes. A saved reading made under another version is not used. */
export const READER_VERSION=1;

export interface ReadingStore {
  get(key:string):Promise<unknown|undefined>;
  put(key:string,value:unknown):Promise<void>;
}

let opening:Promise<IDBDatabase|null>|null=null;
function open():Promise<IDBDatabase|null>{
  if(opening)return opening;
  opening=new Promise(resolve=>{
    try{
      if(typeof indexedDB==='undefined'){resolve(null);return;}
      const request=indexedDB.open(DB,1);
      request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE);};
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>resolve(null);
      request.onblocked=()=>resolve(null);
    }catch{resolve(null);}
  });
  return opening;
}

const run=<T>(mode:IDBTransactionMode,act:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T|undefined>=>
  open().then(db=>new Promise<T|undefined>(resolve=>{
    if(!db){resolve(undefined);return;}
    try{
      const request=act(db.transaction(STORE,mode).objectStore(STORE));
      request.onsuccess=()=>resolve(request.result);
      request.onerror=()=>resolve(undefined);
    }catch{resolve(undefined);}
  }));

/** The store a run uses in a browser. */
export const deviceReadings:ReadingStore={
  get:key=>run('readonly',s=>s.get(`v${READER_VERSION}|${key}`)),
  put:async(key,value)=>{await run('readwrite',s=>s.put(value,`v${READER_VERSION}|${key}`));},
};

/** How many readings are kept, and roughly how large, for the dialog and the storage figure. */
export async function savedReadingsSummary():Promise<{count:number;bytes:number}>{
  const values=await run('readonly',s=>s.getAll())??[];
  return {count:values.length,bytes:values.reduce((n,v)=>n+JSON.stringify(v).length,0)};
}

/** Forgets every saved reading on this device; the next run reads every file again. */
export async function forgetSavedReadings():Promise<void>{await run('readwrite',s=>s.clear());}
