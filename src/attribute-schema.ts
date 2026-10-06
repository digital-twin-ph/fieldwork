import type {AttributeType, AttributeDefinition, PointCollection, Scalar} from './types.js';
export const ATTRIBUTE_TYPES=['text','number','integer','boolean','date'];
export const validAttributeKey=(key:string)=>/^[a-zA-Z][a-zA-Z0-9_]{0,59}$/.test(key)&&!['name','capturedAt','constructor','prototype'].includes(key);
const validDate=(value:unknown)=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
export function parseAttributeValue(raw:string,type:AttributeType):Scalar{
  if(raw==='')return null;
  if(type==='text')return raw;
  const text=raw.trim();
  if(type==='boolean'){if(!['true','false','yes','no'].includes(text.toLowerCase()))throw new Error('Enter yes/no or true/false.');return ['true','yes'].includes(text.toLowerCase());}
  if(type==='date'){if(!validDate(text))throw new Error('Enter a valid calendar date as YYYY-MM-DD.');return text;}
  if(['number','integer'].includes(type)){const value=Number(text);if(!/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(text)||!Number.isFinite(value)||(type==='integer'&&!Number.isSafeInteger(value)))throw new Error(type==='integer'?'Enter a safe whole number.':'Enter a finite number.');return value;}
  throw new Error('Choose a supported attribute type.');
}
export function parseValueSet(text:string,type:AttributeType){const lines=text.split(/\r?\n/).map(v=>v.trim()).filter(Boolean);if(!lines.length)return undefined;const values=lines.map(v=>parseAttributeValue(v,type));if(values.length>100||new Set(values.map(v=>JSON.stringify(v))).size!==values.length)throw new Error('Use at most 100 unique allowed values, one per line.');return values;}
export function validateAttributeValue(value:unknown,definition:AttributeDefinition){
  if(value===null||value===undefined)return;
  const {type,allowedValues,key}=definition;
  const matches=type==='text'?typeof value==='string'&&value.length<=1000:type==='number'?typeof value==='number'&&Number.isFinite(value):type==='integer'?Number.isSafeInteger(value):type==='boolean'?typeof value==='boolean':type==='date'&&validDate(value);
  if(!matches)throw new Error(`${key} must have data type ${type}.`);
  if(allowedValues&&!allowedValues.some(v=>v===value))throw new Error(`${key} must use a value from its allowed set.`);
}
export function validateAttributeSchema(data:PointCollection,fields:AttributeDefinition[]=[],rules:AttributeDefinition[]=[]){
  if(!Array.isArray(fields)||fields.length>30||!Array.isArray(rules)||rules.length>50)throw new Error('Use at most 30 shared form fields and 50 attribute definitions.');
  const keys=new Set();for(const field of [...fields,...rules]){
    if(!field||!validAttributeKey(field.key)||keys.has(field.key)||!ATTRIBUTE_TYPES.includes(field.type)||(fields.includes(field)&&(typeof field.label!=='string'||!field.label.trim()||field.label.length>100)))throw new Error('Invalid or duplicate attribute definition.');keys.add(field.key);
    if(field.allowedValues!==undefined){if(!Array.isArray(field.allowedValues)||!field.allowedValues.length||field.allowedValues.length>100||new Set(field.allowedValues.map(v=>JSON.stringify(v))).size!==field.allowedValues.length)throw new Error('Use 1–100 unique values in an allowed set.');for(const value of field.allowedValues){if(value===null)throw new Error('Null represents missing data, not an allowed choice.');validateAttributeValue(value,{...field,allowedValues:undefined});}}
    if(Object.hasOwn(field,'defaultValue'))validateAttributeValue(field.defaultValue,field);
    for(const record of data.features)validateAttributeValue(record.properties[field.key],field);
  }
}
export function attributeLiteral(value:Scalar,type?:AttributeType){
  const datatype:Partial<Record<AttributeType,string>>={date:'date',integer:'integer',number:'double'};
  const iri=type?datatype[type]:undefined;
  return iri?`${JSON.stringify(String(value))}^^<http://www.w3.org/2001/XMLSchema#${iri}>`:JSON.stringify(value);
}
