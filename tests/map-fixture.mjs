import {expect} from './fixtures.mjs';
import {syntheticWorkflow} from './fixtures/synthetic-workflow.mjs';

/** A STATIC MAP WITH A BOUNDARY AND POINTS, AND NO BASEMAP YET, under the node id `access-map`.
 *
 *  Old Naledi's diagnostic-access map served here until the example retired on 2026-11-11
 *  (docs/audits/old-naledi-audit.md). These tests need a plotted map of a study area with points on it and no ground
 *  chosen, so a basemap is something the test does rather than something the example arrived with; the synthetic
 *  fixture's places and drawn area give exactly that. The node keeps Old Naledi's id so the tests read as they did. */
export function mapFixture(){
  const w=syntheticWorkflow();
  w.name='Map fixture';
  const map=w.nodes.find(n=>n.id==='map');
  map.id='access-map';map.params={...map.params,label:'Access map',presentation:'plot',basemap:'none'};
  for(const e of w.edges)if(e.to==='map')e.to='access-map';
  return w;
}

/** Opens the fixture on a blank canvas and runs it, as an example opened from its link would be. */
export async function openMapFixture(page,workflow=mapFixture()){
  await page.goto('/?example=blank');
  await page.locator('#workflow-file').setInputFiles({name:'map-fixture.json',mimeType:'application/json',
    buffer:Buffer.from(JSON.stringify(workflow))});
  await page.locator('#run-button').click();
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:60000});
}
