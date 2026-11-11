/** WHAT CHANGED IN THIS VERSION (the practitioner, 2026-11-10: "When I click on the FW version button, can we show a
 *  modal dialog that describes the changelog for the version?"). The notes are CHANGELOG.md's, split by version at build
 *  time into build/changelog.json and carried with the application, so they open offline too. */
import {toHTML} from './prose.js';

interface Release {version:string; date:string; markdown:string}
const SOURCE='https://github.com/digital-twin-ph/fieldwork/blob/main/CHANGELOG.md';

export async function openChangelog(version:string,esc:(v:string)=>string):Promise<void>{
  document.getElementById('changelog-dialog')?.remove();
  const dialog=document.createElement('dialog');
  dialog.id='changelog-dialog';
  dialog.setAttribute('aria-labelledby','changelog-title');
  document.body.append(dialog);
  const close=()=>{dialog.close();dialog.remove();};
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  let releases:Release[]=[];
  try{
    const response=await fetch('./build/changelog.json');
    if(!response.ok)throw new Error(String(response.status));
    releases=(await response.json() as {releases:Release[]}).releases;
  }catch(error){
    dialog.innerHTML=`<div class="manual-head"><h2 id="changelog-title">Fieldwork v${esc(version)}</h2>`
      +`<button class="button" id="changelog-close">Close</button></div>`
      +`<p>The release notes could not be read (${esc(error instanceof Error?error.message:String(error))}). `
      +`They are also at <a href="${SOURCE}" target="_blank" rel="noopener noreferrer">CHANGELOG.md</a>.</p>`;
    dialog.querySelector<HTMLButtonElement>('#changelog-close')!.onclick=close;
    dialog.showModal();return;
  }
  let index=Math.max(0,releases.findIndex(r=>r.version===version));
  const show=()=>{
    const r=releases[index]!,newer=releases[index-1],older=releases[index+1];
    dialog.innerHTML=`<div class="manual-head"><h2 id="changelog-title">What changed in v${esc(r.version)}</h2>`
      +`<button class="button" id="changelog-close">Close</button></div>`
      +`<p class="muted">${esc(r.date)}${r.version===version?' · the version you are running':''}</p>`
      +`<article class="manual-body">${toHTML(r.markdown,{links:true})}</article>`
      +`<div class="changelog-nav">`
        +(older?`<button class="button" id="changelog-older">← v${esc(older.version)}</button>`:'')
        +(newer?`<button class="button" id="changelog-newer">v${esc(newer.version)} →</button>`:'')
        +(r.version!==version&&releases.some(x=>x.version===version)?`<button class="button" id="changelog-current">Back to v${esc(version)}</button>`:'')
      +`</div><p class="muted">Every version: <a href="${SOURCE}" target="_blank" rel="noopener noreferrer">CHANGELOG.md</a>.</p>`;
    dialog.querySelector<HTMLButtonElement>('#changelog-close')!.onclick=close;
    const go=(id:string,to:number)=>{const b=dialog.querySelector<HTMLButtonElement>(id);if(b)b.onclick=()=>{index=to;show();dialog.querySelector<HTMLElement>('#changelog-title')?.focus();};};
    go('#changelog-older',index+1);go('#changelog-newer',index-1);go('#changelog-current',releases.findIndex(x=>x.version===version));
  };
  show();
  dialog.showModal();
}
