import test from 'node:test';
import assert from 'node:assert/strict';
import {sealBytes,openSealed,readSealedHeader,isSealed,whoCanOpen,newSealingKeys,importSealingKey,keyText,readKeyText,fingerprint} from '../build/sealed-file.js';
import {createIdentityFile,openIdentityFile,addSealingKey,updateIdentityFile} from '../build/identity-file.js';
import {memberStatement,readMembers} from '../build/project-roles.js';

/** SEALED FILES (experiment 229, 2026-11-21): a backup encrypted for the people who should open it, each with their own
 *  key, or a passphrase. */
const bytes=new TextEncoder().encode('{"schema":"fieldwork/project-document/1","project":{"name":"Measles, Ituri"}}');
const content={name:'measles-ituri-project.json.gz',mediaType:'application/gzip'};
const person=async()=>{const k=await newSealingKeys();return {publicKey:k.publicKey,privateKey:await importSealingKey(k.privateKey)};};

test('sealed for two identities, each opens it with their own key; a third cannot',async()=>{
  const me=await person(),colleague=await person(),stranger=await person();
  const sealed=await sealBytes(bytes,content,{keys:[me.publicKey,colleague.publicKey]});
  assert.ok(isSealed(sealed));
  for(const who of [me,colleague]){const opened=await openSealed(sealed,{identity:who});
    assert.deepEqual([...opened.bytes],[...bytes]);assert.deepEqual(opened.content,content);}
  await assert.rejects(openSealed(sealed,{identity:stranger}),/not one this file was sealed for\. It opens with any of 2 identities\./);
  assert.deepEqual(await whoCanOpen(sealed,colleague.publicKey),{mine:true,keys:2,passphrase:false});
  assert.deepEqual(await whoCanOpen(sealed,stranger.publicKey),{mine:false,keys:2,passphrase:false});
});

test('a passphrase opens it for someone with no identity; a wrong one is said',async()=>{
  const me=await person();
  const sealed=await sealBytes(bytes,content,{keys:[me.publicKey],passphrase:'correct horse battery',iterations:1000});
  assert.deepEqual([...(await openSealed(sealed,{passphrase:'correct horse battery'})).bytes],[...bytes]);
  await assert.rejects(openSealed(sealed,{passphrase:'wrong horse battery'}),/That passphrase does not open this file\./);
  await assert.rejects(sealBytes(bytes,content,{passphrase:'short'}),/at least 12 characters/);
  await assert.rejects(sealBytes(bytes,content,{}),/Say who can open it/);
});

test('the header names no person, and changing it or the content breaks the file',async()=>{
  const me=await person();
  const sealed=await sealBytes(bytes,content,{keys:[me.publicKey]});
  const {header}=readSealedHeader(sealed);
  assert.equal(header.recipients[0].fingerprint,await fingerprint(me.publicKey));
  assert.doesNotMatch(new TextDecoder().decode(sealed.subarray(0,400)),/Ituri/);
  // One byte of the header's file name changed: the header is the ciphertext's additional data.
  const text=new TextDecoder().decode(sealed);const at=text.indexOf('measles-ituri');
  const header2=sealed.slice();header2[at]^=1;
  await assert.rejects(openSealed(header2,{identity:me}),/changed or damaged/);
  const body=sealed.slice();body[body.length-1]^=1;
  await assert.rejects(openSealed(body,{identity:me}),/changed or damaged/);
  assert.equal(isSealed(bytes),false);
});

test('a key passes as text and is read back; anything else is not a key',async()=>{
  const k=await newSealingKeys();
  assert.equal(await readKeyText(`  ${keyText(k.publicKey)}\n`),k.publicKey);
  assert.equal(await readKeyText(k.publicKey),null);
  assert.equal(await readKeyText('fwkey1:bm90IGEga2V5'),null);
  assert.match(await fingerprint(k.publicKey),/^[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}$/);
});

test('a new identity carries a key for sealed files; an older one gains it, its signing key unchanged',async()=>{
  const {file,identity}=await createIdentityFile({name:'A. Field'},'twelve chars ok',{iterations:1000});
  assert.ok(identity.sealing?.publicKey);
  const reopened=await openIdentityFile(file,'twelve chars ok');
  assert.equal(reopened.sealing.publicKey,identity.sealing.publicKey);
  const sealed=await sealBytes(bytes,content,{keys:[identity.sealing.publicKey]});
  assert.deepEqual([...(await openSealed(sealed,{identity:reopened.sealing})).bytes],[...bytes]);
  assert.equal(await addSealingKey(file,'twelve chars ok'),null);
  // An identity file as written before 2026-11-21: the same shape, no sealing key.
  const outer=JSON.parse(file);
  const salt=Uint8Array.from(atob(outer.kdf.salt),c=>c.charCodeAt(0)),iv=Uint8Array.from(atob(outer.cipher.iv),c=>c.charCodeAt(0));
  const base=await crypto.subtle.importKey('raw',new TextEncoder().encode('twelve chars ok'),'PBKDF2',false,['deriveKey']);
  const key=await crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:1000},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
  const inner=JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv},key,Uint8Array.from(atob(outer.data),c=>c.charCodeAt(0)))));
  delete inner.sealing;
  const data=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(inner))));
  let s='';for(const x of data)s+=String.fromCharCode(x);
  const old=JSON.stringify({...outer,data:btoa(s)});
  const before=await openIdentityFile(old,'twelve chars ok');
  assert.equal(before.sealing,undefined);
  const added=await addSealingKey(old,'twelve chars ok');
  assert.ok(added.identity.sealing);
  assert.equal(added.identity.publicKey,before.publicKey);
  assert.equal((await openIdentityFile(added.file,'twelve chars ok')).sealing.publicKey,added.identity.sealing.publicKey);
  // Changing the avatar of an older file gives it a key too.
  const changed=await updateIdentityFile(old,'twelve chars ok',{orcid:null});
  assert.ok(changed.identity.sealing);
});

test('a member\'s key is in the statement they sign; a statement signed before it reads exactly as signed',()=>{
  const before={login:'afield',name:'A. Field',affiliations:[]};
  assert.equal(memberStatement(before),'{"login":"afield","name":"A. Field","orcid":null,"affiliations":[]}');
  assert.equal(memberStatement({...before,sealKey:'KEY'}),'{"login":"afield","name":"A. Field","orcid":null,"affiliations":[],"sealKey":"KEY"}');
  assert.equal(readMembers([{login:'afield',role:'co-author',since:'2026-11-21',sealKey:'KEY'}])[0].sealKey,'KEY');
});
