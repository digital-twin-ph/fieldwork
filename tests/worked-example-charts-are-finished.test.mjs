import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

/** A WORKED EXAMPLE'S CHART IS FINISHED. The practitioner, 2026-11-03, looking at the NYC smoke chart titled
 *  `count by date · one bar per row, keyed also by tmean, pm25, no2, o3`: *"worked examples should have their
 *  chart labels completed so they do not look raw like this. That's the reason it's called a "worked" example."*
 *
 *  Checked here: every chart in every pinned example has a title of its own. Not checked yet: axis labels. An axis
 *  left empty reads the column name, and once a column's meaning can be declared (experiment 172) the declared
 *  label is what an axis should read; South London's 1849-1854 chart is the one that relies on that today. Maps are
 *  not checked: an untitled map takes the practitioner's own node label, not a machine description.
 *
 *  Reads each example's bundle from its checkout beside this repository, at the digest it is pinned at. */
const examples=JSON.parse(readFileSync(new URL('../widgets/examples.json',import.meta.url),'utf8')).examples;

for(const example of examples){
  const name=example.repository.split('/').pop();
  const pinned=example.files?.find(file=>file.path==='fieldwork-project.json.gz');
  const path=new URL(`../../${name}/fieldwork-project.json.gz`,import.meta.url);
  const skip=!pinned?'carries no project bundle':!existsSync(path)?`${name} is not checked out beside this repository`:false;
  test(`${name}: every chart has its own title`,{skip},()=>{
    const project=JSON.parse(gunzipSync(readFileSync(path)).toString('utf8'));
    const untitled=project.workflows.flatMap(({document})=>document.nodes
      .filter(node=>node.type==='chart_output'&&!node.params.chartTitle?.trim())
      .map(node=>`${document.name} · ${node.params.label||node.id}`));
    assert.deepEqual(untitled,[],`Charts with no title of their own: ${untitled.join('; ')}`);
  });
}
