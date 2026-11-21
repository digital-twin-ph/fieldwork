// THE CENSUS TABLES TABULAR DATA OFFERS, pinned at a commit of digital-twin-ph/census-tables (the checkout beside this
// repository). Run after a push there: node scripts/pin-census-tables.mjs. Each file's size and sha256 are recorded, so
// a fetched table is checked against what was pinned. A new country arrives with a Fieldwork release, not by itself.
import {readFileSync,readdirSync,existsSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const repo=new URL('../../census-tables/',import.meta.url);
const commit=execFileSync('git',['-C',repo.pathname,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const ahead=execFileSync('git',['-C',repo.pathname,'status','-sb'],{encoding:'utf8'}).split('\n')[0];
if(/ahead|\?\?/.test(ahead))throw new Error(`census-tables has unpushed work (${ahead}); push before pinning.`);
const file=path=>{const bytes=readFileSync(new URL(path,repo));
  return {path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};};
const countries=readdirSync(repo).filter(d=>/^[A-Z]{3}$/.test(d)&&existsSync(new URL(`${d}/counts.csv`,repo))).sort().map(iso=>{
  const p=JSON.parse(readFileSync(new URL(`${iso}/provenance.json`,repo),'utf8'));
  // THE TABLE OFFERED, in the units today's maps use (2026-11-20). Where the printed units are not today's -- DR Congo's
  // 1984 regions -- the provenance names a table derived from them under `offered`, and that is what the tab offers;
  // the printed counts stay in the repository as its source, and the tab links to them.
  // A COUNTRY MAY OFFER SEVERAL, one per level (2026-11-21): Nigeria's states and its LGAs, each with geoBoundaries'
  // names, rather than every level in one table. The first is offered as before; the rest are listed under `more`.
  const stems=p.offered?.tables??[p.offered?.table??'counts'];
  const offer=stem=>{const csv=stem==='counts'?'counts.csv':`${stem}.csv`,dict=stem==='counts'?'columns.csv':`${stem}-columns.csv`;
    return {rows:readFileSync(new URL(`${iso}/${csv}`,repo),'utf8').trim().split('\n').length-1,counts:file(`${iso}/${csv}`),
      ...(existsSync(new URL(`${iso}/${dict}`,repo))?{columns:file(`${iso}/${dict}`)}:{}),
      ...(stem!=='counts'?{derived:{label:p[stem.replace(/-/g,'_')]?.label??stem,printed:`${iso}/counts.csv`,
        // The geoBoundaries level its units were matched on (2026-11-21), for a join to check a study area against.
        ...(p[stem.replace(/-/g,'_')]?.boundaries?.level?{level:p[stem.replace(/-/g,'_')].boundaries.level}:{})}}:{})};};
  const [first,...rest]=stems.map(offer);
  // THE LEVELS AS PRINTED, each with how many units it holds (2026-11-20), so a boundary level can be set beside them.
  const levels=[];{const lines=readFileSync(new URL(`${iso}/counts.csv`,repo),'utf8').trim().split('\n');
    const at=lines[0].split(',').indexOf('level');
    if(at>=0)for(const line of lines.slice(1)){const name=line.split(',')[at];const seen=levels.find(l=>l.level===name);
      if(seen)seen.units++;else levels.push({level:name,units:1});}}
  return {iso3:iso,country:p.country,census:p.census,referenceDate:p.reference_date,
    publisher:p.source?.publisher??'',licence:p.licence?.stated??'',levels,
    reviewed:{last:p.reviewed?.last??'',nextDue:p.reviewed?.next_due??''},
    ...first,...(rest.length?{more:rest}:{})};
});
const out={repository:'https://github.com/digital-twin-ph/census-tables',commit,
  raw:`https://raw.githubusercontent.com/digital-twin-ph/census-tables/${commit}/`,countries};
writeFileSync(new URL('../examples/census-tables/catalogue.json',import.meta.url),JSON.stringify(out,null,1)+'\n');
console.log(`Pinned census-tables ${commit.slice(0,7)}: ${countries.map(c=>c.iso3).join(', ')}`);
