// THE BOUNDARIES THE STUDY AREA PICKER READS FIRST, pinned at a commit of digital-twin-ph/boundaries (the checkout beside
// this repository). Run after a push there: node scripts/pin-boundaries.mjs. Each level's description and parts are
// recorded with their size and sha256, so what the picker reads is checked against what was pinned; a level not held
// here is still asked of geoBoundaries.
import {readFileSync,readdirSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const repo=new URL('../../boundaries/',import.meta.url);
const commit=execFileSync('git',['-C',repo.pathname,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const ahead=execFileSync('git',['-C',repo.pathname,'status','-sb'],{encoding:'utf8'}).split('\n')[0];
if(/ahead/.test(ahead))throw new Error(`boundaries has unpushed work (${ahead}); push before pinning.`);
const file=path=>{const bytes=readFileSync(new URL(path,repo));
  return {path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};};
const levels=[];
for(const iso of readdirSync(repo).filter(d=>/^[A-Z]{3}$/.test(d)).sort())
  for(const adm of readdirSync(new URL(`${iso}/`,repo)).filter(d=>/^ADM\d$/.test(d)).sort()){
    const base=`${iso}/${adm}/`;
    if(!existsSync(new URL(`${base}level.json`,repo)))continue;
    const p=JSON.parse(readFileSync(new URL(`${base}provenance.json`,repo),'utf8'));
    const parts=readdirSync(new URL(`${base}parts/`,repo)).filter(f=>f.endsWith('.geojson')).sort().map(f=>file(`${base}parts/${f}`));
    levels.push({iso,adm,boundaryID:p.boundaryID??p.boundary_id??'',level:file(`${base}level.json`),parts});
  }
const out={repository:'https://github.com/digital-twin-ph/boundaries',commit,
  raw:`https://raw.githubusercontent.com/digital-twin-ph/boundaries/${commit}/`,levels};
mkdirSync(new URL('../examples/boundaries/',import.meta.url),{recursive:true});
writeFileSync(new URL('../examples/boundaries/catalogue.json',import.meta.url),JSON.stringify(out,null,1)+'\n');
console.log(`Pinned boundaries ${commit.slice(0,7)}: ${levels.map(l=>`${l.iso} ${l.adm}`).join(', ')}`);
