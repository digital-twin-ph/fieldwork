/** A QR CODE FOR AN ADDRESS (experiment 203): drawn as SVG on this device, so it works offline and holds the address and
 *  nothing else. The encoder is qrcode-generator 2.0.4 (Kazuhiko Arase, MIT), installed with the practitioner's yes on
 *  2026-11-10; "QR Code" is a registered trademark of DENSO WAVE. Error correction M, which survives about 15% of the
 *  code damaged or covered; the version is the smallest that holds the address. Lab check 47 decodes the codes this
 *  draws with an independent decoder and confirms the address. */
import qrcode from 'qrcode-generator';

/** The code's dark modules, row by row, without the quiet zone. */
export function qrMatrix(text:string,level:'M'|'H'='M'):boolean[][]{
  if(!/^https:\/\/[\x21-\x7e]+$/.test(text))throw new Error('A QR code here holds one https address, written in plain ASCII.');
  const code=qrcode(0,level);
  code.addData(text,'Byte');
  code.make();
  const n=code.getModuleCount();
  return Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>code.isDark(r,c)));
}

/** The code as SVG, `px` wide, with the four-module quiet zone the standard asks for. Black on white whatever the theme:
 *  a reader's camera needs the contrast, and a dark-mode inversion is a code many cameras cannot read.
 *
 *  WITH FIELDWORK'S MARK IN THE MIDDLE (the practitioner, 2026-11-14: "Can we add the FW logo to the QR code?"): the code
 *  is then drawn at error correction H, which survives about 30% of it covered, and the mark with its white margin
 *  covers about 6%, whole modules only, so a reader recovers what it hides. Lab check 47 decodes them. */
/** The modules as drawn: with the mark, the code at H with its middle cleared, and where the mark sits (in modules,
 *  inside the quiet zone). Exported so the lab decodes exactly what is drawn. */
export function qrDrawn(text:string,mark=false):{rows:boolean[][];mark?:{at:number;box:number}}{
  const m=qrMatrix(text,mark?'H':'M'),n=m.length;
  if(!mark)return {rows:m};
  const box=Math.max(5,Math.round(n*0.2)|1),pad=1,lo=(n-box)/2-pad,hi=(n+box)/2+pad;
  return {rows:m.map((row,r)=>row.map((dark,c)=>dark&&!(r>=lo&&r<hi&&c>=lo&&c<hi))),mark:{at:(n-box)/2,box}};
}
export function qrSvg(text:string,px=160,label='',mark=false):string{
  const drawn=qrDrawn(text,mark),n=drawn.rows.length,side=n+8;
  let d='';
  drawn.rows.forEach((row,r)=>row.forEach((dark,c)=>{if(dark)d+=`M${c+4} ${r+4}h1v1h-1z`;}));
  const box=drawn.mark?.box??0,at=4+(drawn.mark?.at??0);
  const s=box/40;
  const logo=drawn.mark?`<g transform="translate(${at} ${at}) scale(${s})"><rect width="40" height="40" rx="11" fill="#176b59"/>`
    +'<g fill="none" stroke="#eff9ee" stroke-width="2.1" stroke-linecap="round"><path d="M11 27V13h18M11 20h13M24 20v7"/>'
    +'<circle cx="11" cy="13" r="3" fill="#176b59"/><circle cx="29" cy="13" r="3" fill="#176b59"/><circle cx="24" cy="27" r="3" fill="#176b59"/></g></g>':'';
  return `<svg class="qr-code" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" width="${px}" height="${px}" `
    +`shape-rendering="crispEdges" role="img" aria-label="${(label||`QR code for ${text}`).replace(/[<>&"]/g,'')}">`
    +`<rect width="${side}" height="${side}" fill="#ffffff"/><path d="${d}" fill="#000000"/>${logo}</svg>`;
}
