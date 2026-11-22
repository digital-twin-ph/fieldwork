/** A JPEG's EXIF segment carrying a GPS position, little-endian, as a phone writes one: for tests of a pin's photo. */
export function exifSegment([lonDms,lonRef],[latDms,latRef]){
  const t=Buffer.alloc(128);t.write('II',0,'latin1');t.writeUInt16LE(42,2);t.writeUInt32LE(8,4);
  t.writeUInt16LE(1,8);t.writeUInt16LE(0x8825,10);t.writeUInt16LE(4,12);t.writeUInt32LE(1,14);t.writeUInt32LE(26,18);t.writeUInt32LE(0,22);
  t.writeUInt16LE(4,26);
  const entry=(i,tag,type,count,value)=>{const o=28+i*12;t.writeUInt16LE(tag,o);t.writeUInt16LE(type,o+2);t.writeUInt32LE(count,o+4);value(o+8);};
  entry(0,1,2,2,o=>t.write(latRef+'\0',o,'latin1'));entry(1,2,5,3,o=>t.writeUInt32LE(80,o));
  entry(2,3,2,2,o=>t.write(lonRef+'\0',o,'latin1'));entry(3,4,5,3,o=>t.writeUInt32LE(104,o));
  t.writeUInt32LE(0,76);
  latDms.forEach((v,i)=>{t.writeUInt32LE(v,80+i*8);t.writeUInt32LE(1,84+i*8);});
  lonDms.forEach((v,i)=>{t.writeUInt32LE(v,104+i*8);t.writeUInt32LE(1,108+i*8);});
  const head=Buffer.from([0xff,0xe1,0,0]);head.writeUInt16BE(2+6+t.length,2);
  return Buffer.concat([head,Buffer.from('Exif\0\0','latin1'),t]);
}
/** The JPEG given, with that segment put after its start marker. */
export const withExif=(jpeg,segment)=>Buffer.concat([jpeg.subarray(0,2),segment,jpeg.subarray(2)]);
