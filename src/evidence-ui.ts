import type {WorkflowNode,Escape} from './types.js';
import type {EvidenceReference,ReferenceRole} from './evidence.js';
import {REFERENCE_ROLES,referenceURL,validateReferences} from './evidence.js';
import {attachPDF,readPDF,verifiedPDF} from './evidence-storage.js';
import {errorMessage,required} from './guards.js';

const esc:Escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function evidenceInspector(node:WorkflowNode):string {
  const refs=node.references||[];
  return `<section class="node-evidence"><div class="inspector-divider"></div><h3>Evidence references (${refs.length})</h3><p class="description">Record where the data came from, or the evidence supporting this step.</p>${refs.length?`<ul>${refs.map(r=>`<li>${esc(r.title)} <small>${esc(REFERENCE_ROLES[r.role])} · ${r.kind==='pdf'?'PDF':'URL'}</small></li>`).join('')}</ul>`:'<p class="muted">No references attached yet.</p>'}<button id="manage-references" class="button small">Manage references</button></section>`;
}
const markup=`<dialog id="evidence-dialog" aria-labelledby="evidence-title">
  <div class="area-dialog-heading"><div><h2 id="evidence-title">Evidence references</h2><p id="evidence-node" class="muted"></p></div><button id="evidence-close" class="icon-button" aria-label="Close references">×</button></div>
  <div class="evidence-body"><p>Document a data source, method, assumption or background reference. Attaching a reference does not verify it or make it a reasoning input.</p>
    <div id="evidence-list"></div>
    <form id="reference-form"><h3 id="reference-form-title">Add a reference</h3>
      <div class="evidence-fields"><label>Reference type<select id="reference-kind"><option value="url">Web URL</option><option value="pdf">Upload PDF</option></select></label>
      <label>What does it support?<select id="reference-role"><option value="data">Data source</option><option value="method">Method or processing step</option><option value="assumption">Assumption or parameter</option><option value="context">Background context</option></select></label></div>
      <label>Title <input id="reference-title" maxlength="200" placeholder="Annual census 2022" required></label>
      <label id="reference-url-field">URL <input id="reference-url" type="url" maxlength="2000" placeholder="https://..."></label>
      <label id="reference-pdf-field" hidden>PDF file <input id="reference-pdf" type="file" accept="application/pdf,.pdf"><small id="reference-file-hint">Up to 5 MB per PDF, 10 MB total per workflow. Stored on this device and included in Export.</small></label>
      <div class="evidence-fields"><label>Author or organization <input id="reference-authors" maxlength="300" placeholder="Census office"></label><label>Publication date or year <input id="reference-published" maxlength="100" placeholder="2022"></label></div>
      <label>Page, table or section <input id="reference-locator" maxlength="200" placeholder="Table 4, page 27"></label>
      <label>How this supports the node <textarea id="reference-notes" rows="3" maxlength="2000" placeholder="Population totals used as the sampling denominator."></textarea></label>
      <p class="muted">URLs are saved as links; their contents are not downloaded. PDFs are retained exactly as uploaded, without text extraction.</p>
    </form>
  </div>
  <div class="area-dialog-actions evidence-actions"><p id="evidence-error" class="evidence-error" role="alert" hidden></p><span id="evidence-status" role="status"></span><button id="reference-cancel-edit" class="button" type="button">Clear draft</button><button id="reference-save" form="reference-form" type="submit" class="button primary">Save reference</button>
    <div id="reference-discard" role="alert" hidden><p>This reference has unsaved changes.</p><button id="reference-keep" class="button">Keep editing</button><button id="reference-discard-confirm" class="button danger">Discard draft</button></div>
  </div>
</dialog>`;

