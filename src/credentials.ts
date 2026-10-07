/** Separate from workflow state and persistence. Never log payloads or underlying crypto errors. */
export interface Credential {ref:string;provider:string;label:string;origin:string;secret:string}
const PROFILE='fieldwork/credentials/1',ITERATIONS=600_000,LIMIT=512_000;
const encoder=new TextEncoder(),aad=encoder.encode(PROFILE+';PBKDF2-SHA256;600000;AES-256-GCM');
function requireValue(ok:unknown,message:string):asserts ok {if(!ok)throw new Error(message);}
const record=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v);
export function validateCredentials(raw:unknown):Credential[]{
 requireValue(Array.isArray(raw)&&raw.length<=50,'Use at most 50 credentials.');const refs=new Set<string>();
 return raw.map(v=>{requireValue(record(v)&&Object.keys(v).sort().join(',')==='label,origin,provider,ref,secret','Invalid credential fields.');
  requireValue(typeof v.ref==='string'&&/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/.test(v.ref)&&!refs.has(v.ref),'Use unique references beginning with a letter (up to 64 characters).');refs.add(v.ref);
  requireValue(typeof v.provider==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(v.provider),'Use a lowercase provider identifier.');
  requireValue(typeof v.label==='string'&&v.label.trim().length>0&&v.label.length<=120,'Enter a label up to 120 characters.');
  requireValue(typeof v.secret==='string'&&v.secret.length>0&&v.secret.length<=4096,'Enter a secret up to 4096 characters.');
  requireValue(typeof v.origin==='string','Enter an HTTPS origin.');let url:URL;try{url=new URL(v.origin);}catch{throw new Error('Enter an HTTPS origin, such as https://healthsites.io.');}
  requireValue(url.protocol==='https:'&&url.origin===v.origin,'Use an exact HTTPS origin without path, query or credentials.');
  return {ref:v.ref,provider:v.provider,label:v.label,origin:v.origin,secret:v.secret};
 });
}
const base64=(bytes:Uint8Array)=>{let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
function unbase64(v:unknown):Uint8Array<ArrayBuffer>{requireValue(typeof v==='string'&&v.length<=LIMIT&&/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(v),'Invalid credential file.');return Uint8Array.from(atob(v),c=>c.charCodeAt(0));}
async function key(password:string,salt:Uint8Array<ArrayBuffer>){
 requireValue(password.length>0&&password.length<=1024,'Enter a passphrase of at most 1024 characters.');
 const bytes=encoder.encode(password);try{const material=await crypto.subtle.importKey('raw',bytes,'PBKDF2',false,['deriveKey']);return await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},material,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}finally{bytes.fill(0);}
}
export async function encryptCredentials(raw:unknown,password:string):Promise<Blob>{
 requireValue(password.length>=12,'Use a long passphrase of at least 12 characters.');const entries=validateCredentials(raw),salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12)),plain=encoder.encode(JSON.stringify(entries));
 try{const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:aad,tagLength:128},await key(password,salt),plain);const blob=new Blob([JSON.stringify({schema:PROFILE,kdf:'PBKDF2-SHA256',iterations:ITERATIONS,salt:base64(salt),iv:base64(iv),ciphertext:base64(new Uint8Array(encrypted))})],{type:'application/octet-stream'});requireValue(blob.size<=LIMIT,'Credential file exceeds 512 KB.');return blob;}finally{plain.fill(0);}
}
export async function decryptCredentials(blob:Blob,password:string):Promise<Credential[]>{
 try{requireValue(blob.size<=LIMIT,'Invalid credential file.');const v:unknown=JSON.parse(await blob.text());requireValue(record(v)&&Object.keys(v).sort().join(',')==='ciphertext,iterations,iv,kdf,salt,schema'&&v.schema===PROFILE&&v.kdf==='PBKDF2-SHA256'&&v.iterations===ITERATIONS,'Invalid credential file.');
  const salt=unbase64(v.salt),iv=unbase64(v.iv),ciphertext=unbase64(v.ciphertext);requireValue(salt.length===16&&iv.length===12&&ciphertext.length>=16,'Invalid credential file.');
  const plain=new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:aad,tagLength:128},await key(password,salt),ciphertext));try{return validateCredentials(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(plain)));}finally{plain.fill(0);}
 }catch{throw new Error('Could not unlock credentials. Check the passphrase; the file may be damaged or unsupported.');}
}
export class CredentialSession {
 #entries:Credential[]|null=null;#last=0;#generation=0;
 constructor(private changed:()=>void=()=>{},private now:()=>number=Date.now,readonly idleMs=15*60_000){}
 get generation(){return this.#generation;}
 expire(){if(this.#entries&&this.now()-this.#last>=this.idleMs)this.lock();}
 get unlocked(){this.expire();return this.#entries!==null;}
 touch(){this.expire();if(this.#entries)this.#last=this.now();}
 lock(){this.#entries=null;this.#generation++;this.changed();}
 replace(entries:unknown){this.#entries=validateCredentials(entries);this.#last=this.now();this.#generation++;this.changed();}
 async unlock(blob:Blob,password:string){const generation=this.#generation,entries=await decryptCredentials(blob,password);requireValue(generation===this.#generation,'Unlock cancelled because the session changed.');this.replace(entries);}
 list(){this.expire();return (this.#entries||[]).map(({secret,...metadata})=>metadata);}
 snapshot(){this.expire();requireValue(this.#entries,'Unlock credentials first.');return structuredClone(this.#entries);}
 resolve(ref:string,provider:string,origin:string){this.expire();const entry=this.#entries?.find(v=>v.ref===ref&&v.provider===provider&&v.origin===origin);requireValue(entry,'Matching credentials are unavailable.');return entry.secret;}
}
