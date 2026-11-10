import type {SellerListing,Thread} from './marketplace-domain';
export const analyticsKinds=['impression','open','like','unlike','save','unsave','share','share_open','photo','video_play','video_complete','hide','unhide'] as const;
export type AnalyticsKind=typeof analyticsKinds[number];
export type AnalyticsRange='today'|'7'|'30'|'all';
export interface ListingEvent {visitor:string;known:number;session:string;kind:AnalyticsKind;at:number;media:string;reason:string}
export const ANALYTICS_ZONE='America/Vancouver';
const dayFormatter=new Intl.DateTimeFormat('en-CA',{timeZone:ANALYTICS_ZONE,year:'numeric',month:'2-digit',day:'2-digit'});
export function dayKey(at:number){return dayFormatter.format(at);}
const dayShift=(key:string,n:number)=>new Date(Date.parse(`${key}T12:00:00Z`)+n*86400000).toISOString().slice(0,10);
function distinct(events:ListingEvent[]){return new Set(events.map(e=>e.visitor)).size;}
function median(values:number[]){if(!values.length)return null;const sorted=[...values].sort((a,b)=>a-b),m=Math.floor(sorted.length/2);return sorted.length%2?sorted[m]:(sorted[m-1]+sorted[m])/2;}
export function listingCompleteness(listing:SellerListing){const p=listing.property;const items=[
 {label:'Street address',done:!!p.address.trim()}, {label:'Asking price',done:p.price>0}, {label:'Floor area',done:p.sqft>0},
 {label:'Property description',done:p.description.trim().length>=30}, {label:'Cover photo',done:p.photos.length>0},
 {label:'At least five photos',done:p.photos.length>=5}, {label:'Year built',done:p.year>0}, {label:'Lot size',done:p.lot>0}
 ];return {score:Math.round(items.filter(i=>i.done).length/items.length*100),items,videoCount:p.videos?.length||0};}
