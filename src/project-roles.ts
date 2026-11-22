/** PROJECT ROLES AND REPOSITORY ROLES (experiment 150, 2026-11-16; fw:ProjectRole, fw:ProjectMembership).
 *
 *  A REPOSITORY ROLE is what GitHub lets a person do in the repository, and only GitHub grants it. A PROJECT ROLE is the
 *  person's place in the investigation, given in the project and recorded in its project.json, so every author sees the
 *  same team. Neither is authorship. A repository role below what the project role needs is said, never refused.
 *
 *  Who a member is (their name, ORCID iD, and affiliations with ROR IDs) is theirs to give: entered by the person
 *  themselves with their identity open, and signed with its key, so nobody can put it on the project in their name. */

export const PROJECT_ROLES=['lead-author','co-author','reviewer'] as const;
export type ProjectRole=typeof PROJECT_ROLES[number];
export const PROJECT_ROLE_LABEL:Record<ProjectRole,string>={'lead-author':'Lead author','co-author':'Co-author','reviewer':'Reviewer'};
/** GitHub's repository roles, lowest first, as its API names them. */
export const REPOSITORY_ROLES=['read','triage','write','maintain','admin'] as const;
export type RepositoryRole=typeof REPOSITORY_ROLES[number];
/** fw:minimumRepositoryRole. */
export const MINIMUM_REPOSITORY_ROLE:Record<ProjectRole,RepositoryRole>={'lead-author':'maintain','co-author':'write','reviewer':'read'};

/** The project role a repository role suggests. Maintain is a co-author's by default (the practitioner, 2026-11-16):
 *  it is GitHub housekeeping, and the lead author is the one who owns the repository. */
export const proposedProjectRole=(role:RepositoryRole):ProjectRole=>role==='admin'?'lead-author':role==='maintain'||role==='write'?'co-author':'reviewer';

/** What a repository role below the project role's needs stops the person doing, or null when it is enough. */
export function roleShortfall(projectRole:ProjectRole,repositoryRole:RepositoryRole|undefined):string|null{
  if(!repositoryRole)return 'GitHub does not list them as having access to the repository: invite them there.';
  const need=MINIMUM_REPOSITORY_ROLE[projectRole];
  if(REPOSITORY_ROLES.indexOf(repositoryRole)>=REPOSITORY_ROLES.indexOf(need))return null;
  return `As ${PROJECT_ROLE_LABEL[projectRole]} they need ${need} on GitHub and have ${repositoryRole}`
    +(projectRole==='reviewer'?'.':': they cannot save to the repository.');
}

/** fw:ProjectMembership, as project.json carries it. */
export interface ProjectMember {
  login:string;
  role:ProjectRole;
  since:string;
  /** Given by the member themselves, with their identity open; absent until they do. */
  name?:string;
  orcid?:string;
  affiliations?:{name:string;ror?:string}[];
  /** Their identity's key for sealed files (the export encryption audit), so a project backup opens for them. In the statement they
   *  sign, so nobody can put another key in their place. */
  sealKey?:string;
  /** A key another member pasted for them, before they could open the project to give their own: used to seal the
   *  project for them, and said to be given by someone else. Their own signed key replaces it. */
  givenKey?:string;
  givenBy?:string;
  /** Their key's signature over login, name, ORCID iD and affiliations, and the key it verifies against. */
  publicKey?:string;
  algorithm?:string;
  signature?:string;
}

const LOGIN=/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;
/** Read tolerantly: a member that cannot be read is dropped, never half kept; one login appears once. */
export function readMembers(raw:unknown):ProjectMember[]{
  if(!Array.isArray(raw))return [];
  const seen=new Set<string>();const out:ProjectMember[]=[];
  for(const m of raw){
    if(!m||typeof m!=='object')continue;
    const r=m as Record<string,unknown>;
    if(typeof r.login!=='string'||!LOGIN.test(r.login)||!PROJECT_ROLES.includes(r.role as ProjectRole)||typeof r.since!=='string')continue;
    const key=r.login.toLowerCase();if(seen.has(key))continue;seen.add(key);
    const text=(k:string)=>typeof r[k]==='string'&&r[k]?{[k]:r[k] as string}:{};
    const affiliations=Array.isArray(r.affiliations)?(r.affiliations as unknown[]).flatMap(a=>{const x=a as Record<string,unknown>|null;
      return x&&typeof x.name==='string'&&x.name?[{name:x.name,...(typeof x.ror==='string'&&x.ror?{ror:x.ror}:{})}]:[];}):[];
    out.push({login:r.login,role:r.role as ProjectRole,since:r.since,...text('name'),...text('orcid'),...text('sealKey'),...text('givenKey'),...text('givenBy'),...(affiliations.length?{affiliations}:{}),
      ...(typeof r.signature==='string'&&typeof r.publicKey==='string'&&typeof r.algorithm==='string'
        ?{publicKey:r.publicKey,algorithm:r.algorithm,signature:r.signature}:{})});
  }
  return out;
}

/** What a member's own signature covers, in a fixed order. Their key for sealed files is covered where they gave one;
 *  a statement signed before 2026-11-21 had none and reads exactly as it was signed. */
export const memberStatement=(m:Pick<ProjectMember,'login'|'name'|'orcid'|'affiliations'|'sealKey'>)=>
  JSON.stringify({login:m.login,name:m.name??null,orcid:m.orcid??null,
    affiliations:(m.affiliations??[]).map(a=>({name:a.name,ror:a.ror??null})),...(m.sealKey?{sealKey:m.sealKey}:{})});
