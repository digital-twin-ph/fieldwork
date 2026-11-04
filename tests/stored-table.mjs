/** A TABLE INPUT'S SAVED PARAMETERS, with its rows put back from the dataset store (experiment 175).
 *
 *  Since 2026-11-04 a table's rows are kept in IndexedDB (`fieldwork` / `payloads`) under `params.dataRef`, not inside
 *  the workflow in localStorage. A test that read `params.data` from localStorage was reading where the rows used to be;
 *  this reads where they are, and still accepts a workflow that holds them inline. */
export const storedTable=page=>page.evaluate(()=>new Promise((resolve,reject)=>{
  const params=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='table_input').params;
  if(!params.dataRef){resolve(params);return;}
  const open=indexedDB.open('fieldwork');
  open.onerror=()=>reject(open.error);
  open.onsuccess=()=>{const db=open.result,get=db.transaction('payloads','readonly').objectStore('payloads').get(params.dataRef);
    get.onsuccess=()=>{db.close();resolve({...params,data:get.result});};
    get.onerror=()=>{db.close();reject(get.error);};};
}));
