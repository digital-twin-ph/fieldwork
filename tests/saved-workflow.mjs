/** THE WORKFLOW AS SAVED, WITH ITS DATA. From 0.88.1 a step's large data is kept in the payload store (IndexedDB) by
 *  content, and local storage holds the reference, so a test that reads a saved step's records reads them through that
 *  reference, as the application does when it loads. */
export async function savedWorkflow(page,key='fieldwork-workflow-v1'){
  return page.evaluate(async storeKey=>{
    const w=JSON.parse(localStorage.getItem(storeKey)||'{}');
    const db=await new Promise((resolve,reject)=>{const open=indexedDB.open('fieldwork');open.onsuccess=()=>resolve(open.result);open.onerror=()=>reject(open.error);});
    const get=ref=>new Promise((resolve,reject)=>{const r=db.transaction('payloads').objectStore('payloads').get(ref);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
    for(const n of w.nodes??[])if(n.params&&n.params.data===undefined&&typeof n.params.dataRef==='string')n.params.data=await get(n.params.dataRef);
    db.close();
    return w;
  },key);
}
