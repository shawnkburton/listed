import {test} from 'node:test';
import assert from 'node:assert/strict';
import {validatePhotoFile,preparePhotoBatch,MAX_PHOTO_INPUT_BYTES} from '../lib/listing-photos';
const file=(name:string,size=1000000,type='')=>new File([new Uint8Array(size)],name,{type});
test('Mac photos can exceed old limit and use filename when MIME is absent',()=>{
 for(const name of ['photo.JPG','photo.jpeg','photo.PNG','photo.webp','IMG_0123.HEIC','IMG_0123.heif'])assert.doesNotThrow(()=>validatePhotoFile({name,size:4*1024*1024,type:''}));
 assert.throws(()=>validatePhotoFile({name:'large.jpg',size:MAX_PHOTO_INPUT_BYTES+1,type:'image/jpeg'}),/20 MB/);
 assert.throws(()=>validatePhotoFile({name:'cloud.heic',size:0,type:''}),/iCloud/);
 assert.throws(()=>validatePhotoFile({name:'notes.pdf',size:1000,type:'application/pdf'}),/Choose a JPG/);
});
test('one failed photo does not discard successful attachments',async()=>{
 const progress:number[]=[];
 const result=await preparePhotoBatch([file('a.jpg'),file('bad.heic'),file('b.png')],5,i=>progress.push(i),async f=>{if(f.name==='bad.heic')throw Error('Unreadable image');return 'prepared:'+f.name;});
 assert.deepEqual(result.photos,['prepared:a.jpg','prepared:b.png']);assert.deepEqual(result.errors,['bad.heic: Unreadable image']);assert.deepEqual(progress,[1,2,3]);
});
test('attachment slots count successes and never exceed available capacity',async()=>{
 const processed:string[]=[];
 const result=await preparePhotoBatch([file('bad.jpg'),file('a.jpg'),file('b.jpg')],1,()=>{},async f=>{processed.push(f.name);if(f.name==='bad.jpg')throw Error('broken');return f.name;});
 assert.deepEqual(result.photos,['a.jpg']);assert.deepEqual(processed,['bad.jpg','a.jpg']);assert.match(result.errors[1],/25-photo limit/);
 const full=await preparePhotoBatch([file('a.jpg')],0,()=>{},async()=>{throw Error('Must not decode');});assert.equal(full.photos.length,0);assert.match(full.errors[0],/25-photo limit/);
});

test('a prepared photo survives the server save and reload path',async()=>{
 const {createMarketStore}=await import('../lib/server/market-store');
 const {readFileSync,mkdtempSync,rmSync}=await import('node:fs');
 const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const source=readFileSync(new URL('../public/photos/modern.jpg',import.meta.url));
 assert.ok(source.length<=500000);const photo=`data:image/jpeg;base64,${source.toString('base64')}`;
 const directory=mkdtempSync(join(tmpdir(),'listed-photo-'));const path=join(directory,'test.sqlite');let store=createMarketStore(path);
 try{store.command({uid:'photo-test',name:'Test seller'},{action:'saveListing',status:'draft',property:{address:'Photo upload test',area:'Oak Bay',style:'Modern',type:'House',price:5000000,beds:3,baths:2,sqft:1800,year:2000,lot:4000,description:'Test draft',photos:[photo]}});store.close();store=createMarketStore(path);assert.equal(store.get('photo-test').listings[0].property.photos[0],photo);assert.equal(store.get().listings.length,0);}finally{store.close();rmSync(directory,{recursive:true,force:true});}
});

test('photo preparation fills all 25 slots and leaves the 26th unattached',async()=>{
 const files=Array.from({length:26},(_,i)=>file(`${i+1}.jpg`,1));
 const result=await preparePhotoBatch(files,25,()=>{},async f=>f.name);
 assert.equal(result.photos.length,25);assert.equal(result.photos.at(-1),'25.jpg');assert.equal(result.errors.length,1);assert.match(result.errors[0],/26.jpg.*25-photo limit/);
});
