/** WHAT EVERY INPUT CARRIES ABOUT WHERE IT CAME FROM AND WHAT IT MAY BE USED FOR.
 *
 *  The practitioner, 2026-10-27: *"All inputs to the workflow should carry their provenance and
 *  license data with them"*, and then: *"that's something we need to standardize now."*
 *
 *  WHAT IT REPLACES. Measured the same day across every shipped example: four shapes and three
 *  gaps for one question. `study_area.boundary` carries source, licence, licenceSource and a
 *  retrieval date and is the one that was thought through; `point_input.sourceInfo` carries a
 *  format and a URL; `table_input.source` carries a file digest and no licence at all;
 *  `find_health_facilities` carries a provider name and a date; `raster_input` and
 *  `network_input` carry nothing. This generalises the first of those rather than inventing a
 *  fifth beside them.
 *
 *  WHY IT IS NOT COSMETIC. Until this existed, `map-communication.ts` decided whether a figure
 *  credited OpenStreetMap by testing whether its method description contained the word
 *  "Dijkstra". An ODbL attribution obligation was discharged by substring-matching a sentence
 *  written for a human to read, so rewording it to "shortest path" would have removed the credit
 *  from a figure that went on redistributing OSM-derived geometry. A licence breach by copy-edit.
 *  An obligation has to travel with the data that incurs it.
 *
 *  THE THREE LICENCE STATES ARE DIFFERENT CLAIMS and the vocabulary keeps them apart, because a
 *  blank field has been made to mean all three at different times:
 *
 *    `unstated`     nobody has said. The honest default, and never a licence to redistribute.
 *    `none-applies` a positive claim that no terms attach -- a pre-1900 publication, a work in
 *                   the public domain. Somebody decided this; it is not an absence.
 *    an SPDX id     terms attach and are named, e.g. ODbL-1.0, CC-BY-4.0, BSD-2-Clause.
 */

/** What a figure must do when it redistributes this data. Derived from the licence where the
 *  licence is one this project has met, and stated by the author where it is not. */
export interface LicenceObligation {
  /** The exact text a figure, export or publication has to carry. */
  attribution?:string;
  /** Whether the licence carries the obligation onward to derived work. */
  shareAlike?:boolean;
}

export interface InputProvenance {
  /** What the data IS, in the author's words: "the 32 sub-districts of Snow's Table VIII". */
  what?:string;
  /** The authority that made it, or a citation. Not a filename. */
  source?:string;
  /** Where it was obtained, if it was obtained from somewhere addressable. */
  url?:string;
  /** When the work was PUBLISHED. Not when it was retrieved, and not what it represents.
   *
   *  A third date, and it is the one an ordering by literature needs. The practitioner,
   *  2026-10-27: citations on their own "can be ordered by publication date. Useful for
   *  literature review when one studies the evolution of how research questions are answered and
   *  the sequence."
   *
   *  Koch and Denike is the case that forces it. Published 2006, representing 1855, retrieved
   *  2026: a modern contribution to a nineteenth-century question. Ordering by `represents`
   *  would file it beside Snow and hide the two centuries between them, which is precisely the
   *  evolution a review is looking at. */
  published?:string;
  /** The edition actually read, where that is not the publication. Snow's second edition is
   *  1855 and the Project Gutenberg transcription of it was released 2024-02-07; a citation says
   *  both, and an ordering by literature uses the first.
   *
   *  `statement` is the edition as a style prints it -- "2nd", "rev.", "3rd rev." -- and lives
   *  here rather than on `citation` so that everything about the edition is in one place and the
   *  word `edition` means one thing in this file. */
  edition?:{statement?:string;published?:string;publisher?:string};
  /** When it was obtained, as an ISO date. A boundary retrieved in 2026 may represent 1855. */
  retrieved?:string;
  /** The year the data REPRESENTS, which is not the year it was published or retrieved. */
  represents?:string;
  /** The work this came from, where its origin IS a work. Absent where the origin is an
   *  authority rather than a publication -- an Overpass query, a facility register, a sensor.
   *  See `Citation` for why a sentence in `source` could not be reformatted into a style. */
  citation?:Citation;
  /** An SPDX identifier, `none-applies`, or `unstated`. Never blank. */
  licence:string;
  /** Where the licence was read, so a reader can check the claim rather than trust it. */
  licenceSource?:string;
  obligation?:LicenceObligation;
  note?:string;
}

export const UNSTATED='unstated';
export const NONE_APPLIES='none-applies';

