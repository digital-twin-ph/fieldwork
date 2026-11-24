/** THE PERIOD A SET OF VALUES REFERS TO, carried with them and compared where two of them meet (experiment 230).
 *
 *  The practitioner, 2026-11-23, after the population example ran end to end again: *"As part of provenance alignment
 *  and accuracy, do we track and compare the years for which rasters and other assets?"*
 *
 *  Experiment 230's inventory found the year stated in eight places and compared in one. A table sampled from a
 *  raster carries the unit the raster declared, and has since 0.154.0, but not its year; Append rows stacks a 2025
 *  model under a 2022 census and nothing says they are three years apart; DR Congo's census is of 1984, so a 2025
 *  raster beside it is forty-one years later and nothing says that either. The years that did reach a reader were in
 *  labels the practitioner had typed.
 *
 *  So the period travels the way the UNIT travels (`automate-what-the-data-states`): read from what the source
 *  states, carried forward on the values a step makes, and said where values of different periods meet.
 *
 *  SAID, NEVER REFUSED. A unit difference is a hard stop in Append rows, because stacking counts of people under
 *  counts of houses is wrong. A period difference is not wrong -- a 2022 denominator under 2024 cases is ordinary
 *  field epidemiology -- it is something the reader must be able to see. `diagnose-never-refuse-data`.
 *
 *  COMPARED ON THE YEAR, carrying whatever precision the source stated (the practitioner, 2026-11-24, choosing
 *  between year-only, reducing to the year on read, and comparing at the finest precision both state: *"Carry what's
 *  stated, compare on the year"*). Census tables holds four precisions -- `2022`, `2022-08`, `2022-07-31`,
 *  `1984-07-01` -- and reducing them on read would throw away what the statistics office published. Comparing at the
 *  finest shared precision would report Rwanda's `2022-08` against Botswana's `2022` as a difference, which is the
 *  defect this fixes rather than a finding. */

/** WHAT KIND OF NUMBER THE PERIOD BELONGS TO, where the source says. A projection of 2030 and an enumeration of 2030
 *  are both "2030" and are not the same claim, so the kind travels with the period and is said beside it. */
export type ReferencePeriodKind='enumerated'|'estimated'|'projected'|'not-stated';

export interface ReferencePeriod {
  /** As the source states it: ISO 8601, at whatever precision it gave. `''` where it stated none. */
  stated:string;
  kind:ReferencePeriodKind;
}

/** The first and last calendar year a stated period touches, or null where nothing can be read from it.
 *
 *  NULL IS NOT THIS YEAR. A source that states no period has none, and guessing one would put a date into a receipt
 *  that nobody published. */
export function yearsOf(stated:string|undefined):{from:number;to:number}|null{
  const text=(stated??'').trim();
  if(!text)return null;
  // A RANGE, as ISO 8601 writes one: `2015/2030`, or `2022-01/2022-12`.
  const parts=text.split('/');
  if(parts.length===2){
    const a=yearsOf(parts[0]),b=yearsOf(parts[1]);
    if(!a||!b)return null;
    return {from:Math.min(a.from,b.from),to:Math.max(a.to,b.to)};
  }
  const year=/^(\d{4})(?:-\d{2}(?:-\d{2})?)?$/.exec(text);
  return year?{from:Number(year[1]),to:Number(year[1])}:null;
}

/** HOW MANY YEARS APART two periods are: 0 where their years touch, otherwise the distance between the nearest years
 *  each covers. Null where either states nothing readable, because an unknown distance is not a distance of zero. */
export function yearGap(a:string|undefined,b:string|undefined):number|null{
  const x=yearsOf(a),y=yearsOf(b);
  if(!x||!y)return null;
  if(x.to>=y.from&&y.to>=x.from)return 0;
  return x.from>y.to?x.from-y.to:y.from-x.to;
}

/** Whether two periods are of the same year, which is what agreement means here. `2022-08` and `2022` agree;
 *  `2022` and `2025` do not. Unreadable on either side is NOT agreement, and is not disagreement either -- the
 *  caller says that it could not be read. */
export const sameYear=(a:string|undefined,b:string|undefined):boolean=>yearGap(a,b)===0;

/** THE KIND, IN WORDS, for a sentence a reader meets. `enumerated` is left unsaid where it is the only kind present:
 *  naming a census "enumerated" tells a field epidemiologist nothing they did not know. */
export const KIND_WORDS:Record<ReferencePeriodKind,string>={
  enumerated:'enumerated',estimated:'estimated',projected:'projected','not-stated':'of an unstated kind'};

/** A period as it is said: the years it covers, and its kind where that is worth saying. */
export function periodWords(period:ReferencePeriod|undefined):string{
  if(!period||!period.stated.trim())return 'no period stated';
  const years=yearsOf(period.stated);
  const span=!years?period.stated.trim():years.from===years.to?String(years.from):`${years.from} to ${years.to}`;
  return period.kind==='enumerated'||period.kind==='not-stated'?span:`${span}, ${KIND_WORDS[period.kind]}`;
}

/** WHAT TO SAY WHERE TWO PERIODS MEET, or null where there is nothing to say because they are of one year and one
 *  kind. A projection and an enumeration of the SAME year are still worth saying apart: they are different claims
 *  about the same calendar year, which is the distinction experiment 230 exists to keep. */
export function periodDifference(a:{label:string;period?:ReferencePeriod},b:{label:string;period?:ReferencePeriod}):string|null{
  const pa=a.period,pb=b.period;
  if(!pa?.stated.trim()||!pb?.stated.trim()){
    const missing=[!pa?.stated.trim()?a.label:'',!pb?.stated.trim()?b.label:''].filter(Boolean);
    return `${missing.join(' and ')} state${missing.length===1?'s':''} no period, so the years cannot be compared.`;
  }
  const gap=yearGap(pa.stated,pb.stated);
  if(gap===null)return `${a.label} states "${pa.stated}" and ${b.label} states "${pb.stated}", and neither reads as a year.`;
  if(gap>0)
    return `${a.label} is ${periodWords(pa)} and ${b.label} is ${periodWords(pb)}: ${gap} year${gap===1?'':'s'} apart.`;
  if(pa.kind!==pb.kind)
    return `${a.label} is ${periodWords(pa)} and ${b.label} is ${periodWords(pb)}: the same year, counted differently.`;
  return null;
}
