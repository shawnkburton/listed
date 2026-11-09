import {sanitizeSellerPlan,type SavedSellerPlan} from './seller-agent';
import {sanitizeNeighbourhood} from './neighbourhood';
import {knownLocation,pinLocation,withKnownLocation} from './listing-location';
import {MAX_LISTING_PHOTOS} from './listing-limits';
import {validYearBuilt,yearBuiltMessage} from './listing-year';
import {validVideoId,MAX_LISTING_VIDEOS} from './listing-videos';
import {sanitizeAssessmentImport} from './assessment-prefill';
import {areas,styles,type Property} from './domain';
export type ListingStatus='draft'|'published'|'archived';
export interface SellerListing {id:string;sellerId:string;sellerName:string;status:ListingStatus;property:Property;version:number;createdAt:number;updatedAt:number;firstPublishedAt?:number;sellerPlan?:SavedSellerPlan}
export interface Message {id:string;senderId:string;text:string;at:number}
export interface Visit {id:string;startsAt:string;status:'requested'|'confirmed'|'declined'|'cancelled';updatedAt:number;createdAt?:number;updatedBy?:string}
export interface Thread {id:string;listingId:string;address:string;buyerId:string;sellerId:string;buyerName:string;sellerName:string;messages:Message[];showings:Visit[];readAt:Record<string,number>;updatedAt:number}
export interface MarketData {version:1;listings:SellerListing[];threads:Thread[]}
export interface MarketSnapshot {listings:SellerListing[];threads:Thread[]}
export interface Actor {uid:string;name:string}
export class MarketError extends Error {constructor(message:string,public status=400){super(message)}}
export const emptyMarket=():MarketData=>({version:1,listings:[],threads:[]});
export function snapshot(data:MarketData,uid?:string):MarketSnapshot {return {listings:data.listings.filter(l=>l.status==='published'||l.sellerId===uid).map(l=>{const {sellerPlan,...publicListing}=l;return {...publicListing,property:withKnownLocation(l.property),...(uid===l.sellerId&&sellerPlan?{sellerPlan}:{})};}),threads:uid?data.threads.filter(t=>t.buyerId===uid||t.sellerId===uid):[]};}
function need(ok:unknown,message:string,status=400):asserts ok {if(!ok)throw new MarketError(message,status)}
function text(value:unknown,max:number,label:string,min=1){need(typeof value==='string'&&value.trim().length>=min&&value.trim().length<=max,`${label} must be ${min}–${max} characters.`);return value.trim();}
function num(value:unknown,max:number,label:string,min=0,step=1){need(typeof value==='number'&&Number.isFinite(value)&&value>=min&&value<=max&&Number.isInteger(value/step),`Enter a valid ${label}.`);return value;}
function photo(value:unknown){const url=text(value,700000,'Photo');if(/^data:image\/(jpeg|png|webp);base64,/.test(url)){const [head,body]=url.split(',');need(body&&/^[A-Za-z0-9+/]+={0,2}$/.test(body),'Invalid photo.');const b=Buffer.from(body,'base64');need(b.length<=500000,'Photos must be under 500 KB.');need(head.includes('jpeg')?b[0]===255&&b[1]===216:head.includes('png')?b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):b.toString('ascii',0,4)==='RIFF'&&b.toString('ascii',8,12)==='WEBP','Invalid photo format.');return url;}let parsed:URL;try{parsed=new URL(url);}catch{throw new MarketError('Use a valid HTTPS photo link.');}need(parsed.protocol==='https:'&&!parsed.username&&!parsed.password,'Use an HTTPS photo link.');return parsed.href;}
function property(input:unknown,id:string,publish:boolean):Property {need(input&&typeof input==='object','Listing details are required.');const p=input as Record<string,unknown>;need(areas.includes(p.area as never)&&styles.includes(p.style as never),'Choose a neighbourhood and style.');need(p.type==='House'||p.type==='Townhome','Choose a property type.');need(Array.isArray(p.photos)&&p.photos.length<=MAX_LISTING_PHOTOS,`Add up to ${MAX_LISTING_PHOTOS} photos.`);const photos=p.photos.map(photo);const videos=p.videos??[];need(Array.isArray(videos)&&videos.length<=MAX_LISTING_VIDEOS&&videos.every(validVideoId)&&new Set(videos).size===videos.length,'Add up to three uploaded videos.');need(!publish||photos.length>0,'Add at least one photo before publishing.');need(validYearBuilt(p.year),yearBuiltMessage());const address=text(p.address,160,'Address');const reference=sanitizeAssessmentImport(p.assessmentImport,address);let neighbourhood:Property['neighbourhood'];try{neighbourhood=sanitizeNeighbourhood(p.neighbourhood,address,p.area as Property['area']);}catch(e){throw new MarketError(e instanceof Error?e.message:'Review the neighbourhood description.');}const location=p.location==null?knownLocation(address,String(p.area)):pinLocation(p.location);need(p.location==null||location,'Choose a valid map location.');return {id,address,...(neighbourhood?{neighbourhood}:{}),...(location?{location}:{}),...(reference?{assessmentImport:reference}:{}),area:p.area as Property['area'],style:p.style as Property['style'],type:p.type,price:num(p.price,100000000,'asking price',publish?1:0),beds:num(p.beds,50,'bedrooms'),baths:num(p.baths,50,'bathrooms',0,.5),sqft:num(p.sqft,100000,'floor area',publish?1:0),year:p.year,lot:num(p.lot,10000000,'lot size'),description:text(p.description,6000,'Description',publish?30:0),photos,videos,tags:['Seller listed'],source:'seller',daysListed:0};}
// All actor IDs, ownership, timestamps and state transitions are assigned on the server.
export function applyCommand(data:MarketData,actor:Actor,input:unknown,now=Date.now()):string|undefined {
 need(input&&typeof input==='object','Invalid request.');const c=input as Record<string,unknown>;
 if(c.action==='saveListing'){
  const old=c.id?data.listings.find(l=>l.id===c.id):undefined;
  need(!c.id||old,'Listing not found.',404);need(!old||old.sellerId===actor.uid,'Only the seller can edit this listing.',403);
  need(!old||c.version===old.version,'This listing changed in another window. Refresh before saving.',409);
  need(['draft','published','archived'].includes(String(c.status)),'Invalid listing status.');
  need(c.status!=='published'||c.authorized===true,'Confirm you are authorized to list this home and use its photos.');
  need(old||data.listings.filter(l=>l.sellerId===actor.uid).length<20,'You can create up to 20 listings in this preview.');
  const id=old?.id||`seller-${crypto.randomUUID()}`;const p=property(c.property,id,c.status==='published');
  const listing:SellerListing={id,sellerId:actor.uid,sellerName:actor.name,status:c.status as ListingStatus,property:p,...(old?.sellerPlan&&old.property.address===p.address&&old.property.area===p.area?{sellerPlan:old.sellerPlan}:{}),version:(old?.version||0)+1,createdAt:old?.createdAt||now,updatedAt:now,...(old?.firstPublishedAt?{firstPublishedAt:old.firstPublishedAt}:c.status==='published'&&old?.status!=='published'?{firstPublishedAt:now}:{})};
  if(old)data.listings[data.listings.indexOf(old)]=listing;else data.listings.push(listing);return id;
 }
 if(c.action==='saveSellerPlan'){
  const listing=data.listings.find(l=>l.id===c.id);need(listing,'Listing not found.',404);
  need(listing.sellerId===actor.uid,'Only the seller can edit this plan.',403);
  need(c.version===listing.version,'This listing changed in another window. Reload the saved plan before saving.',409);
  let answers;try{answers=sanitizeSellerPlan(c.answers);}catch(e){throw new MarketError(e instanceof Error?e.message:'Invalid seller plan.');}
  listing.sellerPlan={answers,updatedAt:now};listing.version++;listing.updatedAt=now;return listing.id;
 }
 if(c.action==='startConversation'){
  const l=data.listings.find(l=>l.id===c.listingId&&l.status==='published');need(l,'This listing is no longer available.',404);need(l.sellerId!==actor.uid,'You cannot contact yourself.');
  const existing=data.threads.find(t=>t.listingId===l.id&&t.buyerId===actor.uid);if(existing)return existing.id;
  need(data.threads.filter(t=>t.buyerId===actor.uid).length<100,'Conversation limit reached.');
  const id=crypto.randomUUID();data.threads.push({id,listingId:l.id,address:l.property.address,buyerId:actor.uid,buyerName:actor.name,sellerId:l.sellerId,sellerName:l.sellerName,messages:[],showings:[],readAt:{},updatedAt:now});return id;
 }
 const t=data.threads.find(t=>t.id===c.threadId);need(t,'Conversation not found.',404);need(t.buyerId===actor.uid||t.sellerId===actor.uid,'This conversation is private.',403);
 if(c.action==='markRead'){const through=c.through??now;need(typeof through==='number'&&Number.isFinite(through)&&through>=0,'Invalid read time.');t.readAt[actor.uid]=Math.max(t.readAt[actor.uid]||0,Math.min(through,now));return t.id;}
 if(c.action==='sendMessage'){
  const id=text(c.operationId,80,'Message ID');const existing=t.messages.find(m=>m.id===id);if(existing){need(existing.senderId===actor.uid,'Message ID already used.',409);return t.id;}
  need(t.messages.length<500,'This conversation has reached the preview message limit.');
  need(!t.messages.some(m=>m.senderId===actor.uid&&now-m.at<1000),'Please wait a moment before sending another message.',429);
  t.messages.push({id,senderId:actor.uid,text:text(c.text,3000,'Message'),at:now});t.readAt[actor.uid]=now;t.updatedAt=now;return t.id;
 }
 if(c.action==='requestShowing'){
  need(actor.uid===t.buyerId,'Only the buyer can request a showing.',403);
  need(data.listings.some(l=>l.id===t.listingId&&l.status==='published'),'This home is no longer accepting showings.',409);
  const id=text(c.operationId,80,'Request ID');if(t.showings.some(s=>s.id===id))return t.id;
  const startsAt=text(c.startsAt,40,'Showing time');const time=Date.parse(startsAt);need(Number.isFinite(time)&&time>now+15*60000&&time<now+180*86400000,'Choose a time at least 15 minutes ahead and within 180 days.');
  need(!t.showings.some(s=>s.status==='requested'||s.status==='confirmed'),'Cancel or complete your existing request before requesting another.');
  need(t.showings.length<100,'Showing request limit reached.');
  t.showings.push({id,startsAt:new Date(time).toISOString(),status:'requested',updatedAt:now,createdAt:now,updatedBy:actor.uid});t.readAt[actor.uid]=now;t.updatedAt=now;return t.id;
 }
 if(c.action==='respondShowing'){
  const s=t.showings.find(s=>s.id===c.showingId);need(s,'Showing not found.',404);
  need(s.status==='requested'||s.status==='confirmed','This request has already been closed.',409);
  if(c.status==='cancelled')s.status='cancelled';
  else {need(actor.uid===t.sellerId,'Only the seller can confirm or decline.',403);need(s.status==='requested'&&(c.status==='confirmed'||c.status==='declined'),'This showing cannot be changed that way.',409);
   if(c.status==='confirmed'){need(Date.parse(s.startsAt)>now,'This time has passed. Ask the buyer for a new request.');need(data.listings.some(l=>l.id===t.listingId&&l.status==='published'),'Republish the listing before confirming.',409);need(!data.threads.some(thread=>thread.sellerId===actor.uid&&thread.showings.some(v=>v.status==='confirmed'&&Math.abs(Date.parse(v.startsAt)-Date.parse(s.startsAt))<30*60000)),'You already have a confirmed showing within 30 minutes.',409);}s.status=c.status;
  }s.updatedAt=now;s.updatedBy=actor.uid;t.readAt[actor.uid]=now;t.updatedAt=now;return t.id;
 }
 throw new MarketError('Unknown action.');
}

export function syncActorName(data:MarketData,actor:Actor){
 let changed=false;
 for(const listing of data.listings)if(listing.sellerId===actor.uid&&listing.sellerName!==actor.name){listing.sellerName=actor.name;changed=true;}
 for(const thread of data.threads){if(thread.sellerId===actor.uid&&thread.sellerName!==actor.name){thread.sellerName=actor.name;changed=true;}if(thread.buyerId===actor.uid&&thread.buyerName!==actor.name){thread.buyerName=actor.name;changed=true;}}
 return changed;
}
