import {validYearBuilt,yearBuiltLimits} from './listing-year';
import type {Property,AssessmentImport} from './domain';
export type AssessmentField='beds'|'baths'|'year'|'lot';
export const assessmentLabels:Record<AssessmentField,string>={beds:'Bedrooms',baths:'Bathrooms',year:'Year built',lot:'Lot size (sq ft)'};
export function normalizedAddress(address:string){return address.toLowerCase().replace(/[.,]/g,'').replace(/\s+/g,' ').trim();}
export function assessedLotSquareFeet(lot:string):number|undefined{
 const m=lot.trim().match(/^([\d,]+(?:\.\d+)?|\.\d+)\s*(sq\s*ft|square feet|acres?)$/i);if(!m)return;
 const n=Number(m[1].replaceAll(',',''))*(/^acre/i.test(m[2])?43560:1);return n>0&&n<=10000000?Math.round(n):undefined;
}
export interface AssessmentPreview{reference:AssessmentImport;fields:Partial<Record<AssessmentField,number>>;lot:string;warnings:string[]}
// Strictly recognize labelled values from the seller's copied record. Never infer a missing value.
export function parseAssessment(text:string,url=''):AssessmentPreview{
 if(text.length>50000)throw new Error('Paste one property record, up to 50,000 characters.');
 const clean=text.replace(/\r/g,'').replace(/\u00a0/g,' ');
 const markers=[...clean.matchAll(/^Area-Jurisdiction-Roll\s*:/gmi)];
 if(markers.length!==1)throw new Error('Copy one complete property record, including its address and Area-Jurisdiction-Roll line.');
 const before=clean.slice(0,markers[0].index).split('\n').map(l=>l.trim()).filter(Boolean);
 const address=before.at(-1)||'';
 if(!/^\d/.test(address)||address.length>160)throw new Error('The property address was not found. Include the address above Area-Jurisdiction-Roll.');
 const read=(label:string)=>{
  const matches=[...clean.matchAll(new RegExp('^'+label+'(?:[ \\t]*:[ \\t]*|[ \\t]+|\\n[ \\t]*)([^\\n]+)$','gmi'))];
  return matches.length===1?matches[0][1].trim():'';
 };
 const fields:AssessmentPreview['fields']={};
 for(const [label,key,max,step] of [['Bedrooms','beds',50,1],['Baths|Bathrooms','baths',50,.5],['Year built','year',yearBuiltLimits().max,1]] as const){
  const raw=read(`(?:${label})`);if(!/^\d+(?:\.\d+)?$/.test(raw))continue;
  const n=Number(raw);if(n>=0&&n<=max&&Number.isInteger(n/step)&&(key!=='year'||(n>0&&validYearBuilt(n))))fields[key]=n;
 }
 const lot=read('Land size'),area=assessedLotSquareFeet(lot);if(area!==undefined)fields.lot=area;
 if(!Object.keys(fields).length)throw new Error('No supported property details were found. Include the Property information section with year built, bedrooms, baths or land size.');
 const pid=clean.match(/^PID:\s*(\d{3}-\d{3}-\d{3})\s*$/mi)?.[1];
 const year=clean.match(/\b(20\d{2}) assessment as of\b/i)?.[1];
 const total=clean.match(/^Total value\s*\n?\s*\$([\d,]+)\s*$/mi)?.[1];
 const reference:AssessmentImport={address,...(pid?{pid}:{}),...(year?{year:Number(year)}:{}),...(total?{value:Number(total.replaceAll(',',''))}:{})};
 if(url.trim()){const valid=assessmentSourceUrl(url);if(!valid)throw new Error('Use the property record link from www.bcassessment.ca/Property/Info/.');reference.url=valid;}
 const warnings=['Copied assessment details are seller-provided and have not been independently verified.','Check the neighbourhood and property type yourself. Floor-area components are not combined into a total.'];
 if(lot&&area===undefined)warnings.push('Lot area was not imported: frontage and depth do not establish the surveyed area.');
 if(/more than one structure|main building only/i.test(clean))warnings.push('The record says these details cover the main building only. Check other structures separately.');
 return {reference,fields,lot,warnings};
}
export function assessmentSourceUrl(value:unknown){
 if(typeof value!=='string'||value.length>500)return;
 try{const u=new URL(value.trim());if(u.protocol==='https:'&&['www.bcassessment.ca','bcassessment.ca'].includes(u.hostname)&&!u.username&&!u.password&&!u.port&&/^\/Property\/Info\/[A-Za-z\d=_%+-]+\/?$/i.test(u.pathname)&&!u.search&&!u.hash)return u.href;}catch{}
}
// Retained only as a seller-provided reference, never as verified assessment data.
export function sanitizeAssessmentImport(value:unknown,address:string):AssessmentImport|undefined{
 if(!value||typeof value!=='object')return;
 const v=value as Record<string,unknown>;
 if(typeof v.address!=='string'||v.address.length>160||normalizedAddress(v.address)!==normalizedAddress(address))return;
 const r:AssessmentImport={address:v.address.trim()};
 if(typeof v.pid==='string'&&/^\d{3}-\d{3}-\d{3}$/.test(v.pid))r.pid=v.pid;
 if(typeof v.year==='number'&&Number.isInteger(v.year)&&v.year>=1900&&v.year<=new Date().getFullYear()+1)r.year=v.year;
 if(typeof v.value==='number'&&Number.isInteger(v.value)&&v.value>=0&&v.value<=1000000000)r.value=v.value;
 const url=assessmentSourceUrl(v.url);if(url)r.url=url;
 return r;
}
export function applyAssessment(draft:Property,preview:AssessmentPreview,selected:AssessmentField[]):Property{
 const patch:Partial<Property>={};for(const f of selected)if(Object.hasOwn(preview.fields,f))patch[f]=preview.fields[f];
 return {...draft,...patch,address:preview.reference.address,assessmentImport:preview.reference};
}
