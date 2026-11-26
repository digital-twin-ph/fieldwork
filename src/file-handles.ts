/** FILES REMEMBERED ACROSS SESSIONS, where the browser can (2026-11-20). The practitioner, after a run over DR Congo stopped
 *  to ask for GHS-POP's 12.3 GB file again: *"Add both"* -- a button in the stop message that chooses it, and the file
 *  remembered. Chrome and Edge give a handle to a file chosen through their picker, which can be kept in IndexedDB and,
 *  in a later session, read again once the person allows it. Safari and Firefox do not; there the file is chosen again.
 *  A handle is kept by the digest of the file it was checked to be, on this device only. */
import {openLocalDatabase} from './local-database.js';
type ReadPermission='granted'|'denied'|'prompt';
export interface KeptHandle {getFile():Promise<File>;
  queryPermission?(o:{mode:'read'}):Promise<ReadPermission>;requestPermission?(o:{mode:'read'}):Promise<ReadPermission>}
type Picker=(o:{types?:{description:string;accept:Record<string,string[]>}[];multiple?:boolean})=>Promise<KeptHandle[]>;

const DB='fieldwork-file-handles',STORE='handles';
const open=()=>openLocalDatabase(DB,STORE);
async function inStore<T>(mode:IDBTransactionMode,work:(store:IDBObjectStore)=>IDBRequest):Promise<T|undefined>{
  try{
    const db=await open();
    return await new Promise<T|undefined>((resolve,reject)=>{
      const request=work(db.transaction(STORE,mode).objectStore(STORE));
      request.onsuccess=()=>{db.close();resolve(request.result as T|undefined);};
      request.onerror=()=>{db.close();reject(request.error);};
    });
  }catch{return undefined;}
}
export const rememberHandle=(digest:string,handle:KeptHandle)=>inStore<IDBValidKey>('readwrite',s=>s.put(handle,digest));
export const rememberedHandle=(digest:string)=>inStore<KeptHandle>('readonly',s=>s.get(digest));
/** The picker that returns a handle, where the browser has one. */
export const handlePicker=():Picker|undefined=>(globalThis as unknown as {showOpenFilePicker?:Picker}).showOpenFilePicker;
