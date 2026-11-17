/** AFFILIATIONS IN AN IDENTITY FILE, WITH THEIR ROR IDs (2026-11-16). The practitioner: "How do co-authors' ORCIDs and
 *  RORs end up on my copy of the notes/publication?" An affiliation is the name the person writes on a paper; its ROR ID
 *  says which organisation of that name is meant. Found on ROR by name, or typed and checked: offline by its checksum,
 *  then on ROR when asked. Found is not verified: anyone can type an organisation they do not belong to. */

import {validRor,rorId,type Affiliation} from './identity-file.js';

type Escape=(value:unknown)=>string;
const ROR_API='https://api.ror.org/v2/organizations';

interface RorRecord {id?:string;names?:{value?:string;types?:string[]}[];locations?:{geonames_details?:{name?:string;country_name?:string}}[]}
const displayName=(r:RorRecord)=>r.names?.find(n=>n.types?.includes('ror_display'))?.value??r.names?.[0]?.value??'';
const place=(r:RorRecord)=>{const g=r.locations?.[0]?.geonames_details;return [g?.name,g?.country_name].filter(Boolean).join(', ');};

function row(prefix:string,i:number,a:Affiliation,esc:Escape):string{
  const id=`${prefix}-aff-${i}`;
  return `<li class="affiliation-row" data-affiliation>`
    +`<label class="field-label" for="${id}-name">Organisation, as on a paper</label>`
    +`<div class="lookup-row"><input id="${id}-name" data-aff-name maxlength="200" value="${esc(a.name)}"><button type="button" class="button small" data-aff-find>Find on ROR</button></div>`
    +`<label class="field-label" for="${id}-ror">ROR ID (optional), such as 05qwgg493</label>`
    +`<div class="lookup-row"><input id="${id}-ror" data-aff-ror maxlength="40" autocomplete="off" value="${esc(a.ror??'')}" aria-describedby="${id}-check"><button type="button" class="button small" data-aff-check>Check on ROR</button></div>`
    +`<p id="${id}-check" class="field-check" aria-live="polite"></p><div data-aff-matches></div>`
    +`<button type="button" class="button small" data-aff-remove>Remove this affiliation</button></li>`;
}

/** Draws the editor into `root`, holding `initial`. */
export function affiliationEditor(root:HTMLElement,prefix:string,initial:readonly Affiliation[],esc:Escape):void{
  const draw=(list:Affiliation[])=>{
    root.innerHTML=`<fieldset class="affiliations"><legend>Affiliations (optional), in the order a paper lists them</legend>`
      +`<ol class="affiliation-list">${list.map((a,i)=>row(prefix,i,a,esc)).join('')}</ol>`
      +`<button type="button" class="button small" data-aff-add>Add an affiliation</button></fieldset>`;
    root.querySelector<HTMLButtonElement>('[data-aff-add]')!.onclick=()=>{draw([...readAffiliationEditor(root,true),{name:''}]);
      root.querySelectorAll<HTMLInputElement>('[data-aff-name]').item(list.length)?.focus();};
    root.querySelectorAll<HTMLElement>('[data-affiliation]').forEach((li,i)=>{
      const name=li.querySelector<HTMLInputElement>('[data-aff-name]')!,ror=li.querySelector<HTMLInputElement>('[data-aff-ror]')!;
      const check=li.querySelector<HTMLElement>('.field-check')!,matches=li.querySelector<HTMLElement>('[data-aff-matches]')!;
      const say=(text:string,tone='')=>{check.textContent=text;check.className=`field-check ${tone}`;};
      const checkTyped=()=>{const v=ror.value.trim();if(!v)return say('');
        say(validRor(v)?'The checksum is right.':'Not a ROR ID: nine characters, starting with 0, and the last two a checksum.',validRor(v)?'is-good':'is-bad');};
      ror.oninput=checkTyped;
      li.querySelector<HTMLButtonElement>('[data-aff-remove]')!.onclick=()=>{const all=readAffiliationEditor(root,true);all.splice(i,1);draw(all);};
      li.querySelector<HTMLButtonElement>('[data-aff-check]')!.onclick=async()=>{
        const id=rorId(ror.value);if(!id||!validRor(id))return checkTyped();
        say('Looking up…');
        try{const r=await fetch(`${ROR_API}/${id}`,{headers:{Accept:'application/json'},cache:'no-store'});
          if(r.status===404)return say(`No organisation on ROR with the ID ${id}.`,'is-bad');
          if(!r.ok)return say(`Could not look it up just now (ROR answered ${r.status}).`);
          const record=await r.json() as RorRecord;
          say(`ROR: ${displayName(record)}${place(record)?`, ${place(record)}`:''}. Is this the one?`,'is-good');}
        catch{say('Could not reach ROR: offline, or blocked. The ID is kept as typed.');}};
      li.querySelector<HTMLButtonElement>('[data-aff-find]')!.onclick=async()=>{
        const q=name.value.trim();if(!q){say('Type the organisation\'s name first.','is-bad');name.focus();return;}
        say('Searching ROR…');matches.innerHTML='';
        try{const r=await fetch(`${ROR_API}?query=${encodeURIComponent(q)}`,{headers:{Accept:'application/json'},cache:'no-store'});
          if(!r.ok)return say(`Could not search just now (ROR answered ${r.status}).`);
          const items=((await r.json() as {items?:RorRecord[]}).items??[]).slice(0,5);
          if(!items.length)return say(`ROR has no organisation matching "${q}". Keep the name as written, without a ROR ID.`);
          say(`${items.length} on ROR. Choose yours, or keep the name as written:`);
          matches.innerHTML=`<ul class="affiliation-matches">${items.map((m,j)=>`<li><button type="button" class="button small" data-aff-pick="${j}">`
            +`${esc(displayName(m))}${place(m)?` · ${esc(place(m))}`:''} · ${esc(rorId(m.id??'')??'')}</button></li>`).join('')}</ul>`;
          matches.querySelectorAll<HTMLButtonElement>('[data-aff-pick]').forEach(b=>b.onclick=()=>{
            const m=items[Number(b.dataset.affPick)]!;name.value=displayName(m);ror.value=rorId(m.id??'')??'';matches.innerHTML='';
            say(`Chosen: ${displayName(m)}, ROR ${ror.value}.`,'is-good');ror.focus();});}
        catch{say('Could not reach ROR: offline, or blocked. Keep the name as written.');}};
    });
  };
  draw(initial.length?[...initial]:[]);
}

/** What the editor holds. A row with no name is dropped; `keepEmpty` keeps it, for redrawing. */
export function readAffiliationEditor(root:HTMLElement,keepEmpty=false):Affiliation[]{
  return [...root.querySelectorAll<HTMLElement>('[data-affiliation]')].flatMap(li=>{
    const name=li.querySelector<HTMLInputElement>('[data-aff-name]')!.value.trim(),raw=li.querySelector<HTMLInputElement>('[data-aff-ror]')!.value.trim();
    if(!name&&!keepEmpty)return [];
    return [{name,...(raw?{ror:rorId(raw)??raw}:{})}];});
}

/** An affiliation as a byline shows it. */
export const affiliationLabel=(a:Affiliation,esc:Escape)=>a.ror
  ?`${esc(a.name)} (<a href="https://ror.org/${esc(a.ror)}" target="_blank" rel="noopener">ROR ${esc(a.ror)}</a>)`:esc(a.name);
