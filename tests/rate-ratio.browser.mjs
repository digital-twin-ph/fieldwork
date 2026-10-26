import {test,expect} from '@playwright/test';
import {existsSync} from 'node:fs';
import {collectPageErrors} from './page-errors.mjs';

/** THE GROUPS ARE OFFERED, AND THE DIRECTION IS SHOWN BEFORE THE RUN.
 *
 *  Two lessons this repository has already paid for, applied to a new widget rather than learned
 *  again. The area join's column control said "Connect a table first" with a table connected,
 *  because it read the kind of node upstream instead of what that node emits. And a ratio and its
 *  reciprocal are the same finding and not the same sentence, which a practitioner could
 *  previously only discover by running the workflow and reading the number. */

const BUNDLE=new URL('../../example-1855-cholera-south-london/fieldwork-project.json.gz',import.meta.url);
const skip=existsSync(BUNDLE)?false
  :'example-1855-cholera-south-london is not checked out beside this repository.';

test('a rate ratio offers the rate\'s own groups, and says which way it reads',{skip},async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/');
  await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles(BUNDLE.pathname);
  await expect(page.locator('.toast')).toContainText('imported with 6 workflows',{timeout:30000});

  await page.locator('[data-view="workflow"]').click();
  const mortality=page.locator('#workflow-select option',{hasText:'Deaths per 1,000 people, by sub-district'});
  await page.locator('#workflow-select').selectOption(await mortality.getAttribute('value'));

  // Add the widget the way a practitioner would: from the palette, under its own group.
  await expect(page.locator('.library-group', {hasText:'Epidemiology'})).toBeVisible();
  await page.locator('[data-add="rate_ratio"]').click();

  // Wired to the rate, the groups come from the table the rate reads: 32 sub-districts.
  await page.locator('#ratio-rates').selectOption('mortality');
  const compared=page.locator('#ratio-compared');
  await expect(compared).toBeVisible();
  const options=await compared.locator('option').allTextContents();
  expect(options).toContain('St. Olave, Southwark');
  expect(options).toContain('Dulwich');
  expect(options.length).toBe(33); // 32 sub-districts and the "Choose a group…" prompt

  await compared.selectOption('St. Olave, Southwark');
  await page.locator('#ratio-reference').selectOption('Brixton');

  // THE DIRECTION IS A SENTENCE, before the run rather than after it.
  await expect(page.locator('#inspector-content'))
    .toContainText('St. Olave, Southwark against Brixton');
  await page.locator('#ratio-swap').click();
  await expect(page.locator('#inspector-content'))
    .toContainText('Brixton against St. Olave, Southwark');
  await expect(page.locator('#ratio-compared')).toHaveValue('Brixton');

  // The method is stated, not offered: a dropdown holding one option is not a choice.
  await expect(page.locator('#inspector-content')).toContainText('Log-normal approximation');
  expect(await page.locator('#ratio-method').count()).toBe(0);
  expect(errors).toEqual([]);
});
