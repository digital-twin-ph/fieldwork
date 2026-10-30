import type {Author} from './identity.js';
import {authorLabel} from './identity.js';
import type {Note} from './notes.js';

/** WHAT EACH CO-AUTHOR DID, for the author contributions section.
 *
 *  The practitioner, 2026-10-29: *"Because we have authors modifying the artifacts, we can actually
 *  quantify the amount of work each co-author did in the publication. So that goes into author
 *  contributions section at the end of the publication."*
 *
 *  This is the apparatus case `notes.ts` names and does not hold: a title, an abstract, a reference
 *  list are *"assembled from declarations spread across a workflow rather than written into one
 *  place, so no single note owns them"*. An author contributions statement is the clearest example
 *  of that whole class -- nobody writes it, and it is wrong exactly when somebody writes it from
 *  memory instead of from the record.
 *
 *  WHAT THIS DOES NOT DO, and the reason is the point rather than a caveat.
 *
 *  It does not produce a share, a percentage or a ranking. The request was to *quantify the amount
 *  of work*, and a count is the only quantity available -- but a count of acts is not a measure of
 *  contribution, and presenting it as one would be a judgement wearing a number's clothes. One
 *  decisive limitation note can outweigh forty drawn boxes, and nothing this application can
 *  observe tells the two apart. So acts are reported in the units they happened in, a role is
 *  PROPOSED from them, and the authors confirm. That is also the form journals ask for: CRediT
 *  names roles, not proportions.
 *
 *  And it reports what it cannot see. Of the fourteen CRediT roles, this record can evidence a
 *  few; the rest -- supervision, funding, conceptualization -- leave no trace in a workflow and are
 *  listed as unevidenced rather than quietly omitted, so a reader can tell a role nobody performed
 *  from a role this application cannot observe. */

/** The NISO Contributor Roles Taxonomy, closed because it is somebody else's standard. All fourteen
 *  IRIs were checked to resolve on 2026-10-29. */
export const CREDIT_ROLES=['Conceptualization','Data curation','Formal analysis',
  'Funding acquisition','Investigation','Methodology','Project administration','Resources',
  'Software','Supervision','Validation','Visualization','Writing – original draft',
  'Writing – review & editing'] as const;
export type CreditRole=typeof CREDIT_ROLES[number];

const SLUG:Record<CreditRole,string>={
  'Conceptualization':'conceptualization','Data curation':'data-curation',
  'Formal analysis':'formal-analysis','Funding acquisition':'funding-acquisition',
  'Investigation':'investigation','Methodology':'methodology',
  'Project administration':'project-administration','Resources':'resources','Software':'software',
  'Supervision':'supervision','Validation':'validation','Visualization':'visualization',
  'Writing – original draft':'writing-original-draft',
  'Writing – review & editing':'writing-review-editing'};

export const roleIRI=(role:CreditRole):string=>
  `https://credit.niso.org/contributor-roles/${SLUG[role]}/`;

/** A role this application can never evidence from a workflow, and says so. */
export const UNEVIDENCED:readonly CreditRole[]=['Conceptualization','Funding acquisition',
  'Project administration','Resources','Supervision','Software'];

export interface Contribution {
  role:CreditRole;
  /** The acts observed, in their own units. Never a share. */
  evidence:string;
  /** False means proposed from the evidence and confirmed by nobody. */
  confirmed:boolean;
}
export interface AuthorContribution {author:Author; contributions:Contribution[]}

/** An act in the record that carries an author. Deliberately a small, named set: these are the two
 *  surfaces that carry one today -- `AuthoredNote.author` and a study area's `drawnBy` -- and a
 *  statement assembled from them is as thin as the record is. Saying which acts were counted is how
 *  a reader can tell a quiet author from an unattributed surface. */
export interface AttributableAct {
  login:string;
  kind:'note'|'note-edit'|'study-area';
  /** Where it sits, for the evidence sentence: a write-up part, or a study area's label. */
  where?:string;
}

/** The acts the project's own artifacts carry. Notes first, because they are the only surface that
 *  records a person writing prose. */
export function actsOfNotes(notes:readonly Note[]):AttributableAct[]{
  return notes.flatMap(note=>{
    if(note.kind!=='authored'||!note.author)return [];
    // A fork is an edit of somebody else's machined sentence, which is review and editing rather
    // than drafting. The distinction is already recorded; this reads it rather than guessing.
    return [{login:note.author,kind:note.forkedFrom?'note-edit':'note' as const,
      where:note.section}];
  });
}

/** How many places an evidence sentence names before it stops naming them. Forty study-area
 *  labels inline is not evidence a reader can use, and the sentence has to stay readable in a
 *  publication's own apparatus. */
const PLACES_NAMED=4;

/** Singular and plural are both given rather than derived, because the nouns here are phrases --
 *  "study areas drawn", not "study area drawns", which is what suffixing produced and what a test
 *  caught. */
const sentence=(count:number,singular:string,plural:string,where:string[]):string=>{
  const places=[...new Set(where)].filter(Boolean).sort();
  const named=places.slice(0,PLACES_NAMED);
  const rest=places.length-named.length;
  return `${count} ${count===1?singular:plural}`
    +(named.length?` (${named.join(', ')}${rest?`, and ${rest} more`:''})`:'');
};

/** The statement, as structured data. One entry per author who left a trace, in the order the
 *  project lists its authors -- which is the order a publication's byline uses, and not an order
 *  this function is entitled to rearrange by volume. */
export function contributions(authors:readonly Author[],
  acts:readonly AttributableAct[]):AuthorContribution[]{
  const byLogin=new Map<string,AttributableAct[]>();
  for(const act of acts){
    const key=act.login.toLowerCase();
    byLogin.set(key,[...(byLogin.get(key)??[]),act]);
  }
  return authors.map(author=>{
    const mine=byLogin.get(author.login.toLowerCase())??[];
    const of=(kind:AttributableAct['kind'])=>mine.filter(a=>a.kind===kind);
    const list:Contribution[]=[];
    const drafted=of('note'),edited=of('note-edit'),drawn=of('study-area');
    if(drafted.length)list.push({role:'Writing – original draft',
      evidence:sentence(drafted.length,'authored note','authored notes',
        drafted.map(a=>a.where??'')),confirmed:false});
    if(edited.length)list.push({role:'Writing – review & editing',
      evidence:sentence(edited.length,'machined note edited','machined notes edited',
        edited.map(a=>a.where??'')),confirmed:false});
    if(drawn.length)list.push({role:'Investigation',
      evidence:sentence(drawn.length,'study area drawn','study areas drawn',
        drawn.map(a=>a.where??'')),confirmed:false});
    return {author,contributions:list};
  });
}

/** The draft a practitioner edits, in the form a journal asks for. Every line says it is proposed,
 *  because a statement that reads as settled is one nobody checks. */
export function contributionStatement(entries:readonly AuthorContribution[]):string{
  const lines=entries.map(({author,contributions:list})=>list.length
    ?`${authorLabel(author)}: ${list.map(c=>`${c.role}`).join('; ')}.`
      +` Proposed from the record — ${list.map(c=>c.evidence).join('; ')}.`
    :`${authorLabel(author)}: nothing in this project's artifacts carries this author, so no role `
      +`is proposed. That is a statement about the record, not about the person.`);
  return [...lines,'',
    'Proposed by Fieldwork from what the artifacts record, for the authors to confirm or correct. '
    +'Counts are evidence, not a measure of contribution, and no share or ranking is implied.',
    `Roles this record cannot evidence at all: ${UNEVIDENCED.join(', ')}.`].join('\n');
}
