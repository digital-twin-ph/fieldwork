/** SYNTHETIC LAG DATA for experiment 185: four municipalities, forty weeks of cases that depend on the temperature two
 *  weeks earlier, and a satellite table with one period per week of which about one in six has no value, as a cloudy
 *  week does. Deterministic, so every run sees the same rows. */
// A deterministic generator, so the data and the numbers are the same on every run.
let seed=20261107;
const next=()=>(seed=(seed*1103515245+12345)%2147483648)/2147483648;
const day=i=>new Date(Date.UTC(2024,0,7+7*i)).toISOString().slice(0,10);
const places=['Angra','Barra','Campos','Duque'];
// THE SATELLITE TABLE: one period per week; about one week in six has no value, as a cloudy week does.
const sat=[];const temp={};
for(const m of places)for(let i=-4;i<44;i++){
  const t=26+4*Math.sin((i+places.indexOf(m))/6)+2*next();temp[`${m}|${i}`]=t;
  if(next()<1/6)continue;
  sat.push({key:{municipio:m,period_start:day(i),period_end:day(i+1).replace(/\d\d$/,d=>String(Number(d)).padStart(2,'0'))},
    value:Math.round(t*100)/100});
}
// The period ends the day before the next one starts.
for(const r of sat){const d=new Date(r.key.period_start+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+6);r.key.period_end=d.toISOString().slice(0,10);}
export const satellite={kind:'data-table',keys:['municipio','period_start','period_end'],valueField:'LST_Day_1km',
  rows:sat,rowCount:sat.length,missingValueCount:0};
// THE CASES, depending on the temperature two weeks earlier.
const caseRows=[];
for(const m of places)for(let i=0;i<40;i++){
  const mean=Math.exp(1.5+0.08*(temp[`${m}|${i-2}`]-26)+0.3*places.indexOf(m));
  caseRows.push({key:{municipio:m,data_iniSE:day(i),mes:day(i).slice(5,7)},value:Math.round(mean*(0.7+0.6*next()))});
}
export const cases={kind:'data-table',keys:['municipio','data_iniSE','mes'],valueField:'casos',rows:caseRows,
  rowCount:caseRows.length,missingValueCount:0};
