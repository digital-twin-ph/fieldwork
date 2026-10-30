import {CredentialSession,decryptCredentials,encryptCredentials} from './credentials.js';
export interface CredentialAccess {
 /** Resolve one secret, or throw. Never returns the collection. */
 resolve(ref:string,provider:string,origin:string):string;
 readonly unlocked:boolean;
 /** Reference and label only, for choosing in a node. Never the secret. */
 references():{ref:string;provider:string;label:string}[];
}

/** Given the GitHub token, says who it belongs to -- or throws saying why it could not.
 *
 *  A hook rather than a direct call, so this module keeps knowing only about credentials. The
 *  practitioner, 2026-10-29: *"The first thing user does when working on a project is
 *  authenticate."* This is where that happens, because it is the only moment the token is in hand. */
export type Identify=(token:string)=>Promise<string>;

/** The one origin an identity can be confirmed against, as `identity.ts` specifies it. */
const GITHUB_ORIGIN='https://api.github.com';

export function installCredentials(button:HTMLButtonElement,identify?:Identify):CredentialAccess{
 let dialog:HTMLDialogElement|undefined,dirty=false,operation=0,lastInteraction=Date.now();
 const session=new CredentialSession(()=>{button.textContent=session.unlocked?'Credentials: unlocked':'Credentials';if(!session.unlocked){dirty=false;operation++;dialog?.close();}refresh();});
 const refresh=()=>{if(!dialog)return;const status=dialog.querySelector<HTMLElement>('#credential-status')!;// Three states, each naming what to do next rather than reporting a count. An empty
 // collection is ready for entries, not a failure, and said so badly before.
 const count=session.list().length;
 status.textContent=!session.unlocked
  ?'Locked. Choose an encrypted file and unlock it, or start a new collection.'
  :count===0
   ?'New collection, empty and active in this tab. Add a credential below, then download an encrypted file to keep it.'
   :`${count} credential${count===1?'':'s'} active in this tab. ${dirty?'Not yet saved to a file \u2014 download to keep them.':'Download again after editing.'}`;
  const list=dialog.querySelector<HTMLElement>('#credential-list')!;list.replaceChildren();for(const entry of session.list()){const row=document.createElement('div'),text=document.createElement('span'),remove=document.createElement('button');text.textContent=`${entry.label} (${entry.ref}) · ${entry.provider} · ${entry.origin} `;remove.type='button';remove.className='button small';remove.textContent='Delete';remove.setAttribute('aria-label',`Delete ${entry.ref}`);remove.onclick=()=>{session.replace(session.snapshot().filter(v=>v.ref!==entry.ref));dirty=true;refresh();};row.append(text,remove);list.append(row);}
  dialog.querySelector<HTMLFieldSetElement>('#credential-edit')!.disabled=!session.unlocked;dialog.querySelector<HTMLButtonElement>('#credential-download')!.disabled=!session.unlocked;
 // Confirmation guards against a typo that would make a NEW file permanently unopenable.
 // Unlocking an existing file needs none: a wrong passphrase fails and can simply be retried.
 dialog.querySelector<HTMLElement>('#credential-download-passphrase')!.hidden=!session.unlocked;
 const confirmField=dialog.querySelector<HTMLInputElement>('#credential-confirm');
 if(confirmField&&!session.unlocked)confirmField.value='';
 };
 // Expire before accepting activity; a suspended tab must not revive an expired key.
 const expire=()=>{session.expire();if(dialog&&Date.now()-lastInteraction>=session.idleMs)session.lock();};
 for(const event of ['pointerdown','keydown'])document.addEventListener(event,()=>{expire();lastInteraction=Date.now();session.touch();},{capture:true});
 document.addEventListener('visibilitychange',expire);setInterval(expire,10_000);window.addEventListener('pagehide',()=>session.lock());
 button.onclick=()=>{
  if(dialog){dialog.focus();return;}
  lastInteraction=Date.now();const d=document.createElement('dialog');dialog=d;d.id='credential-dialog';d.setAttribute('aria-labelledby','credential-title');
  d.innerHTML=`<h2 id="credential-title">Credentials</h2><p>Keep credentials in a separate encrypted file on your computer. Unlocked keys stay in this tab only and lock after 15 minutes of inactivity or a reload. Unlocking a GitHub token also confirms who you are, so projects you create carry your name.</p><p id="credential-status" role="status"></p><p id="credential-identity" role="status"></p><div id="credential-list"></div><label class="field-label" for="credential-file">Encrypted credential file</label><input id="credential-file" type="file" accept=".fwcredentials"><label class="field-label" for="credential-password">File passphrase</label><input id="credential-password" type="password" autocomplete="off" maxlength="1024"><button id="credential-unlock" class="button">Unlock and activate</button><button id="credential-new" class="button">Start a new collection</button><p>Loading or creating replaces the current session collection. Download edits first if you want to keep them.</p><fieldset id="credential-edit"><legend>Add or replace a credential</legend><label class="field-label" for="credential-ref">Reference (same reference replaces an existing key)</label><input id="credential-ref" maxlength="64" placeholder="my-service-key"><label class="field-label" for="credential-provider">Provider identifier</label><input id="credential-provider" maxlength="64" placeholder="example-provider"><label class="field-label" for="credential-label">Label</label><input id="credential-label" maxlength="120" placeholder="My service key"><label class="field-label" for="credential-origin">Allowed HTTPS origin</label><input id="credential-origin" maxlength="200" placeholder="https://api.example.org"><label class="field-label" for="credential-secret">API key</label><input id="credential-secret" type="password" autocomplete="off" maxlength="4096"><button id="credential-add" class="button">Add and activate</button></fieldset><div id="credential-download-passphrase" hidden><p>To download, enter a long unique passphrase above (at least 12 characters) and confirm below. There is no password recovery. This creates a new file; it does not overwrite your original.</p><label class="field-label" for="credential-confirm">Confirm download passphrase</label><input id="credential-confirm" type="password" autocomplete="off" maxlength="1024"></div><p id="credential-error" role="alert" hidden></p><div class="credential-actions"><button id="credential-close" class="button">Close</button><button id="credential-lock" class="button">Lock and discard session</button><button id="credential-download" class="button primary">Download encrypted credentials</button></div>`;
  document.body.append(d);const input=(id:string)=>d.querySelector<HTMLInputElement>('#credential-'+id)!,error=d.querySelector<HTMLElement>('#credential-error')!;let busy=false;
  const clear=()=>{for(const el of d.querySelectorAll<HTMLInputElement>('input'))el.value='';};
  d.onclose=()=>{operation++;clear();d.remove();if(dialog===d)dialog=undefined;};
  const fail=(e:unknown)=>{error.textContent=e instanceof Error?e.message:'Credential operation failed.';error.hidden=false;error.scrollIntoView({block:'nearest'});};
  const action=(name:string,fn:()=>void)=>{d.querySelector<HTMLButtonElement>('#credential-'+name)!.onclick=()=>{error.hidden=true;try{fn();}catch(e){fail(e);}};};
  action('close',()=>d.close());action('lock',()=>session.lock());action('new',()=>{if(busy)return;session.replace([]);dirty=true;refresh();});
  action('add',()=>{if(busy)return;const entry={ref:input('ref').value.trim(),provider:input('provider').value.trim(),label:input('label').value.trim(),origin:input('origin').value.trim(),secret:input('secret').value};session.replace([...session.snapshot().filter(v=>v.ref!==entry.ref),entry]);input('secret').value='';dirty=true;refresh();});
  /** WHO THIS TOKEN BELONGS TO, asked once at unlock and never again until the next one.
   *
   *  Failure here is NOT an unlock failure and must not be shown as one: the credentials are
   *  unlocked either way, and an offline practitioner has working credentials and an unconfirmed
   *  name. So this writes to its own line and never to the error region.
   *
   *  It asks only for a credential the step-0b spec would have produced -- provider `github` at
   *  `https://api.github.com` -- and says nothing at all when there is none, because most projects
   *  need no token and a line about GitHub would be noise in all of them. */
  async function announce(token:number,generation:number){
   const identityLine=d.querySelector<HTMLElement>('#credential-identity')!;
   identityLine.textContent='';
   const entry=session.list().find(v=>v.provider==='github'&&v.origin===GITHUB_ORIGIN);
   if(!entry||!identify)return;
   identityLine.textContent='Asking GitHub who this token belongs to…';
   try{
    const who=await identify(session.resolve(entry.ref,entry.provider,entry.origin));
    if(token!==operation||generation!==session.generation||!d.open)return;
    identityLine.textContent=`Signed in to GitHub as ${who}. Projects you create will carry this name.`;
   }catch(e){
    if(token!==operation||generation!==session.generation||!d.open)return;
    identityLine.textContent=e instanceof Error?e.message:'The login was not confirmed.';
   }
  }
  async function perform(mode:'unlock'|'download'){
   if(busy)return;error.hidden=true;const token=++operation,generation=session.generation;busy=true;
   for(const el of d.querySelectorAll<HTMLButtonElement>('button'))if(!['credential-lock','credential-close'].includes(el.id))el.disabled=true;
   try{
    if(mode==='unlock'){const file=input('file').files?.[0];if(!file)throw new Error('Select an encrypted credential file.');const entries=await decryptCredentials(file,input('password').value);if(token!==operation||generation!==session.generation||!d.open)return;session.replace(entries);dirty=false;await announce(token,generation);}
    else{if(input('password').value!==input('confirm').value)throw new Error('Passphrases do not match.');const blob=await encryptCredentials(session.snapshot(),input('password').value);if(token!==operation||generation!==session.generation||!d.open)return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='fieldwork.fwcredentials';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);dirty=false;}
    input('password').value='';input('confirm').value='';input('file').value='';
   }catch(e){if(token===operation&&d.open)fail(e);}finally{busy=false;if(d.open){for(const el of d.querySelectorAll<HTMLButtonElement>('button'))el.disabled=false;refresh();}}
  }
  d.querySelector<HTMLButtonElement>('#credential-unlock')!.onclick=()=>void perform('unlock');d.querySelector<HTMLButtonElement>('#credential-download')!.onclick=()=>void perform('download');refresh();d.showModal();
 };
 return {
  resolve:(ref,provider,origin)=>session.resolve(ref,provider,origin),
  get unlocked(){return session.unlocked;},
  references:()=>session.list().map(({ref,provider,label})=>({ref,provider,label})),
 };
}
