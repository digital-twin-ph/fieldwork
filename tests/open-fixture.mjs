import {expect} from '@playwright/test';
import {readFileSync} from 'node:fs';

/** OPENS A SAVED WORKFLOW ON A BLANK CANVAS, and runs it, as the built-in examples did when opened. The built-in rulesets
 *  and coverage examples were removed on 2026-11-08 (their features moved to example-workflows-rulesets); the tests
 *  that used them keep exactly their cases, from the workflows they built, kept here as files. */
export async function openFixture(page,name,{run=true}={}){
  const text=readFileSync(new URL(`fixtures/${name}`,import.meta.url),'utf8');
  await page.goto('/?example=blank');
  await expect(page.locator('#node-library')).toBeVisible({timeout:45000});
  await page.locator('#workflow-file').setInputFiles({name,mimeType:'application/json',buffer:Buffer.from(text)});
  await expect(page.locator('.react-flow__node')).toHaveCount(JSON.parse(text).nodes.length,{timeout:20000});
  if(run)await page.locator('#run-button').click();
}
