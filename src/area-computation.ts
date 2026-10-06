import type {Boundary, AreaUnit, Measurement} from './types.js';
import {area as turfArea} from '@turf/area';

export const AREA_METHOD='Turf 7.3.5 spherical polygon area; mean Earth radius 6371008.8 m';
export const AREA_UNITS={
  m2:{label:'Square metres (m²)',symbol:'m²',system:'Metric',squareMetres:1},
  km2:{label:'Square kilometres (km²)',symbol:'km²',system:'Metric',squareMetres:1000000},
  ha:{label:'Hectares (ha)',symbol:'ha',system:'Metric',squareMetres:10000},
  ft2:{label:'Square feet (ft²)',symbol:'ft²',system:'Imperial',squareMetres:0.09290304},
  acre:{label:'Acres',symbol:'acres',system:'Imperial',squareMetres:4046.8564224},
  mi2:{label:'Square miles (mi²)',symbol:'mi²',system:'Imperial',squareMetres:2589988.110336}
};
export function validateAreaUnit(unit:unknown):asserts unit is AreaUnit{if(!(typeof unit==='string'&&Object.hasOwn(AREA_UNITS,unit)))throw new Error('Select a supported metric or imperial area unit.');}
export function calculateArea(geometry:Boundary,unit:AreaUnit='km2'):Measurement{
  validateAreaUnit(unit);
  if(!['Polygon','MultiPolygon'].includes(geometry?.type))throw new Error('Calculate area requires a polygon boundary.');
  const squareMetres=turfArea(geometry);
  if(!Number.isFinite(squareMetres)||squareMetres<=0)throw new Error('The boundary must enclose a positive, finite area.');
  return {squareMetres,value:squareMetres/AREA_UNITS[unit].squareMetres,unit,method:AREA_METHOD};
}
export function formatArea(measurement:Measurement){
  const {value,unit}=measurement;validateAreaUnit(unit);
  return `${new Intl.NumberFormat('en',{maximumSignificantDigits:6}).format(value)} ${AREA_UNITS[unit].symbol}`;
}
