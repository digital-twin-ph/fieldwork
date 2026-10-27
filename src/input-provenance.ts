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
  /** When, as an ISO date. A boundary retrieved in 2026 may represent 1855. */
  retrieved?:string;
  /** The year the data REPRESENTS, which is not the year it was published or retrieved. */
  represents?:string;
  /** An SPDX identifier, `none-applies`, or `unstated`. Never blank. */
  licence:string;
  /** Where the licence was read, so a reader can check the claim rather than trust it. */
  licenceSource?:string;
  obligation?:LicenceObligation;
  note?:string;
}

export const UNSTATED='unstated';
export const NONE_APPLIES='none-applies';

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
  if(p.licence===UNSTATED||p.licence===NONE_APPLIES)return '';
  return p.source?`${p.source} · ${p.licence}`:p.licence;
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
