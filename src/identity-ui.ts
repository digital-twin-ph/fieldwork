/** THE IDENTITY BUTTON (experiment 218, the spike of 2026-11-16): make your identity file, open it, lock it.
 *
 *  Apart from Credentials on purpose: an identity is not a credential. Until this, identity came only as a side effect
 *  of unlocking a GitHub token there, under a label that did not say so. The open identity is held here, in memory,
 *  and nowhere else: never in browser storage; locked after fifteen idle minutes and when the page goes. */
import {createIdentityFile,openIdentityFile,updateIdentityFile,validOrcid,type OpenIdentity} from './identity-file.js';
import {AVATAR_COLOURS,AVATAR_ICONS,avatarSvg,iconSvg,keyPatternSvg,type AvatarChoice} from './avatars.js';
import type {Escape} from './types.js';

const IDLE_MS=15*60*1000;
let open:OpenIdentity|null=null;
let lastActivity=Date.now();
const listeners=new Set<()=>void>();

/** The identity open in this tab, or null. Asking counts as activity only through the person's own input. */
export function openIdentity():OpenIdentity|null{
  if(open&&Date.now()-lastActivity>=IDLE_MS)lock();
  return open;
}
export function onIdentityChange(listener:()=>void){listeners.add(listener);}
function set(next:OpenIdentity|null){open=next;if(next)markOpenedHere();listeners.forEach(l=>l());}
/** WHETHER AN IDENTITY HAS BEEN OPENED ON THIS DEVICE: a yes, nothing of the identity, so the dialog can lead with Open
 *  for someone who has a file and with Make for someone who does not. */
const OPENED_KEY='fieldwork-identity-opened-v1';
function openedHere():boolean{try{return localStorage.getItem(OPENED_KEY)==='yes';}catch{return false;}}
function markOpenedHere(){try{localStorage.setItem(OPENED_KEY,'yes');}catch{/* a convenience only */}}
function lock(){if(open)set(null);}

/** The name as a byline: the name, then the GitHub login and ORCID iD where the file carries them. */
export const identityLabel=(p:{name:string;login?:string;orcid?:string})=>
  [p.name,p.login?`@${p.login}`:'',p.orcid?`ORCID ${p.orcid}`:''].filter(Boolean).join(' · ');

const DIALOG=`<dialog id="identity-dialog" aria-labelledby="identity-title"><div class="dlg">
<div class="dlg-head"><h3 id="identity-title">Identity</h3></div>
<div class="dlg-body identity-body">
<p>Your identity file says who you are and holds the key that signs your notes, so anyone can check who wrote what.
It is yours to keep, like a key: Fieldwork never stores it. It holds no passwords or tokens for any service.</p>
<div class="identity-who"><span id="identity-avatar"></span><p id="identity-status" class="identity-status" role="status"></p></div>
<div class="result-switch identity-tabs" role="tablist" aria-label="Identity file">
<button type="button" role="tab" id="identity-tab-make" data-identity-tab="make" aria-controls="identity-create-part">Make my identity file</button>
<button type="button" role="tab" id="identity-tab-open" data-identity-tab="open" aria-controls="identity-open-part">Open my identity file</button></div>
<section id="identity-open-part" role="tabpanel" aria-labelledby="identity-tab-open">
<label class="field-label" for="identity-file">Identity file (.fwid)</label><input id="identity-file" type="file" accept=".fwid,application/json">
<label class="field-label" for="identity-passphrase">Passphrase</label><input id="identity-passphrase" type="password" autocomplete="off">
<button id="identity-open" class="button primary">Open</button></section>
<section id="identity-create-part" role="tabpanel" aria-labelledby="identity-tab-make">
<label class="field-label" for="identity-name">Your name, as it should appear on a paper</label><input id="identity-name" maxlength="120">
<label class="field-label" for="identity-login">GitHub login (optional)</label><input id="identity-login" maxlength="39" autocomplete="off">
<label class="field-label" for="identity-orcid">ORCID iD (optional), such as 0000-0002-1825-0097</label><input id="identity-orcid" maxlength="19" autocomplete="off">
<label class="field-label" for="identity-new-passphrase">Passphrase, at least 12 characters</label><input id="identity-new-passphrase" type="password" autocomplete="new-password">
<label class="field-label" for="identity-confirm">The passphrase again</label><input id="identity-confirm" type="password" autocomplete="new-password">
<div id="identity-new-avatar"></div>
<p>If you lose the file or forget its passphrase, it cannot be recovered. Keep a copy somewhere safe.</p>
<button id="identity-create" class="button primary">Make and save the file</button></section>
<details id="identity-avatar-part" hidden><summary>Change your avatar</summary>
<p>Your avatar is kept in your identity file, so changing it saves a new file to keep in place of the old one. Choose the
file and enter its passphrase.</p>
<div id="identity-change-avatar"></div>
<label class="field-label" for="identity-change-file">Identity file (.fwid)</label><input id="identity-change-file" type="file" accept=".fwid,application/json">
<label class="field-label" for="identity-change-passphrase">Passphrase</label><input id="identity-change-passphrase" type="password" autocomplete="off">
<button id="identity-change" class="button primary">Save the new file</button></details>
<p id="identity-error" class="is-failure" role="alert" hidden></p>
</div>
<div class="dlg-foot"><button id="identity-lock" class="button">Lock</button><button id="identity-close" class="button grow">Close</button></div>
</div></dialog>`;

