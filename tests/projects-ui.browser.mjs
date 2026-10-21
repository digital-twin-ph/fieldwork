import {test,expect} from '@playwright/test';

// The practitioner, 2026-10-20: "Right now I have no way of editing Project Title nor viewing
// Project metadata. I can only view the workflows through the worked example dropdown which seems
// to be the wrong place to locate projects."
test('a project can be chosen, read and renamed, and its workflows are its own select',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});

  // Two selects: the investigation, then the question.
  await expect(page.locator('#project-select')).toHaveValue('cholera-london-1854');
  await expect(page.locator('#workflow-select')).toHaveValue('snow-voronoi');
  // The worked examples are listed as the built-in projects they already were.
  await expect(page.locator('#project-select optgroup[label="Built in"] option')).toHaveCount(7);
  const workflows=await page.locator('#workflow-select option').evaluateAll(o=>o.map(x=>x.value));
  expect(workflows).toEqual(['snow-voronoi','snow-isochrone','snow-geoprivacy','snow-extent']);

  // The metadata is readable rather than hidden in a tooltip.
  await page.locator('#project-details summary').click();
  await expect(page.locator('#project-name-edit')).toHaveValue('1854 Cholera Outbreak in London');
  await expect(page.locator('#project-stats')).toContainText('4 workflows');
  // A built-in project says why it cannot be renamed instead of failing silently.
  await expect(page.locator('#project-name-edit')).toBeDisabled();
  await expect(page.locator('#project-readonly')).toBeVisible();

  // Switching workflow inside the project stays inside the project.
  await page.locator('#workflow-select').selectOption('snow-extent');
  await expect(page.locator('#workflow-state')).toContainText(/Run|Ready/,{timeout:45000});
  await expect(page.locator('#project-select')).toHaveValue('cholera-london-1854');
});

test('a created project can be renamed, given a subject, and holds a second workflow',async({page})=>{
  await page.goto('/?example=blank');
  await expect(page.locator('#workflow-state')).toBeVisible({timeout:45000});
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Bunia access');
  await page.locator('#project-subject-input').fill('driving reach to health facilities');
  await page.locator('#project-dialog button[type="submit"], #project-create').first().click();
  await expect(page.locator('#project-name')).toHaveText('BUNIA ACCESS');

  await page.locator('#project-details summary').click();
  await expect(page.locator('#project-name-edit')).toBeEnabled();
  await page.locator('#project-name-edit').fill('Bunia driving access');
  await page.locator('#project-subject-edit').fill('how far a vehicle reaches in 30 minutes');
  await page.locator('#project-apply').click();
  await expect(page.locator('#project-name')).toHaveText('BUNIA DRIVING ACCESS');
  await expect(page.locator('#project-subject-edit')).toHaveValue('how far a vehicle reaches in 30 minutes');

  // A second question, inside the same investigation, in one gesture.
  await page.locator('#add-workflow').click();
  await expect(page.locator('#project-workflow-count')).toHaveText('2 workflows');
  await expect(page.locator('#workflow-select option')).toHaveCount(2);
  await page.locator('#project-details summary').click();
  await expect(page.locator('#project-stats')).toContainText('2 workflows');
});

// The practitioner, on the first version of this: "There is still no way to edit project (e.g.,
// title) or workflow (e.g., title) metadata." It was there, behind a collapsed disclosure at the
// bottom of the bar -- somewhere to put a control rather than somewhere anyone looks. A title you
// can click is the gesture that was chosen; this is that gesture.
test('the project and workflow titles are renamed by clicking them',async({page})=>{
  await page.goto('/?example=blank');
  await expect(page.locator('#workflow-state')).toBeVisible({timeout:45000});
  await page.locator('#new-project').click();
  await page.locator('#project-name-input').fill('Ituri access');
  await page.locator('#project-dialog button[type="submit"], #project-create').first().click();
  await expect(page.locator('#project-name')).toHaveText('ITURI ACCESS');

  // The workflow title: click, type, Enter.
  await page.locator('#project-title').click();
  await page.locator('#project-title .inline-rename').fill('Driving reach from Bunia hospital');
  await page.locator('#project-title .inline-rename').press('Enter');
  await expect(page.locator('#project-title')).toHaveText('Driving reach from Bunia hospital');
  await expect(page.locator('#workflow-select')).toContainText('Driving reach from Bunia hospital');

  // The project name: same gesture, from the eyebrow that names it.
  await page.locator('#project-name').click();
  await page.locator('#project-name .inline-rename').fill('Ituri driving access');
  await page.locator('#project-name .inline-rename').press('Enter');
  await expect(page.locator('#project-name')).toHaveText('ITURI DRIVING ACCESS');
  await expect(page.locator('#project-select')).toContainText('Ituri driving access');

  // Escape abandons rather than writing.
  await page.locator('#project-title').click();
  await page.locator('#project-title .inline-rename').fill('discarded');
  await page.locator('#project-title .inline-rename').press('Escape');
  await expect(page.locator('#project-title')).toHaveText('Driving reach from Bunia hospital');

  // It survives a reload, because it is the workflow's name and not a label on screen.
  await page.reload();
  await expect(page.locator('#project-title')).toHaveText('Driving reach from Bunia hospital',{timeout:45000});
  await expect(page.locator('#project-name')).toHaveText('ITURI DRIVING ACCESS');
});

test('a built-in project says why its name is fixed instead of doing nothing',async({page})=>{
  await page.goto('/?example=snow-voronoi');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  await page.locator('#project-name').click();
  await expect(page.locator('#toast')).toContainText('ships with the application');
  await expect(page.locator('#project-name .inline-rename')).toHaveCount(0);
  // The workflow title of a worked example is still yours to change.
  await page.locator('#project-title').click();
  await expect(page.locator('#project-title .inline-rename')).toHaveCount(1);
  await page.locator('#project-title .inline-rename').press('Escape');
});
