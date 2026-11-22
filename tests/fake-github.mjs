import {createHash} from 'node:crypto';

/** A GITHUB KEPT IN MEMORY (experiment 150, 2026-11-16), shared by the tests of shared projects: it answers the requests
 *  Fieldwork makes and no others, so a request it does not know fails the test rather than passing silently. A tree
 *  entry whose sha is null removes the path, as GitHub's does. */
export const REPO='o/shared-test';
export function fakeGitHub(){
  const objects=new Map();let n=0;
  const put=(value)=>{const sha=createHash('sha1').update(String(++n)+JSON.stringify(value)).digest('hex');objects.set(sha,value);return sha;};
  // The template: a README and the empty project.json, at one commit on main.
  const blob=(text)=>put({kind:'blob',text});
  const tree=(entries)=>put({kind:'tree',entries});
  const template=tree({'README.md':blob('# Template\n'),'project.json':blob('{"name":"","workflows":[]}\n'),
    '.fieldwork/format.json':blob('{"schema":"fieldwork/project-repository/1"}\n')});
  const refs={main:put({kind:'commit',tree:template,parents:[],message:'Template'})};
  const commits=[];
  const flatten=(treeSha)=>objects.get(treeSha).entries;
  return {objects,refs,commits,
    filesAt:(commitSha)=>Object.fromEntries(Object.entries(flatten(objects.get(commitSha).tree)).map(([p,b])=>[p,objects.get(b).text])),
    /** Another author saves a workflow of their own, listed in project.json. */
    otherAuthorAdds:(file,name)=>{const head=objects.get(refs.main);const entries={...flatten(head.tree)};
      const files=Object.fromEntries(Object.entries(entries).map(([p,b])=>[p,objects.get(b).text]));
      const someWorkflow=Object.keys(files).find(p=>p.startsWith('workflows/'));
      entries[`workflows/${file}.json`]=blob(JSON.stringify({...JSON.parse(files[someWorkflow]),name},null,1)+'\n');
      const project=JSON.parse(files['project.json']);project.workflows=[...project.workflows,file];
      entries['project.json']=blob(JSON.stringify(project,null,1)+'\n');
      refs.main=put({kind:'commit',tree:tree(entries),parents:[refs.main],message:'Theirs'});},
    /** Someone else saves: a commit on main that this device has not read. */
    elsewhere:()=>{const head=objects.get(refs.main);const entries={...flatten(head.tree),'notes/other.json':blob('{"text":"theirs"}\n')};
      refs.main=put({kind:'commit',tree:tree(entries),parents:[refs.main],message:'Theirs'});},
    async route(route){
      const request=route.request(),url=new URL(request.url()),method=request.method();
      const body=request.postData()?JSON.parse(request.postData()):null;
      const json=(value,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(value)});
      if(url.pathname==='/graphql'){
        if(/createDiscussion/.test(body.query)){this.posted=body.variables;return json({data:{createDiscussion:{discussion:{url:'https://github.com/o/shared-test/discussions/2',number:2}}}});}
        return json({data:{repository:{id:'R1',discussionCategories:{nodes:[{id:'C1',name:'General',slug:'general'},{id:'C2',name:'Decisions',slug:'decisions'}]},
          discussions:{totalCount:1,nodes:[{title:'Claiming the attack rate',url:'https://github.com/o/shared-test/discussions/1',updatedAt:'2026-11-16T10:00:00Z',category:{name:'General'},author:{login:'ben'},comments:{totalCount:2}}]}}}});
      }
      if(method==='GET'&&url.pathname==='/user/repos')return json([{full_name:'o/public-one',private:false},{full_name:REPO,private:true}]);
      const path=url.pathname.replace(`/repos/${REPO}`,'');
      if(method==='GET'&&path==='')return json({private:true,has_discussions:true,default_branch:'main',permissions:{admin:true,maintain:true,push:true,triage:true,pull:true}});
      if(method==='GET'&&path==='/collaborators')return json([{login:'lead-me',role_name:'admin'},{login:'jlt',role_name:'maintain'},{login:'rev',role_name:'read'}]);
      if(method==='GET'&&path.startsWith('/contents/')){
        const files=this.filesAt(refs.main),file=decodeURIComponent(path.slice('/contents/'.length));
        return file in files?route.fulfill({status:200,contentType:'application/json',body:files[file]}):json({message:'Not Found'},404);}
      if(method==='GET'&&path==='/git/ref/heads/main')return json({object:{sha:refs.main}});
      if(method==='GET'&&path.startsWith('/git/commits/'))return json({tree:{sha:objects.get(path.split('/').pop()).tree}});
      if(method==='GET'&&path.startsWith('/git/trees/')){const sha=path.split('/').pop();
        return json({tree:Object.entries(flatten(sha)).map(([p,b])=>({path:p,type:'blob',sha:b}))});}
      if(method==='GET'&&path.startsWith('/git/blobs/'))return json({encoding:'base64',content:Buffer.from(objects.get(path.split('/').pop()).text).toString('base64')});
      if(method==='POST'&&path==='/git/blobs')return json({sha:blob(Buffer.from(body.content,'base64').toString('utf8'))},201);
      if(method==='POST'&&path==='/git/trees'){const entries={...flatten(body.base_tree)};for(const e of body.tree){if(e.sha===null)delete entries[e.path];else entries[e.path]=e.sha;}return json({sha:tree(entries)},201);}
      if(method==='POST'&&path==='/git/commits'){const sha=put({kind:'commit',tree:body.tree,parents:body.parents,message:body.message});commits.push(sha);return json({sha},201);}
      if(method==='PATCH'&&path==='/git/refs/heads/main'){
        if(body.force!==false)throw new Error('a save must never force');
        if(objects.get(body.sha).parents[0]!==refs.main)return json({message:'Update is not a fast forward'},422);
        refs.main=body.sha;return json({object:{sha:body.sha}});}
      throw new Error(`The fake GitHub does not answer ${method} ${url.pathname}`);
    }};
}

