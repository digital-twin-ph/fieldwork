import {PALETTE_GROUPS} from './palette.js';
import registry from '../widgets/registry.json';
import parityRecord from '../widgets/parity.json';
import packCatalog from '../widgets/packs.json';
import classification from '../widgets/classification.json';
import releaseNotes from '../widgets/release-notes.json';
import examplesCatalog from '../widgets/examples.json';
import {TYPES} from './core.js';
import type {Escape,NodeType} from './types.js';

/** The widget catalog, rendered from the same files the receipts cite: widgets/registry.json for
 *  identity and digests, widgets/parity.json for independent recomputation, and the compiled
 *  definitions for titles and ports. Nothing here is fetched, and nothing is installable — these
 *  definitions are already in this build, which is why showing them is provenance rather than a
 *  storefront. See docs/experiments/49-catalog-in-the-interface.md. */
type ParityEntry={widget:string;coversRelease:string;check:string;outcome:string;measured:string;external:string[];criterion:string;ranAt:string};
const parityFor=(id:string):ParityEntry[]=>(parityRecord.entries as ParityEntry[]).filter(e=>e.widget===id);

type Kind={nodeType:string;classification:string;pack?:string};
const kindOf=(nodeType:string)=>(classification.widgets as Kind[]).find(w=>w.nodeType===nodeType);
const packName=(id?:string)=>(packCatalog.packs as {id:string;name:string}[]).find(p=>p.id===id)?.name??id;

export function widgetIdentity(nodeType:string){
  const entry=registry.widgets.find(w=>w.nodeType===nodeType);
  if(!entry)return undefined;
  const release=entry.releases.find(r=>r.version===entry.currentVersion)!;
  const parity=parityFor(entry.id);
  const kind=kindOf(nodeType);
  const notes=(releaseNotes.widgets as Record<string,{version:string;released?:string;breaking?:boolean;
    changes:{kind:string;description:string;breaking?:boolean;migration?:string}[]}>)[nodeType];
  return {id:entry.id,version:entry.currentVersion,digest:release.sha256,releases:entry.releases.length,
    notes:notes?.version===entry.currentVersion?notes:undefined,
    classification:kind?.classification??'standard',pack:kind?.pack,
    parity:parity.find(p=>p.coversRelease===entry.currentVersion),stale:parity.find(p=>p.coversRelease!==entry.currentVersion)};
}

const badge=(outcome?:string,stale?:boolean)=>outcome
  ?`<span class="tag parity-${outcome}" data-parity="${outcome}">${outcome}${stale?' · earlier release':''}</span>`
  :'<span class="tag parity-unchecked" data-parity="none">not checked</span>';

/** Identity of the definition behind one node, for the inspector. */
export function identityMarkup(nodeType:string,esc:Escape):string{
  const identity=widgetIdentity(nodeType);
  if(!identity)return '';
  const parity=identity.parity??identity.stale;
  return '<div class="inspector-divider"></div><span class="inspector-section">Definition</span>'
    +`<div class="detail-row"><span>Widget</span><strong>${esc(identity.id.replace('urn:fieldwork:widget:',''))} ${esc(identity.version)}</strong></div>`
    +`<div class="detail-row"><span>Release digest</span><strong><code>${esc(identity.digest.slice(0,12))}</code></strong></div>`
    +`<div class="detail-row"><span>Kind</span><strong>${identity.classification==='domain'?`Domain widget · ${esc(String(packName(identity.pack)))}`:'Standard widget · any domain'}</strong></div>`
    +`<div class="detail-row"><span>Independent check</span><strong>${badge(parity?.outcome,!!identity.stale&&!identity.parity)}</strong></div>`
    +(parity?`<details><summary>What was checked</summary><p class="muted">${esc(parity.measured)}</p><p class="muted">Against ${esc(parity.external.join(', '))}; criterion: ${esc(parity.criterion)}. Covers release ${esc(parity.coversRelease)}.</p></details>`:'')
    // What this version changed, from the release itself. Every release has carried these notes
    // and nothing read one until 2026-10-15, on the practitioner's instruction that the manual
    // explain what was changed in the current version and warn of incompatible functionality.
    // A breaking change is said in the summary, not only inside the fold, because a practitioner
    // who does not open the details is exactly the one it is for.
    +(identity.notes?.changes.length
      ?`<details${identity.notes.breaking?' open':''}><summary>What changed in ${esc(identity.notes.version)}`
        +`${identity.notes.breaking?' · <strong>breaking</strong>':''}</summary>`
        +identity.notes.changes.map(change=>`<p class="muted">${change.breaking?'<strong>Breaking.</strong> ':''}`
          +`${esc(change.description)}${change.migration?` <strong>To move:</strong> ${esc(change.migration)}`:''}</p>`).join('')
        +`<p class="muted">Released ${esc(String(identity.notes.released??'date not stated'))}. Earlier releases stay in the registry because a saved workflow may cite one; the palette offers this one.</p></details>`
      :'')
    +'<p class="muted">Compiled into this build. No widget is fetched at runtime.</p>';
}


