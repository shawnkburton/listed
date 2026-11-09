import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {uploadVideo,videoMeta,verifyVideoOwnership,previewToken,validPreview,videoResponse,videoRange} from '../lib/server/video-store';
import {MAX_VIDEO_BYTES,videoFileError} from '../lib/listing-videos';
import {applyCommand,emptyMarket} from '../lib/marketplace-domain';
import {properties} from '../lib/properties';
import {createMarketStore} from '../lib/server/market-store';
const bytes=Buffer.concat([Buffer.from([0,0,0,24]),Buffer.from('ftypisom'),Buffer.alloc(128)]);
const request=(body=bytes,name='tour.mp4')=>new Request('http://localhost/api/videos',{method:'POST',headers:{'x-video-name':encodeURIComponent(name)},body});
test('video uploads persist, enforce ownership, stream byte ranges and keep references through save/reopen',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'listed-videos-'));const dbPath=join(dir,'market.sqlite');let store=createMarketStore(dbPath);
 try{
  const {id}=await uploadVideo(request(),'seller',dir);const meta=(await videoMeta(id,dir))!;assert.equal(meta.bytes,bytes.length);assert.equal(meta.mime,'video/mp4');
  await verifyVideoOwnership([id],'seller',dir);await assert.rejects(verifyVideoOwnership([id],'other',dir),/another seller/);
  assert.equal(await videoMeta('../bad',dir),undefined);
  const token=previewToken(meta);assert.equal(validPreview(meta,token),true);assert.equal(validPreview(meta,token+'0'),false);assert.equal(validPreview(meta,token,Date.now()+3600001),false);
  const response=await videoResponse(meta,new Request('http://localhost',{headers:{range:'bytes=4-11'}}),dir);
  assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes 4-11/${bytes.length}`);assert.equal(await response.text(),'ftypisom');
  const invalid=await videoResponse(meta,new Request('http://localhost',{headers:{range:'bytes=999-'}}),dir);assert.equal(invalid.status,416);
  const actor={uid:'seller',name:'QA'},home={...properties[0],videos:[id]};
  const saved=store.command(actor,{action:'saveListing',status:'draft',property:home});assert.equal(store.get().listings.length,0);store.close();store=createMarketStore(dbPath);assert.deepEqual(store.get('seller').listings[0].property.videos,[id]);
  store.command(actor,{action:'saveListing',id:saved.id,version:1,status:'published',authorized:true,property:home});assert.deepEqual(store.get().listings[0].property.videos,[id]);
  store.command(actor,{action:'saveListing',id:saved.id,version:2,status:'archived',property:home});assert.equal(store.get().listings.length,0);
 }finally{store.close();await rm(dir,{recursive:true,force:true});}
});
test('rejects oversized, disguised and malformed videos and cleans partial files',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'listed-videos-'));
 try{
  assert.match(videoFileError({name:'tour.mov',size:MAX_VIDEO_BYTES+1})!,/100 MB/);
  assert.match(videoFileError({name:'tour.mov',size:0})!,/iCloud/);
  assert.equal(videoFileError({name:'TOUR.MOV',size:100}),undefined);
  await assert.rejects(uploadVideo(request(Buffer.from('<html>not video</html>')),'seller',dir),/not a supported/);
  await assert.rejects(uploadVideo(request(bytes,'tour.html'),'seller',dir),/Choose an MP4/);
  await assert.rejects(uploadVideo(new Request('http://localhost',{method:'POST',headers:{'x-video-name':'tour.mp4','content-length':String(MAX_VIDEO_BYTES+1)},body:bytes}),'seller',dir),/100 MB/);
  assert.deepEqual(await readdir(dir),[]);
  for(const videos of [['../path'],Array(4).fill('a'.repeat(32)),['a'.repeat(32),'a'.repeat(32)]])assert.throws(()=>applyCommand(emptyMarket(),{uid:'a',name:'A'},{action:'saveListing',status:'draft',property:{...properties[0],videos}}),/three uploaded/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
test('video seek ranges support suffixes and reject invalid/multiple ranges',()=>{
 assert.deepEqual(videoRange('bytes=-10',100),{start:90,end:99});assert.deepEqual(videoRange('bytes=20-',100),{start:20,end:99});assert.equal(videoRange(null,100),undefined);
 for(const range of ['bytes=3-2','bytes=0-1,4-5','bytes=-0','bytes=100-','bytes=-'])assert.throws(()=>videoRange(range,100));
});
