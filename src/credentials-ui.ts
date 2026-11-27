import {escapeHtml} from './html-escape.js';
import {CredentialSession,decryptCredentials,encryptCredentials} from './credentials.js';
import {credentialsFileName,openIdentity} from './identity-ui.js';
import {keep,restore,extend,drop} from './session-keep.js';
import {openManual} from './manual.js';
import {checkSupabase,supabaseKeyProblem,SUPABASE_PROVIDER,type SupabaseCheck} from './supabase-check.js';
export interface CredentialAccess {
 /** Resolve one secret, or throw. Never returns the collection. */
 resolve(ref:string,provider:string,origin:string):string;
 readonly unlocked:boolean;
 /** Reference and label only, for choosing in a node. Never the secret. */
 references():{ref:string;provider:string;label:string;origin:string;repository?:string}[];
 /** Records which repository a GitHub token is for. The file must be downloaded again to keep it. */
 setRepository(ref:string,repository:string):void;
 /** Milliseconds until they lock for want of use, or null while locked. */
 readonly untilLock:number|null;
 /** Counts as use: the lock warning's Keep them open. */
 keepOpen():void;
}

/** Given the GitHub token, says who it belongs to -- or throws saying why it could not.
 *
 *  A hook rather than a direct call, so this module keeps knowing only about credentials. The
 *  practitioner, 2026-10-29: *"The first thing user does when working on a project is
 *  authenticate."* This is where that happens, because it is the only moment the token is in hand. */
export type Identify=(token:string)=>Promise<string>;

/** The one origin an identity can be confirmed against, as `identity.ts` specifies it. */
const GITHUB_ORIGIN='https://api.github.com';

/** UNLOCKED, SEEN AT A GLANCE (2026-11-16): an open padlock and the accent's tint while a token can be used, so an
 *  unlocked file is not mistaken for a locked one. The words say it too; the icon is decoration. */
const OPEN_PADLOCK='<svg class="padlock" aria-hidden="true" viewBox="0 0 16 16" width="16" height="16"><rect x="3" y="7" width="10" height="8" rx="1.5" fill="currentColor"/><path d="M5.5 7V4.5a2.5 2.5 0 0 1 5 0" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

