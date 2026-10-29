import type {WorkflowNode,Escape,Position,DistanceUnit} from './types.js';
import type {DisplayValue,DisplayRow} from './results.js';
import {SOURCE,tierLabel,serviceLabel,zoneLabel} from './old-naledi.js';
import {markPath} from './presentation.js';
const numeric=(key:string,label:string,value:number,min:number,max:number,step:number,help:string)=>`<div class="field"><label class="field-label" for="param-${key}">${label}</label><input id="param-${key}" data-param="${key}" type="number" value="${value}" min="${min}" max="${max}" step="${step}"><small>${help}</small></div>`;
const choose=(key:string,label:string,value:string,options:[string,string][])=>`<div class="field"><label class="field-label" for="param-${key}">${label}</label><select id="param-${key}" data-param="${key}">${options.map(([v,t])=>`<option value="${v}" ${v===value?'selected':''}>${t}</option>`).join('')}</select></div>`;
export function oldInspector(n:WorkflowNode){
  const source=`<a class="source-link" href="${SOURCE}06-Gaborone-Health-Facilities.ipynb" target="_blank" rel="noopener">Source notebook · NB06 ↗</a>`;
  switch(n.type){
    case 'study_area':return `<div class="source-card"><span class="inspector-section">Study boundary</span><h3>Old Naledi</h3><p>Gaborone, Botswana</p><span class="tag">SOURCE GEOMETRY</span></div><div class="detail-row"><span>Coordinates</span><strong>Longitude / latitude · CRS84</strong></div><div class="detail-row"><span>Source snapshot</span><strong>7f183843</strong></div><p class="description">The actual neighborhood polygon bounds the generated sample locations. Facility search extends outside it so nearby services remain visible.</p><a class="source-link" href="${SOURCE}data-files/geojson/OldNaledi.geojson" target="_blank" rel="noopener">Boundary provenance ↗</a><div class="notice">This example contains no household or patient locations. Sample points are a regular demonstration grid.</div>`;
    case 'point_grid':return numeric('spacingM','Sample spacing (meters)',n.params.spacingM,150,1000,50,'Generate a regular grid and retain points inside the connected study area. The spacing uses a local geographic approximation.')+`<div class="rule-preview">These are <b>sample locations</b>, not buildings, households, population counts, or TB cases.</div><p class="description">This widget stands in for the prepared residential-building layer until that source artifact is available.</p>`;
    case 'facilities':return numeric('radiusKm','Candidate search radius (km)',n.params.radiusKm,1,15,1,'Measured from the center of the study boundary bounding box. Affects the candidate set, not a travel-time catchment.')+'<p class="description">Connect a Study area and Input data containing facility points. Required attributes: owner and serviceType (text). Edit or replace records in the connected Input data widget.</p><div class="notice">Points beyond the radius and records without coordinates are omitted from the candidate set, not deleted from the source. Missing-location counts are recorded in computation evidence. Diagnostic assignments still use the historical NB06 rules; a new dataset requires review of their applicability.</div>';
    case 'xpert':return `<span class="inspector-section">Evidence hierarchy</span><ol class="evidence-ladder"><li><b>Direct</b><span>Named Princess Marina Hospital evidence.</span></li><li><b>Contextual</b><span>Named Broadhurst II evidence or government hospital type.</span></li><li><b>Inferential</b><span>Government clinic or health-post assumptions.</span></li><li><b>No evidence</b><span>No applicable assignment; availability stays unknown.</span></li></ol><p class="description">N3 evaluates mutually exclusive named-facility and type rules. Stronger named evidence takes precedence. The source notebook’s assignments are reproduced, not independently revalidated.</p>${source}`;
    case 'access':return '<p class="description">Connect generated samples or shared Input data points. Locations without coordinates remain Unknown and are retained in the results table.</p>'+choose('minimumEvidence','Minimum evidence',n.params.minimumEvidence,[['direct','Direct only'],['contextual','Direct + contextual'],['inferential','Include inferential']])+choose('service','Diagnostic service',n.params.service,[['onsite','Onsite only'],['anyKnown','Include referral pathways']])+numeric('speedMPerMin','Walking speed proxy (m/min)',n.params.speedMPerMin,30,120,5,'Default 70 m/min follows the source helper. Time = straight-line meters ÷ speed.')+`<div class="notice">This is a straight-line access proxy. It does not account for street routes, barriers, waiting time, or specimen transport. Referral availability does not mean onsite testing.</div>`;
    case 'access_policy':return numeric('thresholdMin','Review above (proxy minutes)',n.params.thresholdMin,0,120,5,'Illustrative review setting. Equality stays within the threshold; missing eligible facilities remain unknown.')+`<div class="rule-preview">When proxy access time is <b>greater than ${n.params.thresholdMin} minutes</b>, flag the sample for review.<br>When no facility qualifies, report <b>insufficient data</b>.</div><p class="description">N3 also assigns fixed display zones: ≤5, 5–15, 15–30, and >30 minutes. These bands describe this demonstration; they are not a validated TB policy.</p>`;
    case 'facility_audit':return `<p class="description">Keep every candidate facility visible, including those excluded by the access filter. The register reports its service assignment, evidence tier, and supporting reference.</p><div class="rule-preview">Use this output to compare <b>what the source records</b> with <b>what the access analysis accepts</b>.</div>${source}`;
    default:return null;
  }
}
export function oldEvidence(output:DisplayValue,row:DisplayRow,esc:Escape){
  const entries=output.kind==='facility-evidence'?[
    ['Ownership',row.owner],['Source facility type',row.serviceType],['Service assignment',serviceLabel(row.service||'Unknown')],['Evidence tier',tierLabel(row.tier||'Unknown')],['Source reference',row.reference]
  ]:[['Location basis',output.locationSource?.kind==='input-points'?'Connected input point':'Generated grid location'],['Nearest qualifying facility',row.center?.name||'None'],['Straight-line distance',distanceText(row)],['Proxy access time',row.minutes===null?'Unknown':row.minutes!.toFixed(2)+' min'],['Review threshold',output.thresholdMin+' min'],['Access zone',zoneLabel(row.zone||'Unknown')],['Evidence tier',row.center?tierLabel(row.center.tier||'None'):'Unknown'],['Service assignment',row.center?serviceLabel(row.center.service||'Unknown'):'Unknown'],['Source reference',row.center?.reference||'No qualifying facility'],['Eligible facilities',`${output.eligibleCount} of ${output.candidateCount}`]];
  if(output.facilitySource)entries.push(['Facility input',output.facilitySource.nodeId||'Connected data'],['Input records',String(output.facilitySource.inputCount)],['Missing facility locations',String(output.facilitySource.missingLocationCount)]);
  return `<h2>${esc(row.name)}</h2><p class="description">${esc(row.explanation)}</p>${entries.map(([k,v])=>`<div class="detail-row"><span>${k}</span><strong>${esc(v)}</strong></div>`).join('')}<div class="rule-preview">Historical facility evidence applies to the connected locations. Spatial proximity alone does not establish diagnostic availability.</div><a class="source-link" href="${SOURCE}06-Gaborone-Health-Facilities.ipynb" target="_blank" rel="noopener">Pinned source notebook ↗</a><div class="inspector-actions"><button id="inspect-rules" class="button small">View N3 & evidence ↗</button></div>`;
}
/** A distance reads in the unit it was measured in. `nearest` carries a unit knob, so the column
 *  cannot say "km": a metres reading labelled km is wrong by a factor of a thousand on screen. */
