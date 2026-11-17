import test from 'node:test';
import assert from 'node:assert/strict';
const {proposedProjectRole,roleShortfall,readMembers,memberStatement}=await import('../build/project-roles.js');
const {signStatement,verifyStatement}=await import('../build/identity-file.js');

test('a repository role proposes a project role; Maintain is a co-author\'s by default',()=>{
  assert.deepEqual(['admin','maintain','write','triage','read'].map(proposedProjectRole),
    ['lead-author','co-author','co-author','reviewer','reviewer']);
});

test('a repository role below what the project role needs is said, and enough is silent',()=>{
  assert.equal(roleShortfall('co-author','write'),null);
  assert.equal(roleShortfall('reviewer','read'),null);
  assert.match(roleShortfall('co-author','read'),/cannot save/);
  assert.match(roleShortfall('lead-author','write'),/need maintain/);
  assert.match(roleShortfall('reviewer',undefined),/invite them/);
});

test('members are read tolerantly: unreadable dropped, one entry per login',()=>{
  const members=readMembers([{login:'jlt',role:'co-author',since:'2026-11-16'},{login:'JLT',role:'reviewer',since:'x'},
    {login:'bad login',role:'co-author',since:'x'},{login:'a',role:'owner',since:'x'},{login:'b',role:'reviewer',since:'x',orcid:'0000-0002-1825-0097'}]);
  assert.deepEqual(members.map(m=>[m.login,m.role]),[['jlt','co-author'],['b','reviewer']]);
  assert.equal(members[1].orcid,'0000-0002-1825-0097');
});

test('who a member is, signed by their own key, verifies; changed by anyone else, it does not',async()=>{
  const keys=await crypto.subtle.generateKey({name:'Ed25519'},true,['sign','verify']);
  const publicKey=Buffer.from(await crypto.subtle.exportKey('spki',keys.publicKey)).toString('base64');
  const identity={profile:{name:'J. L. T.'},algorithm:'Ed25519',publicKey,privateKey:keys.privateKey};
  const statement={login:'jlt',name:'J. L. T.',orcid:'0000-0002-1825-0097'};
  const signed=await signStatement(identity,memberStatement(statement));
  assert.equal(await verifyStatement(signed.algorithm,signed.publicKey,memberStatement(statement),signed.signature),true);
  assert.equal(await verifyStatement(signed.algorithm,signed.publicKey,memberStatement({...statement,orcid:'0000-0001-5109-3700'}),signed.signature),false);
});
