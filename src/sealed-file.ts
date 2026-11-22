/** A SEALED FILE (the export encryption audit, 2026-11-21): a backup encrypted for the people who should open it.
 *
 *  The practitioner: *"I want to make sure that we are able to save workflows and projects encrypted by default"*, and
 *  then *"How can others decrypt the project file if I send it to them?"*. So the content is encrypted once, with
 *  AES-256-GCM under a random content key, and that key is wrapped once for each recipient: an identity's encryption key
 *  (ECDH P-256, an ephemeral key per recipient, HKDF-SHA-256), or a passphrase (PBKDF2-SHA-256). Anyone named opens it
 *  with their own key; nobody shares one.
 *
 *  The file: `FWSEALED`, a version byte, the header's length (4 bytes, big-endian), the header as JSON, the ciphertext.
 *  The header is in the clear and is the ciphertext's additional data, so changing it breaks the file. It names no
 *  person: a recipient is its key's fingerprint. */

export const SEALED_FORMAT='fieldwork/sealed/1';
export const SEALED_EXTENSION='.fwsealed';
const MAGIC=new TextEncoder().encode('FWSEALED');
const VERSION=1;
/** PBKDF2 rounds for a passphrase recipient, as the identity file uses. */
export const SEAL_KDF_ITERATIONS=600_000;
const ECDH={name:'ECDH',namedCurve:'P-256'} as const;
const INFO=new TextEncoder().encode('fieldwork/sealed/1 content key');

export type Recipient=
  {kind:'key';fingerprint:string;epk:string;salt:string;iv:string;wrapped:string}|
  {kind:'passphrase';kdf:{name:'PBKDF2';hash:'SHA-256';iterations:number;salt:string};iv:string;wrapped:string};
export interface SealedHeader {
  format:typeof SEALED_FORMAT;
  /** What the plain file was: its name and type, so opening gives back the same file. */
  content:{name:string;mediaType:string};
  cipher:{name:'AES-GCM';iv:string};
  recipients:Recipient[];
}

const subtle=()=>globalThis.crypto.subtle;
const enc=new TextEncoder(),dec=new TextDecoder();
const b64=(bytes:ArrayBuffer|Uint8Array)=>{const u=bytes instanceof Uint8Array?bytes:new Uint8Array(bytes);
  let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode(...u.subarray(i,i+0x8000));return btoa(s);};
const unb64=(text:string)=>Uint8Array.from(atob(text),c=>c.charCodeAt(0));
const random=(n:number)=>crypto.getRandomValues(new Uint8Array(n));
const hex=(bytes:ArrayBuffer)=>[...new Uint8Array(bytes)].map(b=>b.toString(16).padStart(2,'0')).join('');

/** AN ENCRYPTION KEY AS A PERSON PASSES IT ON: `fwkey1:` and the public key, base64 (SPKI). Public: safe to email. */
export const KEY_PREFIX='fwkey1:';
export const keyText=(publicKey:string)=>`${KEY_PREFIX}${publicKey}`;
/** A key read from what a person pasted: the prefix, then a P-256 public key. Null where it is not one. */
export async function readKeyText(text:string):Promise<string|null>{
  const t=text.trim();
  if(!t.startsWith(KEY_PREFIX))return null;
  const key=t.slice(KEY_PREFIX.length).replace(/\s+/g,'');
  try{await subtle().importKey('spki',unb64(key) as BufferSource,ECDH,true,[]);return key;}catch{return null;}
}
/** A key's fingerprint: the first 16 hex characters of the SHA-256 of its SPKI, in groups of four, for reading aloud. */
export async function fingerprint(publicKey:string):Promise<string>{
  return hex(await subtle().digest('SHA-256',unb64(publicKey) as BufferSource)).slice(0,16).match(/.{4}/g)!.join('-');
}

/** A NEW ENCRYPTION KEY PAIR, for an identity: the public key as SPKI base64, the private key as PKCS#8 base64. */
export async function newSealingKeys():Promise<{publicKey:string;privateKey:string}>{
  const pair=await subtle().generateKey(ECDH,true,['deriveBits']) as CryptoKeyPair;
  return {publicKey:b64(await subtle().exportKey('spki',pair.publicKey)),privateKey:b64(await subtle().exportKey('pkcs8',pair.privateKey))};
}
/** The private key, imported so nothing can read it back out. */
export const importSealingKey=(privateKey:string)=>
  subtle().importKey('pkcs8',unb64(privateKey) as BufferSource,ECDH,false,['deriveBits']);

