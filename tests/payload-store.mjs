/** A payload the workflow refers to rather than carries, read back out of IndexedDB.
 *
 *  Since 2026-10-20 a downloaded street network is kept in the large store and the saved workflow
 *  holds only its digest, so a test that reads localStorage sees a reference and no graph. That is
 *  the change, not a regression: see docs/experiments/121-storage-beyond-local-storage.md.
 */
export const payload=(page,digest)=>page.evaluate(key=>new Promise((resolve,reject)=>{
  const open=indexedDB.open('fieldwork',1);
  open.onerror=()=>reject(open.error);
  open.onsuccess=()=>{
    const request=open.result.transaction('payloads','readonly').objectStore('payloads').get(key);
    request.onsuccess=()=>resolve(request.result??null);
    request.onerror=()=>reject(request.error);
  };
}),digest);
