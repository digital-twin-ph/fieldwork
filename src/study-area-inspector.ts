/** STUDY AREA'S INSPECTOR, OUT OF APP.TS (2026-11-20: touched when its shape began to be named by digest in every receipt,
 *  and when DR Congo's provinces were made quick to choose). The name; no inputs; one sentence, the country and the map,
 *  which is this step's dialog; and what it holds -- the shape, what the boundary repair removed, and every extent it has
 *  had. The map stays in app.ts, which reads the project's other study areas from storage; the kit opens it. */
import type {WorkflowNode} from './types.js';
import type {OwnInspector,StepKit} from './inspector-kit.js';
import {countryName,countryOfArea} from './boundary-source.js';
import {countriesOfArea} from './area-countries.js';
import {openCountriesConfig} from './area-countries-ui.js';
import {levelName} from './figure-words.js';

export interface StudyAreaKit extends StepKit {
  /** The map, to select or edit the area. */
  edit:(nodeId:string)=>void;
  /** The N3 view, at this step's facts. */
  viewN3:()=>void;
}

export function geometryVertices(geometry:{type:string;coordinates:unknown}|undefined):number{
  if(!geometry)return 0;
  const rings=(geometry.type==='MultiPolygon'
    ?(geometry.coordinates as number[][][][]).flat()
    :geometry.coordinates as number[][][])||[];
  // The closing point repeats the first, so each ring counts one fewer.
  return rings.reduce((total,ring)=>total+Math.max(0,ring.length-1),0);
}

