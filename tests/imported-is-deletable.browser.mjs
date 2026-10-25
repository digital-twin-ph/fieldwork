import {test,expect} from '@playwright/test';
import {existsSync} from 'node:fs';

/** AN IMPORTED EXAMPLE IS NOT A WORKED EXAMPLE THAT SHIPS WITH THE APPLICATION.
 *
 *  The practitioner, 2026-10-24, on South London fetched from the catalog: *"Any imported project
 *  we should be able to delete, including repo-based projects like South London."* Delete was
 *  refused because `isExampleKey` asked whether the key had a slash, not whether the application
 *  ships the example -- and the refusal recommended "Reset example", a control the adjacent line
 *  had already hidden for exactly the same workflow. */
const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';

test('an imported workflow can be deleted; a shipped example still cannot',{skip},async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(BUNDLE.pathname);
  await page.locator('[data-view="workflow"]').click();
  await expect(page.locator('.react-flow__node[data-id="mortality"]')).toBeVisible({timeout:20000});

  // DELETABLE, and the title says what it will do rather than why it will not.
  await expect(page.locator('#delete-workflow')).toBeEnabled();
  await expect(page.locator('#delete-workflow')).not.toHaveAttribute('title',/ships with the application/);
  // Reset example stays hidden, which is the line that was already right.
  await expect(page.locator('#reset-example')).toBeHidden();

  // A WORKED EXAMPLE IS STILL REFUSED, so the fix did not simply remove the rule.
  await page.goto('/?example=hagelloch');
  await expect(page.locator('#delete-workflow')).toBeDisabled();
  await expect(page.locator('#reset-example')).toBeVisible();

  // AND THE BLANK CANVAS TOO, which is the case the first version of this fix broke. Delete asks
  // "does this ship with the application" and the blank canvas does; Reset example asks "is there
  // published work to reload" and it has none. Two questions, two lists, one of which drops
  // `blank`. `workflow-housekeeping` caught it; this holds it here as well, beside the imported
  // case, so the pair cannot drift apart again.
  await page.goto('/?example=blank');
  await expect(page.locator('#delete-workflow')).toBeDisabled();
  await expect(page.locator('#reset-example')).toBeHidden();
});
