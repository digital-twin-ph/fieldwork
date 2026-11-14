/** WHAT AN ARTIFACT DECLARES ABOUT ITSELF, machined for the write-up.
 *
 *  The practitioner, 2026-10-30, after the first version of this module called its output a
 *  caption: *"Captions are the user's responsibility, unless there is a way to machine it based
 *  on table, map, chart or equation semantics."*
 *
 *  **WHICH IS THE RULE, AND THIS MODULE DOES NOT WRITE A CAPTION.** A caption is an authorial
 *  act: *"Deaths and survivals among persons supplied by the Southwark and Vauxhall Company and
 *  the Lambeth Company, South London, 1854"* states the subject, the population, the place and
 *  the period in the author's own words, and no part of that is derivable from a `DataTable`.
 *  The first version machined one anyway and filed it under `fn: 'caption'`, which claimed the
 *  act while delivering something else. It is the same error 149 settled for notes in general --
 *  *"that is not the application's job, it's the user's and the user alone"* -- arriving one
 *  level down, where it was easier to miss because what is machined here is genuinely useful.
 *
 *  WHAT IT DOES WRITE is the artifact's own account of its shape and provenance: how many rows
 *  and keyed by what, which layers in what order and how many features, how many bars and what
 *  they are one per, what is missing, and where it came from. Every one of those is read off a
 *  declaration -- `DataTable.keys`, `MapLayer.index`, `ChartSummary.unit` -- so it passes the
 *  practitioner's test, and none of it is the caption. It is the material a caption is written
 *  FROM, and the author writes the caption beside it.
 *
 *  WHAT WOULD MAKE A REAL CAPTION MACHINABLE is already written down, in 147's chain for the
 *  machined title: design, place, outcome, period. Place is declared today on `study_area`.
 *  Period is declared per rate, as two free strings whose agreement is checked with `===`, which
 *  147 records as broken. Design is declared nowhere. So the honest statement is that a caption
 *  is partly machinable and mostly not yet, and the missing parts are the same ones blocking the
 *  machined title rather than anything peculiar to figures.
 *
 *  THE SECTION IS RESULTS, which is 147's table read off directly, and the function is LEFT
 *  UNSET. `relate_table`'s machined note sets none either, so the two producers now agree; and
 *  the seven in `KNOWN_NOTE_FUNCTIONS` were reconciled by the practitioner personally on
 *  2026-10-29 against a prototype they had spent an afternoon on. None of the seven describes
 *  what this does, and coining an eighth to file it under is how a vocabulary gets withdrawn
 *  later. Recorded in 141 as a question rather than taken.
 *
 *  AND NO NUMBER, which is unchanged and is the rule the module is still shaped around. 141's
 *  amendment of 2026-10-30 settled that a figure's number is computed when a document is
 *  rendered, from its position in the IMRaD outline and the venue's own convention.
 */
import type {DataTable} from './data-table.js';
import type {MachinedNote,FigureSection} from './notes.js';
import {DEFAULT_FIGURE_SECTION} from './notes.js';
import type {MapLayer} from './map-layer-list.js';
import type {ChartSummary} from './results.js';

/** One note per artifact, identified by the node that drew it. Stable across runs for the reason
 *  an equation note's id is: re-running rewrites the wording, and a reference pointing at the
 *  note must not move when it does. */
const describes=(nodeId:string,text:string,section:FigureSection=DEFAULT_FIGURE_SECTION):MachinedNote=>
  ({kind:'machined',id:`${nodeId}:description`,section,text,nodeId});

const count=(n:number,one:string,many=one+'s')=>`${n.toLocaleString()} ${n===1?one:many}`;
/** The label a practitioner gave the node, or nothing. NEVER a default like "Table": an unnamed
 *  artifact is unnamed, and inventing a title for it would put a word in the write-up that
 *  nobody chose and that a reader would take for the author's. */
const titled=(label:string|undefined):string=>{
  const text=(label||'').trim();
  return text?`**${text}.** `:'';
};

/** WHAT A TABLE DECLARES ABOUT ITSELF.
 *
 *  Only for the data-table mode. `table_output` has four — a table, polygons, decisions and the
 *  point table it started as — and the other three are views of things that are not a published
 *  table. A caption for them would be a caption for a screen.
 *
 *  WHAT A READER OF A PUBLISHED TABLE NEEDS, and nothing else: what is in a cell, what identifies
 *  a row, the unit, how big it is, and whether anything is missing. */
