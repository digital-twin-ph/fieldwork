import registry from '../widgets/registry.json';
import parityRecord from '../widgets/parity.json';
import appPackage from '../package.json';
import {PACK_CATALOG} from './pack-catalog.js';
import {TYPES} from './core.js';
import type {Escape,NodeType} from './types.js';

/** The widget catalog, rendered from the same files the receipts cite: widgets/registry.json for
 *  identity and digests, widgets/parity.json for independent recomputation, and the compiled
 *  definitions for titles and ports. Nothing here is fetched, and nothing is installable — these
 *  definitions are already in this build, which is why showing them is provenance rather than a
 *  storefront. See docs/experiments/49-catalog-in-the-interface.md. */
type ParityEntry={widget:string;coversRelease:string;check:string;outcome:string;measured:string;external:string[];criterion:string;ranAt:string};
const parityFor=(id:string):ParityEntry[]=>(parityRecord.entries as ParityEntry[]).filter(e=>e.widget===id);

export function widgetIdentity(nodeType:string){
  const entry=registry.widgets.find(w=>w.nodeType===nodeType);
  if(!entry)return undefined;
  const release=entry.releases.find(r=>r.version===entry.currentVersion)!;
  const parity=parityFor(entry.id);
  return {id:entry.id,version:entry.currentVersion,digest:release.sha256,releases:entry.releases.length,
    parity:parity.find(p=>p.coversRelease===entry.currentVersion),stale:parity.find(p=>p.coversRelease!==entry.currentVersion)};
}

const badge=(outcome?:string,stale?:boolean)=>outcome
  ?`<span class="tag parity-${outcome}">${outcome}${stale?' · earlier release':''}</span>`
  :'<span class="tag parity-unchecked">not checked</span>';

/** Identity of the definition behind one node, for the inspector. */
export function identityMarkup(nodeType:string,esc:Escape):string{
  const identity=widgetIdentity(nodeType);
  if(!identity)return '';
  const parity=identity.parity??identity.stale;
  return '<div class="inspector-divider"></div><span class="inspector-section">Definition</span>'
    +`<div class="detail-row"><span>Widget</span><strong>${esc(identity.id.replace('urn:fieldwork:widget:',''))} ${esc(identity.version)}</strong></div>`
    +`<div class="detail-row"><span>Release digest</span><strong><code>${esc(identity.digest.slice(0,12))}</code></strong></div>`
    +`<div class="detail-row"><span>Independent check</span><strong>${badge(parity?.outcome,!!identity.stale&&!identity.parity)}</strong></div>`
    +(parity?`<details><summary>What was checked</summary><p class="muted">${esc(parity.measured)}</p><p class="muted">Against ${esc(parity.external.join(', '))}; criterion: ${esc(parity.criterion)}. Covers release ${esc(parity.coversRelease)}.</p></details>`:'')
    +'<p class="muted">Compiled into this build. No widget is fetched at runtime.</p>';
}

export function openCatalogDialog(esc:Escape):void{
  document.getElementById('catalog-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='catalog-dialog';dialog.setAttribute('aria-labelledby','catalog-title');
  const groups=['Sources','Spatial operations','Semantic reasoning','Summaries','Outputs'];
  const rows=(group:string)=>Object.keys(TYPES).filter(type=>TYPES[type as NodeType].group===group).map(type=>{
    const definition=TYPES[type as NodeType],identity=widgetIdentity(type);
    const ports=definition.inputs.map(([port])=>port).join(', ')||'none';
    const parity=identity?.parity??identity?.stale;
    return `<tr data-widget="${esc(type)}"><th scope="row">${definition.icon} ${esc(definition.title)}</th>`
      +`<td><code>${esc(type)}</code></td>`
      +`<td>${identity?esc(identity.version):'—'}</td>`
      +`<td><code>${identity?esc(identity.digest.slice(0,12)):'—'}</code></td>`
      +`<td>${esc(ports)} → ${esc(definition.output??'none')}</td>`
      +`<td>${badge(parity?.outcome,!!identity?.stale&&!identity?.parity)}</td></tr>`;
  }).join('');
  const checked=new Set((parityRecord.entries as ParityEntry[]).map(e=>e.widget)).size;
  dialog.innerHTML=`<h2 id="catalog-title">Widget catalog</h2>
    <p>Every definition in this build, with the version and release digest a run receipt cites. Nothing here is fetched and nothing is installable: these widgets are compiled in.</p>
    <div class="detail-row"><span>Application</span><strong>${esc(appPackage.version)}</strong></div>
    <div class="detail-row"><span>Widgets</span><strong>${registry.widgets.length} definitions · ${registry.widgets.reduce((n,w)=>n+w.releases.length,0)} releases</strong></div>
    <div class="detail-row"><span>Pack catalog</span><strong>${esc(PACK_CATALOG.version)} · <code>${esc(PACK_CATALOG.digest.slice(0,12))}</code></strong></div>
    <div class="detail-row"><span>Independently checked</span><strong>${checked} of ${registry.widgets.length} widgets</strong></div>
    <p class="muted">A release digest identifies the description of a widget, not a certificate: no widget here is individually certified. An independent check means an external implementation recomputed the same result under a stated criterion, recorded in widgets/parity.json.</p>
    ${groups.map(group=>`<h3>${esc(group)}</h3><table class="catalog-table"><thead><tr><th scope="col">Widget</th><th scope="col">Node type</th><th scope="col">Version</th><th scope="col">Digest</th><th scope="col">Ports</th><th scope="col">Independent check</th></tr></thead><tbody>${rows(group)}</tbody></table>`).join('')}
    <div class="package-actions"><button id="catalog-close" class="button primary">Close</button></div>`;
  document.body.append(dialog);
  dialog.querySelector<HTMLButtonElement>('#catalog-close')!.onclick=()=>dialog.close();
  dialog.onclose=()=>dialog.remove();
  dialog.showModal();
}