export function installCredentials(button:HTMLButtonElement,identify?:Identify):CredentialAccess{
 let dialog:HTMLDialogElement|undefined,dirty=false,operation=0,lastInteraction=Date.now();
 // KEPT THROUGH A RELOAD while unlocked (2026-11-16, `session-keep.ts`), encrypted; dropped the moment it locks.
 let resuming=false,extendedAt=0;
 // HOW MANY KEYS ARE OPEN, not only that the session is (2026-11-18: the practitioner saw "unlocked" having opened no
 // file; "Start a new collection" opens an empty one). An empty collection holds nothing to protect, and says so.
 const label=()=>{if(!session.unlocked)return 'Credentials';const n=session.list().length;
  return n?`${OPEN_PADLOCK}Credentials: ${n} ${n===1?'key':'keys'} unlocked`:'Credentials: new, empty';};
 const checks=new Map<string,SupabaseCheck|'asking'>();
 const session=new CredentialSession(()=>{button.innerHTML=label();button.classList.toggle('is-unlocked',session.unlocked&&session.list().length>0);if(!session.unlocked){dirty=false;operation++;checks.clear();dialog?.close();}refresh();
  if(session.unlocked){if(!resuming)void keep('credentials',session.snapshot(),session.lastUsed+session.idleMs);}else void drop('credentials');});
 const refresh=()=>{if(!dialog)return;const status=dialog.querySelector<HTMLElement>('#credential-status')!;// Three states, each naming what to do next rather than reporting a count. An empty
 // collection is ready for entries, not a failure, and said so badly before.
 const count=session.list().length;
 status.textContent=!session.unlocked
  ?'Locked. Choose an encrypted file and unlock it, or start a new collection.'
  :count===0
   ?'New collection, empty and active in this tab. Add a credential below, then download an encrypted file to keep it.'
   :`${count} credential${count===1?'':'s'} active in this tab. ${dirty?'Not yet saved to a file \u2014 download to keep them.':'Download again after editing.'}`;
  const list=dialog.querySelector<HTMLElement>('#credential-list')!;list.replaceChildren();for(const entry of session.list()){const row=document.createElement('div'),text=document.createElement('span'),remove=document.createElement('button');text.textContent=`${entry.label} (${entry.ref}) · ${entry.provider} · ${entry.origin}${entry.repository?` · for ${entry.repository}`:''} `;remove.type='button';remove.className='button small';remove.textContent='Delete';remove.setAttribute('aria-label',`Delete ${entry.ref}`);remove.onclick=()=>{session.replace(session.snapshot().filter(v=>v.ref!==entry.ref));dirty=true;refresh();};row.append(text,remove);
   // A SUPABASE KEY IS CHECKED HERE, ON THE SPOT (experiment 233's spike): one request to the project, and what came
   // back in words beneath the row.
   if(entry.provider===SUPABASE_PROVIDER){const check=document.createElement('button'),said=checks.get(entry.ref);
    check.type='button';check.className='button small';check.textContent=said==='asking'?'Checking…':'Check';check.disabled=said==='asking';
    check.setAttribute('aria-label',`Check ${entry.ref} with Supabase`);
    check.onclick=()=>{const generation=session.generation;checks.set(entry.ref,'asking');refresh();
     void checkSupabase(entry.origin,session.resolve(entry.ref,entry.provider,entry.origin)).then(result=>{
      if(generation!==session.generation)return;checks.set(entry.ref,result);refresh();});};
    row.insertBefore(check,remove);
    if(said&&said!=='asking'){const line=document.createElement('p');line.className=`field-check ${said.ok?'is-good':'is-bad'}`;line.setAttribute('role','status');line.textContent=said.said;row.append(line);}}
   list.append(row);}
  dialog.querySelector<HTMLFieldSetElement>('#credential-edit')!.disabled=!session.unlocked;dialog.querySelector<HTMLButtonElement>('#credential-download')!.disabled=!session.unlocked;
 // Confirmation guards against a typo that would make a NEW file permanently unopenable.
 // Unlocking an existing file needs none: a wrong passphrase fails and can simply be retried.
 dialog.querySelector<HTMLElement>('#credential-download-passphrase')!.hidden=!session.unlocked;
 const confirmField=dialog.querySelector<HTMLInputElement>('#credential-confirm');
 if(confirmField&&!session.unlocked)confirmField.value='';
 };
 // Expire before accepting activity; a suspended tab must not revive an expired key.
 const expire=()=>{session.expire();if(dialog&&Date.now()-lastInteraction>=session.idleMs)session.lock();};
 // USE IS USE OF THE CREDENTIALS: working in the dialog, or a key being read for a request. Until 2026-11-18 any click
 // or key anywhere on the page counted, so a session stayed unlocked for as long as anyone kept working in Fieldwork.
 for(const event of ['pointerdown','keydown'])document.addEventListener(event,e=>{expire();
  if(!(dialog&&e.target instanceof Node&&dialog.contains(e.target)))return;
  lastInteraction=Date.now();session.touch();
  if(session.unlocked&&session.lastUsed-extendedAt>30_000){extendedAt=session.lastUsed;void extend('credentials',session.lastUsed+session.idleMs);}},{capture:true});
 // NOT LOCKED ON LEAVING THE PAGE any more: a reload keeps them, until 15 minutes without use or Lock.
 document.addEventListener('visibilitychange',expire);setInterval(expire,10_000);
 void restore('credentials').then(kept=>{if(!kept||session.unlocked)return;resuming=true;
  try{session.resume(kept.value,kept.expiresAt-session.idleMs);}catch{void drop('credentials');}finally{resuming=false;}});
 button.onclick=()=>{
  if(dialog){dialog.focus();return;}
  lastInteraction=Date.now();const d=document.createElement('dialog');dialog=d;d.id='credential-dialog';d.setAttribute('aria-labelledby','credential-title');
  d.innerHTML=`<h2 id="credential-title">Credentials</h2><p><button type="button" class="button manual-button" id="credential-manual"><span aria-hidden="true">\u25a4</span> Read the manual for Credentials</button></p><p>Keep credentials in a separate encrypted file on your computer. Unlocked keys stay unlocked through a reload, kept encrypted in this browser, and lock after ${Math.round(session.idleMs/60000)} minutes without use or when you press Lock. Unlocking a GitHub token also confirms who you are, so projects you create carry your name.</p><p id="credential-status" role="status"></p><p id="credential-identity" role="status"></p><div id="credential-list"></div><label class="field-label" for="credential-file">Encrypted credential file</label><input id="credential-file" type="file" accept=".fwcredentials"><label class="field-label" for="credential-password">File passphrase</label><input id="credential-password" type="password" autocomplete="off" maxlength="1024"><div id="credential-download-passphrase" hidden><label class="field-label" for="credential-confirm">Confirm download passphrase</label><input id="credential-confirm" type="password" autocomplete="off" maxlength="1024"><p id="credential-match" class="field-check" aria-live="polite"></p><p class="muted">To download, enter a long unique passphrase, at least 12 characters, in both boxes above. There is no password recovery. This creates a new file; it does not overwrite your original.</p></div><button id="credential-unlock" class="button">Unlock and activate</button><button id="credential-new" class="button">Start a new collection</button><p>Loading or creating replaces the current session collection. Download edits first if you want to keep them.</p><fieldset id="credential-edit"><legend>Add or replace a credential</legend><label class="field-label" for="credential-ref">Reference (same reference replaces an existing key)</label><input id="credential-ref" maxlength="64"><label class="field-label" for="credential-provider">Provider identifier</label><input id="credential-provider" maxlength="64"><label class="field-label" for="credential-label">Label (optional; the reference if left empty)</label><input id="credential-label" maxlength="120"><label class="field-label" for="credential-origin">Allowed HTTPS origin</label><input id="credential-origin" maxlength="200"><label class="field-label" for="credential-repository">Repository it is for (GitHub tokens; owner/name)</label><input id="credential-repository" maxlength="141" autocomplete="off" spellcheck="false"><label class="field-label" for="credential-secret">API key</label><input id="credential-secret" type="password" autocomplete="off" maxlength="4096"><button id="credential-add" class="button">Add and activate</button></fieldset><p id="credential-error" role="alert" hidden></p><div class="credential-actions"><button id="credential-close" class="button">Close</button><button id="credential-lock" class="button">Lock and discard session</button><button id="credential-download" class="button primary">Download encrypted credentials</button></div>`;
  document.body.append(d);const input=(id:string)=>d.querySelector<HTMLInputElement>('#credential-'+id)!,error=d.querySelector<HTMLElement>('#credential-error')!;let busy=false;
  const clear=()=>{for(const el of d.querySelectorAll<HTMLInputElement>('input'))el.value='';};
  d.onclose=()=>{operation++;clear();d.remove();if(dialog===d)dialog=undefined;};
  const fail=(e:unknown)=>{error.textContent=e instanceof Error?e.message:'Credential operation failed.';error.hidden=false;error.scrollIntoView({block:'nearest'});};
  const action=(name:string,fn:()=>void)=>{d.querySelector<HTMLButtonElement>('#credential-'+name)!.onclick=()=>{error.hidden=true;try{fn();}catch(e){fail(e);}};};
  action('close',()=>d.close());action('lock',()=>session.lock());action('new',()=>{if(busy)return;session.replace([]);dirty=true;refresh();});
  action('add',()=>{if(busy)return;const entry={ref:input('ref').value.trim(),provider:input('provider').value.trim(),label:input('label').value.trim()||input('ref').value.trim(),origin:input('origin').value.trim(),secret:input('secret').value,...(input('repository').value.trim()?{repository:input('repository').value.trim()}:{})};
   // A SECRET KEY NEVER ENTERS THE FILE: it is refused here, whatever provider it is entered under.
   const problem=supabaseKeyProblem(entry.secret);if(problem){input('secret').value='';throw new Error(problem);}checks.delete(entry.ref);session.replace([...session.snapshot().filter(v=>v.ref!==entry.ref),entry]);input('secret').value='';dirty=true;refresh();});
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
   for(const el of d.querySelectorAll<HTMLButtonElement>('button'))if(!['credential-lock','credential-close','credential-manual'].includes(el.id))el.disabled=true;
   try{
    if(mode==='unlock'){const file=input('file').files?.[0];if(!file)throw new Error('Select an encrypted credential file.');const entries=await decryptCredentials(file,input('password').value);if(token!==operation||generation!==session.generation||!d.open)return;session.replace(entries);dirty=false;await announce(token,generation);}
    else{if(input('password').value!==input('confirm').value)throw new Error('Passphrases do not match.');const blob=await encryptCredentials(session.snapshot(),input('password').value);if(token!==operation||generation!==session.generation||!d.open)return;const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=credentialsFileName(openIdentity()?.profile.name);link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);dirty=false;}
    input('password').value='';input('confirm').value='';input('file').value='';d.querySelector<HTMLElement>('#credential-match')!.textContent='';
   }catch(e){if(token===operation&&d.open)fail(e);}finally{busy=false;if(d.open){for(const el of d.querySelectorAll<HTMLButtonElement>('button'))el.disabled=false;refresh();}}
  }
  // THE PASSPHRASE AND ITS CONFIRMATION SIDE BY SIDE, CHECKED AS TYPED (the practitioner, 2026-11-16: "The passphrases
  // (initial and confirm) should be together, and match automatically detected"), as in the Identity dialog.
  const checkMatch=()=>{const first=input('password').value,again=input('confirm').value,el=d.querySelector<HTMLElement>('#credential-match')!;
   const tone=!again?'':again===first?'is-good':first.startsWith(again)?'':'is-bad';
   el.textContent=!again?'':again===first?(first.length<12?'They match, but a download needs at least 12 characters.':'The passphrases match.')
    :first.startsWith(again)?'Keep typing: not the whole passphrase yet.':'The passphrases do not match.';
   el.className=`field-check ${tone}`;
   // A mismatch said earlier is over once they match.
   if(again&&again===first)error.hidden=true;};
  input('password').addEventListener('input',checkMatch);input('confirm').addEventListener('input',checkMatch);
  // THE MANUAL OPENS OVER THE FORM and can be detached beside it, so the steps are read while the fields are filled.
  d.querySelector<HTMLButtonElement>('#credential-manual')!.onclick=()=>openManual('surface:credentials','Credentials',escapeHtml);
  d.querySelector<HTMLButtonElement>('#credential-unlock')!.onclick=()=>void perform('unlock');d.querySelector<HTMLButtonElement>('#credential-download')!.onclick=()=>void perform('download');refresh();d.showModal();
 };
 return {
  // READING A KEY IS USE: it moves the lock on, and the kept copy's expiry with it.
  resolve:(ref,provider,origin)=>{const secret=session.resolve(ref,provider,origin);
   if(session.lastUsed-extendedAt>30_000){extendedAt=session.lastUsed;void extend('credentials',session.lastUsed+session.idleMs);}return secret;},
  get unlocked(){return session.unlocked;},
  references:()=>session.list().map(({ref,provider,label,origin,repository})=>({ref,provider,label,origin,...(repository?{repository}:{})})),
  setRepository:(ref,repository)=>{session.setRepository(ref,repository);dirty=true;},
  get untilLock(){return session.unlocked?Math.max(0,session.lastUsed+session.idleMs-Date.now()):null;},
  keepOpen:()=>{expire();session.touch();if(session.unlocked){extendedAt=session.lastUsed;void extend('credentials',session.lastUsed+session.idleMs);}},
 };
}
