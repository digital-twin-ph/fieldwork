/** THE DIALOG FOR FIND SATELLITE PRODUCTS, in Fieldwork's dialog style.
 *
 *  Layout, step order and wording adapted from JLT's EO Satellite Guide, *Start with a research question*
 *  (https://github.com/jltobias/JupyterLite-EO-Satellite-Guide, commit 684833c, MIT): a question box, topic chips, the
 *  chain from question to collection, the caution, and one card per route. The practitioner, 2026-11-05: *"Let's follow
 *  FW style for dialogs."* Each card adds what Fieldwork has read: what the product measures and its unit, sign-in,
 *  the licence as read, whether a browser can read it, the quality rule. Experiment 179. */
import type {Escape} from './types.js';
import {SATELLITE_TOPICS,SIGN_IN_WORDS,VENDORED,productsFor,resolve,type SatelliteProduct,type SatelliteTopic,type DatasetCitation}
  from './satellite-products.js';

const QUANTITY:Record<string,string>={column:'a column through the atmosphere','optical-depth':'an optical depth, unitless',
  index:'an index, unitless',surface:'a near-surface value'};

/** The dataset citation with its DOI as a link, and which files it covers; or that nobody has read one. */
export function citationMarkup(c:DatasetCitation|null,esc:Escape):string{
  if(!c)return '<span class="muted">not yet read for this product</span>';
  return `${esc(c.text)}${c.doi?` <a href="https://doi.org/${esc(c.doi)}" target="_blank" rel="noopener">doi:${esc(c.doi)}</a>`:''}`
    +` <span class="muted">(for ${esc(c.appliesTo)}; read ${esc(c.readOn)})</span>`;
}

export function productCard(p:SatelliteProduct,chosen:boolean,esc:Escape):string{
  const f=p.facts;
  const row=(label:string,value:string)=>`<div class="detail-row"><span>${esc(label)}</span><strong>${value}</strong></div>`;
  return `<article class="rule-card satellite-card${chosen?' is-chosen':''}" data-sat-route="${esc(p.route.id)}">`
    +`<header><h3>${esc(p.route.label)}</h3>`
    +`<span class="tag ${f?.signIn==='account'?'parity-partial':f?'parity-agrees':'parity-unchecked'}">`
    +`${esc(f?SIGN_IN_WORDS[f.signIn]:'Access not checked')}</span></header>`
    +`<p class="muted">${esc(p.route.measurement)} · ${esc(p.route.format)}</p>`
    +row('Measures',esc(f?(QUANTITY[f.quantity]??f.quantity):'not yet read'))
    +row('Unit',f?.unit?`${esc(f.unit)} <span class="muted">(${esc(f.unitReadFrom??'')})</span>`
      :'<span class="muted">read from the file when it is opened</span>')
    +row('Licence',p.licence?`${p.licence.open?'Open':'Restricted'}: ${esc(p.licence.name)} `
      +`<span class="muted">(read ${esc(p.licence.readOn)})</span>`:'<span class="muted">not yet read</span>')
    +row('In a browser',esc(f?.browserReadable??'not checked'))
    +row('Citation',citationMarkup(f?.citation??null,esc))
    +(f?.qualityRule?row('Quality',esc(f.qualityRule)):'')
    +(f?.coverageStart?row('Data from',esc(f.coverageStart)):'')
    +(f?.kind==='model'?'<p class="notice">A model, not an observation.</p>':'')
    +(p.licence?.catalogSays?`<p class="muted satellite-note">The catalog says ${esc(p.licence.catalogSays)}.</p>`:'')
    +`<p class="muted satellite-note">Catalog <code>${esc(p.route.endpoint)}</code> · collection <code>${esc(p.route.collection)}</code>`
    +(p.route.productType?` · product <code>${esc(p.route.productType)}</code>`:'')
    +` · curated by ${p.curatedBy==='fieldwork'?'Fieldwork':'the EO Satellite Guide'}, ${esc(p.route.verified)}</p>`
    +`<div class="inspector-actions"><button class="button ${chosen?'':'primary '}small" data-sat-choose="${esc(p.route.id)}"`
    +`${chosen?' disabled':''}>${chosen?'Chosen':'Choose this product'}</button></div></article>`;
}