export function tableDescriptionNote(table:DataTable,label:string|undefined,nodeId:string,
  from?:string):MachinedNote|null{
  if(table?.kind!=='data-table')return null;
  // THE COLUMNS ARE NAMED, NOT MADE INTO A SENTENCE, which was the first correction here and
  // is the same one the caption rule makes in general: a generator states what is declared and
  // stops where prose begins.
  // The first version wrote `${valueField} by ${keys}`, which reads as prose only when the
  // columns happen to be nouns: on this application's own output it produced "per 1,000 people
  // by group" and "count by group and measure", because `rateTable` sets `valueField` to a unit
  // phrase and keys a long table by the literal word `measure`. A caption generator cannot know
  // whether a column name is a noun, so it states them as the table spells them, in code spans
  // that say so, and leaves prose to the author -- who forks this into a note of their own the
  // moment they touch it.
  const list=(names:readonly string[])=>names.map(n=>`\`${n}\``).join(names.length===2?' and '
    :', ').replace(/, ([^,]*)$/,names.length>2?' and $1':', $1');
  let text=`${titled(label)}${count(table.rowCount,'row')}`
    +(table.keys.length?`, keyed by ${list(table.keys)}`:'')+'. '
    +`Each value is \`${table.valueField}\``
    // The unit only where it says something the value field does not. `rateTable` writes the same
    // string into both, and printing it twice would read as two facts.
    +(table.unit&&table.unit!==table.valueField?`, in ${table.unit}`:'')+'.';
  // AN EMPTY CELL IS UNKNOWN AND NOT ZERO. This application refuses to compute a two-by-two over
  // one for that reason, and a caption that omitted it would hand a reader a table whose gaps
  // look like measured absence.
  if(table.missingValueCount)
    text+=` ${count(table.missingValueCount,'cell is','cells are')} empty: unknown rather than `
      +`zero.`;
  if(from&&from.trim()&&from.trim()!==(label||'').trim())text+=` Produced by ${from}.`;
  // THE SOURCE FILE, where the table came in as one and the digest is on it. A published table
  // whose origin is a file should say which file, and `DataTableSource` already holds it.
  if(table.source)
    text+=` Read from \`${table.source.filename}\`, ${count(table.source.rows,'row')}`
      +`, sha256 \`${table.source.sha256.slice(0,12)}\u2026\`.`;
  return describes(nodeId,text);
}

/** WHAT A MAP DECLARES ABOUT ITSELF.
 *
 *  Read off `mapLayers`, which is the list the interactive map, the static figure and the key all
 *  already draw from — so the caption cannot disagree with the picture. Experiment 148 recorded
 *  that this description is *"exhaust"*, assembled to be emitted and read back by nothing; a
 *  caption is the second reader it said it did not have. That is not the inversion 148 asks for,
 *  and it is one more consumer on the side of making the description the source.
 *
 *  BOTTOM TO TOP, because that is what the order means on a map and a reader looking at the
 *  figure is looking at the stack. */
export function mapDescriptionNote(layers:readonly MapLayer[],label:string|undefined,
  nodeId:string):MachinedNote|null{
  if(!layers?.length)return null;
  const drawn=[...layers].filter(l=>l.drawn).sort((a,b)=>a.index-b.index);
  if(!drawn.length)return null;
  const named=drawn.map(l=>l.parts!==undefined&&l.parts>1
    ?`${l.label} (${count(l.parts,'feature')})`:l.label);
  let text=`${titled(label)}${count(drawn.length,'layer')}, bottom to top: `
    +`${named.join('; ')}.`;
  // A LAYER CONNECTED AND NOT DRAWN IS A FACT ABOUT THE FIGURE. `fw:layerDrawn` exists so a
  // receipt can tell a map that showed three of five layers from one only ever wired to three,
  // and a reader of the figure is owed the same distinction.
  const hidden=layers.filter(l=>!l.drawn);
  if(hidden.length)
    text+=` ${count(hidden.length,'further layer is','further layers are')} connected and not `
      +`drawn: ${hidden.map(l=>l.label).join('; ')}.`;
  return describes(nodeId,text);
}

/** WHAT A CHART DECLARES ABOUT ITSELF.
 *
 *  `ChartSummary.caption` HAS EXISTED SINCE BEFORE THIS MODULE and reached no write-up. `rate`
 *  builds one naming the numerator, the multiplier, the denominator unit and the rate kind, and
 *  says when the vintages disagree and how many groups report no rate — which is a caption
 *  somebody wrote carefully for a surface that could not carry it into a report. The same shape
 *  149 found for the example's notes: produced, stored, and never put in front of a reader.
 *
 *  So this does not write a second caption over the top of it. It carries the one the chart
 *  already states and adds what a reader of a published figure needs around it. */
