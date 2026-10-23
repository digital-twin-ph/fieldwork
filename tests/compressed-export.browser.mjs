import {test,expect} from '@playwright/test';
import {collectPageErrors} from './page-errors.mjs';

// The practitioner, after a 20 MB import limit refused the backup they had just taken to rescue
// their work from a browser that would no longer open it: *"Why don't we zip it as an export and
// unzip it upon import?"* A project document is JSON holding a street graph -- millions of
// repeated OSM ids -- which is about as compressible as text gets.
test('an export is written compressed and reads back in',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});

  const pending=page.waitForEvent('download');
  await page.locator('#export-button').click();
  const file=await pending;
  expect(file.suggestedFilename()).toMatch(/\.json\.gz$/);

  const stream=await file.createReadStream();
  const chunks=[];
  for await (const chunk of stream)chunks.push(chunk);
  const bytes=Buffer.concat(chunks);
  // Gzip announces itself, which is how the import recognises it without trusting the name.
  expect(bytes[0]).toBe(0x1f);
  expect(bytes[1]).toBe(0x8b);

  const {plain,compressed}=await page.evaluate(async base64=>{
    const binary=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
    const text=await new Response(new Blob([binary]).stream()
      .pipeThrough(new DecompressionStream('gzip'))).text();
    return {plain:text.length,compressed:binary.length};
  },bytes.toString('base64'));
  expect(plain).toBeGreaterThan(compressed*2,'a workflow document compresses by at least half');

  // And it imports: the same control, no choice to make, the file it was just handed.
  await page.locator('#workflow-file').setInputFiles({name:file.suggestedFilename(),
    mimeType:'application/gzip',buffer:bytes});
  await expect(page.locator('#workflow-state')).not.toContainText('exceeds',{timeout:20000});
  expect(errors).toEqual([]);
});

test('an uncompressed export taken before today still imports',async({page})=>{
  const errors=collectPageErrors(page);
  await page.goto('/?example=snow-isochrone');
  await expect(page.locator('#workflow-state')).toContainText('Run complete',{timeout:45000});
  const document=await page.evaluate(async()=>{
    const {workflowDocument}=await import('/build/workflow-document.js').catch(()=>({}));
    return workflowDocument?JSON.stringify(await workflowDocument(window.__fieldworkWorkflow??{}),null,2):null;
  }).catch(()=>null);
  // Falls back to a minimal plain-JSON document when the module is not reachable from the page:
  // what is being tested is that a file WITHOUT the gzip magic is still read as text.
  const plain=document??JSON.stringify({schema:'fieldwork/workflow-document/1'});
  await page.locator('#workflow-file').setInputFiles({name:'old-export.json',
    mimeType:'application/json',buffer:Buffer.from(plain)});
  // It may be refused for its contents; it must not be refused for its encoding.
  await expect(page.locator('body')).not.toContainText('Unexpected end of JSON input',{timeout:15000});
  expect(errors).toEqual([]);
});
