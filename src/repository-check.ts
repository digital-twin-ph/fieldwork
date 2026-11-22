/** IS THIS REPOSITORY READY TO HOLD A SHARED PROJECT? (experiment 150, the first read, 2026-11-16)
 *
 *  Read only: every request is a GET, or a GraphQL query, through the person's own GitHub token. What it cannot
 *  learn without writing, whether the token may write, it says it has not checked. */

export const GITHUB_API='https://api.github.com';

export type CheckState='yes'|'no'|'unknown';
export interface CheckLine {key:string;state:CheckState;text:string}
export interface DiscussionCategory {id:string;name:string;slug:string}
/** `repositoryId` and `categories` are there only when Discussions could be read: what a post needs. */
export interface RepositoryCheck {repository:string;lines:CheckLine[];repositoryId?:string;categories?:DiscussionCategory[]}

type Fetch=(input:string,init?:RequestInit)=>Promise<Response>;

/** `owner/name`, or a github.com address of one. */
export function repositoryName(raw:string):string|null{
  const m=/^(?:https?:\/\/github\.com\/)?([A-Za-z0-9-]{1,39})\/([A-Za-z0-9._-]{1,100}?)(?:\.git)?\/?$/.exec(raw.trim());
  return m?`${m[1]}/${m[2]}`:null;
}

const dateOf=(header:string|null)=>{
  if(!header)return null;const at=new Date(header.replace(' UTC','Z').replace(' ','T'));
  return Number.isNaN(at.getTime())?header:at.toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
};

