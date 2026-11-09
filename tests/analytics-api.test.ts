import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {properties} from '../lib/properties';
test('analytics routes issue signed guest cookies, reject malformed requests and protect seller reports',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'listed-analytics-api-'));process.env.LISTED_DATABASE_PATH=join(dir,'market.sqlite');const originalFetch=globalThis.fetch;
 globalThis.fetch=(async(_url,options)=>{const token=JSON.parse(String(options?.body)).idToken;if(token==='invalid')return Response.json({}, {status:400});const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());return Response.json({users:[{localId:claims.sub,displayName:'QA'}]});}) as typeof fetch;
 const auth=(uid:string)=>({Authorization:`Bearer test.${Buffer.from(JSON.stringify({aud:'dwell-d6c55',iss:'https://securetoken.google.com/dwell-d6c55',sub:uid})).toString('base64url')}.signature`});
 const {POST}=await import('../app/api/analytics/route'),{GET}=await import('../app/api/analytics/[id]/route'),{marketStore}=await import('../lib/server/market-store');
 try{
 const store=marketStore(),{id}=store.command({uid:'seller',name:'Seller'},{action:'saveListing',status:'published',authorized:true,property:properties[0]});
 const base={listingId:id,eventId:randomUUID(),session:randomUUID(),kind:'open'};
 const post=(body:unknown,headers:Record<string,string>={})=>POST(new Request('http://localhost/api/analytics',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)}));
 assert.equal((await post(base,{Origin:'https://unrelated.test'})).status,403);assert.equal((await post(base,{'Content-Type':'text/plain'})).status,415);assert.equal((await post({pad:'x'.repeat(5000)})).status,413);
 assert.equal((await post(base,{Authorization:'Bearer invalid'})).status,401);assert.deepEqual(await(await post(base,{'User-Agent':'Googlebot'})).json(),{recorded:false});
 const result=await post(base);assert.equal(result.status,200);const cookie=result.headers.get('set-cookie')!;assert.match(cookie,/HttpOnly; SameSite=Lax/);assert.equal(result.headers.get('cache-control'),'private, no-store');
 assert.deepEqual(await(await post({...base,eventId:randomUUID()},{Cookie:cookie.split(';')[0]})).json(),{recorded:false});
 const context={params:Promise.resolve({id:id!})},url=`http://localhost/api/analytics/${id}?range=all`;
 assert.equal((await GET(new Request(url),context)).status,401);assert.equal((await GET(new Request(url,{headers:auth('buyer')}),context)).status,404);
 const report=await GET(new Request(url,{headers:auth('seller')}),context);assert.equal(report.status,200);const data=await report.json();assert.equal(data.views.total,1);assert.equal(data.views.guests,1);assert.equal('events' in data,false);assert.equal('visitor' in data,false);
 assert.equal((await GET(new Request(url.replace('all','bad'),{headers:auth('seller')}),context)).status,400);
 const link=await(await post({action:'shareLink',listingId:id},{Cookie:cookie.split(';')[0]})).json();assert.match(link.token,/^[a-f0-9]{32}$/);
 }finally{globalThis.fetch=originalFetch;marketStore().close();await rm(dir,{recursive:true,force:true});delete process.env.LISTED_DATABASE_PATH;}
});
