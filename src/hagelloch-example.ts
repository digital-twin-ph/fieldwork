import type {Workflow,WorkflowNode} from './types.js';
import type {EvidenceReference} from './evidence.js';
import cases from '../examples/hagelloch-1861/cases.json';
import provenance from '../examples/hagelloch-1861/provenance.json';
import {pointsAsTable} from './core.js';
import {groupTable} from './group-table.js';
import {relateShape} from './relate-table.js';

/** Measles in Hagelloch, 1861 — the first worked example built on a file this project did not
 *  author, and the first where place, time and person meet on one record.
 *
 *  [`john-snow-data-sets.md`](../docs/research/john-snow-data-sets.md) established the limit of
 *  the cholera study on 2026-10-08, in its own terms: *"place is excellent, time exists
 *  separately, person exists only as houses, and the three cannot be joined at the level of a
 *  case."* Worked example 10 is shaped entirely by that limit — two workflows that share nothing,
 *  because Table 1 carries no place and a location carries no date.
 *
 *  Hagelloch joins all three. 188 individual children, each with a house, two onset dates, an
 *  age, a school class and a family. One point per case, so the epidemic curve and the map are
 *  drawn from the same records rather than from two tables that happen to be about one outbreak.
 *
 *  **Everything here is real, and three things in it are inconvenient on purpose.**
 *
 *  `date_of_death` is empty for 176 of the 188 because those children RECOVERED — an absence
 *  that is an outcome, which this application's quality model reads as a missing value and
 *  cannot yet distinguish ([117](../docs/experiments/117-data-quality.md)). `complications` is
 *  the single value "yes" on every record, a constant carrying no information. `class` is 0, 1,
 *  2 — pre-school, first class, second class — an ordinal that profiles as a quantity with a
 *  median, which is the measurement-scale gap meeting a real file.
 *
 *  None of this is cleaned up. A worked example that quietly fixed its data would teach the
 *  opposite of what this one is for. */

const cite=(id:string,title:string,url:string,role:EvidenceReference['role'],notes:string):EvidenceReference=>
  ({id,kind:'url',title,url,role,authors:'',published:'',locator:'',notes,
    addedAt:'2026-10-17T00:00:00.000Z',modifiedAt:'2026-10-17T00:00:00.000Z'});

export function hagellochExample():Workflow{
  const nodes:WorkflowNode[]=[
    // The village, as the extent everything is reasoned within. Drawn around the anchored
    // coordinates with a small margin -- 272 by 234 metres of houses, which is the whole of the
    // outbreak. The boundary is this project's, for the same reason the georeference is.
    {id:'village',type:'study_area',x:20,y:300,
      params:{source:'drawn' as const,label:'Hagelloch, 1861',selectionMode:'bbox' as const,
        geometry:{type:'Polygon' as const,coordinates:[[
          [9.0603,48.5406],[9.0647,48.5406],[9.0647,48.5433],[9.0603,48.5433],[9.0603,48.5406]]]}}},

    {id:'cases',type:'point_input',x:20,y:60,
      params:{label:`${cases.features.length} measles cases, one per child`,
        data:cases as never,
        sourceInfo:{format:'R outbreaks 1.9.0 · measles_hagelloch_1861',
          url:provenance.dataset.originalScan,
          notes:`${provenance.dataset.collected}. ${provenance.georeference.doesNotEstablish}`}},
      references:[
        cite('pfeilsticker-1863','Pfeilsticker 1863, the original thesis',
          provenance.dataset.originalScan,'data',
          `${provenance.dataset.records} cases, ${provenance.dataset.periodCovered}. ${provenance.dataset.licenceDecision}`),
        cite('georeference','The georeference is this project’s, not the source’s',
          'https://en.wikipedia.org/wiki/Hagelloch','method',
          `${provenance.georeference.why} ${provenance.georeference.doesNotEstablish}`)]},

    // By date of PRODROME, not of rash and not of death. The kind is declared because a curve by
    // date of death is a different curve, and 176 of these records have no date of death at all.
    {id:'curve',type:'case_series',x:430,y:60,
      params:{label:'Cases by day of prodrome',source:'points',
        dateField:'date_of_prodrome',dateKind:'onset',period:'day'}},
    {id:'epidemic',type:'chart_output',x:840,y:60,
      params:{label:'Epidemic curve · by day of prodrome',inputMode:'series'}},

    // The same 188 records, mapped. Not a second dataset: the curve above and the map below are
    // the same children, which is what this example exists to demonstrate.
    {id:'map',type:'map_output',x:430,y:300,
      params:{label:'Where the cases were',presentation:'plot' as const}},
    // `spatial`, because these are point records and not the decisions of a rule step. The
    // default reads a `decisions` port, which this example does not have.
    {id:'table',type:'table_output',x:840,y:300,
      params:{label:'Every case, as recorded',inputMode:'spatial' as const}},
  ];
  const edges=[
    {id:'cases-curve',from:'cases',to:'curve',port:'points'},
    {id:'curve-chart',from:'curve',to:'epidemic',port:'series'},
    {id:'cases-map',from:'cases',to:'map',port:'points'},
    {id:'cases-table',from:'cases',to:'table',port:'points'},
    {id:'village-map',from:'village',to:'map',port:'area'},
  ];
  return {schema:'fieldwork/workflow/1',name:'Measles in Hagelloch, 1861',
    exampleId:'hagelloch',nodes,edges} as unknown as Workflow;
}