/** THE CHOOSER: Fieldwork's icons, each drawn in the chosen colour, then the colours. Radios, so the keyboard works. */
function chooserMarkup(prefix:string,chosen:AvatarChoice|undefined,esc:Escape):string{
  const colour=chosen?.colour??'blue';
  return `<fieldset class="avatar-chooser"><legend>Your avatar (optional; your initials until you choose)</legend>`
    +`<div class="avatar-icons">${AVATAR_ICONS.map(i=>`<label class="avatar-option"><input type="radio" name="${prefix}-icon" value="${i.id}"${chosen?.icon===i.id?' checked':''}>`
      +`${iconSvg(i.id,colour,48)}<span>${esc(i.label)}</span></label>`).join('')}</div>`
    +`<div class="avatar-colours">${AVATAR_COLOURS.map(c=>`<label class="avatar-colour"><input type="radio" name="${prefix}-colour" value="${c.id}"${colour===c.id?' checked':''}>`
      +`<span class="swatch" style="background:${c.hex}"></span>${esc(c.label)}</label>`).join('')}</div></fieldset>`;
}
function chosenIn(root:HTMLElement,prefix:string):AvatarChoice|undefined{
  const icon=root.querySelector<HTMLInputElement>(`input[name="${prefix}-icon"]:checked`)?.value;
  const colour=root.querySelector<HTMLInputElement>(`input[name="${prefix}-colour"]:checked`)?.value;
  return icon&&colour?{icon,colour}:undefined;
}
/** A colour chosen redraws the icons in it, so the choice is seen as it will look. */
function wireChooser(root:HTMLElement,prefix:string,esc:Escape){
  root.querySelectorAll<HTMLInputElement>(`input[name="${prefix}-colour"]`).forEach(radio=>radio.onchange=()=>{
    root.innerHTML=chooserMarkup(prefix,{icon:chosenIn(root,prefix)?.icon??'',colour:radio.value},esc);wireChooser(root,prefix,esc);
    root.querySelector<HTMLInputElement>(`input[name="${prefix}-colour"][value="${radio.value}"]`)?.focus();});
}

