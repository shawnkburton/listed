import type {Property} from './domain';
import {distanceMeters,searchOrigin} from './geography';
import nearby from './nearby-properties.json';

export function normalizeAddress(address:string){return address.toLowerCase().replace(/\b(road|street|avenue|drive|boulevard|place|court)\b/g,w=>({road:'rd',street:'st',avenue:'ave',drive:'dr',boulevard:'blvd',place:'pl',court:'ct'}[w]!)).replace(/[^a-z0-9]/g,'');}
export function pinLocation(value:unknown):Property['location']|undefined{
 if(!value||typeof value!=='object')return;
 const {latitude,longitude}=value as Record<string,unknown>;
 if(typeof latitude!=='number'||typeof longitude!=='number'||!Number.isFinite(latitude)||!Number.isFinite(longitude)||Math.abs(latitude)>85||Math.abs(longitude)>180)return;
 return {latitude,longitude,distanceMeters:Math.round(distanceMeters(searchOrigin,{latitude,longitude})),precision:'SELLER_PIN',score:0};
}
// Reuse only exact known addresses in the same area, never a neighbourhood centroid.
export function knownLocation(address:string,area:string):Property['location']|undefined{
 const key=normalizeAddress(address);
 if(area==='Oak Bay'&&[normalizeAddress('1920 Crescent Rd'),normalizeAddress(searchOrigin.address),normalizeAddress(searchOrigin.address+', BC')].includes(key))return {latitude:searchOrigin.latitude,longitude:searchOrigin.longitude,distanceMeters:0,precision:'CIVIC_NUMBER',score:98};
 const match=nearby.find(p=>p.area===area&&normalizeAddress(p.address)===key);
 return match?.location?{...match.location}:undefined;
}
export function withKnownLocation(p:Property):Property{return p.location?p:{...p,location:knownLocation(p.address,p.area)};}