export function distanceText(row:{distance?:number|null; unit?:DistanceUnit},absent='Unknown'):string{
  if(row.distance===null||row.distance===undefined)return absent;
  return row.unit==='metres'?`${row.distance.toFixed(1)} m`:`${row.distance.toFixed(2)} km`;
}

export function resultTable(output:DisplayValue|undefined,esc:Escape,statusLabel:(status:string|undefined)=>string){
  const rows=output?.rows||[],audit=output?.kind==='facility-evidence',access=output?.kind==='access',extent=output?.kind==='extent';
  const columns=audit?['Facility','Service assignment','Evidence','Reference']:access?['Sample','Qualifying facility','Proxy minutes','Decision']:extent?['Polygon','Enclosed area','Decision']:['Neighborhood','Nearest center','Distance','Decision'];
  const body=rows.map(r=>{
    const cells=audit?[r.name,serviceLabel(r.service||'Unknown'),tierLabel(r.tier||'Unknown'),r.reference]
      :extent?[r.name,typeof r.areaSquareMetres==='number'?`${(r.areaSquareMetres/1e6).toFixed(3)} km²`:'Not measured',statusLabel(r.status)]
      :[r.name,r.center?.name||'—',access?(r.minutes===null?'Unknown':r.minutes!.toFixed(1)+' min'):distanceText(r,'—'),statusLabel(r.status)];
    return `<tr tabindex="0" data-place="${esc(r.id)}">${cells.map(v=>`<td>${esc(v)}</td>`).join('')}</tr>`;
  }).join('');
  return {head:columns.map(c=>`<th>${c}</th>`).join(''),body};
}
/** The frame this map draws in, and the projection that puts anything else in it.
 *
 *  Extracted so a caller can place something in the same frame without recomputing the
 *  arithmetic and getting a slightly different answer -- the pattern `rasterFrame` already uses.
 *  A basemap needs both: the extent, to know which tiles cover it, and the projection, to place
 *  each tile by its own corners. Experiment 137. */
