import {test,expect} from './fixtures.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {collectPageErrors} from './page-errors.mjs';
import {downloadText} from './read-download.mjs';

/** A PROJECT SHARED THROUGH ITS REPOSITORY, against a GitHub kept in memory (experiment 150, 2026-11-16): shared,
 *  saved as one commit, nothing to save when nothing changed, a save refused once someone else has saved, the latest
 *  got, and the same repository opened again as a project. The fake answers the requests Fieldwork makes and no others,
 *  so a request it does not know fails the test rather than passing silently. */
test.use({serviceWorkers:'block'});

const REPO='o/shared-test';
function fakeGitHub(){
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
      if(method==='POST'&&path==='/git/trees'){const entries={...flatten(body.base_tree)};for(const e of body.tree)entries[e.path]=e.sha;return json({sha:tree(entries)},201);}
      if(method==='POST'&&path==='/git/commits'){const sha=put({kind:'commit',tree:body.tree,parents:body.parents,message:body.message});commits.push(sha);return json({sha},201);}
      if(method==='PATCH'&&path==='/git/refs/heads/main'){
        if(body.force!==false)throw new Error('a save must never force');
        if(objects.get(body.sha).parents[0]!==refs.main)return json({message:'Update is not a fast forward'},422);
        refs.main=body.sha;return json({object:{sha:body.sha}});}
      throw new Error(`The fake GitHub does not answer ${method} ${url.pathname}`);
    }};
}