/** ONE AUTHOR, SPLIT WHERE A STYLE HAS TO SPLIT IT.
 *
 *  Vancouver prints `Snow J`, APA prints `Snow, J.`, Chicago prints `Snow, John`. All three need
 *  the family name apart from the given name, so a single display string cannot serve them: this
 *  is the field a free-text `source` sentence cannot be parsed back into.
 *
 *  A corporate author has no given name and must not be initialised -- "Center for Spatial Data
 *  Science" is not "Science, C.D.S." -- so it says so rather than being detected. */
export interface CitationAuthor {family:string; given?:string; corporate?:boolean}

/** What kind of work, because each style punctuates the kinds differently and two of them add a
 *  bracketed designator for the non-print ones. */
export type CitationType='book'|'chapter'|'article'|'map'|'dataset'|'report'|'webpage';

/** THE WORK AN INPUT CAME FROM, IN FIELDS A STYLE CAN RENDER.
 *
 *  The practitioner, 2026-10-27, having seen a style picker that could not work: *"While it is
 *  early, let us make provenance structured data then."*
 *
 *  WHAT IT REPLACES, AND WHY A SENTENCE WAS NOT ENOUGH. `source` holds one sentence an author
 *  wrote -- "John Snow, On the Mode of Communication of Cholera, second edition, London: John
 *  Churchill, 1855." -- which reads correctly and reformats into nothing. Vancouver, APA and
 *  Chicago each reorder the author, move the date, change the edition abbreviation and
 *  repunctuate throughout; none of that is recoverable from the sentence without parsing English,
 *  and a parse that is right for Snow is wrong for the next input. Offering a style picker over
 *  free text would produce citations that look like a style and are not one -- professional-
 *  looking and wrong, which is the failure this project names.
 *
 *  `source` is NOT withdrawn. An input's origin is often an authority rather than a publication:
 *  an Overpass query, a ministry's facility register, a sensor. Those have a source and no
 *  citation, and forcing them into bibliographic fields would be the mirror of the same error.
 *  A citation is for a work; `source` is for everything that is not one.
 *
 *  DATES AND URL ARE NOT REPEATED HERE. `published`, `edition`, `retrieved` and `url` already sit
 *  on the provenance record and mean the same thing for a citation as for anything else. A second
 *  copy inside this block would be a second answer to the same question. */
export interface Citation {
  type:CitationType;
  /** In the order printed. Styles reorder the first author only; they never resort the list. */
  authors:CitationAuthor[];
  /** As printed. NOT case-folded: Vancouver prefers sentence case, and deriving it would
   *  lowercase London. A style that wants sentence case needs the author to store it that way. */
  title:string;
  /** The work this one sits inside: a journal for an article, a volume for a map plate. */
  container?:string;
  place?:string;
  publisher?:string;
  volume?:string; issue?:string; pages?:string;
  /** The DOI, stored bare: `10.1016/j.healthplace.2006.01.001`. A pasted `https://doi.org/...`
   *  or `doi:...` is accepted and normalised, because that is the form a reader copies.
   *
   *  PREFERRED OVER A URL WHEREVER ONE EXISTS. The practitioner, 2026-10-27: *"We should also
   *  include DOIs in the citation as much as possible."* A DOI resolves after a publisher moves
   *  its site, which is the one thing a URL in a reference list does not do. `citationOmissions`
   *  says where one is expected and missing. */
  doi?:string;
}

/** A DOI is `10.`, a registrant, a slash and a suffix. Accepts the three forms a reader copies and
 *  returns the bare one, or undefined where it is not a DOI at all.
 *
 *  A MALFORMED DOI IS REFUSED RATHER THAN PRINTED, by `citationGaps` below. A broken DOI in a
 *  reference list is worse than none: it looks resolvable, a reader clicks it, and nothing says
 *  which of the two of you was wrong. */
export function normaliseDoi(raw:string|undefined):string|undefined{
  if(!raw)return undefined;
  const bare=raw.trim()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//i,'')
    .replace(/^doi:\s*/i,'');
  return /^10\.\d{4,9}\/\S+$/.test(bare)?bare:undefined;
}

/** The types a DOI is assigned to. A map plate and a book predate the register or sit outside it;
 *  an article, chapter, dataset or report published since the DOI system began normally has one. */
const DOI_EXPECTED=new Set<CitationType>(['article','chapter','dataset','report']);
/** DOIs were first assigned in 2000, so a 1998 article having none is a fact rather than a gap. */
const DOI_ERA=2000;

