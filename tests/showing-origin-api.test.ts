import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

test('LAN-bound API accepts buyer showing requests with localhost Origin and rejects cross-site writes',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'listed-showing-origin-'));process.env.LISTED_DATABASE_PATH=join(dir,'market.sqlite');
 const realFetch=globalThis.fetch;
 globalThis.fetch=(async(_url,options)=>{const token=JSON.parse(String(options?.body)).idToken;const uid=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString()).sub;return Response.json({users:[{localId:uid,displayName:uid==='seller'?'Current Seller':'Current Buyer'}]});}) as typeof fetch;
 const {POST,GET}=await import('../app/api/marketplace/route');const {marketStore}=await import('../lib/server/market-store');
 const token=(uid:string)=>`test.${Buffer.from(JSON.stringify({aud:'dwell-d6c55',iss:'https://securetoken.google.com/dwell-d6c55',sub:uid})).toString('base64url')}.signature`;
 const submit=(uid:string,command:unknown,origin='http://localhost:3000')=>POST(new Request('http://0.0.0.0:3000/api/marketplace',{method:'POST',headers:{host:'localhost:3000',origin,Authorization:`Bearer ${token(uid)}`,'Content-Type':'application/json'},body:JSON.stringify(command)}));
 try{
  const listing=await submit('seller',{action:'saveListing',status:'published',authorized:true,property:{address:'1920 Crescent Rd',area:'Oak Bay',style:'Modern',type:'House',price:5000000,beds:4,baths:3.5,sqft:4800,year:1980,lot:10000,description:'A test listing stored only in a temporary database.',photos:['https://example.com/test.jpg']}});
  assert.equal(listing.status,200);const {id}=await listing.json();
  const conversation=await submit('buyer',{action:'startConversation',listingId:id});assert.equal(conversation.status,200);const {id:threadId}=await conversation.json();
  const command={action:'requestShowing',threadId,operationId:'test-showing',startsAt:new Date(Date.now()+86400000).toISOString()};
  assert.equal((await submit('buyer',command,'https://evil.example')).status,403);
  const response=await submit('buyer',command);assert.equal(response.status,200);assert.equal((await response.json()).threads[0].showings.length,1);
  const publicResponse=await GET(new Request('http://localhost:3000/api/marketplace'));const publicData=await publicResponse.json();assert.equal(publicData.listings[0].property.location.latitude,48.4118258);assert.equal(publicData.threads.length,0);
 }finally{globalThis.fetch=realFetch;marketStore().close();await rm(dir,{recursive:true,force:true});}
});