export function mapFrame(output:DisplayValue){
  const boundary=output.boundary!,polygons=boundary.type==='MultiPolygon'?boundary.coordinates:[boundary.coordinates];
  const outline=polygons.flat(2),points=[...outline,...output.rows.filter(r=>r.coordinates!).map(r=>r.coordinates!),...(output.centers||[]).filter(c=>c.geometry).map(c=>c.geometry!.coordinates)];
  const xs=points.map(p=>p![0]),ys=points.map(p=>p![1]),xmin=Math.min(...xs),xmax=Math.max(...xs),ymin=Math.min(...ys),ymax=Math.max(...ys),cos=Math.cos((ymin+ymax)/2*Math.PI/180);
  const scale=Math.min(720/Math.max((xmax-xmin)*cos,.001),225/Math.max(ymax-ymin,.001));
  return {polygons,xmin,xmax,ymin,ymax,cos,scale,
    bounds:[xmin,ymin,xmax,ymax] as [number,number,number,number],
    project:(p:Position):[number,number]=>[425+(p[0]-(xmin+xmax)/2)*cos*scale,145-(p[1]-(ymin+ymax)/2)*scale]};
}
export function oldMap(output:DisplayValue,selected:string|null|undefined,esc:Escape,statusLabel:(status:string|undefined)=>string){
  const {polygons,project}=mapFrame(output);
  let svg='<rect width="850" height="295" fill="#f0f3e9"/><text x="18" y="22" style="letter-spacing:1px">OLD NALEDI · SOURCE BOUNDARY</text>';
  // TAGGED AS CARRYING NO VALUE. This polygon is a boundary: it says where the study area is and
  // encodes no measurement, so its fill is spending a visual variable on nothing -- the same
  // objection `UnknownIsNotAHue` already makes about hue, one channel over. On a blank page a
  // pale wash still earns its place by separating figure from ground; over a basemap it simply
  // hides the ground, which is what the practitioner met on the South London figure, 2026-10-25.
  // So the fill is declared here and withdrawn by whoever draws ground underneath it.
  svg+=polygons.map(rings=>`<path data-fill-role="context" d="${rings.map(ring=>'M'+ring.map(p=>project(p).join(',')).join('L')+'Z').join(' ')}" fill="#dbe8d6" stroke="#668870" stroke-width="1.5" fill-rule="evenodd"/>`).join('');
  if(['spatial-coverage','spatial-map'].includes(output.kind||''))svg=svg.replace('OLD NALEDI · SOURCE BOUNDARY','STUDY AREA · SPATIAL COVERAGE');
  const focus=output.rows.find(r=>'result:'+r.id===selected);
  if(focus?.center){svg+=`<path d="M${project(focus.coordinates!).join(',')}L${project(focus.center.coordinates!).join(',')}" stroke="#587d6c" stroke-dasharray="4 4"/>`;}
  for(const c of output.centers||[]){if(!c.geometry)continue;const [x,y]=project(c.geometry!.coordinates);svg+=`<rect x="${x-5}" y="${y-5}" width="10" height="10" fill="#315d57" stroke="white"/><text x="${x+9}" y="${y-8}">${esc(c.properties.name)}</text>`;}
  // THE ENCODING THE KEY ALREADY PROMISES. Hue and mark say which source a point came from and
  // fill says whether it is inside the study area -- the Inspector states it in those words, the
  // legend draws one entry per layer in that layer's hue and mark, the interactive map honours it
  // and the raster map was taught it on 2026-10-25. This renderer, the plainest static map in the
  // application, drew every mark as a circle coloured by status instead.
  //
  // Found the same day on Snow's own map: the key said the eight pumps were orange squares and
  // the plot drew 258 identical green dots, so the one distinction the figure exists to make --
  // deaths here, pumps there -- was the one it did not draw. A legend that disagrees with its
  // plot is worse than no legend; the reader trusts it.
  //
  // Where no symbols are declared the status colours stand, so every example that predates layer
  // symbols looks exactly as it did.
  const symbols=(output as {layerSymbols?:Record<string,{colour:string;shape:Parameters<typeof markPath>[0];size?:number}>}).layerSymbols;
  // AND THE PIN CLASS, WHERE THE LAYER HAS ONE. The interactive map drew "water intake" and
  // "tidal limit" in two hues while this one drew both in the layer's single colour -- the same
  // disagreement between a figure and its key that this comment block records for the pumps, one
  // encoding further on. A class is what a record IS; the layer is where it came from.
  const classes=(output as {pinClasses?:Record<string,{value:string;colour:string}[]>}).pinClasses;
  const classColour=(source?:string,pinClass?:string):string|undefined=>
    pinClass?classes?.[source||'']?.find(entry=>entry.value===pinClass)?.colour:undefined;
  for(const r of output.rows){if(!r.coordinates!)continue;const [x,y]=project(r.coordinates!),label=['spatial-coverage','spatial-map'].includes(output.kind||'')?(r.excluded?'Excluded':r.relation):output.kind==='facility-evidence'?tierLabel(r.tier||'Unknown'):statusLabel(r.status);
    const symbol=symbols?.[r.sourceNodeId||''];
    // The layer's own radius, or the default where none was chosen. A focused mark is drawn
    // larger than whatever that is, rather than at a fixed size that could be smaller than the
    // mark it is meant to pick out.
    const base=symbol?.size??4;
    const radius=focus?.id===r.id?base+3:base;
    const statusFill={Review:'#c18b4f',NoFlag:'#699178',Unknown:'#a89b87'}[r.status!];
    // `hollow` is the declared fill for a point outside the area, and `absent` for one a clip set
    // aside: drawn as an outline and as a neutral, never as a second hue competing with a layer.
    const hollow=r.relation==='Outside',aside=r.excluded||r.relation==='MissingLocation';
    const ink=classColour(r.sourceNodeId,(r as {pinClass?:string}).pinClass)||symbol?.colour;
    const mark=symbol
      ?`<path d="${markPath(symbol.shape,x,y,radius)}" fill="${hollow?'none':aside?'#a89b87':ink}" stroke="${aside?'#a89b87':ink}" stroke-width="1.6"/>`
      :`<circle cx="${x}" cy="${y}" r="${radius}" fill="${statusFill}" stroke="white" stroke-width="1.2"/>`;
    svg+=`<g class="location" role="button" tabindex="0" data-place="${esc(r.id)}" data-layer="${esc(r.sourceNodeId||'')}" aria-label="${esc(r.name)}, ${esc(label)}${r.layerLabel?', '+esc(r.layerLabel):''}"><title>${esc(r.name)} · ${esc(label)}${r.layerLabel?' · '+esc(r.layerLabel):''}</title>${mark}</g>`;}
  return svg+`<text x="18" y="281" style="font-size:10px">${['spatial-coverage','spatial-map'].includes(output.kind||'')?'Select a point to review its relation to the study boundary':output.kind==='access'?'Grid samples · straight-line proxy · select a point for evidence':'Historical facility registry · source evidence assignments'}</text><text x="826" y="25" text-anchor="middle">N ↑</text>`;
}
