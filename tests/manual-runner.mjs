import {expect} from '@playwright/test';

/** PERFORMS A WORKED EXAMPLE'S MANUAL in the browser, step by step, as a practitioner would (experiment 173).
 *
 *  Every label the manual names is checked against the label on screen before the step is done, so a manual that
 *  says "From" where the Inspector says something else fails here rather than misleading a reader. Two things are
 *  done that the manual does not say: Tidy before connecting, so the ports are where a drag can reach them, and
 *  waiting for what a step starts (a fetch, a save, a run) to finish. Neither changes what is built. */
const saved=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')));

async function labelOf(page,id){
  return page.evaluate(id=>{
    const el=document.getElementById(id);
    const label=document.querySelector(`label[for="${CSS.escape(id)}"]`)?.textContent
      ??el?.closest('label')?.textContent
      ??el?.querySelector?.('legend')?.textContent;
    return (label??'').replace(/\s+/g,' ').trim();
  },id);
}
const sameLabel=async(page,id,label,where)=>
  expect(await labelOf(page,id),`${where}: the manual's label for #${id}`).toBe(label);

async function view(page,name){
  if(name)await page.locator(`[data-view="${name}"]`).click();
}

export async function performManual(page,workflow,{timeout=120000}={}){
  const nodes={};
  for(const [index,step] of workflow.steps.entries()){
    const where=`"${workflow.name}" step ${index+1}`;
    if('note' in step)continue;
    if('add' in step){
      await view(page,'workflow');
      // As the manual says: the name typed into the library's search, then the entry it leaves.
      const entry=page.locator(`#node-library [data-add="${step.add}"]`);
      const name=(await entry.locator('strong, .node-title, b').first().textContent().catch(()=>null))
        ??(await entry.textContent());
      await page.locator('#node-search').fill(name.trim());
      await expect(entry,`${where}: searching the library for "${name.trim()}"`).toBeVisible();
      await entry.click();
      await page.locator('#node-search').fill('');
      nodes[step.as]=(await saved(page)).nodes.filter(n=>n.type===step.add).at(-1).id;
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
      const source=page.locator(`.react-flow__node[data-id="${from}"] [data-handleid="out"]`);
      const target=page.locator(`.react-flow__node[data-id="${to}"] [data-handleid="${step.connect.port}"]`);
      const a=await source.boundingBox(),b=await target.boundingBox();
      await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();
      await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:20});await page.mouse.up();
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
      await target.click();
      if(step.click==='#table-save')await expect(page.locator('#table-save')).toBeHidden({timeout});
      continue;
    }
    if('fill' in step){
      await view(page,step.view);
      const field=page.locator(`#${step.fill}`);
      await expect(field,where).toBeVisible({timeout});
      await sameLabel(page,step.fill,step.label,where);
      await field.fill(step.value);
      await (step.fill==='workflow-name-edit'?field.press('Enter'):field.press('Tab'));
      if(step.view)await view(page,'workflow');
      continue;
    }
    if('choose' in step){
      await view(page,step.view);
      const field=page.locator(`#${step.choose}`);
      await expect(field,where).toBeVisible({timeout});
      await sameLabel(page,step.choose,step.label,where);
      if(step.shown){
        const shown=await field.locator(`option[value="${step.value}"]`).textContent();
        expect(shown.trim(),`${where}: the option the manual names`).toContain(step.shown);
      }
      await field.selectOption(step.value);
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
    if('keyRole' in step){
      const role=page.locator(`[data-key-role="${step.keyRole}"]`);
      const shown=await role.locator(`option[value="${step.value}"]`).textContent();
      expect(shown.trim(),where).toBe(step.shown);
      await role.selectOption(step.value);
      continue;
    }
    if('run' in step){
      await page.locator('#run-button').click();
      await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout});
      await view(page,'results');
      continue;
    }
    if('see' in step){
      if(step.check)await expect(page.locator('main').first(),where).toContainText(step.check);
      continue;
    }
    throw new Error(`${where} is not a step this runner knows.`);
  }
  return nodes;
}