export function openEvidenceEditor(node:WorkflowNode,onSave:(refs:EvidenceReference[])=>boolean):void {
  if(!document.querySelector('#evidence-dialog'))document.body.insertAdjacentHTML('beforeend',markup);
  const dialog=required(document.querySelector<HTMLDialogElement>('#evidence-dialog'));
  const el=<T extends HTMLElement=HTMLElement>(id:string)=>required(dialog.querySelector<T>('#'+id));
  const input=(id:string)=>el<HTMLInputElement>(id),select=(id:string)=>el<HTMLSelectElement>(id);
  let refs=structuredClone(node.references||[]),editing:string|null=null,dirty=false,saving=false,closeAfterDiscard=false;
  const fail=(error:unknown)=>{el('evidence-error').textContent=errorMessage(error);el('evidence-error').hidden=false;};
  const clearError=()=>{el('evidence-error').hidden=true;el('evidence-error').textContent='';};
  el('evidence-node').textContent=node.params.label||node.type;
  const kind=()=>{const pdf=select('reference-kind').value==='pdf';el('reference-url-field').hidden=pdf;el('reference-pdf-field').hidden=!pdf;input('reference-url').required=!pdf;};
  function reset(){
    el<HTMLFormElement>('reference-form').reset();editing=null;dirty=false;el('reference-discard').hidden=true;
    select('reference-role').value=['area','places','centers','observations','facilities','alert'].includes(node.type)?'data':'method';
    el('reference-form-title').textContent='Add a reference';el('reference-file-hint').textContent='Up to 5 MB per PDF, 10 MB total per workflow. Stored on this device and included in Export.';kind();
  }
  function edit(ref:EvidenceReference){
    reset();editing=ref.id;el('reference-form-title').textContent='Edit reference';select('reference-kind').value=ref.kind;select('reference-role').value=ref.role;
    for(const key of ['title','authors','published','locator','notes'] as const)el<HTMLInputElement|HTMLTextAreaElement>('reference-'+key).value=ref[key];
    if(ref.kind==='url')input('reference-url').value=ref.url;
    else el('reference-file-hint').textContent=`Current file: ${ref.filename}. Choose a file only to replace or restore it.`;
    kind();input('reference-title').focus();
  }
  async function renderList(){
    const list=el('evidence-list');
    list.innerHTML=refs.map(ref=>`<article class="evidence-card" data-reference="${esc(ref.id)}"><h3>${esc(ref.title)}</h3><p>${esc(REFERENCE_ROLES[ref.role])}${ref.authors?' · '+esc(ref.authors):''}${ref.published?' · '+esc(ref.published):''}</p>${ref.locator?`<p>Locator: ${esc(ref.locator)}</p>`:''}${ref.notes?`<p>${esc(ref.notes)}</p>`:''}${ref.kind==='url'?`<a href="${esc(referenceURL(ref.url))}" target="_blank" rel="noopener noreferrer">Open URL ↗</a><p class="muted evidence-url">${esc(ref.url)}</p>`:`<p>${esc(ref.filename)} · ${(ref.bytes/1000).toFixed(1)} KB</p><small class="evidence-hash">SHA-256: ${ref.sha256}</small><p data-file-status role="status">Checking local PDF…</p><button class="button small" data-download="${esc(ref.id)}">Download PDF</button>`}<small>Added ${esc(ref.addedAt)} · updated ${esc(ref.modifiedAt)}</small><div class="inspector-actions"><button class="button small" data-edit-reference="${esc(ref.id)}">Edit reference</button><button class="button small danger" data-remove-reference="${esc(ref.id)}">Remove reference</button></div></article>`).join('')||'<p class="notice">No references attached to this node.</p>';
    for(const button of list.querySelectorAll<HTMLButtonElement>('[data-edit-reference]'))button.onclick=()=>{if(saving)return;if(dirty){fail('Save or clear the current draft before editing another reference.');return;}clearError();edit(required(refs.find(r=>r.id===button.dataset.editReference)));};
    for(const button of list.querySelectorAll<HTMLButtonElement>('[data-remove-reference]'))button.onclick=()=>{
      if(saving)return;if(dirty){fail('Save or clear the draft before removing a reference.');return;}
      const next=refs.filter(r=>r.id!==button.dataset.removeReference);
      try{if(!onSave(next))throw new Error('Reference could not be removed from saved workflow. Try again.');refs=next;reset();clearError();el('evidence-status').textContent='Reference removed. Undo in the canvas restores it.';void renderList();}catch(error){fail(error);}
    };
    for(const button of list.querySelectorAll<HTMLButtonElement>('[data-download]'))button.onclick=async()=>{
      const ref=refs.find(r=>r.id===button.dataset.download);if(ref?.kind!=='pdf')return;
      try{const bytes=await verifiedPDF(ref),url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'})),a=document.createElement('a');a.href=url;a.download=ref.filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}catch(error){fail(error);}
    };
    for(const ref of refs)if(ref.kind==='pdf'){
      const card=list.querySelector(`[data-reference="${ref.id}"]`),status=card?.querySelector('[data-file-status]');
      try{const file=await readPDF(ref.sha256);if(status)status.textContent=file?'PDF available on this device (offline).':'PDF missing on this device. Edit to reattach it, or import a bundle.';}catch(error){if(status)status.textContent=errorMessage(error);}
    }
  }
  const requestDiscard=(close:boolean)=>{if(saving)return;closeAfterDiscard=close;if(dirty){el('reference-discard').hidden=false;el('reference-keep').focus();}else if(close)dialog.close();else reset();};
  el('evidence-close').onclick=()=>requestDiscard(true);
  el('reference-cancel-edit').onclick=()=>requestDiscard(false);
  el('reference-keep').onclick=()=>{el('reference-discard').hidden=true;};
  el('reference-discard-confirm').onclick=()=>{reset();clearError();if(closeAfterDiscard)dialog.close();};
  dialog.oncancel=e=>{e.preventDefault();requestDiscard(true);};
  dialog.oninput=()=>{dirty=true;clearError();el('evidence-status').textContent='Unsaved reference — choose Save reference.';};
  select('reference-kind').onchange=kind;
  input('reference-pdf').onchange=()=>{dirty=true;const file=input('reference-pdf').files?.[0];if(file&&!input('reference-title').value)input('reference-title').value=file.name.replace(/\.pdf$/i,'');};
  el<HTMLFormElement>('reference-form').onsubmit=async e=>{
    e.preventDefault();if(saving)return;saving=true;clearError();el<HTMLButtonElement>('reference-save').disabled=true;
    const controls=[...dialog.querySelectorAll<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>('input,select,textarea')];controls.forEach(control=>control.disabled=true);
    try{
      const previous=refs.find(r=>r.id===editing),now=new Date().toISOString();
      const metadata={id:previous?.id||crypto.randomUUID(),title:input('reference-title').value.trim(),role:select('reference-role').value as ReferenceRole,authors:input('reference-authors').value.trim(),published:input('reference-published').value.trim(),locator:input('reference-locator').value.trim(),notes:el<HTMLTextAreaElement>('reference-notes').value.trim(),addedAt:previous?.addedAt||now,modifiedAt:now};
      let ref:EvidenceReference;
      if(select('reference-kind').value==='url')ref={...metadata,kind:'url',url:referenceURL(input('reference-url').value.trim())};
      else{const file=input('reference-pdf').files?.[0];if(file){ref={...metadata,...await attachPDF(file)};}else if(previous?.kind==='pdf')ref={...previous,...metadata};else throw new Error('Choose a PDF file to attach.');}
      const next=editing?refs.map(r=>r.id===editing?ref:r):[...refs,ref];validateReferences(next);
      if(!onSave(next))throw new Error('Reference could not be saved on this device. The draft is still open; try again.');
      refs=next;reset();el('evidence-status').textContent='Reference saved on this device. Rerun to include it in run evidence.';void renderList();
    }catch(error){fail(error);}finally{saving=false;controls.forEach(control=>control.disabled=false);el<HTMLButtonElement>('reference-save').disabled=false;}
  };
  reset();clearError();el('evidence-status').textContent='Saved references travel with workflow exports.';void renderList();dialog.showModal();
}
