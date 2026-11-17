/** A PROJECT SAVED TO ITS REPOSITORY AS ONE COMMIT (experiment 150, the first save, 2026-11-16).
 *
 *  The files are the ones Export as repository zips (`repositoryFiles`); here they go to GitHub through the person's own
 *  token instead of to the Downloads folder. One commit, so the repository never holds half a save: the blobs and the
 *  tree are written first, and only the last request, moving the branch, makes them part of the history. If someone
 *  saved since the branch was read, that last request is refused rather than forced, and nothing they saved is lost.
 *
 *  Files already in the repository and not in this save are kept, as the template's are. */

import {GITHUB_API} from './repository-check.js';

type Fetch=(input:string,init?:RequestInit)=>Promise<Response>;
export type SaveResult={ok:true;sha:string;url:string;files:number}|{ok:false;text:string};

const utf8Base64=(text:string)=>{const bytes=new TextEncoder().encode(text);let binary='';
  for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(binary);};

/** `expected`, when given, is the commit this device last read or saved: if the branch has moved past it, someone saved
 *  since, and the save is refused before anything is written. */
export async function saveToRepository(repository:string,files:Map<string,string>,message:string,token:string,fetchFn:Fetch=fetch,expected?:string):Promise<SaveResult>{
  const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  const call=async(path:string,method='GET',body?:unknown)=>{
    const response=await fetchFn(`${GITHUB_API}/repos/${repository}${path}`,{method,headers,cache:'no-store',...(body?{body:JSON.stringify(body)}:{})});
    const json=await response.json().catch(()=>null) as Record<string,unknown>|null;
    return {status:response.status,ok:response.ok,json};};
  const refused=(status:number,what:string):SaveResult=>({ok:false,text:status===401
    ?'GitHub refused the token. It may have expired or been regenerated.'
    :status===403||status===404
      ?`The token may not write the repository's files (${what}: GitHub answered ${status}). Give it Contents: Read and write on GitHub.`
      :`Not saved: ${what}, GitHub answered ${status}.`});

  const about=await call('');if(!about.ok)return refused(about.status,'reading the repository');
  const branch=String(about.json?.default_branch??'main');
  const head=await call(`/git/ref/heads/${encodeURIComponent(branch)}`);if(!head.ok)return refused(head.status,`reading ${branch}`);
  const parent=String((head.json?.object as {sha?:string})?.sha);
  if(expected&&parent!==expected)return {ok:false,text:'Someone saved to the repository since this device last read it. Nothing was written; get the latest first.'};
  const commit=await call(`/git/commits/${parent}`);if(!commit.ok)return refused(commit.status,'reading the last commit');
  const baseTree=String((commit.json?.tree as {sha?:string})?.sha);

  const tree:{path:string;mode:'100644';type:'blob';sha:string}[]=[];
  for(const [path,text] of files){
    const blob=await call('/git/blobs','POST',{content:utf8Base64(text),encoding:'base64'});
    if(!blob.ok)return refused(blob.status,`writing ${path}`);
    tree.push({path,mode:'100644',type:'blob',sha:String(blob.json?.sha)});
  }
  const made=await call('/git/trees','POST',{base_tree:baseTree,tree});if(!made.ok)return refused(made.status,'writing the tree');
  const next=await call('/git/commits','POST',{message,tree:made.json?.sha,parents:[parent]});
  if(!next.ok)return refused(next.status,'writing the commit');
  const sha=String(next.json?.sha);
  const moved=await call(`/git/refs/heads/${encodeURIComponent(branch)}`,'PATCH',{sha,force:false});
  if(moved.status===422)return {ok:false,text:`Someone saved to ${branch} since it was read. Nothing was overwritten; check the repository again, then save.`};
  if(!moved.ok)return refused(moved.status,`moving ${branch}`);
  return {ok:true,sha,url:`https://github.com/${repository}/commit/${sha}`,files:files.size};
}