export async function checkRepository(repository:string,token:string,fetchFn:Fetch=fetch):Promise<RepositoryCheck>{
  const headers={Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  const get=(path:string,accept?:string)=>fetchFn(`${GITHUB_API}${path}`,{headers:accept?{...headers,Accept:accept}:headers,cache:'no-store'});
  const lines:CheckLine[]=[];const add=(key:string,state:CheckState,text:string)=>lines.push({key,state,text});

  const repo=await get(`/repos/${repository}`);
  const expires=dateOf(repo.headers.get('github-authentication-token-expiration'));
  if(repo.status===401){add('token','no','GitHub refused the token. It may have expired or been regenerated; add the new one in Credentials.');return {repository,lines};}
  if(repo.status===404){add('found','no',`${repository} was not found, or the token cannot see it. Check the name, and that the token was given this repository.`);return {repository,lines};}
  if(!repo.ok){add('found','no',`GitHub answered ${repo.status}.`);return {repository,lines};}
  const about=await repo.json() as {private:boolean;has_discussions:boolean;default_branch:string;permissions?:Partial<Record<'admin'|'maintain'|'push'|'triage'|'pull',boolean>>};
  add('found','yes',`${repository} answers through your token. It is ${about.private?'private':'public'}.`);
  if(expires)add('expires','yes',`The token expires on ${expires}.`);
  // YOUR ROLE, AS GITHUB GIVES IT: the person's, not the token's. A token can be narrower than its owner's role, and
  // nothing in GitHub's answer says how much narrower; only a write shows that.
  const p=about.permissions;
  const role=p?.admin?'Admin':p?.maintain?'Maintain':p?.push?'Write':p?.triage?'Triage':p?.pull?'Read':null;
  if(role)add('role','yes',`Your role here is ${role}${p?.push?': you may save to it':': you may read it, not save to it'}. The token may allow less than your role.`);
  else add('role','unknown','GitHub did not say what your role here is.');

  const format=await get(`/repos/${repository}/contents/.fieldwork/format.json`,'application/vnd.github.raw+json');
  if(format.ok){const f=await format.json().catch(()=>null) as {version?:unknown}|null;
    add('layout','yes',`It has a Fieldwork project's layout${f?.version!==undefined?`, version ${String(f.version)}`:''}.`);}
  else add('layout','no',`It has no .fieldwork/format.json, so it was not made from the project template.`);
  const project=await get(`/repos/${repository}/contents/project.json`,'application/vnd.github.raw+json');
  if(project.ok){const p=await project.json().catch(()=>null) as {name?:unknown;workflows?:unknown[]}|null;
    add('project','yes',p?.name?`Its project is "${String(p.name)}", with ${Array.isArray(p.workflows)?p.workflows.length:0} workflow${Array.isArray(p.workflows)&&p.workflows.length===1?'':'s'}.`:'Its project.json has no name yet: the empty template.');}
  else{
    // ENCRYPTED (the export encryption audit, 2026-11-21): its project is there, readable by its members only.
    const sealed=await get(`/repos/${repository}/contents/project.json.fwsealed`,'application/vnd.github.raw+json');
    if(sealed.ok)add('project','yes','Its project is encrypted: only its members can read its name and its workflows.');
    else add('project','no','It has no project.json.');}

  if(!about.has_discussions)add('discussions','no','Discussions is off. Turn it on under Settings, Features.');
  else{
    const graph=await fetchFn(`${GITHUB_API}/graphql`,{method:'POST',headers,cache:'no-store',
      body:JSON.stringify({query:'query($o:String!,$n:String!){repository(owner:$o,name:$n){id discussionCategories(first:25){nodes{id name slug}}discussions(first:1){totalCount}}}',
        variables:{o:repository.split('/')[0],n:repository.split('/')[1]}})});
    const body=graph.ok?await graph.json().catch(()=>null) as {data?:{repository?:{id?:string;discussionCategories?:{nodes:DiscussionCategory[]};discussions?:{totalCount:number}}};errors?:{message:string}[]}|null:null;
    const categories=body?.data?.repository?.discussionCategories?.nodes;
    if(!categories)add('discussions','unknown',`Discussions is on; its categories could not be read${body?.errors?.[0]?`: ${body.errors[0].message}`:` (GitHub answered ${graph.status})`}. The token may lack Discussions access.`);
    else{
      add('discussions','yes',`Discussions is on, with ${categories.length} categor${categories.length===1?'y':'ies'}: ${categories.map(c=>c.name).join(', ')}.`);
      const count=body?.data?.repository?.discussions?.totalCount??0;
      add('threads','yes',`It holds ${count} discussion${count===1?'':'s'}.`);
      const decisions=categories.some(c=>c.slug==='decisions');
      add('decisions',decisions?'yes':'no',decisions?'It has the decisions category the template\'s form needs.':'It has no category named decisions; the template\'s decision form needs one. Make it under Discussions, the pencil beside Categories.');
      add('write','unknown','Whether the token may write is not checked: that is known only by writing, and this check writes nothing.');
      return {repository,lines,repositoryId:body?.data?.repository?.id,categories};
    }
  }
  add('write','unknown','Whether the token may write is not checked: that is known only by writing, and this check writes nothing.');
  return {repository,lines};
}

export type PostResult={ok:true;url:string;number:number}|{ok:false;text:string};

/** ONE DISCUSSION, POSTED THROUGH THE PERSON'S TOKEN: the first write (experiment 150, 2026-11-16). Through the API a
 *  post bypasses the category's form, which GitHub applies only on its own page. */
export async function postDiscussion(repositoryId:string,categoryId:string,title:string,body:string,token:string,fetchFn:Fetch=fetch):Promise<PostResult>{
  const response=await fetchFn(`${GITHUB_API}/graphql`,{method:'POST',cache:'no-store',
    headers:{Authorization:`Bearer ${token}`,Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'},
    body:JSON.stringify({query:'mutation($r:ID!,$c:ID!,$t:String!,$b:String!){createDiscussion(input:{repositoryId:$r,categoryId:$c,title:$t,body:$b}){discussion{url number}}}',
      variables:{r:repositoryId,c:categoryId,t:title,b:body}})});
  if(response.status===401)return {ok:false,text:'GitHub refused the token. It may have expired or been regenerated.'};
  const answer=await response.json().catch(()=>null) as {data?:{createDiscussion?:{discussion?:{url:string;number:number}}};errors?:{message:string}[]}|null;
  const made=answer?.data?.createDiscussion?.discussion;
  if(made)return {ok:true,url:made.url,number:made.number};
  const why=answer?.errors?.[0]?.message??`GitHub answered ${response.status}`;
  return {ok:false,text:/not accessible/i.test(why)
    ?`The token may not write to Discussions (${why}). Give it Discussions: Read and write on GitHub.`:`Not posted: ${why}.`};
}
