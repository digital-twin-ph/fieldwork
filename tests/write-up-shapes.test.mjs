import test from 'node:test';
import assert from 'node:assert/strict';
import {Parser,Store} from 'n3';
import {validateGraph,loadGraph,ontologyFiles,summarize} from '../scripts/validate-ontology.mjs';
import {machinedNoteFacts} from '../build/equations.js';
import {publishedArtifactFacts} from '../build/artifact-notes.js';

/** WHAT A STEP OWES A READER, as rules a receipt is held to.
 *
 *  The practitioner, 2026-10-30: *"These above can be minted as ontology rules so the receipts
 *  can also be validated."* Every rule here was already true of the code, stated in a comment and
 *  pinned by a unit test against the generator -- and checked nowhere against a run. Experiment
 *  141. */

const PREAMBLE='@prefix fw: <urn:fieldwork:>.\n';
const OUT='<urn:fieldwork:run:r1:output:n1>';

async function report(facts){
  const graph=await loadGraph(ontologyFiles);
  graph.addQuads(new Parser().parse(PREAMBLE+facts));
  return validateGraph(graph);
}
const conforms=async facts=>{
  const r=await report(facts);
  assert.equal(r.conforms,true,JSON.stringify(summarize(r),null,1));
};
const refused=async facts=>assert.equal((await report(facts)).conforms,false);

const DESCRIPTION={kind:'machined',id:'n1:description',section:'Results',
  text:'32 rows, keyed by `group`.'};
const EQUATION={kind:'machined',id:'n1:equation',section:'Methods',fn:'method',
  text:'$$RR = 5.35$$',cites:['Katz log']};

test('a published table, described, with its rows and its empty cells, conforms',async()=>{
  await conforms(publishedArtifactFacts(OUT,{kind:'table',rowCount:32,missingValueCount:0})
    +machinedNoteFacts(OUT,[DESCRIPTION]));
});

test('A STEP THAT PUBLISHES AND DESCRIBES NOTHING IS REFUSED',async()=>{
  // THE RULE THE PRACTITIONER'S FOUR REPORTS WERE ABOUT. Before this a step could draw a table,
  // record a receipt and put nothing in the write-up with every gate green -- which is what
  // happened, because the tests asked whether the note generator worked rather than whether a
  // run produced one.
  await refused(publishedArtifactFacts(OUT,{kind:'table',rowCount:32,missingValueCount:0}));
});

test('a table that does not count its empty cells is refused',async()=>{
  // An empty cell is unknown and not zero: this application refuses a two-by-two over one, and a
  // published table whose gaps are unstated hands a reader measured absence.
  await refused(`${OUT} fw:publishesArtifact [ a fw:PublishedArtifact; `
    +`fw:artifactKind "table"; fw:artifactRowCount 32 ].\n`
    +machinedNoteFacts(OUT,[DESCRIPTION]));
});

test('a chart counts its bars and a map counts the layers it drew',async()=>{
  await conforms(publishedArtifactFacts(OUT,{kind:'chart',barCount:32})
    +machinedNoteFacts(OUT,[DESCRIPTION]));
  await conforms(publishedArtifactFacts(OUT,{kind:'map',layerCount:4})
    +machinedNoteFacts(OUT,[DESCRIPTION]));
  // A bar at zero is still a bar; zero bars is still a count and not an absence.
  await conforms(publishedArtifactFacts(OUT,{kind:'chart',barCount:0})
    +machinedNoteFacts(OUT,[DESCRIPTION]));
  await refused(`${OUT} fw:publishesArtifact [ a fw:PublishedArtifact; `
    +`fw:artifactKind "chart" ].\n`+machinedNoteFacts(OUT,[DESCRIPTION]));
});

