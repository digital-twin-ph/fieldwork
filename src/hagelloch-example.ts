import type {Workflow,WorkflowNode} from './types.js';
import type {EvidenceReference} from './evidence.js';
import cases from '../examples/hagelloch-1861/cases.json';
import provenance from '../examples/hagelloch-1861/provenance.json';
import dictionaryFile from '../examples/hagelloch-1861/dictionary.json';
import {guessMapping,readDictionary,proposeFrom,checkDictionary,dictionaryKeyOf,type TableDictionary} from './column-metadata.js';
import {pointsAsTable} from './core.js';
import {groupTable} from './group-table.js';
import {relateShape} from './relate-table.js';
import {WRITTEN_IN_WORKFLOW} from './rulesets.js';

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

/** THE SOURCE'S DICTIONARY, with the cases (experiment 211). The practitioner, 2026-11-13, of `class`: *"What is class
 *  really? Did we have a data dictionary or did we use the data dictionary feature of Table input?"* Neither, then. The
 *  outbreaks package documents its variables, transcribed in dictionary.json; what it says is PROPOSED, not accepted,
 *  so whether school classes have an order is still the practitioner's to say. The digest is the file's, checked by
 *  tests/hagelloch-dictionary.test.mjs. */
export const HAGELLOCH_DICTIONARY_SHA256='ff1734f23b0bd4f7bf924846b92c778f26a72736a6ed3a06c250b4f50263caca';
function describedCases(){
  const dictionary:TableDictionary={name:'outbreaks 1.9.0 · measles_hagelloch_1861',sha256:HAGELLOCH_DICTIONARY_SHA256,
    sheets:[{name:'measles_hagelloch_1861',headers:dictionaryFile.headers,rows:dictionaryFile.rows}],readAt:'2026-11-13T00:00:00.000Z'};
  const entries=readDictionary(dictionaryFile.headers,dictionaryFile.rows,guessMapping(dictionaryFile.headers));
  const columns=[...new Set(cases.features.flatMap(f=>Object.keys(f.properties)))];
  const rows=cases.features.map(f=>columns.map(c=>{const v=(f.properties as Record<string,unknown>)[c];return v===null||v===undefined?'':String(v);}));
  return {dictionary,dictionaryRef:dictionaryKeyOf(dictionary.sha256),
    columns:proposeFrom(entries,dictionary.name,columns),dictionaryCheck:checkDictionary(dictionary.name,entries,{headers:columns,rows})};
}

