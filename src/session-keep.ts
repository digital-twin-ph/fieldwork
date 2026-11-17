/** UNLOCKED THROUGH A RELOAD (2026-11-16). The practitioner, offered three ways to make a reload cost less: *"I want stay
 *  unlocked but shorten the lock time to 10 minutes."* Their decision, taken knowing the cost: while it is unlocked, an
 *  open identity and unlocked credentials are kept in this browser's IndexedDB, where anything running on this page can
 *  use them, until Lock is pressed or ten minutes pass without use.
 *
 *  What is kept is never plain text. It is encrypted with an AES-GCM key made here and kept beside it as a CryptoKey that
 *  cannot be exported, so the stored bytes are unreadable in the browser's storage panel, in a copy of the profile
 *  folder, or to another origin. That is all it protects against: a script on this page can ask the key to decrypt. A
 *  signing key is kept as the non-exportable CryptoKey it already is. Each record carries its expiry and is deleted, not
 *  returned, once that has passed. */

const DB='fieldwork-unlocked-v1',STORE='kept',WRAP='wrap-key';
export const UNLOCKED_FOR_MS=10*60*1000;

function database():Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);
    r.onupgradeneeded=()=>r.result.createObjectStore(STORE);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
async function run<T>(mode:IDBTransactionMode,act:(store:IDBObjectStore)=>IDBRequest<T>):Promise<T>{
  const db=await database();
  try{return await new Promise<T>((resolve,reject)=>{const r=act(db.transaction(STORE,mode).objectStore(STORE));
    r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  finally{db.close();}
}
async function wrapKey():Promise<CryptoKey>{
  const kept=await run('readonly',s=>s.get(WRAP)) as CryptoKey|undefined;
  if(kept)return kept;
  const made=await crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  await run('readwrite',s=>s.put(made,WRAP));return made;
}

interface Kept {iv:Uint8Array<ArrayBuffer>;data:ArrayBuffer;expiresAt:number;keptAt:number;keys?:Record<string,CryptoKey>}

/** LOCK IS SAID AT ONCE, not when the delete finishes: deleting from IndexedDB takes a moment, and a reload in that
 *  moment found the copy still there and came back unlocked (found by the test, 2026-11-16). The time of the lock is
 *  written synchronously, and a copy kept before it is never restored. */
const lockedKey=(name:string)=>`fieldwork-locked-${name}`;
const lockedAt=(name:string)=>{try{return Number(localStorage.getItem(lockedKey(name))??0);}catch{return 0;}};

/** Keep `value`, encrypted, and `keys` as they are, until `expiresAt`. Failing to keep is not an error: the unlock still
 *  holds for this page, as it did before. */
export async function keep(name:string,value:unknown,expiresAt:number,keys?:Record<string,CryptoKey>):Promise<void>{
  // Stamped when keeping BEGINS, so a Lock pressed while it is written is later than it, and wins.
  const keptAt=Date.now();
  try{const iv=crypto.getRandomValues(new Uint8Array(12));
    const data=await crypto.subtle.encrypt({name:'AES-GCM',iv},await wrapKey(),new TextEncoder().encode(JSON.stringify(value)));
    const record:Kept={iv,data,expiresAt,keptAt,...(keys?{keys}:{})};
    await run('readwrite',s=>s.put(record,name));}
  catch{/* private browsing, or storage refused: unlocked for this page only */}
}
/** What was kept, if it has not expired. An expired record is deleted. */
export async function restore<T>(name:string,now=Date.now()):Promise<{value:T;expiresAt:number;keys?:Record<string,CryptoKey>}|null>{
  try{const record=await run('readonly',s=>s.get(name)) as Kept|undefined;
    if(!record)return null;
    if(record.expiresAt<=now||!(record.keptAt>lockedAt(name))){await run('readwrite',st=>st.delete(name)).catch(()=>undefined);return null;}
    const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv:record.iv},await wrapKey(),record.data);
    return {value:JSON.parse(new TextDecoder().decode(plain)) as T,expiresAt:record.expiresAt,...(record.keys?{keys:record.keys}:{})};}
  catch{await drop(name);return null;}
}
/** Moves the expiry on, after use. */
export async function extend(name:string,expiresAt:number):Promise<void>{
  try{const record=await run('readonly',s=>s.get(name)) as Kept|undefined;
    if(record)await run('readwrite',s=>s.put({...record,expiresAt},name));}
  catch{/* the record expires at its old time */}
}
export async function drop(name:string):Promise<void>{
  try{localStorage.setItem(lockedKey(name),String(Date.now()));}catch{/* the delete below still runs */}
  try{await run('readwrite',s=>s.delete(name));}catch{/* nothing kept */}
}