export const studyAreaInspector:OwnInspector<'study_area'>={
  markup:(n,kit)=>{
    // THE STANDARD INSPECTOR (experiment 186): the name; no inputs; one sentence, the country and the map, which is this
    // step's dialog; and what it holds -- the shape, what the boundary repair removed, and every extent it has had.
    const p=n.params,esc=kit.esc;
    let content='';
    content+=kit.section('Name',`<form id="study-area-label-form" class="field"><label class="field-label" for="study-area-label">Study area label</label><input id="study-area-label" maxlength="100" required value="${esc(p.label||'My study area')}"><button type="submit" class="button small">Apply label</button></form>`);
    content+=kit.section('Inputs',kit.inputs(n));
    // THE COUNTRY, SAID ONCE, HERE. Every widget that needs one -- the population raster, the facilities export -- reads it
    // from the area rather than asking again.
    let countryField='';
    {
      // PICKED ONCE, AND ONLY WHERE IT WAS NEVER PICKED. The practitioner, 2026-10-23: *"State
      // it once is best for manually derived study areas like bounding box, circle, hand drawn
      // polygons. But for administrative boundaries from geoBoundaries, it could actually be
      // derived from the country selection so pick country once. Not twice."*
      //
      // An acquired boundary was chosen BY country -- the picker asks for one before it can
      // offer a level or a unit -- and carries it in its own identifier, BWA-ADM1-... Offering a
      // list there asks a question already answered, and a list implies the answer is in doubt.
      // So it is stated, not asked. A bounding box, a circle or a drawn polygon was never picked
      // by country and has none to derive, and that is where the list belongs.
      const acquired=countryOfArea({boundary:(n.params as {boundary?:{boundaryID?:string;provenance?:{boundaryID?:string}}}).boundary});
      countryField=acquired
        ?`<div class="field"><span class="field-label">Country</span>`
          +`<p class="muted">${esc(countryName(acquired))} (${esc(acquired)}), from the boundary this area was acquired as.</p></div>`
        // A LIST, CONFIGURED IN ITS OWN DIALOG (experiment 204): named, or found from where the shape falls and confirmed.
        :(()=>{const listed=countriesOfArea(n.params as {countries?:string[];country?:string});
          return `<div class="field"><span class="field-label">Countries</span><p class="standard-sentence" id="area-countries-sentence">`
            +(listed.length?`${esc(listed.map(c=>`${countryName(c)} (${c})`).join(', '))}.`:'Not stated. Read by the widgets that need a country.')+`</p>`
            +`<button type="button" class="button" id="configure-countries">Configure countries\u2026</button></div>`;})();
    }
    const geometry=p.source==='drawn'?p.geometry:undefined;
    content+=kit.section('Settings',`<p class="standard-sentence">${esc(geometry?`${p.selectionMode==='bbox'?'A bounding box':p.selectionMode==='circle'?'A circle':geometry.type==='MultiPolygon'&&(geometry.coordinates as unknown[]).length>1?`${(geometry.coordinates as unknown[]).length.toLocaleString('en')} polygons`:'A polygon'} of ${geometryVertices(geometry).toLocaleString('en')} vertices, in longitude, latitude order.`
      :'No area yet: select one on the map.')}</p>`+countryField
      // WHAT ITS UNITS ARE CALLED, said once as the country is (2026-11-20), for every figure's {units}.
      +(()=>{const own=levelName((p as {boundary?:{canonical?:string}}).boundary?.canonical);
        return `<div class="field"><label class="field-label" for="area-unit-name">Its units are called</label>`
          +`<input id="area-unit-name" maxlength="60" value="${esc((p as {unitName?:string}).unitName??'')}" placeholder="${esc(own?own.toLowerCase():'for example provinces')}">`
          +`<small>${own?`Its boundary calls them ${esc(own.toLowerCase())}; type to say otherwise. `:''}Figures read it where their text says {units} or {unit}.</small></div>`;})()
      +`<div class="inspector-actions"><button id="edit-study-area" class="button primary">${geometry?'Edit area on map':'Select area on map'}</button></div>`);
    let held='';
    if(p.source==='drawn'){
      const boundary=p.boundary;
      const repairs=boundary?.repairs??[];
      held+=`<p class="standard-result">${geometry?`${esc(p.label)}: ${p.selectionMode==='bbox'?'bounding box':'polygon'} · ${geometryVertices(geometry)} vertices`
        +(boundary?` · from ${esc(boundary.source)}`:''):'Not selected yet.'}</p>`
        +(repairs.length?`<p>The boundary repair removed ${repairs.length} of ${boundary!.vertices} published vertices: `
          +`${repairs.filter(r=>r.kind==='repeated').length} repeated straight after themselves, ${repairs.filter(r=>r.kind==='spike').length} at the tip of a zero-width spike`
          +`${(()=>{const spiked=[...new Set(repairs.filter(r=>r.kind==='spike').map(r=>r.unit))];return spiked.length?` (${spiked.map(esc).join(', ')})`:'';})()}. `
          +'No outline encloses a different area; each vertex is listed in the evidence.</p>':'')
        +(geometry?'<button id="area-view-n3" class="text-button">Inspect N3 facts and rule \u2197</button>':'');
        if(n.params.source==='drawn'&&(n.params.revisions?.length??0)>1){
          const history=n.params.revisions!;
          held+=`<span class="inspector-section">Extent history</span>`
            +`<p class="muted">${history.length} extents kept. Restoring one records a new extent carrying the old shape; nothing is removed.</p>`
            +`<ul class="record-list">`+history.map((r,i)=>{
              const current=i===history.length-1;
              const vertices=r.geometry?.coordinates?.[0]?.length;
              return `<li><span>v${i+1} · ${esc(new Date(r.at).toLocaleString())}`
                +`${r.restoredFrom?` · restored v${r.restoredFrom}`:''}`
                +`${vertices?` · ${vertices-1} vertices`:''}</span>`
                +(current?'<strong>current</strong>'
                  :`<button class="text-button" data-restore-extent="${i}">Restore this extent</button>`)+`</li>`;
            }).join('')+`</ul>`;
        }
    }
    content+=kit.section('Result',held);
    return content;
  },
  wire:(n,kit,root)=>{const k=kit as StudyAreaKit;
    const field=root.querySelector<HTMLInputElement>('#study-area-label');
    root.querySelector('#study-area-label-form')?.addEventListener('submit',e=>{e.preventDefault();if(!field)return;const label=field.value.trim();
      if(!label){field.setCustomValidity('Enter a label for the study area.');field.reportValidity();return;}
      kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t)t.params.label=label;});});
    field?.addEventListener('input',()=>field.setCustomValidity(''));
    root.querySelector('#configure-countries')?.addEventListener('click',()=>{
      const t=kit.workflow().nodes.find(x=>x.id===n.id);if(t?.type!=='study_area')return;const p=t.params;
      openCountriesConfig({step:p.label||'Study area',countries:countriesOfArea(p as {countries?:string[];country?:string}),
        geometry:p.source==='drawn'&&p.geometry?p.geometry:null,esc:kit.esc,
        apply:countries=>kit.change(w=>{const target=w.nodes.find(x=>x.id===n.id);if(target?.type!=='study_area')return;
          const q=target.params as {countries?:string[];country?:string};
          delete q.country;if(countries.length)q.countries=countries;else delete q.countries;})});
    });
    // A committed geometry is stamped, so the receipt can say WHEN the area was revised; restoring one records a new
    // extent carrying the old shape, appended, never truncated: the chain has to be able to say the area was once wider.
    root.querySelectorAll<HTMLButtonElement>('[data-restore-extent]').forEach(b=>b.addEventListener('click',()=>kit.change(w=>{
      const target=w.nodes.find(x=>x.id===n.id);
      if(target?.type!=='study_area'||target.params.source!=='drawn')return;
      const history=target.params.revisions??[],chosen=history[Number(b.dataset.restoreExtent)];
      if(!chosen)return;
      target.params.geometry=structuredClone(chosen.geometry);
      target.params.selectionMode=chosen.selectionMode;
      target.params.revisions=[...history,{at:new Date().toISOString(),
        geometry:structuredClone(chosen.geometry),selectionMode:chosen.selectionMode,
        restoredFrom:Number(b.dataset.restoreExtent)+1}];
    })));
    root.querySelector<HTMLInputElement>('#area-unit-name')?.addEventListener('change',e=>{const v=(e.target as HTMLInputElement).value.trim();
      kit.change(w=>{const t=w.nodes.find(x=>x.id===n.id);if(t?.type!=='study_area')return;const q=t.params as {unitName?:string};
        if(v)q.unitName=v;else delete q.unitName;});});
    root.querySelector('#edit-study-area')?.addEventListener('click',()=>k.edit(n.id));
    root.querySelector('#area-view-n3')?.addEventListener('click',()=>k.viewN3());
  },
};