/** WHO INFECTED WHOM, IN HAGELLOCH (experiment 200, steps 1 to 3 and 5): the second workflow of the project, so that
 *  opening Hagelloch shows it. The practitioner, 2026-11-09: *"I still don't see the transmission chain chart for
 *  hagelloch."* Each step is what was built by hand on an empty canvas and checked by lab check 43:
 *
 *  - the cases related to themselves on `infector`, bringing the infector's prodrome date; the 4 with no infector kept
 *    under "no infector recorded", decided;
 *  - the serial interval, one prodrome date taken from the other, in days;
 *  - the cases counted by `infector` and related back on `case_ID`, the 126 nobody names kept as 0, typed;
 *  - the transmission tree, drawn by Chart.
 *
 *  The unmatched decisions carry the signature of the gap they were made about, computed here from the same file, so
 *  they hold exactly as the practitioner's would. */
export function hagellochChainsExample():Workflow{
  const base=hagellochExample();
  const casesNode=base.nodes.find(n=>n.id==='cases')!;
  const table=pointsAsTable(cases as never);
  const selfRequest={on:'infector',rightOn:'case_ID',bring:'date_of_prodrome',bringAs:'infector_prodrome',normalisation:'exact' as const};
  const counts=groupTable(table,{by:['infector'],aggregate:'count'}).table;
  const countRequest={on:'case_ID',rightOn:'infector',bring:'rows',bringAs:'secondary_cases',normalisation:'exact' as const};
  const nodes=[
    {...casesNode,x:20,y:200},
    {id:'infector',type:'relate_table',x:400,y:40,params:{label:'Each case’s infector',...selfRequest,
      unmatched:{decision:'keep',label:'no infector recorded',reason:'Four cases name no infector: kept, because dropping them would change the counts.',
        signature:relateShape(table,table,selfRequest).signature}}},
    {id:'serial',type:'apply_ruleset',x:760,y:40,params:{label:'Serial interval',parameters:{},
      ruleset:{id:'urn:fieldwork:ruleset:outreach-criteria',version:'1.0.0',title:'Rules written in this workflow',inputs:[['subjects','table']],output:'table'},
      authored:{title:'Serial interval',mustNotBeReadAs:'',parameters:[],
        fields:[{attribute:'date_of_prodrome',predicate:'fwa:prodrome',kind:'date',label:'date_of_prodrome'},
          {attribute:'infector_prodrome',predicate:'fwa:infectorProdrome',kind:'date',label:'infector_prodrome'}],
        rules:[{any:[{all:[]}],then:[{predicate:'fwa:serial',column:'serial_interval_days',
          compute:{left:{field:'fwa:prodrome'},operator:'minus',right:{field:'fwa:infectorProdrome'}}}]}]}}},
    {id:'serial-table',type:'table_output',x:1120,y:40,params:{label:'Serial intervals',inputMode:'table'}},
    {id:'count',type:'group_table',x:400,y:300,params:{label:'Cases each child infected',by:['infector'],aggregate:'count'}},
    {id:'secondary',type:'relate_table',x:760,y:300,params:{label:'Secondary cases',...countRequest,
      unmatched:{decision:'keep',label:'0',reason:'A child nobody names as infector infected no one recorded.',
        signature:relateShape(table,counts,countRequest).signature}}},
    {id:'secondary-table',type:'table_output',x:1120,y:300,params:{label:'Secondary cases per child',inputMode:'table'}},
    {id:'tree',type:'chart_output',x:400,y:560,params:{label:'Who infected whom',figure:'tree',
      tree:{id:'case_ID',parent:'infector',date:'date_of_prodrome'},chartTitle:'Who infected whom, Hagelloch, 1861'}},
    // THE SAME LINKS ON THE MAP (step 4): a line from each infector's house to the case's. 90 of the 184 join two
    // children of one house and have no length; the map counts them and says so.
    {...base.nodes.find(n=>n.id==='village')!,x:20,y:560},
    {id:'links-map',type:'map_output',x:760,y:560,params:{label:'Who infected whom, on the map',presentation:'plot' as const,
      linkField:{cases:{column:'infector',matches:'case_ID'}},mapTitle:'Who infected whom, Hagelloch, 1861'}},
  ];
  const edges=[
    {id:'c-inf-1',from:'cases',to:'infector',port:'records'},{id:'c-inf-2',from:'cases',to:'infector',port:'related'},
    {id:'inf-serial',from:'infector',to:'serial',port:'subjects'},{id:'serial-out',from:'serial',to:'serial-table',port:'table'},
    {id:'c-count',from:'cases',to:'count',port:'records'},
    {id:'c-sec',from:'cases',to:'secondary',port:'records'},{id:'count-sec',from:'count',to:'secondary',port:'related'},
    {id:'sec-out',from:'secondary',to:'secondary-table',port:'table'},
    {id:'c-tree',from:'cases',to:'tree',port:'records'},
    {id:'c-links-map',from:'cases',to:'links-map',port:'points'},{id:'village-links-map',from:'village',to:'links-map',port:'area'},
  ];
  return {schema:'fieldwork/workflow/1',name:'Who infected whom, Hagelloch, 1861',
    exampleId:'hagelloch-chains',nodes,edges} as unknown as Workflow;
}
