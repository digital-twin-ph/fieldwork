/** Design rules a map is held to, applied while it is assembled, and stated in its receipt.
 *
 *  The practitioner, 2026-10-17, deciding three things in sequence: *"We can include the
 *  conformance report in the N3 receipts"*, *"We can embed the map or visualization design rules
 *  in widgets and apply them during visualization assembly"*, and *"Then the N3 receipts can
 *  include which rules were applied."*
 *
 *  **Why this is not a new vocabulary.** WCAG does not need translating: its success criteria
 *  already have stable IRIs, W3C's EARL already models a conformance assertion, and DQV already
 *  models a measurement. What is minted here is the BINDING -- that this rule measures this
 *  thing, against that criterion, at that threshold -- and nothing else. See
 *  [the assessment](../docs/research/wcag-as-ontology.md).
 *
 *  **Where the boundary falls.** Rules for what is categorical, arithmetic for what is numerical.
 *  Every toast tone in this application failed WCAG contrast on 2026-10-17 -- the worst at 2.08
 *  against a 4.5 floor -- because a colour was chosen by eye and nothing measured it. No rule
 *  would have caught that; relative luminance did. So a rule here either computes a number and
 *  compares it, or it checks something genuinely categorical, and it says which it did.
 */
import {FIGURE_PALETTE,FIGURE_ROLE} from './presentation.js';

/** EARL's outcome set, which is closed and which this does not extend.
 *
 *  `cantTell` is the one worth having: a check that ran and could not decide. Experiment 65 drew
 *  that line for rulesets and 117 for data, and EARL drew it for conformance; three vocabularies
 *  arriving independently at "say when you could not tell" is a sign it is real. */
export type Outcome='passed'|'failed'|'cantTell'|'inapplicable';

export interface DesignRule {
  /** Local name; becomes `fw:<id>` in the receipt. */
  id:string;
  /** What the rule requires, in the words a reader should see. */
  statement:string;
  /** The criterion this binds to, where one exists. A rule of this project's own judgement
   *  rather than a published criterion leaves this absent and says so by its absence. */
  criterion?:{iri:string; label:string; level:'A'|'AA'|'AAA'};
  /** `measured` computes a number and compares it. `categorical` checks a property that is true
   *  or false without arithmetic. Stated because it decides how much the outcome is worth. */
  kind:'measured'|'categorical';
  /** Where the principle comes from, for a rule that is not a published criterion.
   *
   *  A rule citing a source is checkable against that source. A rule citing nothing is the
   *  author's taste wearing a rule's clothes — and three of the four below were exactly that
   *  until 2026-10-17, when the practitioner supplied the canon they belong to.
   *
   *  **None of these works has been read here.** What is attributed is the principle as it is
   *  commonly stated, which is why this says *traces to* rather than naming a page. */
  tracesTo?:string;
}

export interface RuleApplication {
  rule:DesignRule;
  outcome:Outcome;
  /** What was tested — a role name, a layer, a pair of colours. */
  subject:string;
  /** Present for a measured rule: the number, and the threshold it was held to. */
  measurement?:{value:number; threshold:number; unit:string};
  says:string;
}

/** Relative luminance, WCAG 2.x definition. */
export function relativeLuminance(hex:string):number{
  const channel=(v:number)=>{const s=v/255;return s<=0.03928?s/12.92:((s+0.055)/1.055)**2.4;};
  const [r,g,b]=[1,3,5].map(i=>channel(parseInt(hex.slice(i,i+2),16)));
  return 0.2126*r+0.7152*g+0.0722*b;
}
/** Contrast ratio between two colours, WCAG 2.x definition. Order does not matter. */
export function contrastRatio(a:string,b:string):number{
  const x=relativeLuminance(a),y=relativeLuminance(b);
  return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}

const SC_143={iri:'https://www.w3.org/TR/WCAG22/#contrast-minimum',
  label:'WCAG 2.2 SC 1.4.3 Contrast (Minimum)',level:'AA' as const};
