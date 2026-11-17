import {test,expect} from './fixtures.mjs';

/** THE CREDENTIALS DIALOG'S MANUAL (2026-11-17): how to make a GitHub token and fill in the form, opened from the dialog
 *  and detached so it stays readable beside the form while the fields are filled in. */
test('the Credentials dialog opens its manual, which detaches and stays beside the form',async({page})=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
  await page.locator('#credentials-button').click();
  await page.locator('#credential-manual').click();
  const manual=page.locator('#manual-dialog');
  await expect(manual.locator('#manual-title')).toHaveText('Credentials');
  await expect(manual).toContainText('Fill in the form for a GitHub token');
  await expect(manual).toContainText('https://api.github.com');
  await manual.locator('#manual-detach-page').click();
  await expect(manual).toHaveCount(0);
  const panel=page.locator('#widget-manual-float');
  await expect(panel).toContainText('Manual · Credentials');
  await expect(panel).toBeVisible();
  // The form is still there to fill in, with the page beside it.
  await page.locator('#credential-new').click();
  await page.locator('#credential-provider').fill('github');
  await expect(page.locator('#credential-provider')).toHaveValue('github');
  await expect(panel).toBeVisible();
  await expect(panel).toContainText('Repository it is for');
  await panel.locator('#widget-manual-float-close').click();
  await expect(panel).toHaveCount(0);
});
