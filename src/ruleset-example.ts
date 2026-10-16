/** A worked example whose subject is the ruleset widget itself, over Snow's own data.
 *
 *  The practitioner's proposal, 2026-10-15: *"We should have a worked example just for the
 *  ruleset widget to exercise different ruleset conditions so users can also see examples of how
 *  to configure it."* Then, 2026-10-16: *"the rule sets in the example should be split into 2 but
 *  within the same canvas ... 1 workflow for table data and another for point data"*, and
 *  *"Why not use the John Snow data sets?"*
 *
 *  Why not indeed. The first version of this example invented a town of twelve clinics, which
 *  asked a reader to learn a fiction before they could read a rule. Snow's 1854 outbreak is
 *  already in this repository, already cited, and comes in exactly the two shapes this example
 *  needs to separate:
 *
 *  - **Table 1** is dates and counts and carries no place at all. 43 dated rows.
 *  - **The death locations** are places and carry a count each, and no date.
 *
 *  Those are the two halves, on one canvas, sharing nothing -- which is the point. A rule reads
 *  a predicate and a predicate is bound to an attribute, and that is as true of a table row as
 *  of a point. Making the table half run is what [experiment
 *  106](../docs/experiments/106-rule-builder-ui.md) had never checked.
 *
 *  **It carries no invented records.** The practitioner asked for it this way first: *"Yes let's
 *  build it that way, first without the boundary cases."* So every branch that fires here fires
 *  because Snow's data put a record in it, and a branch with no record in it stays visibly
 *  empty. That is a weaker guarantee than the synthetic version had -- it exercised every branch
 *  by construction -- and it is an honest one.
 */
import type {PointCollection,PointFeature,PortType,Workflow} from './types.js';
import type {DataTable} from './data-table.js';
import {pinnedRuleset} from './rule-application.js';
import {bboxPolygon} from './study-area.js';
import points from '../examples/john-snow/points.json';
import dates from '../examples/john-snow/dates.json';

/** A count is dimensionless, and says so. QUDT's `NUM` is the honest unit for "how many": not a
 *  metre or a minute, but not unitless either -- the check insists a number declare what it is,
 *  and "a number of deaths" is what this is. */
const COUNT='http://qudt.org/vocab/unit/NUM';

/** Snow 1855, Table 1: deaths by date of death. The value field is what the table measures. */
const deathsByDate=():DataTable=>({kind:'data-table',keys:['date'],valueField:'deaths',unit:'deaths',
  rows:(dates.rows as {date:string;deaths:number}[]).map(row=>({key:{date:row.date},value:row.deaths})),
  rowCount:dates.rows.length,missingValueCount:0});

/** The death locations Snow mapped. Each carries `DEATHS`, the number at that address. */
const deathLocations=():PointCollection=>
  ({type:'FeatureCollection',features:structuredClone(points.deaths) as PointFeature[]});

/** A pin that gives a node its ports. An authored ruleset has no published artefact, so this
 *  names the shape rather than a version of anything: the rules live on the node. */
const authoredPin=(port:PortType)=>{
  const pin=pinnedRuleset('urn:fieldwork:ruleset:outreach-criteria','1.0.0')!;
  return {id:pin.id,version:pin.version,title:'Rules written in this workflow',
    inputs:[['subjects',port]] as [string,PortType][],output:port};
};

const NOT_A_JUDGEMENT='A judgement about the 1854 outbreak, or about what any number of deaths '
  +'meant. These bands exist to show how a rule is put together, and the thresholds are settings '
  +'on the step rather than anything Snow or anyone else concluded.';

