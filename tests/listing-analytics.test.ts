import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {emptyMarket,applyCommand,type Actor} from '../lib/marketplace-domain';
import {createListingAnalyticsStore,photoKey} from '../lib/server/listing-analytics-store';
import {summarizeListing,dayKey,type ListingEvent} from '../lib/listing-analytics';
import {VideoCoverage} from '../lib/video-coverage';
const seller:Actor={uid:'seller',name:'Seller'},buyer:Actor={uid:'buyer',name:'Buyer'};
const now=Date.parse('2026-09-28T18:00:00Z'),home={address:'123 Fictional Road',area:'Oak Bay',style:'Character',type:'House',price:1200000,beds:3,baths:2,sqft:1800,year:1980,lot:5000,description:'Fictional test home with enough information for publication.',photos:['https://example.com/a.jpg','https://example.com/b.jpg'],videos:['a'.repeat(32)]};
function setup(){const data=emptyMarket(),id=applyCommand(data,seller,{action:'saveListing',status:'published',authorized:true,property:home},now-86400000)!;const db=new DatabaseSync(':memory:'),analytics=createListingAnalyticsStore(db,()=>data);return {data,id,db,analytics};}
test('server timestamps, identity, deduplication, owner exclusion, and owner-only dashboard',()=>{
 const {id,db,analytics:a}=setup();try{
 const g=a.guest();assert.equal(a.guest(g.cookie).key,g.key);assert.notEqual(a.guest(g.cookie+'bad').key,g.key);
 const event={listingId:id,eventId:randomUUID(),session:randomUUID(),kind:'open',visitor:'forged',at:0};
 assert.deepEqual(a.ingest(event,seller,g.key,now),{recorded:false});
 assert.deepEqual(a.ingest(event,buyer,g.key,now),{recorded:true});assert.deepEqual(a.ingest(event,buyer,g.key,now),{recorded:false});
 assert.equal(a.ingest({...event,eventId:randomUUID()},buyer,g.key,now+1).recorded,false);
 assert.equal(a.ingest({...event,eventId:randomUUID()},buyer,g.key,now+31000).recorded,true);
 assert.throws(()=>a.dashboard(id,buyer,'all',now+31000),/not found/);
 const d=a.dashboard(id,seller,'today',now+31000);assert.equal(d.views.total,2);assert.equal(d.views.unique,1);assert.equal(d.views.signedIn,1);
 assert.equal(JSON.stringify(d).includes('forged'),false);assert.equal(JSON.stringify(d).includes(g.key),false);assert.equal('events' in d,false);
 }finally{db.close();}
});
test('current toggles, photo identity across reordering, valid video completion and share attribution',()=>{
 const {id,db,analytics:a,data}=setup();try{
 const browser=a.guest().key,session=randomUUID();const send=(kind:string,extra={})=>a.ingest({listingId:id,eventId:randomUUID(),session,kind,...extra},buyer,browser,now);
 send('like');send('like');send('save');send('unsave');send('unlike');send('like');
 send('photo',{version:1,photoIndex:0});data.listings[0].property.photos.reverse();data.listings[0].version=2;
 assert.throws(()=>send('photo',{version:1,photoIndex:0}),/Photo changed/);assert.equal(send('photo',{version:2,photoIndex:1}).recorded,false);
 assert.equal(send('video_complete',{videoId:home.videos[0]}).recorded,false);send('video_play',{videoId:home.videos[0]});send('video_complete',{videoId:home.videos[0]});
 const {token}=a.share(id,buyer,browser,now);send('share',{shareToken:token});assert.equal(send('share_open',{shareToken:token}).recorded,false);
 assert.equal(a.ingest({listingId:id,eventId:randomUUID(),session,kind:'share_open',shareToken:token},undefined,browser,now).recorded,false);
 a.ingest({listingId:id,eventId:randomUUID(),session,kind:'share_open',shareToken:token},undefined,a.guest().key,now);
 assert.throws(()=>send('share',{shareToken:'bad'}),/Invalid share/);
 const d=a.dashboard(id,seller,'today',now);assert.equal(d.likes.current,1);assert.equal(d.saves.current,0);assert.equal(d.photos[0].views,0);assert.equal(d.photos[1].views,1);assert.equal(d.videos[0].completionRate,1);assert.equal(d.shares.copies,1);assert.equal(d.shares.opens,1);
 }finally{db.close();}
});
test('Pacific date boundaries, chronological funnel, response time, showing history and anonymous feedback threshold',()=>{
 const {data,id,db}=setup();try{
 assert.equal(dayKey(Date.parse('2026-09-28T06:59:59Z')),'2026-09-27');assert.equal(dayKey(Date.parse('2026-09-28T07:00:00Z')),'2026-09-28');
 const thread=applyCommand(data,buyer,{action:'startConversation',listingId:id},now-3000)!;
 applyCommand(data,buyer,{action:'sendMessage',threadId:thread,text:'Is it available?',operationId:'message1'},now-2000);
 applyCommand(data,seller,{action:'sendMessage',threadId:thread,text:'Yes!',operationId:'message2'},now-1000);
 applyCommand(data,buyer,{action:'requestShowing',threadId:thread,operationId:'visit1',startsAt:new Date(now+86400000).toISOString()},now);
 applyCommand(data,{uid:'empty',name:'No message'}, {action:'startConversation',listingId:id},now);
 const events:ListingEvent[]=[];const add=(kind:ListingEvent['kind'],visitor:string,at:number,extra={})=>events.push({visitor,known:1,session:'session',kind,at,media:'',reason:'',...extra});
 add('impression','buyer',now-6000);add('open','buyer',now-5000);add('save','buyer',now-4000);
 add('save','out-of-order',now-9000);add('impression','out-of-order',now-5000);add('open','out-of-order',now-4000);
 add('like','old',Date.parse('2026-09-28T06:59:00Z'));add('unlike','old',now);
 for(let i=0;i<4;i++)add('hide',`feedback${i}`,now,{reason:'price'});
 const run=()=>summarizeListing(data.listings[0],data.threads,events,'today',now-86400000,id=>id,home.photos.map(photoKey),now);
 let d=run();assert.deepEqual(d.funnel.map(s=>s.count),[2,2,1,1,1]);assert.equal(d.inquiries.buyers,1);assert.equal(d.response.medianMs,1000);assert.equal(d.showings.total,1);assert.equal(d.showings.legacyDates,false);assert.equal(d.likes.net,-1);assert.equal(d.likes.added,0);assert.equal(d.feedback.count,null);assert.deepEqual(d.feedback.reasons,[]);assert.equal(d.contacts.length,1);
 add('hide','feedback5',now,{reason:'location'});d=run();assert.equal(d.feedback.count,5);assert.equal(d.feedback.reasons[0].count,4);
 add('unhide','feedback5',now+0);assert.equal(run().feedback.enough,false);
 assert.equal(data.listings[0].firstPublishedAt,now-86400000);assert.equal(data.threads[0].showings[0].createdAt,now);
 }finally{db.close();}
});
test('video completion cannot inflate rate when playback began outside selected period',()=>{
 const {data,db}=setup();try{const e=(kind:ListingEvent['kind'],at:number):ListingEvent=>({kind,at,session:'x',visitor:'x',known:0,media:home.videos[0],reason:''});const d=summarizeListing(data.listings[0],[],[e('video_play',now-86400000),e('video_complete',now)],'today',now-86400000,x=>x,[],now);assert.equal(d.videos[0].completions,0);assert.equal(d.videos[0].completionRate,null);}finally{db.close();}
});
test('video coverage excludes seeking, repeats, long gaps and background playback',()=>{
 const c=new VideoCoverage();for(let i=0;i<=10;i++)c.sample(i,i*1000,true,true,1);assert.equal(c.fraction(100),.1);
 c.resetPosition();for(let i=0;i<=10;i++)c.sample(i,20000+i*1000,true,true,1);assert.equal(c.fraction(100),.1);
 c.sample(99,31000,true,true,1);assert.equal(c.fraction(100),.1);c.sample(100,32000,true,false,1);assert.equal(c.fraction(100),.1);
 c.sample(10,33000,true,true,1);c.sample(20,43000,true,true,1);assert.equal(c.fraction(100),.1);
 c.resetPosition();for(let i=10;i<=90;i++)c.sample(i,50000+i*1000,true,true,1);assert.equal(c.fraction(100),.9);
});
test('rate limits and unpublished listings reject further anonymous events',()=>{
 const {id,db,analytics:a,data}=setup();try{const browser=a.guest().key;
 for(let i=0;i<180;i++)a.ingest({listingId:id,eventId:randomUUID(),session:randomUUID(),kind:'open'},undefined,browser,now);
 assert.throws(()=>a.ingest({listingId:id,eventId:randomUUID(),session:randomUUID(),kind:'open'},undefined,browser,now),/Please wait/);
 assert.equal(a.ingest({listingId:id,eventId:randomUUID(),session:randomUUID(),kind:'open'},undefined,browser,now+60001).recorded,true);
 data.listings[0].status='draft';assert.throws(()=>a.share(id,undefined,browser,now+60001),/unavailable/);
 assert.throws(()=>a.ingest({listingId:id,eventId:randomUUID(),session:randomUUID(),kind:'like'},undefined,browser,now+60001),/unavailable/);
 }finally{db.close();}
});
test('tracking identity, current likes and share tokens persist across store restarts',async()=>{
 const {mkdtempSync,rmSync}=await import('node:fs'),{tmpdir}=await import('node:os'),{join}=await import('node:path'),{createMarketStore}=await import('../lib/server/market-store');
 const folder=mkdtempSync(join(tmpdir(),'listed-analytics-restart-')),path=join(folder,'market.sqlite');let store=createMarketStore(path);
 try{const {id}=store.command(seller,{action:'saveListing',status:'published',authorized:true,property:home});const guest=store.analytics.guest(),cookieName=store.analytics.cookieName;
 store.analytics.ingest({listingId:id,eventId:randomUUID(),session:randomUUID(),kind:'like'},undefined,guest.key);const {token}=store.analytics.share(id,undefined,guest.key);store.close();store=createMarketStore(path);
 assert.equal(store.analytics.cookieName,cookieName);assert.equal(store.analytics.guest(guest.cookie).key,guest.key);assert.equal(store.analytics.dashboard(id!,seller,'all').likes.current,1);
 assert.equal(store.analytics.ingest({listingId:id,eventId:randomUUID(),session:randomUUID(),kind:'share_open',shareToken:token},buyer,store.analytics.guest().key).recorded,true);
 }finally{store.close();rmSync(folder,{recursive:true,force:true});}
});
