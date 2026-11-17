/** A PROJECT SHARED THROUGH A REPOSITORY, READ AND COMPARED (experiment 150, 2026-11-16).
 *
 *  The project on this device is a working copy; the repository is the record. This reads the repository at one commit,
 *  so a project is never opened from files of two different saves; it compares this device's files with those last read
 *  or saved, by digest, so "changed here" is measured rather than guessed; and it lists the discussions changed since
 *  they were last looked at here. Reading only: the one write is `saveToRepository`. */

import {GITHUB_API} from './repository-check.js';

type Fetch=(input:string,init?:RequestInit)=>Promise<Response>;

const headersFor=(token:string)=>({Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'});

async function getJSON(repository:string,path:string,token:string,fetchFn:Fetch){
  const response=await fetchFn(`${GITHUB_API}/repos/${repository}${path}`,{headers:headersFor(token),cache:'no-store'});
  if(response.status===401)throw new Error('GitHub refused the token. It may have expired or been regenerated.');
  if(!response.ok)throw new Error(`GitHub answered ${response.status} reading ${repository}${path?` (${path})`:''}.`);
  return await response.json() as Record<string,unknown>;
}

/** The commit the default branch points at now. */
export async function headCommit(repository:string,token:string,fetchFn:Fetch=fetch):Promise<{branch:string;sha:string}>{
  const about=await getJSON(repository,'',token,fetchFn);
  const branch=String(about.default_branch??'main');
  const ref=await getJSON(repository,`/git/ref/heads/${encodeURIComponent(branch)}`,token,fetchFn);
  return {branch,sha:String((ref.object as {sha?:string})?.sha)};
}

const decodeBase64=(text:string)=>new TextDecoder().decode(Uint8Array.from(atob(text.replace(/\s/g,'')),c=>c.charCodeAt(0)));

/** THE PROJECT'S FILES AT ONE COMMIT: project.json, workflows/ and notes/. The template's own files are not the
 *  project's and are not read. */
export async function readProjectAt(repository:string,token:string,fetchFn:Fetch=fetch):Promise<{commit:string;files:Map<string,string>}>{
  const {sha}=await headCommit(repository,token,fetchFn);
  const commit=await getJSON(repository,`/git/commits/${sha}`,token,fetchFn);
  const tree=await getJSON(repository,`/git/trees/${String((commit.tree as {sha?:string})?.sha)}?recursive=1`,token,fetchFn);
  const entries=(tree.tree as {path:string;type:string;sha:string}[]??[])
    .filter(e=>e.type==='blob'&&(e.path==='project.json'||/^(workflows|notes)\/[^/]+\.json$/.test(e.path)));
  const files=new Map<string,string>();
  for(const entry of entries){
    const blob=await getJSON(repository,`/git/blobs/${entry.sha}`,token,fetchFn);
    files.set(entry.path,blob.encoding==='base64'?decodeBase64(String(blob.content)):String(blob.content));
  }
  return {commit:sha,files};
}

/** A PROJECT DOCUMENT FROM THE REPOSITORY'S FILES, in the shape Import project reads, so a shared project is opened by
 *  the same importer as a backup and cannot acquire a second, more forgiving reader. */
export function projectDocumentFromFiles(files:Map<string,string>){
  const projectText=files.get('project.json');
  if(!projectText)throw new Error('The repository has no project.json, so it holds no Fieldwork project.');
  const project=JSON.parse(projectText) as {name?:string;subject?:string;workflows?:string[];authors?:unknown;members?:unknown;id?:string};
  if(!project.name)throw new Error('The repository holds the empty template: its project.json has no name yet. Save a project to it first.');
  const workflows=(project.workflows??[]).map(name=>{
    const text=files.get(`workflows/${name}.json`);
    if(!text)throw new Error(`project.json lists the workflow "${name}", and workflows/${name}.json is not in the repository.`);
    return {key:name,document:JSON.parse(text) as unknown};});
  if(!workflows.length)throw new Error('The repository\'s project lists no workflows.');
  const notes=[...files].filter(([path])=>path.startsWith('notes/')).map(([,text])=>JSON.parse(text) as unknown);
  return {schema:'fieldwork/project-document/1' as const,exportedAt:new Date().toISOString(),
    project:{schema:'fieldwork/project/2' as const,id:String(project.id??''),name:project.name,subject:project.subject??'',
      workflows:workflows.map(w=>w.key),...(project.authors?{authors:project.authors}:{}),...(project.members?{members:project.members}:{}),...(notes.length?{notes}:{})},
    workflows};
}

/** Each file's SHA-256, so two moments' files can be compared without keeping either. */
export async function fileDigests(files:Map<string,string>):Promise<Record<string,string>>{
  const out:Record<string,string>={};
  for(const [path,text] of files){
    const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text)));
    out[path]=[...digest].map(b=>b.toString(16).padStart(2,'0')).join('');
  }
  return out;
}

/** The paths that differ between the files last read or saved and those this device would save now. The format
 *  declaration and the asset manifest are written fresh by every save and are not the work, so they are not counted. */
