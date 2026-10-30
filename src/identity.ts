import {isRecord} from './guards.js';

/** WHO DID THE WORK.
 *
 *  The practitioner, 2026-10-29, on the first problem to solve before several authors can co-own a
 *  publication: *"We can establish identity through GitHub accounts."*
 *
 *  THE IDENTITY IS ALREADY IN THE REPOSITORY, and measuring that is what settled the design rather
 *  than a preference for one provider. `example-1855-cholera-south-london` names no human being
 *  anywhere in its content: not in its 33,306-byte README, not in `provenance.json` -- which
 *  records that four tables were *"transcribed by hand"*, verified cell by cell against two
 *  independent transcriptions, and never says by whom -- and not in the nine notes. Its git
 *  history names exactly one person, across 34 commits.
 *
 *  So the work is not to introduce an identity. It is to carry the one the repository already has
 *  into the artifacts, where a reader of the publication can see it.
 *
 *  AN IDENTITY IS NOT A CREDENTIAL, and the two stay apart. `credentials.ts` holds secrets for
 *  services, encrypted at rest and locked after fifteen idle minutes, because a leaked secret is a
 *  breach. A login is a public name and the whole point of it is to be published. */

/** What is known about an identity. Two tiers, and they are never collapsed into one.
 *
 *  `declared` -- somebody typed the login into this application. This asserts NOTHING: an
 *  offline-first browser cannot check that the account exists, and could not tell whether the
 *  person at the keyboard holds it if it could.
 *
 *  `attested` -- GitHub returned this login for a credential that was presented to it.
 *
 *  Why both exist before either is verified anywhere: a publication's author list is a claim about
 *  who did the work, and the strongest claim this application can make unaided is that a name was
 *  entered. Recording that as plain authorship would be the interface making a promise the data
 *  cannot keep -- the same refusal `Project.exportedAt` already makes, where an absent timestamp
 *  reads as NEVER EXPORTED rather than being guessed at. And two terms now rather than one later
 *  narrowed, because this repository carries a withdrawn-term ratchet at 131 occurrences: a single
 *  term meaning both would have to be withdrawn the day attestation shipped. */
export const IDENTITY_BASES=['declared','attested'] as const;
export type IdentityBasis=typeof IDENTITY_BASES[number];

export interface Author {
  /** The GitHub login. The handle, and the identity's key. */
  login:string;
  /** The display name, when the person gave one. The login is shown when they did not. */
  name?:string;
  basis:IdentityBasis;
  /** When the basis was established. For an attested identity, when GitHub answered. */
  at?:string;
}

/** GitHub's own rule, not a guess at it: up to 39 characters of alphanumerics and single hyphens,
 *  never beginning or ending with a hyphen. Applied to a `declared` login as much as an attested
 *  one, because a login that GitHub could not issue is a typo in every case, and saying so at the
 *  field is cheaper than a publication carrying it. */
export const GITHUB_LOGIN=/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

export const validLogin=(value:unknown):boolean=>
  typeof value==='string'&&GITHUB_LOGIN.test(value);

/** Read tolerantly and DROP what cannot be read, never coerce it -- the rule `readNotes` already
 *  follows. An identity that arrives malformed is not improved by being half kept: an author list
 *  is the one place a half-read name would be published as though it were checked. */
export function readAuthor(raw:unknown):Author|null{
  if(!isRecord(raw)||!validLogin(raw.login))return null;
  const basis=IDENTITY_BASES.includes(raw.basis as IdentityBasis)
    ?raw.basis as IdentityBasis:'declared';
  const name=typeof raw.name==='string'&&raw.name.trim()?raw.name.trim().slice(0,120):undefined;
  const at=typeof raw.at==='string'&&raw.at?raw.at:undefined;
  return {login:raw.login as string,...(name?{name}:{}),basis,...(at?{at}:{})};
}

