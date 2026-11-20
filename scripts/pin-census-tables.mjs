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
  const rows=readFileSync(new URL(`${iso}/counts.csv`,repo),'utf8').trim().split('\n').length-1;
  return {iso3:iso,country:p.country,census:p.census,referenceDate:p.reference_date,
    publisher:p.source?.publisher??'',licence:p.licence?.stated??'',rows,
    reviewed:{last:p.reviewed?.last??'',nextDue:p.reviewed?.next_due??''},
    counts:file(`${iso}/counts.csv`),
    ...(existsSync(new URL(`${iso}/columns.csv`,repo))?{columns:file(`${iso}/columns.csv`)}:{})};
});
const out={repository:'https://github.com/digital-twin-ph/census-tables',commit,
  raw:`https://raw.githubusercontent.com/digital-twin-ph/census-tables/${commit}/`,countries};
writeFileSync(new URL('../examples/census-tables/catalogue.json',import.meta.url),JSON.stringify(out,null,1)+'\n');
console.log(`Pinned census-tables ${commit.slice(0,7)}: ${countries.map(c=>c.iso3).join(', ')}`);
