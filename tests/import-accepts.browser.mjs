import {test,expect} from '@playwright/test';

// THE PICKER MUST SEE WHAT THE APPLICATION WRITES. The practitioner, 2026-10-23: "I cannot view
// the .gz files on my computer to import a gzipped project."
//
// Exports became .json.gz that morning and the writing side was updated alone. Reading was never
// the problem -- readMaybeGzipped decides by the first two bytes, not by the name -- but the file
// input's accept list decides which files a practitioner is allowed to point at, and it still
// listed only .json and .zip. The application hid its own output from its own import.
test('the import control accepts every form this application writes',async({page})=>{
  await page.goto('/?example=blank');
  const accept=await page.locator('#workflow-file').getAttribute('accept');
  // Written by Back up: a workflow, a project, both gzipped; and the encrypted package.
  for(const form of ['.json','.gz','.zip'])expect(accept).toContain(form);
});

// An error is shown in the failure tone. Eleven of twenty error toasts carried none, so they
// rendered in the success colour -- which is read before the words are.
test('a refused import is announced as a failure, not in the success tone',async({page})=>{
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({
    name:'not-a-workflow.json',mimeType:'application/json',
    buffer:Buffer.from('{"schema":"something/else/1"}')});
  const toast=page.locator('#toast');
  await expect(toast).toBeVisible();
  await expect(toast).toHaveClass(/failure/);
});
