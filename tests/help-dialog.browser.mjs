import {test,expect} from './fixtures.mjs';

/** THE HELP DIALOG, brought up to date 2026-11-15 (the practitioner: the old one was stale; the new content *"ok"*). */
test('the ? in the header opens How Fieldwork works, current and short',async({page})=>{
  await page.goto('/?example=blank');
  await expect(page.locator('html[data-ready="true"]')).toHaveCount(1,{timeout:30000});
  await page.locator('#help-button').click();
  const help=page.locator('#help-dialog');
  await expect(help.locator('h2')).toHaveText('How Fieldwork works');
  await expect(help.locator('ol > li')).toHaveCount(6);
  await expect(help).toContainText('what you are writing towards');
  await expect(help).not.toContainText('Logical English');
  await expect(help.locator('#lab-evaluation-switch')).toHaveCount(0);
  await help.locator('#close-help').click();
  await expect(help).toBeHidden();
});
