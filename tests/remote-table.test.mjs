import test from 'node:test';
import assert from 'node:assert/strict';
import {zipSync,strToU8} from 'fflate';
import {withoutRemoteRows,tablesInArchive,archiveEntry} from '../build/remote-table.js';

/** A TABLE FETCHED AT OPEN leaves the device as a spec, without its rows. Experiment 170. */
test('an exported workflow keeps the spec and the read settings of a remote table, and none of its rows',()=>{
  const workflow={nodes:[
    {id:'t',type:'table_input',params:{keys:['date'],valueField:'count',remote:{url:'https://x.test/a.zip',entry:'d/a.csv',sha256:'aa',bytes:9},
      data:{kind:'data-table',keys:['date'],valueField:'count',rows:[{key:{date:'2016-01-01'},value:31}],rowCount:1,missingValueCount:0,findings:[]},
      sourceTable:{headers:['date','count'],rows:[['2016-01-01','31']]}}},
    {id:'local',type:'table_input',params:{keys:['k'],valueField:'v',data:{kind:'data-table',keys:['k'],valueField:'v',rows:[{key:{k:'a'},value:1}],rowCount:1,missingValueCount:0}}}]};
  const out=withoutRemoteRows(structuredClone(workflow));
  assert.deepEqual(out.nodes[0].params.data.rows,[]);
  assert.equal(out.nodes[0].params.data.rowCount,0);
  assert.equal(out.nodes[0].params.sourceTable,undefined);
  assert.equal(out.nodes[0].params.remote.sha256,'aa');
  assert.deepEqual(out.nodes[0].params.keys,['date']);
  assert.equal(out.nodes[1].params.data.rows.length,1,'a table read from a local file travels as before');
});

test('an archive lists its tables and gives one back',()=>{
  const zip=zipSync({'pkg/data/a.csv':strToU8('date,count\n2016-01-01,31\n'),'pkg/README.md':strToU8('x'),'pkg/b.dta':new Uint8Array([115])});
  assert.deepEqual(tablesInArchive(zip),['pkg/data/a.csv','pkg/b.dta']);
  assert.equal(new TextDecoder().decode(archiveEntry(zip,'pkg/data/a.csv')),'date,count\n2016-01-01,31\n');
  assert.deepEqual(tablesInArchive(strToU8('date,count\n')),[]);
});
