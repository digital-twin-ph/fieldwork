/** WHO CAN OPEN IT (experiment 229, 2026-11-21): the dialog before an encrypted backup is written, and the one that
 *  opens a sealed file on import.
 *
 *  The practitioner chose backups encrypted by default, to their identity, and asked *"How can others decrypt the
 *  project file if I send it to them?"*: so a backup is sealed for the open identity, for the project's members who
 *  gave a key, for anyone whose key is pasted under Also for, and for a passphrase where one is given. */
import {sealBytes,openSealed,readKeyText,fingerprint,whoCanOpen,isSealed,SEALED_EXTENSION,type SealFor} from './sealed-file.js';
import type {OpenIdentity} from './identity-file.js';
import type {Escape} from './types.js';

export interface SealMember {name:string;login:string;sealKey:string;verified:boolean}
export interface SealRequest {
  /** What is being written, in words: "the project Measles, Ituri" or "this workflow". */
  what:string;
  identity:OpenIdentity|null;
  /** The project's members, where it is a project: those with a signed key are offered, checked. */
  members?:SealMember[];
  membersWithoutKey?:string[];
  /** Opens the identity dialog. */
  openIdentity:()=>void;
  /** Makes the plain file: its bytes, name and type. */
  make:()=>Promise<{bytes:Uint8Array;name:string;mediaType:string}>;
  /** The plain copy, for a file meant to be read by anyone. */
  plain:()=>Promise<void>;
  /** Called with the sealed file's name once it is written. */
  done:(name:string,recipients:number)=>void;
}

function download(name:string,bytes:Uint8Array){
  const url=URL.createObjectURL(new Blob([bytes as BlobPart],{type:'application/octet-stream'}));
  const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10_000);
}