export function hagellochExample():Workflow{
  const nodes:WorkflowNode[]=[
    // The village, as the extent everything is reasoned within. Drawn around the anchored
    // coordinates with a small margin -- 272 by 234 metres of houses, which is the whole of the
    // outbreak. The boundary is this project's, for the same reason the georeference is.
    {id:'village',type:'study_area',x:20,y:300,
      params:{source:'drawn' as const,label:'Hagelloch, 1861',selectionMode:'bbox' as const,
        geometry:{type:'Polygon' as const,coordinates:[[
          [9.0097,48.5401],[9.0140,48.5401],[9.0140,48.5429],[9.0097,48.5429],[9.0097,48.5401]]]}}},

    {id:'cases',type:'point_input',x:20,y:60,
      params:{label:`${cases.features.length} measles cases, one per child`,
        data:cases as never,...describedCases(),
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
      params:{label:'Epidemic curve · by day of prodrome'}},
    // THE SAME DATES BY DAY OF THE WEEK (the practitioner, 2026-11-12: "is it possible that the day of the week can show a
    // pattern?"). A cycle, not a time axis: all seven days, Monday first.
    {id:'weekday',type:'case_series',x:430,y:-160,
      params:{label:'Cases by day of the week of prodrome',source:'points',
        dateField:'date_of_prodrome',dateKind:'onset',period:'weekday'}},
    {id:'weekday-chart',type:'chart_output',x:840,y:-160,
      params:{label:'Cases by day of the week'}},

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
    {id:'curve-chart',from:'curve',to:'epidemic',port:'records'},
    {id:'cases-weekday',from:'cases',to:'weekday',port:'points'},
    {id:'weekday-out',from:'weekday',to:'weekday-chart',port:'records'},
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
      ruleset:{id:WRITTEN_IN_WORKFLOW,version:'1.0.0',title:'Rules written in this workflow',inputs:[['subjects','table']],output:'table'},
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

/** WAS THERE A CLUSTER IN HAGELLOCH? (experiment 200, Detect): the third workflow of the project. The cases, scanned by
 *  day of prodrome for circles of houses and runs of days with more cases than the rest of the outbreak would lead one
 *  to expect; the clusters drawn over the village and listed. The seed is fixed, so the p-values reproduce. */
export function hagellochClusterExample():Workflow{
  const base=hagellochExample();
  const nodes=[
    {...base.nodes.find(n=>n.id==='cases')!,x:20,y:60},
    {...base.nodes.find(n=>n.id==='village')!,x:20,y:320},
    {id:'scan',type:'space_time_scan',x:430,y:60,params:{label:'Was there a cluster?',dateField:'date_of_prodrome',unit:'day' as const,
      maxCaseShare:0.5,maxTimeShare:0.5,replications:999,seed:20261110,report:10}},
    {id:'cluster-map',type:'map_output',x:840,y:60,params:{label:'Clusters over the village',presentation:'plot' as const,
      mapTitle:'Space-time clusters of measles, Hagelloch, 1861',
      // The cases small and dark, so the clusters' two hues are the only colour on the figure.
      layerSymbols:{cases:{colour:'#3d4a45',size:3}}}},
    {id:'cluster-table',type:'table_output',x:840,y:320,params:{label:'Every cluster reported',inputMode:'polygons' as const}},
    // THE DAY-BY-DAY REPLAY: when would a scan run each evening first have flagged something?
    {id:'replay',type:'space_time_scan',x:430,y:580,params:{label:'When would it have been flagged?',dateField:'date_of_prodrome',
      unit:'day' as const,maxCaseShare:0.5,maxTimeShare:0.5,replications:999,seed:20261110,replay:true}},
    {id:'replay-table',type:'table_output',x:840,y:580,params:{label:'Each day’s most likely cluster',inputMode:'polygons' as const}},
    // AND PLAYED, day by day, on the map: that day's circle and the cases known by then. Not in the write-up (the
    // practitioner, 2026-11-14: "hard to interpret ... we can leave it out of the notes"); it plays in Results.
    {id:'replay-map',type:'map_output',x:840,y:840,params:{label:'The outbreak, day by day',presentation:'interactive' as const,section:'none' as const,
      mapTitle:'What a daily scan would have said, Hagelloch, 1861',layerSymbols:{cases:{colour:'#3d4a45',size:3}}}},
  ];
  const edges=[
    {id:'cases-scan',from:'cases',to:'scan',port:'points'},
    {id:'scan-map',from:'scan',to:'cluster-map',port:'polygons'},{id:'cases-cluster-map',from:'cases',to:'cluster-map',port:'points'},
    {id:'village-cluster-map',from:'village',to:'cluster-map',port:'area'},
    {id:'scan-table',from:'scan',to:'cluster-table',port:'polygons'},
    {id:'cases-replay',from:'cases',to:'replay',port:'points'},{id:'replay-out',from:'replay',to:'replay-table',port:'polygons'},
    {id:'replay-map-in',from:'replay',to:'replay-map',port:'polygons'},{id:'cases-replay-map',from:'cases',to:'replay-map',port:'points'},
    {id:'village-replay-map',from:'village',to:'replay-map',port:'area'},
  ];
  return {schema:'fieldwork/workflow/1',name:'Was there a cluster? Hagelloch, 1861',
    exampleId:'hagelloch-cluster',nodes,edges} as unknown as Workflow;
}

/** THE 1824 SHEET, PLACED BY HAND (experiment 201). The cadastral sheet the village was drawn on 37 years before the
 *  outbreak, placed by matching four street junctions on the sheet to the same junctions on today's map, with a cue for
 *  each. The cue's centre on the sheet is today's junction carried onto the sheet by its frame's placement; the learner
 *  clicks where the drawn streets meet, which is theirs to find. The image is the example's own file, offered in
 *  Configure… and chosen only when the learner asks for it. */
export function hagellochSheetExample():Workflow{
  const base=hagellochExample();
  const junction=(id:string,why:string,pixel:[number,number],lonlat:[number,number])=>({id,why,pixel,radiusPx:14,lonlat,radiusM:10});
  const nodes=[
    {...base.nodes.find(n=>n.id==='cases')!,x:20,y:60},
    {...base.nodes.find(n=>n.id==='village')!,x:20,y:320},
    {id:'sheet',type:'map_image_input',x:20,y:580,params:{label:'The 1824 cadastral sheet',
      image:{width:0,height:0,bytes:0,sha256:''},bounds:[0,0,0,0],placement:'points' as const,placementModel:'north-up' as const,opacity:0.85,
      offered:{url:'./examples/hagelloch-1861/flurkarte-nw-iii-3-1824.jpg',filename:'flurkarte-nw-iii-3-1824.jpg',
        credit:'Flurkarte NW III 3, 1824. Landesarchiv Baden-Württemberg, Staatsarchiv Ludwigsburg EL 68 VI Nr 7243, Public Domain Mark.',
        width:2200,height:2489},
      guide:[
        junction('North road, above the stream','The road north out of the village, just above the stream (the thick wavy line on the sheet), where a field path meets it.',[1171.6,1553.3],[9.0125918,48.542892]),
        junction('West entry','Where the road from the west reaches the first houses and meets the lane along the gardens.',[951.4,1853.6],[9.01056,48.5410433]),
        junction('North fork','Where the street from the north meets the main street through the village. Both are drawn in 1824 and still meet here.',[1192.1,1667.3],[9.0127814,48.5421903]),
        junction('South lane','Where a lane leaves the main street southward between the houses.',[1120.8,1709.3],[9.0121234,48.5419319]),
      ]}},
    {id:'sheet-map',type:'map_output',x:430,y:60,params:{label:'The cases on the 1824 sheet',presentation:'plot' as const,
      mapTitle:'Measles cases, 1861, on the cadastral sheet of 1824',
      // Vermillion, the one hue on a black-and-white sheet (the practitioner, 2026-11-11); it was a near-black purple.
      layerSymbols:{cases:{colour:'#D55E00',size:3}}}},
  ];
  const edges=[
    {id:'cases-sheet-map',from:'cases',to:'sheet-map',port:'points'},
    {id:'village-sheet-map',from:'village',to:'sheet-map',port:'area'},
    {id:'sheet-ground',from:'sheet',to:'sheet-map',port:'ground'},
  ];
  return {schema:'fieldwork/workflow/1',name:'The 1824 sheet, placed by hand. Hagelloch',
    exampleId:'hagelloch-sheet',nodes,edges} as unknown as Workflow;
}

/** WHO FELL ILL (the practitioner, 2026-11-12: Hagelloch had no demographics described in any chart or table). The same
 *  188 children by age and gender, and by school class, counted by Total within groups from the cases as the file has
 *  them: the 11 children with no gender recorded are a group of their own, and `class` is shown as its codes. */
export function hagellochPeopleExample():Workflow{
  const base=hagellochExample();
  const nodes=[
    {...base.nodes.find(n=>n.id==='cases')!,x:20,y:60},
    {id:'by-age-gender',type:'group_table',x:400,y:40,params:{label:'Cases by age and gender',by:['age','gender'],aggregate:'count'}},
    {id:'age-chart',type:'chart_output',x:780,y:40,params:{label:'Age and gender pyramid',keyColumn:'age',panelsBy:'gender',figure:'pyramid' as const,
      chartTitle:'Measles cases by age and gender, Hagelloch, 1861',yAxisTitle:'Age in years'}},
    {id:'age-table',type:'table_output',x:780,y:250,params:{label:'Cases by age and gender'}},
    {id:'by-class',type:'group_table',x:400,y:420,params:{label:'Cases by school class',by:['class'],aggregate:'count'}},
    {id:'class-table',type:'table_output',x:780,y:420,params:{label:'Cases by school class'}},
    // WHEN, AMONG WHICH CLASS (experiment 210, 2026-11-12): the epidemic curve stacked by school class, a related question
    // the data already answer. Class as the file codes it, 0 to 2, every child carrying one.
    {id:'class-curve',type:'case_series',x:400,y:620,params:{label:'Cases by day of prodrome, by school class',source:'points',
      dateField:'date_of_prodrome',dateKind:'onset',period:'week',splitBy:'class'}},
    {id:'class-curve-chart',type:'chart_output',x:780,y:620,params:{label:'Epidemic curve by school class',figure:'stacked' as const,
      chartTitle:'Measles cases by week of prodrome and school class, Hagelloch, 1861',yAxisTitle:'Cases',
      // The codes as the file holds them, their meaning as its provenance records it.
      subtitle:'School class as the file codes it: 0 pre-school, 1 first class, 2 second class.'}},
  ];
  const edges=[
    {id:'cases-age',from:'cases',to:'by-age-gender',port:'records'},
    {id:'age-chart-in',from:'by-age-gender',to:'age-chart',port:'records'},
    {id:'age-table-in',from:'by-age-gender',to:'age-table',port:'table'},
    {id:'cases-class',from:'cases',to:'by-class',port:'records'},
    {id:'class-table-in',from:'by-class',to:'class-table',port:'table'},
    {id:'cases-class-curve',from:'cases',to:'class-curve',port:'points'},
    {id:'class-curve-out',from:'class-curve',to:'class-curve-chart',port:'records'},
  ];
  return {schema:'fieldwork/workflow/1',name:'Who fell ill? Hagelloch, 1861',
    exampleId:'hagelloch-people',nodes,edges} as unknown as Workflow;
}
