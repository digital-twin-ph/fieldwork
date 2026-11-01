import{g as k}from"./chunk-FNKA5ZT3.js";var q={"Katz log":{published:"1978",citation:{type:"article",authors:[{family:"Katz",given:"D"},{family:"Baptista",given:"J"},{family:"Azen",given:"S P"},{family:"Pike",given:"M C"}],title:"Obtaining confidence intervals for the risk ratio in cohort studies",container:"Biometrics",volume:"34",issue:"3",pages:"469-474",doi:"10.2307/2530610"}},"Wald log":{published:"1955",citation:{type:"article",authors:[{family:"Woolf",given:"B"}],title:"On estimating the relation between blood group and disease",container:"Annals of Human Genetics",volume:"19",issue:"4",pages:"251-253",doi:"10.1111/j.1469-1809.1955.tb01348.x"}},"Wald unpooled":{citation:null,uncited:"A Wald interval on a difference of two proportions. No primary source has been read for it: the construction is standard and the implementations consulted state it without attributing it, so none is cited here rather than a plausible textbook being named."},"log-normal":{citation:null,uncited:"A log-normal interval on a ratio of two rates. No primary source has been read for it: the construction is standard and the implementations consulted state it without attributing it, so none is cited here."}},D="vancouver";function C(t){let e=q[t];if(e?.citation)return k({licence:"none-applies",published:e.published,citation:e.citation},D)}var A=t=>t.replace(/[\\{}$&#^_%~]/g,e=>e==="\\"?"\\backslash ":`\\${e}`),_=t=>`\\text{${A(t)}}`,o=(t,e=0)=>t.toLocaleString("en-US",{minimumFractionDigits:e,maximumFractionDigits:e}).replace(/,/g,"{,}"),s=(t,e)=>o(Number(t.toFixed(e)),e),m=t=>t.toLocaleString("en-US");function S(t){let e=[...new Set(t)].map(n=>C(n)?n:`${n} (no primary source read)`);return e.length?`

Method: ${e.join(", ")}. The works are in References.`:""}var x=(t,e)=>{let n=Math.abs(t.value??0)<.01?6:2;return`

$$${e}$$

$$= ${s(t.lower??0,n)} \\text{ to } ${s(t.upper??0,n)} \\quad (${t.level}\\%)$$`};function L(t,e){let{numeratorField:n,denominatorField:r,multiplier:i,denominatorUnit:c,rateKind:d}=t.options;if(t.overall===null)return null;let l=`per ${m(i)} ${c}`,h=`The ${d==="proportion"?"proportion":"rate"} is ${n} divided by ${r}, times ${i.toLocaleString()}:

$$\\text{rate} = \\frac{${_(n)}}{${_(r)}} \\times ${o(i)}$$

Each group has its own rate, in the table this step produces. Totalled over all ${t.rows.length} of them \u2014 ${m(t.totalNumerator)} ${n} and ${m(t.totalDenominator)} ${r}:

$$\\frac{${o(t.totalNumerator)}}{${o(t.totalDenominator)}} \\times ${o(i)} = ${s(t.overall,3)}$$

That is ${s(t.overall,3)} ${l}, for the numerator over ${t.options.numeratorPeriod} against a denominator of ${t.options.denominatorVintage}. The unit is what makes this comparable or not: a ${d} per ${c} and one per anything else are different quantities even where the division looks the same.

No interval is computed here, so no method is cited: the division is arithmetic and the multiplier is a scale rather than an estimator.`;return{kind:"machined",id:`${e}:equation`,section:"Methods",fn:"method",text:h,nodeId:e}}function z(t,e){let{compared:n,reference:r,ratio:i,lower:c,upper:d,level:l,method:h}=t,p=Math.abs(Math.log(d/i))/Math.sqrt(1/n.events+1/r.events),f=`The rate ratio is ${n.label}'s rate over ${r.label}'s. Both rates are per ${t.denominatorUnit}, so the multiplier cancels and the ratio is dimensionless:

$$\\mathrm{RR} = \\frac{a_1 / n_1}{a_0 / n_0}$$

with $a_1$ and $n_1$ the events and ${t.denominatorUnit} at risk in ${n.label}, and $a_0$ and $n_0$ the same in ${r.label}:

$$\\mathrm{RR} = \\frac{${o(n.events)} / ${o(n.unitsAtRisk)}}{${o(r.events)} / ${o(r.unitsAtRisk)}} = ${s(i,2)}$$

The ${l}% interval is computed on the log scale and transformed back, because a ratio is not symmetric about its point estimate:

$$\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\frac{1}{a_1} + \\frac{1}{a_0}}\\right)$$

$$\\exp\\left(\\ln ${s(i,4)} \\pm ${s(p,6)} \\sqrt{\\frac{1}{${o(n.events)}} + \\frac{1}{${o(r.events)}}}\\right) = ${s(c,2)} \\text{ to } ${s(d,2)}$$