export function rulesetExample():Workflow{
  return {schema:'fieldwork/workflow/1',exampleId:'rulesets',
    name:'Rulesets · how a rule is put together',
    nodes:[
      // ── A · Table data ────────────────────────────────────────────────────────────────────
      // Dates and counts. No geometry anywhere in this half, which is the thing worth seeing:
      // a ruleset does not need a map.
      {id:'dates',type:'table_input',x:40,y:60,params:{label:'A · Snow 1855 Table 1 · deaths by date',
        keys:['date'],valueField:'deaths',unit:'deaths',data:deathsByDate(),
        source:{filename:'snow_dates.csv',bytes:828,sha256:'',rows:dates.rows.length}}},

      {id:'day',type:'apply_ruleset',x:380,y:60,params:{
        label:'A · Band each day by its deaths',parameters:{busy:20},
        ruleset:authoredPin('table'),
        authored:{title:'A day, banded by how many died on it',
          parameters:[{name:'busy',meaning:'Deaths in one day above which that day is banded Many.',
            unit:COUNT,unitLabel:'deaths',min:0,max:200,decimals:0}],
          mustNotBeReadAs:NOT_A_JUDGEMENT,
          fields:[{attribute:'deaths',predicate:'fwa:deaths',kind:'number' as const,
            label:'Deaths that day',unit:COUNT,unitLabel:'deaths'}],
          rules:[
            // The branch a reader forgets. Table 1 has no gaps, so this one does not fire --
            // and it stays, because a rule that handles a missing value is not wrong for having
            // nothing to handle yet, and the run counts what matched nothing.
            {any:[{all:[{field:'fwa:deathsKnown',comparator:'equals',value:false}]}],
             then:[{predicate:'fwa:day',value:'fwa:Unrecorded'}]},
            {any:[{all:[{field:'fwa:deaths',comparator:'notGreaterThan',value:0}]}],
             then:[{predicate:'fwa:day',value:'fwa:NoDeaths'}]},
            {any:[{all:[{field:'fwa:deaths',comparator:'greaterThan',value:0},
                        {field:'fwa:deaths',comparator:'notGreaterThan',value:{setting:'busy'}}]}],
             then:[{predicate:'fwa:day',value:'fwa:Few'}]},
            {any:[{all:[{field:'fwa:deaths',comparator:'greaterThan',value:{setting:'busy'}}]}],
             then:[{predicate:'fwa:day',value:'fwa:Many'}]},
          ]}}},

      {id:'day-table',type:'table_output',x:760,y:60,params:{label:'A · Days, banded',inputMode:'table'}},

      // ── B · Point data ────────────────────────────────────────────────────────────────────
      // The same widget, the same rule form, records with a place. The rules do not know the
      // difference and neither half reads the other: Table 1 carries no location and a location
      // carries no date, so the two cannot be joined, and this example does not pretend to.
      {id:'locations',type:'point_input',x:40,y:420,params:{
        label:'B · Death locations Snow mapped',data:deathLocations(),
        fields:[{key:'DEATHS',label:'Deaths at this address',type:'number'}],
        sourceInfo:{format:'GeoJSON' as const,
          description:'Death locations digitised from Snow’s map. A location carries no date, so this cannot be joined to Table 1.'}}},

      {id:'address',type:'apply_ruleset',x:380,y:420,params:{
        label:'B · Band each address, and flag the worst',parameters:{cluster:4},
        ruleset:authoredPin('points'),
        authored:{title:'An address, banded by how many died there',
          parameters:[{name:'cluster',meaning:'Deaths at one address above which it is banded a Cluster.',
            unit:COUNT,unitLabel:'deaths',min:1,max:50,decimals:0}],
          mustNotBeReadAs:NOT_A_JUDGEMENT,
          fields:[{attribute:'DEATHS',predicate:'fwa:deathsHere',kind:'number' as const,
            label:'Deaths at this address',unit:COUNT,unitLabel:'deaths'}],
          rules:[
            {any:[{all:[{field:'fwa:deathsHereKnown',comparator:'equals',value:false}]}],
             then:[{predicate:'fwa:address',value:'fwa:Unrecorded'}]},
            // `is less than` and `is at least`, which the table half above does not use. All
            // four numeric comparators are exercised across the two workflows, and every one of
            // them fires against Snow's own records -- no invented row stands on a boundary to
            // make a branch reachable.
            {any:[{all:[{field:'fwa:deathsHere',comparator:'lessThan',value:2}]}],
             then:[{predicate:'fwa:address',value:'fwa:Single'}]},
            {any:[{all:[{field:'fwa:deathsHere',comparator:'notLessThan',value:2},
                        {field:'fwa:deathsHere',comparator:'notGreaterThan',value:{setting:'cluster'}}]}],
             then:[{predicate:'fwa:address',value:'fwa:Several'}]},
            // Two conclusions from one rule: the band, and that this one is worth looking at.
            // One rule may conclude a list, and a reader meets that here rather than being told
            // about it.
            {any:[{all:[{field:'fwa:deathsHere',comparator:'greaterThan',value:{setting:'cluster'}}]}],
             then:[{predicate:'fwa:address',value:'fwa:Cluster'},
                   {predicate:'fwa:look',value:'fwa:Yes'}]},
          ]}}},

      // The map needs a boundary to draw within. Soho, taken from the extent of the locations
      // themselves rather than from a round number somebody chose.
      {id:'soho',type:'study_area',x:40,y:700,params:{source:'drawn' as const,
        label:'B · Soho, the extent of the mapped deaths',selectionMode:'bbox' as const,
        geometry:bboxPolygon(-0.1405,51.5115,-0.1325,51.5162)}},

      {id:'address-map',type:'map_output',x:760,y:420,params:{label:'B · Addresses, banded',
        mapTitle:'Death locations, banded by how many died at each',
        presentation:'plot' as const}},
      {id:'address-table',type:'table_output',x:760,y:700,params:{label:'B · Addresses, listed',inputMode:'spatial'}},
    ],
    edges:[
      {id:'a1',from:'dates',to:'day',port:'subjects'},
      {id:'a2',from:'day',to:'day-table',port:'table'},
      {id:'b1',from:'locations',to:'address',port:'subjects'},
      {id:'b2',from:'address',to:'address-map',port:'points'},
      {id:'b3',from:'address',to:'address-table',port:'points'},
      {id:'b4',from:'soho',to:'address-map',port:'area'},
    ]};
}