/** The three styles this project renders, each with where its rules were read. A style absent
 *  here is one nobody has encoded, which is different from one that does not exist. */
export const CITATION_STYLES={
  'vancouver':{label:'Vancouver',
    authority:'NLM, Citing Medicine, 2nd edition'},
  'apa-7':{label:'APA 7',
    authority:'Publication Manual of the American Psychological Association, 7th edition'},
  'chicago-author-date':{label:'Chicago author-date',
    authority:'The Chicago Manual of Style, 17th edition, author-date system'},
} as const;
export type CitationStyle=keyof typeof CITATION_STYLES;

/** Initials from a given name: `John` to `J`, `Tom A.` to `TA`. A corporate name never reaches
 *  this -- it is returned whole by the callers below. */
const initials=(given:string):string=>
  given.split(/[\s.-]+/).filter(Boolean).map(part=>part[0].toUpperCase()).join('');

const joinAuthors=(authors:CitationAuthor[],one:(a:CitationAuthor,first:boolean)=>string,
  last:string):string=>{
  const parts=authors.map((a,i)=>one(a,i===0));
  if(parts.length<=1)return parts.join('');
  return parts.slice(0,-1).join(', ')+last+parts[parts.length-1];
};

/** The year a style prints, taken from `published` and falling back to the edition's own date.
 *  Returns undefined rather than a guess: a citation with no date is incomplete, not undated. */
const issuedYear=(p:InputProvenance):string|undefined=>{
  const date=p.published||p.edition?.published;
  const year=date&&/\d{4}/.exec(date);
  return year?year[0]:undefined;
};

/** What a style still needs before it can render this input, as sentences a reader can act on.
 *  Empty means `renderCitation` will produce a citation in every encoded style.
 *
 *  Separated from the renderer so that one caller can REFUSE on a gap and another can SHOW it:
 *  a validator fails the build, an Inspector tells the author which field to fill. Neither has to
 *  discover the requirement by finding a citation that came out wrong. */
export function citationGaps(p:InputProvenance|undefined):string[]{
  if(!p)return ['There is no provenance record at all.'];
  const c=p.citation;
  if(!c)return p.source
    ?[`The origin is recorded only as the sentence ${JSON.stringify(p.source)}. A style cannot `
      +`reorder a sentence, so this input carries no citation.`]
    :['Nothing records where this came from.'];
  const gaps:string[]=[];
  if(!c.authors?.length)gaps.push('No author. Every style opens with one, corporate or personal.');
  else for(const a of c.authors)
    if(!a.family.trim())gaps.push('An author has no family name.');
    else if(!a.corporate&&!a.given)
      gaps.push(`${a.family} has no given name. Vancouver and APA print an initial and Chicago `
        +`prints the name in full, so neither can be derived from the family name alone.`);
  if(!c.title?.trim())gaps.push('No title.');
  if(!issuedYear(p))gaps.push('No publication date, so no style can print a year. '
    +'`published` is the field; `retrieved` is when it was obtained and `represents` is what it '
    +'is about, and neither stands in for it.');
  if(c.type==='article'&&!c.container)
    gaps.push('An article with no journal: every style prints the container.');
  if(c.type==='chapter'&&!c.container)
    gaps.push('A chapter with no containing work.');
  if(c.doi&&!normaliseDoi(c.doi))
    gaps.push(`${JSON.stringify(c.doi)} is not a DOI. One reads 10., four to nine digits, a slash `
      +`and a suffix; a doi.org link or a "doi:" prefix is accepted and stripped. A malformed DOI `
      +`is refused rather than printed, because a broken one looks resolvable.`);
  return gaps;
}

/** What a complete citation would normally carry that this one does not, as advice rather than
 *  refusal. These do NOT stop `renderCitation`: a reference without a DOI is still a reference.
 *
 *  Separate from `citationGaps` for the same reason the gaps are separate from the renderer. A
 *  gap means this cannot be cited; an omission means it can be cited and could be cited better,
 *  and conflating them would either block a 1855 book for having no DOI or let a modern dataset
 *  ship without one unremarked. */
