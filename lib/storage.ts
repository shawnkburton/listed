import {validSearchArea} from './radius-search';
import {clientId} from './client-id';
import { defaults, eventKinds, type BuyerState, type EngagementEvent, type Property } from './domain';
import { properties } from './properties';
import { validPreferences } from './recommendations';
export const STORAGE_KEY='listed-marketplace:v1:guest';
export function storageKey(uid?:string|null){return uid?`listed-marketplace:v1:user:${encodeURIComponent(uid)}`:STORAGE_KEY;}
export function freshState():BuyerState { return {version:1,preferencesVersion:2,visitorId:clientId(),preferences:{...defaults},events:[]}; }
export function parseState(raw:string|null,catalog:Property[]=properties):BuyerState {
 const fallback=freshState(); if(!raw)return fallback;
 try {const s=JSON.parse(raw); if(s.version!==1||!validPreferences(s.preferences))return fallback;
  const ids=new Set(catalog.map(p=>p.id));
  const events=(Array.isArray(s.events)?s.events:[]).filter((e:EngagementEvent)=>e&&typeof e.id==='string'&&typeof e.visitorId==='string'&&typeof e.sessionId==='string'&&(ids.has(e.propertyId)||/^seller-[a-f0-9-]{36}$/.test(e.propertyId))&&eventKinds.includes(e.kind)&&Number.isFinite(e.at)&&e.at<=Date.now()&&e.at>Date.now()-90*86400000&&e.provenance==='local'&&(!e.reason||['price','location','style','size','other'].includes(e.reason))).slice(-2000);
  // Remove the old seeded criteria once; retain activity and independently chosen criteria.
  const oldSeed=s.preferencesVersion!==2&&s.preferences.area==='Oak Bay'&&s.preferences.style==='Modern'&&s.preferences.maxPrice===1800000&&s.preferences.minBeds===3;
  const preferences=oldSeed?{...s.preferences,area:'',style:'',maxPrice:0,minBeds:0}:s.preferences;
  return {version:1,preferencesVersion:2,visitorId:typeof s.visitorId==='string'?s.visitorId:fallback.visitorId,preferences,events,analyticsEnabled:s.analyticsEnabled!==false,searchArea:validSearchArea(s.searchArea)};
 }catch{return fallback;}
}
export const localBuyerRepository=(uid?:string|null)=>({load(){try{return parseState(localStorage.getItem(storageKey(uid)));}catch{return freshState();}},save(state:BuyerState){try{localStorage.setItem(storageKey(uid),JSON.stringify(state));return true;}catch{return false;}}});
