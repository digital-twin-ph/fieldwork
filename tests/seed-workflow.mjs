/** A WORKFLOW WRITTEN BEFORE THE APPLICATION READS IT. Writing it into localStorage and then reloading raced the page's
 *  own save on the way out: on Linux WebKit in CI the blank workspace was saved over it (0.70.1, three tests). An init
 *  script runs before any of the application's code on the next load, and a flag in sessionStorage keeps it from
 *  applying again on a later reload in the same test. */
export async function seedWorkflow(page,workflow){
  await page.goto('/');
  await page.evaluate(()=>{localStorage.clear();sessionStorage.clear();});
  await page.addInitScript(seeded=>{
    if(sessionStorage.getItem('fieldwork-test-seeded'))return;
    sessionStorage.setItem('fieldwork-test-seeded','1');
    localStorage.setItem('fieldwork-workflow-v1',JSON.stringify(seeded));
  },{schema:'fieldwork/workflow/1',name:'Test workflow',exampleId:'blank',...workflow});
  await page.goto('/');
}