export function citationOmissions(p:InputProvenance|undefined):string[]{
  const c=p?.citation;
  if(!c)return [];
  const out:string[]=[];
  const year=Number((issuedYear(p!)||'').slice(0,4));
  // `an article`, `a dataset`: the advice is read by a person and reads like a sentence.
  const a=(word:string)=>`${/^[aeiou]/.test(word)?'an':'a'} ${word}`;
  if(!c.doi&&DOI_EXPECTED.has(c.type)&&year>=DOI_ERA)
    out.push(`No DOI. ${a(c.type).replace(/^./,m=>m.toUpperCase())} published in ${year} normally `
      +`has one, and a DOI still resolves after a publisher moves its site. Prefer it over a URL.`);
  if(!c.doi&&!p!.url&&c.type==='webpage')
    out.push('A webpage with neither a DOI nor a URL: there is no way to reach it.');
  if(c.type==='article'&&!c.pages&&!c.doi)
    out.push('An article with neither pages nor a DOI cannot be located within its volume.');
  if(!c.publisher&&!c.container&&(c.type==='book'||c.type==='report'))
    out.push(`${a(c.type).replace(/^./,m=>m.toUpperCase())} with no publisher.`);
  return out;
}

/** The bracketed designator the two non-print styles add. Chicago does not use one. */
const DESIGNATOR:Partial<Record<CitationType,{vancouver:string;apa:string}>>={
  map:{vancouver:'[map]',apa:'[Map]'},
  dataset:{vancouver:'[dataset]',apa:'[Data set]'},
  report:{vancouver:'[report]',apa:'[Report]'},
  webpage:{vancouver:'[Internet]',apa:''},
};

/** This input's origin in one style, or undefined where it cannot be rendered honestly.
 *
 *  UNDEFINED RATHER THAN A PARTIAL CITATION. A half-rendered reference is worse than none: it
 *  looks checkable and is not. `citationGaps` says what is missing, and the caller decides
 *  whether to refuse or to ask the author.
 *
 *  Emits plain text, with no italics. APA and Chicago italicise a standalone title and this
 *  project has no rich-text channel for a provenance string; a caller that has one can italicise
 *  `citation.title`, which is why the title is a field rather than baked into the sentence. */
export function renderCitation(p:InputProvenance|undefined,
  style:CitationStyle):string|undefined{
  if(!p?.citation||citationGaps(p).length)return undefined;
  const c=p.citation;
  const year=issuedYear(p)!;
  const ed=p.edition?.statement;
  const designator=DESIGNATOR[c.type];
  // Always the bare form, whichever of the three ways the author stored it.
  const doi=normaliseDoi(c.doi);
  const bits:string[]=[];
  const dot=(text:string)=>text.replace(/\.*$/,'')+'.';

  if(style==='vancouver'){
    // `Snow J. Title [map]. 2nd ed. In: Container. London: John Churchill; 1855.`
    bits.push(dot(joinAuthors(c.authors,
      a=>a.corporate||!a.given?a.family:`${a.family} ${initials(a.given)}`,', ')));
    bits.push(dot(c.title+(designator?` ${designator.vancouver}`:'')));
    if(ed)bits.push(`${ed} ed.`);
    if(c.type==='article'&&c.container){
      const tail=[c.volume?`${year};${c.volume}`:year,c.issue?`(${c.issue})`:'',
        c.pages?`:${c.pages}`:''].join('');
      bits.push(dot(c.container),`${tail}.`);
    }else{
      if(c.container)bits.push(dot(`In: ${c.container}`));
      bits.push(`${c.place?`${c.place}: `:''}${c.publisher?`${c.publisher}; `:''}${year}.`);
    }
    if(doi)bits.push(`doi:${doi}`);
    return bits.join(' ');
  }

  if(style==='apa-7'){
    // `Snow, J. (1855). Title (2nd ed.) [Map]. John Churchill.`
    bits.push(dot(joinAuthors(c.authors,
      a=>a.corporate||!a.given?a.family
        :`${a.family}, ${initials(a.given).split('').map(i=>`${i}.`).join(' ')}`,', & ')));
    bits.push(`(${year}).`);
    const brackets=designator?.apa?` ${designator.apa}`:'';
    bits.push(dot(c.title+(ed?` (${ed} ed.)`:'')+brackets));
    if(c.type==='article'&&c.container){
      const tail=[c.container,c.volume?`, ${c.volume}`:'',c.issue?`(${c.issue})`:'',
        c.pages?`, ${c.pages}`:''].join('');
      bits.push(dot(tail));
    }else{
      if(c.container)bits.push(dot(`In ${c.container}`));
      if(c.publisher)bits.push(dot(c.publisher));
    }
    if(doi)bits.push(`https://doi.org/${doi}`);
    else if(c.type==='webpage'&&p.url)bits.push(p.url);
    return bits.join(' ');
  }

  // Chicago author-date: `Snow, John. 1855. Title. 2nd ed. London: John Churchill.`
  // Only the first author is inverted; the rest read forename-first.
  bits.push(dot(joinAuthors(c.authors,(a,first)=>
    a.corporate||!a.given?a.family
      :first?`${a.family}, ${a.given}`:`${a.given} ${a.family}`,', and ')));
  bits.push(`${year}.`);
  bits.push(dot(c.title));
  if(ed)bits.push(`${ed} ed.`);
  if(c.type==='article'&&c.container){
    bits.push(dot([c.container,c.volume?` ${c.volume}`:'',c.issue?`, no. ${c.issue}`:'',
      c.pages?`: ${c.pages}`:''].join('')));
  }else{
    if(c.container)bits.push(dot(`In ${c.container}`));
    if(c.place||c.publisher)
      bits.push(dot(`${c.place?`${c.place}: `:''}${c.publisher||''}`));
  }
  if(doi)bits.push(`https://doi.org/${doi}`);
  return bits.join(' ');
}