export function changedPaths(before:Record<string,string>,now:Record<string,string>):string[]{
  const work=(path:string)=>path==='project.json'||path.startsWith('workflows/')||path.startsWith('notes/');
  return [...new Set([...Object.keys(before),...Object.keys(now)])].filter(work).filter(path=>before[path]!==now[path]).sort();
}

export interface RecentDiscussion {title:string;url:string;category:string;author:string;updatedAt:string;replies:number;isNew:boolean}

/** THE LATEST DISCUSSIONS, and which changed since they were last looked at here. "Since you last looked", not
 *  "unread": what GitHub counts as read lives in its notifications, which this token does not reach. */
export async function recentDiscussions(repository:string,token:string,seenAt:string|undefined,fetchFn:Fetch=fetch):Promise<{total:number;fresh:number;items:RecentDiscussion[]}>{
  const [owner,name]=repository.split('/');
  const response=await fetchFn(`${GITHUB_API}/graphql`,{method:'POST',headers:headersFor(token),cache:'no-store',
    body:JSON.stringify({query:'query($o:String!,$n:String!){repository(owner:$o,name:$n){discussions(first:20,orderBy:{field:UPDATED_AT,direction:DESC}){totalCount nodes{title url updatedAt category{name} author{login} comments{totalCount}}}}}',
      variables:{o:owner,n:name}})});
  const body=await response.json().catch(()=>null) as {data?:{repository?:{discussions?:{totalCount:number;nodes:{title:string;url:string;updatedAt:string;category?:{name:string};author?:{login:string};comments?:{totalCount:number}}[]}}};errors?:{message:string}[]}|null;
  const discussions=body?.data?.repository?.discussions;
  if(!discussions)throw new Error(body?.errors?.[0]?.message??`GitHub answered ${response.status}.`);
  const items=discussions.nodes.map(d=>({title:d.title,url:d.url,category:d.category?.name??'',author:d.author?.login??'someone',
    updatedAt:d.updatedAt,replies:d.comments?.totalCount??0,isNew:!seenAt||d.updatedAt>seenAt}));
  return {total:discussions.totalCount,fresh:items.filter(i=>i.isNew).length,items};
}

/** WHO GITHUB SAYS HAS ACCESS, with each person's repository role. GitHub may refuse this list to a token without the
 *  right permission; the refusal is said, and the project's own members are shown regardless. */
export async function listCollaborators(repository:string,token:string,fetchFn:Fetch=fetch):Promise<{login:string;role:string}[]>{
  const response=await fetchFn(`${GITHUB_API}/repos/${repository}/collaborators?affiliation=all&per_page=100`,{headers:headersFor(token),cache:'no-store'});
  if(!response.ok)throw new Error(response.status===403
    ?'GitHub would not list who has access through this token (403).':`GitHub answered ${response.status} listing who has access.`);
  const people=await response.json() as {login:string;role_name?:string}[];
  return people.map(p=>({login:p.login,role:p.role_name??'read'}));
}

/** Where a discussion can be started: the repository's GraphQL id and its categories. */
export async function discussionTargets(repository:string,token:string,fetchFn:Fetch=fetch):Promise<{repositoryId:string;categories:{id:string;name:string;slug:string}[]}>{
  const [owner,name]=repository.split('/');
  const response=await fetchFn(`${GITHUB_API}/graphql`,{method:'POST',headers:headersFor(token),cache:'no-store',
    body:JSON.stringify({query:'query($o:String!,$n:String!){repository(owner:$o,name:$n){id discussionCategories(first:25){nodes{id name slug}}}}',variables:{o:owner,n:name}})});
  const body=await response.json().catch(()=>null) as {data?:{repository?:{id:string;discussionCategories:{nodes:{id:string;name:string;slug:string}[]}}};errors?:{message:string}[]}|null;
  const repo=body?.data?.repository;
  if(!repo)throw new Error(body?.errors?.[0]?.message??`GitHub answered ${response.status}.`);
  return {repositoryId:repo.id,categories:repo.discussionCategories.nodes};
}

/** THE REPOSITORIES A TOKEN REACHES (2026-11-16). The practitioner: "there should be a match between credentials for
 *  projects in the credentials file (since each token is for only one project) and the projects that show up on the
 *  shared project list." Expected to list the one repository a fine-grained token was given; it does not. For the
 *  practitioner's token, given one, it listed 86: every repository they can see. So it is used only to OFFER a choice,
 *  private ones first, when a credential does not yet name its repository. */
export async function tokenRepositories(token:string,fetchFn:Fetch=fetch):Promise<{name:string;private:boolean}[]>{
  const response=await fetchFn(`${GITHUB_API}/user/repos?per_page=100&sort=updated`,{headers:headersFor(token),cache:'no-store'});
  if(response.status===401)throw new Error('GitHub refused the token. It may have expired or been regenerated.');
  if(!response.ok)throw new Error(`GitHub answered ${response.status} listing the token's repositories.`);
  // PRIVATE FIRST: a project's repository usually is, and the list holds every public repository the person can see.
  const repos=await response.json() as {full_name:string;private?:boolean}[];
  return [...repos.filter(r=>r.private),...repos.filter(r=>!r.private)].map(r=>({name:r.full_name,private:!!r.private}));
}

