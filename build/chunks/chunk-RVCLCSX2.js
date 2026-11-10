import{h as D}from"./chunk-NFLCAI7Q.js";var L={"Katz log":{published:"1978",citation:{type:"article",authors:[{family:"Katz",given:"D"},{family:"Baptista",given:"J"},{family:"Azen",given:"S P"},{family:"Pike",given:"M C"}],title:"Obtaining confidence intervals for the risk ratio in cohort studies",container:"Biometrics",volume:"34",issue:"3",pages:"469-474",doi:"10.2307/2530610"}},"Wald log":{published:"1955",citation:{type:"article",authors:[{family:"Woolf",given:"B"}],title:"On estimating the relation between blood group and disease",container:"Annals of Human Genetics",volume:"19",issue:"4",pages:"251-253",doi:"10.1111/j.1469-1809.1955.tb01348.x"}},"space-time permutation":{published:"2005",citation:{type:"article",authors:[{family:"Kulldorff",given:"M"},{family:"Heffernan",given:"R"},{family:"Hartman",given:"J"},{family:"Assun\xE7\xE3o",given:"R"},{family:"Mostashari",given:"F"}],title:"A space-time permutation scan statistic for disease outbreak detection",container:"PLoS Medicine",volume:"2",issue:"3",pages:"e59",doi:"10.1371/journal.pmed.0020059"}},"Wald unpooled":{citation:null,uncited:"A Wald interval on a difference of two proportions. No primary source has been read for it: the construction is standard and the implementations consulted state it without attributing it, so none is cited here rather than a plausible textbook being named."},"log-normal":{citation:null,uncited:"A log-normal interval on a ratio of two rates. No primary source has been read for it: the construction is standard and the implementations consulted state it without attributing it, so none is cited here."}},U="vancouver";function z(e){let n=L[e];if(n?.citation)return D({licence:"none-applies",published:n.published,citation:n.citation},U)}var K=e=>e.replace(/[\\{}$&#^_%~]/g,n=>n==="\\"?"\\backslash ":`\\${n}`),B=e=>`\\text{${K(e)}}`,s=(e,n=0)=>e.toLocaleString("en-US",{minimumFractionDigits:n,maximumFractionDigits:n}).replace(/,/g,"{,}"),c=(e,n)=>s(Number(e.toFixed(n)),n),d=e=>e.toLocaleString("en-US");function _(e){let n=[...new Set(e)].map(a=>z(a)?a:`${a} (no primary source read)`);return n.length?`

Method: ${n.join(", ")}. The works are in References.`:""}var E=(e,n)=>{let a=Math.abs(e.value??0)<.01?6:2;return`

$$${n}$$

$$= ${c(e.lower??0,a)} \\text{ to } ${c(e.upper??0,a)} \\quad (${e.level}\\%)$$`};function V(e,n){let{numeratorField:a,denominatorField:i,multiplier:t,denominatorUnit:r,rateKind:l}=e.options;if(e.overall===null)return null;let m=`per ${d(t)} ${r}`,f=`The ${l==="proportion"?"proportion":"rate"} is ${a} divided by ${i}, times ${t.toLocaleString()}:

$$\\text{rate} = \\frac{${B(a)}}{${B(i)}} \\times ${s(t)}$$

Each group has its own rate, in the table this step produces. Totalled over all ${e.rows.length} of them \u2014 ${d(e.totalNumerator)} ${a} and ${d(e.totalDenominator)} ${i}:

$$\\frac{${s(e.totalNumerator)}}{${s(e.totalDenominator)}} \\times ${s(t)} = ${c(e.overall,3)}$$

That is ${c(e.overall,3)} ${m}, for the numerator over ${e.options.numeratorPeriod} against a denominator of ${e.options.denominatorVintage}. The unit is what makes this comparable or not: a ${l} per ${r} and one per anything else are different quantities even where the division looks the same.

No interval is computed here, so no method is cited: the division is arithmetic and the multiplier is a scale rather than an estimator.`;return{kind:"machined",id:`${n}:equation`,section:"Methods",fn:"method",text:f,nodeId:n}}function H(e,n){let{exposed:a,unexposed:i,caseValue:t,unitsAtRiskValue:r,exposureColumn:l}=e.request,{exposedEvents:m,exposedUnitsAtRisk:f,unexposedEvents:g,unexposedUnitsAtRisk:T}=e.cells,b=$=>`${l} "${$}"`,p=`The rate ratio is ${a}'s rate over ${i}'s. Both rates are per ${r}, so the ratio is dimensionless. The cells, in the letters the formulas are written in:

- $a_1$ = ${d(m)} \u2014 ${b(a)}, ${t}
- $n_1$ = ${d(f)} \u2014 ${b(a)}, ${r}
- $a_0$ = ${d(g)} \u2014 ${b(i)}, ${t}
- $n_0$ = ${d(T)} \u2014 ${b(i)}, ${r}`,N=[];for(let $ of e.estimates){N.push($.method),p+=`

**${$.reportedAs??$.name}**, ${$.method}:

$$\\mathrm{RR} = \\frac{a_1 / n_1}{a_0 / n_0}$$`;let{value:v,lower:y,upper:w}=$;if(v===null||y===null||w===null){p+=`

Not computed: ${$.unavailable??""}`;continue}let x=Math.abs(Math.log(w/v))/Math.sqrt(1/m+1/g);p+=`

$$\\mathrm{RR} = \\frac{${s(m)} / ${s(f)}}{${s(g)} / ${s(T)}} = ${c(v,2)}$$

The ${$.level}% interval is computed on the log scale and transformed back, because a ratio is not symmetric about its point estimate:

$$\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\frac{1}{a_1} + \\frac{1}{a_0}}\\right)$$

