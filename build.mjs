import {build} from 'esbuild';
import {copyFile,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const entries=['evidence','evidence-storage','app','core','canvas','study-area','study-area-map','area-computation','area-measurement','spatial-predicates','spatial-coverage','coverage-ui','input-data','input-data-ui','attribute-schema','spatial-reference','point-layers','map-output','table-output','old-naledi','old-naledi-ui'];
const application=await build({entryPoints:entries.map(name=>'src/'+name+(name==='canvas'?'.tsx':'.ts')),bundle:true,splitting:true,format:'esm',outdir:'build',entryNames:'[name]',chunkNames:'chunks/[name]-[hash]',minify:true,sourcemap:true,metafile:true,loader:{'.png':'dataurl'},define:{'process.env.NODE_ENV':'"production"'},legalComments:'linked'});
const worker=await build({entryPoints:['src/reasoning-worker.ts'],bundle:true,format:'iife',outdir:'build',minify:true,sourcemap:true,metafile:true});
await copyFile('node_modules/leaflet/LICENSE','build/leaflet-LICENSE.txt');
for(const name of ['area','helpers','meta','boolean-point-in-polygon','invariant'])await copyFile(`node_modules/@turf/${name}/LICENSE`,`build/turf-${name}-LICENSE.txt`);
for(const name of ['point-in-polygon-hao','robust-predicates'])await copyFile(`node_modules/${name}/LICENSE`,`build/${name}-LICENSE.txt`);
for(const name of ['sql-wasm.js','sql-wasm.wasm'])await copyFile(`node_modules/sql.js/dist/${name}`,`vendor/${name}`);
await copyFile('node_modules/sql.js/LICENSE','vendor/sql.js-LICENSE.txt');

const staticAssets=['./','./index.html','./styles.css','./study-area.css','./icon.svg','./manifest.webmanifest','./examples/old-naledi/data.js','./examples/old-naledi/provenance.json','./vendor/eye-21.1.24.js','./vendor/sql-wasm.js','./vendor/sql-wasm.wasm'];
const generated=Object.keys({...application.metafile.outputs,...worker.metafile.outputs}).filter(path=>!path.endsWith('.map')).map(path=>'./'+path.replaceAll('\\','/'));
const assets=[...new Set([...staticAssets,...generated])].sort();
const hash=createHash('sha256');
for(const asset of assets){hash.update(asset);hash.update(await readFile(asset==='./'?'index.html':asset));}
hash.update(await readFile('src/sw.ts'));
const cache='fieldwork-ts-'+hash.digest('hex').slice(0,16);
await build({entryPoints:['src/sw.ts'],bundle:true,format:'iife',outfile:'sw.js',minify:true,define:{__PRECACHE_ASSETS__:JSON.stringify(assets),__CACHE_VERSION__:JSON.stringify(cache)}});
await writeFile('build/asset-manifest.json',JSON.stringify({cache,assets},null,2)+'\n');
console.log('Built TypeScript application, workers and offline asset manifest.');
