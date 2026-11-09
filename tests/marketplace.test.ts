import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {applyCommand,emptyMarket,snapshot,MarketError,type Actor} from '../lib/marketplace-domain';
import {createMarketStore} from '../lib/server/market-store';
import {identity} from '../lib/server/identity';
const seller:Actor={uid:'seller-one',name:'Test Seller'},buyer:Actor={uid:'buyer-one',name:'Test Buyer'},other:Actor={uid:'other',name:'Other'};
const home={address:'123 Test Road',area:'Oak Bay',style:'Character',type:'House',price:1200000,beds:3,baths:2,sqft:1800,year:1980,lot:5000,description:'A fictional home used only by the isolated automated tests.',photos:['https://example.com/test.jpg']};
const listing={action:'saveListing',status:'published',property:home,authorized:true};
const setup=()=>{const d=emptyMarket();const id=applyCommand(d,seller,listing)!;const thread=applyCommand(d,buyer,{action:'startConversation',listingId:id})!;return {d,id,thread};};
test('draft isolation, publish, edit conflict and withdrawal',()=>{
 const d=emptyMarket();const id=applyCommand(d,seller,{...listing,status:'draft'})!;
 assert.equal(snapshot(d).listings.length,0);assert.equal(snapshot(d,buyer.uid).listings.length,0);assert.equal(snapshot(d,seller.uid).listings.length,1);
 assert.throws(()=>applyCommand(d,buyer,{...listing,id,version:1}),/Only the seller/);
 applyCommand(d,seller,{...listing,id,version:1});assert.equal(snapshot(d).listings.length,1);
 assert.throws(()=>applyCommand(d,seller,{...listing,id,version:1}),/another window/);
 applyCommand(d,seller,{...listing,id,version:2,status:'archived'});assert.equal(snapshot(d).listings.length,0);
});
test('publishing validates photos, dimensions, authorization and untrusted fields',()=>{
 for(const invalid of [{...listing,authorized:false},{...listing,property:{...home,photos:[]}},{...listing,property:{...home,photos:['javascript:alert(1)']}},{...listing,property:{...home,photos:['data:image/png;base64,YmFk']}},{...listing,property:{...home,price:-5}},{...listing,property:{...home,beds:2.5}},{...listing,property:{...home,description:'short'}}])assert.throws(()=>applyCommand(emptyMarket(),seller,invalid),MarketError);
 const d=emptyMarket();applyCommand(d,seller,{...listing,sellerId:buyer.uid,property:{...home,source:'realtor',assessment:{total:999}}});assert.equal(d.listings[0].sellerId,seller.uid);assert.equal(d.listings[0].property.source,'seller');assert.equal(d.listings[0].property.assessment,undefined);
});
test('no self-contact, research contact or duplicate conversations',()=>{const {d,id,thread}=setup();assert.equal(applyCommand(d,buyer,{action:'startConversation',listingId:id}),thread);assert.equal(d.threads.length,1);assert.throws(()=>applyCommand(d,seller,{action:'startConversation',listingId:id}),/yourself/);assert.throws(()=>applyCommand(d,buyer,{action:'startConversation',listingId:'realtor-id'}),/no longer/);});
test('participant-only messages, ownership derived server-side, retries do not duplicate',()=>{
 const {d,thread}=setup();const cmd={action:'sendMessage',threadId:thread,text:'Is a showing possible?',operationId:'message-one',senderId:seller.uid};
 assert.throws(()=>applyCommand(d,other,cmd),/private/);applyCommand(d,buyer,cmd);applyCommand(d,buyer,cmd);assert.equal(d.threads[0].messages.length,1);assert.equal(d.threads[0].messages[0].senderId,buyer.uid);
 applyCommand(d,seller,{...cmd,operationId:'reply-one',text:'Yes, please suggest a time.'});assert.equal(snapshot(d,other.uid).threads.length,0);assert.equal(snapshot(d).threads.length,0);assert.equal(snapshot(d,seller.uid).threads[0].messages.length,2);
 assert.throws(()=>applyCommand(d,seller,{...cmd,operationId:'reply-two'}),/wait a moment/);
});
test('buyer requests, seller confirms, cancellation and private request restrictions',()=>{
 const {d,thread}=setup();const now=Date.now();const cmd={action:'requestShowing',threadId:thread,startsAt:new Date(now+86400000).toISOString(),operationId:'visit-one'};
 assert.throws(()=>applyCommand(d,seller,cmd,now),/Only the buyer/);assert.throws(()=>applyCommand(d,buyer,{...cmd,startsAt:new Date(now-1).toISOString()},now),/Choose a time/);
 applyCommand(d,buyer,cmd,now);applyCommand(d,buyer,cmd,now);assert.equal(d.threads[0].showings.length,1);
 assert.throws(()=>applyCommand(d,buyer,{...cmd,operationId:'visit-two'},now),/existing request/);
 const response={action:'respondShowing',threadId:thread,showingId:'visit-one',status:'confirmed'};
 assert.throws(()=>applyCommand(d,buyer,response,now),/Only the seller/);assert.throws(()=>applyCommand(d,other,response,now),/private/);applyCommand(d,seller,response,now);assert.equal(d.threads[0].showings[0].status,'confirmed');
 applyCommand(d,buyer,{...response,status:'cancelled'},now);assert.equal(d.threads[0].showings[0].status,'cancelled');assert.throws(()=>applyCommand(d,seller,response,now),/closed/);
});
test('seller cannot double-book; withdrawal prevents new showings but preserves messages',()=>{
 const {d,id,thread}=setup();const now=Date.now();const time=new Date(now+86400000).toISOString();const second=applyCommand(d,other,{action:'startConversation',listingId:id})!;
 for(const [actor,threadId,operationId] of [[buyer,thread,'v1'],[other,second,'v2']] as const)applyCommand(d,actor,{action:'requestShowing',threadId,operationId,startsAt:time},now);
 applyCommand(d,seller,{action:'respondShowing',threadId:thread,showingId:'v1',status:'confirmed'},now);
 assert.throws(()=>applyCommand(d,seller,{action:'respondShowing',threadId:second,showingId:'v2',status:'confirmed'},now),/30 minutes/);
 applyCommand(d,seller,{...listing,id,version:1,status:'archived'});applyCommand(d,seller,{action:'respondShowing',threadId:second,showingId:'v2',status:'declined'},now);
 assert.throws(()=>applyCommand(d,other,{action:'requestShowing',threadId:second,operationId:'v3',startsAt:time},now),/no longer/);
 applyCommand(d,buyer,{action:'sendMessage',threadId:thread,operationId:'m1',text:'Has this home been withdrawn?'},now);assert.equal(d.threads[0].messages.length,1);
});
test('SQLite persists across restarts and rolls back unauthorized changes',()=>{
 const folder=mkdtempSync(join(tmpdir(),'listed-test-'));const path=join(folder,'test.sqlite');let store=createMarketStore(path);
 try{const {id}=store.command(seller,listing);assert.throws(()=>store.command(buyer,{...listing,id,version:1}),/Only the seller/);store.close();store=createMarketStore(path);assert.equal(store.get().listings.length,1);assert.equal(store.get().listings[0].sellerId,seller.uid);const {id:threadId}=store.command(buyer,{action:'startConversation',listingId:id});store.command(buyer,{action:'sendMessage',threadId,operationId:'durable',text:'Saved to the server.'});store.close();store=createMarketStore(path);assert.equal(store.get(seller.uid).threads[0].messages[0].text,'Saved to the server.');assert.equal(store.get(other.uid).threads.length,0);}finally{store.close();rmSync(folder,{recursive:true,force:true});}
});
test('API identity requires Firebase validation, never accepts supplied UID',async()=>{
 await assert.rejects(identity(new Request('http://localhost/api')),/sign in/);
 const token='test.'+Buffer.from(JSON.stringify({aud:'dwell-d6c55',iss:'https://securetoken.google.com/dwell-d6c55',sub:'verified-uid'})).toString('base64url')+'.signature';
 const request=new Request('http://localhost/api',{headers:{Authorization:`Bearer ${token}`,'x-user-id':'attacker'}});
 await assert.rejects(identity(request,(async()=>new Response('{}',{status:400})) as typeof fetch),/expired/);
 await assert.rejects(identity(request,(async()=>Response.json({users:[{localId:'x',disabled:true}]})) as typeof fetch),/sign in/);
 let sent='';const actor=await identity(request,(async(_url,options)=>{sent=String(options?.body);return Response.json({users:[{localId:'verified-uid',displayName:'Verified User'}]});}) as typeof fetch);
 assert.equal(actor.uid,'verified-uid');assert.equal(JSON.parse(sent).idToken,token);assert.equal(sent.includes('attacker'),false);
});

test('year built accepts the current year and 500-year boundary, rejecting years outside them for draft and publish',()=>{
 const current=new Date().getFullYear();
 for(const status of ['draft','published']){
  for(const year of [0,current-500,current]){
   const d=emptyMarket();applyCommand(d,seller,{...listing,status,property:{...home,year}});assert.equal(d.listings[0].property.year,year);
  }
  for(const year of [current+1,current-501,-1,current-.5,NaN,'2000'])assert.throws(()=>applyCommand(emptyMarket(),seller,{...listing,status,property:{...home,year}}),new RegExp(`between ${current-500} and ${current}`));
 }
});