$$\\exp\\left(\\ln ${c(v,4)} \\pm ${c(x,6)} \\sqrt{\\frac{1}{${s(m)}} + \\frac{1}{${s(g)}}}\\right) = ${c(y,2)} \\text{ to } ${c(w,2)}$$`}return e.reading?.design===null&&(p+=`

No study design was connected. The rate ratio keeps its name: events over units at risk is a rate under any design, and a design decides only whether one may be reported.`),p+=`

The interval describes sampling variation in these counts alone. It is not a p-value, and nothing here adjusts for anything the two groups did not share.`+_(N),{kind:"machined",id:`${n}:equation`,section:"Methods",fn:"method",text:p,nodeId:n,cites:[...new Set(N)]}}var k={"risk ratio":"RR","odds ratio":"OR","risk difference":"RD","prevalence ratio":"PR","prevalence odds ratio":"POR","prevalence difference":"PD","ratio of row proportions":"ratio","cross-product ratio":"cross\\ product","difference of row proportions":"difference"},C=(e,n,a)=>`

**${e.reportedAs??e.name}**, ${e.method}:`+(e.unavailable?`

$$${n}$$

Not computed: ${e.unavailable}`:`

$$${n}$$

$$${a}$$`);function W(e,n,a=!1){let{exposed:i,unexposed:t,caseValue:r,nonCaseValue:l,exposureColumn:m}=e.request,{exposedCases:f,exposedNonCases:g,unexposedCases:T,unexposedNonCases:b}=e.cells,p=s(f),N=s(g),$=s(T),v=s(b),y=s(e.exposedTotal),w=s(e.unexposedTotal),x=o=>`${m} "${o}"`,A=e.reading?e.reading.rowProportion:"risk";if(a){let o=`Every exposure on this step is computed from its own four cells, with these formulas. Each exposure's cells and estimates are in the step's table.

- $a$ \u2014 exposed ("${i}"), ${r}
- $b$ \u2014 exposed ("${i}"), ${l}
- $c$ \u2014 unexposed ("${t}"), ${r}
- $d$ \u2014 unexposed ("${t}"), ${l}`,R=[],F={"risk ratio":["\\mathrm{RR} = \\frac{a/(a+b)}{c/(c+d)}","\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\tfrac{1}{a} - \\tfrac{1}{a+b} + \\tfrac{1}{c} - \\tfrac{1}{c+d}}\\right)"],"odds ratio":["\\mathrm{OR} = \\frac{ad}{bc}","\\exp\\left(\\ln \\mathrm{OR} \\pm z \\sqrt{\\tfrac{1}{a} + \\tfrac{1}{b} + \\tfrac{1}{c} + \\tfrac{1}{d}}\\right)"],"risk difference":["\\mathrm{RD} = \\frac{a}{a+b} - \\frac{c}{c+d}","\\mathrm{RD} \\pm z \\sqrt{\\frac{p_1(1-p_1)}{a+b} + \\frac{p_0(1-p_0)}{c+d}}"]};for(let u of e.estimates){let S=F[u.name];if(!S)continue;R.push(u.method);let q=`