export function readAuthors(raw:unknown):Author[]{
  if(!Array.isArray(raw))return [];
  const seen=new Set<string>();
  return raw.flatMap(entry=>{
    const author=readAuthor(entry);
    // Keyed on the login, lowercased: GitHub logins are case-insensitive, so the same person
    // entered twice in different cases is one author and not two names on a paper.
    if(!author||seen.has(author.login.toLowerCase()))return [];
    seen.add(author.login.toLowerCase());
    return [author];
  });
}

/** How an identity is shown wherever a person is named. The login is always present, because it is
 *  the part another person can resolve, and a display name alone names nobody checkable. */
export const authorLabel=(author:Author):string=>
  author.name?`${author.name} (@${author.login})`:`@${author.login}`;

/** What the interface may say about an identity, in words that do not overstate it. Used wherever
 *  an author is shown beside their work, so a reader is never left to assume a name was checked. */
export const BASIS_GLOSS:Record<IdentityBasis,string>={
  declared:'Entered here, not checked against GitHub',
  attested:'GitHub returned this login for a presented credential',
};

/** THE ONE ENDPOINT THAT TURNS A TOKEN INTO A NAME.
 *
 *  The practitioner, 2026-10-29: *"The first thing user does when working on a project is
 *  authenticate."* Which settles where an identity comes from, and resolves a dependency rather
 *  than moving a button: the authorship default — *"the owner of the repo is first author by
 *  default"* — needs to know who is using the application, and nothing in `src/` knew. Unlocking a
 *  credential is where it can be learnt.
 *
 *  AND IT COSTS NO ADDITIONAL GRANT, which is why this is cheap. Checked against GitHub's
 *  permissions reference on 2026-10-29: `GET /user` appears in no permission table at all, and the
 *  users documentation says a token without `read:user` still *"receive[s] the public user
 *  response"* — which carries `login`. A token specified for `Contents: Read and write` on one
 *  repository therefore attests its own holder without being widened by a single scope. */
export const GITHUB_API='https://api.github.com';

/** The token is passed, used once, and never stored, logged or put in an error message. A failure
 *  says what happened and nothing about the secret that caused it. */
export async function attestIdentity(token:string,
  fetchImpl:typeof fetch=fetch,api=GITHUB_API):Promise<Author>{
  let response:Response;
  try {
    response=await fetchImpl(`${api}/user`,{headers:{
      Authorization:`Bearer ${token}`,
      Accept:'application/vnd.github+json',
      'X-GitHub-Api-Version':'2022-11-28'}});
  } catch {
    // Offline-first: not reaching GitHub is an ordinary state, not a fault, and it leaves a
    // declared identity exactly as valid as it was.
    throw new Error('GitHub could not be reached, so the login was not confirmed. '
      +'A login entered here still works; it stays marked as unconfirmed.');
  }
  if(response.status===401)
    throw new Error('GitHub refused the token. Check that it has not expired and that it was '
      +'copied whole.');
  if(response.status===403)
    throw new Error('GitHub accepted the token and refused the request. A fine-grained token '
      +'needs the project repository among its selected repositories.');
  if(!response.ok)
    throw new Error(`GitHub answered ${response.status} and the login was not confirmed.`);
  const body:unknown=await response.json().catch(()=>null);
  const login=isRecord(body)&&typeof body.login==='string'?body.login:'';
  // A login GitHub itself returned should always be well formed. Checked anyway, because the one
  // thing worse than an unconfirmed name is a malformed one recorded as confirmed.
  if(!validLogin(login))
    throw new Error('GitHub answered without a usable login, so nothing was confirmed.');
  const name=isRecord(body)&&typeof body.name==='string'&&body.name.trim()
    ?body.name.trim().slice(0,120):undefined;
  return {login,...(name?{name}:{}),basis:'attested',at:new Date().toISOString()};
}

