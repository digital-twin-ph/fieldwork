import {test,expect} from '@playwright/test';

// The practitioner, 2026-10-21, reading an output table of health facilities whose `tagSource`
// and `speciality` columns said "Not supplied": *"was the data missing or field empty value and we
// supplied that value as a replacement? The data quality implications are enormous even if the
// table were an output. It's also a provenance issue."* And then: *"OSM data is known for many
// fields with missing values. So for #3 we should also run missingness checks."*
test('an absent cell is absent, and an output table gets the same check an input gets',async({page})=>{
  const records=[
    {id:'a',name:'Centre de Santé Ndosho',kind:'clinic',tagSource:'MSFsurvey'},
    {id:'b',name:'CH Mukongo',kind:'hospital'},                    // tagSource: not there at all
    {id:'c',name:'Clin le Rocher',kind:'clinic',tagSource:''},     // there, and empty
  ];
  const workflow={schema:'fieldwork/workflow/1',id:'w',label:'Facilities',nodes:[
    {id:'records',type:'point_input',x:0,y:0,params:{label:'Facilities',
      data:{type:'FeatureCollection',features:records.map((r,i)=>({type:'Feature',id:r.id,
        properties:{...r},geometry:{type:'Point',coordinates:[29.2+i*0.01,-1.65]}}))}}},
    {id:'table',type:'table_output',x:300,y:0,params:{label:'Facility table'}},
  ],edges:[{id:'e1',from:'records',to:'table',port:'points'}]};

  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'q.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toHaveText('✓ Run complete',{timeout:45000});
  await page.locator('[data-view="results"]').click();

  // NOTHING IS SUBSTITUTED. The phrase is gone, and the cells say absent rather than saying a word
  // a reader cannot tell from data.
  await expect(page.locator('#result-rows')).not.toContainText('Not supplied');
  await expect(page.locator('#result-rows td[data-absent]')).toHaveCount(2);
  // And the two kinds are kept apart, because they call for different work.
  await expect(page.locator('#result-rows td[data-absent="missing"]')).toHaveCount(1);
  await expect(page.locator('#result-rows td[data-absent="empty"]')).toHaveCount(1);
  // It is not a value: searching for it finds nothing.
  await page.locator('#result-search').fill('Not supplied');
  await expect(page.locator('#result-rows [data-place]')).toHaveCount(0);
  await page.locator('#result-search').fill('');

  // THE CHECK AN INPUT GETS, over the table a practitioner reads.
  await page.locator('#result-quality').click();
  const dialog=page.locator('#data-quality');
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('2 of 3');
  await expect(dialog).toContainText('1 does not have the field at all');
  await expect(dialog).toContainText('1 has it and left it empty');
  // A result is not repaired: you repair the input it came from.
  await expect(dialog.locator('[data-repair]')).toHaveCount(0);

  // MISSINGNESS, which is the reason this was asked for: OSM is known for fields that are mostly
  // absent, and whether two columns are absent on the SAME records is a different question from
  // how many of each are absent.
  await dialog.locator('[data-quality-tab="shapes"]').click();
  await expect(dialog).toContainText('tagSource');
});