**${u.reportedAs??u.name}**, ${u.method}:

$$${S[0]}$$

with a ${u.level}% interval

$$${S[1]}$$`;u.reportedAs&&(q=q.split(`\\mathrm{${k[u.name]}}`).join(`\\mathrm{${k[u.reportedAs]}}`)),o+=q}let O=[...e.reading?.withheld??[],...e.reading?.notEstimable??[]];return O.length&&(o+=`

Not reported under this design: ${O.join(", ")}.`),e.reading?.design===null&&(o+=`

No study design was connected, so these measures are named by their arithmetic and not by what they measure.`),o+=_(R),{kind:"machined",id:`${n}:equation`,section:"Methods",fn:"method",text:o,nodeId:n,cites:[...new Set(R)]}}let h=`The four cells, in the letters every formula below is written in:

- $a$ = ${d(f)} \u2014 ${x(i)}, ${r}
- $b$ = ${d(g)} \u2014 ${x(i)}, ${l}
- $c$ = ${d(T)} \u2014 ${x(t)}, ${r}
- $d$ = ${d(b)} \u2014 ${x(t)}, ${l}`+(A===null?"":`

The ${A}s are $a/(a+b)$ and $c/(c+d)$:

$$\\frac{${p}}{${y}} = ${c(e.riskExposed??0,5)} \\qquad \\frac{${$}}{${w}} = ${c(e.riskUnexposed??0,5)}$$`),M=[];for(let o of e.estimates){M.push(o.method);let R=h.length;o.name==="risk ratio"?h+=C(o,"\\mathrm{RR} = \\frac{a/(a+b)}{c/(c+d)}",`\\mathrm{RR} = \\frac{${p}/${y}}{${$}/${w}} = ${c(o.value??0,2)}`)+(o.unavailable?"":E(o,"\\exp\\left(\\ln \\mathrm{RR} \\pm z \\sqrt{\\tfrac{1}{a} - \\tfrac{1}{a+b} + \\tfrac{1}{c} - \\tfrac{1}{c+d}}\\right)")):o.name==="odds ratio"?h+=C(o,"\\mathrm{OR} = \\frac{ad}{bc}",`\\mathrm{OR} = \\frac{${p} \\times ${v}}{${N} \\times ${$}} = ${c(o.value??0,2)}`)+(o.unavailable?"":E(o,"\\exp\\left(\\ln \\mathrm{OR} \\pm z \\sqrt{\\tfrac{1}{a} + \\tfrac{1}{b} + \\tfrac{1}{c} + \\tfrac{1}{d}}\\right)")):o.name==="risk difference"&&(h+=C(o,"\\mathrm{RD} = \\frac{a}{a+b} - \\frac{c}{c+d}",`\\mathrm{RD} = \\frac{${p}}{${y}} - \\frac{${$}}{${w}} = ${c(o.value??0,6)}`)+(o.unavailable?"":`

with $p_1 = a/(a+b)$ and $p_0 = c/(c+d)$, each group contributing its own variance rather than a pooled one:`+E(o,"\\mathrm{RD} \\pm z \\sqrt{\\frac{p_1(1-p_1)}{a+b} + \\frac{p_0(1-p_0)}{c+d}}"))),o.reportedAs&&(h=h.slice(0,R)+h.slice(R).split(`\\mathrm{${k[o.name]}}`).join(`\\mathrm{${k[o.reportedAs]}}`))}let j=[...e.reading?.withheld??[],...e.reading?.notEstimable??[]];return j.length&&(h+=`

Not reported under this design: ${j.join(", ")}.`),e.reading?.design===null&&(h+=`

No study design was connected, so these measures are named by their arithmetic and not by what they measure.`),e.strataLeftOut.length&&(h+=`

