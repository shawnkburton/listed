import type {DatabaseSync} from 'node:sqlite';
import {createHash,createHmac,randomBytes,timingSafeEqual} from 'node:crypto';
import {MarketError,type Actor,type MarketData} from '../marketplace-domain';
import {analyticsKinds,summarizeListing,type AnalyticsRange,type ListingEvent} from '../listing-analytics';
export const photoKey=(url:string)=>createHash('sha256').update(url).digest('hex');
export function createListingAnalyticsStore(db:DatabaseSync,read:()=>MarketData){
 db.exec(`CREATE TABLE IF NOT EXISTS analytics_meta (key TEXT PRIMARY KEY,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS listing_events (seq INTEGER PRIMARY KEY AUTOINCREMENT,event_id TEXT NOT NULL,listing_id TEXT NOT NULL,visitor TEXT NOT NULL,known INTEGER NOT NULL,session TEXT NOT NULL,kind TEXT NOT NULL,at INTEGER NOT NULL,media TEXT NOT NULL DEFAULT '',reason TEXT NOT NULL DEFAULT '',UNIQUE(visitor,event_id));
 CREATE INDEX IF NOT EXISTS listing_events_listing ON listing_events(listing_id,at);
 CREATE INDEX IF NOT EXISTS listing_events_visitor ON listing_events(visitor,at);
 CREATE TABLE IF NOT EXISTS listing_share_links (token TEXT PRIMARY KEY,listing_id TEXT NOT NULL,creator TEXT NOT NULL,browser TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS listing_share_creator ON listing_share_links(listing_id,creator,created_at);`);
 db.prepare('INSERT OR IGNORE INTO analytics_meta VALUES (?,?)').run('secret',randomBytes(32).toString('hex'));
 db.prepare('INSERT OR IGNORE INTO analytics_meta VALUES (?,?)').run('started',String(Date.now()));
 const meta=(key:string)=>(db.prepare('SELECT value FROM analytics_meta WHERE key=?').get(key) as {value:string}).value;
 const secret=meta('secret'),started=Number(meta('started'));
 const hash=(value:string)=>createHmac('sha256',secret).update(value).digest('hex');
 const userKey=(uid:string)=>hash(`user:${uid}`),cookieName=`listed_analytics_${hash('cookie').slice(0,10)}`;
 function guest(cookie?:string){
  const [id='',sig='']=(cookie||'').split('.');
  if(/^[a-f0-9]{32}$/.test(id)&&/^[a-f0-9]{64}$/.test(sig)&&timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(hash(`cookie:${id}`),'hex')))return {key:hash(`guest:${id}`),cookie:undefined};
  const fresh=randomBytes(16).toString('hex');return {key:hash(`guest:${fresh}`),cookie:`${fresh}.${hash(`cookie:${fresh}`)}`};
 }
 function listing(id:unknown){const l=read().listings.find(l=>l.id===id&&l.status==='published');if(!l)throw new MarketError('Listing unavailable.',404);return l;}
 function limit(visitor:string,now:number){const count=(db.prepare('SELECT COUNT(*) AS n FROM listing_events WHERE visitor=? AND at>?').get(visitor,now-60000) as {n:number}).n;if(count>=180)throw new MarketError('Please wait before recording more activity.',429);}
 function ingest(input:unknown,actor:Actor|undefined,browser:string,now=Date.now()){
  if(!input||typeof input!=='object')throw new MarketError('Invalid event.');const c=input as Record<string,unknown>;
  const l=listing(c.listingId);if(actor?.uid===l.sellerId)return {recorded:false};
  if(typeof c.eventId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(c.eventId)||typeof c.session!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(c.session)||!analyticsKinds.includes(c.kind as never))throw new MarketError('Invalid event.');
  const kind=c.kind as ListingEvent['kind'],visitor=actor?userKey(actor.uid):browser;
  if(db.prepare('SELECT 1 FROM listing_events WHERE visitor=? AND event_id=?').get(visitor,c.eventId))return {recorded:false};
  limit(visitor,now);let media='',reason='';
  if(kind==='photo'){
   if(c.version!==l.version||!Number.isInteger(c.photoIndex)||Number(c.photoIndex)<0||Number(c.photoIndex)>=l.property.photos.length)throw new MarketError('Photo changed. Refresh the listing.',409);
   media=photoKey(l.property.photos[Number(c.photoIndex)]);
  }
  if(kind==='video_play'||kind==='video_complete'){
   if(typeof c.videoId!=='string'||!l.property.videos?.includes(c.videoId))throw new MarketError('Video unavailable.');media=c.videoId;
   if(kind==='video_complete'&&!db.prepare("SELECT 1 FROM listing_events WHERE listing_id=? AND visitor=? AND session=? AND kind='video_play' AND media=?").get(l.id,visitor,c.session,media))return {recorded:false};
  }
  if(kind==='hide'){if(!['price','location','style','size','other'].includes(String(c.reason)))throw new MarketError('Invalid feedback reason.');reason=String(c.reason);}
  if(kind==='share'||kind==='share_open'){
   const link=typeof c.shareToken==='string'?db.prepare('SELECT * FROM listing_share_links WHERE token=? AND listing_id=?').get(c.shareToken,l.id) as {creator:string;browser:string}|undefined:undefined;
   if(!link)throw new MarketError('Invalid share link.');
   if(kind==='share'&&link.creator!==visitor)throw new MarketError('Invalid share link.');
   if(kind==='share_open'&&(link.creator===visitor||link.browser===browser))return {recorded:false};
  }
  if(['like','unlike','save','unsave','hide','unhide'].includes(kind)){
   const pair=kind==='like'||kind==='unlike'?['like','unlike']:kind==='save'||kind==='unsave'?['save','unsave']:['hide','unhide'];
   const previous=db.prepare('SELECT kind FROM listing_events WHERE listing_id=? AND visitor=? AND kind IN (?,?) ORDER BY seq DESC LIMIT 1').get(l.id,visitor,...pair) as {kind:string}|undefined;
   if(previous?.kind===kind||(!previous&&kind===pair[1]))return {recorded:false};
  }else{
   const since=kind==='open'?now-30000:0;
   if(db.prepare('SELECT 1 FROM listing_events WHERE listing_id=? AND visitor=? AND session=? AND kind=? AND media=? AND at>=?').get(l.id,visitor,c.session,kind,media,since))return {recorded:false};
  }
  db.prepare('INSERT INTO listing_events(event_id,listing_id,visitor,known,session,kind,at,media,reason) VALUES (?,?,?,?,?,?,?,?,?)').run(c.eventId,l.id,visitor,actor?1:0,c.session,kind,now,media,reason);
  return {recorded:true};
 }
 function share(id:unknown,actor:Actor|undefined,browser:string,now=Date.now()){
  const l=listing(id),visitor=actor?userKey(actor.uid):browser;limit(visitor,now);
  const existing=db.prepare('SELECT token FROM listing_share_links WHERE listing_id=? AND creator=? AND browser=? AND created_at>? ORDER BY created_at DESC LIMIT 1').get(l.id,visitor,browser,now-86400000) as {token:string}|undefined;
  if(existing)return existing;
  const recent=(db.prepare('SELECT COUNT(*) AS n FROM listing_share_links WHERE creator=? AND created_at>?').get(visitor,now-60000) as {n:number}).n;if(recent>=30)throw new MarketError('Please wait before creating another link.',429);
  const token=randomBytes(16).toString('hex');db.prepare('INSERT INTO listing_share_links VALUES (?,?,?,?,?)').run(token,l.id,visitor,browser,now);return {token};
 }
 function dashboard(id:string,actor:Actor,range:AnalyticsRange,now=Date.now()){
  const data=read(),l=data.listings.find(l=>l.id===id&&l.sellerId===actor.uid);if(!l)throw new MarketError('Listing not found.',404);
  if(!['today','7','30','all'].includes(range))throw new MarketError('Choose a reporting period.');
  const events=db.prepare('SELECT visitor,known,session,kind,at,media,reason FROM listing_events WHERE listing_id=? ORDER BY seq').all(id) as unknown as ListingEvent[];
  return summarizeListing(l,data.threads,events,range,started,userKey,l.property.photos.map(photoKey),now);
 }
 return {cookieName,guest,ingest,share,dashboard};
}
