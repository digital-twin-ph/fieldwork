import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// The practitioner, 2026-10-20: "So before I download Bunia again, I want to be able to set
// driving mode on the street network." The control is on the download half of the widget, so this
// exercises the path a practitioner takes to reach it: switch the input method, choose the mode,
// and have it survive a reload. No request is made to OpenStreetMap.
test('a street network download can be set to driving, and the choice is saved',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});

  await page.locator('.react-flow__node[data-id="network"]').click();
  // The example ships a prepared file, so the mode control is not offered until a download is.
  await expect(page.locator('#network-travel-mode')).toHaveCount(0);

  await page.locator('#network-input-method').selectOption('osm');
  await expect(page.locator('#network-travel-mode')).toHaveValue('walking');
  await expect(page.locator('.inspector')).toContainText('Walking keeps footways, paths and steps');

  await page.locator('#network-travel-mode').selectOption('driving');
  await expect(page.locator('#network-travel-mode')).toHaveValue('driving');

  // A saved parameter, not a session choice: the next download must use what was chosen here.
  await page.reload();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('.react-flow__node[data-id="network"]').click();
  await expect(page.locator('#network-travel-mode')).toHaveValue('driving');

  // Keyboard-reachable and named, like every other control in this panel.
  const label=page.locator('label[for="network-travel-mode"]');
  await expect(label).toHaveText('Travel mode to download for');
  await page.locator('#network-travel-mode').focus();
  await expect(page.locator('#network-travel-mode')).toBeFocused();
  expect(errors).toEqual([]);
});
