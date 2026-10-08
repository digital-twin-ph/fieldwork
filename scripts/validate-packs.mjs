// Pulls each curated widget pack at its pinned commit and checks the manifest and contents.
//
// Development tooling, never the application. The browser loads no pack: it compiles its own
// widgets, and admitting a pack is a review decision recorded in widgets/packs.json. This
// script needs network, so it is deliberately not part of `npm run check`, which must stay
// offline and deterministic. Pass --local <path> to check a working copy instead.
import {createHash} from 'node:crypto';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {Parser} from 'n3';

const HOST_NS='urn:fieldwork:';
const STAGES=['discovery','acquisition','extraction','import','application','presentation'];
const args=process.argv.slice(2);
const localRoot=args.includes('--local')?args[args.indexOf('--local')+1]:null;
const sha256=text=>createHash('sha256').update(text).digest('hex');

const catalog=JSON.parse(await readFile(new URL('../widgets/packs.json',import.meta.url),'utf8'));

/** The catalog is the trust root, so it is checked before anything it points at. A pinned
 *  digest is worthless if an entry naming it can be added without review. */
function checkCatalog(catalog){
  const problems=[];
  const g=catalog.governance;
  if(catalog.schema!=='fieldwork/pack-catalog/1')problems.push(`unknown catalog schema ${catalog.schema}`);
  if(!/^\d+\.\d+\.\d+$/.test(catalog.catalogVersion??''))problems.push('catalogVersion is not a semantic version');
  if(!g?.curatedOwners?.length)problems.push('no curated owners declared, so any repository could be admitted');
  if(!g?.requiredReviews?.length)problems.push('no required reviews declared');
  const ids=new Set(),namespaces=new Set();
  for(const pack of catalog.packs??[]){
    for(const field of ['id','name','version','repository','commit','namespace','kind','admission','stages','files'])
      if(pack[field]===undefined)problems.push(`${pack.id??'a pack'} is missing ${field}`);
    if(ids.has(pack.id))problems.push(`duplicate pack id ${pack.id}`);
    if(namespaces.has(pack.namespace))problems.push(`duplicate pack namespace ${pack.namespace}`);
    ids.add(pack.id);namespaces.add(pack.namespace);
    const owner=(()=>{try{return new URL(pack.repository).pathname.split('/').filter(Boolean)[0];}catch{return null;}})();
    if(!owner)problems.push(`${pack.id}: repository is not a URL`);
    else if(!g.curatedOwners.includes(owner))problems.push(`${pack.id}: owner "${owner}" is not a curated owner`);
    if(!g.admissionStates.includes(pack.admission?.status))problems.push(`${pack.id}: unknown admission state ${pack.admission?.status}`);
    for(const review of g.requiredReviews){
      const state=pack.admission?.reviews?.[review]?.state;
      if(!g.reviewStates.includes(state))problems.push(`${pack.id}: review "${review}" has no recognised state`);
      if(pack.admission?.status==='admitted'&&state!=='passed')problems.push(`${pack.id}: admitted while review "${review}" is ${state}`);
    }
    if(pack.admission?.status==='admitted'){
      if(!(pack.admission.verifiedAgainstHostVersions??[]).length)
        problems.push(`${pack.id}: admitted without naming a host version it was verified against`);
      if(!pack.admission.approvedBy)problems.push(`${pack.id}: admitted with no approver recorded`);
    }
    if(!Object.keys(pack.files??{}).length)problems.push(`${pack.id}: pins no file digests`);
    for(const [path,digest] of Object.entries(pack.files??{}))
      if(!/^[0-9a-f]{64}$/.test(digest))problems.push(`${pack.id}: ${path} has a malformed digest`);
  }
  return problems;
}

const catalogProblems=checkCatalog(catalog);
if(catalogProblems.length){
  console.log('CATALOG PROBLEMS — the trust root is checked first, and nothing downstream is trusted until it passes:');
  for(const problem of catalogProblems)console.log(`  PROBLEM: ${problem}`);
  console.log('');
}
const registry=JSON.parse(await readFile(new URL('../widgets/registry.json',import.meta.url),'utf8'));
const hostNodeTypes=new Set(registry.widgets.map(w=>w.nodeType));

/** A pinned commit, never a branch: a moving reference is not an approval. */
async function fetchFile(pack,path){
  if(localRoot)return readFile(`${localRoot}/${path}`,'utf8');
  const url=`https://raw.githubusercontent.com/${new URL(pack.repository).pathname.replace(/^\//,'')}/${pack.commit}/${path}`;
  const response=await fetch(url);
  if(!response.ok)throw new Error(`${path}: HTTP ${response.status} from ${url}`);
  return response.text();
}

