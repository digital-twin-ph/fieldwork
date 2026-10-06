import type {Workflow} from './types.js';
import {createEncryptedPackage,readEncryptedPackage} from './encrypted-package.js';
import {referencedPDFs} from './evidence.js';
import {projectFiles} from './project-files.js';
import {verifiedProjectFile,storePDFs} from './evidence-storage.js';

export function openPackageDialog(workflow:Workflow,validate:(raw:unknown)=>Workflow,apply:(workflow:Workflow)=>void,file?:File):void{
  const snapshot=structuredClone(workflow),dialog=document.createElement('dialog');dialog.id='package-dialog';dialog.setAttribute('aria-labelledby','package-title');
  const refs=projectFiles(snapshot),total=[...refs.values()].reduce((sum,ref)=>sum+ref.bytes,0);
  dialog.innerHTML=`<h2 id="package-title">${file?'Open encrypted project':'Export encrypted project'}</h2><p>${file?'Enter the passphrase used when exporting this ZIP. The current workflow is kept if validation fails.':`Includes this workflow and ${[...refs.values()].filter(r=>r.mediaType==='application/pdf').length} unique PDFs and ${[...refs.values()].filter(r=>r.mediaType==='image/tiff').length} raster windows (${(total/1_000_000).toFixed(2)} MB). URL contents, run results and original national raster files are not included.`}</p><p>ZIP contents are encrypted; generic entry names, counts and sizes remain visible. Browser storage is not encrypted.</p><form id="package-form"><label class="field-label" for="package-password">Passphrase</label><input id="package-password" type="password" autocomplete="off" required ${file?'':'minlength="12"'}>${file?'':'<label class="field-label" for="package-confirm">Confirm passphrase</label><input id="package-confirm" type="password" autocomplete="off" required><p>Use a long, unique passphrase (at least 12 characters). Keep it safely: there is no password recovery.</p>'}<p id="package-error" role="alert" hidden></p><p id="package-status" role="status"></p><div class="package-actions"><button id="package-cancel" type="button" class="button">Cancel</button><button id="package-submit" class="button primary" type="submit">${file?'Unlock and import':'Download encrypted ZIP'}</button></div></form>`;
  document.body.append(dialog);const password=dialog.querySelector<HTMLInputElement>('#package-password')!,confirm=dialog.querySelector<HTMLInputElement>('#package-confirm'),submit=dialog.querySelector<HTMLButtonElement>('#package-submit')!,cancel=dialog.querySelector<HTMLButtonElement>('#package-cancel')!,error=dialog.querySelector<HTMLElement>('#package-error')!,status=dialog.querySelector<HTMLElement>('#package-status')!;
  let busy=false;dialog.oncancel=event=>{if(busy)event.preventDefault();};cancel.onclick=()=>dialog.close();dialog.onclose=()=>{password.value='';if(confirm)confirm.value='';dialog.remove();};
  dialog.querySelector<HTMLFormElement>('form')!.onsubmit=async event=>{
    event.preventDefault();if(busy)return;error.hidden=true;
    if(confirm&&password.value!==confirm.value){error.textContent='Passphrases do not match.';error.hidden=false;confirm.focus();return;}
    busy=true;submit.disabled=true;cancel.disabled=true;status.textContent=file?'Decrypting and verifying…':'Preparing encrypted package…';let verified=false;
    try{
      if(file){const imported=await readEncryptedPackage(file,password.value,validate);verified=true;status.textContent='Saving verified project…';await storePDFs(imported.files,projectFiles(imported.workflow));apply(imported.workflow);}
      else{const files=new Map<string,Uint8Array<ArrayBuffer>>();for(const [hash,ref] of refs)files.set(hash,await verifiedProjectFile(ref));const blob=await createEncryptedPackage(validate(snapshot),files,password.value);const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='fieldwork-project.zip';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
      dialog.close();
    }catch(e){error.textContent=file&&!verified?'Could not open this package. Check the passphrase; the file may be damaged or unsupported. The current workflow is unchanged.':e instanceof Error?e.message:'Could not save the project.';error.hidden=false;error.scrollIntoView({block:'nearest'});}
    finally{busy=false;submit.disabled=false;cancel.disabled=false;status.textContent='';}
  };
  dialog.showModal();password.focus();
}
