import test from 'node:test';
import assert from 'node:assert/strict';
const {checkRepository,repositoryName}=await import('../build/repository-check.js');

/** A STUBBED GITHUB: each path answers what the test says; the requests made are recorded, so the test can see that the
 *  check writes nothing. */
const github=(answers)=>{const asked=[];
  const fetchFn=async(url,init={})=>{const path=url.replace('https://api.github.com','');asked.push({path,method:init.method??'GET'});
    const a=answers[path];if(!a)return new Response('{}',{status:404});
    return new Response(JSON.stringify(a.body??{}),{status:a.status??200,headers:a.headers??{}});};
  return {fetchFn,asked};};

test('a repository name is owner/name, or a github.com address of one',()=>{
  assert.equal(repositoryName('digital-twin-ph/project-test-collaboration'),'digital-twin-ph/project-test-collaboration');
  assert.equal(repositoryName('https://github.com/digital-twin-ph/project-test-collaboration.git'),'digital-twin-ph/project-test-collaboration');
  assert.equal(repositoryName('project-test-collaboration'),null);
});

test('a repository made from the template, with Discussions and the decisions category, reads as ready; writing is not checked',async()=>{
  const {fetchFn,asked}=github({
    '/repos/o/r':{body:{private:true,has_discussions:true,default_branch:'main',permissions:{admin:false,maintain:false,push:true,triage:true,pull:true}},headers:{'github-authentication-token-expiration':'2026-12-16 10:00:00 UTC'}},
    '/repos/o/r/contents/.fieldwork/format.json':{body:{version:1}},
    '/repos/o/r/contents/project.json':{body:{name:'',workflows:[]}},
    '/graphql':{body:{data:{repository:{discussionCategories:{nodes:[{name:'General',slug:'general'},{name:'Decisions',slug:'decisions'}]},discussions:{totalCount:0}}}}},
  });
  const {lines}=await checkRepository('o/r','t',fetchFn);
  const state=Object.fromEntries(lines.map(l=>[l.key,l.state]));
  assert.deepEqual(state,{found:'yes',expires:'yes',role:'yes',layout:'yes',project:'yes',discussions:'yes',threads:'yes',decisions:'yes',write:'unknown'});
  assert.match(lines.find(l=>l.key==='found').text,/private/);
  assert.match(lines.find(l=>l.key==='role').text,/^Your role here is Write: you may save/);
  // READ ONLY: every request a GET, but the one GraphQL query.
  assert.deepEqual(asked.filter(a=>a.method!=='GET').map(a=>a.path),['/graphql']);
});

test('a refused token and a repository the token cannot see are each said, and stop the check',async()=>{
  assert.equal((await checkRepository('o/r','t',github({'/repos/o/r':{status:401}}).fetchFn)).lines[0].key,'token');
  const missing=await checkRepository('o/r','t',github({}).fetchFn);
  assert.deepEqual(missing.lines.map(l=>[l.key,l.state]),[['found','no']]);
});

test('Discussions off, and no decisions category, are each a line saying what to do',async()=>{
  const off=await checkRepository('o/r','t',github({'/repos/o/r':{body:{private:false,has_discussions:false}}}).fetchFn);
  assert.equal(off.lines.find(l=>l.key==='discussions').state,'no');
  const none=await checkRepository('o/r','t',github({'/repos/o/r':{body:{private:false,has_discussions:true}},
    '/graphql':{body:{data:{repository:{discussionCategories:{nodes:[{name:'General',slug:'general'}]},discussions:{totalCount:2}}}}}}).fetchFn);
  assert.equal(none.lines.find(l=>l.key==='decisions').state,'no');
  assert.match(none.lines.find(l=>l.key==='threads').text,/2 discussions/);
});

test('a post is one GraphQL mutation with the typed words; a token without Discussions write is told what to give it',async()=>{
  const {postDiscussion}=await import('../build/repository-check.js');
  const sent=[];
  const ok=await postDiscussion('R','C','A title','A message','t',async(url,init)=>{sent.push(JSON.parse(init.body));
    return new Response(JSON.stringify({data:{createDiscussion:{discussion:{url:'https://github.com/o/r/discussions/1',number:1}}}}));});
  assert.deepEqual(ok,{ok:true,url:'https://github.com/o/r/discussions/1',number:1});
  assert.deepEqual(sent[0].variables,{r:'R',c:'C',t:'A title',b:'A message'});
  const refused=await postDiscussion('R','C','t','b','t',async()=>new Response(JSON.stringify({errors:[{message:'Resource not accessible by personal access token'}]})));
  assert.equal(refused.ok,false);assert.match(refused.text,/Discussions: Read and write/);
});
