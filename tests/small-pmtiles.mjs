/** A ONE-TILE PMTILES ARCHIVE, written here so a test can answer range requests without the network.
 *  Experiment 163: the gate uses a small local file in place of the 134.8 GB archive. The tile is a
 *  valid vector tile holding one empty layer. Format: PMTiles version 3, uncompressed. */
const varint=value=>{const out=[];while(value>127){out.push(value&127|128);value>>>=7;}out.push(value);return out;};
const TILE=Buffer.from([0x1a,0x05,0x0a,0x01,0x61,0x78,0x02]);

export function smallArchive(built='2026-03-31T00:00:00Z'){
  // One entry: tile id 0, run length 1, TILE.length bytes, at offset 0 (stored as offset + 1).
  const directory=Buffer.from([...varint(1),...varint(0),...varint(1),...varint(TILE.length),...varint(1)]);
  const metadata=Buffer.from(JSON.stringify({version:'test','planetiler:osm:osmosisreplicationtime':built}));
  const header=Buffer.alloc(127);
  header.write('PMTiles',0,'ascii');header[7]=3;
  let at=127;
  const span=(offset,bytes)=>{header.writeBigUInt64LE(BigInt(at),offset);header.writeBigUInt64LE(BigInt(bytes.length),offset+8);at+=bytes.length;};
  span(8,directory);span(24,metadata);
  header.writeBigUInt64LE(BigInt(at),40);header.writeBigUInt64LE(0n,48);
  span(56,TILE);
  for(const offset of [72,80,88])header.writeBigUInt64LE(1n,offset);
  header[96]=1;header[97]=1;header[98]=1;header[99]=1;header[100]=0;header[101]=0;
  header.writeInt32LE(-1800000000,102);header.writeInt32LE(-850000000,106);
  header.writeInt32LE(1800000000,110);header.writeInt32LE(850000000,114);
  return Buffer.concat([header,directory,metadata,TILE]);
}

/** Answers the archive's URL as a server that honours Range would. */
export const serveArchive=(page,bytes)=>page.route('**/v4.pmtiles',route=>{
  const [,from,to]=/bytes=(\d+)-(\d+)/.exec(route.request().headers().range||'')||[];
  const start=Number(from||0),end=Math.min(Number(to??bytes.length-1),bytes.length-1);
  return route.fulfill({status:206,body:bytes.subarray(start,end+1),headers:{
    'content-range':`bytes ${start}-${end}/${bytes.length}`,'accept-ranges':'bytes',etag:'"small"',
    'access-control-allow-origin':'*','access-control-expose-headers':'etag'}});
});