/** The short form a FIGURE CREDIT uses: first author, year, title. Not a reference-list entry --
 *  a credit line on a map has one line and a reader who wants the full entry has the references.
 *  Undefined where there is no citation, so a caller falls back to `source` rather than to a
 *  fragment. */
export function citationShort(p:InputProvenance|undefined):string|undefined{
  const c=p?.citation;
  if(!c?.authors?.length||!c.title)return undefined;
  const first=c.authors[0];
  const lead=c.authors.length>1&&!first.corporate?`${first.family} et al.`:first.family;
  const year=issuedYear(p!);
  return `${lead}${year?` ${year}`:''}, ${c.title}`;
}

/** Every encoded style for this input, so a caller can offer a choice without knowing the list. */
export const renderedCitations=(p:InputProvenance|undefined):
  Partial<Record<CitationStyle,string>>=>{
  const out:Partial<Record<CitationStyle,string>>={};
  for(const style of Object.keys(CITATION_STYLES) as CitationStyle[]){
    const text=renderCitation(p,style);
    if(text)out[style]=text;
  }
  return out;
};

/** A provenance record for data whose terms nobody has stated. The honest default: it says that
 *  nothing is known, which is different from saying nothing applies. */
export const unstatedProvenance=(what?:string):InputProvenance=>
  ({licence:UNSTATED,...(what?{what}:{})});

/** The obligations this project has met, so a figure does not have to be told them twice.
 *
 *  Declared rather than inferred. An entry here means: when an input says it is under this
 *  licence, a figure redistributing it must carry this text. A licence NOT in this table is not
 *  thereby obligation-free -- it is one nobody has encoded, and `obligation` on the record is
 *  where the author states it. */
export const KNOWN_OBLIGATIONS:Readonly<Record<string,LicenceObligation>>={
  'ODbL-1.0':{attribution:'© OpenStreetMap contributors, ODbL',shareAlike:true},
  'CC-BY-4.0':{shareAlike:false},
  'CC-BY-SA-4.0':{shareAlike:true},
  'BSD-2-Clause':{shareAlike:false},
  'CC0-1.0':{shareAlike:false},
  [NONE_APPLIES]:{shareAlike:false},
};

/** What a figure carrying this input has to say, or '' where it has to say nothing.
 *
 *  Prefers what the author wrote. Falls back to the licence's known obligation, then to naming
 *  the source and its licence, which is the least a reader needs to check a claim. */
export function attributionFor(p:InputProvenance|undefined):string{
  if(!p)return '';
  if(p.obligation?.attribution)return p.obligation.attribution;
  const known=KNOWN_OBLIGATIONS[p.licence];
  if(known?.attribution)return p.source?`${p.source} · ${known.attribution}`:known.attribution;
  // `source` first because an author wrote it for this purpose; the citation's short form next,
  // so an input that records a work and no sentence still credits the work rather than naming a
  // licence on its own. Until 2026-10-27 this fell straight through to the bare licence id.
  const names=p.source||citationShort(p);
  if(p.licence===UNSTATED||p.licence===NONE_APPLIES)return '';
  return names?`${names} · ${p.licence}`:p.licence;
}

/** Whether redistributing this obliges the result to carry the same terms. Unknown licences
 *  answer `undefined` rather than `false`: "nobody encoded this" is not "it does not apply". */
export function shareAlike(p:InputProvenance|undefined):boolean|undefined{
  if(!p)return undefined;
  if(p.obligation?.shareAlike!==undefined)return p.obligation.shareAlike;
  return KNOWN_OBLIGATIONS[p.licence]?.shareAlike;
}

