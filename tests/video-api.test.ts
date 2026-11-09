import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {properties} from '../lib/properties';
test('video endpoints require verified identity, isolate draft playback and support public playback only after publish',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'listed-video-api-'));process.env.LISTED_DATABASE_PATH=join(dir,'market.sqlite');process.env.LISTED_VIDEO_DIRECTORY=join(dir,'videos');
 const previousFetch=globalThis.fetch;
 globalThis.fetch=(async(_url,options)=>{const token=JSON.parse(String(options?.body)).idToken;const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());return Response.json({users:[{localId:claims.sub,displayName:'QA'}]});}) as typeof fetch;
 const headers=(uid:string)=>({Authorization:`Bearer test.${Buffer.from(JSON.stringify({aud:'dwell-d6c55',iss:'https://securetoken.google.com/dwell-d6c55',sub:uid})).toString('base64url')}.signature`});
 const {POST:upload}=await import('../app/api/videos/route');const {POST:preview,GET:play}=await import('../app/api/videos/[id]/route');const {POST:save}=await import('../app/api/marketplace/route');const {marketStore}=await import('../lib/server/market-store');
 const bytes=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(128)]);
 try{
  assert.equal((await upload(new Request('http://localhost/api/videos',{method:'POST',body:bytes}))).status,401);
  assert.equal((await upload(new Request('http://localhost/api/videos',{method:'POST',headers:{...headers('seller'),origin:'https://other.test'},body:bytes}))).status,403);
  const result=await upload(new Request('http://localhost/api/videos',{method:'POST',headers:{...headers('seller'),'x-video-name':'tour.mp4'},body:bytes}));assert.equal(result.status,200);
  const {id}=await result.json(),context={params:Promise.resolve({id})};const url=`http://localhost/api/videos/${id}`;
  assert.equal((await play(new Request(url),context)).status,404);
  assert.equal((await preview(new Request(url,{method:'POST',headers:headers('other')}),context)).status,404);
  const privateResult=await preview(new Request(url,{method:'POST',headers:headers('seller')}),context);assert.equal(privateResult.status,200);
  const {url:privateUrl}=await privateResult.json();const playback=await play(new Request(`http://localhost${privateUrl}`,{headers:{range:'bytes=4-11'}}),context);assert.equal(playback.status,206);assert.equal(await playback.text(),'ftypisom');
  const command={action:'saveListing',status:'published',authorized:true,property:{...properties[0],videos:[id]}};
  const submit=(uid:string,c:unknown)=>save(new Request('http://localhost/api/marketplace',{method:'POST',headers:{...headers(uid),'Content-Type':'application/json'},body:JSON.stringify(c)}));
  assert.equal((await submit('other',command)).status,403);
  const published=await submit('seller',command);assert.equal(published.status,200);const {id:listingId}=await published.json();
  const publicVideo=await play(new Request(url),context);assert.equal(publicVideo.status,200);await publicVideo.arrayBuffer();
  await submit('seller',{...command,id:listingId,version:1,status:'draft'});assert.equal((await play(new Request(url),context)).status,404);
 }finally{globalThis.fetch=previousFetch;marketStore().close();await rm(dir,{recursive:true,force:true});delete process.env.LISTED_DATABASE_PATH;delete process.env.LISTED_VIDEO_DIRECTORY;}
});
