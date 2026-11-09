import test from 'node:test';
import assert from 'node:assert/strict';
import {readNoteImage,readNoteImagePayload,noteImageGaps,noteImageFigure,noteImageDigest} from '../build/note-image.js';
import {readNotes} from '../build/notes.js';

/** A PICTURE IN A NOTE (experiment 196): kept by its digest, with alt text and a caption, shown as an image. */
const esc=v=>String(v??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const sha='a'.repeat(64);
const image={sha256:sha,mime:'image/svg+xml',bytes:12,alt:'A cross-section of a low coast',caption:'Heights and the surfaces they are measured from'};

test('a note keeps its picture only with a digest, a type offered, alt text and a caption',()=>{
  const note={kind:'authored',id:'n1',section:'Introduction',text:'Heights need one datum.',image};
  assert.deepEqual(readNotes([note]).notes[0].image,image);
  for(const broken of [{...image,alt:' '},{...image,caption:''},{...image,sha256:'xyz'},{...image,mime:'text/html'}]){
    const [read]=readNotes([{...note,image:broken}]).notes;
    assert.equal(read.text,'Heights need one datum.','the words stand');
    assert.equal(read.image,undefined,'the picture they cannot describe does not');
  }
  assert.equal(readNoteImage(null),undefined);
});

test('the kept bytes are a data URL of their declared type, and nothing else',()=>{
  assert.ok(readNoteImagePayload({kind:'note-image',mime:'image/png',data:'data:image/png;base64,AAAA'}));
  assert.equal(readNoteImagePayload({kind:'note-image',mime:'image/png',data:'javascript:alert(1)'}),undefined);
  assert.equal(readNoteImagePayload({kind:'note-image',mime:'image/png',data:'data:image/svg+xml;base64,AAAA'}),undefined);
});

test('the gaps are said in the dialog\'s words',()=>{
  assert.equal(noteImageGaps({alt:'x',caption:'y'}).length,0);
  assert.match(noteImageGaps({alt:'',caption:'y'})[0],/Alt text is required/);
  assert.match(noteImageGaps({alt:'x',caption:''})[0],/caption is required/);
});

test('an SVG is drawn through img, never put into the page, and a missing picture is said',()=>{
  const svg='<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>';
  const payload={kind:'note-image',mime:'image/svg+xml',data:`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`};
  const html=noteImageFigure(image,payload,esc);
  assert.match(html,/<img src="data:image\/svg\+xml;base64,/);
  assert.doesNotMatch(html,/<svg|<script/);
  assert.match(html,/alt="A cross-section of a low coast"/);
  assert.match(html,/<figcaption>Heights and the surfaces they are measured from<\/figcaption>/);
  const missing=noteImageFigure(image,undefined,esc);
  assert.match(missing,/not on this device/);
  assert.match(missing,/<figcaption>/);
});

test('a picture arriving in a project file is checked against the digest its bytes have',async()=>{
  const payload={kind:'note-image',mime:'image/png',data:`data:image/png;base64,${Buffer.from('hello').toString('base64')}`};
  assert.equal(await noteImageDigest(payload),'2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
});
