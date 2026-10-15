/** A worked example whose subject is the ruleset widget itself.
 *
 *  The practitioner's proposal, 2026-10-15: *"We should have a worked example just for the
 *  ruleset widget to exercise different ruleset conditions so users can also see examples of how
 *  to configure it. That is one way to execute widget rules and validate at the same time."*
 *
 *  Every other worked example is about a place or a question -- Soho in 1854, access in Old
 *  Naledi -- and the widgets are how it gets answered. This one is the other way round: the
 *  subject is the widget, and the clinic data is synthetic and deliberately small so a reader can
 *  hold all of it in their head while they read the rules.
 *
 *  It exercises one condition kind per step, and because it RUNS, it checks them. A rule form
 *  that compiles but does not fire is caught here rather than in a unit test that only compares
 *  text.
 */
import type {PointCollection,PointFeature,PortType,Workflow} from './types.js';
import {pinnedRuleset} from './rule-application.js';
import {bboxPolygon} from './study-area.js';

const site=(id:string,name:string,lon:number,lat:number,
  properties:Record<string,string|number|boolean|null>):PointFeature=>
  ({type:'Feature',id,properties:{name,...properties} as PointFeature['properties'],
    geometry:{type:'Point',coordinates:[lon,lat]}});

/** Twelve service points around one town. Synthetic, and chosen so that every branch of every
 *  rule below has at least one record in it -- including the branches a reader is most likely to
 *  forget: a missing waiting time, and a category nobody declared. */
const sites=():PointCollection=>({type:'FeatureCollection',features:[
  site('s1','Riverside clinic',25.902,-24.683,{category:'clinic',wait_minutes:12,open_today:true}),
  site('s2','Hilltop clinic',25.908,-24.679,{category:'clinic',wait_minutes:48,open_today:true}),
  site('s3','Market pharmacy',25.912,-24.686,{category:'pharmacy',wait_minutes:5,open_today:true}),
  site('s4','Station pharmacy',25.897,-24.690,{category:'pharmacy',wait_minutes:33,open_today:false}),
  site('s5','North health post',25.905,-24.672,{category:'health_post',wait_minutes:21,open_today:true}),
  site('s6','South health post',25.899,-24.697,{category:'health_post',wait_minutes:62,open_today:false}),
  site('s7','Mobile unit · Tuesday',25.916,-24.675,{category:'mobile',wait_minutes:15,open_today:true}),
  site('s8','Mobile unit · Friday',25.893,-24.681,{category:'mobile',wait_minutes:15,open_today:false}),
  // No waiting time recorded. The rules conclude Unknown rather than treating it as zero, which
  // is what the ...Known fact is for.
  site('s9','Old dispensary',25.919,-24.692,{category:'pharmacy',wait_minutes:null,open_today:true}),
  site('s10','Night desk',25.888,-24.687,{category:'clinic',wait_minutes:7,open_today:false}),
  site('s11','Railway aid room',25.922,-24.701,{category:'other',wait_minutes:26,open_today:true}),
  site('s12','Depot window',25.885,-24.695,{category:'other',wait_minutes:95,open_today:true}),
  // Exactly on the boundary of step 4's parameter. `is less than 10` excludes it and `is at
  // least 10` includes it, which is the whole difference between those two comparators and the
  // case a reader checks first. Every boundary in this example has a record standing on it.
  site('s13','Corner surgery',25.910,-24.700,{category:'clinic',wait_minutes:10,open_today:true}),
]});

/** The bindings every step shares: which attribute means which predicate in the rules. */
const FIELDS=[
  {attribute:'wait_minutes',predicate:'fwa:waitMinutes',kind:'number' as const,label:'Wait (minutes)',unitLabel:'min'},
  {attribute:'category',predicate:'fwa:category',kind:'term' as const,label:'Kind of service point'},
  {attribute:'open_today',predicate:'fwa:openToday',kind:'boolean' as const,label:'Open today'},
];

/** A pin that gives the node its ports. An authored ruleset has no published artefact, so this
 *  names the form rather than a version of anything: the rules live on the node. */
const authoredPin=()=>{
  const pin=pinnedRuleset('urn:fieldwork:ruleset:outreach-criteria','1.0.0')!;
  return {id:pin.id,version:pin.version,title:'Rules written in this workflow',
    inputs:[['subjects','points']] as [string,PortType][],output:'points' as PortType};
};

