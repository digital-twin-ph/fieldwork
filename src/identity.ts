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
