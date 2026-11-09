import { type BuyerState, type EngagementEvent, type Preferences, type Property } from './domain';
export function activeIds(events:EngagementEvent[], on:'like'|'save'|'hide', off:'unlike'|'unsave'|'unhide') {
 const ids=new Set<string>(); for(const e of events) { if(e.kind===on)ids.add(e.propertyId); if(e.kind===off)ids.delete(e.propertyId); } return ids;
}
export function learnedAffinities(properties:Property[], events:EngagementEvent[], now=Date.now()) {
 const affinities:Record<string,number>={}; const recent=events.filter(e=>e.at<=now&&now-e.at<90*86400000);
 const likes=activeIds(recent,'like','unlike'), saves=activeIds(recent,'save','unsave'), hidden=activeIds(recent,'hide','unhide');
 for(const p of properties){
  const ev=recent.filter(e=>e.propertyId===p.id); const age=ev.length?Math.max(0,(now-ev[ev.length-1].at)/86400000):90;
  // Each property contributes once per action, so repeated clicking cannot farm affinity.
  const w=((likes.has(p.id)?2:0)+(saves.has(p.id)?4:0)+(ev.some(e=>e.kind==='share')?3:0)+(ev.some(e=>e.kind==='open')?.5:0)+(ev.some(e=>e.kind==='photo')?.25:0))*Math.pow(.5,age/30);
  for(const key of [p.area,p.style,...p.tags])affinities[key]=(affinities[key]||0)+w;
  if(hidden.has(p.id)){
   const reason=ev.filter(e=>e.kind==='hide').at(-1)?.reason;
   const keys=reason==='location'?[p.area]:reason==='style'?[p.style]:[];
   for(const key of keys)affinities[key]=(affinities[key]||0)-6;
  }
 } return affinities;
}
export interface Recommendation { distanceFromCentre?:number; outsideRadius?:boolean; property:Property; score:number; match:number; discovery:boolean; reasons:string[]; tradeoffs:string[] }
export function rankProperties(properties:Property[], state:BuyerState, now=Date.now()):Recommendation[] {
 const prefs=state.preferences, hidden=activeIds(state.events,'hide','unhide');
 const affinity=prefs.learning?learnedAffinities(properties,state.events,now):{};
 const candidates=properties.filter(p=>!hidden.has(p.id)&&(!prefs.strictBudget||!prefs.maxPrice||(p.price>0&&p.price<=prefs.maxPrice)));
 const ranked=candidates.map(p=>{
  const budget=!prefs.maxPrice||(p.price>0&&p.price<=prefs.maxPrice), beds=p.beds>=prefs.minBeds, area=!prefs.area||p.area===prefs.area, style=!prefs.style||p.style===prefs.style;
  const stated=(area?25:0)+(style?30:0)+(budget?25:p.price>0?Math.max(0,25-(p.price/prefs.maxPrice-1)*100):0)+(beds?20:0);
  const raw=[p.area,p.style,...p.tags].reduce((n,key)=>n+(affinity[key]||0),0);
  const learned=Math.max(-10,Math.min(10,raw/3));
  const reasons=[!prefs.area?`${p.area} neighbourhood`:area?`In your preferred area, ${p.area}`:`${p.area}: a neighbourhood to discover`,!prefs.style?`${p.style} style`:style?`${p.style} style, just as you asked`:`A different style: ${p.style.toLowerCase()}`,p.price<=0?'Asking price not set; budget match unknown':!prefs.maxPrice?'No budget limit set':budget?'Within your stated budget':`$${(p.price-prefs.maxPrice).toLocaleString('en-CA')} above your budget`,!prefs.minBeds?`${p.beds} bedrooms`:beds?`${p.beds} bedrooms meets your preference`:`${p.beds} bedrooms; you prefer ${prefs.minBeds}+`];
  const learnedKey=[p.style,...p.tags,p.area].filter(k=>(affinity[k]||0)>0).sort((a,b)=>(affinity[b]||0)-(affinity[a]||0))[0];
  if(learnedKey)reasons.push(`Your activity suggests an interest in ${learnedKey.toLowerCase()}`);
  return {property:p,score:stated*.8+learned,match:Math.round(stated),discovery:!area||!style||!budget||!beds,reasons,tradeoffs:[...(!area?[`Outside ${prefs.area}`]:[]),...(!style?[`${p.style} style`]:[]),...(!budget?[p.price>0?'Above budget':'Price not set']:[]),...(!beds?['Fewer bedrooms']:[])]};
 }).sort((a,b)=>b.score-a.score||a.property.id.localeCompare(b.property.id));
 const matches=ranked.filter(r=>!r.discovery), adjacent=ranked.filter(r=>r.discovery);
 if(prefs.discovery===0)return matches;
 if(!matches.length)return adjacent;
 const interval=Math.max(2,Math.round(100/prefs.discovery)); const result:Recommendation[]=[];
 // Deliberate adjacent slots; never bypass a hard budget. Remaining candidates are still browsable.
 while(matches.length||adjacent.length){
  const explore=(result.length+1)%interval===0||!matches.length;
  result.push((explore&&adjacent.length?adjacent.shift():matches.length?matches.shift():adjacent.shift())!);
 }return result;
}
export function validPreferences(value:unknown):Preferences | null {
 if(!value||typeof value!=='object')return null;
 const p=value as Preferences;
 return ['','Oak Bay','Saanich','Fairfield','Victoria'].includes(p.area)&&['','Modern','Character','Coastal','Townhome'].includes(p.style)&&Number.isFinite(p.maxPrice)&&p.maxPrice>=0&&p.maxPrice<=100000000&&Number.isInteger(p.minBeds)&&p.minBeds>=0&&p.minBeds<=10&&[0,25,50].includes(p.discovery)&&typeof p.strictBudget==='boolean'&&typeof p.learning==='boolean'?p:null;
}