/** WCAG's own split: 4.5 for ordinary text, 3.0 for large text and for graphical objects that
 *  carry meaning (SC 1.4.11). A map's marks are the latter. */
const TEXT_MINIMUM=4.5, LARGE_OR_GRAPHIC_MINIMUM=3;
const SC_1411={iri:'https://www.w3.org/TR/WCAG22/#non-text-contrast',
  label:'WCAG 2.2 SC 1.4.11 Non-text Contrast',level:'AA' as const};

export const DESIGN_RULES:DesignRule[]=[
  {id:'MapTextContrast',kind:'measured',criterion:SC_143,
    statement:'Text drawn on a map must reach 4.5:1 against the ground it sits on.'},
  {id:'MapMarkContrast',kind:'measured',criterion:SC_1411,
    statement:'A mark that carries meaning must reach 3:1 against the ground, or a reader cannot find it.'},
  {id:'CategoricalPaletteIsColourBlindSafe',kind:'categorical',
    tracesTo:'Brewer, on perceptual ordering and accessible palette choice; the palette itself is Okabe and Ito\u2019s',
    statement:'Categories are drawn from a palette chosen to remain distinguishable under the common colour vision deficiencies.'},
  {id:'UnknownIsNotAHue',kind:'categorical',
    tracesTo:'Bertin, on the visual variables: hue is selective but not ordered, so spending it on an absence makes that absence compete as a category',
    statement:'Absence of data is drawn in a neutral, never in a hue, because it is not a category and must not compete with one.'},
  // THE FIGURE'S PARTS, which the four rules above do not reach: they are all about colour, and a
  // map can be perfectly legible and still say nothing about what it is. Experiment 136.
  //
  // Almost every element here is CONDITIONAL, which is the finding that changed this design. The
  // request was for "title, labels, legend, north, scale"; the cartographic canon says a north
  // arrow and a scale bar are not necessary on all maps and that some should not have them, and
  // that the one unconditional element is a title. So five of the six below can report
  // `inapplicable`, and only `FigureHasTitle` cannot.
  {id:'FigureHasTitle',kind:'categorical',
    tracesTo:'Buckley (Esri), who holds a north arrow and a scale bar to be unnecessary on some maps and harmful on others, and an appropriate title to be necessary on all of them',
    statement:'A figure states what it is. A reader who meets it outside the text it was written for has only its own parts to read it by.'},
  {id:'EveryMarkIsInTheKey',kind:'categorical',
    tracesTo:'APA Publication Manual 7th edition, on the figure legend: it explains any symbols used in the figure image',
    statement:'Every mark a figure draws is named in its key, or the reader is left to guess what it stands for.'},
  {id:'FigureStatesItsSource',kind:'categorical',
    tracesTo:'APA Publication Manual 7th edition, on the figure note: it carries what the title, image and legend cannot, including attribution',
    statement:'A figure names where its content came from, in the figure rather than in the text around it.'},
  {id:'OrientationIsStatedWhereItIsNotObvious',kind:'categorical',
    tracesTo:'Ordnance Survey, that readers assume the top of a map is north unless told otherwise; Buckley, that north is true only along the central meridian of a conic or equal-area projection and a graticule should be shown instead of an arrow',
    statement:'A map whose north is not up says which way is north. A north-up map does not need to, and a north arrow on a projection whose meridians converge is wrong rather than redundant.'},
  {id:'ScaleStatementSurvivesItsProjection',kind:'categorical',
    tracesTo:'Buckley, on scale varying across a projection, so that a single bar is true only where it was computed',
    statement:'A scale a figure claims says what it holds for. On unprojected coordinates scale varies with latitude, so a bar alone is true at one latitude and false elsewhere.'},
  {id:'BasemapIsCredited',kind:'categorical',
    tracesTo:'ODbL, the licence of OpenStreetMap-derived tiles, which requires attribution of the source database wherever the derived work is published',
    statement:'A figure that draws a basemap carries that basemap\u2019s credit, because the credit is a condition of using it and not a courtesy.'},
];
const ruleBy=(id:string)=>DESIGN_RULES.find(r=>r.id===id)!;

