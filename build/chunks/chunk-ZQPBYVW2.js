import{h as k}from"./chunk-NFLCAI7Q.js";var q={"Katz log":{published:"1978",citation:{type:"article",authors:[{family:"Katz",given:"D"},{family:"Baptista",given:"J"},{family:"Azen",given:"S P"},{family:"Pike",given:"M C"}],title:"Obtaining confidence intervals for the risk ratio in cohort studies",container:"Biometrics",volume:"34",issue:"3",pages:"469-474",doi:"10.2307/2530610"}},"Wald log":{published:"1955",citation:{type:"article",authors:[{family:"Woolf",given:"B"}],title:"On estimating the relation between blood group and disease",container:"Annals of Human Genetics",volume:"19",issue:"4",pages:"251-253",doi:"10.1111/j.1469-1809.1955.tb01348.x"}},"Wald unpooled":{citation:null,uncited:"A Wald interval on a difference of two proportions. No primary source has been read for it: the construction is standard and the implementations consulted state it without attributing it, so none is cited here rather than a plausible textbook being named."},"log-normal":{citation:null,uncited:"A log-normal interval on a ratio of two rates. No primary source has been read for it: the construction is standard and the implementations consulted state it without attributing it, so none is cited here."}},D="vancouver";function C(e){let t=q[e];if(t?.citation)return k({licence:"none-applies",published:t.published,citation:t.citation},D)}var A=e=>e.replace(/[\\{}$&#^_%~]/g,t=>t==="\\"?"\\backslash ":`\\${t}`),_=e=>`\\text{${A(e)}}`,a=(e,t=0)=>e.toLocaleString("en-US",{minimumFractionDigits:t,maximumFractionDigits:t}).replace(/,/g,"{,}"),s=(e,t)=>a(Number(e.toFixed(t)),t),m=e=>e.toLocaleString("en-US");function S(e){let t=[...new Set(e)].map(n=>C(n)?n:`${n} (no primary source read)`);return t.length?`

Method: ${t.join(", ")}. The works are in References.`:""}var x=(e,t)=>{let n=Math.abs(e.value??0)<.01?6:2;return`

$$${t}$$

$$= ${s(e.lower??0,n)} \\text{ to } ${s(e.upper??0,n)} \\quad (${e.level}\\%)$$`};function L(e,t){let{numeratorField:n,denominatorField:r,multiplier:i,denominatorUnit:c,rateKind:d}=e.options;if(e.overall===null)return null;let l=`per ${m(i)} ${c}`,h=`The ${d==="proportion"?"proportion":"rate"} is ${n} divided by ${r}, times ${i.toLocaleString()}:

$$\\text{rate} = \\frac{${_(n)}}{${_(r)}} \\times ${a(i)}$$

Each group has its own rate, in the table this step produces. Totalled over all ${e.rows.length} of them \u2014 ${m(e.totalNumerator)} ${n} and ${m(e.totalDenominator)} ${r}:

$$\\frac{${a(e.totalNumerator)}}{${a(e.totalDenominator)}} \\times ${a(i)} = ${s(e.overall,3)}$$

That is ${s(e.overall,3)} ${l}, for the numerator over ${e.options.numeratorPeriod} against a denominator of ${e.options.denominatorVintage}. The unit is what makes this comparable or not: a ${d} per ${c} and one per anything else are different quantities even where the division looks the same.

No interval is computed here, so no method is cited: the division is arithmetic and the multiplier is a scale rather than an estimator.`;return{kind:"machined",id:`${t}:equation`,section:"Methods",fn:"method",text:h,nodeId:t}}function z(e,t){let{compared:n,reference:r,ratio:i,lower:c,upper:d,level:l,method:h}=e,p=Math.abs(Math.log(d/i))/Math.sqrt(1/n.events+1/r.events),f=`The rate ratio is ${n.label}'s rate over ${r.label}'s. Both rates are per ${e.denominatorUnit}, so the multiplier cancels and the ratio is dimensionless:

$$\\mathrm{RR} = \\frac{a_1 / n_1}{a_0 / n_0}$$

with $a_1$ and $n_1$ the events and ${e.denominatorUnit} at risk in ${n.label}, and $a_0$ and $n_0$ the same in ${r.label}:

$$\\mathrm{RR} = \\frac{${a(n.events)} / ${a(n.unitsAtRisk)}}{${a(r.events)} / ${a(r.unitsAtRisk)}} = ${s(i,2)}$$

The ${l}% interval is computed on the log scale and transformed back, because a ratio is not symmetric about its point estimate:

$$\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\frac{1}{a_1} + \\frac{1}{a_0}}\\right)$$

$$\\exp\\left(\\ln ${s(i,4)} \\pm ${s(p,6)} \\sqrt{\\frac{1}{${a(n.events)}} + \\frac{1}{${a(r.events)}}}\\right) = ${s(c,2)} \\text{ to } ${s(d,2)}$$

