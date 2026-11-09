/** AN IMAGE IN A NOTE (experiment 196).
 *
 *  The practitioner, 2026-11-08: an authored note can carry an image, kept by its digest, with required alt text and a
 *  caption, shown on the Notes board and in the write-up; an SVG is shown as an image, never inlined. Its first use is
 *  the vertical-datum diagram of the sea-level example.
 *
 *  The note holds what describes the image and its digest; the bytes are kept once, in the payload store, under
 *  `noteImageKey`. ALT TEXT AND A CAPTION ARE BOTH REQUIRED, and they are different things: alt text says what the
 *  picture shows to someone who cannot see it, a caption says what a reader is to take from it. A note whose image
 *  lacks either is read back without the image, not with an empty one.
 *
 *  AN SVG IS SHOWN THROUGH <img>, never put into the page. An SVG is a document that can carry script and links; drawn
 *  as an image it is pixels and nothing in it runs. */

export interface NoteImage {
  sha256:string;
  mime:NoteImageType;
  bytes:number;
  filename?:string;
  /** What the picture shows, for someone who cannot see it. Required. */
  alt:string;
  /** What a reader is to take from it, printed under it. Required. */
  caption:string;
}

/** What is kept under `noteImageKey`: the bytes as a data URL, and its type, so the URL can be checked before use. */
export interface NoteImagePayload {kind:'note-image'; mime:NoteImageType; data:string}

export const NOTE_IMAGE_TYPES=['image/png','image/jpeg','image/webp','image/svg+xml'] as const;
export type NoteImageType=typeof NOTE_IMAGE_TYPES[number];

export const noteImageKey=(sha256:string)=>`note-image:${sha256}`;

const isType=(value:unknown):value is NoteImageType=>(NOTE_IMAGE_TYPES as readonly unknown[]).includes(value);
const text=(value:unknown)=>typeof value==='string'?value.trim():'';

/** Read back, or undefined. A digest that is not one, a type not offered, or a missing alt text or caption drops the
 *  image and keeps the note: the words stand without a picture they cannot describe. */
export function readNoteImage(raw:unknown):NoteImage|undefined{
  if(!raw||typeof raw!=='object')return undefined;
  const r=raw as Record<string,unknown>;
  const sha256=text(r.sha256).toLowerCase(),alt=text(r.alt),caption=text(r.caption);
  if(!/^[0-9a-f]{64}$/.test(sha256)||!isType(r.mime)||!alt||!caption)return undefined;
  const bytes=typeof r.bytes==='number'&&Number.isFinite(r.bytes)&&r.bytes>=0?r.bytes:0;
  return {sha256,mime:r.mime,bytes,alt,caption,...(text(r.filename)?{filename:text(r.filename)}:{})};
}

/** The payload, or undefined where it is not one: a data URL of the declared type and base64, nothing else. */
export function readNoteImagePayload(raw:unknown):NoteImagePayload|undefined{
  if(!raw||typeof raw!=='object')return undefined;
  const r=raw as Record<string,unknown>;
  if(r.kind!=='note-image'||!isType(r.mime)||typeof r.data!=='string')return undefined;
  return r.data.startsWith(`data:${r.mime};base64,`)?{kind:'note-image',mime:r.mime,data:r.data}:undefined;
}

/** What the gaps are, in the words the dialog says them. Empty means the image can be kept. */
export function noteImageGaps(draft:{mime?:string;alt?:string;caption?:string}):string[]{
  const gaps:string[]=[];
  if(draft.mime!==undefined&&!isType(draft.mime))gaps.push('The file is not a PNG, JPEG, WebP or SVG image.');
  if(!draft.alt?.trim())gaps.push('Alt text is required: say what the picture shows, for someone who cannot see it.');
  if(!draft.caption?.trim())gaps.push('A caption is required: say what a reader is to take from it.');
  return gaps;
}

type Escape=(value:unknown)=>string;

/** THE FIGURE, as the board and the write-up show it. Where the bytes are not on this device the figure says so, with
 *  the digest that would find them, rather than drawing nothing. */
export function noteImageFigure(image:NoteImage,payload:NoteImagePayload|undefined,esc:Escape):string{
  const caption=`<figcaption>${esc(image.caption)}</figcaption>`;
  if(!payload||payload.mime!==image.mime)
    return `<figure class="notes-image is-missing" data-note-image="${esc(image.sha256.slice(0,12))}">`
      +`<p class="notes-image-missing">This image is not on this device: ${esc(image.filename||'an image')}, `
      +`sha256 ${esc(image.sha256.slice(0,12))}…. Import the project it came with to see it.</p>${caption}</figure>`;
  return `<figure class="notes-image" data-note-image="${esc(image.sha256.slice(0,12))}">`
    +`<img src="${esc(payload.data)}" alt="${esc(image.alt)}" loading="lazy">${caption}</figure>`;
}

/** The bytes of a chosen file, digested and encoded. */
export async function noteImageFromFile(file:File):Promise<{image:Omit<NoteImage,'alt'|'caption'>;payload:NoteImagePayload}>{
  const mime=(file.type||(file.name.toLowerCase().endsWith('.svg')?'image/svg+xml':'')) as NoteImageType;
  if(!isType(mime))throw new Error('The file is not a PNG, JPEG, WebP or SVG image.');
  const buffer=new Uint8Array(await file.arrayBuffer());
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',buffer));
  const sha256=[...digest].map(b=>b.toString(16).padStart(2,'0')).join('');
  let binary='';for(let i=0;i<buffer.length;i+=0x8000)binary+=String.fromCharCode(...buffer.subarray(i,i+0x8000));
  return {image:{sha256,mime,bytes:buffer.length,...(file.name?{filename:file.name}:{})},
    payload:{kind:'note-image',mime,data:`data:${mime};base64,${btoa(binary)}`}};
}

/** The digest of a kept picture's bytes, so a picture arriving in a project file is kept only under the digest its
 *  bytes have. */
export async function noteImageDigest(payload:NoteImagePayload):Promise<string>{
  const base64=payload.data.slice(payload.data.indexOf(',')+1);
  const binary=atob(base64),bytes=new Uint8Array(binary.length);
  for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',bytes));
  return [...digest].map(b=>b.toString(16).padStart(2,'0')).join('');
}
