// THE TIDE GAUGES TABULAR DATA OFFERS, pinned at a commit of digital-twin-ph/coastal-sea-level (the checkout beside this
// repository). Run after a push there: node scripts/pin-tide-gauges.mjs. Each country's stations table and the shared
// data dictionary are recorded with their size and sha256, so a fetched table is checked against what was pinned; each
// gauge's position is kept for the tab's overview map, which draws without fetching anything.
import {readFileSync,readdirSync,existsSync,writeFileSync,mkdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const repo=new URL('../../coastal-sea-level/',import.meta.url);
const commit=execFileSync('git',['-C',repo.pathname,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const ahead=execFileSync('git',['-C',repo.pathname,'status','-sb'],{encoding:'utf8'}).split('\n')[0];
if(/ahead/.test(ahead))throw new Error(`coastal-sea-level has unpushed work (${ahead}); push before pinning.`);
const file=path=>{const bytes=readFileSync(new URL(path,repo));
  return {path,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};};
/** A CSV row, quoted fields allowed. */
const cells=line=>{const out=[];let cur='',q=false;
  for(const ch of line){if(ch==='"'){q=!q;continue;}if(ch===','&&!q){out.push(cur);cur='';continue;}cur+=ch;}
  out.push(cur);return out;};
const countries=readdirSync(repo).filter(d=>/^[A-Z]{3}$/.test(d)&&existsSync(new URL(`${d}/stations.csv`,repo))).sort().map(iso=>{
  const p=JSON.parse(readFileSync(new URL(`${iso}/provenance.json`,repo),'utf8'));
  const [head,...lines]=readFileSync(new URL(`${iso}/stations.csv`,repo),'utf8').trim().split('\n');
  const h=cells(head),at=k=>h.indexOf(k);
  const rows=lines.map(cells);
  const num=v=>v===''?null:Number(v);
  return {iso3:iso,country:p.country,stations:rows.length,
    withTrend:rows.filter(r=>r[at('psmsl_trend_mm_per_yr')]!=='').length,
    rlr:rows.filter(r=>r[at('psmsl_list')]==='rlr').length,
    lastYear:Math.max(0,...rows.map(r=>num(r[at('last_year')])??0)),
    reviewed:{last:p.reviewed?.last??'',nextDue:p.reviewed?.next_due??''},
    table:file(`${iso}/stations.csv`),
    // [longitude, latitude, name, whether PSMSL computes a trend], for the overview map.
    gauges:rows.map(r=>[num(r[at('longitude')]),num(r[at('latitude')]),r[at('name')],r[at('psmsl_trend_mm_per_yr')]!=='']).filter(g=>g[0]!==null&&g[1]!==null)};
});
const out={repository:'https://github.com/digital-twin-ph/coastal-sea-level',commit,
  raw:`https://raw.githubusercontent.com/digital-twin-ph/coastal-sea-level/${commit}/`,columns:file('columns.csv'),countries};
mkdirSync(new URL('../examples/coastal-sea-level/',import.meta.url),{recursive:true});
writeFileSync(new URL('../examples/coastal-sea-level/catalogue.json',import.meta.url),JSON.stringify(out,null,1)+'\n');
console.log(`Pinned coastal-sea-level ${commit.slice(0,7)}: ${countries.length} countries, ${countries.reduce((n,c)=>n+c.stations,0)} gauges`);