export function chartDescriptionNote(chart:ChartSummary,label:string|undefined,
  nodeId:string,mark:'bar'|'line'|'point'|'pyramid'|'stacked'='bar'):MachinedNote|null{
  if(!chart?.bins)return null;
  const measures={'record-count':'a count of records','numeric-total':'a total',
    value:'a value'} as const;
  const measure=chart.measure?measures[chart.measure]:undefined;
  const said=chart.caption.trim().replace(/\.*$/,'');
  // THE UNIT ONCE. `rateChart` already writes it into the caption, so appending it produced
  // "each a value in per 1,000 people" -- two prepositions and the same fact twice. Said only
  // where the chart's own caption has not already said it.
  const unit=chart.unit&&!said.includes(chart.unit)?` in ${chart.unit}`:'';
  let text=`${titled(label)}${said}. `
    // WHAT IS DRAWN IS COUNTED: an estimate with its interval is a point and a whisker, and a line joins points; neither
    // is a bar (the practitioner, 2026-11-12, of Brazil's "7 bars, one per shift" over seven estimates).
    +(chart.interval?`${count(chart.bins.length,'estimate')} with ${chart.bins.length===1?'its':'their'} ${chart.interval.level}% interval${chart.bins.length===1?'':'s'}`
      :mark==='stacked'?`${count(new Set(chart.bins.map(b=>b.label)).size,'stacked bar')}, one per period, divided by ${chart.groupedBy??'group'} into ${count(chart.panels?.length??0,'value')}`
      :mark==='pyramid'?`a population pyramid of ${count(chart.bins.filter(b=>b.panel!=='').length,'bar')}, two groups back to back`:mark==='line'?`${count(chart.bins.length,'point')} on a line`:mark==='point'?count(chart.bins.length,'dot'):count(chart.bins.length,'bar'))
    +(chart.categoryTitle?`, one per \`${chart.categoryTitle}\``:'')
    +(measure&&unit?`, each ${measure}${unit}`:unit?`, each value${unit}`:'')+'.';
  // A BAR OF ZERO IS NOT A BAR OF NOTHING, and the two look identical. `rateChart` draws a
  // suppressed group as `row.rate??0`, so a sub-district whose rate was withheld sits on the
  // axis beside one that genuinely measured zero -- which `chart-output.ts` already names in its
  // own comment as the thing the caption has to say.
  const empty=chart.bins.filter(b=>!b.count).length;
  if(empty)
    text+=` ${count(empty,'bar sits','bars sit')} at zero; a withheld value and a measured zero `
      +`are drawn the same way here and the table is where they are told apart.`;
  return describes(nodeId,text);
}

/** WHAT THE STEP PUBLISHED, as facts a shape can hold a receipt to.
 *
 *  The practitioner, 2026-10-30: *"These above can be minted as ontology rules so the receipts
 *  can also be validated."* The rules this feeds are in `ontology/shapes/write-up.ttl`, and the
 *  one they exist for is that a step which publishes a table, a chart or a map must have machined
 *  a note about it -- which was true of the code, stated in a comment, pinned by a unit test
 *  against the generator, and checked nowhere against an actual run. A step could draw a table,
 *  record a receipt and contribute nothing to the write-up with every gate green.
 *
 *  WHAT EACH KIND DECLARES is what a reader needs to interpret it and nothing more: a table's
 *  rows AND its empty cells, because an empty cell is unknown rather than zero and a count is the
 *  only thing that makes the gaps visible; a chart's bars, counting the ones at zero, because a
 *  withheld value and a measured zero are drawn the same way; a map's DRAWN layers, which is not
 *  the number connected to it.
 *
 *  NO NUMBER AND NO CAPTION HERE EITHER. This states what exists, and the shape refuses a
 *  `fw:figureNumber` on the note beside it. */
export interface PublishedArtifact {
  kind:'table'|'chart'|'map';
  rowCount?:number;
  missingValueCount?:number;
  barCount?:number;
  layerCount?:number;
  /** Where the figure goes in the write-up, and whether the practitioner chose it or it is the widget's default. */
  section?:FigureSection;
  sectionDeclared?:boolean;
  /** Left out of the write-up by the practitioner's choice: shown in Results, no note, no section. */
  leftOut?:boolean;
}

export function publishedArtifactFacts(subject:string,artifact:PublishedArtifact):string{
  const whole=(value:number|undefined):number|undefined=>
    typeof value==='number'&&Number.isFinite(value)?Math.max(0,Math.round(value)):undefined;
  const counts=artifact.kind==='table'
    // Both or neither: a row count without a missing-value count is the half-statement the shape
    // refuses, and emitting one alone would make the receipt fail rather than the generator.
    ?(whole(artifact.rowCount)===undefined||whole(artifact.missingValueCount)===undefined?null
      :`fw:artifactRowCount ${whole(artifact.rowCount)}; `
        +`fw:missingValueCount ${whole(artifact.missingValueCount)}`)
    :artifact.kind==='chart'
    ?(whole(artifact.barCount)===undefined?null:`fw:artifactBarCount ${whole(artifact.barCount)}`)
    :(whole(artifact.layerCount)===undefined?null
      :`fw:artifactLayerCount ${whole(artifact.layerCount)}`);
  // NOTHING RATHER THAN A HALF-STATEMENT. A receipt that asserted an artifact without the counts
  // its kind owes would be refused by the shape, which would report the ABSENCE of a count as the
  // defect when the defect is upstream in whatever failed to measure it.
  if(counts===null)return '';
  // THE PLACEMENT IS THE STEP'S, beside its note, so `fw:FigureFiledWhereDeclaredShape` can hold the note's section
  // against it on a real receipt.
  const placed=artifact.leftOut?`${subject} fw:figureInWriteUp false.\n`
    :artifact.section
    ?`${subject} fw:figureSection ${JSON.stringify(artifact.section)}; `
      +`fw:figureSectionDeclared ${artifact.sectionDeclared?'true':'false'}.\n`:'';
  return `${subject} fw:publishesArtifact [ a fw:PublishedArtifact; `
    +`fw:artifactKind ${JSON.stringify(artifact.kind)}; ${counts} ].\n`+placed;
}