/** WHO IS USING THIS APPLICATION, kept per device.
 *
 *  Deliberately not a login and not a session: there is nothing to sign in to. It is the answer to
 *  "whose name goes on what I make here", which is why it survives a reload and why it is cleared
 *  explicitly rather than expiring. A credential locks after fifteen idle minutes because a leaked
 *  secret is a breach; a name is not a secret and locking it would only make the application forget
 *  who wrote something while they were still writing it. */
const CURRENT='fieldwork/identity/1';

/** The three methods this needs, named structurally rather than as `Storage`.
 *
 *  Not a DOM type, because `project.ts` imports this module and `project.ts` is compiled for the
 *  workers too, where there is no `localStorage` and no `Storage` to refer to. Caught by the
 *  worker typecheck rather than by review. Passing the store in is the better layering regardless:
 *  this module decides what an identity IS, and where a device keeps one is the application's
 *  business. */
export interface IdentityStore {
  getItem(key:string):string|null;
  setItem(key:string,value:string):void;
  removeItem(key:string):void;
}

export function currentIdentity(store:Pick<IdentityStore,'getItem'>|null):Author|null{
  try { return store?readAuthor(JSON.parse(store.getItem(CURRENT)||'null')):null; }
  catch { return null; }
}

/** Returns whether it was kept. Storage can refuse, and an identity that was not stored must not be
 *  reported as stored: the next project would be attributed to somebody the device has forgotten. */
export function setCurrentIdentity(author:Author|null,
  store:Pick<IdentityStore,'setItem'|'removeItem'>|null):boolean{
  if(!store)return false;
  try {
    if(!author){store.removeItem(CURRENT);return true;}
    const kept=readAuthor(author);
    if(!kept)return false;
    store.setItem(CURRENT,JSON.stringify(kept));
    return true;
  } catch { return false; }
}

/** THE REPOSITORY A PROJECT IS CO-OWNED IN, and attaching one is what conversion IS.
 *
 *  The practitioner, 2026-10-29: *"Can a project that did not start as collaborative become
 *  one?"* — and then: *"let's address the mechanical gaps above."* This is the first of them. A
 *  project had no way to name a repository at all, so there was nothing a conversion could do.
 *
 *  **Its presence is the whole definition.** A project with a repository is collaborative and a
 *  project without one is not; there is no separate flag to disagree with it, and no state where a
 *  project believes it is collaborative and cannot say where. */
export interface ProjectRepository {
  owner:string;
  repo:string;
  /** When it was attached. The moment a project became collaborative, which for a converted
   *  project is later than the work it already holds — and that gap is the honest reason a
   *  contributions statement under-credits earlier work rather than a defect in it. */
  attachedAt:string;
}

/** GitHub's rule for a repository name: letters, digits, hyphen, underscore and period, at most
 *  100 characters, and never `.` or `..` alone. Narrower than the owner rule, which is a login. */
export const GITHUB_REPO=/^(?!\.{1,2}$)[A-Za-z0-9._-]{1,100}$/;

export const validRepo=(value:unknown):boolean=>
  typeof value==='string'&&GITHUB_REPO.test(value);

export function readRepository(raw:unknown):ProjectRepository|null{
  if(!isRecord(raw)||!validLogin(raw.owner)||!validRepo(raw.repo))return null;
  const attachedAt=typeof raw.attachedAt==='string'&&raw.attachedAt?raw.attachedAt:'';
  // Without the moment there is no conversion to speak of: the field exists to say WHEN a project
  // stopped being solo, and a repository with no date cannot answer the question it is here for.
  if(!attachedAt)return null;
  return {owner:raw.owner as string,repo:raw.repo as string,attachedAt};
}

/** `owner/repo`, which is how GitHub writes it and how a practitioner will read it back. */
export const repositoryLabel=(repository:ProjectRepository):string=>
  `${repository.owner}/${repository.repo}`;

export const repositoryURL=(repository:ProjectRepository):string=>
  `https://github.com/${repository.owner}/${repository.repo}`;
