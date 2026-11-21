import {test as base,expect} from '@playwright/test';
import {appendFileSync} from 'node:fs';
import {answerFromRecordedCopies} from './recorded-copies.mjs';

/** EVERY BROWSER TEST, WITH NO TILE SERVER BEHIND IT. From 0.87.0 a map that states no basemap draws OpenStreetMap (the
 *  practitioner, 2026-11-10: "The default should be OSM"), so every test that draws a map would otherwise fetch real
 *  tiles: slow, dependent on someone else's server, and against OpenStreetMap's tile policy for automated use. Tile
 *  requests are answered here with a blank tile. A test that is about tiles registers its own answer after this one, and
 *  Playwright runs the most recently registered route first, so its answer wins.
 *
 *  Outside services with a recorded copy are answered from it the same way (recorded-copies.mjs). */
const BLANK=Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a4944415478'  +'9c6360000002000154a24f7e0000000049454e44ae426082','hex');
const TILES=/^https:\/\/([abc]\.)?tile\.(openstreetmap|opentopomap)\.org\//;
export const test=base.extend({
  page:async({page},use,testInfo)=>{
    // WHAT A TEST ASKS OF THE OUTSIDE WORLD (2026-11-20, gating audit), with FIELDWORK_NETLOG naming a file: registered
    // first, so it runs last, after every answer a test or a recorded copy gives; what reaches it goes to the network.
    if(process.env.FIELDWORK_NETLOG)await page.route(()=>true,route=>{const url=new URL(route.request().url());
      if(!/^(127\.0\.0\.1|localhost|\[::1\])$/.test(url.hostname)&&/^https?:$/.test(url.protocol))
        appendFileSync(process.env.FIELDWORK_NETLOG,JSON.stringify({test:`${testInfo.file.split('/').pop()} › ${testInfo.title}`,
          host:url.hostname,path:url.pathname.slice(0,160)})+'\n');
      return route.fallback();});
    await page.route(TILES,route=>route.fulfill({status:200,contentType:'image/png',body:BLANK}));
    await answerFromRecordedCopies(page);
    await use(page);
  },
});
export {expect};
