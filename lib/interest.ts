import type { Property } from './domain';
// Only a trusted server ingestion pipeline may produce these. Local prototype events never qualify.
export interface VerifiedSignal { propertyId:string; buyerId:string; kind:'view'|'save'|'share'|'showing'; at:number; verified:true }
export function interestFor(property:Property, catalog:Property[], signals:VerifiedSignal[], now=Date.now()) {
 const windowMs=7*86400000;
 const recent=signals.filter(e=>e.verified===true&&e.at<=now&&now-e.at<=windowMs);
 function counts(id:string){
  const events=recent.filter(e=>e.propertyId===id), buyers=(kind:VerifiedSignal['kind'])=>new Set(events.filter(e=>e.kind===kind).map(e=>e.buyerId));
  const viewers=buyers('view'); const engaged=new Set(events.filter(e=>e.kind!=='view'&&viewers.has(e.buyerId)).map(e=>e.buyerId));
  return {viewers:viewers.size,engaged:engaged.size,saves:buyers('save').size,shares:buyers('share').size,showings:buyers('showing').size,rate:viewers.size?engaged.size/viewers.size:0};
 }
 const own=counts(property.id);
 const peers=catalog.filter(p=>p.id!==property.id&&p.area===property.area&&p.type===property.type&&p.price>=property.price*.75&&p.price<=property.price*1.25&&Math.abs(p.daysListed-property.daysListed)<=7).map(p=>counts(p.id)).filter(c=>c.viewers>=10);
 const rates=peers.map(p=>p.rate).sort((a,b)=>a-b); const mid=Math.floor(rates.length/2);
 const baseline=rates.length?(rates.length%2?rates[mid]:(rates[mid-1]+rates[mid])/2):0;
 const enough=own.viewers>=10&&peers.length>=3;
 const high=enough&&own.engaged>=5&&own.rate>=.2&&own.rate>=Math.max(.1,baseline*1.5);
 return {...own,high,enough,baseline,peerCount:peers.length,windowDays:7};
}
