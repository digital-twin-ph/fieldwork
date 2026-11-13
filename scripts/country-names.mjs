#!/usr/bin/env node
/** THE COUNTRY ALIAS TABLE: every country whose name differs between the sources Fieldwork reads countries from, keyed by
 *  its ISO 3166-1 alpha-3 code. The practitioner, 2026-11-13: *"Let's create an internal JSON mapping of countries that
 *  have different names per source like South Korea and let's save the mappings in our FW ontology. We can look up the
 *  mapping as an alias table."*
 *
 *  Writes ontology/country-names.json (the table the application reads) and ontology/country-names.ttl (the same
 *  mapping in the ontology), both from the bundled sources. Without --write it checks that both are current and exits 1
 *  if either has drifted, which is how `validate:country-names` uses it.
 *
 *  Every country is listed, with both codes; `differ` marks the ones whose sources disagree. */
import {readFileSync,writeFileSync} from 'node:fs';

const read=path=>JSON.parse(readFileSync(new URL(`../${path}`,import.meta.url),'utf8'));
const geoboundaries=read('examples/geoboundaries/countries.json');
const naturalEarth=read('assets/natural-earth-110m-countries.json');
const unM49=read('examples/country-codes/codes.json');

const SOURCES={
  geoboundaries:{title:'geoBoundaries gbOpen, ADM0',url:'https://www.geoboundaries.org/api/current/gbOpen/ALL/ADM0/',
    file:'examples/geoboundaries/countries.json',fetched:geoboundaries.fetched,
    usedFor:'the study area\'s boundary picker; the name a downloaded boundary carries'},
  'natural-earth':{title:'Natural Earth 1:110m Admin 0 countries',url:naturalEarth.source,
    file:'assets/natural-earth-110m-countries.json',version:naturalEarth.version,licence:naturalEarth.licence,
    usedFor:'the study area\'s countries, found from where its shape falls'},
  'un-m49':{title:'ISO 3166-1 codes and UN M49 official English short names, as packaged by datasets/country-codes',url:unM49.source,
    file:'examples/country-codes/codes.json',fetched:unM49.fetched,licence:unM49.licence,
    usedFor:'each country\'s two-letter code, and the UN\'s name for it'},
};

const byIso=new Map(),iso2=new Map(unM49.countries.map(c=>[c.iso3,c.iso2]));
for(const c of geoboundaries.countries)byIso.set(c.iso,{geoboundaries:c.name});
for(const c of naturalEarth.countries)if(/^[A-Z]{3}$/.test(c.iso))byIso.set(c.iso,{...byIso.get(c.iso),'natural-earth':c.name});
for(const c of unM49.countries)if(c.name)byIso.set(c.iso3,{...byIso.get(c.iso3),'un-m49':c.name});
// EVERY COUNTRY, with both codes and each source's name (the practitioner, the same day: "We can then also map their ISO2
// and ISO3 names as well"). `differ` marks the ones whose sources disagree, which is where an alias is needed.
const countries=[...byIso].sort(([a],[b])=>a.localeCompare(b)).map(([iso3,names])=>({iso3,...(iso2.get(iso3)?{iso2:iso2.get(iso3)}:{}),
  names,...(new Set(Object.values(names)).size>1?{differ:true}:{})}));

const table={schema:'fieldwork/country-names/1',
  note:'Every country Fieldwork\'s sources name, by its ISO 3166-1 alpha-3 code, with its alpha-2 code and each source\'s name for it; differ marks those whose sources disagree. Look up any name or either code here and find the country. Written by scripts/country-names.mjs from the bundled sources; the same mapping is in ontology/country-names.ttl. Asked for by the practitioner, 2026-11-13, after "South Korea" found no country.',
  sources:SOURCES,countries};

const literal=s=>JSON.stringify(s);
const ttl=`@prefix fw: <urn:fieldwork:>.
@prefix owl: <http://www.w3.org/2002/07/owl#>.
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#>.
@prefix dcterms: <http://purl.org/dc/terms/>.
@prefix dcat: <http://www.w3.org/ns/dcat#>.
@prefix skosxl: <http://www.w3.org/2008/05/skos-xl#>.
@prefix skos: <http://www.w3.org/2004/02/skos/core#>.

# WRITTEN BY scripts/country-names.mjs from ontology/country-names.json's sources. Do not edit by hand.

<urn:fieldwork:ontology:country-names> a owl:Ontology;
  rdfs:label "Country names by source";
  rdfs:comment ${literal('Every country Fieldwork\'s sources name. Each is a fw:Jurisdiction identified by its ISO 3166-1 alpha-3 code, with its alpha-2 and alpha-3 codes as typed SKOS notations and one SKOS-XL label per source saying which source gives that name. No source\'s name is preferred: the code is the key, and every name is an alias of it.')}.

<urn:fieldwork:scheme:iso-3166-1-alpha-3> rdfs:label "ISO 3166-1 alpha-3".
<urn:fieldwork:scheme:iso-3166-1-alpha-2> rdfs:label "ISO 3166-1 alpha-2".
${Object.entries(SOURCES).map(([id,s])=>`<urn:fieldwork:source:${id}> a dcat:Dataset;
  dcterms:title ${literal(s.title)};
  dcat:landingPage <${s.url}>${s.licence?`;\n  dcterms:license ${literal(s.licence)}`:''}.`).join('\n')}

${countries.map(c=>`<urn:fieldwork:country:${c.iso3}> a fw:Jurisdiction;
  dcterms:identifier ${literal(c.iso3)};
  fw:identifierScheme <urn:fieldwork:scheme:iso-3166-1-alpha-3>;
  skos:notation ${literal(c.iso3)}^^<urn:fieldwork:scheme:iso-3166-1-alpha-3>${c.iso2?`, ${literal(c.iso2)}^^<urn:fieldwork:scheme:iso-3166-1-alpha-2>`:''};
  skosxl:altLabel ${Object.entries(c.names).map(([source,name])=>`[ a skosxl:Label; skosxl:literalForm ${literal(name)}@en; dcterms:source <urn:fieldwork:source:${source}> ]`).join(',\n    ')}.`).join('\n')}
`;

const json=JSON.stringify(table,null,1)+'\n';
const files=[['ontology/country-names.json',json],['ontology/country-names.ttl',ttl]];
if(process.argv.includes('--write')){
  for(const [path,text] of files)writeFileSync(new URL(`../${path}`,import.meta.url),text);
  console.log(`Wrote ontology/country-names.json and .ttl: ${countries.length} countries from ${Object.keys(SOURCES).length} sources, ${countries.filter(c=>c.differ).length} named differently.`);
}else{
  const stale=files.filter(([path,text])=>{try{return readFileSync(new URL(`../${path}`,import.meta.url),'utf8')!==text;}catch{return true;}});
  if(stale.length){console.error(`Country names have drifted from their sources: ${stale.map(([p])=>p).join(', ')}. Run node scripts/country-names.mjs --write.`);process.exit(1);}
  console.log(`Country names: ${countries.length} countries, ${countries.filter(c=>c.differ).length} named differently, current with their sources.`);
}