/** THE REPOSITORY A CREDENTIAL'S NAME POINTS AT: one whose name (after the owner) is the credential's label or reference,
 *  ignoring case. Offered, never assumed: the person says yes. Null when none matches, or more than one does. */
export function namedRepository(repos:readonly {name:string}[],label:string,ref:string):string|null{
  const want=[label,ref].map(v=>v.trim().toLowerCase()).filter(Boolean);
  const hits=repos.filter(r=>want.includes(r.name.split('/')[1]!.toLowerCase()));
  return hits.length===1?hits[0]!.name:null;
}

/** GET THE LATEST, WITHOUT LOSING WHAT IS ONLY HERE (2026-11-16). Before this, Get the latest replaced the project here
 *  with the repository's, so a second author who had added a workflow lost it the moment their save was refused. Each
 *  file is one workflow or one note, so most of a merge is deciding per file, against the files as they stood at the
 *  last read or save (`base`):
 *
 *  - changed only on GitHub, or new there: GitHub's;
 *  - changed only here, or new here: this device's, and it stays "changed here", to be saved;
 *  - changed on both and now different: the person chooses (`choose`), never this function;
 *  - removed on GitHub and unchanged here: removed; removed on GitHub and changed here: kept, and said.
 *
 *  project.json is the one file every author touches. Taken whole when only one side changed it; when both did, the
 *  repository's, with the workflows both sides hold and every member either side names. */
export interface Merge {files:Map<string,string>;keptHere:string[];fromGitHub:string[];chosen:{path:string;kept:'here'|'github'}[];removed:string[]}
export async function mergeLatest(base:Record<string,string>,baseGitHub:Record<string,string>,here:Map<string,string>,github:Map<string,string>,
  choose:(path:string)=>Promise<'here'|'github'>|'here'|'github'):Promise<Merge>{
  const work=(p:string)=>p.startsWith('workflows/')||p.startsWith('notes/');
  const [dh,dg]=await Promise.all([fileDigests(here),fileDigests(github)]);
  const files=new Map<string,string>(),out:Merge={files,keptHere:[],fromGitHub:[],chosen:[],removed:[]};
  for(const path of [...new Set([...here.keys(),...github.keys()])].filter(work).sort()){
    // Each side against its own baseline: this device's files against what it regenerated, GitHub's against what
    // GitHub held. The two can differ byte for byte with nothing changed.
    const h=dh[path],g=dg[path],b=base[path],bg=baseGitHub[path]??base[path];
    const hereChanged=h!==b,githubChanged=g!==bg;
    if(!h&&!g)continue;
    if(!h){if(b===undefined||githubChanged){files.set(path,github.get(path)!);out.fromGitHub.push(path);}
      continue;}// removed here and unchanged on GitHub: stays removed
    if(!g){if(bg!==undefined&&!hereChanged){out.removed.push(path);continue;}
      files.set(path,here.get(path)!);out.keptHere.push(path);continue;}
    if(!hereChanged&&!githubChanged){files.set(path,github.get(path)!);continue;}
    if(!hereChanged){files.set(path,github.get(path)!);out.fromGitHub.push(path);continue;}
    if(!githubChanged){files.set(path,here.get(path)!);out.keptHere.push(path);continue;}
    if(h===g){files.set(path,github.get(path)!);continue;}
    const kept=await choose(path);out.chosen.push({path,kept});
    files.set(path,(kept==='here'?here:github).get(path)!);if(kept==='here')out.keptHere.push(path);
  }
  // project.json
  const ph=here.get('project.json'),pg=github.get('project.json');
  const hereChangedProject=dh['project.json']!==base['project.json'];
  const githubChangedProject=dg['project.json']!==(baseGitHub['project.json']??base['project.json']);
  const parse=(t?:string)=>{try{return t?JSON.parse(t) as Record<string,unknown>:{};}catch{return {};}};
  let project:Record<string,unknown>;
  if(!ph||!hereChangedProject)project=parse(pg??ph);
  else if(!githubChangedProject||!pg){project=parse(ph);out.keptHere.push('project.json');}
  else{const h2=parse(ph),g2=parse(pg);
    const members=[...((g2.members as {login:string}[]|undefined)??[])];
    for(const m of (h2.members as {login:string}[]|undefined)??[])
      if(!members.some(x=>x.login.toLowerCase()===m.login.toLowerCase()))members.push(m);
    project={...g2,...(members.length?{members}:{})};out.keptHere.push('project.json');}
  // The workflows it lists are the ones the merge holds: GitHub's order, then those only here.
  const held=[...files.keys()].filter(p=>p.startsWith('workflows/')).map(p=>p.slice('workflows/'.length,-'.json'.length));
  const order=[...((parse(pg).workflows as string[]|undefined)??[]),...((parse(ph).workflows as string[]|undefined)??[])];
  project.workflows=[...new Set([...order.filter(n=>held.includes(n)),...held])];
  files.set('project.json',JSON.stringify(project,null,1)+'\n');
  return out;
}