async function wrappingKeyFromShared(shared:ArrayBuffer,salt:Uint8Array,usage:KeyUsage):Promise<CryptoKey>{
  const base=await subtle().importKey('raw',shared,'HKDF',false,['deriveKey']);
  return subtle().deriveKey({name:'HKDF',hash:'SHA-256',salt:salt as BufferSource,info:INFO},base,{name:'AES-GCM',length:256},false,[usage]);
}
async function wrappingKeyFromPassphrase(passphrase:string,salt:Uint8Array,iterations:number,usage:KeyUsage):Promise<CryptoKey>{
  const base=await subtle().importKey('raw',enc.encode(passphrase),'PBKDF2',false,['deriveKey']);
  return subtle().deriveKey({name:'PBKDF2',hash:'SHA-256',salt:salt as BufferSource,iterations},base,{name:'AES-GCM',length:256},false,[usage]);
}

export interface SealFor {
  /** Identities' encryption keys, SPKI base64: the person's own, and anyone else's they add. */
  keys?:string[];
  /** A passphrase, for someone with no identity. At least 12 characters. */
  passphrase?:string;
  /** For tests only: fewer rounds. */
  iterations?:number;
}

/** SEAL bytes for the recipients given. Refused with none: a sealed file nobody can open is not a backup. */
export async function sealBytes(bytes:Uint8Array,content:{name:string;mediaType:string},to:SealFor):Promise<Uint8Array>{
  const keys=[...new Set(to.keys??[])];
  if(!keys.length&&!to.passphrase)throw new Error('Say who can open it: your identity, someone\'s key, or a passphrase.');
  if(to.passphrase!==undefined&&to.passphrase.length<12)throw new Error('Use a passphrase of at least 12 characters.');
  const contentKey=random(32);
  const recipients:Recipient[]=[];
  for(const publicKey of keys){
    const theirs=await subtle().importKey('spki',unb64(publicKey) as BufferSource,ECDH,false,[]);
    const mine=await subtle().generateKey(ECDH,true,['deriveBits']) as CryptoKeyPair;
    const shared=await subtle().deriveBits({name:'ECDH',public:theirs},mine.privateKey,256);
    const salt=random(16),iv=random(12);
    const wrapped=await subtle().encrypt({name:'AES-GCM',iv},await wrappingKeyFromShared(shared,salt,'encrypt'),contentKey);
    recipients.push({kind:'key',fingerprint:await fingerprint(publicKey),epk:b64(await subtle().exportKey('spki',mine.publicKey)),
      salt:b64(salt),iv:b64(iv),wrapped:b64(wrapped)});
  }
  if(to.passphrase){
    const iterations=to.iterations??SEAL_KDF_ITERATIONS,salt=random(16),iv=random(12);
    const wrapped=await subtle().encrypt({name:'AES-GCM',iv},await wrappingKeyFromPassphrase(to.passphrase,salt,iterations,'encrypt'),contentKey);
    recipients.push({kind:'passphrase',kdf:{name:'PBKDF2',hash:'SHA-256',iterations,salt:b64(salt)},iv:b64(iv),wrapped:b64(wrapped)});
  }
  const iv=random(12);
  const header:SealedHeader={format:SEALED_FORMAT,content,cipher:{name:'AES-GCM',iv:b64(iv)},recipients};
  const head=enc.encode(JSON.stringify(header));
  const key=await subtle().importKey('raw',contentKey,'AES-GCM',false,['encrypt']);
  const sealed=new Uint8Array(await subtle().encrypt({name:'AES-GCM',iv,additionalData:head},key,bytes as BufferSource));
  const out=new Uint8Array(MAGIC.length+1+4+head.length+sealed.length);
  out.set(MAGIC,0);out[MAGIC.length]=VERSION;
  new DataView(out.buffer).setUint32(MAGIC.length+1,head.length);
  out.set(head,MAGIC.length+5);out.set(sealed,MAGIC.length+5+head.length);
  return out;
}

