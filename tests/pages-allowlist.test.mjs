import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PUBLISHABLE} from '../scripts/pages-allowlist.mjs';
import {EXAMPLE_TEMPLATES} from '../build/example-templates.js';

// A FILE A WORKED EXAMPLE OFFERS MUST BE PUBLISHED. Hagelloch's 1824 sheet passed every test, served from the repository,
// and answered 404 on Pages, because Pages publishes only what the asset manifest lists and the allowlist admits.
test('every image a worked example offers is in the published manifest and admitted by the allowlist',()=>{
  const manifest=JSON.parse(readFileSync(new URL('../build/asset-manifest.json',import.meta.url),'utf8'));
  const published=new Set([...manifest.assets,...(manifest.online??[])]);
  const offered=Object.values(EXAMPLE_TEMPLATES).flatMap(make=>make().nodes.map(n=>n.params?.offered?.url).filter(Boolean));
  assert.ok(offered.length>=1,'at least the Hagelloch sheet');
  for(const url of offered){
    assert.ok(published.has(url),`${url} is not in build/asset-manifest.json, so Pages will not serve it`);
    assert.match(url.replace(/^\.\//,''),PUBLISHABLE,`${url} is not admitted by scripts/pages-allowlist.mjs`);
  }
});