/** THE DIALOG BEFORE A BACKUP: who can open it, then Save encrypted; a plain copy is the other button, named as such. */
export function openSealDialog(request:SealRequest,esc:Escape):void{
  document.getElementById('seal-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='seal-dialog';dialog.setAttribute('aria-labelledby','seal-title');
  const me=request.identity?.sealing;
  const members=request.members??[];
  dialog.innerHTML=`<h2 id="seal-title">Back up ${esc(request.what)}, encrypted</h2>
<p>Only the people listed can open the file. Anyone else who gets it sees that it is a Fieldwork backup and its size, and nothing more.</p>
<fieldset class="seal-who"><legend>Who can open it</legend>
${me?`<label class="seal-row"><input type="checkbox" id="seal-me" checked> You, <strong>${esc(request.identity!.profile.name)}</strong> <span class="muted" data-print="${esc(me.publicKey)}"></span></label>`
  :`<p class="seal-row">No identity is open, so it cannot be sealed for you. <button type="button" class="button small" id="seal-open-identity">Open my identity</button> or give a passphrase below.</p>`}
${members.map((m,i)=>`<label class="seal-row"><input type="checkbox" data-seal-member="${i}"${m.verified?' checked':' disabled'}> <strong>${esc(m.name)}</strong> (${esc(m.login)}), project member <span class="muted" data-print="${esc(m.sealKey)}"></span>${m.verified?'':' <span class="is-no">its signature does not check, so it is not offered</span>'}</label>`).join('')}
${request.membersWithoutKey?.length?`<p class="muted">Not yet able to open it: ${request.membersWithoutKey.map(esc).join(', ')}. A member gives their key by pressing <strong>This is me</strong> under the shared project's people, with their identity open.</p>`:''}
</fieldset>
<label class="field-label" for="seal-keys">Also for: someone's key, one per line (they find it under Identity → Your key for encrypted files)</label>
<textarea id="seal-keys" rows="3" spellcheck="false" placeholder="fwkey1:…"></textarea>
<p id="seal-keys-said" class="field-check" aria-live="polite"></p>
<details id="seal-pass-part"><summary>And a passphrase, for someone with no identity</summary>
<label class="field-label" for="seal-pass">Passphrase, at least 12 characters</label><input id="seal-pass" type="password" autocomplete="new-password">
<label class="field-label" for="seal-pass-again">The passphrase again</label><input id="seal-pass-again" type="password" autocomplete="new-password">
<p class="muted">Tell it to them another way than the file: not in the same email.</p></details>
<p><strong>Keep your identity file safe.</strong> If it is lost, or its passphrase forgotten, a backup sealed only for you cannot be opened by anyone.</p>
<p id="seal-error" class="field-check is-bad" role="alert" hidden></p><p id="seal-status" role="status"></p>
<div class="package-actions"><button type="button" class="button" id="seal-plain">Plain copy instead</button><button type="button" class="button" id="seal-cancel">Cancel</button><button type="button" class="button primary" id="seal-save">Save encrypted</button></div>`;
  document.body.append(dialog);
  const q=<T extends Element>(s:string)=>dialog.querySelector<T>(s)!;
  for(const el of dialog.querySelectorAll<HTMLElement>('[data-print]'))void fingerprint(el.dataset.print!).then(f=>{el.textContent=`key ${f}`;});
  const said=q<HTMLElement>('#seal-keys-said'),error=q<HTMLElement>('#seal-error'),status=q<HTMLElement>('#seal-status');
  /** The pasted keys, read: each line a key, or said not to be one. */
  const pasted=async():Promise<{keys:string[];bad:number}>=>{
    const lines=q<HTMLTextAreaElement>('#seal-keys').value.split('\n').map(l=>l.trim()).filter(Boolean);
    const read=await Promise.all(lines.map(readKeyText));
    return {keys:read.filter((k):k is string=>!!k),bad:read.filter(k=>!k).length};
  };
  q<HTMLTextAreaElement>('#seal-keys').addEventListener('input',async()=>{
    const {keys,bad}=await pasted();
    const prints=await Promise.all(keys.map(fingerprint));
    said.textContent=[prints.length?`${prints.length} ${prints.length===1?'key':'keys'}: ${prints.join(', ')}`:'',
      bad?`${bad} ${bad===1?'line is':'lines are'} not a key: a key starts fwkey1:`:''].filter(Boolean).join('. ');
    said.className=`field-check ${bad?'is-bad':'is-good'}`;});
  dialog.querySelector<HTMLButtonElement>('#seal-open-identity')?.addEventListener('click',()=>{dialog.close();request.openIdentity();});
  let busy=false;
  dialog.oncancel=e=>{if(busy)e.preventDefault();};
  dialog.onclose=()=>dialog.remove();
  q<HTMLButtonElement>('#seal-cancel').onclick=()=>dialog.close();
  q<HTMLButtonElement>('#seal-plain').onclick=async()=>{dialog.close();await request.plain();};
  q<HTMLButtonElement>('#seal-save').onclick=async()=>{
    if(busy)return;error.hidden=true;
    const {keys,bad}=await pasted();
    if(bad){error.textContent='A line under Also for is not a key. Correct it or remove it.';error.hidden=false;return;}
    const to:SealFor={keys:[...(me&&q<HTMLInputElement>('#seal-me').checked?[me.publicKey]:[]),
      ...members.filter((m,i)=>m.verified&&dialog.querySelector<HTMLInputElement>(`[data-seal-member="${i}"]`)?.checked).map(m=>m.sealKey),...keys]};
    const pass=q<HTMLInputElement>('#seal-pass').value,again=q<HTMLInputElement>('#seal-pass-again').value;
    if(pass||again){if(pass!==again){error.textContent='The two passphrases do not match.';error.hidden=false;return;}to.passphrase=pass;}
    if(!to.keys!.length&&!to.passphrase){error.textContent=me?'Choose at least one person, or give a passphrase.':'Open your identity, add someone\'s key, or give a passphrase: otherwise nobody could open it.';error.hidden=false;return;}
    busy=true;status.textContent='Encrypting…';
    try{const plain=await request.make();
      const sealed=await sealBytes(plain.bytes,{name:plain.name,mediaType:plain.mediaType},to);
      const name=`${plain.name}${SEALED_EXTENSION}`;
      download(name,sealed);
      dialog.close();request.done(name,to.keys!.length+(to.passphrase?1:0));}
    catch(e){error.textContent=e instanceof Error?e.message:'The backup could not be encrypted.';error.hidden=false;}
    finally{busy=false;status.textContent='';}
  };
  dialog.showModal();
}

/** OPEN A SEALED FILE ON IMPORT: with the open identity, when it is one the file was sealed for; otherwise a dialog
 *  that says what opens it and takes a passphrase. Resolves to the plain file, or null when the person cancels. */
export async function openSealedFile(bytes:Uint8Array,identity:OpenIdentity|null,openIdentity:()=>void,esc:Escape):Promise<File|null>{
  if(!isSealed(bytes))throw new Error('This is not a sealed Fieldwork file.');
  const can=await whoCanOpen(bytes,identity?.sealing?.publicKey);
  const asFile=(r:{bytes:Uint8Array;content:{name:string;mediaType:string}})=>new File([r.bytes as BlobPart],r.content.name,{type:r.content.mediaType});
  if(can.mine&&identity?.sealing)return asFile(await openSealed(bytes,{identity:identity.sealing}));
  document.getElementById('unseal-dialog')?.remove();
  const dialog=document.createElement('dialog');dialog.id='unseal-dialog';dialog.setAttribute('aria-labelledby','unseal-title');
  const opens=[can.keys?`${can.keys===1?'one identity':`any of ${can.keys} identities`}`:'',can.passphrase?'a passphrase':''].filter(Boolean).join(' or ');
  dialog.innerHTML=`<h2 id="unseal-title">Open an encrypted backup</h2>
<p>It opens with ${esc(opens)}.${identity?.sealing?' Your open identity is not one of them.':can.keys?' Open your identity, if it is one of them.':''}</p>
${can.keys&&!identity?.sealing?'<p><button type="button" class="button" id="unseal-identity">Open my identity</button></p>':''}
${can.passphrase?'<label class="field-label" for="unseal-pass">Passphrase</label><input id="unseal-pass" type="password" autocomplete="off">':''}
<p id="unseal-error" class="field-check is-bad" role="alert" hidden></p>
<div class="package-actions"><button type="button" class="button" id="unseal-cancel">Cancel</button>${can.passphrase?'<button type="button" class="button primary" id="unseal-open">Open</button>':''}</div>`;
  document.body.append(dialog);
  return new Promise<File|null>(resolve=>{
    let result:File|null=null;
    dialog.onclose=()=>{dialog.remove();resolve(result);};
    dialog.querySelector<HTMLButtonElement>('#unseal-cancel')!.onclick=()=>dialog.close();
    dialog.querySelector<HTMLButtonElement>('#unseal-identity')?.addEventListener('click',()=>{dialog.close();openIdentity();});
    dialog.querySelector<HTMLButtonElement>('#unseal-open')?.addEventListener('click',async()=>{
      const error=dialog.querySelector<HTMLElement>('#unseal-error')!;error.hidden=true;
      try{result=asFile(await openSealed(bytes,{passphrase:dialog.querySelector<HTMLInputElement>('#unseal-pass')!.value}));dialog.close();}
      catch(e){error.textContent=e instanceof Error?e.message:'It could not be opened.';error.hidden=false;}});
    dialog.showModal();
    dialog.querySelector<HTMLInputElement>('#unseal-pass')?.focus();
  });
}
