import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {properties} from '../lib/properties';
import {MAX_LISTING_REQUEST_BYTES} from '../lib/listing-limits';
test('API saves 25 full-size photos in order and rejects a 26th photo and oversized requests',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'listed-photo-limit-'));process.env.LISTED_DATABASE_PATH=join(dir,'market.sqlite');
 const realFetch=globalThis.fetch;globalThis.fetch=(async()=>Response.json({users:[{localId:'photo-limit-test',displayName:'Photo limit test'}]})) as typeof fetch;
 const token=`test.${Buffer.from(JSON.stringify({aud:'dwell-d6c55',iss:'https://securetoken.google.com/dwell-d6c55',sub:'photo-limit-test'})).toString('base64url')}.signature`;
 const headers={Authorization:`Bearer ${token}`,'Content-Type':'application/json'};
 const {POST}=await import('../app/api/marketplace/route');const {marketStore}=await import('../lib/server/market-store');
 const photos=Array.from({length:25},(_,i)=>{const bytes=Buffer.alloc(500000,i);bytes[0]=255;bytes[1]=216;return `data:image/jpeg;base64,${bytes.toString('base64')}`;});
 const property={...properties[0],photos};
 const submit=(command:unknown)=>POST(new Request('http://localhost/api/marketplace',{method:'POST',headers,body:JSON.stringify(command)}));
 try{
  const body={action:'saveListing',status:'draft',property};assert.ok(JSON.stringify(body).length>3600000);
  const response=await submit(body);assert.equal(response.status,200);const result=await response.json();assert.deepEqual(result.listings[0].property.photos,photos);
  const published=await submit({...body,id:result.id,version:1,status:'published',authorized:true});assert.equal(published.status,200);assert.deepEqual(marketStore().get().listings[0].property.photos,photos);
  const rejected=await submit({...body,property:{...property,photos:[...photos,'https://example.com/extra.jpg']}});assert.equal(rejected.status,400);assert.match((await rejected.json()).error,/25 photos/);
  const oversized=await POST(new Request('http://localhost/api/marketplace',{method:'POST',headers,body:' '.repeat(MAX_LISTING_REQUEST_BYTES+1)}));assert.equal(oversized.status,413);
 }finally{globalThis.fetch=realFetch;marketStore().close();await rm(dir,{recursive:true,force:true});delete process.env.LISTED_DATABASE_PATH;}
});
