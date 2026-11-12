/** DATA ISSUES IN ONE VOCABULARY (experiment 207): the kinds `ontology/fieldwork.ttl` declares, the label each shows
 *  on screen, and the one function that writes them into a step's receipt. A unit test reads each kind here from the
 *  ontology, label and all, so the screen and the evidence cannot say two things. */
export type DataIssueKind='ValueAbsent'|'ValueUnreadable'|'KeyAbsent'|'KeyRepeated'|'ColumnUndescribed'|'DescriptionUnconfirmed'
  |'DictionaryMismatch'|'DeclarationAbsent'|'DivisionByZero'|'ConclusionsConflict'|'SiteUnreachable'|'RoutedOffNetwork'
  |'FieldMissing'|'ValueEmpty'|'BeyondFence';

export const ISSUE_LABEL:Record<DataIssueKind,string>={
  ValueAbsent:'No value',ValueUnreadable:'Not the declared kind',KeyAbsent:'No key',KeyRepeated:'Key repeated',
  ColumnUndescribed:'Column not described',DescriptionUnconfirmed:'Description not confirmed',
  DictionaryMismatch:'Disagrees with the data dictionary',DeclarationAbsent:'Not declared',DivisionByZero:'Divided by zero',
  ConclusionsConflict:'Rules disagree',SiteUnreachable:'No result',RoutedOffNetwork:'Routed off the network',
  FieldMissing:'Field missing',ValueEmpty:'Empty',BeyondFence:'Beyond 1.5×IQR',
};

export interface FoundIssue {kind:DataIssueKind; column?:string; count?:number; of?:number; says?:string}

/** THE ISSUES AS N3, ABOUT THE DATA (the practitioner, 2026-11-12: "Data issues are upstream problems"). Each issue is
 *  its own resource, a measurement of its kind computed on the data it was found in (`about`), which lists it among its
 *  quality measurements; the step that found it is what generated it. `activity` and `about` are IRIs in angle
 *  brackets; `base` names the issues, unique within the run. Empty for none. */
export function issueFacts(activity:string,about:string,base:string,issues:readonly FoundIssue[]):string{
  const DQV='http://www.w3.org/ns/dqv#',FW='urn:fieldwork:';
  return issues.map((issue,i)=>{
    const node=`<${base}:issue:${i+1}>`;
    return `${about} <${DQV}hasQualityMeasurement> ${node}.\n`
      +`${node} a <${FW}DataIssue>; <${DQV}computedOn> ${about}; <http://www.w3.org/ns/prov#wasGeneratedBy> ${activity}; `
      +`<${DQV}isMeasurementOf> <${FW}${issue.kind}>; <${FW}issueKind> <${FW}${issue.kind}>`
      +(issue.column!==undefined?`; <${FW}issueColumn> ${JSON.stringify(issue.column)}`:'')
      +(issue.count!==undefined?`; <${FW}affectedRecordCount> ${issue.count}`:'')
      +(issue.of!==undefined?`; <${FW}consideredRecordCount> ${issue.of}`:'')
      +(issue.says?`; <http://www.w3.org/2000/01/rdf-schema#comment> ${JSON.stringify(issue.says)}`:'')+`.`;
  }).join('\n')+(issues.length?'\n':'');
}

/** WHAT THE DATA QUALITY INSPECTOR SHOWS FOR A TABLE, as data issues for its receipt (experiment 207): the findings
 *  reading the table made, and each column's profile, through the same `profileColumn` the inspector draws. */
const FINDING_KIND:Record<string,DataIssueKind>={'repeated-key':'KeyRepeated','missing-key':'KeyAbsent','unreadable-value':'ValueUnreadable',
  'undescribed-column':'ColumnUndescribed','unconfirmed-description':'DescriptionUnconfirmed','dictionary-mismatch':'DictionaryMismatch'};
export function tableIssues(
  findings:readonly {kind:string; rows:number[]; column?:string; text:string}[],
  columns:readonly string[],rows:readonly Record<string,unknown>[],
  profile:(column:string,values:unknown[])=>{total:number; missing:number; empty:number; mismatched:number; numeric?:{beyondFence:number}},
):FoundIssue[]{
  // A finding about rows is counted in rows and, once grouped, said as a count; a finding about the columns' meaning is
  // said as the finding says it, with no row count, which would mean nothing.
  const grouped=new Map<string,FoundIssue&{first:number[]; text:string; n:number}>();
  for(const f of findings){
    const kind=FINDING_KIND[f.kind];if(!kind)continue;
    const at=`${kind}\u0000${f.column??''}`,held=grouped.get(at);
    if(held){held.n++;held.count=(held.count??0)+f.rows.length;continue;}
    grouped.set(at,{kind,...(f.column?{column:f.column}:{}),count:f.rows.length,first:f.rows,text:f.text,n:1});
  }
  const fromFindings=[...grouped.values()].map(({first,text,n,count,...issue}):FoundIssue=>!count
    ?{...issue,says:text}
    :{...issue,count,of:rows.length,says:n===1?text
      :`${ISSUE_LABEL[issue.kind]}${issue.column?` in ${issue.column}`:''}: ${count} of ${rows.length} rows, the first at row ${first[0]}.`});
  const profiled:FoundIssue[]=[];
  for(const column of columns){
    const p=profile(column,rows.map(r=>r[column]));
    const add=(kind:DataIssueKind,count:number,says:string)=>{if(count)profiled.push({kind,column,count,of:p.total,says});};
    add('FieldMissing',p.missing,`${p.missing} of ${p.total} records do not carry ${column}.`);
    add('ValueEmpty',p.empty,`${p.empty} of ${p.total} records carry ${column} empty.`);
    add('ValueUnreadable',p.mismatched,`${p.mismatched} of ${p.total} values of ${column} are not the declared kind.`);
    add('BeyondFence',p.numeric?.beyondFence??0,`${p.numeric?.beyondFence??0} of ${p.total} values of ${column} lie beyond the quartile fence.`);
  }
  return [...fromFindings,...profiled];
}
