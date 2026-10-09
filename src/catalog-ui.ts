import registry from '../widgets/registry.json';
import parityRecord from '../widgets/parity.json';
import packCatalog from '../widgets/packs.json';
import classification from '../widgets/classification.json';
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

type Kind={nodeType:string;classification:string;pack?:string};
const kindOf=(nodeType:string)=>(classification.widgets as Kind[]).find(w=>w.nodeType===nodeType);
const packName=(id?:string)=>(packCatalog.packs as {id:string;name:string}[]).find(p=>p.id===id)?.name??id;

export function widgetIdentity(nodeType:string){
  const entry=registry.widgets.find(w=>w.nodeType===nodeType);
  if(!entry)return undefined;
  const release=entry.releases.find(r=>r.version===entry.currentVersion)!;
  const parity=parityFor(entry.id);
  const kind=kindOf(nodeType);
  return {id:entry.id,version:entry.currentVersion,digest:release.sha256,releases:entry.releases.length,
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
      +`<td>${identity?.classification==='domain'?`<span class="tag parity-partial">domain</span> ${esc(String(packName(identity.pack)))}`:'<span class="tag parity-unchecked">standard</span>'}</td>`
      +`<td>${badge(parity?.outcome,!!identity?.stale&&!identity?.parity)}</td></tr>`;
  }).join('');
  const checked=new Set((parityRecord.entries as ParityEntry[]).map(e=>e.widget)).size;
  type Pack={id:string;name:string;version:string;commit:string;kind:string;repository:string;
    admission:{status:string;reason:string;reviews:Record<string,{state:string}>};
    stages:Record<string,string>;files:Record<string,string>;requiredHostCapabilities?:string[]};
  const packs=(packCatalog.packs as unknown as Pack[]).map(pack=>{
    const reviews=Object.entries(pack.admission.reviews).map(([name,review])=>`${esc(name)}: ${esc(review.state)}`).join(' · ');
    const outstanding=pack.requiredHostCapabilities?.length?`Outstanding host capability: ${pack.requiredHostCapabilities.map(esc).join(', ')}.`:'No outstanding host capability.';
    return `<tr><th scope="row">${esc(pack.name)}</th><td>${esc(pack.version)}</td>`
      +`<td><code>${esc(pack.commit.slice(0,12))}</code></td><td>${esc(pack.kind)}</td>`
      +`<td><span class="tag parity-${pack.admission.status==='admitted'?'agrees':'unchecked'}">${esc(pack.admission.status)}</span></td>`
      +`<td>${reviews}</td></tr>`
      +`<tr class="pack-detail"><td colspan="6"><p class="muted">${esc(pack.admission.reason)}</p>`
      +`<p class="muted">${outstanding} ${esc(String(Object.keys(pack.files).length))} files pinned at that commit. Repository: ${esc(pack.repository)}</p></td></tr>`;
  }).join('');
  dialog.innerHTML=`<h2 id="catalog-title">Widget catalog</h2>
    <p>Every definition in this build, with the version and release digest a run receipt cites. Nothing here is fetched and nothing is installable: these widgets are compiled in.</p>
    <div class="detail-row"><span>Application</span><strong>${esc(appPackage.version)}</strong></div>
    <div class="detail-row"><span>Widgets</span><strong>${registry.widgets.length} definitions · ${registry.widgets.reduce((n,w)=>n+w.releases.length,0)} releases</strong></div>
    <div class="detail-row"><span>Standard and domain</span><strong>${classification.standardCount} standard, applying to any domain · ${classification.domainCount} belonging to a pack's domain</strong></div>
    <div class="detail-row"><span>Pack catalog</span><strong>${esc(PACK_CATALOG.version)} · <code>${esc(PACK_CATALOG.digest.slice(0,12))}</code></strong></div>
    <div class="detail-row"><span>Independently checked</span><strong>${checked} of ${registry.widgets.length} widgets</strong></div>
    <p class="muted">Standard widgets are the components that ship with the application and apply to any domain. A domain widget belongs to a pack's domain and maps to that pack's vocabulary; the distinction is derived from those mappings, not declared, so one cannot be filed as the other by accident.</p>
    <p class="muted">A release digest identifies the description of a widget, not a certificate: no widget here is individually certified. An independent check means an external implementation recomputed the same result under a stated criterion, recorded in widgets/parity.json.</p>
    ${groups.map(group=>`<h3>${esc(group)}</h3><table class="catalog-table"><thead><tr><th scope="col">Widget</th><th scope="col">Node type</th><th scope="col">Version</th><th scope="col">Digest</th><th scope="col">Ports</th><th scope="col">Kind</th><th scope="col">Independent check</th></tr></thead><tbody>${rows(group)}</tbody></table>`).join('')}
    <h3>Widget packs</h3>
    <table class="catalog-table" id="pack-table"><thead><tr><th scope="col">Pack</th><th scope="col">Version</th><th scope="col">Commit</th><th scope="col">Kind</th><th scope="col">Admission</th><th scope="col">Reviews</th></tr></thead><tbody>${packs}</tbody></table>
    <div class="notice">A pack cannot be added here, and not because this view lacks a button. The application fetches and executes no pack: every widget above is compiled in, which is an admission rule rather than an omission. The sea-level pack is <strong>declaration-only</strong> — it carries vocabulary, shapes, widget contracts and a worked example, and no widget code, so there is nothing in it to run. Making its workflow runnable means implementing those three contracts in the application, as Tabular data was. Admission states shown here are read from this build's catalog; they are recorded decisions, not checks performed by this page.</div>
    <div class="package-actions"><button id="catalog-close" class="button primary">Close</button></div>`;
  document.body.append(dialog);
  dialog.querySelector<HTMLButtonElement>('#catalog-close')!.onclick=()=>dialog.close();
  dialog.onclose=()=>dialog.remove();
  dialog.showModal();
}
