import test from 'node:test';
import assert from 'node:assert/strict';
const {saveToRepository}=await import('../build/repository-save.js');

/** A STUBBED GITHUB that records each request, so the test can see the order: blobs and tree first, the branch moved
 *  last and never forced. */
const github=(refStatus=200)=>{const asked=[];let n=0;
  const fetchFn=async(url,init={})=>{const path=url.replace('https://api.github.com/repos/o/r','');const method=init.method??'GET';
    asked.push({method,path,body:init.body?JSON.parse(init.body):undefined});
    const json=method==='GET'&&path===''?{default_branch:'main'}
      :path==='/git/ref/heads/main'?{object:{sha:'P'}}
      :path==='/git/commits/P'?{tree:{sha:'T0'}}
      :{sha:`S${++n}`};
    const status=method==='PATCH'?refStatus:method==='POST'?201:200;
    return new Response(JSON.stringify(json),{status});};
  return {fetchFn,asked};};

test('a project is saved as one commit on the default branch: blobs, a tree on the last one, a commit, then the branch',async()=>{
  const {fetchFn,asked}=github();
  const files=new Map([['project.json','{}\n'],['workflows/a.json','{"name":"Ä"}\n']]);
  const done=await saveToRepository('o/r',files,'First save','t',fetchFn);
  assert.equal(done.ok,true);assert.equal(done.files,2);
  assert.deepEqual(asked.map(a=>`${a.method} ${a.path}`),['GET ','GET /git/ref/heads/main','GET /git/commits/P',
    'POST /git/blobs','POST /git/blobs','POST /git/trees','POST /git/commits','PATCH /git/refs/heads/main']);
  assert.equal(new TextDecoder().decode(Uint8Array.from(atob(asked[4].body.content),c=>c.charCodeAt(0))),'{"name":"Ä"}\n');
  assert.equal(asked[5].body.base_tree,'T0');
  assert.deepEqual(asked[6].body.parents,['P']);assert.equal(asked[6].body.message,'First save');
  assert.equal(asked.at(-1).body.force,false);
});

test('a branch moved since it was read is not overwritten, and the person is told',async()=>{
  const done=await saveToRepository('o/r',new Map([['project.json','{}\n']]),'m','t',github(422).fetchFn);
  assert.equal(done.ok,false);assert.match(done.text,/Nothing was overwritten/);
});