/** Every attribution a set of inputs obliges, de-duplicated, in the order given. */
export const attributionsFor=(records:(InputProvenance|undefined)[]):string[]=>
  [...new Set(records.map(attributionFor).filter(Boolean))];

/** The N3 a receipt asserts for one input's provenance. Declared where a reader meets the data. */
export function provenanceFacts(subject:string,p:InputProvenance|undefined):string{
  if(!p)return '';
  const q=(v:string)=>JSON.stringify(v);
  const parts=[`${subject} fw:licence ${q(p.licence)}`];
  if(p.what)parts.push(`fw:describedAs ${q(p.what)}`);
  if(p.source)parts.push(`dcterms:source ${q(p.source)}`);
  if(p.url)parts.push(`fw:retrievedFrom ${q(p.url)}`);
  if(p.retrieved)parts.push(`fw:retrievedAt ${q(p.retrieved)}`);
  if(p.represents)parts.push(`fw:represents ${q(p.represents)}`);
  if(p.published)parts.push(`dcterms:issued ${q(p.published)}`);
  if(p.edition?.published)parts.push(`fw:editionIssued ${q(p.edition.published)}`);
  if(p.edition?.publisher)parts.push(`fw:editionPublisher ${q(p.edition.publisher)}`);
  if(p.edition?.statement)parts.push(`fw:editionStatement ${q(p.edition.statement)}`);
  // The citation is asserted as fields rather than as a rendered string: a receipt that recorded
  // only "Snow J. On the mode... 1855." would be the free-text problem again, one layer down, and
  // a reader could not re-render it in their own style.
  const c=p.citation;
  if(c){
    parts.push(`fw:citationType ${q(c.type)}`,`dcterms:title ${q(c.title)}`);
    c.authors.forEach(a=>parts.push(`dcterms:creator ${q(
      a.corporate||!a.given?a.family:`${a.family}, ${a.given}`)}`));
    if(c.container)parts.push(`dcterms:isPartOf ${q(c.container)}`);
    if(c.place)parts.push(`fw:publicationPlace ${q(c.place)}`);
    if(c.publisher)parts.push(`dcterms:publisher ${q(c.publisher)}`);
    if(c.volume)parts.push(`fw:volume ${q(c.volume)}`);
    if(c.issue)parts.push(`fw:issue ${q(c.issue)}`);
    if(c.pages)parts.push(`fw:pages ${q(c.pages)}`);
    if(c.doi)parts.push(`fw:doi ${q(c.doi)}`);
  }
  if(p.licenceSource)parts.push(`fw:licenceSource ${q(p.licenceSource)}`);
  const attribution=attributionFor(p);
  if(attribution)parts.push(`fw:requiredAttribution ${q(attribution)}`);
  const sa=shareAlike(p);
  if(sa!==undefined)parts.push(`fw:shareAlike ${sa}`);
  return parts.join('; ')+'.\n';
}

/** Reads the shapes that already exist, so the standard absorbs them rather than competing.
 *
 *  A study area's boundary, a point layer's sourceInfo and a table's file record each said part
 *  of this before there was one place to say it. Those shapes are not rewritten in every saved
 *  workflow; they are read into the standard here, and a node that carries `provenance` outright
 *  wins over the older field. */
export function provenanceOf(params:Record<string,unknown>):InputProvenance|undefined{
  const declared=params.provenance as InputProvenance|undefined;
  if(declared?.licence)return declared;

  const boundary=(params.boundary??{}) as Record<string,string>;
  if(boundary.licence)return {licence:boundary.licence,
    ...(boundary.source?{source:boundary.source}:{}),
    ...(boundary.licenceSource?{licenceSource:boundary.licenceSource}:{}),
    ...(boundary.retrievedAt?{retrieved:boundary.retrievedAt}:{}),
    ...(boundary.yearRepresented?{represents:boundary.yearRepresented}:{}),
    ...(boundary.unitName?{what:boundary.unitName}:{})};

  const info=(params.sourceInfo??{}) as Record<string,string>;
  if(info.licence)return {licence:info.licence,
    ...(info.url?{url:info.url}:{}),
    ...(info.description?{what:info.description}:{})};

  const source=(params.source??{}) as Record<string,string>;
  if(typeof params.source==='object'&&source.licence)
    return {licence:source.licence,
      ...(source.title?{what:source.title}:{}),
      ...(source.url?{url:source.url}:{}),
      ...(source.note?{note:source.note}:{})};

  return undefined;
}
