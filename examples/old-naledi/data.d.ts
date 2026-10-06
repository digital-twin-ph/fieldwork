// Contract for the pinned artifact produced by scripts/extract-old-naledi.mjs.
// The generated data stays JavaScript; application source stays strictly typed.
import type {MultiPolygon} from 'geojson';
export const boundary:MultiPolygon;
export const facilities:{id:string;name:string;owner:string;serviceType:string;coordinates:number[]}[];
export const provenance:{repository:string;commit:string;files:{path:string;sha256:string}[];notes:string};