test('an artifact of an unknown kind is refused',async()=>{
  // Closed, unlike fw:noteFunction: these three are the output widgets that exist, and a fourth
  // would be a new widget rather than a new word for one of these.
  await refused(`${OUT} fw:publishesArtifact [ a fw:PublishedArtifact; `
    +`fw:artifactKind "diagram"; fw:artifactRowCount 1; fw:missingValueCount 0 ].\n`
    +machinedNoteFacts(OUT,[DESCRIPTION]));
});

test('a note filed under a part of the outline conforms, and one filed elsewhere does not',async()=>{
  for(const section of ['Introduction','Methods','Results','Discussion','References'])
    await conforms(machinedNoteFacts(OUT,[{...DESCRIPTION,section}]));
  await refused(machinedNoteFacts(OUT,[{...DESCRIPTION,section:'Background'}]));
  await refused(machinedNoteFacts(OUT,[{...DESCRIPTION,section:'Abstract'}]));
});

test('A MACHINED NOTE MAY NOT NUMBER ITSELF',async()=>{
  // Structural, never a pattern over the prose: Snow's plate is NAMED "Snow's Map 2, 1855", so a
  // regular expression catching a figure number catches the name of a map. The number belongs to
  // the rendered document, where setting one figure aside moves the ones after it.
  await refused(machinedNoteFacts(OUT,[DESCRIPTION])
    .replace('fw:noteText','fw:figureNumber 3; fw:noteText'));
});

test('a description states no function, and that is legitimate',async()=>{
  // None of the seven reconciled functions describes what an artifact's self-description does,
  // and coining an eighth to file it under is how a vocabulary gets withdrawn. So absent is a
  // value, and the shape requires AT MOST one rather than at least one.
  const facts=machinedNoteFacts(OUT,[DESCRIPTION]);
  assert.doesNotMatch(facts,/fw:noteFunction/);
  await conforms(facts);
  assert.match(machinedNoteFacts(OUT,[EQUATION]),/fw:noteFunction "method"/);
});

test('A METHOD IS CITED OR SAYS NO SOURCE HAS BEEN READ, never neither',async()=>{
  const cited=machinedNoteFacts(OUT,[EQUATION]);
  assert.match(cited,/fw:methodName "Katz log"/);
  assert.match(cited,/fw:methodReference "Katz D/);
  await conforms(cited);
  // The absence is an assertion of its own, which is the distinction fw:epiInfoLabelSource
  // exists to keep: "nobody has looked it up" is not "there is nothing to say".
  const uncited=machinedNoteFacts(OUT,[{...EQUATION,cites:['Wald unpooled']}]);
  assert.match(uncited,/fw:methodUncited "A Wald interval/);
  await conforms(uncited);
  await refused(`${OUT} fw:machinedNote [ a fw:MachinedNote; fw:noteSection "Methods"; `
    +`fw:noteText "x"; fw:citesMethod [ a fw:MethodCitation; fw:methodName "Katz log" ] ].\n`);
});

test('a method cannot carry both a reference and an excuse for having none',async()=>{
  await refused(`${OUT} fw:machinedNote [ a fw:MachinedNote; fw:noteSection "Methods"; `
    +`fw:noteText "x"; fw:citesMethod [ a fw:MethodCitation; fw:methodName "Katz log"; `
    +`fw:methodReference "Katz D, 1978."; fw:methodUncited "None read." ] ].\n`);
});

test('a half-stated artifact emits nothing rather than a receipt the shape would refuse',()=>{
  // The shape would report the ABSENCE of a count as the defect, when the defect is upstream in
  // whatever failed to measure it. Silence here keeps the report pointing at the right place.
  assert.equal(publishedArtifactFacts(OUT,{kind:'table',rowCount:32}),'');
  assert.equal(publishedArtifactFacts(OUT,{kind:'chart'}),'');
  assert.equal(publishedArtifactFacts(OUT,{kind:'map'}),'');
  assert.match(publishedArtifactFacts(OUT,{kind:'map',layerCount:4}),/fw:artifactLayerCount 4/);
});
