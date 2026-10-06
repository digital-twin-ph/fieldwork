import {referenceURL} from './evidence.js';
export const RASTER_SOURCE_FIELDS={title:'Dataset title',provider:'Provider / publisher',sourceURL:'Dataset landing page URL',downloadURL:'Original asset download URL',identifier:'DOI or other identifier',citation:'Recommended citation',license:'License / terms',version:'Product / release version',temporalCoverage:'Year or temporal coverage',published:'Production / publication date',accessed:'Source accessed date',units:'Pixel value units',notes:'Methods, limitations and source notes'} as const;
export type RasterProvenance=Partial<Record<keyof typeof RASTER_SOURCE_FIELDS,string>>;
export function validateRasterProvenance(value:unknown):asserts value is RasterProvenance|undefined{
 if(value===undefined)return;if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('Invalid raster source metadata.');
 for(const [key,text] of Object.entries(value)){if(!Object.hasOwn(RASTER_SOURCE_FIELDS,key)||typeof text!=='string'||text.length>(['citation','notes'].includes(key)?4000:2000))throw new Error('Raster metadata fields must be text within their length limits.');if(['sourceURL','downloadURL'].includes(key)&&text)referenceURL(text);}
}
export const WORLDPOP_BOTSWANA_FILENAME='bwa_pop_2026_CN_100m_R2025A_v1.tif';
// Transcribed from provider record 72624 on 2026-10-06. Explicit user review, not file-identity verification.
export const WORLDPOP_BOTSWANA:RasterProvenance={
  "title": "Botswana - Spatial Distribution of Population",
  "provider": "WorldPop - University of Southampton",
  "sourceURL": "https://hub.worldpop.org/geodata/summary?id=72624",
  "downloadURL": "https://data.worldpop.org/GIS/Population/Global_2015_2030/R2025A/2026/BWA/v1/100m/constrained/bwa_pop_2026_CN_100m_R2025A_v1.tif",
  "identifier": "10.5258/SOTON/WP00839",
  "citation": "Bondarenko M., Priyatikanto R., Tejedor-Garavito N., Zhang W., McKeen T., Cunningham A., Woods T., Hilton J., Cihan D., Nosatiuk B., Brinkhoff T., Tatem A., Sorichetta A.. 2025 Constrained estimates of 2015-2030 total number of people per grid square at a resolution of 3 arc (approximately 100m at the equator) R2025A version v1. Global Demographic Data Project - Funded by The Bill and Melinda Gates Foundation (INV-045237). WorldPop - School of Geography and Environmental Science, University of Southampton. DOI:10.5258/SOTON/WP00839",
  "license": "CC BY 4.0 - https://creativecommons.org/licenses/by/4.0/. Provider also lists ODbL terms for datasets derived from OpenStreetMap, Microsoft Building Footprints or Microsoft Roads Detection; review applicable product terms.",
  "version": "R2025A v1 (alpha)",
  "temporalCoverage": "2026",
  "published": "2025-09-01",
  "accessed": "2026-10-06",
  "units": "people per pixel",
  "notes": "Provider describes Random Forest-based dasymetric redistribution. Approximately 100 m at the equator (3 arc-seconds). Alpha release may be revised. Metadata transcribed from provider page; selecting this template does not verify the uploaded file identity."
};
export function rasterProvenanceN3(subject:string,metadata:RasterProvenance|undefined):string{validateRasterProvenance(metadata);if(!metadata)return '';const predicates:Record<string,string>={title:'dct:title',provider:'dct:publisher',sourceURL:'dcat:landingPage',downloadURL:'dcat:downloadURL',identifier:'dct:identifier',citation:'dct:bibliographicCitation',license:'dct:license',version:'dcat:version',temporalCoverage:'dct:temporal',published:'dct:issued',accessed:'fw:sourceAccessed',units:'fw:pixelValueUnits',notes:'dct:description'};return subject+' fw:metadataOrigin "Workflow-author entry; not asserted to be original TIFF tags".\n'+Object.entries(metadata).filter(([,v])=>v).map(([k,v])=>subject+' '+predicates[k]+' '+(['sourceURL','downloadURL'].includes(k)?'<'+referenceURL(v!)+'>':JSON.stringify(v))+'.\n').join('');}