export function rulesetExample():Workflow{
  return {schema:'fieldwork/workflow/1',exampleId:'rulesets',
    name:'Rulesets · how a rule is put together',
    nodes:[
      {id:'town',type:'study_area',x:40,y:40,params:{source:'drawn' as const,
        label:'Illustrative town box',selectionMode:'bbox' as const,
        geometry:bboxPolygon(25.88,-24.705,25.926,-24.668)}},
      {id:'sites',type:'point_input',x:40,y:200,params:{label:'Twelve service points (synthetic)',
        data:sites(),
        fields:[{key:'category',label:'Kind of service point',type:'text'},
          {key:'wait_minutes',label:'Wait (minutes)',type:'number'},
          {key:'open_today',label:'Open today',type:'boolean'}],
        sourceInfo:{format:'manual' as const}}},

      // 1 · One band, two comparisons on one field. The simplest rule that is not a yes/no.
      {id:'wait',type:'apply_ruleset',x:380,y:60,params:{
        label:'1 · Banding a number',parameters:{threshold:30},
        ruleset:authoredPin(),
        authored:{title:'Waiting time, in bands',
          parameters:[{name:'threshold',meaning:'Wait above which a service point is called Long.',unitLabel:'min',min:0,max:600,decimals:0}],
          mustNotBeReadAs:'A measurement of how long anyone actually waited. These are reported figures for one synthetic day.',
          fields:FIELDS,
          rules:[
            {any:[{all:[{field:'fwa:waitMinutesKnown',comparator:'equals',value:false}]}],
             then:[{predicate:'fwa:band',value:'fwa:Unrecorded'}]},
            {any:[{all:[{field:'fwa:waitMinutes',comparator:'notGreaterThan',value:15}]}],
             then:[{predicate:'fwa:band',value:'fwa:Short'}]},
            {any:[{all:[{field:'fwa:waitMinutes',comparator:'greaterThan',value:15},
                        {field:'fwa:waitMinutes',comparator:'notGreaterThan',value:'{{threshold}}'}]}],
             then:[{predicate:'fwa:band',value:'fwa:Medium'}]},
            {any:[{all:[{field:'fwa:waitMinutes',comparator:'greaterThan',value:'{{threshold}}'}]}],
             then:[{predicate:'fwa:band',value:'fwa:Long'}]},
          ]}}},

      // 2 · Two alternatives reaching the same conclusion, and two conclusions from one rule.
      {id:'review',type:'apply_ruleset',x:380,y:330,params:{
        label:'2 · Alternatives, and two conclusions at once',parameters:{threshold:30},
        ruleset:authoredPin(),
        authored:{title:'Which service points to look at',
          parameters:[{name:'threshold',meaning:'Wait above which a closed service point is worth looking at.',unitLabel:'min',min:0,max:600,decimals:0}],
          mustNotBeReadAs:'A judgement about any service point. It is an illustration of how alternatives are written.',
          fields:FIELDS,
          rules:[
            {any:[{all:[{field:'fwa:waitMinutesKnown',comparator:'equals',value:false}]}],
             then:[{predicate:'fwa:decision',value:'fwa:Unknown'},{predicate:'fwa:reason',value:'fwa:NoWaitRecorded'}]},
            // Either a long wait, OR closed today with a wait over the threshold. One rule, two
            // groups: this is what "any" means, and each group is an "all".
            {any:[{all:[{field:'fwa:waitMinutesKnown',comparator:'equals',value:true},
                        {field:'fwa:waitMinutes',comparator:'greaterThan',value:60}]},
                  {all:[{field:'fwa:openToday',comparator:'equals',value:false},
                        {field:'fwa:waitMinutes',comparator:'greaterThan',value:'{{threshold}}'}]}],
             then:[{predicate:'fwa:decision',value:'fwa:Review'},{predicate:'fwa:reason',value:'fwa:LongOrClosed'}]},
            {any:[{all:[{field:'fwa:waitMinutesKnown',comparator:'equals',value:true},
                        {field:'fwa:waitMinutes',comparator:'notGreaterThan',value:60},
                        {field:'fwa:openToday',comparator:'equals',value:true}]}],
             then:[{predicate:'fwa:decision',value:'fwa:NoFlag'},{predicate:'fwa:reason',value:'fwa:OpenAndReasonable'}]},
            {any:[{all:[{field:'fwa:waitMinutesKnown',comparator:'equals',value:true},
                        {field:'fwa:waitMinutes',comparator:'notGreaterThan',value:'{{threshold}}'},
                        {field:'fwa:openToday',comparator:'equals',value:false}]}],
             then:[{predicate:'fwa:decision',value:'fwa:NoFlag'},{predicate:'fwa:reason',value:'fwa:ClosedButQuick'}]},
          ]}}},

      // 3 · Matching a category by name, one rule per kind.
      {id:'kind',type:'apply_ruleset',x:380,y:600,params:{
        label:'3 · Matching a category',parameters:{},
        ruleset:authoredPin(),
        authored:{title:'What each kind of service point can do',
          mustNotBeReadAs:'A statement about what any real clinic or pharmacy offers.',
          fields:FIELDS,
          rules:[
            {any:[{all:[{field:'fwa:category',comparator:'equals',value:'fwa:clinic'}]}],
             then:[{predicate:'fwa:service',value:'fwa:Consultation'}]},
            {any:[{all:[{field:'fwa:category',comparator:'equals',value:'fwa:pharmacy'}]}],
             then:[{predicate:'fwa:service',value:'fwa:Dispensing'}]},
            {any:[{all:[{field:'fwa:category',comparator:'equals',value:'fwa:health_post'}]},
                  {all:[{field:'fwa:category',comparator:'equals',value:'fwa:mobile'}]}],
             then:[{predicate:'fwa:service',value:'fwa:FirstContact'}]},
            // `other` is left unmatched on purpose: a ruleset may decline to classify, and the
            // receipt says how many it declined. Reading silence as a conclusion is the trap.
          ]}}},

      // 4 · The two comparators nothing had ever executed. `lessThan` and `notLessThan` compiled
      // from the day the compiler was written and were run by no test and no example, so by
      // experiment 106's own rule they should not have been offered in the editor. They are
      // offered, and this step is what makes that defensible: running this example executes
      // them against the real engine, over a boundary value in each direction.
      {id:'walkin',type:'apply_ruleset',x:380,y:860,params:{
        label:'4 · Bounds from below',parameters:{quiet:10},
        ruleset:authoredPin(),
        authored:{title:'Walk in, or make an appointment',
          parameters:[{name:'quiet',meaning:'Wait below which a service point is quiet enough to walk into.',unitLabel:'min',min:0,max:600,decimals:0}],
          mustNotBeReadAs:'Advice about attending anywhere. It exists to exercise the two comparators the rest of the example does not use.',
          fields:FIELDS,
          rules:[
            {any:[{all:[{field:'fwa:waitMinutesKnown',comparator:'equals',value:false}]}],
             then:[{predicate:'fwa:access',value:'fwa:Unrecorded'}]},
            {any:[{all:[{field:'fwa:waitMinutes',comparator:'lessThan',value:'{{quiet}}'}]}],
             then:[{predicate:'fwa:access',value:'fwa:WalkIn'}]},
            {any:[{all:[{field:'fwa:waitMinutes',comparator:'notLessThan',value:'{{quiet}}'}]}],
             then:[{predicate:'fwa:access',value:'fwa:Appointment'}]},
          ]}}},

      {id:'bands',type:'table_output',x:760,y:60,params:{label:'1 · Bands',inputMode:'spatial'}},
      {id:'decisions',type:'table_output',x:760,y:330,params:{label:'2 · Decisions',inputMode:'spatial'}},
      {id:'map',type:'map_output',x:760,y:600,params:{label:'3 · Service points by kind'}},
      {id:'access',type:'table_output',x:760,y:860,params:{label:'4 · Walk in or appointment',inputMode:'spatial'}},
    ],
    edges:[
      {id:'e1',from:'sites',to:'wait',port:'subjects'},
      {id:'e2',from:'sites',to:'review',port:'subjects'},
      {id:'e3',from:'sites',to:'kind',port:'subjects'},
      {id:'e4',from:'wait',to:'bands',port:'points'},
      {id:'e5',from:'review',to:'decisions',port:'points'},
      {id:'e6',from:'kind',to:'map',port:'points'},
      {id:'e7',from:'town',to:'map',port:'area'},
      {id:'e8',from:'sites',to:'walkin',port:'subjects'},
      {id:'e9',from:'walkin',to:'access',port:'points'},
    ]};
}
