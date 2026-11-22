/** A SHARED PROJECT'S FILES, ENCRYPTED ON GITHUB (the export encryption audit, decided 2026-11-21: *"Encrypted by
 *  default"* for collaborative projects).
 *
 *  Each file Fieldwork writes to the repository is a sealed file (`sealed-file.ts`) for every member with a key, kept as
 *  `<path>.fwsealed`, its bytes in base64 so it travels through the same text path as a plain file. Read back, each is
 *  opened with the reader's identity, and everything after (digests, merging, importing) works on the plain text, as
 *  for a plain repository. */
import {sealBytes,openSealed,isSealed,fingerprint} from './sealed-file.js';

export const SEALED_SUFFIX='.fwsealed';
const enc=new TextEncoder(),dec=new TextDecoder();
const toBase64=(bytes:Uint8Array)=>{let s='';for(let i=0;i<bytes.length;i+=0x8000)s+=String.fromCharCode(...bytes.subarray(i,i+0x8000));return btoa(s);};
const fromBase64=(text:string)=>Uint8Array.from(atob(text.replace(/\s+/g,'')),c=>c.charCodeAt(0));

/** WHAT IS SEALED: the project's own files. The repository's declaration of its layout (`.fieldwork/`) stays plain, so
 *  anyone can tell what the repository is. */
export const sealable=(path:string)=>!path.startsWith('.fieldwork/');
/** Whether a repository's files are sealed: any file of the project in its sealed form. */
export const holdsSealed=(paths:Iterable<string>)=>[...paths].some(p=>p.endsWith(SEALED_SUFFIX));

/** THE RECIPIENTS, as one fingerprint: a save whose recipients changed seals every file again, so a member added can
 *  read all of it; one whose recipients did not seals only what changed. */
export async function recipientsDigest(keys:readonly string[]):Promise<string>{
  return (await Promise.all([...new Set(keys)].map(fingerprint))).sort().join(',');
}

/** SEAL the files given, for the keys given: each path gains `.fwsealed`. */
export async function sealRepositoryFiles(files:Map<string,string>,keys:readonly string[]):Promise<Map<string,string>>{
  if(!keys.length)throw new Error('Nobody has a key to read this project: open your identity first.');
  const out=new Map<string,string>();
  for(const [path,text] of files){
    const sealed=await sealBytes(enc.encode(text),{name:path,mediaType:'application/json'},{keys:[...keys]});
    out.set(`${path}${SEALED_SUFFIX}`,toBase64(sealed));
  }
  return out;
}

/** OPEN a repository's files with the reader's identity: sealed ones opened and named by their plain path, plain ones
 *  kept as they are. Refused, in words, where the reader's identity is not open or not one they were sealed for. */
export async function openRepositoryFiles(files:Map<string,string>,identity:{publicKey:string;privateKey:CryptoKey}|null|undefined):Promise<Map<string,string>>{
  const out=new Map<string,string>();
  for(const [path,text] of files){
    if(!path.endsWith(SEALED_SUFFIX)){out.set(path,text);continue;}
    const plain=path.slice(0,-SEALED_SUFFIX.length);
    let bytes:Uint8Array;
    try{bytes=fromBase64(text);}catch{throw new Error(`${path} on GitHub is not a sealed file Fieldwork can read.`);}
    if(!isSealed(bytes))throw new Error(`${path} on GitHub is not a sealed file Fieldwork can read.`);
    if(!identity)throw new Error('This project is encrypted on GitHub. Open your identity to read it.');
    try{out.set(plain,dec.decode((await openSealed(bytes,{identity})).bytes));}
    catch(e){
      const message=e instanceof Error?e.message:'';
      throw new Error(/not one this file was sealed for/.test(message)
        ?`This project is encrypted on GitHub, and ${plain} was not saved for your key. Give a member your key (Identity → Your key for encrypted files) so their next save includes you.`
        :`${plain}: ${message}`);
    }
  }
  return out;
}
