import type {MapSearchArea,Preferences,Property} from './domain';
import type {Recommendation} from './recommendations';
import {distanceMeters,searchOrigin} from './geography';
export const defaultSearchArea:MapSearchArea={latitude:searchOrigin.latitude,longitude:searchOrigin.longitude,radiusKm:1,includeOutside:true};
export const radiusOptions=[.25,.5,.75,1,2,5,10,25,50,100];
export function validSearchArea(value:unknown):MapSearchArea|null {
 if(!value||typeof value!=='object')return null;const a=value as MapSearchArea;
 return Number.isFinite(a.latitude)&&Math.abs(a.latitude)<=85&&Number.isFinite(a.longitude)&&Math.abs(a.longitude)<=180&&Number.isFinite(a.radiusKm)&&a.radiusKm>=.25&&a.radiusKm<=100&&typeof a.includeOutside==='boolean'?{latitude:a.latitude,longitude:a.longitude,radiusKm:a.radiusKm,includeOutside:a.includeOutside}:null;
}
export function mapDistance(p:Property,area:MapSearchArea):number|null {
 const l=p.location;return l&&Number.isFinite(l.latitude)&&Math.abs(l.latitude)<=90&&Number.isFinite(l.longitude)&&Math.abs(l.longitude)<=180?distanceMeters(area,l):null;
}
export function matchesOtherCriteria(p:Property,prefs:Preferences){return (!prefs.maxPrice||(p.price>0&&p.price<=prefs.maxPrice))&&p.beds>=prefs.minBeds&&(!prefs.area||p.area===prefs.area)&&(!prefs.style||p.style===prefs.style);}
export function radiusFeed(ranked:Recommendation[],prefs:Preferences,area:MapSearchArea|null|undefined):Recommendation[]{
 if(!area)return ranked;
 const inside:Recommendation[]=[],outside:Recommendation[]=[];
 for(const r of ranked){const distance=mapDistance(r.property,area);if(distance===null)continue;
  const outsideRadius=distance>area.radiusKm*1000;
  const row={...r,distanceFromCentre:distance,outsideRadius,discovery:r.discovery||outsideRadius,reasons:[`${(distance/1000).toFixed(2)} km from your search centre · ${outsideRadius?'outside':'inside'} your ${area.radiusKm} km radius`,...r.reasons]};
  if(!outsideRadius)inside.push(row);else if(area.includeOutside&&matchesOtherCriteria(r.property,prefs))outside.push(row);
 }
 // One outside suggestion after every four local homes; never fill a sparse feed with outsiders.
 const result:Recommendation[]=[];let next=0;
 inside.forEach((r,i)=>{result.push(r);if((i+1)%4===0&&next<outside.length)result.push(outside[next++]);});
 return result;
}
