import {readFile, readdir, mkdir, copyFile, rm, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=fileURLToPath(new URL('../',import.meta.url));
const destination=path.resolve(root,'_site');
if(path.dirname(destination)!==path.resolve(root))throw new Error('Invalid staging directory');
const manifest=JSON.parse(await readFile(path.join(root,'build/asset-manifest.json'),'utf8'));
const files=new Set(['sw.js','LICENSE','build/asset-manifest.json']);
for(const asset of manifest.assets){
  const file=asset==='./'?'index.html':asset.replace(/^\.\//,'');
  if(file.includes('\\')||file.split('/').some(part=>part.startsWith('.')||!part)||path.isAbsolute(file))throw new Error('Invalid asset path');
  if(!/^(index\.html|styles\.css|study-area\.css|icon\.svg|manifest\.webmanifest|build\/.+|vendor\/.+|examples\/old-naledi\/(data\.js|provenance\.json))$/.test(file))throw new Error('Unexpected browser asset');
  files.add(file);
}
for(const directory of ['build','vendor']){
  for(const name of await readdir(path.join(root,directory)))if(/(?:LICENSE|LEGAL|NOTICE)/i.test(name))files.add(`${directory}/${name}`);
}
// Only this fixed, checked staging directory is replaced; never the repository.
await rm(destination,{recursive:true,force:true});
for(const file of files){
  const target=path.join(destination,file);
  await mkdir(path.dirname(target),{recursive:true});
  await copyFile(path.join(root,file),target);
}
await writeFile(path.join(destination,'.nojekyll'),'');
console.log(`Staged ${files.size} browser assets and license files in _site.`);
