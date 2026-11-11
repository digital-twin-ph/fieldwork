import {test,expect} from './fixtures.mjs';
import {createServer} from 'node:http';

/** A SLOW SOURCE IS STILL A WORKING ONE. The practitioner, 2026-11-05, reading the NYC package from Zenodo: "...did not
 *  finish answering within 2 minutes. Nothing was read." Zenodo had answered in half a second and was sending about
 *  5 KB/s. A fetch now shows how much has arrived, has no time limit, and stops when the practitioner says so. */
test.use({serviceWorkers:'block'});

// 680 KB, so progress printed in MB to one decimal moves within the first chunks. At 68 KB the first non-zero figure,
// 0.1 MB, came only after 73% had arrived, which is how CI's runner finished before Stop (2026-11-05).
const CSV='date,count\n'+Array.from({length:40000},(_,i)=>`2020-01-${String(i%28+1).padStart(2,'0')},${i%50}`).join('\n')+'\n';

/** A real server, sending in small pieces with a pause between them, as a throttled host does. */
const trickle=(bytes,{pieces,pauseMs})=>new Promise(resolve=>{
  const server=createServer((req,res)=>{
    res.writeHead(200,{'access-control-allow-origin':'*','content-type':'text/csv','content-length':String(bytes.length)});
    const size=Math.ceil(bytes.length/pieces);let at=0;
    const next=()=>{if(res.destroyed)return;if(at>=bytes.length){res.end();return;}
      res.write(bytes.subarray(at,at+size));at+=size;setTimeout(next,pauseMs);};
    next();
  });
  server.listen(0,'127.0.0.1',()=>resolve(server));
});

const open=async page=>{
  await page.goto('/');await page.evaluate(()=>localStorage.clear());
  await page.goto('/?example=blank');
  await page.locator('[data-view="workflow"]').click();
  await page.locator('#node-library [data-add="table_input"]').click();
  const id=await page.evaluate(()=>JSON.parse(localStorage.getItem('fieldwork-workflow-v1')).nodes.find(n=>n.type==='table_input').id);
  await page.locator(`.react-flow__node[data-id="${id}"]`).click();
  await page.locator('#open-table').click();
  await page.locator('#table-remote summary').click();
};

test('a slow download shows its progress and finishes',async({page})=>{
  const bytes=Buffer.from(CSV);
  const server=await trickle(bytes,{pieces:20,pauseMs:150});
  try{
    await open(page);
    // The URL check asks for https; the local server is reached through a route that hands the request on.
    await page.route('https://slow.example.test/days.csv',async route=>{
      const {port}=server.address();
      const response=await fetch(`http://127.0.0.1:${port}/`);
      await route.fulfill({response,body:Buffer.from(await response.arrayBuffer())});
    });
    await page.locator('#table-url').fill('https://slow.example.test/days.csv');
    await page.locator('#table-fetch').click();
    await expect(page.locator('#table-keys')).toBeVisible({timeout:30000});
  }finally{server.close();}
});

test('progress is counted as bytes arrive, and Stop stops it, saying how much had come',async({page})=>{
  const bytes=Buffer.from(CSV);
  await open(page);
  // Streamed in the page itself, so the progress line is watched while the download is under way.
  await page.evaluate(({text})=>{
    const real=window.fetch;
    window.fetch=async(input,init)=>{
      if(!String(input).startsWith('https://slow.example.test/'))return real(input,init);
      // HALF THE BODY, THEN NOTHING UNTIL STOP. At 40 chunks of 250 ms CI's Chromium sometimes finished the download
      // before Stop was pressed, and there was nothing left to stop (0.25.0, 2026-11-05). Holding the stream open after
      // half makes the order certain on any runner, and the progress still moves before it stalls.
      const data=new TextEncoder().encode(text),size=Math.ceil(data.length/40);let at=0;
      const stopped=new Promise(r=>init?.signal?.addEventListener('abort',r,{once:true}));
      const body=new ReadableStream({async pull(controller){
        if(init?.signal?.aborted){controller.error(new DOMException('stopped','AbortError'));return;}
        if(at>=data.length/2)await stopped;
        if(at>=data.length){controller.close();return;}
        await new Promise(r=>setTimeout(r,250));
        if(init?.signal?.aborted){controller.error(new DOMException('stopped','AbortError'));return;}
        controller.enqueue(data.subarray(at,at+size));at+=size;}});
      return new Response(body,{status:200,headers:{'content-length':String(data.length)}});
    };
  },{text:CSV});
  await page.locator('#table-url').fill('https://slow.example.test/days.csv');
  await page.locator('#table-fetch').click();
  const progress=page.locator('[data-fetch-progress]');
  await expect(progress).toContainText(new RegExp(`of ${(bytes.length/1e6).toFixed(1)} MB`));
  await expect.poll(async()=>Number((await progress.innerText()).match(/: ([\d.]+) of/)?.[1]??0),{timeout:15000}).toBeGreaterThan(0);
  await page.locator('[data-fetch-stop]').click();
  await expect(page.locator('#table-error, .table-error, [role="alert"]').filter({hasText:'was stopped after'}).first()).toBeVisible();
  await expect(page.locator('#table-keys')).toBeHidden();
});
