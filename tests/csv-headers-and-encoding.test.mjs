import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCSV,readTextFile} from '../build/input-data.js';
import {dataTable} from '../build/data-table.js';

/** A FILE IS READ, NOT REFUSED, FOR ITS HEADERS OR ITS ENCODING (2026-11-23): the African Bat Database's CSV, written by
 *  R, has an empty header over its row numbers and is not UTF-8. It was refused whole. */
test('a column with no name, or with another column\'s, is named and said',()=>{
  const t=parseCSV('"",Species,Year,Year,column_1\n"1",Afronycteris nanus,2012,2013,x\n');
  assert.deepEqual(t.headers,['column_1_2','Species','Year','Year_2','column_1']);
  assert.deepEqual(t.named,[{column:1,given:'',as:'column_1_2'},{column:4,given:'Year',as:'Year_2'}]);
  const plain=parseCSV('"",Species\n"1",Afronycteris nanus\n');
  assert.deepEqual(plain.headers,['column_1','Species']);
  const table=dataTable(plain,{keys:['Species'],valueField:'column_1'});
  const said=table.findings.filter(f=>f.kind==='named-column');
  assert.equal(said.length,1);
  assert.match(said[0].text,/Column 1 has no name in the file; it is read as "column_1"/);
});

test('a file that is not UTF-8 is read as Windows-1252, and said',async()=>{
  const bytes=new Uint8Array([...Buffer.from('Location,n\nC'),0xF4,...Buffer.from('te d\'Ivoire,1\n')]);
  const read=await readTextFile(new Blob([bytes]));
  assert.equal(read.encoding,'windows-1252');
  assert.match(read.text,/Côte d'Ivoire/);
  const utf8=await readTextFile(new Blob([Buffer.from('Location,n\nCôte d\'Ivoire,1\n')]));
  assert.equal(utf8.encoding,undefined);
  const table=dataTable({...parseCSV(read.text),encoding:read.encoding},{keys:['Location'],valueField:'n'});
  assert.ok(table.findings.some(f=>f.kind==='not-utf8'));
  assert.equal(table.rows[0].key.Location,'Côte d\'Ivoire');
});
