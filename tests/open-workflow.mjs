/** Open a workflow the way a practitioner does since 2026-10-20: choose the investigation, then
 *  the question. One control used to list both, which the practitioner reported as "the wrong
 *  place to locate projects". Each project option carries the workflows it holds, so a test can
 *  find the owner without switching through every project to look for it.
 */
export async function openWorkflow(page,key){
  const owner=await page.locator('#project-select option').evaluateAll((options,wanted)=>{
    const match=options.find(option=>(option.dataset.workflows||'').split(' ').includes(wanted));
    return match?match.value:null;
  },key);
  if(owner===null)throw new Error(`No project lists the workflow "${key}".`);
  if(await page.locator('#project-select').inputValue()!==owner)
    await page.locator('#project-select').selectOption(owner);
  await page.locator('#workflow-select').selectOption(key);
}