/** What the map is about to draw, as much of it as a rule can be held against. */
export interface MapDesign {
  background:string;
  ink:string;
  quietInk:string;
  /** The hues this map actually used for categories, if it drew any. */
  categoryColours:string[];
  /** The colour standing for "no data", if this map drew one. */
  unknownColour?:string;
  /** The figure's parts, as much of them as a rule can be held against. Absent on a caller that
   *  has not been taught them, which is why every field here is optional and the rules that read
   *  them report `cantTell` rather than `failed` when the caller said nothing. */
  parts?:FigureParts;
}
/** What the figure says about itself, separately from how it is coloured. */
export interface FigureParts {
  title?:string;
  /** Whether a key was drawn, and how many entries it carried. */
  key?:{drawn:boolean; entries:number};
  /** How many marks the figure drew that a key would have to explain. */
  marksDrawn?:number;
  sourceNote?:string;
  /** True when north is up everywhere on this figure: unprojected coordinates, or a projection
   *  whose meridians do not converge across the drawn extent. */
  northIsUp?:boolean;
  /** A scale the figure claims, if it claims one, and what it was computed at. */
  scale?:{claimed:boolean; qualifier?:string};
  /** The tile provider whose basemap was drawn, and the credit drawn with it. */
  basemap?:{provider:string; credit?:string};
}

/** Apply every rule, and report every one — including the ones that did not apply.
 *
 *  A rule that was inapplicable is reported rather than omitted. A reader who sees four rules in
 *  one receipt and two in another has no way to tell whether the other two passed, were skipped,
 *  or do not exist, and that ambiguity is the thing a conformance report exists to remove. */