async function checkPack(pack){
  const problems=[],notes=[];
  if(!/^[0-9a-f]{40}$/.test(pack.commit))problems.push('commit is not a full 40-character SHA; a tag or branch is not an approval');

  const contents=new Map();
  for(const [path,expected] of Object.entries(pack.files)){
    let text;
    try{text=await fetchFile(pack,path);}catch(error){problems.push(error.message);continue;}
    contents.set(path,text);
    const actual=sha256(text);
    if(actual!==expected)problems.push(`${path}: digest ${actual.slice(0,12)} does not match the pinned ${expected.slice(0,12)}`);
  }

  const manifestText=contents.get('pack.json');
  if(!manifestText)return {problems:[...problems,'pack.json could not be read'],notes};
  const manifest=JSON.parse(manifestText);

  if(manifest.id!==pack.id)problems.push(`manifest id ${manifest.id} disagrees with the catalog`);
  if(manifest.version!==pack.version)problems.push(`manifest version ${manifest.version} disagrees with the catalog`);
  if(manifest.namespace!==pack.namespace)problems.push('manifest namespace disagrees with the catalog');
  if(manifest.namespace?.startsWith(HOST_NS))problems.push('pack namespace is inside the host namespace');
  if(manifest.runtimeFetching!=='none')problems.push(`manifest declares runtimeFetching ${manifest.runtimeFetching}; only "none" is admissible`);
  for(const stage of STAGES)if(!manifest.stages?.[stage])problems.push(`stage not declared: ${stage}`);

  // The vocabulary and shapes must parse, mint no host term, and import nothing remotely.
  for(const path of [...(manifest.contents?.vocabulary??[]),...(manifest.contents?.shapes??[])]){
    const text=contents.get(path);
    if(!text){problems.push(`${path} is listed in the manifest but not pinned in the catalog`);continue;}
    let quads;
    try{quads=new Parser().parse(text);}catch(error){problems.push(`${path} does not parse: ${error.message}`);continue;}
    const minted=[...new Set(quads.filter(q=>q.subject.value.startsWith(HOST_NS)).map(q=>q.subject.value))];
    if(minted.length)problems.push(`${path} mints ${minted.length} host terms, first ${minted[0]}`);
    if(!quads.some(q=>q.subject.value.startsWith(manifest.namespace)))problems.push(`${path} declares nothing in the pack namespace`);
    if(text.includes('owl:imports'))problems.push(`${path} declares owl:imports, which would fetch at run time`);
  }

  // A pack must not shadow a base widget: two definitions of one node type would make a saved
  // workflow ambiguous about which produced a result.
  for(const path of manifest.contents?.widgets??[]){
    const text=contents.get(path);
    if(!text){problems.push(`${path} is listed in the manifest but not pinned`);continue;}
    const widget=JSON.parse(text);
    if(hostNodeTypes.has(widget.nodeType))problems.push(`${path} declares nodeType ${widget.nodeType}, which the host already defines`);
    if(widget.standardization!=='pack')problems.push(`${path} is not marked as pack standardization`);
    for(const mapping of widget.ontology?.mappings??[])
      if(mapping.iri.startsWith(HOST_NS))problems.push(`${path} maps the host IRI ${mapping.iri}`);
  }

  // Redistributed CC BY data carries obligatory citations.
  for(const source of manifest.dataSources??[]){
    if(!source.licence)problems.push(`data source ${source.name} states no licence`);
    if(source.licence==='CC-BY-4.0'&&(source.requiredCitations?.length??0)<3&&!source.note)
      problems.push(`data source ${source.name} is CC BY 4.0 with fewer than three citations and no note`);
  }

  const missing=(manifest.requires?.hostCapabilities??[]).filter(c=>c.status!=='present');
  for(const capability of missing)notes.push(`requires host capability "${capability.capability}" (${capability.status})`);
  if(missing.length&&pack.admission?.status==='admitted')
    problems.push('catalog admits a pack that declares a missing host capability');
  return {problems,notes,manifest};
}

const report={ran:new Date().toISOString(),catalogVersion:catalog.catalogVersion,catalogProblems,source:localRoot?`local:${localRoot}`:'pinned commits over the network',packs:[]};
let failed=catalogProblems.length>0;
for(const pack of catalog.packs){
  const {problems,notes}=await checkPack(pack);
  report.packs.push({id:pack.id,version:pack.version,commit:pack.commit,admission:pack.admission?.status,problems,notes});
  console.log(`${pack.id} ${pack.version} at ${pack.commit.slice(0,8)} — ${pack.admission?.status}`);
  for(const note of notes)console.log(`  note: ${note}`);
  for(const problem of problems)console.log(`  PROBLEM: ${problem}`);
  if(!problems.length)console.log(`  ${Object.keys(pack.files).length} files verified against their pinned digests`);
  failed||=problems.length>0;
}
await mkdir(new URL('../test-results/',import.meta.url),{recursive:true});
await writeFile(new URL('../test-results/pack-validation.json',import.meta.url),JSON.stringify(report,null,2)+'\n');
console.log(`\n${catalog.packs.length} pack(s) checked; report at test-results/pack-validation.json`);
process.exitCode=failed?1:0;