/** Whether these bytes begin as a sealed file does: read before anything else is tried on an imported file. */
export function isSealed(bytes:Uint8Array):boolean{
  return bytes.length>MAGIC.length+5&&MAGIC.every((b,i)=>bytes[i]===b);
}
/** THE HEADER, read without opening: what the file holds and who can open it. */
export function readSealedHeader(bytes:Uint8Array):{header:SealedHeader;head:Uint8Array;body:Uint8Array}{
  if(!isSealed(bytes))throw new Error('This is not a sealed Fieldwork file.');
  if(bytes[MAGIC.length]!==VERSION)throw new Error(`This sealed file is version ${bytes[MAGIC.length]}; this Fieldwork reads version ${VERSION}.`);
  const length=new DataView(bytes.buffer,bytes.byteOffset).getUint32(MAGIC.length+1);
  const head=bytes.subarray(MAGIC.length+5,MAGIC.length+5+length);
  let header:SealedHeader;
  try{header=JSON.parse(dec.decode(head));}catch{throw new Error('This sealed file is damaged: its header cannot be read.');}
  if(header?.format!==SEALED_FORMAT||!Array.isArray(header.recipients)||typeof header.cipher?.iv!=='string')
    throw new Error('This sealed file is damaged: its header is not one Fieldwork wrote.');
  return {header,head,body:bytes.subarray(MAGIC.length+5+length)};
}

export interface OpenWith {
  /** An identity's encryption key: its public key, to find its place among the recipients, and its private key. */
  identity?:{publicKey:string;privateKey:CryptoKey};
  passphrase?:string;
}
/** What would open this file: whether the open identity is among its recipients, and whether a passphrase is. */
export async function whoCanOpen(bytes:Uint8Array,identityKey?:string):Promise<{mine:boolean;keys:number;passphrase:boolean}>{
  const {header}=readSealedHeader(bytes);
  const mine=identityKey?await fingerprint(identityKey):'';
  return {mine:!!mine&&header.recipients.some(r=>r.kind==='key'&&r.fingerprint===mine),
    keys:header.recipients.filter(r=>r.kind==='key').length,passphrase:header.recipients.some(r=>r.kind==='passphrase')};
}

/** OPEN a sealed file with an identity's key or a passphrase. Refused, in words, when neither opens it. */
export async function openSealed(bytes:Uint8Array,using:OpenWith):Promise<{bytes:Uint8Array;content:SealedHeader['content']}>{
  const {header,head,body}=readSealedHeader(bytes);
  let contentKey:ArrayBuffer|null=null;
  if(using.identity){
    const mine=await fingerprint(using.identity.publicKey);
    for(const r of header.recipients){
      if(r.kind!=='key'||r.fingerprint!==mine)continue;
      try{const epk=await subtle().importKey('spki',unb64(r.epk) as BufferSource,ECDH,false,[]);
        const shared=await subtle().deriveBits({name:'ECDH',public:epk},using.identity.privateKey,256);
        contentKey=await subtle().decrypt({name:'AES-GCM',iv:unb64(r.iv) as BufferSource},await wrappingKeyFromShared(shared,unb64(r.salt),'decrypt'),unb64(r.wrapped) as BufferSource);
        break;}catch{/* a damaged entry: try the next */}
    }
  }
  if(!contentKey&&using.passphrase){
    for(const r of header.recipients){
      if(r.kind!=='passphrase')continue;
      try{contentKey=await subtle().decrypt({name:'AES-GCM',iv:unb64(r.iv) as BufferSource},
        await wrappingKeyFromPassphrase(using.passphrase,unb64(r.kdf.salt),r.kdf.iterations,'decrypt'),unb64(r.wrapped) as BufferSource);break;}
      catch{/* not this passphrase */}
    }
  }
  if(!contentKey){
    const keys=header.recipients.filter(r=>r.kind==='key').length,pass=header.recipients.some(r=>r.kind==='passphrase');
    if(using.passphrase&&pass)throw new Error('That passphrase does not open this file.');
    throw new Error(`Your ${using.identity?'identity is not one this file was sealed for':'identity is not open'}. It opens with `
      +[keys?`${keys===1?'one identity':`any of ${keys} identities`}`:'',pass?'a passphrase':''].filter(Boolean).join(' or ')+'.');
  }
  try{const key=await subtle().importKey('raw',contentKey,'AES-GCM',false,['decrypt']);
    const plain=await subtle().decrypt({name:'AES-GCM',iv:unb64(header.cipher.iv) as BufferSource,additionalData:head as BufferSource},key,body as BufferSource);
    return {bytes:new Uint8Array(plain),content:header.content};}
  catch{throw new Error('This sealed file has been changed or damaged since it was made: it does not decrypt.');}
}