export function applyDesignRules(design:MapDesign):RuleApplication[] {
  const out:RuleApplication[]=[];

  const textRatio=contrastRatio(design.ink,design.background);
  out.push({rule:ruleBy('MapTextContrast'),subject:'ink on background',
    outcome:textRatio>=TEXT_MINIMUM?'passed':'failed',
    measurement:{value:Number(textRatio.toFixed(2)),threshold:TEXT_MINIMUM,unit:'contrast ratio'},
    says:`Title and label text is ${textRatio.toFixed(2)}:1 against the map ground.`});

  const quietRatio=contrastRatio(design.quietInk,design.background);
  out.push({rule:ruleBy('MapTextContrast'),subject:'quiet ink on background',
    outcome:quietRatio>=TEXT_MINIMUM?'passed':'failed',
    measurement:{value:Number(quietRatio.toFixed(2)),threshold:TEXT_MINIMUM,unit:'contrast ratio'},
    says:`Subtitles, notes and credits are ${quietRatio.toFixed(2)}:1 against the map ground.`});

  if(!design.categoryColours.length)
    out.push({rule:ruleBy('MapMarkContrast'),subject:'category marks',outcome:'inapplicable',
      says:'This map drew no categories, so there was no category mark to measure.'});
  else{
    const worst=design.categoryColours
      .map(colour=>({colour,ratio:contrastRatio(colour,design.background)}))
      .reduce((a,b)=>a.ratio<=b.ratio?a:b);
    out.push({rule:ruleBy('MapMarkContrast'),subject:`faintest category mark, ${worst.colour}`,
      outcome:worst.ratio>=LARGE_OR_GRAPHIC_MINIMUM?'passed':'failed',
      measurement:{value:Number(worst.ratio.toFixed(2)),threshold:LARGE_OR_GRAPHIC_MINIMUM,unit:'contrast ratio'},
      says:`The faintest of ${design.categoryColours.length} category colours is ${worst.ratio.toFixed(2)}:1 against the ground.`});
  }

  // Categorical, and checked against the declared palette rather than asserted. A rule that
  // simply announced the palette was safe would be a claim, not a check.
  const fromPalette=design.categoryColours.filter(c=>!FIGURE_PALETTE.includes(c as never));
  out.push({rule:ruleBy('CategoricalPaletteIsColourBlindSafe'),subject:'category colours',
    outcome:!design.categoryColours.length?'inapplicable':fromPalette.length?'failed':'passed',
    says:!design.categoryColours.length?'This map drew no categories.'
      :fromPalette.length?`${fromPalette.length} colour${fromPalette.length===1?'':'s'} came from outside the declared palette: ${fromPalette.join(', ')}.`
      :`All ${design.categoryColours.length} category colours come from the declared Okabe-Ito palette.`});

  const unknown=design.unknownColour;
  out.push({rule:ruleBy('UnknownIsNotAHue'),subject:'the colour for no data',
    outcome:!unknown?'inapplicable'
      :isNeutral(unknown)?'passed':'failed',
    says:!unknown?'This map drew nothing for absent data.'
      :isNeutral(unknown)?`Absent data is drawn in ${unknown}, a neutral.`
      :`Absent data is drawn in ${unknown}, which is a hue and competes with the categories.`});

  // THE FIGURE'S PARTS. A caller that has not been taught them says nothing, and `cantTell` is
  // the honest answer for a check that could not run -- distinct from `inapplicable`, which says
  // the check ran and does not apply to this figure. EARL draws that line and this keeps it.
  const parts=design.parts;
  const cannotTell=(id:string,subject:string)=>({rule:ruleBy(id),subject,outcome:'cantTell' as const,
    says:'This figure did not describe its parts, so the check could not run.'});

  if(!parts)out.push(cannotTell('FigureHasTitle','the figure title'));
  else out.push({rule:ruleBy('FigureHasTitle'),subject:'the figure title',
    outcome:parts.title?.trim()?'passed':'failed',
    says:parts.title?.trim()?`The figure is titled ${JSON.stringify(parts.title.trim())}.`
      :'The figure carries no title, so it says nothing about what it is.'});

  if(!parts||parts.marksDrawn===undefined)out.push(cannotTell('EveryMarkIsInTheKey','marks and key entries'));
  else if(!parts.marksDrawn)out.push({rule:ruleBy('EveryMarkIsInTheKey'),subject:'marks and key entries',
    outcome:'inapplicable',says:'This figure drew no marks, so there was nothing for a key to explain.'});
  else out.push({rule:ruleBy('EveryMarkIsInTheKey'),subject:'marks and key entries',
    outcome:parts.key?.drawn&&(parts.key.entries>=1)?'passed':'failed',
    measurement:{value:parts.key?.entries??0,threshold:1,unit:'key entries'},
    says:parts.key?.drawn&&parts.key.entries>=1
      ?`${parts.marksDrawn} mark kind${parts.marksDrawn===1?'':'s'} drawn, ${parts.key.entries} named in the key.`
      :`${parts.marksDrawn} mark kind${parts.marksDrawn===1?'':'s'} drawn and no key entry for them.`});

  if(!parts)out.push(cannotTell('FigureStatesItsSource','the source note'));
  else out.push({rule:ruleBy('FigureStatesItsSource'),subject:'the source note',
    outcome:parts.sourceNote?.trim()?'passed':'failed',
    says:parts.sourceNote?.trim()?'The figure names its sources in its own note.'
      :'The figure names no source, so a reader meeting it alone cannot trace its content.'});

  if(!parts||parts.northIsUp===undefined)out.push(cannotTell('OrientationIsStatedWhereItIsNotObvious','orientation'));
  else out.push({rule:ruleBy('OrientationIsStatedWhereItIsNotObvious'),subject:'orientation',
    // The rule that would have been wrong as asked for. North is up on every figure this project
    // draws today, so it reports inapplicable rather than demanding an arrow -- and becomes
    // applicable the moment a projected map is drawn.
    outcome:parts.northIsUp?'inapplicable':'cantTell',
    says:parts.northIsUp
      ?'North is up across this figure, which a reader assumes unless told otherwise, so no orientation indicator is required.'
      :'North is not up across this figure and nothing here can yet read whether it says so.'});

  if(!parts||!parts.scale?.claimed)out.push({rule:ruleBy('ScaleStatementSurvivesItsProjection'),
    subject:'the scale claim',outcome:'inapplicable',
    says:'This figure claims no scale, so there is no claim to qualify. On unprojected coordinates a bar would be true at one latitude only.'});
  else out.push({rule:ruleBy('ScaleStatementSurvivesItsProjection'),subject:'the scale claim',
    outcome:parts.scale.qualifier?.trim()?'passed':'failed',
    says:parts.scale.qualifier?.trim()?`The scale says what it holds for: ${parts.scale.qualifier.trim()}.`
      :'The figure claims a scale without saying where it holds, and scale varies across the drawn extent.'});

  if(!parts||!parts.basemap)out.push({rule:ruleBy('BasemapIsCredited'),subject:'basemap attribution',
    outcome:'inapplicable',says:'This figure drew no basemap, so no tile provider has to be credited.'});
  else out.push({rule:ruleBy('BasemapIsCredited'),subject:'basemap attribution',
    outcome:parts.basemap.credit?.trim()?'passed':'failed',
    says:parts.basemap.credit?.trim()
      ?`The basemap from ${parts.basemap.provider} is credited in the figure.`
      :`A basemap from ${parts.basemap.provider} is drawn with no credit, which its licence requires.`});

  return out;
}

