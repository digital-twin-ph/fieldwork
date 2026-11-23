import type {WorkflowNode,Boundary,ObservationParams,PointCollection,PointFeature,FormField,SourceInfo,AttributeType,PinPhoto} from './types.js';
import type {CSVTable} from './input-data.js';
import type {Database} from 'sql.js';
import {element,optionalElement} from './dom.js';
import {errorMessage,required} from './guards.js';
import {openConfigDialog} from './config-dialog.js';
import {photoFromFile,metresApart,MAX_PIN_PHOTOS} from './pin-photos.js';
import {readGpx,readKml,readKmz,gpsSentence} from './gps-import.js';
import type {NoteImagePayload} from './note-image.js';
const attributeType=(value:string):AttributeType=>{if(!ATTRIBUTE_TYPES.includes(value))throw new Error('Choose a supported attribute type.');return value as AttributeType;};
import L from 'leaflet';
import {readXlsx} from './xlsx.js';
import {parseCSV,readTextFile,COLUMN_ALIASES,csvPoints,syntheticPoints,loadSQLite,geoPackageLayers,geoPackagePoints,geoJSONDeclaredCRS,type CSVCoordinateReport} from './input-data.js';
import {coordinateSentence,readCoordinate} from './coordinates.js';
import {rasterBasemap,PIN_BASEMAPS,tileFailure} from './catchment-map.js';
import {BASEMAP_LABELS,type BasemapChoice} from './basemaps.js';
import {reprojectToCRS84,utmDefinition} from './reproject.js';
import {utmFromEPSGCode} from './metric-crs.js';
import {MAX_POINT_RECORDS} from './point-layers.js';
import {MAX_TABLE_FILE_BYTES as MAX_POINT_FILE_BYTES} from './data-table.js';
import {geometryBounds} from './study-area.js';
import {ATTRIBUTE_TYPES,PIN_RESERVED,validAttributeKey,parseAttributeValue,parseValueSet,validateAttributeSchema} from './attribute-schema.js';
const TYPE_LABEL:Record<AttributeType,string>={text:'Text',number:'Number',integer:'Whole number',boolean:'Yes / no',date:'Date',datetime:'Date and time'};
const INPUT_TYPE:Record<AttributeType,string>={text:'text',number:'number',integer:'number',boolean:'text',date:'date',datetime:'datetime-local'};
const TYPE_OPTIONS=(Object.keys(TYPE_LABEL) as AttributeType[]).map(t=>`<option value="${t}">${TYPE_LABEL[t]}</option>`).join('');
/** MARKERS BY CATEGORY (experiment 09, 2026-11-22): each category its own colour, in the order categories first appear, each
 *  with white text at 4.5:1 or better; a pin with no category is grey. Beyond eight, the rest share the grey and the legend
 *  says so. */
const CATEGORY_COLOURS=['#1b5e20','#0d47a1','#8e2430','#5b2a86','#7a4b00','#00606b','#a0306c','#3d4a5c'];
const NO_CATEGORY='#5f6368';
const PINS_PER_PAGE=25;
/** The gate by which table values become GIS coordinates, read off the practitioner's own column
 *  choices. The explicit mapping is longitude to x and latitude to y, written out here rather than
 *  assembled from the alias keys and cast. The previous form was
 *  `Object.fromEntries(...) as unknown as CSVMapping`, and when CSVMapping gained `x`, `y` and a
 *  required `units`, that cast kept it typechecking while producing a mapping with none of them --
 *  so the ordinary CSV import would have failed at run time with the compiler satisfied. */
const csvColumn=(key:string):number=>Number((document.querySelector('#csv-'+key) as HTMLSelectElement).value);
const esc=(s:unknown)=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const bodyMarkup=`<div class="input-editor-body"><label class="field-label" for="input-mode">Input method</label><select id="input-mode"><option value="synthetic">Generate synthetic points</option><option value="csv">Import CSV</option><option value="xlsx">Import Excel</option><option value="gpkg">Import GeoPackage</option><option value="geojson">Import GeoJSON</option><option value="gpx">Import GPX from a GPS device</option><option value="kml">Import KML or KMZ</option><option value="pins">Place pushpins on map</option></select><p id="input-replace-note" class="input-replace-note" role="status" hidden></p>
<div id="input-synthetic"><label class="field-label" for="synthetic-boundary">Study area for generation</label><select id="synthetic-boundary"></select><div class="input-inline"><label>Inside points<input id="synthetic-inside" type="number" value="20" min="1" max="250000"></label><label>Outside points for testing<input id="synthetic-outside" type="number" value="2" min="0" max="249999"></label><label>Seed<input id="synthetic-seed" type="number" value="42" min="0" max="4294967295"></label></div><button id="generate-input" class="button small">Generate points</button><p class="muted">Synthetic demonstration records.</p></div>
<div id="input-file-panel" hidden><label class="field-label" for="input-file">Local file · 40 MB maximum</label><input id="input-file" type="file"><p id="gps-file-note" role="status" hidden></p><div id="csv-mapping" hidden><div class="input-inline"><label id="csv-x-label">Longitude<select id="csv-longitude"></select></label><label id="csv-y-label">Latitude<select id="csv-latitude"></select></label><label>Record ID<select id="csv-id"></select></label><label>Label<select id="csv-name"></select></label></div><div class="input-inline"><label>Coordinates<select id="csv-frame"><option value="degree">Longitude / latitude, degrees</option><option value="metre">UTM easting / northing, metres</option></select></label><label id="csv-zone-label" hidden>UTM zone<input id="csv-zone" type="number" min="1" max="60" step="1" value="35"></label><label id="csv-hemisphere-label" hidden>Hemisphere<select id="csv-hemisphere"><option value="south">South</option><option value="north">North</option></select></label></div><p id="csv-frame-note" class="muted" hidden></p><button id="csv-preview" class="button small">Preview mapped records</button></div><div id="gpkg-mapping" hidden><label for="gpkg-layer">Point layer</label><select id="gpkg-layer"></select><p id="gpkg-crs-note" class="muted" hidden></p><button id="gpkg-preview" class="button small">Preview layer</button></div><p class="muted">Up to 250,000 points. Scalar attributes are retained. CSV reads longitude/latitude in degrees, or UTM easting/northing in metres on the WGS84 datum, converted to CRS84 on import. GeoPackage reads 2D POINT layers in EPSG:4326 or a WGS84 UTM zone, using the CRS the file itself declares.</p></div>
<div id="input-pins" hidden><p>Click the map to add a pin. Select or drag a pin to edit it.</p><p class="pin-field-help" id="pin-privacy">Pins on homes can identify the people who live there. Back up the project encrypted, and mask the points with Donut geomasking before sharing a map of them.</p><div class="pin-locate"><button id="pin-locate" class="button small" type="button">Add a pin at my location</button><button id="pin-locate-move" class="button small" type="button" disabled>Move this pin to my location</button><p id="pin-locate-status" role="status"></p></div><div class="pin-map-tools"><label class="pin-basemap">Basemap<select id="pins-basemap">${PIN_BASEMAPS.map(b=>`<option value="${b}">${esc(BASEMAP_LABELS[b])}</option>`).join('')}</select></label><form id="pin-place-form" class="pin-place"><label>Find a place<input id="pin-place" maxlength="200" autocomplete="off" placeholder="A town, district or landmark"></label><button id="pin-place-find" class="button small" type="submit">Find</button></form></div><p id="pin-place-status" role="status"></p><ul id="pin-place-results" class="pin-place-results"></ul><label class="field-label" for="pin-record">Select a record to edit, including missing locations</label><select id="pin-record"></select><div class="pin-record-actions"><button id="pin-undo" class="button small" type="button" disabled>Undo</button><button id="pin-delete" class="button danger" disabled>Delete pin</button><label><input id="pin-use-uuid" type="checkbox"> Generate UUIDs for new pins</label></div><p class="muted">Existing record IDs stay unchanged. Delete pin removes the chosen record from this draft; Apply keeps the change.</p><div class="pin-layout"><div><div id="pin-map"></div><button id="pins-fit" class="button small">Fit pins and study area</button><span id="pins-map-status" class="muted"></span><p id="pin-legend" class="pin-legend"></p><div id="pin-areas" class="pin-areas" hidden></div></div><div id="pin-form"></div></div><div id="pin-table" class="pin-table"></div><details><summary>Add a form field</summary><p class="pin-field-help">The form every pin shows, in this order:</p><ol id="pin-field-order" class="pin-field-order"></ol><div class="input-inline"><label>Field key<input id="pin-field-key" maxlength="60" placeholder="household_size"></label><label>Label<input id="pin-field-label" maxlength="100" placeholder="Household size"></label><label>Type<select id="pin-field-type">${TYPE_OPTIONS}</select></label><label>Default value<input id="pin-field-default" maxlength="1000"></label><label>Allowed values (optional, one per line)<textarea id="pin-field-values" maxlength="10000" rows="3"></textarea></label><label class="pin-required"><input id="pin-field-required" type="checkbox"> Required on every pin</label></div><button id="pin-add-field" class="button small">Add field</button></details></div>
<p id="input-summary" class="notice" role="status"></p><details><summary>Preview first two records</summary><pre id="input-preview"></pre></details></div>`;
/** POINT DATA'S EDITOR, ON THE STANDARD DIALOG (experiment 186; experiment 09's open item 11, 2026-11-22): its heading,
 *  Cancel and Apply, and what Escape and × do, are the shared dialog's. The body is built once and keeps its own map. */
