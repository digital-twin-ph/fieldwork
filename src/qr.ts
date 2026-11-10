/** A QR CODE FOR AN ADDRESS (experiment 203): drawn as SVG on this device, so it works offline and holds the address and
 *  nothing else. The encoder is qrcode-generator 2.0.4 (Kazuhiko Arase, MIT), installed with the practitioner's yes on
 *  2026-11-10; "QR Code" is a registered trademark of DENSO WAVE. Error correction M, which survives about 15% of the
 *  code damaged or covered; the version is the smallest that holds the address. Lab check 47 decodes the codes this
 *  draws with an independent decoder and confirms the address. */
import qrcode from 'qrcode-generator';

/** The code's dark modules, row by row, without the quiet zone. */
export function qrMatrix(text:string):boolean[][]{
  if(!/^https:\/\/[\x21-\x7e]+$/.test(text))throw new Error('A QR code here holds one https address, written in plain ASCII.');
  const code=qrcode(0,'M');
  code.addData(text,'Byte');
  code.make();
  const n=code.getModuleCount();
  return Array.from({length:n},(_,r)=>Array.from({length:n},(_,c)=>code.isDark(r,c)));
}

/** The code as SVG, `px` wide, with the four-module quiet zone the standard asks for. Black on white whatever the theme:
 *  a reader's camera needs the contrast, and a dark-mode inversion is a code many cameras cannot read. */
export function qrSvg(text:string,px=160,label=''):string{
  const m=qrMatrix(text),n=m.length,side=n+8;
  let d='';
  m.forEach((row,r)=>row.forEach((dark,c)=>{if(dark)d+=`M${c+4} ${r+4}h1v1h-1z`;}));
  return `<svg class="qr-code" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" width="${px}" height="${px}" `
    +`shape-rendering="crispEdges" role="img" aria-label="${(label||`QR code for ${text}`).replace(/[<>&"]/g,'')}">`
    +`<rect width="${side}" height="${side}" fill="#ffffff"/><path d="${d}" fill="#000000"/></svg>`;
}
