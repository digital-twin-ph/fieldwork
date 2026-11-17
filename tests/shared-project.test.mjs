import test from 'node:test';
import assert from 'node:assert/strict';
const {changedPaths,projectDocumentFromFiles,fileDigests}=await import('../build/shared-project.js');
const {repositoryFiles,withoutDeviceKeys}=await import('../build/project-repository.js');

test('changed here counts the work: project, workflows and notes, and not the files every save rewrites',()=>{
  assert.deepEqual(changedPaths({'project.json':'a','workflows/x.json':'b','assets/manifest.json':'c'},
    {'project.json':'a','workflows/x.json':'B','notes/n.json':'d','assets/manifest.json':'C','.fieldwork/format.json':'e'}),
    ['notes/n.json','workflows/x.json']);
});

test('a workflow file leaves this device\'s keys behind, in a bundle as in a bare workflow',()=>{
  assert.deepEqual(withoutDeviceKeys({name:'A',projectId:'p',workflowKey:'p/w1',nodes:[]}),{name:'A',nodes:[]});
  assert.deepEqual(withoutDeviceKeys({schema:'fieldwork/bundle/1',workflow:{name:'A',projectId:'p',workflowKey:'k'},attachments:[]}),
    {schema:'fieldwork/bundle/1',workflow:{name:'A'},attachments:[]});
  const files=repositoryFiles({project:{schema:'fieldwork/project/2',id:'p',name:'P',subject:'',workflows:['p/w1']},
    workflows:[{key:'p/w1',document:{name:'Attack rate',projectId:'p',workflowKey:'p/w1',nodes:[]}}]});
  assert.ok(!/projectId|workflowKey/.test(files.get('workflows/attack-rate.json')));
});

test('the repository\'s files make the document Import project reads; the empty template is refused, saying so',async()=>{
  const files=new Map([['project.json','{"name":"P","subject":"S","workflows":["attack-rate"]}'],
    ['workflows/attack-rate.json','{"name":"Attack rate"}'],['notes/n1.json','{"id":"n1"}']]);
  const doc=projectDocumentFromFiles(files);
  assert.equal(doc.project.name,'P');assert.deepEqual(doc.workflows,[{key:'attack-rate',document:{name:'Attack rate'}}]);
  assert.equal(doc.project.notes.length,1);
  assert.throws(()=>projectDocumentFromFiles(new Map([['project.json','{"name":"","workflows":[]}']])),/empty template/);
  assert.throws(()=>projectDocumentFromFiles(new Map([['project.json','{"name":"P","workflows":["gone"]}']])),/workflows\/gone.json/);
  assert.equal(Object.keys(await fileDigests(files)).length,3);
});

test('Get the latest keeps what is only here, takes what changed only on GitHub, and asks only where both changed one workflow',async()=>{
  const {mergeLatest}=await import('../build/shared-project.js');
  const pj=(workflows,extra={})=>JSON.stringify({name:'P',workflows,...extra},null,1)+'\n';
  const baseFiles=new Map([['project.json',pj(['a','both'])],['workflows/a.json','{"v":1}'],['workflows/both.json','{"v":1}'],['workflows/gone.json','{"v":1}']]);
  const base=await fileDigests(baseFiles);
  const here=new Map([['project.json',pj(['a','both','mine'])],['workflows/a.json','{"v":1}'],['workflows/both.json','{"v":"here"}'],
    ['workflows/mine.json','{"v":"new here"}'],['workflows/gone.json','{"v":1}']]);
  const github=new Map([['project.json',pj(['a','both','theirs'],{members:[{login:'jlt',role:'co-author',since:'x'}]})],['workflows/a.json','{"v":2}'],
    ['workflows/both.json','{"v":"github"}'],['workflows/theirs.json','{"v":"new there"}']]);
  const asked=[];
  const m=await mergeLatest(base,base,here,github,path=>{asked.push(path);return 'here';});
  assert.deepEqual(asked,['workflows/both.json'],'asked only where both changed the same workflow');
  assert.equal(m.files.get('workflows/a.json'),'{"v":2}','changed only on GitHub: GitHub\'s');
  assert.equal(m.files.get('workflows/mine.json'),'{"v":"new here"}','new here: kept');
  assert.equal(m.files.get('workflows/theirs.json'),'{"v":"new there"}','new on GitHub: brought in');
  assert.equal(m.files.get('workflows/both.json'),'{"v":"here"}','the choice is kept');
  assert.ok(!m.files.has('workflows/gone.json'),'removed on GitHub and unchanged here: removed');
  const project=JSON.parse(m.files.get('project.json'));
  assert.deepEqual(project.workflows,['a','both','theirs','mine'],'GitHub\'s order, then those only here');
  assert.deepEqual(project.members.map(x=>x.login),['jlt'],'the members either side names');
  assert.deepEqual(m.keptHere.sort(),['project.json','workflows/both.json','workflows/mine.json']);
});

test('the two baselines: GitHub\'s bytes differing from this device\'s regeneration is not a change on GitHub',async()=>{
  const {mergeLatest}=await import('../build/shared-project.js');
  const here=new Map([['project.json','{"name":"P","workflows":["a"]}'],['workflows/a.json','{"v":"edited here"}']]);
  const github=new Map([['project.json','{"name":"P","workflows":["a"]}\n'],['workflows/a.json','{ "v": 1 }']]);
  const base=await fileDigests(new Map([['project.json','{"name":"P","workflows":["a"]}'],['workflows/a.json','{"v":1}']]));
  const baseGitHub=await fileDigests(github);
  const m=await mergeLatest(base,baseGitHub,here,github,()=>{throw new Error('should not ask');});
  assert.equal(m.files.get('workflows/a.json'),'{"v":"edited here"}');
  assert.deepEqual(m.keptHere,['workflows/a.json']);
});
