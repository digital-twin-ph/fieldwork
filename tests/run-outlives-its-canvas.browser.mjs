/** A RUN THAT FINISHES AFTER THE CANVAS HAS MOVED ON.
 *
 *  `renderResults` discards a result whose workflow is no longer the open one, which is right --
 *  *"results belong to the workflow that produced them"*. What was missing is that the run then
 *  reported on the result it had just had taken away: `result.outputs.length` on a null, thrown
 *  into the console, and the run said nothing at all.
 *
 *  Found 2026-10-27 on the DEPLOYED instance while verifying that South London opens there, and
 *  only there, because the browser suite never did it in that order. Every import in these tests
 *  goes through the file input and lands between runs; the catalog's fetch resolves on its own
 *  schedule and lands inside one. `loadExample` is behind `busy` and the import paths are not,
 *  which is the whole of the hazard.
 *
 *  The window is real rather than contrived: `snow-isochrone` spends about 2.5 seconds computing,
 *  and an import takes milliseconds. The test imports while the first run is still going, so the
 *  assertions are about what the application does with a run it no longer has a canvas for.
 */
import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

/** A one-node project, small enough to write here, so the import does not depend on a sibling
 *  checkout being present. Its only job is to be a DIFFERENT workflow from the one running. */
const OTHER={
  schema:'fieldwork/project-document/1',
  exportedAt:'2026-10-27T00:00:00.000Z',
  project:{schema:'fieldwork/project/2',id:'run-outlives',name:'Somewhere else',
    subject:'Nothing, beyond being a different workflow from the one running',
    workflows:['run-outlives/w1']},
  workflows:[{key:'run-outlives/w1',document:{
    schema:'fieldwork/workflow/1',id:'run-outlives-w1',workflowKey:'run-outlives/w1',
    name:'Somewhere else entirely',projectId:'run-outlives',
    nodes:[{id:'points',type:'point_input',x:40,y:160,params:{
      label:'One point, so there is something to look at',
      data:{type:'FeatureCollection',features:[{type:'Feature',id:'p1',properties:{name:'A place'},
        geometry:{type:'Point',coordinates:[-0.1365,51.5135]}}]},
      sourceInfo:{format:'manual'}}}],
    edges:[]}}],
};

test('a run whose canvas moved on says so, and takes nothing down with it',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());

  // The isochrone example auto-runs on arrival and spends seconds doing it.
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Running',{timeout:20000});

  // MID-RUN: swap the canvas for another workflow, the way a catalog fetch does.
  await page.locator('#workflow-file').setInputFiles({
    name:'somewhere-else.fieldwork.json',
    mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(OTHER)),
  });

  // The run finishes and reports honestly: it names the workflow it belonged to, says the
  // results were not kept, and says what to do to see them.
  const toast=page.locator('#toast');
  await expect(toast).toContainText('after this canvas had already moved on',{timeout:60000});
  await expect(toast).toContainText('John Snow · network isochrones');
  await expect(toast).toContainText('they were not kept');
  // Nothing went wrong, so it is not red, and it does not claim a failure.
  await expect(toast).not.toHaveClass(/failure/);
  await expect(toast).not.toContainText('output tabs updated');

  // The canvas the practitioner moved to is the one on screen, with its own node and no
  // results borrowed from the run that just ended.
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node')).toHaveCount(1);
  await expect(page.locator('#result-count')).toHaveText('');
  // And it is still waiting to be run -- the finished run did not mark it as covered.
  await expect(page.locator('#workflow-state')).not.toContainText('Run complete');

  expect(errors).toEqual([]);
});
