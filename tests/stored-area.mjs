/** WHERE A SAVED STUDY AREA'S OUTLINE IS, for a browser test to read it back. An outline acquired from a published
 *  source is kept in the payload store (IndexedDB) under `areaRef` since 2026-11-05, and the saved workflow keeps only
 *  the reference; a drawn one is still inline. This reads either. */
export async function storedArea(page){
  return page.evaluate(async()=>{
    const params=JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='study_area').params;
    if(params.geometry!==undefined||typeof params.areaRef!=='string')return params;
    const area=await new Promise((resolve,reject)=>{const open=indexedDB.open('fieldwork');
      open.onerror=()=>reject(open.error);
      open.onsuccess=()=>{const get=open.result.transaction('payloads','readonly').objectStore('payloads').get(params.areaRef);
        get.onsuccess=()=>resolve(get.result);get.onerror=()=>reject(get.error);};});
    return {...params,geometry:area?.geometry??null,revisions:area?.revisions,fromStore:true};
  });
}