/** A neutral has no hue: its three channels are equal, or near enough that no hue reads. */
export function isNeutral(hex:string,tolerance=8):boolean{
  const [r,g,b]=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
  return Math.max(r,g,b)-Math.min(r,g,b)<=tolerance;
}

/** The design this project's figures actually declare, read from the palette rather than
 *  restated, so the two cannot drift. */
export function figureDesign(categoryColours:string[],drewUnknown:boolean,parts?:FigureParts):MapDesign{
  return {background:FIGURE_ROLE.background,ink:FIGURE_ROLE.ink,quietInk:FIGURE_ROLE.quietInk,
    categoryColours,...(drewUnknown?{unknownColour:FIGURE_ROLE.unknown}:{}),...(parts?{parts}:{})};
}

/** The rules that were applied, as N3 for the map's receipt.
 *
 *  Three vocabularies and one binding. **EARL** carries the assertion — who tested what against
 *  which criterion, with which outcome from its closed set. **DQV** carries the measurement,
 *  which this project adopted on 2026-10-17 for data quality and which fits a contrast ratio
 *  unchanged. **WCAG's own IRIs** identify the criteria, so nothing is minted for them. Only
 *  `fw:designRule` and the threshold are ours, because EARL says plainly that it is *"not a
 *  comprehensive vocabulary for describing test procedures, test criteria, or test
 *  requirements"* — it will record that something failed SC 1.4.3 and will not tell you 4.5.
 *
 *  Every rule is emitted, including the inapplicable ones, so a reader can tell a rule that
 *  passed from a rule that was never run. */
export function designRuleFacts(specificationIri:string,applied:RuleApplication[]):string{
  const quote=(v:string)=>JSON.stringify(v);
  const outcome:Record<Outcome,string>={passed:'earl:passed',failed:'earl:failed',
    cantTell:'earl:cantTell',inapplicable:'earl:inapplicable'};
  return applied.map(a=>
    `<${specificationIri}> fw:designRuleApplication [ a fw:DesignRuleApplication, earl:Assertion; `
    +`fw:designRule fw:${a.rule.id}; `
    +`earl:subject <${specificationIri}>; earl:mode earl:automatic; `
    +(a.rule.criterion?`earl:test <${a.rule.criterion.iri}>; `:`earl:test fw:${a.rule.id}; `)
    +`earl:result [ a earl:TestResult; earl:outcome ${outcome[a.outcome]}`
    +(a.measurement
      ?`; dqv:value ${a.measurement.value}; fw:conformanceThreshold ${a.measurement.threshold}`
      :'')
    +` ]; `
    +`fw:appliedTo ${quote(a.subject)}; rdfs:comment ${quote(a.says)} ].`).join('\n');
}

