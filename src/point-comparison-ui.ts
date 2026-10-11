import type {PointComparison} from './point-comparison.js';
import type {Escape,PointCollection,Position} from './types.js';

export function pointComparisonMarkup(comparison:PointComparison,escape:Escape):string{
  const c=comparison,all=[...c.original.features,...c.moved.features,...c.pumps.features].map(f=>f.geometry!.coordinates).concat([c.originalMean,c.movedMean]);
  const west=Math.min(...all.map(p=>p[0])),east=Math.max(...all.map(p=>p[0])),south=Math.min(...all.map(p=>p[1])),north=Math.max(...all.map(p=>p[1]));
  const latitude=(south+north)/2,cos=Math.cos(latitude*Math.PI/180),width=Math.max((east-west)*cos,0.0001),height=Math.max(north-south,0.0001);
  const scale=Math.min(365/width,220/height),centerX=(west+east)/2,centerY=(south+north)/2;
  const project=(p:Position)=>[210+(p[0]-centerX)*cos*scale,146-(p[1]-centerY)*scale];
  const map=(label:string,points:PointCollection,mean:Position,nearest:{id:string;name:string;distanceM:number},color:string,side:string)=>{
    const [mx,my]=project(mean),pump=c.pumps.features.find(f=>f.id===nearest.id)!,[px,py]=project(pump.geometry!.coordinates);
    const dots=points.features.map(f=>{const [x,y]=project(f.geometry!.coordinates);return `<circle data-${side}-point cx="${x.toFixed(3)}" cy="${y.toFixed(3)}" r="2.1" fill="${color}" fill-opacity=".55"><title>${escape(f.properties.name)}</title></circle>`;}).join('');
    const pumps=c.pumps.features.map((f,i)=>{const [x,y]=project(f.geometry!.coordinates);return `<g data-pump="${escape(f.id)}"><rect x="${(x-3.5).toFixed(3)}" y="${(y-3.5).toFixed(3)}" width="7" height="7" fill="#176b88" stroke="white" stroke-width="1"/><title>${escape(f.properties.name)}</title><text x="${(x+5).toFixed(3)}" y="${(y-5).toFixed(3)}" font-size="8">P${i+1}</text></g>`;}).join('');
    return `<article class="comparison-card"><h3>${escape(label)}</h3><svg class="comparison-map" viewBox="0 0 420 295" role="img" aria-label="${escape(label)}: ${points.features.length} locations, eight pump locations and projected mean center"><rect width="420" height="295" fill="#f4f7f2"/><path d="M20 256H400M20 36V256" stroke="#cbd8cb" stroke-width="1"/><path d="M${mx.toFixed(3)} ${my.toFixed(3)}L${px.toFixed(3)} ${py.toFixed(3)}" stroke="#6c568a" stroke-width="1.5" stroke-dasharray="4 3"/>${dots}${pumps}<g data-mean="${side}"><circle cx="${mx.toFixed(3)}" cy="${my.toFixed(3)}" r="9" fill="white" stroke="#6c568a" stroke-width="2"/><path d="M${(mx-5).toFixed(3)} ${my.toFixed(3)}H${(mx+5).toFixed(3)}M${mx.toFixed(3)} ${(my-5).toFixed(3)}V${(my+5).toFixed(3)}" stroke="#6c568a" stroke-width="1.5"/></g><text x="12" y="282" font-size="9">Dots: locations · blue squares: pumps · crosshair: mean center</text></svg><p>Mean center: ${mean[1].toFixed(5)}° N, ${Math.abs(mean[0]).toFixed(5)}° ${mean[0]<0?'W':'E'}. Nearest pump: ${escape(nearest.name)} (${nearest.distanceM.toFixed(1)} m).</p></article>`;
  };
  // Representative donuts: a handful of pairs drawn large enough to see the mechanism, with the
  // annulus taken from the MEASURED displacement band rather than from the widget's parameters,
  // which this view never sees. Eight pairs, evenly spaced through the layer, because 250
  // overlapping annuli is a grey smear and because every drawn donut discloses one original
  // position -- the fewer drawn, the less this private view shows.
  const donuts=()=>{
    const pairs=c.displacements.length;
    if(!pairs)return '';
    const sample=[...Array(Math.min(8,pairs))].map((_,i)=>Math.round(i*(pairs-1)/Math.max(1,Math.min(8,pairs)-1)));
    const picked=[...new Set(sample)].map(index=>({index,
      from:c.original.features[index].geometry!.coordinates,
      to:c.moved.features[index].geometry!.coordinates,
      metres:c.displacements[index].metres}));
    // Own extent, so the donuts are legible: the pair set is far smaller than the whole layer.
    const points=picked.flatMap(p=>[p.from,p.to]);
    const w=Math.min(...points.map(p=>p[0])),e=Math.max(...points.map(p=>p[0]));
    const so=Math.min(...points.map(p=>p[1])),no=Math.max(...points.map(p=>p[1]));
    const lat=(so+no)/2,cosine=Math.cos(lat*Math.PI/180);
    const metresPerDegree=111320;
    const pad=(c.displacementBandM.maximum*1.6)/metresPerDegree;
    const spanX=Math.max((e-w)*cosine+pad*2*cosine,1e-6),spanY=Math.max(no-so+pad*2,1e-6);
    const zoom=Math.min(365/spanX,220/spanY),cx=(w+e)/2,cy=(so+no)/2;
    const place=(p:Position):[number,number]=>[210+(p[0]-cx)*cosine*zoom,146-(p[1]-cy)*zoom];
    const radius=(metres:number)=>metres/metresPerDegree*zoom;
    const inner=radius(c.displacementBandM.minimum),outer=radius(c.displacementBandM.maximum);
    const band=picked.map(p=>{const [x,y]=place(p.from);
      return `<g data-donut="${p.index}"><circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${outer.toFixed(2)}" fill="#6c568a" fill-opacity=".10" stroke="#6c568a" stroke-opacity=".45" stroke-width="1"/>`
        +`<circle cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" r="${inner.toFixed(2)}" fill="#f4f7f2" stroke="#6c568a" stroke-opacity=".45" stroke-width="1" stroke-dasharray="3 2"/></g>`;}).join('');
    const links=picked.map(p=>{const [x1,y1]=place(p.from),[x2,y2]=place(p.to);
      return `<path data-donut-link="${p.index}" d="M${x1.toFixed(2)} ${y1.toFixed(2)}L${x2.toFixed(2)} ${y2.toFixed(2)}" stroke="#8a654c" stroke-width="1.2"/>`;}).join('');
    const marks=picked.map(p=>{const [x1,y1]=place(p.from),[x2,y2]=place(p.to);
      return `<circle data-donut-original="${p.index}" cx="${x1.toFixed(2)}" cy="${y1.toFixed(2)}" r="2.6" fill="#8a654c"><title>Original location ${p.index+1}</title></circle>`
        +`<circle data-donut-moved="${p.index}" cx="${x2.toFixed(2)}" cy="${y2.toFixed(2)}" r="2.6" fill="#d28c38" stroke="white" stroke-width=".8"><title>Moved ${p.metres.toFixed(1)} m</title></circle>`;}).join('');
    const b=c.displacementBandM;
    return `<article class="comparison-card" data-donut-card><h3>Representative donuts · private</h3>`
      +`<svg class="comparison-map" viewBox="0 0 420 295" role="img" aria-label="${picked.length} original locations with their displacement annulus and moved position">`
      +`<rect width="420" height="295" fill="#f4f7f2"/>${band}${links}${marks}`
      +`<text x="12" y="276" font-size="9">Brown: original · amber: moved · ring: ${b.minimum.toFixed(0)}–${b.maximum.toFixed(0)} m observed band</text>`
      +`<text x="12" y="288" font-size="9">${picked.length} of ${pairs} pairs shown; each drawn donut discloses one original position</text></svg>`
      +`<p>Every point moved between <strong>${b.minimum.toFixed(1)} m</strong> and <strong>${b.maximum.toFixed(1)} m</strong>, median ${b.median.toFixed(1)} m, measured by pairing the two layers in order. The ring is that observed band, not a declared parameter: this view never sees the widget’s settings.</p>`
      +`<p class="comparison-note">Measured in ${escape(c.crs)} against a mask that converts metres to an angle on a sphere of radius 6,371,008.8 m, so the band reads a little wider than the donut that produced it. At this latitude the WGS84 ellipsoid curves more tightly along the meridian than across it — 6,374,604 m against 6,391,253 m — so the same angular displacement covers about 0.06% more ground north to south and 0.32% more east to west. A band of ${b.minimum.toFixed(1)}–${b.maximum.toFixed(1)} m is a 50–125 m donut read on the ellipsoid, and the spread is why the ratio is not one number.</p></article>`;
  };

  return `<div class="comparison-summary"><strong>Mean-center shift: ${c.centerShiftM.toFixed(1)} m</strong><span>Unweighted projected means · ${escape(c.crs)} · ${c.original.features.length} locations per map · identical extent and scale</span></div><div class="comparison-grid">${map('Original locations · private',c.original,c.originalMean,c.originalNearestPump,'#8a654c','original')}${map('Moved locations · private comparison',c.moved,c.movedMean,c.movedNearestPump,'#d28c38','moved')}${donuts()}</div><p class="comparison-caveat">Every map here and this evaluation retain original coordinates, and the donut card shows the exact pairing the mask exists to break — it is a teaching view, not a shareable one. Center movement does not establish privacy or preserve individual location accuracy. Pump positions provide geographic context; they do not establish historical pump use.</p>`;
}
