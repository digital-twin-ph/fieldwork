import type {PointCollection} from './types.js';
import type {ReprojectProvenance,ReprojectSource} from './reproject.js';
import {reprojectToCRS84,projectedGeoJSONPoints,utmDefinition,REPROJECT_MAX_RECORDS} from './reproject.js';
import {parseCSV,csvPoints} from './input-data.js';
import {contentHash} from './project-files.js';

export interface ReprojectResult {data:PointCollection; provenance:ReprojectProvenance; source:ReprojectSource; zone:number; hemisphere:'north'|'south'}
const FILE_BYTES=5_000_000;

export function openReprojectEditor(onSave:(result:ReprojectResult)=>boolean,existing?:{zone:number;hemisphere:'north'|'south'}):void{
  const dialog=document.createElement('dialog');dialog.id='reproject-dialog';dialog.setAttribute('aria-labelledby','reproject-title');
  dialog.innerHTML='<h2 id="reproject-title">Reproject projected points</h2><p>Select a local CSV or GeoJSON file whose coordinates are UTM easting and northing on the <strong>WGS84</strong> datum. Fieldwork converts them to CRS84 longitude/latitude so the other widgets can use them.</p>'
    +'<label class="field-label" for="reproject-file">CSV or GeoJSON file (up to 5 MB, '+REPROJECT_MAX_RECORDS.toLocaleString()+' records)</label><input id="reproject-file" type="file" accept=".csv,.json,.geojson,text/csv,application/json,application/geo+json">'
    +'<div class="detail-row"><label class="field-label" for="reproject-zone">UTM zone (1–60)</label><input id="reproject-zone" type="number" min="1" max="60" step="1" value="'+(existing?.zone??35)+'"></div>'
    +'<label class="field-label" for="reproject-hemisphere">Hemisphere</label><select id="reproject-hemisphere"><option value="south">South</option><option value="north">North</option></select>'
    +'<p id="reproject-crs" class="muted"></p><fieldset id="reproject-columns" hidden><legend>CSV columns</legend></fieldset>'
    +'<p id="reproject-status" role="status"></p><details><summary>Conversion preview and provenance</summary><pre id="reproject-preview"></pre></details>'
    +'<p>Only WGS84 UTM zones are accepted. A file on another datum, such as Cape or Hartebeesthoek, needs a datum shift this prototype does not implement; declaring it a UTM zone would misplace every record. Reprojection cannot correct a coordinate that was recorded wrongly, and a successful conversion does not confirm the declared zone is the right one.</p>'
    +'<p id="reproject-error" role="alert" hidden></p><div class="package-actions"><button id="reproject-cancel" class="button">Cancel</button><button id="reproject-save" class="button primary" disabled>Save reprojected points</button></div>';
  document.body.append(dialog);
  const fileInput=dialog.querySelector<HTMLInputElement>('#reproject-file')!,zoneInput=dialog.querySelector<HTMLInputElement>('#reproject-zone')!,hemiInput=dialog.querySelector<HTMLSelectElement>('#reproject-hemisphere')!;
  const columns=dialog.querySelector<HTMLFieldSetElement>('#reproject-columns')!,crsLine=dialog.querySelector<HTMLElement>('#reproject-crs')!,status=dialog.querySelector<HTMLElement>('#reproject-status')!;
  const preview=dialog.querySelector<HTMLElement>('#reproject-preview')!,error=dialog.querySelector<HTMLElement>('#reproject-error')!,save=dialog.querySelector<HTMLButtonElement>('#reproject-save')!,cancel=dialog.querySelector<HTMLButtonElement>('#reproject-cancel')!;
  if(existing)hemiInput.value=existing.hemisphere;
  let file:File|undefined,text='',table:ReturnType<typeof parseCSV>|undefined,result:ReprojectResult|undefined,busy=false,serial=0;
  const fail=(e:unknown)=>{error.textContent=e instanceof Error?e.message:String(e);error.hidden=false;save.disabled=true;result=undefined;error.scrollIntoView({block:'nearest'});};
  const zone=()=>Number(zoneInput.value),hemisphere=()=>hemiInput.value as 'north'|'south';
  const showCRS=()=>{try{const {crs,centralMeridian}=utmDefinition(zone(),hemisphere());crsLine.textContent=`Source CRS ${crs} · central meridian ${centralMeridian}° · metres · easting/northing. Target OGC:CRS84 degrees, longitude/latitude.`;}catch(e){crsLine.textContent='';fail(e);}};
  const columnSelect=(id:string,label:string,headers:string[],guess:RegExp,optional=false)=>{
    const options=(optional?'<option value="-1">Not supplied</option>':'')+headers.map((h,i)=>`<option value="${i}">${h.replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]!)}</option>`).join('');
    const index=headers.findIndex(h=>guess.test(h));
    return `<label class="field-label" for="${id}">${label}</label><select id="${id}">${options}</select>`+`<span data-default="${id}" hidden>${index}</span>`;
  };
  function convert(){
    error.hidden=true;result=undefined;save.disabled=true;if(!file)return;
    try{
      let collection:PointCollection;
      if(table){
        const pick=(id:string)=>Number(dialog.querySelector<HTMLSelectElement>('#'+id)!.value);
        collection=csvPoints(table,{longitude:pick('reproject-easting'),latitude:pick('reproject-northing'),id:pick('reproject-id'),name:pick('reproject-name')});
      }else collection=projectedGeoJSONPoints(JSON.parse(text));
      const converted=reprojectToCRS84(collection,zone(),hemisphere());
      const sample=converted.collection.features.filter(f=>f.geometry).slice(0,3).map(f=>({id:f.id,name:f.properties.name,longitude:f.geometry!.coordinates[0],latitude:f.geometry!.coordinates[1]}));
      result={data:converted.collection,provenance:converted.provenance,source:{filename:file.name,bytes:file.size,sha256:'',format:table?'csv':'geojson',records:converted.collection.features.length},zone:zone(),hemisphere:hemisphere()};
      preview.textContent=JSON.stringify({sourceFile:file.name,...converted.provenance,firstConvertedRecords:sample},null,2);
      status.textContent=`Converted ${converted.provenance.transformed} of ${converted.collection.features.length} records; ${converted.provenance.withoutCoordinates} without coordinates. Maximum round-trip error ${converted.provenance.maxRoundTripM} m.`;
      save.disabled=false;
    }catch(e){status.textContent='These coordinates have not been converted.';fail(e);}
  }
  showCRS();
  for(const control of [zoneInput,hemiInput])control.onchange=()=>{showCRS();convert();};
  fileInput.onchange=async()=>{
    const request=++serial;file=fileInput.files?.[0];table=undefined;columns.hidden=true;columns.innerHTML='<legend>CSV columns</legend>';result=undefined;save.disabled=true;error.hidden=true;preview.textContent='';
    if(!file){status.textContent='';return;}
    if(file.size>FILE_BYTES){status.textContent='';fail(new Error('Select a file of at most 5 MB.'));return;}
    status.textContent='Reading the file…';
    try{
      text=await file.text();if(request!==serial)return;
      if(/\.csv$/i.test(file.name)){
        table=parseCSV(text);
        columns.innerHTML='<legend>CSV columns</legend>'
          +columnSelect('reproject-easting','Easting column (metres, X)',table.headers,/^(easting|east|x|utm_?e)$/i)
          +columnSelect('reproject-northing','Northing column (metres, Y)',table.headers,/^(northing|north|y|utm_?n)$/i)
          +columnSelect('reproject-id','Identifier column',table.headers,/^(id|identifier|code)$/i,true)
          +columnSelect('reproject-name','Name column',table.headers,/^(name|label|title)$/i,true);
        columns.hidden=false;
        for(const [id,guess] of [['reproject-easting',/^(easting|east|x|utm_?e)$/i],['reproject-northing',/^(northing|north|y|utm_?n)$/i],['reproject-id',/^(id|identifier|code)$/i],['reproject-name',/^(name|label|title)$/i]] as const){
          const select=dialog.querySelector<HTMLSelectElement>('#'+id)!,index=table.headers.findIndex(h=>guess.test(h.trim()));
          select.value=String(index>=0?index:select.options[0].value==='-1'?-1:id==='reproject-northing'&&table.headers.length>1?1:0);
          select.onchange=convert;
        }
      }
      convert();
    }catch(e){if(request===serial){status.textContent='The file could not be read.';fail(e);}}
  };
  cancel.onclick=()=>dialog.close();dialog.oncancel=e=>{if(busy)e.preventDefault();};dialog.onclose=()=>{serial++;file=undefined;result=undefined;dialog.remove();};
  save.onclick=async()=>{
    if(!result||!file||busy)return;busy=true;save.disabled=true;cancel.disabled=true;fileInput.disabled=true;error.hidden=true;
    try{
      const saved:ReprojectResult={...result,source:{...result.source,sha256:await contentHash(new TextEncoder().encode(text) as Uint8Array<ArrayBuffer>)}};
      if(!onSave(saved))throw new Error('The reprojected points could not be saved. Your previous project is unchanged; retry Save.');
      dialog.close();
    }catch(e){fail(e);status.textContent='These points have not been added to the project.';}finally{busy=false;save.disabled=!result;cancel.disabled=false;fileInput.disabled=false;}
  };
  dialog.showModal();
}
