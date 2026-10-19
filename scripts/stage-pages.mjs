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
  if(!/^(index\.html|styles\.css|study-area\.css|icon\.svg|manifest\.webmanifest|build\/.+|vendor\/.+|examples\/old-naledi\/(data\.js|provenance\.json)|examples\/john-snow\/(NOTICE\.txt|upstream-LICENSE|provenance\.json|network\.json|soho\.graphml|pumps\.csv|cholera_deaths\.csv))$/.test(file))throw new Error('Unexpected browser asset');
  files.add(file);
}
for(const directory of ['build','vendor']){
  for(const entry of await readdir(path.join(root,directory),{withFileTypes:true}))if(entry.isFile()&&/(?:LICENSE|LEGAL|NOTICE)/i.test(entry.name))files.add(`${directory}/${entry.name}`);
}
// Only this fixed, checked staging directory is replaced; never the repository.
await rm(destination,{recursive:true,force:true});
for(const file of files){
  const target=path.join(destination,file);
  await mkdir(path.dirname(target),{recursive:true});
  await copyFile(path.join(root,file),target);
}
await writeFile(path.join(destination,'.nojekyll'),'');

// WHAT IS SERVED, stated by the site itself.
//
// Publishing and verification run in parallel now, so "is my fix live yet?" is a question with a
// real answer that changes minute to minute -- and the practitioner was asking it about a site
// that had been one or two commits behind for most of a day. Answering it should not require
// reading a workflow log, diffing an asset manifest, or asking someone who can.
//
// Served at /build-info.json, and deliberately plain: a commit, a subject line and a time.
const {execSync}=await import('node:child_process');
const git=(args,fallback='')=>{try{return execSync(`git ${args}`,{cwd:root,encoding:'utf8'}).trim();}catch{return fallback;}};
const commit=process.env.GITHUB_SHA||git('rev-parse HEAD','unknown');
const {version}=JSON.parse(await readFile(path.join(root,'package.json'),'utf8'));
await writeFile(path.join(destination,'build-info.json'),JSON.stringify({
  // A version is what a practitioner can hold in their head; a seven-character hash is not.
  // The practitioner, 2026-10-19: "Be sure to update version so I know what I am dealing with."
  version,
  commit,
  short:commit.slice(0,7),
  subject:git('log -1 --format=%s','unknown'),
  committedAt:git('log -1 --format=%cI',''),
  stagedAt:new Date().toISOString(),
  // Verification runs beside the deploy rather than before it, so a freshly published build has
  // not necessarily passed the gate yet. Saying so here keeps the stamp from implying more than
  // it knows.
  note:'Published without waiting for the full gate; see the verify job for that run\u2019s result.',
},null,1)+'\n');
console.log(`Staged ${files.size} browser assets and license files in _site, at ${commit.slice(0,7)}.`);
