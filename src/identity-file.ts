/** AN IDENTITY YOU CARRY, AND WHO DID WHAT (experiment 218, the spike of 2026-11-16).
 *
 *  The practitioner: *"a publication in fact can have an audit trail including who generated what in collaborative
 *  projects"*, and of notes, *"Both should have versioning."* An audit trail is a note's versions, each saying who made
 *  it in a way anyone can check offline. This module is the two halves: the identity file (a profile and a signing key,
 *  encrypted with a passphrase, kept by the person as `<name>.fwid`) and a note's signed versions.
 *
 *  AN IDENTITY IS NOT A CREDENTIAL. The file holds no token for any service, and one that does is refused on opening;
 *  service secrets stay in `credentials.ts`. The opened identity lives in memory only, in the caller's hands; nothing
 *  here writes to browser storage.
 *
 *  What a signature shows: which key signed these words at that time. Not that the person named wrote them, beyond what
 *  holding the file and its passphrase shows. */
import type {Note} from './notes.js';
import {isAvatarChoice,type AvatarChoice} from './avatars.js';

export const IDENTITY_FORMAT='fieldwork/identity/1';
/** PBKDF2 rounds: OWASP's 2023 figure for SHA-256. Measured cost is recorded in 218. */
export const KDF_ITERATIONS=600_000;
export type SigningAlgorithm='Ed25519'|'ECDSA-P256';

export interface IdentityProfile {name:string; login?:string; orcid?:string;
  /** An icon of Fieldwork's set on a colour (`avatars.ts`); initials where absent. */
  avatar?:AvatarChoice}
/** An identity opened for this session: its profile, its public key, and a private key that cannot be exported. */
export interface OpenIdentity {profile:IdentityProfile; algorithm:SigningAlgorithm; publicKey:string; privateKey:CryptoKey}

const enc=new TextEncoder(),dec=new TextDecoder();
const b64=(bytes:ArrayBuffer|Uint8Array)=>{const u=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  let s='';for(const x of u)s+=String.fromCharCode(x);return btoa(s);};
const unb64=(text:string)=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
const subtle=()=>globalThis.crypto.subtle;

/** AN ORCID iD, checked offline: four groups of four, the last character an ISO 7064 11-2 check digit. */
export function validOrcid(value:string):boolean{
  if(!/^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/.test(value))return false;
  const digits=value.replace(/-/g,'');let total=0;
  for(const c of digits.slice(0,15))total=(total+Number(c))*2;
  const check=(12-total%11)%11;
  return digits[15]===(check===10?'X':String(check));
}

/** ED25519 WHERE THE BROWSER HAS IT, ECDSA P-256 WHERE IT DOES NOT (218, open question 1). Which one was used is kept
 *  with the key, so a signature is always verified with the algorithm that made it. */
const PARAMS:Record<SigningAlgorithm,{generate:EcKeyGenParams|Algorithm;sign:EcdsaParams|Algorithm;import:EcKeyImportParams|Algorithm}>={
  'Ed25519':{generate:{name:'Ed25519'},sign:{name:'Ed25519'},import:{name:'Ed25519'}},
  'ECDSA-P256':{generate:{name:'ECDSA',namedCurve:'P-256'},sign:{name:'ECDSA',hash:'SHA-256'},import:{name:'ECDSA',namedCurve:'P-256'}},
};
async function generateKeys(prefer:SigningAlgorithm[]=['Ed25519','ECDSA-P256']):Promise<{algorithm:SigningAlgorithm;keys:CryptoKeyPair}>{
  for(const algorithm of prefer){
    try{return {algorithm,keys:await subtle().generateKey(PARAMS[algorithm].generate,true,['sign','verify']) as CryptoKeyPair};}
    catch{/* not in this browser: the next one */}
  }
  throw new Error('This browser can make neither an Ed25519 nor an ECDSA P-256 key, so it cannot sign.');
}

