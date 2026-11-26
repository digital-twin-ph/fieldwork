/** ONE WAY TO OPEN A DATABASE ON THIS DEVICE (code review, 2026-11-25). Five modules each keep one IndexedDB database of
 *  one store, and each opened it with its own promise. Only the payload store bounded the wait: some engines in private
 *  mode leave an open request that neither succeeds nor fails, and boot must not wait on it. The other four did not, so
 *  saving a PDF, restoring a remembered file, reading a cached satellite value or unlocking credentials could wait
 *  forever with nothing said.
 *
 *  This opens, creates the store on first use, and settles within `timeoutMs` either way. It rejects with the reason,
 *  and each caller still decides what that means for it: evidence storage refuses with a message, the payload store
 *  falls back and says so, a remembered file is chosen again. Separate databases are kept on purpose: each has its own
 *  version, so one store's upgrade never waits on another's.
 *
 *  Names no DOM type, so a worker can import it. */

export type OpenFailure='absent'|'timeout'|'blocked'|'failed';

export class LocalDatabaseUnavailable extends Error{
  constructor(readonly why:OpenFailure,readonly database:string,cause?:unknown){
    super(`The device database ${database} could not be opened: ${why}.`,cause===undefined?undefined:{cause});
    this.name='LocalDatabaseUnavailable';
  }
}

/** Five seconds: what the payload store waited at boot since it was written, kept for every store. */
export const OPEN_TIMEOUT_MS=5000;

export function openLocalDatabase(name:string,store:string,{timeoutMs=OPEN_TIMEOUT_MS}:{timeoutMs?:number}={}):Promise<IDBDatabase>{
  return new Promise((resolve,reject)=>{
    const factory=(globalThis as {indexedDB?:IDBFactory}).indexedDB;
    if(!factory){reject(new LocalDatabaseUnavailable('absent',name));return;}
    let settled=false;
    const fail=(why:OpenFailure,cause?:unknown)=>{if(settled)return;settled=true;clearTimeout(timer);reject(new LocalDatabaseUnavailable(why,name,cause));};
    const timer=setTimeout(()=>fail('timeout'),timeoutMs);
    try{
      const open=factory.open(name,1);
      open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains(store))open.result.createObjectStore(store);};
      open.onsuccess=()=>{
        // Opened after the wait was given up: closed, so it does not hold a later upgrade open.
        if(settled){open.result.close();return;}
        settled=true;clearTimeout(timer);resolve(open.result);
      };
      open.onerror=()=>fail('failed',open.error);
      open.onblocked=()=>fail('blocked');
    }catch(error){fail('failed',error);}
  });
}