The interval describes sampling variation in these counts alone. It is not a p-value, and nothing here adjusts for anything the two groups did not share.`+S([h]);return{kind:"machined",id:`${e}:equation`,section:"Methods",fn:"method",text:f,nodeId:e,cites:[h]}}var E={"risk ratio":"RR","odds ratio":"OR","risk difference":"RD","prevalence ratio":"PR","prevalence odds ratio":"POR","prevalence difference":"PD"},y=(t,e,n)=>`

**${t.reportedAs??t.name}**, ${t.method}:`+(t.unavailable?`

$$${e}$$

Not computed: ${t.unavailable}`:`

$$${e}$$

$$${n}$$`);function F(t,e){let{exposed:n,unexposed:r,caseValue:i,nonCaseValue:c,exposureColumn:d}=t.request,{exposedCases:l,exposedNonCases:h,unexposedCases:p,unexposedNonCases:f}=t.cells,u=o(l),j=o(h),g=o(p),O=o(f),v=o(t.exposedTotal),R=o(t.unexposedTotal),b=a=>`${d} "${a}"`,N=t.reading?t.reading.rowProportion:"risk",$=`The four cells, in the letters every formula below is written in:

- $a$ = ${m(l)} \u2014 ${b(n)}, ${i}
- $b$ = ${m(h)} \u2014 ${b(n)}, ${c}
- $c$ = ${m(p)} \u2014 ${b(r)}, ${i}
- $d$ = ${m(f)} \u2014 ${b(r)}, ${c}`+(N===null?"":`

The ${N}s are $a/(a+b)$ and $c/(c+d)$:

$$\\frac{${u}}{${v}} = ${s(t.riskExposed??0,5)} \\qquad \\frac{${g}}{${R}} = ${s(t.riskUnexposed??0,5)}$$`),w=[];for(let a of t.estimates){w.push(a.method);let M=$.length;a.name==="risk ratio"?$+=y(a,"\\mathrm{RR} = \\frac{a/(a+b)}{c/(c+d)}",`\\mathrm{RR} = \\frac{${u}/${v}}{${g}/${R}} = ${s(a.value??0,2)}`)+(a.unavailable?"":x(a,"\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\tfrac{1}{a} - \\tfrac{1}{a+b} + \\tfrac{1}{c} - \\tfrac{1}{c+d}}\\right)")):a.name==="odds ratio"?$+=y(a,"\\mathrm{OR} = \\frac{ad}{bc}",`\\mathrm{OR} = \\frac{${u} \\times ${O}}{${j} \\times ${g}} = ${s(a.value??0,2)}`)+(a.unavailable?"":x(a,"\\exp\\left(\\ln \\mathrm{OR} \\pm z \\sqrt{\\tfrac{1}{a} + \\tfrac{1}{b} + \\tfrac{1}{c} + \\tfrac{1}{d}}\\right)")):a.name==="risk difference"&&($+=y(a,"\\mathrm{RD} = \\frac{a}{a+b} - \\frac{c}{c+d}",`\\mathrm{RD} = \\frac{${u}}{${v}} - \\frac{${g}}{${R}} = ${s(a.value??0,6)}`)+(a.unavailable?"":`

with $p_1 = a/(a+b)$ and $p_0 = c/(c+d)$, each group contributing its own variance rather than a pooled one:`+x(a,"\\mathrm{RD} \\pm z \\sqrt{\\frac{p_1(1-p_1)}{a+b} + \\frac{p_0(1-p_0)}{c+d}}"))),a.reportedAs&&($=$.slice(0,M)+$.slice(M).split(`\\mathrm{${E[a.name]}}`).join(`\\mathrm{${E[a.reportedAs]}}`))}let T=[...t.reading?.withheld??[],...t.reading?.notEstimable??[]];return T.length&&($+=`

Not reported under this design: ${T.join(", ")}.`),t.strataLeftOut.length&&($+=`

This table also holds ${t.strataLeftOut.map(a=>`"${a}"`).join(", ")} in ${d}, which is in neither group, so the letters above total ${m(t.total)} and not the table.`),$+=S(w),{kind:"machined",id:`${e}:equation`,section:"Methods",fn:"method",text:$,nodeId:e,cites:[...new Set(w)]}}function P(t,e){let n=i=>JSON.stringify(i),r=i=>{let c=C(i),d=q[i]?.uncited,l=c?`fw:methodReference ${n(c)}`:`fw:methodUncited ${n(d||"No source has been read for this method.")}`;return`fw:citesMethod [ a fw:MethodCitation; fw:methodName ${n(i)}; ${l} ]`};return e.map(i=>`${t} fw:machinedNote [ a fw:MachinedNote; fw:noteSection ${n(i.section)}; `+(i.fn?`fw:noteFunction ${n(i.fn)}; `:"")+[...new Set(i.cites||[])].map(c=>`${r(c)}; `).join("")+`fw:noteText ${n(i.text)} ].
`).join("")}export{q as a,D as b,C as c,L as d,z as e,F as f,P as g};
//# sourceMappingURL=chunk-MZ4KDNGD.js.map
