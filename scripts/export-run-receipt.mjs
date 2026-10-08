// Exports a real run receipt for the Validation Lab's competency-question check.
// Data crosses one way only: Fieldwork runs the workflow and exports; the lab reads.
// Usage: node scripts/export-run-receipt.mjs <example> <outputDir>
import {createHash} from 'node:crypto';
import {readFile,writeFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import {chromium} from 'playwright';

const [example='old-naledi',outputDir]=process.argv.slice(2);
if(!outputDir)throw new Error('Usage: node scripts/export-run-receipt.mjs <example> <outputDir>');
const port=process.env.FIELDWORK_TEST_PORT||'4178';
const server=spawn('node',['server.mjs'],{env:{...process.env,PORT:port},stdio:'ignore'});
const stop=()=>server.kill();
try{
  await new Promise(resolve=>setTimeout(resolve,1500));
  const browser=await chromium.launch();
  const page=await (await browser.newContext({acceptDownloads:true})).newPage();
  await page.goto(`http://127.0.0.1:${port}/?example=${example}`,{waitUntil:'domcontentloaded'});
  await page.locator('#workflow-state').filter({hasText:'Run complete'}).waitFor({timeout:60000});
  // The receipt button lives in the N3 and evidence view, which is hidden until selected.
  await page.locator('[data-view="rules"]').click();
  await page.locator('#download-evidence').waitFor({state:'visible',timeout:15000});
  const pending=page.waitForEvent('download',{timeout:60000});
  await page.locator('#download-evidence').click();
  const file=await pending;
  const json=await readFile(await file.path(),'utf8');
  const run=JSON.parse(json);
  const name=`run-receipt-${example}.json`;
  await writeFile(`${outputDir}/${name}`,JSON.stringify(run,null,2)+'\n');
  const bytes=await readFile(`${outputDir}/${name}`);
  await writeFile(`${outputDir}/${name}.sha256`,`${createHash('sha256').update(bytes).digest('hex')}  ${name}\n`);
  console.log(`Wrote ${name}: schema ${run.schema}, ${run.receipts?.length??0} receipts, ${run.trace?.length??0} executed nodes, run ${run.runId}`);
  await browser.close();
}finally{stop();}