The interval describes sampling variation in these counts alone. It is not a p-value, and nothing here adjusts for anything the two groups did not share.`+S([h]);return{kind:"machined",id:`${t}:equation`,section:"Methods",fn:"method",text:f,nodeId:t,cites:[h]}}var E={"risk ratio":"RR","odds ratio":"OR","risk difference":"RD","prevalence ratio":"PR","prevalence odds ratio":"POR","prevalence difference":"PD","ratio of row proportions":"ratio","cross-product ratio":"cross\\ product","difference of row proportions":"difference"},y=(e,t,n)=>`

**${e.reportedAs??e.name}**, ${e.method}:`+(e.unavailable?`

$$${t}$$

Not computed: ${e.unavailable}`:`

$$${t}$$

$$${n}$$`);function F(e,t){let{exposed:n,unexposed:r,caseValue:i,nonCaseValue:c,exposureColumn:d}=e.request,{exposedCases:l,exposedNonCases:h,unexposedCases:p,unexposedNonCases:f}=e.cells,u=a(l),j=a(h),g=a(p),O=a(f),v=a(e.exposedTotal),R=a(e.unexposedTotal),b=o=>`${d} "${o}"`,N=e.reading?e.reading.rowProportion:"risk",$=`The four cells, in the letters every formula below is written in:

- $a$ = ${m(l)} \u2014 ${b(n)}, ${i}
- $b$ = ${m(h)} \u2014 ${b(n)}, ${c}
- $c$ = ${m(p)} \u2014 ${b(r)}, ${i}
- $d$ = ${m(f)} \u2014 ${b(r)}, ${c}`+(N===null?"":`

The ${N}s are $a/(a+b)$ and $c/(c+d)$:

$$\\frac{${u}}{${v}} = ${s(e.riskExposed??0,5)} \\qquad \\frac{${g}}{${R}} = ${s(e.riskUnexposed??0,5)}$$`),w=[];for(let o of e.estimates){w.push(o.method);let M=$.length;o.name==="risk ratio"?$+=y(o,"\\mathrm{RR} = \\frac{a/(a+b)}{c/(c+d)}",`\\mathrm{RR} = \\frac{${u}/${v}}{${g}/${R}} = ${s(o.value??0,2)}`)+(o.unavailable?"":x(o,"\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\tfrac{1}{a} - \\tfrac{1}{a+b} + \\tfrac{1}{c} - \\tfrac{1}{c+d}}\\right)")):o.name==="odds ratio"?$+=y(o,"\\mathrm{OR} = \\frac{ad}{bc}",`\\mathrm{OR} = \\frac{${u} \\times ${O}}{${j} \\times ${g}} = ${s(o.value??0,2)}`)+(o.unavailable?"":x(o,"\\exp\\left(\\ln \\mathrm{OR} \\pm z \\sqrt{\\tfrac{1}{a} + \\tfrac{1}{b} + \\tfrac{1}{c} + \\tfrac{1}{d}}\\right)")):o.name==="risk difference"&&($+=y(o,"\\mathrm{RD} = \\frac{a}{a+b} - \\frac{c}{c+d}",`\\mathrm{RD} = \\frac{${u}}{${v}} - \\frac{${g}}{${R}} = ${s(o.value??0,6)}`)+(o.unavailable?"":`

with $p_1 = a/(a+b)$ and $p_0 = c/(c+d)$, each group contributing its own variance rather than a pooled one:`+x(o,"\\mathrm{RD} \\pm z \\sqrt{\\frac{p_1(1-p_1)}{a+b} + \\frac{p_0(1-p_0)}{c+d}}"))),o.reportedAs&&($=$.slice(0,M)+$.slice(M).split(`\\mathrm{${E[o.name]}}`).join(`\\mathrm{${E[o.reportedAs]}}`))}let T=[...e.reading?.withheld??[],...e.reading?.notEstimable??[]];return T.length&&($+=`

Not reported under this design: ${T.join(", ")}.`),e.reading?.design===null&&($+=`

No study design was connected, so these measures are named by their arithmetic and not by what they measure.`),e.strataLeftOut.length&&($+=`

This table also holds ${e.strataLeftOut.map(o=>`"${o}"`).join(", ")} in ${d}, which is in neither group, so the letters above total ${m(e.total)} and not the table.`),$+=S(w),{kind:"machined",id:`${t}:equation`,section:"Methods",fn:"method",text:$,nodeId:t,cites:[...new Set(w)]}}function P(e,t){let n=i=>JSON.stringify(i),r=i=>{let c=C(i),d=q[i]?.uncited,l=c?`fw:methodReference ${n(c)}`:`fw:methodUncited ${n(d||"No source has been read for this method.")}`;return`fw:citesMethod [ a fw:MethodCitation; fw:methodName ${n(i)}; ${l} ]`};return t.map(i=>`${e} fw:machinedNote [ a fw:MachinedNote; fw:noteSection ${n(i.section)}; `+(i.fn?`fw:noteFunction ${n(i.fn)}; `:"")+[...new Set(i.cites||[])].map(c=>`${r(c)}; `).join("")+`fw:noteText ${n(i.text)} ].
`).join("")}export{q as a,D as b,C as c,L as d,z as e,F as f,P as g};
//# sourceMappingURL=chunk-ZQPBYVW2.js.map