async function passphraseKey(passphrase:string,salt:Uint8Array,iterations:number):Promise<CryptoKey>{
  const base=await subtle().importKey('raw',enc.encode(passphrase),'PBKDF2',false,['deriveKey']);
  return subtle().deriveKey({name:'PBKDF2',hash:'SHA-256',salt:salt as BufferSource,iterations},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}

/** A NEW IDENTITY FILE: the profile and a fresh key pair, encrypted with the passphrase. Returns the file's text, to be
 *  saved by the person, and the identity opened for this session. */
export async function createIdentityFile(profile:IdentityProfile,passphrase:string,
  options:{iterations?:number;prefer?:SigningAlgorithm[]}={}):Promise<{file:string;identity:OpenIdentity}>{
  const name=profile.name.trim();
  if(!name)throw new Error('An identity needs a name.');
  if(profile.orcid&&!validOrcid(profile.orcid))throw new Error(`${profile.orcid} is not an ORCID iD: its check digit does not match.`);
  if(passphrase.length<12)throw new Error('Use a passphrase of at least 12 characters: it is the only lock on the file.');
  const {algorithm,keys}=await generateKeys(options.prefer);
  const publicKey=b64(await subtle().exportKey('spki',keys.publicKey));
  const privateKey=b64(await subtle().exportKey('pkcs8',keys.privateKey));
  const clean:IdentityProfile={name,...(profile.login?.trim()?{login:profile.login.trim()}:{}),...(profile.orcid?{orcid:profile.orcid}:{}),
    ...(isAvatarChoice(profile.avatar)?{avatar:{icon:profile.avatar.icon,colour:profile.avatar.colour}}:{})};
  const file=await seal({profile:clean,key:{algorithm,publicKey,privateKey}},passphrase,options.iterations??KDF_ITERATIONS);
  return {file,identity:await openFrom(clean,algorithm,publicKey,privateKey)};
}

interface Inner {profile:IdentityProfile; key:{algorithm:SigningAlgorithm;publicKey:string;privateKey:string}}
async function seal(inner:Inner,passphrase:string,iterations:number):Promise<string>{
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const sealed=await subtle().encrypt({name:'AES-GCM',iv},await passphraseKey(passphrase,salt,iterations),enc.encode(JSON.stringify(inner)));
  return JSON.stringify({format:IDENTITY_FORMAT,kdf:{name:'PBKDF2',hash:'SHA-256',iterations,salt:b64(salt)},
    cipher:{name:'AES-GCM',iv:b64(iv)},data:b64(sealed)},null,2);
}

async function openFrom(profile:IdentityProfile,algorithm:SigningAlgorithm,publicKey:string,privateKey:string):Promise<OpenIdentity>{
  // NOT EXTRACTABLE ONCE OPENED: the private key can sign and nothing can read it back out of the session.
  const key=await subtle().importKey('pkcs8',unb64(privateKey) as BufferSource,PARAMS[algorithm].import,false,['sign']);
  return {profile,algorithm,publicKey,privateKey:key};
}

/** A FIELD NAMED FOR A SECRET, anywhere in the file: an identity is not a credential, and one holding a token is refused. */
const SECRET=/token|secret|password|credential|pat$/i;
const holdsSecret=(value:unknown):boolean=>!!value&&typeof value==='object'
  &&Object.entries(value as Record<string,unknown>).some(([k,v])=>SECRET.test(k)||holdsSecret(v));

/** OPEN AN IDENTITY FILE with its passphrase. Refused, with the reason, when the passphrase is wrong, the file is not an
 *  identity file, or it holds a secret for a service. */
export async function openIdentityFile(file:string,passphrase:string):Promise<OpenIdentity>{
  const {inner}=await unseal(file,passphrase);
  return openFrom(inner.profile,inner.key.algorithm,inner.key.publicKey,inner.key.privateKey);
}

/** A CHANGED PROFILE, SEALED AGAIN: the same key, a new salt. The opened key cannot be read back out of the session,
 *  so a change needs the file and its passphrase again, and gives a new file to keep in place of the old. */
export async function updateIdentityFile(file:string,passphrase:string,change:{avatar?:AvatarChoice|null}):Promise<{file:string;identity:OpenIdentity}>{
  const {inner,iterations}=await unseal(file,passphrase);
  const {avatar:_was,...rest}=inner.profile;void _was;
  const profile:IdentityProfile={...rest,...(change.avatar&&isAvatarChoice(change.avatar)?{avatar:change.avatar}:{})};
  const next={profile,key:inner.key};
  return {file:await seal(next,passphrase,iterations),identity:await openFrom(profile,inner.key.algorithm,inner.key.publicKey,inner.key.privateKey)};
}

async function unseal(file:string,passphrase:string):Promise<{inner:Inner;iterations:number}>{
  let outer:{format?:unknown;kdf?:{iterations?:unknown;salt?:unknown};cipher?:{iv?:unknown};data?:unknown};
  try{outer=JSON.parse(file);}catch{throw new Error('This is not an identity file: it is not JSON.');}
  if(outer?.format!==IDENTITY_FORMAT||typeof outer.data!=='string'||typeof outer.kdf?.salt!=='string'
    ||typeof outer.kdf?.iterations!=='number'||typeof outer.cipher?.iv!=='string')
    throw new Error(`This is not a Fieldwork identity file (${IDENTITY_FORMAT}).`);
  let inner:{profile?:IdentityProfile;key?:{algorithm?:SigningAlgorithm;publicKey?:string;privateKey?:string}};
  try{
    const key=await passphraseKey(passphrase,unb64(outer.kdf.salt),outer.kdf.iterations);
    inner=JSON.parse(dec.decode(await subtle().decrypt({name:'AES-GCM',iv:unb64(outer.cipher.iv) as BufferSource},key,unb64(outer.data) as BufferSource)));
  }catch{throw new Error('The passphrase does not open this file.');}
  if(holdsSecret(inner))throw new Error('This file holds a secret for a service. An identity file carries no credentials, so it is not opened.');
  const algorithm=inner.key?.algorithm;
  if(!inner.profile?.name||!inner.key?.publicKey||!inner.key.privateKey||(algorithm!=='Ed25519'&&algorithm!=='ECDSA-P256'))
    throw new Error('This identity file is incomplete: it has no name or no key.');
  const {avatar,...profile}=inner.profile;
  return {inner:{profile:{...profile,...(isAvatarChoice(avatar)?{avatar}:{})},
    key:{algorithm,publicKey:inner.key.publicKey,privateKey:inner.key.privateKey}},iterations:outer.kdf.iterations};
}

/** WHAT OF A NOTE IS SIGNED: its content, in one canonical form (keys sorted, no whitespace), so the same note signs the
 *  same bytes after an export and an import. Its versions and its author are not content. */
const CONTENT=['kind','id','section','fn','text','quote','about','items','answers','components','works','words','argument'] as const;
export function canonical(value:unknown):string{
  if(Array.isArray(value))return `[${value.map(canonical).join(',')}]`;
  if(value&&typeof value==='object')return `{${Object.keys(value).sort().filter(k=>(value as Record<string,unknown>)[k]!==undefined)
    .map(k=>`${JSON.stringify(k)}:${canonical((value as Record<string,unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export function noteContent(note:Note):Record<string,unknown>{
  const out:Record<string,unknown>={};
  for(const k of CONTENT)if(k in note&&(note as unknown as Record<string,unknown>)[k]!==undefined)out[k]=(note as unknown as Record<string,unknown>)[k];
  if('image' in note&&note.image)out.image=note.image.sha256;
  return out;
}

/** ONE VERSION OF A NOTE: what it said, when, and, where an identity was open, who, with the signature. */
export interface NoteVersion {
  at:string;
  content:Record<string,unknown>;
  /** The SHA-256 of the canonical content, hex. */
  digest:string;
  by?:{name:string;login?:string;orcid?:string;algorithm:SigningAlgorithm;publicKey:string};
  signature?:string;
}
const hex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');
const signed=(v:Pick<NoteVersion,'at'|'digest'|'by'>)=>enc.encode(canonical({at:v.at,digest:v.digest,by:v.by}));

/** A NEW VERSION of a note as it is now, signed where an identity is open. */
export async function noteVersion(note:Note,at:string,identity?:OpenIdentity|null):Promise<NoteVersion>{
  const content=noteContent(note);
  const digest=hex(await subtle().digest('SHA-256',enc.encode(canonical(content))));
  if(!identity)return {at,content,digest};
  const {name,login,orcid}=identity.profile;
  const by={name,...(login?{login}:{}),...(orcid?{orcid}:{}),algorithm:identity.algorithm,publicKey:identity.publicKey};
  const signature=b64(await subtle().sign(PARAMS[identity.algorithm].sign,identity.privateKey,signed({at,digest,by})));
  return {at,content,digest,by,signature};
}

/** WHAT A VERSION'S SIGNATURE SAYS, checked offline against the key it names: signed and verified; the signature fails
 *  (the content, the time or the signer changed since); or not signed. */
export type VersionCheck='verified'|'fails'|'unsigned';
export async function checkVersion(version:NoteVersion):Promise<VersionCheck>{
  if(!version.signature||!version.by)return 'unsigned';
  try{
    const digest=hex(await subtle().digest('SHA-256',enc.encode(canonical(version.content))));
    if(digest!==version.digest)return 'fails';
    const key=await subtle().importKey('spki',unb64(version.by.publicKey) as BufferSource,PARAMS[version.by.algorithm].import,false,['verify']);
    return await subtle().verify(PARAMS[version.by.algorithm].sign,key,unb64(version.signature) as BufferSource,signed(version))?'verified':'fails';
  }catch{return 'fails';}
}

/** Versions read back: each needs a time, content and a digest; a signature without a signer is dropped, not trusted. */
export function readNoteVersions(raw:unknown):NoteVersion[]{
  if(!Array.isArray(raw))return [];
  const out:NoteVersion[]=[];
  for(const v of raw){
    if(!v||typeof v!=='object')continue;
    const r=v as Record<string,unknown>;
    if(typeof r.at!=='string'||typeof r.digest!=='string'||!r.content||typeof r.content!=='object')continue;
    const by=r.by&&typeof r.by==='object'?r.by as NoteVersion['by']:undefined;
    const ok=by&&typeof by.name==='string'&&typeof by.publicKey==='string'&&(by.algorithm==='Ed25519'||by.algorithm==='ECDSA-P256')
      &&typeof r.signature==='string';
    out.push({at:r.at,content:r.content as Record<string,unknown>,digest:r.digest,...(ok?{by:by!,signature:r.signature as string}:{})});
  }
  return out;
}
