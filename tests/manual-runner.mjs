import {expect} from '@playwright/test';

/** PERFORMS A WORKED EXAMPLE'S MANUAL in the browser, step by step, as a practitioner would (experiment 173).
 *
 *  Every label the manual names is checked against the label on screen before the step is done, so a manual that
 *  says "From" where the Inspector says something else fails here rather than misleading a reader. Two things are
 *  done that the manual does not say: Tidy before connecting, so the ports are where a drag can reach them, and
 *  waiting for what a step starts (a fetch, a save, a run) to finish. Neither changes what is built. */
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));

/** A CONTROL BY ID, or by selector where a dialog names its controls by role, as the rules dialog does
 *  (`[data-rule="0"][data-part="column"]`). Its label is its <label>, or else its aria-label. */
const selectorOf=target=>/^[\[.#]/.test(target)?target:`#${target}`;
async function labelOf(page,target){
  return page.evaluate(selector=>{
    const el=document.querySelector(selector);
    const label=(el?.id?document.querySelector(`label[for="${CSS.escape(el.id)}"]`)?.textContent:undefined)
      ??el?.closest('label')?.textContent
      ??el?.querySelector?.('legend')?.textContent
      ??el?.getAttribute('aria-label');
    return (label??'').replace(/\s+/g,' ').trim();
  },selectorOf(target));
}
const sameLabel=async(page,target,label,where)=>
  expect(await labelOf(page,target),`${where}: the manual's label for ${selectorOf(target)}`).toBe(label);

async function view(page,name){
  if(name)await page.locator(`[data-view="${name}"]`).click();
}

export async function performManual(page,workflow,{timeout=120000,runTimeout=timeout,repo}={}){
  const nodes={};
  for(const [index,step] of workflow.steps.entries()){
    const where=`"${workflow.name}" step ${index+1}`;
    if('note' in step)continue;
    // THE DIALOG THE MANUAL NAMES is the one open, by its heading.
    if(step.dialog)await expect(page.locator('dialog[open] h2').filter({hasText:step.dialog}).first(),
      `${where}: the "${step.dialog}" dialog`).toBeVisible({timeout});
    if('add' in step){
      await view(page,'workflow');
      // As the manual says: the name typed into the library's search, then the entry it leaves.
      const entry=page.locator(`#node-library [data-add="${step.add}"]`);
      const name=(await entry.locator('strong, .node-title, b').first().textContent().catch(()=>null))
        ??(await entry.textContent());
      await page.locator('#node-search').fill(name.trim());
      await expect(entry,`${where}: searching the library for "${name.trim()}"`).toBeVisible();
      const known=new Set(Object.values(nodes));
      const before=(await saved(page)).nodes.filter(n=>n.type===step.add).length;
      await entry.click();
      await page.locator('#node-search').fill('');
      // THE NEW NODE, once it is saved. A project holding two 77,740-row tables saves after the click returns, and
      // reading the save at once found nothing (experiment 182).
      await expect.poll(async()=>(await saved(page)).nodes.filter(n=>n.type===step.add).length,
        {message:`${where}: the added ${step.add} is saved`,timeout}).toBeGreaterThan(before);
      nodes[step.as]=(await saved(page)).nodes.filter(n=>n.type===step.add&&!known.has(n.id)).at(-1).id;
      continue;
    }
    if('reuse' in step){
      await view(page,'workflow');
      // The library's search narrows this group too; the entry is the one from the named workflow.
      await page.locator('#node-search').fill(step.from);
      const entry=page.locator('#node-library [data-sibling]').filter({hasText:step.from}).first();
      await expect(entry,`${where}: "${step.from}" under From this project`).toBeVisible();
      const before=(await saved(page)).nodes.filter(n=>n.type===step.reuse).length;
      await entry.click();
      await expect.poll(async()=>(await saved(page)).nodes.filter(n=>n.type===step.reuse).length,{message:where}).toBe(before+1);
      nodes[step.as]=(await saved(page)).nodes.filter(n=>n.type===step.reuse).at(-1).id;
      await page.locator('#node-search').fill('');
      continue;
    }
    if('select' in step){
      await view(page,'workflow');
      await page.locator(`.react-flow__node[data-id="${nodes[step.select]}"]`).click();
      continue;
    }
    if('connect' in step){
      await view(page,'workflow');
      await page.locator('#tidy-button').click();await page.waitForTimeout(400);
      const from=nodes[step.connect.from],to=nodes[step.connect.to];
      // THROUGH THE INSPECTOR, as a person who cannot hit a small port would: select the step, choose the source in its
      // input's list. Dragging between ports stopped working once readable nodes made a large workflow taller than the
      // canvas at its smallest zoom (2026-11-07): the target port was off the canvas, and 3px wide when it was not.
      await page.locator(`.react-flow__node[data-id="${to}"]`).dispatchEvent('click');
      // The step's own list for the port where it still has one (TODO item 3), the shared Inputs list otherwise.
      const own=page.locator(`.inspector [data-map-port="${step.connect.port}"]`);
      const list=await own.count()?own.first():page.locator(`#connect-${step.connect.port}`);
      await expect(list,{message:where}).toBeVisible();
      await list.selectOption(from);
      await expect.poll(async()=>(await saved(page)).edges.some(e=>e.from===from&&e.to===to&&e.port===step.connect.port),
        {message:where}).toBe(true);
      continue;
    }
    if('click' in step){
      await view(page,step.view);
      const target=page.locator(step.click).first();
      await expect(target,where).toBeVisible({timeout});
      const text=await target.evaluate(el=>[el.textContent,el.getAttribute('aria-label'),el.getAttribute('title')].join(' '));
      expect(text.replace(/\s+/g,' '),`${where}: the manual's label for ${step.click}`).toContain(step.label);
      // A BUTTON THAT ADDS A STEP, such as Cases by period's "Add epidemic curve": `as` names the node it adds.
      const before=step.as?new Set((await saved(page)).nodes.map(n=>n.id)):null;
      await target.click();
      if(before){
        await expect.poll(async()=>(await saved(page)).nodes.filter(n=>!before.has(n.id)).length,{message:where}).toBe(1);
        nodes[step.as]=(await saved(page)).nodes.find(n=>!before.has(n.id)).id;
      }
      if(step.click==='#table-save')await expect(page.locator('#table-save')).toBeHidden({timeout});
      continue;
    }
    // A FILE OF THE REPOSITORY, as a person would choose it after downloading it: from the checkout beside this one.
    if('file' in step){
      if(!repo)throw new Error(`${where} chooses a file of the repository; give performManual the checkout.`);
      const field=page.locator(selectorOf(step.file)).first();
      await sameLabel(page,step.file,step.label,where);
      await field.setInputFiles(new URL(step.path,repo).pathname);
      continue;
    }
    if('fill' in step){
      await view(page,step.view);
      const field=page.locator(selectorOf(step.fill)).first();
      await expect(field,where).toBeVisible({timeout});
      await sameLabel(page,step.fill,step.label,where);
      await field.fill(step.value);
      await (step.fill==='workflow-name-edit'?field.press('Enter'):field.press('Tab'));
      if(step.view)await view(page,'workflow');
      continue;
    }
    if('choose' in step){
      await view(page,step.view);
      const field=page.locator(selectorOf(step.choose)).first();
      await expect(field,where).toBeVisible({timeout});
      await sameLabel(page,step.choose,step.label,where);
      if(step.shown){
        const shown=await field.locator(`option[value="${step.value}"]`).textContent();
        expect(shown.trim(),`${where}: the option the manual names`).toContain(step.shown);
      }
      await field.selectOption(step.value);
      if(step.view)await view(page,'workflow');
      continue;
    }
    if('tick' in step){
      const box=page.locator(`#${step.tick}`);
      await expect(box,where).toBeVisible({timeout});
      await sameLabel(page,step.tick,step.label,where);
      // ONE REBUILD FOR THE WHOLE SET: unticking ~100 columns one at a time rebuilds a 3,653-row preview each time,
      // which is the friction recorded in TODO, not part of what the manual says to do.
      await page.evaluate(([id,keep])=>{
        const boxes=[...document.querySelectorAll(`#${id} input[type=checkbox]`)];
        for(const b of boxes)if(!b.disabled)b.checked=keep.includes(b.value);
        boxes.find(b=>!b.disabled)?.dispatchEvent(new Event('change',{bubbles:true}));
      },[step.tick,step.values]);
      continue;
    }
    if('pick' in step){
      const field=page.locator(`#${step.pick}`);
      await expect(field,where).toBeVisible({timeout});
      await sameLabel(page,step.pick,step.label,where);
      for(const label of step.values)
        await expect(field.locator('option').filter({hasText:label}),`${where}: "${label}" is offered`).not.toHaveCount(0);
      await field.selectOption(step.values.map(label=>({label})));
      continue;
    }
    if('keyRole' in step){
      const role=page.locator(`[data-key-role="${step.keyRole}"]`);
      const shown=await role.locator(`option[value="${step.value}"]`).textContent();
      expect(shown.trim(),where).toBe(step.shown);
      await role.selectOption(step.value);
      continue;
    }
    if('run' in step){
      await page.locator('#run-button').click();
      // A FAILED RUN ENDS THE WAIT: only the run gets the long timeout, and a run that stops on an error says so
      // at once instead of waiting it out (a live satellite run sat silent for hours, 2026-11-05).
      await expect(page.locator('#workflow-state')).toContainText(/Run complete|failed|stopped|not ready/i,{timeout:runTimeout});
      // A FAILED RUN SAYS WHY in the test's message: the notice it raised, which the page snapshot does not keep.
      const said=(await page.locator('#toast').textContent().catch(()=>''))?.replace(/\s+/g,' ').trim();
      await expect(page.locator('#workflow-state'),`${where}: the run${said?` -- the notice said: ${said}`:''}`).toContainText('Run complete');
      await view(page,'results');
      continue;
    }
    if('see' in step){
      // What a dialog says, such as a refusal, is checked where it is said.
      if(step.check)await expect(page.locator(step.within??'main').first(),where).toContainText(step.check);
      continue;
    }
    throw new Error(`${where} is not a step this runner knows.`);
  }
  return nodes;
}