export function installIdentity(button:HTMLButtonElement,esc:Escape){
  // THE AVATAR AND THE NAME, both: a picture alone says nothing to someone who cannot see it well.
  const label=()=>{button.innerHTML=open?`${avatarSvg(open.profile,28)}<span>${esc(open.profile.name)}</span>`
    :`<svg class="fw-avatar" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="9.5" r="3.2" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M5.8 18.5a7 7 0 0 1 12.4 0" fill="none" stroke="currentColor" stroke-width="1.5"/></svg><span>Identity</span>`;
    button.setAttribute('aria-label',open?`Identity: ${open.profile.name}`:'Identity');};
  onIdentityChange(label);label();
  let redraw=()=>{};onIdentityChange(()=>redraw());
  for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>{
    if(open&&Date.now()-lastActivity>=IDLE_MS)lock();lastActivity=Date.now();},{capture:true});
  setInterval(()=>{if(open&&Date.now()-lastActivity>=IDLE_MS)lock();},10_000);
  window.addEventListener('pagehide',lock);
  button.onclick=()=>{
    if(!document.querySelector('#identity-dialog'))document.body.insertAdjacentHTML('beforeend',DIALOG);
    const d=document.querySelector<HTMLDialogElement>('#identity-dialog')!;
    const $=<T extends HTMLElement>(s:string)=>d.querySelector<T>(s)!;
    const error=$('#identity-error');
    const fail=(message:string)=>{error.textContent=message;error.hidden=false;};
    const draw=()=>{
      error.hidden=true;
      $('#identity-status').innerHTML=open
        ?`Open: <strong>${esc(identityLabel(open.profile))}</strong>. Notes you save now are signed (${esc(open.algorithm)}). It locks after 15 minutes without use, and when this tab closes.`
        :'No identity is open. Notes you save are kept with their versions, unsigned.';
      ($('#identity-lock') as HTMLButtonElement).disabled=!open;
      $('#identity-avatar').innerHTML=open?avatarSvg(open.profile,48)+`<span class="key-label">${keyPatternSvg(open.publicKey,28)} Your key</span>`:'';
      $('#identity-avatar-part').hidden=!open;
      if(open&&!$('#identity-change-avatar').innerHTML){$('#identity-change-avatar').innerHTML=chooserMarkup('change',open.profile.avatar,esc);
        wireChooser($('#identity-change-avatar'),'change',esc);}
    };
    if(!$('#identity-new-avatar').innerHTML){$('#identity-new-avatar').innerHTML=chooserMarkup('new',undefined,esc);wireChooser($('#identity-new-avatar'),'new',esc);}
    // MAKE OR OPEN: two tabs, Make first on a device where no identity has been opened, Open once one has.
    const showTab=(which:'make'|'open')=>{for(const t of d.querySelectorAll<HTMLButtonElement>('[data-identity-tab]')){
      const on=t.dataset.identityTab===which;t.classList.toggle('active',on);t.setAttribute('aria-selected',String(on));t.tabIndex=on?0:-1;
      $(`#${t.getAttribute('aria-controls')}`).hidden=!on;}};
    for(const t of d.querySelectorAll<HTMLButtonElement>('[data-identity-tab]'))t.onclick=()=>showTab(t.dataset.identityTab as 'make'|'open');
    showTab(openedHere()?'open':'make');
    draw();redraw=draw;
    $('#identity-open').onclick=async()=>{
      const file=($('#identity-file') as HTMLInputElement).files?.[0];
      const pass=($('#identity-passphrase') as HTMLInputElement).value;
      if(!file){fail('Choose your identity file first.');return;}
      try{set(await openIdentityFile(await file.text(),pass));lastActivity=Date.now();
        ($('#identity-passphrase') as HTMLInputElement).value='';}
      catch(e){fail(e instanceof Error?e.message:'The file could not be opened.');}
    };
    $('#identity-create').onclick=async()=>{
      const v=(s:string)=>($(s) as HTMLInputElement).value;
      const orcid=v('#identity-orcid').trim();
      if(orcid&&!validOrcid(orcid)){fail(`${orcid} is not an ORCID iD: its check digit does not match.`);return;}
      if(v('#identity-new-passphrase')!==v('#identity-confirm')){fail('The two passphrases differ.');return;}
      try{
        const avatar=chosenIn($('#identity-new-avatar'),'new');
        const {file,identity}=await createIdentityFile({name:v('#identity-name'),login:v('#identity-login'),...(orcid?{orcid}:{}),...(avatar?{avatar}:{})},v('#identity-new-passphrase'));
        const a=document.createElement('a');
        a.href=URL.createObjectURL(new Blob([file],{type:'application/json'}));
        a.download=`${identity.profile.name.replace(/[^\p{L}\p{N}]+/gu,'-').replace(/^-|-$/g,'')||'identity'}.fwid`;
        a.click();setTimeout(()=>URL.revokeObjectURL(a.href),10_000);
        for(const s of ['#identity-new-passphrase','#identity-confirm'])($(s) as HTMLInputElement).value='';
        for(const t of d.querySelectorAll<HTMLButtonElement>('[data-identity-tab="open"]'))t.click();
        set(identity);lastActivity=Date.now();
      }catch(e){fail(e instanceof Error?e.message:'The file could not be made.');}
    };
    $('#identity-change').onclick=async()=>{
      const file=($('#identity-change-file') as HTMLInputElement).files?.[0];
      if(!file){fail('Choose your identity file first.');return;}
      try{
        const {file:next,identity}=await updateIdentityFile(await file.text(),($('#identity-change-passphrase') as HTMLInputElement).value,
          {avatar:chosenIn($('#identity-change-avatar'),'change')??null});
        if(open&&identity.publicKey!==open.publicKey){fail('That file is another identity, not the one open here.');return;}
        const a=document.createElement('a');
        a.href=URL.createObjectURL(new Blob([next],{type:'application/json'}));a.download=file.name;a.click();
        setTimeout(()=>URL.revokeObjectURL(a.href),10_000);
        ($('#identity-change-passphrase') as HTMLInputElement).value='';
        set(identity);lastActivity=Date.now();
      }catch(e){fail(e instanceof Error?e.message:'The file could not be changed.');}
    };
    $('#identity-lock').onclick=lock;
    $('#identity-close').onclick=()=>d.close();
    d.showModal();
  };
}