/** THE CATALOG IS WHAT CAN BE USED, AND WHERE IT HAS BEEN. The practitioner, 2026-11-09: "The widget catalog is linked
 *  in two places. It only needs to show active widgets and the worked example utilization." It had listed every
 *  definition, retired ones too, with versions, digests, ports, checks, this browser's run counts and the packs: a
 *  provenance table no one opened it for. A step's version, digest and independent check stay in its Inspector, where
 *  the step is. Worked-example use is read from widgets/examples.json, the same list widgets/evidence.json counts. */
type Example={title:string;repository:string;uses:string[]};
const EXAMPLES=(examplesCatalog.examples as Example[]);
export const activeWidgetTypes=():NodeType[]=>(Object.keys(TYPES) as NodeType[]).filter(type=>!(kindOf(type) as {retired?:boolean}|undefined)?.retired);

export function openCatalogDialog(esc:Escape):void{
  document.getElementById('catalog-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='catalog-dialog';dialog.setAttribute('aria-labelledby','catalog-title');
  const active=activeWidgetTypes(),usedBy=(type:string)=>EXAMPLES.filter(example=>example.uses.includes(type));
  const used=active.filter(type=>usedBy(type).length).length;
  // The palette's ordering, not a second copy of it: two lists that must agree will not.
  const rows=(group:string)=>active.filter(type=>TYPES[type].group===group).map(type=>{
    const examples=usedBy(type);
    return `<tr data-widget="${esc(type)}"><th scope="row">${TYPES[type].icon} ${esc(TYPES[type].title)}</th>`
      +`<td data-examples="${examples.length}">${examples.length
        ?examples.map(example=>`<a href="${esc(example.repository)}" target="_blank" rel="noopener">${esc(example.title)}</a>`).join('<br>')
        :'<span class="muted">Not in a worked example yet</span>'}</td></tr>`;
  }).join('');
  const groups=PALETTE_GROUPS.filter(group=>active.some(type=>TYPES[type].group===group));
  dialog.innerHTML=`<h2 id="catalog-title">Widget catalog</h2>
    <p>${active.length} widgets you can use. ${used} of them are used in at least one of the ${EXAMPLES.length} worked examples.</p>
    ${groups.map(group=>`<h3>${esc(group)}</h3><table class="catalog-table"><thead><tr><th scope="col">Widget</th><th scope="col">Used in worked examples</th></tr></thead><tbody>${rows(group)}</tbody></table>`).join('')}
    <div class="package-actions"><button id="catalog-close" class="button primary">Close</button></div>`;
  document.body.append(dialog);
  dialog.querySelector<HTMLButtonElement>('#catalog-close')!.onclick=()=>dialog.close();
  dialog.onclose=()=>dialog.remove();
  dialog.showModal();
}