test('a project shared, saved as one commit, refused after someone else saves, got again, and opened from the repository',async({page})=>{
  test.setTimeout(120000);
  const errors=collectPageErrors(page);
  const github=fakeGitHub();
  await page.route('https://api.github.com/**',route=>github.route(route).catch(e=>{errors.push(String(e));return route.abort();}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  // A GitHub token, unlocked.
  await page.locator('#credentials-button').click();await page.locator('#credential-new').click();
  await page.locator('#credential-ref').fill('github-shared-test');await page.locator('#credential-provider').fill('github');
  await page.locator('#credential-origin').fill('https://api.github.com');await page.locator('#credential-repository').fill(REPO);await page.locator('#credential-secret').fill('not-a-real-token');
  await page.locator('#credential-add').click();await page.locator('#credential-close').click();
  await expect(page.locator('#credentials-button')).toContainText('unlocked');
  // A project with one named workflow.
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Shared outbreak');
  await page.locator('#project-adopt-current').check();
  await page.locator('#project-create').click();
  await page.locator('[data-view="project"]').click();
  await page.locator('#workflow-name-edit').fill('Attack rate by food');await page.locator('#project-apply').click();

  // SHARE: the repository is checked, and the empty template accepted.
  const shared=page.locator('#project-shared');
  await expect(shared).toContainText('Not shared');
  await page.locator('#share-name').fill(REPO);await page.locator('#share-send').click();
  await expect(shared).toContainText(`Shared with ${REPO}`);
  await expect(page.locator('#project-select optgroup[label="Shared through GitHub"] option')).toContainText(['Shared outbreak · 1 workflow']);
  await expect(page.locator('#shared-state')).toContainText('not been saved to the repository yet');
  await expect(page.locator('#shared-discussions')).toContainText('Claiming the attack rate');

  // PEOPLE: GitHub's list, each with a proposed project role; a project role given here; a shortfall said, not refused.
  const people=page.locator('#shared-people');
  await expect(people).toContainText('jlt');
  await expect(people).toContainText('on GitHub: maintain');
  await expect(people).toContainText('Co-author would fit');
  await page.locator('[data-member="jlt"]').selectOption('co-author');
  await page.locator('[data-member="rev"]').selectOption('co-author');
  await expect(people).toContainText('As Co-author they need write on GitHub and have read: they cannot save to the repository.');
  await page.locator('[data-member="rev"]').selectOption('reviewer');
  await expect(people).not.toContainText('they cannot save');

  // SAVE: one commit, the device's keys left out of the workflow file.
  await page.locator('#shared-message').fill('First save');await page.locator('#shared-save').click();
  await expect(page.locator('#shared-result')).toContainText('Saved.');
  // NOT REFUSED, SAID: the save went through, and the person is asked to say who they are.
  await expect(page.locator('#shared-result')).toContainText('This project does not yet say who you are.');
  assert.equal(github.commits.length,1);
  const files=github.filesAt(github.refs.main);
  assert.ok(files['workflows/attack-rate-by-food.json'],Object.keys(files).join(', '));
  assert.ok(!/"workflowKey"|"projectId"/.test(files['workflows/attack-rate-by-food.json']),'device keys stay on the device');
  assert.equal(JSON.parse(files['project.json']).name,'Shared outbreak');
  assert.deepEqual(JSON.parse(files['project.json']).members.map(m=>[m.login,m.role]),[['jlt','co-author'],['rev','reviewer']],'the team travels in project.json');
  assert.equal(files['README.md'],'# Template\n','the template\'s own files are kept');
  await page.locator('#shared-check').click();
  await expect(page.locator('#shared-state')).toContainText('Nothing changed here');
  await expect(page.locator('#shared-state')).toContainText('GitHub has nothing newer');

  // NOTHING CHANGED, NOTHING SAVED.
  await page.locator('#shared-message').fill('Again');await page.locator('#shared-save').click();
  await expect(page.locator('#shared-result')).toContainText('nothing to save');
  assert.equal(github.commits.length,1);

  // SOMEONE ELSE SAVES: this device's save is refused before anything is written.
  await page.locator('#project-name-edit').fill('Shared outbreak, renamed');await page.locator('#project-apply').click();
  github.elsewhere();
  await page.locator('#shared-check').click();
  await expect(page.locator('#shared-state')).toContainText('Someone saved to GitHub since');
  await expect(page.locator('#shared-state')).toContainText('the project\'s details');
  await page.locator('#shared-message').fill('Renamed');await page.locator('#shared-save').click();
  await expect(page.locator('#shared-result')).toContainText('get the latest first');
  assert.equal(github.commits.length,1);

  // GET THE LATEST MERGES: the rename made here is kept (GitHub did not touch project.json), nothing is asked, and the
  // project stays changed here, to be saved.
  page.on('dialog',dialog=>{errors.push(`asked: ${dialog.message()}`);dialog.dismiss();});
  await page.locator('#shared-latest').click();
  await expect(page.locator('#toast')).toContainText('Got the latest.');
  await expect(page.locator('#toast')).toContainText('Kept from here');
  await page.locator('[data-view="project"]').click();
  await expect(page.locator('#project-name-edit')).toHaveValue('Shared outbreak, renamed');
  await page.locator('#shared-check').click();
  await expect(page.locator('#shared-state')).toContainText('GitHub has nothing newer');
  await expect(page.locator('#shared-state')).toContainText('the project\'s details');
  await page.locator('#shared-message').fill('Renamed');await page.locator('#shared-save').click();
  await expect(page.locator('#shared-result')).toContainText('Saved.');
  assert.equal(JSON.parse(github.filesAt(github.refs.main)['project.json']).name,'Shared outbreak, renamed');
  assert.ok(github.filesAt(github.refs.main)['notes/other.json'],'the other author\'s note is kept');

  // TWO AUTHORS AT ONCE: another author saves a workflow while this device adds its own. This save is refused; Get the
  // latest brings theirs in and keeps this one; the next save holds both.
  github.otherAuthorAdds('their-question','Their question');
  await page.locator('[data-view="workflow"]').click();await page.locator('#add-workflow').click();
  await page.locator('[data-view="project"]').click();
  await page.locator('#workflow-name-edit').fill('My question');await page.locator('#project-apply').click();
  await page.locator('#shared-message').fill('Mine');await page.locator('#shared-save').click();
  await expect(page.locator('#shared-result')).toContainText('get the latest first');
  await page.locator('#shared-latest').click();
  await expect(page.locator('#toast')).toContainText('their-question');
  await expect(page.locator('#toast')).toContainText('my-question');
  await page.locator('[data-view="project"]').click();
  await page.locator('#shared-message').fill('Mine, with theirs');await page.locator('#shared-save').click();
  await expect(page.locator('#shared-result')).toContainText('Saved.');
  const both=JSON.parse(github.filesAt(github.refs.main)['project.json']).workflows;
  assert.ok(both.includes('their-question')&&both.includes('my-question'),both.join(', '));
  const projects=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-projects-v1')||'[]'));
  assert.equal(projects.filter(p=>p.repository).length,1,'one shared project, not two');

  // A DISCUSSION STARTED FROM THE PROJECT, in the person's own words.
  await page.locator('#shared-check').click();
  await expect(page.locator('#shared-post')).toBeVisible();
  await page.locator('#shared-post-category').selectOption({label:'Decisions'});
  await page.locator('#shared-post-title').fill('Case definition');await page.locator('#shared-post-body').fill('Use the 1940 one.');
  await page.locator('#shared-post-send').click();
  await expect(page.locator('#shared-post-result')).toContainText('Posted.');
  assert.deepEqual(github.posted,{r:'R1',c:'C2',t:'Case definition',b:'Use the 1940 one.'});

  // THIS IS ME, on the row of the login the token confirmed (as unlocking a credentials file records it): it asks for a
  // role first, then opens the identity file.
  await page.evaluate(()=>localStorage.setItem('fieldwork/identity/1',JSON.stringify({login:'lead-me',basis:'attested',at:'2026-11-19T12:00:00Z'})));
  await page.locator('#shared-check').click();
  const mine=page.locator('[data-member-me="lead-me"]');
  await expect(mine).toBeVisible();
  await expect(page.locator('[data-member-me="jlt"]')).toHaveCount(0);
  await mine.click();
  await expect(page.locator('[data-member-me-says="lead-me"]')).toContainText('Choose your project role first.');
  await page.locator('[data-member="lead-me"]').selectOption('lead-author');
  await page.locator('[data-member-me="lead-me"]').click();
  await expect(page.locator('#identity-dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  // THE MANUAL, from the panel.
  await page.locator('#project-shared [data-shared-manual]').click();
  await expect(page.locator('#manual-dialog')).toContainText('Say who you are');
  await page.locator('#manual-close').click();

  // OPEN FROM GITHUB, under Or bring one in: refused while this device already holds it. REMEMBERED: the repository
  // used when sharing is offered here, and choosing it fills the field.
  await page.locator('#project-new').click();
  await page.locator('input[name="project-path"][value="github"]').check();
  await expect(page.locator('#path-local')).toBeHidden();
  // THE TOKEN'S ROW: its repository is already a project here, and says so.
  await expect(page.locator('#token-projects')).toContainText(`${REPO} On this device as "Shared outbreak, renamed".`);
  // TYPED, the fallback: remembered, checked, Open offered, and refused because it is already here.
  await page.locator('#repo-typed summary').click();
  await expect(page.locator('#repo-check-recent')).toContainText('Used here before');
  await page.locator('#repo-check-name-recent').selectOption({label:REPO});
  await expect(page.locator('#repo-check-name')).toHaveValue(REPO);
  await page.locator('#repo-check').click();
  await expect(page.locator('#github-holds')).toBeVisible();
  await expect(page.locator('#github-empty')).toBeHidden();
  await page.locator('#repo-open-send').click();
  await expect(page.locator('#repo-open-result')).toContainText('already shared');
  expect(errors).toEqual([]);
});

test('a shared project started from Open shared GitHub project: the empty template checked, a project created in it, listed, and saved',async({page})=>{
  test.setTimeout(120000);
  const errors=collectPageErrors(page);
  const github=fakeGitHub();
  await page.route('https://api.github.com/**',route=>github.route(route).catch(e=>{errors.push(String(e));return route.abort();}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  // LOCKED, the shared path is not offered.
  await page.locator('#new-project').click();
  await expect(page.locator('input[name="project-path"][value="github"]')).toBeHidden();
  await page.locator('#credentials-button').click();await page.locator('#credential-new').click();
  await page.locator('#credential-ref').fill('github-shared-test');await page.locator('#credential-provider').fill('github');
  await page.locator('#credential-origin').fill('https://api.github.com');await page.locator('#credential-repository').fill(REPO);await page.locator('#credential-secret').fill('not-a-real-token');
  await page.locator('#credential-add').click();await page.locator('#credential-close').click();
  await expect(page.locator('input[name="project-path"][value="github"]')).toBeVisible();
  // OPEN SHARED GITHUB PROJECT: the empty template checked, and a project started in it.
  await expect(page.locator('#path-github')).toBeHidden();
  await page.locator('input[name="project-path"][value="github"]').check();
  // THE TOKEN IS THE LIST: its row names the repository it reaches, and Check it checks that one.
  await expect(page.locator('#token-projects')).toContainText(`github-shared-test${REPO}`);
  await page.locator(`[data-check-repo="${REPO}"]`).click();
  await expect(page.locator('#github-empty')).toBeVisible();
  await expect(page.locator('#github-holds')).toBeHidden();
  await expect(page.locator('#github-name')).toHaveValue('shared-test');
  await expect(page.locator('#github-create')).toHaveText('Load the project');
  await page.locator('#github-name').fill('Measles, district X');
  await page.locator('#github-create').click();
  await expect(page.locator('#project-select optgroup[label="Shared through GitHub"] option')).toContainText(['Measles, district X · 1 workflow']);
  await page.locator('[data-view="project"]').click();
  await expect(page.locator('#project-shared')).toContainText(`Shared with ${REPO}`);
  await page.locator('#shared-message').fill('First save');await page.locator('#shared-save').click();
  await expect(page.locator('#shared-result')).toContainText('Saved.');
  assert.equal(JSON.parse(github.filesAt(github.refs.main)['project.json']).name,'Measles, district X');
  expect(errors).toEqual([]);
});

test('a repository that holds a project offers Open, and nowhere to start another; a backup imported into an empty one is shared with it',async({page})=>{
  const errors=collectPageErrors(page);
  const github=fakeGitHub();
  await page.route('https://api.github.com/**',route=>github.route(route).catch(e=>{errors.push(String(e));return route.abort();}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#credentials-button').click();await page.locator('#credential-new').click();
  await page.locator('#credential-ref').fill('github-shared-test');await page.locator('#credential-provider').fill('github');
  await page.locator('#credential-origin').fill('https://api.github.com');await page.locator('#credential-repository').fill(REPO);await page.locator('#credential-secret').fill('not-a-real-token');
  await page.locator('#credential-add').click();await page.locator('#credential-close').click();
  // A BACKUP: a local project, backed up.
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('From a backup');await page.locator('#project-create').click();
  await page.locator('#storage-status').click();
  const download=page.waitForEvent('download');
  await page.locator('.project-view-block').filter({hasText:'From a backup'}).first().locator('button[data-export-project]').click();
  const text=await downloadText(await download);
  // IMPORTED INTO THE EMPTY REPOSITORY: the imported project is shared with it.
  await page.locator('[data-view="project"]').click();await page.locator('#project-new').click();
  await page.locator('input[name="project-path"][value="github"]').check();
  await page.locator(`[data-check-repo="${REPO}"]`).click();
  await expect(page.locator('#github-empty')).toBeVisible();
  const chooser=page.waitForEvent('filechooser');
  await page.locator('#github-import').click();
  await (await chooser).setFiles({name:'p.json',mimeType:'application/json',buffer:Buffer.from(text)});
  await expect(page.locator('#toast')).toContainText('imported');
  const projects=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-projects-v1')||'[]'));
  expect(projects.filter(p=>p.repository).map(p=>[p.name,`${p.repository.owner}/${p.repository.repo}`])).toEqual([['From a backup',REPO]]);
  // A REPOSITORY THAT HOLDS A PROJECT: Open is offered, starting another is not.
  await page.route('https://api.github.com/repos/o/shared-test/contents/project.json',route=>route.fulfill({status:200,contentType:'application/json',body:'{"name":"Theirs","workflows":["a"]}'}));
  await page.locator('[data-view="project"]').click();await page.locator('#project-new').click();
  await page.locator('input[name="project-path"][value="github"]').check();
  await page.locator('#repo-typed summary').click();await page.locator('#repo-check-name').fill(REPO);
  await page.locator('#repo-check').click();
  await expect(page.locator('#github-holds')).toBeVisible();
  await expect(page.locator('#github-empty')).toBeHidden();
  expect(errors).toEqual([]);
});

test('a token whose credential does not name its repository is asked once, private repositories first, and keeps the answer',async({page})=>{
  const errors=collectPageErrors(page);
  const github=fakeGitHub();
  await page.route('https://api.github.com/**',route=>github.route(route).catch(e=>{errors.push(String(e));return route.abort();}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#credentials-button').click();await page.locator('#credential-new').click();
  await page.locator('#credential-ref').fill('github-shared-test');await page.locator('#credential-provider').fill('github');
  await page.locator('#credential-origin').fill('https://api.github.com');await page.locator('#credential-secret').fill('not-a-real-token');
  await page.locator('#credential-add').click();await page.locator('#credential-close').click();
  await page.locator('#new-project').click();
  await page.locator('input[name="project-path"][value="github"]').check();
  const row=page.locator('#token-projects [data-token-row="0"]');
  await expect(row).toContainText('does not say which repository it is for');
  // No name match (the label is github-shared-test): the list opens, private repositories only until asked.
  expect(await row.locator('select option').allTextContents()).toEqual(['Which repository is it for?',REPO]);
  await row.locator('[data-public]').check();
  expect(await row.locator('select option').allTextContents()).toEqual(['Which repository is it for?',REPO,'o/public-one']);
  await row.locator('select').selectOption(REPO);await row.locator('[data-from]').click();
  await expect(page.locator('#token-projects')).toContainText('download your credentials file again');
  await expect(page.locator(`[data-check-repo="${REPO}"]`)).toBeVisible();
  await expect(page.locator('#token-projects')).not.toContainText('o/public-one');
  expect(errors).toEqual([]);
});

test('a token labelled with its repository\'s name is offered that repository alone, and one Yes keeps it',async({page})=>{
  const errors=collectPageErrors(page);
  const github=fakeGitHub();
  await page.route('https://api.github.com/**',route=>github.route(route).catch(e=>{errors.push(String(e));return route.abort();}));
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#credentials-button').click();await page.locator('#credential-new').click();
  await page.locator('#credential-ref').fill('gh-test');await page.locator('#credential-provider').fill('github');
  await page.locator('#credential-label').fill('shared-test');
  await page.locator('#credential-origin').fill('https://api.github.com');await page.locator('#credential-secret').fill('not-a-real-token');
  await page.locator('#credential-add').click();await page.locator('#credential-close').click();
  await page.locator('#new-project').click();
  await page.locator('input[name="project-path"][value="github"]').check();
  const row=page.locator('#token-projects [data-token-row="0"]');
  await expect(row.locator('.token-guess')).toContainText(`For ${REPO}?`);
  await expect(row.locator('.token-choose')).not.toHaveAttribute('open','');
  await row.locator('[data-value]').click();
  await expect(page.locator(`[data-check-repo="${REPO}"]`)).toBeVisible();
  expect(errors).toEqual([]);
});