/** The results for a question: the topics it names, then each topic's products, open ones first. */
export function resultsMarkup(question:string,chosenRoute:string|undefined,esc:Escape):string{
  const {topics}=resolve(question);
  if(!question.trim())return '<p class="muted">Type a topic or a measurement, or choose one above.</p>';
  if(!topics.length)return `<p class="notice">Nothing curated matches “${esc(question)}” yet. `
    +'The topics above are the ones with curated products.</p>';
  return topics.map((t:SatelliteTopic)=>{
    const products=productsFor(t);
    return `<section class="satellite-topic" data-sat-topic="${esc(t.id)}">`
      +`<h3>${products.length} candidate product${products.length===1?'':'s'} · ${esc(t.label)}</h3>`
      +(t.chain?`<p class="muted">${esc(t.chain)}</p>`:'')
      +(t.caution?`<p class="notice notice-warning satellite-caution">${esc(t.caution)}</p>`:'')
      +products.map(p=>productCard(p,p.route.id===chosenRoute,esc)).join('')+`</section>`;
  }).join('');
}

export function openProductsDialog(initial:{question?:string;route?:string},esc:Escape,
  onChoose:(choice:{question:string;topic:string;route:string})=>void):void{
  const dialog=document.createElement('dialog');
  dialog.id='satellite-products-dialog';dialog.className='wide-dialog satellite-dialog';
  dialog.setAttribute('aria-labelledby','satellite-products-title');
  let question=initial.question??'',chosen=initial.route;
  const close=()=>{dialog.close();dialog.remove();};
  dialog.innerHTML=`<div class="manual-head"><h2 id="satellite-products-title">Find satellite products</h2>`
    +`<div><button class="button primary" id="sat-close">Done</button></div></div>`
    +`<p class="muted">Start with a research question: which satellites and products measure it, and what each one `
    +`measures. Products needing no sign-in come first. Nothing is downloaded here.</p>`
    +`<div class="field"><label class="field-label" for="sat-question">Research topic or measurement</label>`
    +`<div class="satellite-ask"><input id="sat-question" type="search" autocomplete="off" placeholder="NO2, aerosols, ozone…" `
    +`value="${esc(question)}"><button class="button primary" id="sat-find">Find data pathways</button></div></div>`
    +`<div class="satellite-chips" role="group" aria-label="Topics">`
    +SATELLITE_TOPICS.map(t=>`<button class="chip" data-sat-chip="${esc(t.aliases[0]??t.id)}">${esc(t.label)}</button>`).join('')
    +`</div><div id="sat-results"></div>`
    +`<p class="muted satellite-note">Topics and routes from JLT's <a href="${esc(VENDORED.repository)}" target="_blank" `
    +`rel="noopener">EO Satellite Guide</a> (MIT), commit ${esc(VENDORED.commit.slice(0,7))}; Fieldwork's additions read in `
    +`experiment 179.</p>`;
  const results=dialog.querySelector<HTMLElement>('#sat-results')!;
  const input=dialog.querySelector<HTMLInputElement>('#sat-question')!;
  const show=()=>{
    results.innerHTML=resultsMarkup(question,chosen,esc);
    results.querySelectorAll<HTMLButtonElement>('[data-sat-choose]').forEach(button=>{
      button.onclick=()=>{
        const route=button.dataset.satChoose!;
        const topic=button.closest<HTMLElement>('[data-sat-topic]')?.dataset.satTopic??'';
        chosen=route;onChoose({question,topic,route});show();
      };
    });
  };
  input.oninput=()=>{question=input.value;show();};
  dialog.querySelector<HTMLButtonElement>('#sat-find')!.onclick=()=>{question=input.value;show();};
  dialog.querySelectorAll<HTMLButtonElement>('[data-sat-chip]').forEach(chip=>{
    chip.onclick=()=>{question=chip.dataset.satChip!;input.value=question;show();};
  });
  dialog.querySelector<HTMLButtonElement>('#sat-close')!.onclick=close;
  show();
  document.body.append(dialog);
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.showModal();
}
