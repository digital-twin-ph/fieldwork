import test from 'node:test';
import assert from 'node:assert/strict';
import {encryptCredentials,decryptCredentials,validateCredentials,CredentialSession} from '../build/credentials.js';
const entries=[{ref:'healthsites-personal',provider:'healthsites',label:'Personal café',origin:'https://healthsites.io',secret:'synthetic-only-secret-123'}],password='a long synthetic passphrase';
test('credential file is randomized, authenticated and preserves Unicode without plaintext metadata',async()=>{
 const a=await encryptCredentials(entries,password),b=await encryptCredentials(entries,password);assert.notEqual(await a.text(),await b.text());for(const value of Object.values(entries[0]))assert.ok(!(await a.text()).includes(value));assert.deepEqual(await decryptCredentials(a,password),entries);await assert.rejects(()=>decryptCredentials(a,'incorrect'),/Could not unlock/);
 const v=JSON.parse(await a.text());v.ciphertext=(v.ciphertext[0]==='A'?'B':'A')+v.ciphertext.slice(1);await assert.rejects(()=>decryptCredentials(new Blob([JSON.stringify(v)]),password),/Could not unlock/);
 v.iterations=1;await assert.rejects(()=>decryptCredentials(new Blob([JSON.stringify(v)]),password));await assert.rejects(()=>decryptCredentials(new Blob(['x'.repeat(512001)]),password));
});
test('credential validation rejects duplicate references, unsafe origins and unexpected fields',()=>{
 assert.throws(()=>validateCredentials([...entries,...entries]));for(const origin of ['http://healthsites.io','https://healthsites.io/path','https://user:pass@healthsites.io','https://healthsites.io?x=1'])assert.throws(()=>validateCredentials([{...entries[0],origin}]));assert.throws(()=>validateCredentials([{...entries[0],extra:'x'}]));assert.throws(()=>validateCredentials([{...entries[0],secret:''}]));
});
test('session resolution binds provider and origin and cannot revive idle credentials',()=>{
 let now=0;const s=new CredentialSession(()=>{},()=>now,100);s.replace(entries);assert.equal(s.resolve(entries[0].ref,'healthsites','https://healthsites.io'),entries[0].secret);assert.ok(!JSON.stringify(s.list()).includes(entries[0].secret));assert.throws(()=>s.resolve(entries[0].ref,'other','https://healthsites.io'));assert.throws(()=>s.resolve(entries[0].ref,'healthsites','https://evil.example'));now=101;s.touch();assert.equal(s.unlocked,false);assert.throws(()=>s.snapshot());
});
test('lock cancels a pending unlock and a bad file preserves an existing session',async()=>{
 const s=new CredentialSession();s.replace(entries);await assert.rejects(()=>s.unlock(new Blob(['bad']),password));assert.equal(s.list().length,1);const blob=await encryptCredentials(entries,password),pending=s.unlock(blob,password);s.lock();await assert.rejects(()=>pending,/cancelled/);assert.equal(s.unlocked,false);
});