This table also holds ${e.strataLeftOut.map(o=>`"${o}"`).join(", ")} in ${m}, which is in neither group, so the letters above total ${d(e.total)} and not the table.`),h+=_(M),{kind:"machined",id:`${n}:equation`,section:"Methods",fn:"method",text:h,nodeId:n,cites:[...new Set(M)]}}function J(e,n){let a=t=>JSON.stringify(t),i=t=>{let r=z(t),l=L[t]?.uncited,m=r?`fw:methodReference ${a(r)}`:`fw:methodUncited ${a(l||"No source has been read for this method.")}`;return`fw:citesMethod [ a fw:MethodCitation; fw:methodName ${a(t)}; ${m} ]`};return n.map(t=>`${e} fw:machinedNote [ a fw:MachinedNote; fw:noteSection ${a(t.section)}; `+(t.fn?`fw:noteFunction ${a(t.fn)}; `:"")+[...new Set(t.cites||[])].map(r=>`${i(r)}; `).join("")+`fw:noteText ${a(t.text)} ].
`).join("")}function Y(e,n,a,i){let t=e.clusters[0];if(!t)return null;let r=e.totals.cases,l=`Cases were scanned for clusters in place and time with the space-time permutation scan statistic, by ${e.period.unit} of ${a}, ${e.period.start} to ${e.period.end}: ${d(r)} cases at ${d(e.totals.places)} places. For a circle of places $Z$ and a run of ${e.period.unit}s $T$, the cases expected if place and time were unrelated are the circle's cases over the whole period times the run's cases everywhere, over all cases:

$$\\mu = \\frac{C_{Z}\\,C_{T}}{N}$$

and the circle and run are scored by the log likelihood ratio, where $c$ cases are observed, $c > \\mu$:

$$\\log \\mathrm{LR} = c \\ln\\frac{c}{\\mu} + (N - c) \\ln\\frac{N - c}{N - \\mu}$$

The most likely cluster, ${t.start} to ${t.end} at ${d(t.places.length)} ${t.places.length===1?"place":"places"}, held ${d(t.observed)} cases where ${c(t.expected,2)} were expected:

$$${s(t.observed)} \\ln\\frac{${s(t.observed)}}{${c(t.expected,4)}} + ${s(r-t.observed)} \\ln\\frac{${s(r-t.observed)}}{${c(r-t.expected,4)}} = ${c(t.llr,3)}$$

Its p-value, ${c(t.pValue,3)}, is the share of ${d(e.replications)} shuffles of the dates across the cases, plus one, whose highest score anywhere was at least as high (random stream ${e.randomStream}, seed ${e.seed}). Circles held at most ${Math.round(i.maxCaseShare*100)}% of the cases${i.maxRadiusKm?` within ${i.maxRadiusKm} km`:""} and runs were at most ${e.longestRunUnits} ${e.period.unit}s long${i.maxCaseShare===.5&&i.maxTimeShare===.5&&!i.maxRadiusKm?", SaTScan\u2019s defaults":""}.`;return{kind:"machined",id:`${n}:equation`,section:"Methods",fn:"method",text:l,nodeId:n,cites:["space-time permutation"]}}function Z(e,n,a){let i=e.firstAt["0.05"],t=`The outbreak was replayed day by day with the prospective space-time permutation scan statistic: each day, on the cases with a ${a} up to that day, only runs ending that day were scored, with the expected count and log likelihood ratio of the retrospective scan. `+(i?`The most likely cluster first had a p-value at or under 0.05 on ${i}.`:"On no day did the most likely cluster have a p-value at or under 0.05.")+` Each day's p-value is from ${d(e.replications)} shuffles of the dates (seed ${e.seed}) and is that day's alone: looking every day raises the chance of a false alarm, which was not corrected for. Cases are counted on the day of their ${a}, not the day they were reported.`;return{kind:"machined",id:`${n}:equation`,section:"Methods",fn:"method",text:t,nodeId:n,cites:["space-time permutation"]}}export{L as a,U as b,z as c,V as d,H as e,W as f,J as g,Y as h,Z as i};
//# sourceMappingURL=chunk-RVCLCSX2.js.map