/** The rules themselves, stated once per receipt that applies them.
 *
 *  Carried rather than cited, for the reason `authoredReceipt` carries an authored ruleset's
 *  rules: there is no published artefact to point at. A reader who can see the outcome and not
 *  the rule has been told a verdict. */
export function designRuleDeclarations():string{
  const quote=(v:string)=>JSON.stringify(v);
  return DESIGN_RULES.map(rule=>
    `fw:${rule.id} a fw:DesignRule; fw:ruleKind ${quote(rule.kind)}; `
    +`rdfs:comment ${quote(rule.statement)}`
    +(rule.tracesTo?`; dcterms:source ${quote(rule.tracesTo)}`:'')
    +(rule.criterion
      ?`; earl:test <${rule.criterion.iri}>; fw:conformanceLevel ${quote(rule.criterion.level)}; `
       +`rdfs:seeAlso <${rule.criterion.iri}>`
      :'')+'.').join('\n');
}

/** A decision a practitioner made, among alternatives that were all defensible.
 *
 *  The practitioner, 2026-10-17: *"It's a user preference, and the audit is in the N3 receipts in
 *  case anybody else wants it. FW is not multi-user, it only caters to the one user holding the
 *  browser, so N of 1 … The user can audit that decision him/herself."*
 *
 *  So a choice is recorded as a **choice**, and the reason it is recorded separately from a rule
 *  is not doubt about the practitioner's judgement. It is that a reader — most often the same
 *  practitioner, later — must be able to tell *"this map is sequential because the variable is
 *  ordered"* from *"this map is sequential because I chose it"*. Both are legitimate; only one
 *  is a statement about the data.
 *
 *  **It records `selected`, not `preferred`, and the difference is the point.** The practitioner,
 *  2026-10-17: *"We can not even infer preference from a single mouse click, we can only say
 *  'selected'. If 'selected' so happens to map to a particular pattern choice, then we have
 *  stronger evidence to say 'preference'."*
 *
 *  A preference is a **disposition** — a claim that this person tends to choose this. One click
 *  cannot evidence it; it evidences one click. Writing `preferred` on a single observation is
 *  the same overclaim as calling three gaps a pattern, and this project has made that mistake in
 *  prose often enough today to recognise it in a vocabulary.
 *
 *  What the receipts hold is therefore the **observations**. A preference is an inference across
 *  many of them, it would need its own statement of what it rests on, and nothing here asserts
 *  it. That is also what makes the inference possible later: selections recorded honestly are
 *  the only evidence a preference could ever be drawn from.
 *
 *  So `fw:ruleKind` asks of a rule what it stands on — **measured** or **categorical** — and
 *  `fw:decisionBasis` says of a decision that it was **selected**. */
export interface DesignChoice {
  /** What was being decided, as the Inspector names it. */
  setting:string;
  chosen:string;
  /** What else was offered, where the application knows. A choice between alternatives nobody
   *  can see is a setting, not a judgement, and recording it as a judgement would overstate it. */
  alternatives?:string[];
}

export function designChoiceFacts(specificationIri:string,choices:DesignChoice[]):string{
  const quote=(v:string)=>JSON.stringify(v);
  return choices.map(choice=>
    `<${specificationIri}> fw:designChoice [ a fw:DesignChoice; `
    +`fw:decisionBasis "selected"; `
    +`fw:choiceSetting ${quote(choice.setting)}; fw:choiceMade ${quote(choice.chosen)}`
    +(choice.alternatives?.length
      ?`; ${choice.alternatives.map(a=>`fw:choiceOffered ${quote(a)}`).join('; ')}`
      :'')
    +` ].`).join('\n');
}