export function openInputDataEditor(node:WorkflowNode<'point_input'>,areas:{id:string;label:string;geometry:Boundary}[],validateData:(data:unknown)=>PointCollection,onApply:(params:ObservationParams)=>boolean|void,
  photoStore:{read:(sha:string)=>NoteImagePayload|undefined;keep:(sha:string,payload:NoteImagePayload)=>Promise<boolean>}={read:()=>undefined,keep:async()=>false}){
  let applyNow:()=>Promise<boolean>=async()=>false,release:()=>void=()=>{};
  openConfigDialog<{params:ObservationParams;touched:boolean}>({id:'input-dialog',widget:'Point data',step:node.params.label||'Point data',bodyOnce:true,
    draft:{params:node.params,touched:false},sections:()=>({settings:bodyMarkup}),
    wire:(root,draft)=>editor(root.closest('dialog') as HTMLDialogElement,draft),
    apply:()=>{},applyAsync:async()=>applyNow(),beforeRedraw:()=>release()},esc);
  function editor(dialog:HTMLDialogElement,draft:{params:ObservationParams;touched:boolean}){
  const $=<S extends string>(s:S)=>element(s,dialog);
  const applyButton=()=>dialog.querySelector<HTMLButtonElement>('#config-apply')!;
  let data=structuredClone(node.params.data),fields:FormField[]=structuredClone(node.params.fields||[{key:'category',label:'Category',type:'text'},{key:'notes',label:'Notes',type:'text'}]),source:SourceInfo=structuredClone(node.params.sourceInfo||{format:'manual'}),csv:CSVTable|null=null,db:Database|null=null,map:L.Map|null=null,markers:L.LayerGroup|null=null,tiles:L.TileLayer|null=null,selected:string|null=null,serial=0,requestId=0,closed=false;
  let attributeRules=structuredClone(node.params.attributeRules||[]),tablePage=0;
  let photos:Record<string,PinPhoto[]>=structuredClone(node.params.pinPhotos??{});const pendingPhotos=new Map<string,NoteImagePayload>();
  const photoData=(sha:string)=>pendingPhotos.get(sha)??photoStore.read(sha);
  /** UNDO WITHIN THE DRAFT (experiment 09, 2026-11-22): the last 30 changes, each the whole draft as it was; off above
   *  20,000 records, where a copy per change would cost more than it is worth, and the button says so. */
  const undoStack:string[]=[];const areaLayers=new Map<string,L.GeoJSON>(),shownAreas=new Set(areas.map(a=>a.id));const UNDO_DEPTH=30,UNDO_LIMIT=20_000;
  $('#pin-use-uuid').checked=node.params.pinIdStrategy==='uuid';
  /** THE DRAFT KEPT CURRENT, since the dialog compares only the draft with what the step holds. */
  const markDirty=()=>{draft.touched=true;draft.params={...draft.params,data,fields,attributeRules,sourceInfo:source,pinPhotos:photos};};
  dialog.oninput=e=>{if(e.target instanceof Element&&e.target.matches('input,select,textarea')&&!['input-mode','pin-record','pins-basemap','pin-place','synthetic-boundary'].includes(e.target.id))markDirty();};
  for(const id of ['key','label','default','values'])($('#pin-field-'+id) as HTMLInputElement).value='';$('#pin-field-type').value='text';($('#pin-field-required') as HTMLInputElement).checked=false;$('#pin-locate-status').textContent='';
  const checkDraft=(next:unknown,nextFields=fields,nextRules=attributeRules)=>{const normalized=validateData(next);validateAttributeSchema(normalized,nextFields,nextRules);return normalized;};
  const error=(e:unknown)=>{const message=e?errorMessage(e):'',slot=dialog.querySelector<HTMLElement>('.config-message-slot');if(!slot)return;
    slot.innerHTML=message?`<div id="input-error" class="config-message config-message-refusal" role="alert"><p id="input-error-message">${esc(message)}</p></div>`:'';};
  const preview=()=>{replaceNote($('#input-mode').value);drawFieldOrder();const lacking=missingRequired();$('#input-summary').textContent=`${data.features.length} draft point records · ${data.features.filter(f=>!f.geometry).length} missing locations`+(lacking.length?` · ${lacking.length} ${lacking.length===1?'pin lacks':'pins lack'} a required value`:'');drawTable();$('#input-preview').textContent=JSON.stringify(data.features.slice(0,2),null,2);applyButton().disabled=false;};
  const accept=(next:unknown,info:SourceInfo)=>{const checked=checkDraft(next);remember();data=checked;source=info;selected=null;markDirty();error('');preview();};
  $('#synthetic-boundary').innerHTML=areas.map(a=>`<option value="${esc(a.id)}">${esc(a.label)}</option>`).join('');
  for(const key of ['inside','outside','seed'] as const)($('#synthetic-'+key) as HTMLInputElement).value=String(source[key]??{inside:20,outside:2,seed:42}[key]);
  $('#input-file').value='';$('#csv-mapping').hidden=true;$('#gpkg-mapping').hidden=true;$('#input-mode').value=['synthetic','csv','gpkg','geojson','gpx','kml','pins'].includes(source.format)?source.format:'synthetic';
  /** THE COLUMNS A FILE HOLDS, offered for whichever kind it is (2026-11-23): a CSV and an Excel sheet reach this the
   *  same way, and the names a longitude or a latitude goes by are the one list `input-data.ts` keeps. */
  const offerColumns=()=>{
    if(!csv)return;
    const aliases=COLUMN_ALIASES as unknown as Record<string,string[]>;
    for(const key of Object.keys(aliases)){
      const select=$('#csv-'+key) as HTMLSelectElement;
      select.innerHTML='<option value="-1">'+(['id','name'].includes(key)?'Generate automatically':'Select column')+'</option>'
        +csv.headers.map((h,i)=>`<option value="${i}">${esc(h)}</option>`).join('');
      select.value=String(csv.headers.findIndex(h=>aliases[key]!.includes(h.toLowerCase())));
      select.onchange=()=>applyButton().disabled=true;
    }
    $('#csv-mapping').hidden=false;
  };
  /** THE COLUMN CONTROLS AND THE PREVIEW, wired once for whichever kind of file was read (2026-11-23): a CSV and an
   *  Excel sheet are the same table by the time they reach here, and the preview was reachable only from the CSV path. */
  const setUpColumns=(file:File)=>{
    offerColumns();
      // A CSV of UTM metres read through the degree path produced [500000, 7800000] as a longitude
      // and latitude with no error: every point then read as Outside the study area, which is a
      // finding about geography rather than a fault, and haversine on metres-read-as-degrees
      // returned a finite nonsense distance. `reproject` existed to avoid that and was a second
      // widget plus a second file dialog. The frame is declared here instead, beside the columns
      // it describes, and the conversion happens before the points leave this dialog.
      const frameSelect=$('#csv-frame') as HTMLSelectElement;
      const projected=()=>frameSelect.value==='metre';
      const frame=()=>{
        const metres=projected();
        $('#csv-x-label').firstChild!.textContent=metres?'Easting':'Longitude';
        $('#csv-y-label').firstChild!.textContent=metres?'Northing':'Latitude';
        ($('#csv-zone-label') as HTMLElement).hidden=!metres;
        ($('#csv-hemisphere-label') as HTMLElement).hidden=!metres;
        const note=$('#csv-frame-note') as HTMLElement;note.hidden=!metres;
        if(metres){
          try{const {crs,centralMeridian}=utmDefinition(utmZone(),utmHemisphere());
            note.textContent=`Source ${crs} · central meridian ${centralMeridian}° · converted to CRS84 on import. Only WGS84 UTM zones are read; a file on another datum needs a datum shift this prototype does not implement.`;
          }catch(e){note.textContent=e instanceof Error?e.message:String(e);}
        }
        applyButton().disabled=true;
      };
      const utmZone=()=>Number(($('#csv-zone') as HTMLInputElement).value);
      const utmHemisphere=()=>($('#csv-hemisphere') as HTMLSelectElement).value as 'north'|'south';
      frameSelect.onchange=()=>{frame();$('#csv-preview').click();};
      ($('#csv-zone') as HTMLInputElement).onchange=()=>{frame();$('#csv-preview').click();};
      ($('#csv-hemisphere') as HTMLSelectElement).onchange=()=>{frame();$('#csv-preview').click();};
      frame();
      $('#csv-preview').onclick=()=>{try{
        const mapping={x:csvColumn('longitude'),y:csvColumn('latitude'),id:csvColumn('id'),name:csvColumn('name'),units:projected()?'metre' as const:'degree' as const};
        const report:CSVCoordinateReport={x:{dms:0,noHemisphere:0},y:{dms:0,noHemisphere:0},unread:[]};
        const read=csvPoints(required(csv),mapping,report);
        // WHAT THE COORDINATES WERE READ AS, said beside the columns (2026-11-18): degrees, minutes and seconds converted,
        // any with no hemisphere, and any record that could not be placed and why.
        {let said=dialog.querySelector<HTMLElement>('#csv-coordinates-note');
         if(!said){($('#csv-frame-note') as HTMLElement).insertAdjacentHTML('afterend','<p id="csv-coordinates-note" role="status"></p>');said=dialog.querySelector<HTMLElement>('#csv-coordinates-note');}
         const headers=required(csv).headers;
         const text=(projected()?'':coordinateSentence(report,headers[mapping.x]??'',headers[mapping.y]??'').trim())
           +(report.unread.length?` ${report.unread.length.toLocaleString('en-US')} ${report.unread.length===1?'record is':'records are'} not placed: record ${report.unread[0]!.record}, ${report.unread[0]!.reason}${report.unread.length>1?', and others':''}.`:'');
         said!.textContent=text.trim();said!.hidden=!text.trim();}
        if(!projected()){accept(read,{...metadata(file),crs:'CRS84'});return;}
        const converted=reprojectToCRS84(read,utmZone(),utmHemisphere());
        accept(converted.collection,{...metadata(file),crs:'CRS84',sourceCRS:converted.provenance.sourceCRS,reprojection:converted.provenance});
      }catch(e){applyButton().disabled=true;error(e);}};$('#csv-preview').click();
  };
  const metadata=(file:File)=>({format:$('#input-mode').value,filename:file.name,bytes:file.size,importedAt:new Date().toISOString()});
  function mode(){const kind=$('#input-mode').value;replaceNote(kind);$('#input-synthetic').hidden=kind!=='synthetic';$('#input-file-panel').hidden=!['csv','xlsx','gpkg','geojson','gpx','kml'].includes(kind);$('#input-pins').hidden=kind!=='pins';$('#input-file').accept=({csv:'.csv',xlsx:'.xlsx',gpkg:'.gpkg',geojson:'.geojson,.json',gpx:'.gpx',kml:'.kml,.kmz'} as Record<string,string>)[kind]||'';($('#gps-file-note') as HTMLElement).hidden=true;error('');if(kind==='pins')setTimeout(()=>{if(!closed){ensureMap();map!.invalidateSize();fit();}},0);}
  let activeMode=$('#input-mode').value;
  $('#input-mode').onchange=()=>{if(activeMode==='pins'&&!savePin()){$('#input-mode').value=activeMode;return;}activeMode=$('#input-mode').value;requestId++;mode();if(activeMode==='pins')preview();};
  $('#generate-input').onclick=()=>{try{const area=areas.find(a=>a.id===$('#synthetic-boundary').value);if(!area)throw new Error('Define a study area before generating sample points.');const options=Object.fromEntries(['inside','outside','seed'].map(k=>[k,Number(($('#synthetic-'+k) as HTMLInputElement).value)]));accept(syntheticPoints(area.geometry,options),{format:'synthetic',areaNodeId:area.id,boundarySnapshot:structuredClone(area.geometry),...options,method:'Seeded uniform rejection sampling in longitude/latitude',generatedAt:new Date().toISOString()});}catch(e){error(e);}};
  $('#input-file').onchange=async()=>{const file=$('#input-file').files?.[0];if(!file)return;const request=++requestId,kind=$('#input-mode').value;applyButton().disabled=true;$('#csv-mapping').hidden=true;$('#gpkg-mapping').hidden=true;error('');try{if(file.size>MAX_POINT_FILE_BYTES)throw new Error(`This file is ${(file.size/1e6).toFixed(1)} MB; Point data reads files up to ${MAX_POINT_FILE_BYTES/1e6} MB.`);db?.close();db=null;
    if(kind==='gpx'||kind==='kml'){
      const bytes=new Uint8Array(await file.arrayBuffer());if(closed||request!==requestId)return;
      const read=kind==='gpx'?readGpx(new TextDecoder().decode(bytes)):file.name.toLowerCase().endsWith('.kmz')?readKmz(bytes):readKml(new TextDecoder().decode(bytes));
      const note=$('#gps-file-note') as HTMLElement;note.textContent=gpsSentence(read,file.name);note.hidden=false;
      if(!read.collection.features.length)throw new Error(`${file.name} holds no ${kind==='gpx'?'waypoints':'point placemarks'} to import.`);
      accept(read.collection,{...metadata(file),crs:'CRS84'});
    }
    else if(kind==='gpkg'){const bytes=new Uint8Array(await file.arrayBuffer()),SQL=await loadSQLite();if(closed||request!==requestId)return;db=new SQL.Database(bytes);const layers=geoPackageLayers(db);$('#gpkg-layer').innerHTML=layers.map(l=>`<option value="${esc(l.table_name)}">${esc(l.table_name)} · EPSG:${l.epsg}</option>`).join('');$('#gpkg-mapping').hidden=false;
      // The layer names the CRS it is in, so the dialog states it rather than asking. A UTM layer
      // is converted on import and the note says so; before 2026-10-13 it was refused outright.
      const gpkgNote=()=>{const layer=layers.find(l=>l.table_name===$('#gpkg-layer').value);const note=$('#gpkg-crs-note') as HTMLElement;
        if(!layer){note.hidden=true;return;}note.hidden=false;
        const utm=utmFromEPSGCode(layer.epsg);
        note.textContent=utm?`Layer CRS EPSG:${layer.epsg} · UTM zone ${utm.zone}${utm.hemisphere==='north'?'N':'S'}, converted to CRS84 on import.`:`Layer CRS EPSG:${layer.epsg} · read as it stands.`;};
      gpkgNote();
      $('#gpkg-layer').onchange=()=>{applyButton().disabled=true;gpkgNote();};
      $('#gpkg-preview').onclick=()=>{try{const layer=layers.find(l=>l.table_name===$('#gpkg-layer').value);
        accept(geoPackagePoints(required(db),$('#gpkg-layer').value),{...metadata(file),layer:$('#gpkg-layer').value,crs:'CRS84',sourceCRS:`EPSG:${layer?.epsg??4326}`});}catch(e){applyButton().disabled=true;error(e);}};$('#gpkg-preview').click();}
    else if(kind==='xlsx'){
      // AN EXCEL SHEET READ AS A CSV IS (the practitioner, 2026-11-23: *"Point data import should also include Excel"*):
      // the first sheet carrying a header row, its cells as written, then the same column mapping a CSV is given.
      const sheets=readXlsx(new Uint8Array(await file.arrayBuffer())).filter(s=>s.headers.length);
      if(closed||request!==requestId)return;
      if(!sheets.length)throw new Error('This workbook has no sheet with a header row.');
      csv={headers:sheets[0]!.headers.map(h=>h.trim()),rows:sheets[0]!.rows};
      setUpColumns(file);
    }
    else {const {text}=await readTextFile(file);if(closed||request!==requestId)return;if(kind==='geojson'){const parsed=JSON.parse(text);accept(parsed,{...metadata(file),crs:geoJSONDeclaredCRS(parsed)});}else{csv=parseCSV(text);setUpColumns(file);}}
  }catch(e){error(e);}};
  $('#gpkg-layer').onchange=()=>applyButton().disabled=true;
  /** WHAT A GENERATE OR AN IMPORT WOULD REPLACE, said before it does (experiment 09, 2026-11-22): the records in this draft
   *  go, and Cancel keeps them. */
  function replaceNote(kind:string){
    const note=$('#input-replace-note') as HTMLElement,n=data.features.length;
    note.hidden=kind==='pins'||!n;
    if(n)note.textContent=`This draft holds ${n.toLocaleString('en')} ${n===1?'record':'records'}${source.format==='pins'?', placed as pins':''}. `
      +`${kind==='synthetic'?'Generating':'Importing'} replaces ${n===1?'it':'them'}; Cancel keeps ${n===1?'it':'them'}.`;
  }
  function remember(){
    const button=$('#pin-undo') as HTMLButtonElement;
    if(data.features.length>UNDO_LIMIT){undoStack.length=0;button.disabled=true;button.title=`Undo is off above ${UNDO_LIMIT.toLocaleString('en')} records.`;return;}
    undoStack.push(JSON.stringify({data,fields,attributeRules,source,selected,photos}));if(undoStack.length>UNDO_DEPTH)undoStack.shift();
    button.disabled=false;button.title='';
  }
  $('#pin-undo').onclick=()=>{const last=undoStack.pop();if(!last)return;
    const was=JSON.parse(last) as {data:typeof data;fields:FormField[];attributeRules:typeof attributeRules;source:SourceInfo;selected:string|null;photos:typeof photos};
    photos=was.photos;data=was.data;fields=was.fields;attributeRules=was.attributeRules;source=was.source;selected=was.selected;
    ($('#pin-undo') as HTMLButtonElement).disabled=!undoStack.length;markDirty();error('');drawPins();renderPin();preview();};
  function fit(){if(!map)return;const points=data.features.filter(f=>f.geometry).map((f):L.LatLngTuple=>[f.geometry!.coordinates[1],f.geometry!.coordinates[0]]);for(const a of areas.filter(x=>shownAreas.has(x.id))){const b=geometryBounds(a.geometry);points.push([b[1],b[0]],[b[3],b[2]]);}if(points.length)map.fitBounds(points,{padding:[25,25],maxZoom:16});}
  function ensureMap(){if(map){drawPins();renderPin();return;}map=L.map($('#pin-map'),{center:[0,20],zoom:2,minZoom:2,maxZoom:19,zoomAnimation:false,fadeAnimation:false,markerZoomAnimation:false,doubleClickZoom:false});// THE BASEMAP CHOSEN, among the raster ones a map can draw (experiment 09, 2026-11-22): satellite imagery on the person's
    // own Esri key among them, for seeing the houses a pin is placed on.
    const basemap=$('#pins-basemap') as HTMLSelectElement;basemap.value=navigator.onLine?'osm':'none';
    basemap.onchange=()=>{if(tiles)map!.removeLayer(tiles);const drawn=rasterBasemap(basemap.value as BasemapChoice);tiles=drawn.layer;
      if(tiles){const layer=tiles;let asked=false;layer.addTo(map!);layer.bringToBack();layer.on('tileerror',event=>{if(!asked)$('#pins-map-status').textContent='Some tiles could not be fetched · pin editing stays on this device';
        const src=(event as unknown as {tile?:HTMLImageElement}).tile?.src;if(drawn.provider&&src&&!asked){asked=true;void tileFailure(src,drawn.provider).then(why=>{if(tiles===layer)$('#pins-map-status').textContent=`Some tiles could not be fetched: ${why}. Pin editing stays on this device.`;});}});}
      $('#pins-map-status').textContent=drawn.said;};
    basemap.dispatchEvent(new Event('change'));// EACH STUDY AREA ITS OWN OUTLINE, and a checkbox to show it or not (2026-11-22): which are shown is what Fit fits.
    for(const a of areas)areaLayers.set(a.id,L.geoJSON(a.geometry,{interactive:false,style:{color:'#176b59',weight:2,fillOpacity:.08}}).addTo(map));
    const box=$('#pin-areas') as HTMLElement;box.hidden=areas.length<2;
    box.innerHTML=areas.length<2?'':'<span class="pin-legend-title">Study areas shown</span>'+areas.map(a=>`<label><input type="checkbox" data-pin-area="${esc(a.id)}" checked> ${esc(a.label)}</label>`).join('');
    box.querySelectorAll<HTMLInputElement>('[data-pin-area]').forEach(c=>c.onchange=()=>{const layer=areaLayers.get(c.dataset.pinArea!);if(!layer)return;
      if(c.checked){shownAreas.add(c.dataset.pinArea!);layer.addTo(map!);}else{shownAreas.delete(c.dataset.pinArea!);map!.removeLayer(layer);}fit();});markers=L.layerGroup().addTo(map);map.on('click',e=>{if(data.features.length>=MAX_POINT_RECORDS){error(`At most ${MAX_POINT_RECORDS.toLocaleString('en')} pins.`);return;}if(!savePin())return;let id:string;do{serial++;id=$('#pin-use-uuid').checked?crypto.randomUUID():`pin-${serial}`;}while(data.features.some(f=>f.id===id));const properties:PointFeature['properties']={name:`Pin ${serial}`,capturedAt:new Date().toISOString(),positionSource:'map'};for(const f of fields)if(f.defaultValue!==undefined)properties[f.key]=f.defaultValue;const next:PointFeature={type:'Feature',id,properties,geometry:{type:'Point',coordinates:[e.latlng.lng,e.latlng.lat]}};try{validateData({type:'FeatureCollection',features:[next]});remember();data.features.push(next);selected=id;source={...source,format:'pins'};markDirty();drawPins();renderPin();preview();}catch(err){error(err);}});drawPins();renderPin();}
  function drawPins(){if(!markers)return;drawLegend();drawTable();$('#pin-record').innerHTML='<option value="">Add a pin or select a record</option>'+data.features.map(f=>`<option value="${esc(f.id)}" ${f.id===selected?'selected':''}>${esc(f.properties.name)}</option>`).join('');markers.clearLayers();for(const f of data.features){if(!f.geometry)continue;const label=document.createElement('span');label.textContent=f.properties.name;const look=categoryLook(f);const m=L.marker([f.geometry.coordinates[1],f.geometry.coordinates[0]],{draggable:true,icon:L.divIcon({className:'input-pin'+(f.id===selected?' selected':''),html:`<span style="background:${look.colour}" aria-hidden="true">${esc(look.letter)}</span>`,iconSize:[26,26],iconAnchor:[13,13]})}).bindTooltip(label).addTo(markers);m.on('click',()=>{if(!savePin())return;selected=f.id;renderPin();drawPins();});m.on('dragend',()=>{const p=m.getLatLng();try{const current=required(data.features.find(x=>x.id===f.id)),next=structuredClone(current);next.geometry={type:'Point',coordinates:[p.lng,p.lat]};validateData({type:'FeatureCollection',features:[next]});remember();current.geometry=next.geometry;placedBy(current,'map');markDirty();if(selected===f.id){$('#pin-longitude').value=String(p.lng);$('#pin-latitude').value=String(p.lat);}preview();}catch(e){error(e);drawPins();}});}}
  function renderPin(){const f=data.features.find(x=>x.id===selected);$('#pin-delete').disabled=!f;if(!f){$('#pin-form').innerHTML='<p>Select or add a pin.</p>';return;}
    ($('#pin-locate-move') as HTMLButtonElement).disabled=!f||!geolocationOffered();const inferred=Object.keys(f.properties).filter(k=>!PIN_RESERVED.includes(k)&&!fields.some(x=>x.key===k)).map((key):FormField=>({key,label:key,type:typeof f.properties[key]==='number'?'number':typeof f.properties[key]==='boolean'?'boolean':'text',...attributeRules.find(r=>r.key===key)})),all=[...fields,...inferred];
    $('#pin-form').innerHTML=`<label class="field-label" for="pin-id">Record ID</label><input id="pin-id" readonly value="${esc(f.id)}"><label class="field-label" for="pin-name">Pin label</label><input id="pin-name" maxlength="100" value="${esc(f.properties.name)}"><div class="input-inline"><label>Longitude<input id="pin-longitude" type="text" autocomplete="off" value="${f.geometry?.coordinates[0]??''}"></label><label>Latitude<input id="pin-latitude" type="text" autocomplete="off" value="${f.geometry?.coordinates[1]??''}"></label></div><p class="pin-field-help">Decimal degrees, such as -5.9333, or degrees, minutes and seconds, such as 5° 56\' 00" S.</p><p class="muted">Captured: ${esc(f.properties.capturedAt||'Not supplied')}</p><p id="pin-position">${esc(positionSaid(f))}</p>${all.map((field,i)=>{const value=Object.hasOwn(f.properties,field.key)?f.properties[field.key]??'':field.defaultValue??'';return `<label class="field-label" for="pin-attr-${i}">${esc(field.label)}${(field as FormField).required?' (required)':''}</label>${field.type==='boolean'?`<select id="pin-attr-${i}" data-pin-key="${esc(field.key)}" data-pin-type="boolean"><option value="">Not given</option><option value="true" ${value===true?'selected':''}>Yes</option><option value="false" ${value===false?'selected':''}>No</option></select>`:`<input id="pin-attr-${i}" data-pin-key="${esc(field.key)}" data-pin-type="${field.type}" type="${INPUT_TYPE[field.type]}" ${field.type==='number'?'step="any"':''} maxlength="1000" value="${esc(value)}">`}`;}).join('')}<button id="pin-save" class="button small">Update pin draft</button>`;
    for(const el of dialog.querySelectorAll<HTMLInputElement>('input[data-pin-type="text"]')){const value=f.properties[el.dataset.pinKey!]??fields.find(x=>x.key===el.dataset.pinKey!)?.defaultValue??'';if(el.dataset.pinKey==='notes'||String(value).includes('\n')){const text=document.createElement('textarea');text.id=el.id;text.dataset.pinKey=el.dataset.pinKey!;text.dataset.pinType='text';text.maxLength=1000;text.rows=2;text.value=String(value);el.replaceWith(text);}}
    for(const field of all){if(!field.allowedValues)continue;const old=[...dialog.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('[data-pin-key]')].find(el=>el.dataset.pinKey===field.key),select=document.createElement('select'),value=old!.value;select.id=old!.id;select.dataset.pinKey=field.key;select.dataset.pinType=field.type;select.innerHTML='<option value="">Not given</option>'+field.allowedValues.map(v=>`<option value="${esc(String(v))}">${esc(String(v))}</option>`).join('');select.value=value;old!.replaceWith(select);}
    for(const el of dialog.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('[data-pin-key]')){
      const key=el.dataset.pinKey!,shared=fields.some(x=>x.key===key),label=$(`label[for="${el.id}"]`),pair=document.createElement('div');pair.className='pin-attribute';
      label.before(pair);pair.append(label);pair.insertAdjacentHTML('beforeend',shared?(key==='category'?'<p class="pin-field-help">Optional label for this location, such as Clinic, Household or Water point. This does not classify the pin automatically or change its marker.</p>':key==='notes'?'<p class="pin-field-help">Optional free-text observations about this location.</p>':''):`<label class="field-label">Attribute name (key)<input data-pin-rename="${esc(key)}" aria-label="Key for ${esc(key)}" value="${esc(key)}" maxlength="100"></label><span class="muted">Value</span>`);pair.append(el);pair.insertAdjacentHTML('beforeend',`<small class="muted">Data type: ${esc(TYPE_LABEL[attributeType(el.dataset.pinType!)])}${all.find(d=>d.key===key)?.allowedValues?' · constrained value set':''}</small>`);
      if(!shared){const remove=document.createElement('button');remove.type='button';remove.className='text-button';remove.textContent='Remove pair';remove.dataset.removePair=key;remove.onclick=()=>{if(!savePin())return;const record=data.features.find(x=>x.id===selected);delete record!.properties[pair.querySelector<HTMLInputElement>('[data-pin-rename]')!.value.trim()];renderPin();preview();};pair.append(remove);}
    }
    drawPhotos(f);
    $('#pin-save').insertAdjacentHTML('beforebegin','<fieldset class="pin-new-pair"><legend>Add an attribute to this pin</legend><p class="pin-field-help">The attribute name describes what you record (for example, household_size). The value is your answer (for example, 5).</p><label class="field-label">Attribute name (key)<input id="pin-pair-key" maxlength="60" placeholder="household_size"></label><label class="field-label">Value type<select id="pin-pair-type">'+TYPE_OPTIONS+'</select></label><label class="field-label">Allowed values (optional, one per line)<textarea id="pin-pair-values" maxlength="10000" rows="3"></textarea></label><label class="field-label">Value<textarea id="pin-pair-value" maxlength="1000" rows="2"></textarea></label><button id="pin-add-pair" class="button small" type="button">Add pair</button><small>The value belongs to this pin. Type and allowed values apply to this key throughout this input. Use Add a form field below to show a field on every pin.</small></fieldset>');
    $('#pin-add-pair').onclick=()=>{if(!hasPendingPair()){error('Enter a key and value for the new pair.');return;}if(savePin()){renderPin();preview();}};
    $('#pin-pair-key').onchange=()=>{const rule=attributeRules.find(r=>r.key===$('#pin-pair-key').value.trim());if(rule){$('#pin-pair-type').value=rule.type;$('#pin-pair-values').value=(rule.allowedValues||[]).join('\n');}};
    $('#pin-save').onclick=()=>{if(savePin()){source={...source,format:'pins'};drawPins();renderPin();preview();}};
  }
  function hasPendingPair(){return !!optionalElement('#pin-pair-key',dialog)&&[$('#pin-pair-key').value.trim(),$('#pin-pair-value').value,$('#pin-pair-values').value.trim()].some(Boolean);}
  function clearPair(){for(const suffix of ['key','value','values'])($('#pin-pair-'+suffix) as HTMLInputElement|HTMLTextAreaElement).value='';$('#pin-pair-type').value='text';}
  function savePin(){const f=data.features.find(x=>x.id===selected);if(!f||!optionalElement('#pin-name',dialog))return true;try{
    const next=structuredClone(f),lon=$('#pin-longitude').value.trim(),lat=$('#pin-latitude').value.trim();next.properties.name=$('#pin-name').value.trim()||f.id;// DECIMAL DEGREES OR DEGREES, MINUTES AND SECONDS, read as a CSV's coordinates are (experiment 09, 2026-11-22).
    const typed=(text:string,axis:'x'|'y')=>{const read=readCoordinate(text,axis);if(read.value===null)throw new Error(`${axis==='x'?'Longitude':'Latitude'}: ${read.reason}.`);
      if(read.dms&&!read.hemisphereStated)$('#pin-locate-status').textContent=`${axis==='x'?'Longitude':'Latitude'} ${text.trim()} has no hemisphere, so it was read as ${axis==='x'?'east':'north'}.`;return read.value;};
    next.geometry=lon&&lat?{type:'Point',coordinates:[typed(lon,'x'),typed(lat,'y')]}:null;
    if(JSON.stringify(next.geometry?.coordinates??null)!==JSON.stringify(f.geometry?.coordinates??null))placedBy(next,next.geometry?'typed':null);
    const values=[...dialog.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('[data-pin-key]')];for(const el of values)delete next.properties[el.dataset.pinKey!];
    const nextRules=structuredClone(attributeRules);for(const el of values){if(!el.checkValidity())throw new Error('Correct the invalid pin attribute.');const key=el.closest('.pin-attribute')?.querySelector<HTMLInputElement>('[data-pin-rename]')?.value.trim()??el.dataset.pinKey!;if(key!==el.dataset.pinKey!&&!validAttributeKey(key))throw new Error('Use a key beginning with a letter; name and capture time are reserved.');if(Object.hasOwn(next.properties,key))throw new Error('Each key must be unique on this pin.');next.properties[key]=parseAttributeValue(el.value,attributeType(el.dataset.pinType!));if(key!==el.dataset.pinKey!){const rule=attributeRules.find(r=>r.key===el.dataset.pinKey!);if(rule&&!nextRules.some(r=>r.key===key))nextRules.push({...rule,key});}}
    const pending=hasPendingPair();if(pending){
      const key=$('#pin-pair-key').value.trim(),type=attributeType($('#pin-pair-type').value);
      const rejectKey=(message:string)=>{$('#pin-pair-key').setAttribute('aria-invalid','true');$('#pin-pair-key').focus();throw new Error(message);};
      if(!key)rejectKey('Enter an attribute name for the new value, or clear the new value and allowed values to save only your other edits.');
      if(['name','capturedAt','constructor','prototype'].includes(key))rejectKey(`"${key}" is reserved. ${key==='name'?'Edit Pin label above instead.':key==='capturedAt'?'Capture time is recorded automatically.':'Choose another attribute name.'} Clear the new attribute fields to save only your other edits.`);
      if(!validAttributeKey(key))rejectKey(`"${key}" is not a valid attribute name. Use 1-60 letters, numbers or underscores, starting with a letter (for example, household_size). Spaces are not allowed.`);
      if(Object.hasOwn(next.properties,key)||fields.some(x=>x.key===key))rejectKey(`"${key}" already exists on this pin. Edit its value above, then clear the new attribute fields before saving.`);
      const allowedValues=parseValueSet($('#pin-pair-values').value,type),definition={key,type,...(allowedValues?{allowedValues}:{})},existing=nextRules.find(r=>r.key===key);
      if(existing&&(existing.type!==type||JSON.stringify(existing.allowedValues)!==JSON.stringify(definition.allowedValues)))throw new Error('This key already has a definition. Use its existing type and allowed values.');
      next.properties[key]=parseAttributeValue($('#pin-pair-value').value,type);if(!existing)nextRules.push(definition);
    }
    const normalized=checkDraft({...data,features:data.features.map(record=>record.id===selected?next:record)},fields,nextRules);
    if(JSON.stringify(normalized)!==JSON.stringify(data)||JSON.stringify(nextRules)!==JSON.stringify(attributeRules)){remember();markDirty();source={...source,format:'pins'};}
    data=normalized;attributeRules=nextRules;if(pending)clearPair();error('');return true;
  }catch(e){error(e);return false;}}
  /** WHERE A POSITION CAME FROM (experiment 09, 2026-11-22). A pin placed by eye and a fix from the device are not the same
   *  claim: each pin says which it is, and a fix carries the accuracy the device stated. */
  function placedBy(f:PointFeature,how:'device'|'map'|'typed'|'photo'|null,fix?:GeolocationPosition){
    delete f.properties.positionAccuracyM;delete f.properties.positionFixedAt;
    if(!how){delete f.properties.positionSource;return;}
    f.properties.positionSource=how;
    if(fix){f.properties.positionAccuracyM=Math.round(fix.coords.accuracy*10)/10;
      // The fix's own time where it is a time: WebKit has been seen to give microseconds, which reads as the year 58,851.
      const at=Math.abs(fix.timestamp-Date.now())<86_400_000?fix.timestamp:Date.now();
      f.properties.positionFixedAt=new Date(at).toISOString();}
  }
  function positionSaid(f:PointFeature):string{
    if(!f.geometry)return 'Position: none yet.';
    const how=f.properties.positionSource;
    if(how==='device')return `Position: from this device, to within ${Number(f.properties.positionAccuracyM).toLocaleString('en')} m as the device stated, fixed ${String(f.properties.positionFixedAt??'').replace('T',' ').slice(0,16)} UTC.`;
    if(how==='map')return 'Position: placed on the map by eye.';
    if(how==='photo')return "Position: where its photo was taken, as the photo's location data said.";
    if(how==='typed')return 'Position: typed as longitude and latitude.';
    return 'Position: where it came from is not recorded.';
  }
  const geolocationOffered=()=>'geolocation' in navigator&&window.isSecureContext;
  /** USE MY LOCATION: one fix, asked for at the device's best accuracy, never watched. The browser asks the person first. */
  function locate(move:boolean){
    const status=$('#pin-locate-status');
    if(!geolocationOffered()){status.textContent='This browser cannot give a location on this page. Place the pin on the map or type its position.';return;}
    if(!move&&data.features.length>=MAX_POINT_RECORDS){error(`At most ${MAX_POINT_RECORDS.toLocaleString('en')} pins.`);return;}
    if(!savePin())return;
    status.textContent='Asking this device where it is…';
    navigator.geolocation.getCurrentPosition(fix=>{
      if(closed)return;
      const coordinates:[number,number]=[fix.coords.longitude,fix.coords.latitude];
      try{
        if(move){const f=required(data.features.find(x=>x.id===selected));const next=structuredClone(f);next.geometry={type:'Point',coordinates};validateData({type:'FeatureCollection',features:[next]});remember();f.geometry=next.geometry;placedBy(f,'device',fix);}
        else{let id:string;do{serial++;id=$('#pin-use-uuid').checked?crypto.randomUUID():`pin-${serial}`;}while(data.features.some(f=>f.id===id));
          const properties:PointFeature['properties']={name:`Pin ${serial}`,capturedAt:new Date().toISOString()};for(const f of fields)if(f.defaultValue!==undefined)properties[f.key]=f.defaultValue;
          const next:PointFeature={type:'Feature',id,properties,geometry:{type:'Point',coordinates}};placedBy(next,'device',fix);
          validateData({type:'FeatureCollection',features:[next]});remember();data.features.push(next);selected=id;}
        source={...source,format:'pins'};markDirty();drawPins();renderPin();preview();
        map?.setView([coordinates[1],coordinates[0]],Math.max(map.getZoom(),16));
        status.textContent=`Located to within ${(Math.round(fix.coords.accuracy*10)/10).toLocaleString('en')} m, as the device stated.`;
      }catch(e){error(e);status.textContent='';}
    },failure=>{
      if(closed)return;
      status.textContent=failure.code===failure.PERMISSION_DENIED?'Location was not allowed. Allow it for this page in the browser, or place the pin on the map.'
        :failure.code===failure.TIMEOUT?'The device did not find its location in 30 seconds. Try again outdoors, or place the pin on the map.'
        :'The device could not say where it is. Place the pin on the map, or type its position.';
    },{enableHighAccuracy:true,timeout:30000,maximumAge:0});
  }
  $('#pin-locate').onclick=()=>locate(false);$('#pin-locate-move').onclick=()=>locate(true);
  /** FIND A PLACE by name, through OpenStreetMap's Nominatim, only when Find is pressed: the words typed are sent there,
   *  and the dialog says so. A result moves the map; it does not place a pin. */
  ($('#pin-place-form') as HTMLFormElement).onsubmit=async e=>{
    e.preventDefault();const q=($('#pin-place') as HTMLInputElement).value.trim(),status=$('#pin-place-status'),list=$('#pin-place-results');
    list.replaceChildren();if(!q){status.textContent='Type a place to find.';return;}
    status.textContent=`Asking OpenStreetMap's Nominatim for "${q}"…`;
    try{
      const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&q=${encodeURIComponent(q)}`,{referrerPolicy:'origin',headers:{'Accept-Language':navigator.language||'en'}});
      if(!r.ok)throw new Error(String(r.status));
      const found=await r.json() as {display_name:string;lat:string;lon:string;boundingbox?:[string,string,string,string]}[];
      if(closed)return;
      if(!found.length){status.textContent=`Nominatim found nothing for "${q}". Try another spelling, or a larger place.`;return;}
      status.textContent=`${found.length} ${found.length===1?'place':'places'} from OpenStreetMap's Nominatim (the words typed were sent there). Choose one to move the map.`;
      for(const place of found){const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.className='text-button';b.textContent=place.display_name;
        b.onclick=()=>{ensureMap();const bb=place.boundingbox?.map(Number);
          if(bb&&bb.every(Number.isFinite))map!.fitBounds([[bb[0]!,bb[2]!],[bb[1]!,bb[3]!]],{maxZoom:17});else map!.setView([Number(place.lat),Number(place.lon)],15);
          status.textContent=`Showing ${place.display_name}. Click the map to place a pin there.`;};
        li.append(b);list.append(li);}
    }catch{if(!closed)status.textContent='Nominatim could not be reached. Pan the map, or type the position.';}
  };
  ($('#pin-locate') as HTMLButtonElement).disabled=!geolocationOffered();
  if(!geolocationOffered())$('#pin-locate-status').textContent='This browser cannot give a location on this page. Place pins on the map or type their position.';
  /** REQUIRED VALUES NOT YET GIVEN: said, never a reason to refuse the save, since a pin without one is still a place someone stood. */
  function missingRequired():{f:PointFeature;labels:string[]}[]{
    const needed=fields.filter(x=>x.required);if(!needed.length)return [];
    return data.features.map(f=>({f,labels:needed.filter(x=>f.properties[x.key]===undefined||f.properties[x.key]===null||f.properties[x.key]==='').map(x=>x.label)})).filter(x=>x.labels.length);
  }
  function categories():string[]{const seen:string[]=[];for(const f of data.features){const c=f.properties.category;if(typeof c==='string'&&c.trim()&&!seen.includes(c.trim()))seen.push(c.trim());}return seen;}
  function categoryLook(f:PointFeature):{colour:string;letter:string}{
    const c=typeof f.properties.category==='string'?f.properties.category.trim():'';const at=c?categories().indexOf(c):-1;
    return {colour:at>=0&&at<CATEGORY_COLOURS.length?CATEGORY_COLOURS[at]!:NO_CATEGORY,letter:c?c[0]!.toUpperCase():'·'};
  }
  function drawLegend(){
    const all=categories(),legend=$('#pin-legend');
    if(!all.length){legend.textContent=data.features.length?'Markers: give pins a Category to colour them by it.':'';return;}
    const count=(c:string)=>data.features.filter(f=>typeof f.properties.category==='string'&&f.properties.category.trim()===c).length;
    const none=data.features.filter(f=>!(typeof f.properties.category==='string'&&f.properties.category.trim())).length;
    legend.innerHTML='<span class="pin-legend-title">Markers by Category</span>'+all.map((c,i)=>`<span class="pin-legend-item"><span class="pin-swatch" style="background:${i<CATEGORY_COLOURS.length?CATEGORY_COLOURS[i]:NO_CATEGORY}" aria-hidden="true">${esc(c[0]!.toUpperCase())}</span>${esc(c)} (${count(c)})</span>`).join('')
      +(none?`<span class="pin-legend-item"><span class="pin-swatch" style="background:${NO_CATEGORY}" aria-hidden="true">·</span>No category (${none})</span>`:'')
      +(all.length>CATEGORY_COLOURS.length?`<span class="pin-legend-item">${all.length-CATEGORY_COLOURS.length} more categories share the grey.</span>`:'');
  }
  /** THE PINS AS A TABLE, in the editor, a page at a time: each row chooses its pin. */
  function drawTable(){
    const host=optionalElement('#pin-table',dialog);if(!host)return;
    if($('#input-mode').value!=='pins'||!data.features.length){host.innerHTML='';return;}
    const lacking=new Map(missingRequired().map(x=>[x.f.id,x.labels]));
    const pages=Math.max(1,Math.ceil(data.features.length/PINS_PER_PAGE));tablePage=Math.min(tablePage,pages-1);
    const rows=data.features.slice(tablePage*PINS_PER_PAGE,(tablePage+1)*PINS_PER_PAGE);
    const how=(f:PointFeature)=>!f.geometry?'None yet':f.properties.positionSource==='device'?`This device, ±${Number(f.properties.positionAccuracyM).toLocaleString('en')} m`:f.properties.positionSource==='map'?'On the map':f.properties.positionSource==='typed'?'Typed':f.properties.positionSource==='photo'?'Its photo':'Not recorded';
    host.innerHTML=`<h3 class="pin-table-title">Pins (${data.features.length.toLocaleString('en')})</h3><table><thead><tr><th scope="col">Pin label</th><th scope="col">Category</th><th scope="col">Longitude, latitude</th><th scope="col">Position from</th><th scope="col">Required, not given</th></tr></thead><tbody>`
      +rows.map(f=>`<tr data-pin-row="${esc(f.id)}"${f.id===selected?' aria-selected="true"':''}><td><button type="button" class="text-button" data-pin-choose="${esc(f.id)}">${esc(f.properties.name)}</button></td><td>${esc(f.properties.category??'')}</td><td>${f.geometry?`${f.geometry.coordinates[0].toFixed(5)}, ${f.geometry.coordinates[1].toFixed(5)}`:'—'}</td><td>${esc(how(f))}</td><td>${esc((lacking.get(f.id)??[]).join(', '))}</td></tr>`).join('')
      +'</tbody></table>'+(pages>1?`<div class="pin-table-pages"><button type="button" class="button small" data-pin-page="-1" ${tablePage?'':'disabled'}>Previous</button><span>Page ${tablePage+1} of ${pages}</span><button type="button" class="button small" data-pin-page="1" ${tablePage<pages-1?'':'disabled'}>Next</button></div>`:'');
    host.querySelectorAll<HTMLButtonElement>('[data-pin-choose]').forEach(b=>b.onclick=()=>{if(!savePin())return;selected=b.dataset.pinChoose!;ensureMap();renderPin();drawPins();preview();
      const f=data.features.find(x=>x.id===selected);if(f?.geometry)map?.panTo([f.geometry.coordinates[1],f.geometry.coordinates[0]]);});
    host.querySelectorAll<HTMLButtonElement>('[data-pin-page]').forEach(b=>b.onclick=()=>{tablePage+=Number(b.dataset.pinPage);drawTable();});
  }
  /** A PIN'S PHOTOS (experiment 09's item 13): each as a picture with its caption, Remove, and Add photos. A photo's own
   *  location is offered to place a pin that has none, and otherwise said as a distance; it is not kept. */
  function drawPhotos(f:PointFeature){
    const list=photos[String(f.id)]??[];
    const items=list.map((p,i)=>{const payload=photoData(p.sha256);
      return `<li class="pin-photo"><figure>${payload?`<img src="${esc(payload.data)}" alt="${esc(p.caption||`Photo ${i+1} of ${esc(f.properties.name)}`)}" loading="lazy">`
        :`<p class="muted">Not on this device (sha256 ${esc(p.sha256.slice(0,12))}…).</p>`}<figcaption><label>Caption<input data-photo-caption="${i}" maxlength="300" value="${esc(p.caption??'')}"></label>`
        +`<button type="button" class="text-button" data-photo-remove="${i}">Remove photo</button></figcaption></figure></li>`;}).join('');
    $('#pin-save').insertAdjacentHTML('beforebegin',`<fieldset class="pin-photos"><legend>Photos (${list.length} of ${MAX_PIN_PHOTOS})</legend>`
      +(items?`<ul class="pin-photo-list">${items}</ul>`:'')
      +(list.length<MAX_PIN_PHOTOS?`<label class="button small pin-photo-add">Add photos<input id="pin-photo-input" type="file" accept="image/*" multiple hidden></label>`:'')
      +'<p id="pin-photo-status" role="status"></p></fieldset>');
    dialog.querySelectorAll<HTMLInputElement>('[data-photo-caption]').forEach(input=>input.oninput=()=>{
      const p=photos[String(f.id)]?.[Number(input.dataset.photoCaption)];if(!p)return;const text=input.value.trim();if(text)p.caption=text;else delete p.caption;markDirty();});
    dialog.querySelectorAll<HTMLButtonElement>('[data-photo-remove]').forEach(b=>b.onclick=()=>{if(!savePin())return;remember();
      const left=(photos[String(f.id)]??[]).filter((_,i)=>i!==Number(b.dataset.photoRemove));if(left.length)photos[String(f.id)]=left;else delete photos[String(f.id)];markDirty();renderPin();preview();});
    const input=optionalElement('#pin-photo-input',dialog) as HTMLInputElement|null;
    if(input)input.onchange=async()=>{
      const files=[...input.files??[]];input.value='';if(!files.length||!savePin())return;
      const status=$('#pin-photo-status'),pin=String(f.id),room=MAX_PIN_PHOTOS-(photos[pin]?.length??0);
      status.textContent=`Reading ${files.length===1?'the photo':`${Math.min(files.length,room)} photos`}…`;
      const added:PinPhoto[]=[];let offered:[number,number]|null=null;const problems:string[]=[];
      for(const file of files.slice(0,room)){
        try{const made=await photoFromFile(file);if(closed)return;pendingPhotos.set(made.photo.sha256,made.payload);added.push(made.photo);offered??=made.position;}
        catch(e){problems.push(errorMessage(e));}
      }
      if(added.length){remember();photos[pin]=[...(photos[pin]??[]),...added];markDirty();}
      const current=data.features.find(x=>String(x.id)===pin);
      renderPin();preview();
      const said:string[]=[];
      if(added.length)said.push(`${added.length} ${added.length===1?'photo':'photos'} added, at most ${2048} px, with no location or camera details kept in ${added.length===1?'it':'them'}.`);
      if(files.length>room)said.push(`${files.length-room} not added: a pin holds ${MAX_PIN_PHOTOS}.`);
      said.push(...problems);
      if(offered&&current?.geometry)said.push(`The photo's location data puts it ${Math.round(metresApart(current.geometry.coordinates as [number,number],offered)).toLocaleString('en')} m from this pin.`);
      $('#pin-photo-status').textContent=said.join(' ');
      if(offered&&current&&!current.geometry){const spot=offered;
        $('#pin-photo-status').insertAdjacentHTML('afterend','<button type="button" class="button small" id="pin-photo-place">Place this pin where the photo was taken</button>');
        ($('#pin-photo-place') as HTMLButtonElement).onclick=()=>{remember();current.geometry={type:'Point',coordinates:spot};placedBy(current,'photo');markDirty();
          drawPins();renderPin();preview();map?.setView([spot[1],spot[0]],Math.max(map.getZoom(),16));};}
    };
  }
  /** THE FORM'S ORDER (experiment 09's item 3, 2026-11-22): each field moved up or down, so a pin's form reads the way the
   *  questions are asked. Groups were judged not needed while a form holds at most 30 fields. */
  function drawFieldOrder(){
    const list=optionalElement('#pin-field-order',dialog);if(!list)return;
    list.innerHTML=fields.map((f,i)=>`<li><span>${esc(f.label)}${f.required?' (required)':''}</span>`
      +`<button type="button" class="text-button" data-field-move="${i}" data-by="-1" ${i?'':'disabled'} aria-label="Move ${esc(f.label)} up">Move up</button>`
      +`<button type="button" class="text-button" data-field-move="${i}" data-by="1" ${i<fields.length-1?'':'disabled'} aria-label="Move ${esc(f.label)} down">Move down</button></li>`).join('');
    list.querySelectorAll<HTMLButtonElement>('[data-field-move]').forEach(b=>b.onclick=()=>{
      if(!savePin())return;const i=Number(b.dataset.fieldMove),j=i+Number(b.dataset.by);if(j<0||j>=fields.length)return;
      remember();const next=[...fields];[next[i],next[j]]=[next[j]!,next[i]!];fields=next;markDirty();renderPin();drawFieldOrder();
      list.querySelector<HTMLButtonElement>(`[data-field-move="${j}"][data-by="${b.dataset.by}"]:not([disabled])`)?.focus();});
  }
  function addField(required=false){
    const pending=['key','label','default','values'].some(id=>($('#pin-field-'+id) as HTMLInputElement).value!=='')||$('#pin-field-type').value!=='text'||($('#pin-field-required') as HTMLInputElement).checked;if(!pending&&!required)return;
    const key=$('#pin-field-key').value.trim(),label=$('#pin-field-label').value.trim(),type=attributeType($('#pin-field-type').value),raw=$('#pin-field-default').value;
    if(!validAttributeKey(key)||fields.some(f=>f.key===key)||attributeRules.some(f=>f.key===key)||!label||fields.length>=30)throw new Error('Use a unique field key beginning with a letter and a label; at most 30 fields.');
    const allowedValues=parseValueSet($('#pin-field-values').value,type),mustGive=($('#pin-field-required') as HTMLInputElement).checked,definition:FormField={key,label,type,...(allowedValues?{allowedValues}:{}),...(raw?{defaultValue:parseAttributeValue(raw,type)}:{}),...(mustGive?{required:true}:{})},nextFields=[...fields,definition];
    checkDraft(data,nextFields);remember();fields=nextFields;markDirty();for(const id of ['key','label','default','values'])($('#pin-field-'+id) as HTMLInputElement).value='';$('#pin-field-type').value='text';($('#pin-field-required') as HTMLInputElement).checked=false;
  }
  $('#pin-add-field').onclick=()=>{try{if(!savePin())return;renderPin();addField(true);renderPin();preview();error('');}catch(e){error(e);}};
  $('#pin-delete').onclick=()=>{if(!selected)return;remember();delete photos[selected];data.features=data.features.filter(x=>x.id!==selected);selected=null;source={...source,format:'pins'};markDirty();error('');renderPin();drawPins();preview();};
  $('#pins-fit').onclick=fit;
  $('#pin-record').onchange=()=>{const next=$('#pin-record').value;if(!savePin()){drawPins();return;}selected=next||null;renderPin();drawPins();};
  applyNow=async()=>{try{if($('#input-mode').value==='pins'){if(!savePin())return false;renderPin();addField();}data=checkDraft(data);
    // THE PHOTOS' BYTES KEPT FIRST, those still referred to, so the step never names a photo this device does not hold.
    const ids=new Set(data.features.map(f=>String(f.id)));photos=Object.fromEntries(Object.entries(photos).filter(([pin,list])=>ids.has(pin)&&list.length));
    for(const list of Object.values(photos))for(const p of list){const payload=pendingPhotos.get(p.sha256);if(payload&&!await photoStore.keep(p.sha256,payload))throw new Error('A photo could not be kept on this device. Your draft is still open; try Apply again.');}
    const saved=onApply({...structuredClone(node.params),data:structuredClone(data),fields:structuredClone(fields),attributeRules:structuredClone(attributeRules),sourceInfo:structuredClone(source),pinIdStrategy:$('#pin-use-uuid').checked?'uuid':'sequential',pinPhotos:Object.keys(photos).length?structuredClone(photos):undefined});
    if(saved===false)throw new Error('Edits could not be saved on this device. Your draft is still open; try Apply again.');return true;}
    catch(e){error(e);return false;}};
  release=()=>{closed=true;requestId++;db?.close();map?.stop();map?.remove();};
  error('');preview();mode();
  }
}