export function summarizeListing(listing:SellerListing,threads:Thread[],events:ListingEvent[],range:AnalyticsRange,trackingStartedAt:number,visitorForUser:(uid:string)=>string,photoKeys:string[],now=Date.now()){
 const today=dayKey(now),since=range==='all'?'0000-01-01':dayShift(today,range==='today'?0:range==='7'?-6:-29);
 const inRange=(at:number)=>at<=now&&dayKey(at)>=since;
 const all=events.filter(e=>e.at<=now).sort((a,b)=>a.at-b.at),selected=all.filter(e=>inRange(e.at));
 const of=(kind:AnalyticsKind)=>selected.filter(e=>e.kind===kind);
 function state(kind:'like'|'save'|'hide',items:ListingEvent[]){const map=new Map<string,ListingEvent>();const off={like:'unlike',save:'unsave',hide:'unhide'}[kind];for(const e of items){if(e.kind===kind)map.set(e.visitor,e);else if(e.kind===off)map.delete(e.visitor);}return map;}
 const likes=state('like',all),saves=state('save',all),hides=state('hide',all),baseline=all.filter(e=>!inRange(e.at));
 const contacts=threads.filter(t=>t.listingId===listing.id).map(t=>{
  const incoming=t.messages.filter(m=>m.senderId===t.buyerId).sort((a,b)=>a.at-b.at),first=incoming[0]?.at;
  const reply=first===undefined?undefined:t.messages.filter(m=>m.senderId===t.sellerId&&m.at>=first).sort((a,b)=>a.at-b.at)[0]?.at;
  return {thread:t,visitor:visitorForUser(t.buyerId),first,reply,response:first!==undefined&&reply!==undefined?reply-first:null};
 });
 const inquiries=contacts.filter(c=>c.first!==undefined&&inRange(c.first));
 const visits=contacts.flatMap(c=>c.thread.showings.map(v=>({...v,visitor:c.visitor,at:v.createdAt??v.updatedAt,legacy:v.createdAt===undefined}))).filter(v=>inRange(v.at));
 const responses=inquiries.filter(c=>c.response!==null).map(c=>c.response!);
 // A funnel is one ordered journey by the same measured visitor in the selected period.
 const stages=['Feed appearance','Property view','Saved home','Inquiry','Showing request'];
 let cohort=new Map<string,number>();for(const e of of('impression'))if(!cohort.has(e.visitor))cohort.set(e.visitor,e.at);
 const funnel=[{label:stages[0],count:cohort.size,rate:null as number|null}];
 const stageEvents=[of('open'),of('save'),inquiries.map(c=>({visitor:c.visitor,at:c.first!})),visits.map(v=>({visitor:v.visitor,at:v.at}))];
 for(const [i,items] of stageEvents.entries()){const next=new Map<string,number>();for(const item of [...items].sort((a,b)=>a.at-b.at)){const previous=cohort.get(item.visitor);if(previous!==undefined&&item.at>=previous&&!next.has(item.visitor))next.set(item.visitor,item.at);}funnel.push({label:stages[i+1],count:next.size,rate:cohort.size?next.size/cohort.size:null});cohort=next;}
 const feedback=[...hides.values()].filter(e=>inRange(e.at)),feedbackEnough=feedback.length>=5;
 const reasons=['price','location','style','size','other'];
 const firstDay=range==='all'?dayKey(Math.min(trackingStartedAt,...inquiries.map(c=>c.first!),...visits.map(v=>v.at))):since;
 const chartStart=firstDay<dayShift(today,-365)?dayShift(today,-365):firstDay;
 const dailyEvents=new Map<string,ListingEvent[]>();for(const e of selected){const key=dayKey(e.at);dailyEvents.set(key,[...(dailyEvents.get(key)||[]),e]);}
 const days=[];for(let day=chartStart;day<=today;day=dayShift(day,1)){
  const rows=dailyEvents.get(day)||[];
  days.push({date:day,views:rows.filter(e=>e.kind==='open').length,visitors:distinct(rows.filter(e=>e.kind==='open')),saves:distinct(rows.filter(e=>e.kind==='save')),likes:distinct(rows.filter(e=>e.kind==='like')),inquiries:inquiries.filter(c=>dayKey(c.first!)===day).length});
 }
 const photoEvents=of('photo'),videoEvents=selected.filter(e=>e.kind==='video_play'||e.kind==='video_complete');
 const photos=photoKeys.map((key,index)=>({index,views:photoEvents.filter(e=>e.media===key).length,visitors:distinct(photoEvents.filter(e=>e.media===key))}));
 const videos=(listing.property.videos||[]).map(id=>{const rows=videoEvents.filter(e=>e.media===id),plays=rows.filter(e=>e.kind==='video_play'),completed=rows.filter(e=>e.kind==='video_complete'&&plays.some(p=>p.visitor===e.visitor&&p.session===e.session&&p.at<=e.at));return {id,plays:plays.length,visitors:distinct(plays),completions:completed.length,completionRate:plays.length?completed.length/plays.length:null};});
 return {listingId:listing.id,range,generatedAt:now,trackingStartedAt,firstPublishedAt:listing.firstPublishedAt??null,timeZone:ANALYTICS_ZONE,
  impressions:{total:of('impression').length,unique:distinct(of('impression'))},views:{total:of('open').length,unique:distinct(of('open')),signedIn:distinct(of('open').filter(e=>e.known===1)),guests:distinct(of('open').filter(e=>e.known===0))},
  likes:{current:likes.size,added:distinct(of('like')),removed:distinct(of('unlike')),net:likes.size-state('like',baseline).size},saves:{current:saves.size,added:distinct(of('save')),removed:distinct(of('unsave')),net:saves.size-state('save',baseline).size},
  shares:{copies:of('share').length,sharers:distinct(of('share')),opens:of('share_open').length,visitors:distinct(of('share_open'))},
  inquiries:{buyers:inquiries.length,messages:contacts.reduce((n,c)=>n+c.thread.messages.filter(m=>m.senderId===c.thread.buyerId&&inRange(m.at)).length,0)},
  showings:{total:visits.length,requested:visits.filter(v=>v.status==='requested').length,confirmed:visits.filter(v=>v.status==='confirmed').length,declined:visits.filter(v=>v.status==='declined').length,cancelled:visits.filter(v=>v.status==='cancelled').length,legacyDates:visits.some(v=>v.legacy)},
  response:{medianMs:median(responses),answered:responses.length,unanswered:inquiries.filter(c=>c.reply===undefined).length,within24Hours:responses.filter(v=>v<=86400000).length},
  contacts:contacts.filter(c=>c.first!==undefined&&inRange(c.first)||c.thread.showings.some(v=>inRange(v.createdAt??v.updatedAt))).map(c=>({threadId:c.thread.id,name:c.thread.buyerName,firstInquiryAt:c.first??null,responseMs:c.response,showings:c.thread.showings.map(v=>({startsAt:v.startsAt,status:v.status})),unread:(c.thread.readAt[listing.sellerId]||0)<c.thread.updatedAt})),
  funnel,days,chartTruncated:firstDay<chartStart,feedback:{enough:feedbackEnough,count:feedbackEnough?feedback.length:null,minimum:5,reasons:feedbackEnough?reasons.map(reason=>({reason,count:feedback.filter(e=>e.reason===reason).length})):[]},photos,videos,
  removedPhotoViews:photoEvents.filter(e=>!photoKeys.includes(e.media)).length,removedVideoPlays:videoEvents.filter(e=>e.kind==='video_play'&&!listing.property.videos?.includes(e.media)).length,completeness:listingCompleteness(listing)};
}
export type ListingAnalytics=ReturnType<typeof summarizeListing>;
