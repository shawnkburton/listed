import {test} from 'node:test';
import assert from 'node:assert/strict';
import {requireSameOrigin} from '../lib/server/request-origin';
import {knownLocation,pinLocation} from '../lib/listing-location';
import {searchOrigin} from '../lib/geography';
import {applyCommand,emptyMarket,snapshot,syncActorName} from '../lib/marketplace-domain';
import {microsoftProfileName} from '../lib/profile-name';
import {radiusFeed,defaultSearchArea} from '../lib/radius-search';
import {defaults} from '../lib/domain';

test('origin check accepts browser Host on an all-interface server and rejects foreign origins',()=>{
 for(const host of ['localhost:3000','127.0.0.1:3000','192.168.1.105:3000','[::1]:3000'])assert.doesNotThrow(()=>requireSameOrigin(new Request('http://0.0.0.0:3000/api/marketplace',{headers:{host,origin:`http://${host}`}})));
 for(const origin of ['https://evil.example','null','http://localhost:3001','https://localhost:3000'])assert.throws(()=>requireSameOrigin(new Request('http://0.0.0.0:3000/api/marketplace',{headers:{host:'localhost:3000',origin,'x-forwarded-host':'evil.example'}})),/Listed/);
 assert.throws(()=>requireSameOrigin(new Request('http://localhost:3000/api',{headers:{origin:'http://localhost:3000','sec-fetch-site':'cross-site'}})),/Listed/);
 const previous=process.env.LISTED_PUBLIC_ORIGIN;
 try{process.env.LISTED_PUBLIC_ORIGIN='https://listed.example';assert.doesNotThrow(()=>requireSameOrigin(new Request('http://internal:3000/api',{headers:{host:'internal:3000',origin:'https://listed.example'}})));}finally{if(previous===undefined)delete process.env.LISTED_PUBLIC_ORIGIN;else process.env.LISTED_PUBLIC_ORIGIN=previous;}
});
const seller={uid:'seller',name:'Old Seller'},buyer={uid:'buyer',name:'Old Buyer'};
const property={address:'1920 Crescent Road',area:'Oak Bay',style:'Modern',type:'House',price:5000000,beds:4,baths:3.5,sqft:4800,year:1980,lot:10000,description:'A fictional listing record for an isolated location regression test.',photos:['https://example.com/test.jpg']};
test('seller map pins survive saves, known legacy addresses appear in radius searches, invalid pins fail',()=>{
 const data=emptyMarket();const id=applyCommand(data,seller,{action:'saveListing',status:'published',authorized:true,property})!;
 assert.equal(data.listings[0].property.location?.latitude,searchOrigin.latitude);
 delete data.listings[0].property.location;
 const restored=snapshot(data).listings[0].property;
 assert.equal(restored.location?.longitude,searchOrigin.longitude);
 assert.equal(radiusFeed([{property:restored,score:1,match:100,tradeoffs:[],reasons:[],discovery:false}],defaults,defaultSearchArea).length,1);
 const pin={latitude:48.415,longitude:-123.32,score:100,distanceMeters:-9,precision:'VERIFIED'};
 applyCommand(data,seller,{action:'saveListing',id,version:1,status:'published',authorized:true,property:{...property,location:pin}});
 const saved=snapshot(data).listings[0].property;
 assert.equal(saved.location?.latitude,pin.latitude);
 assert.equal(saved.location?.precision,'SELLER_PIN');
 assert.ok(saved.location!.distanceMeters>0);
 for(const location of [{latitude:Infinity,longitude:0},{latitude:48,longitude:181},{latitude:'48',longitude:-123}])assert.throws(()=>applyCommand(emptyMarket(),seller,{action:'saveListing',status:'draft',property:{...property,location}}),/valid map location/);
 assert.equal(knownLocation('1920 Crescent Road','Saanich'),undefined);
 assert.equal(knownLocation('1920 Other Road','Oak Bay'),undefined);
 assert.equal(knownLocation('1-1920 Crescent Road','Oak Bay'),undefined);
 assert.equal(pinLocation({latitude:NaN,longitude:0}),undefined);
});
test('fresh Microsoft names normalize without erasing names for missing profiles',()=>{
 assert.equal(microsoftProfileName({displayName:' New Name ',name:'Old Name'}),'New Name');
 assert.equal(microsoftProfileName({name:'New Name'}),'New Name');
 for(const p of [null,{}, {displayName:''},{name:42}])assert.equal(microsoftProfileName(p),undefined);
});
test('verified account name updates existing seller and buyer labels without changing IDs or listing versions',()=>{
 const data=emptyMarket();const id=applyCommand(data,seller,{action:'saveListing',status:'published',authorized:true,property})!;
 applyCommand(data,buyer,{action:'startConversation',listingId:id});
 assert.equal(syncActorName(data,{...seller,name:'New Seller'}),true);
 assert.equal(syncActorName(data,{...buyer,name:'New Buyer'}),true);
 assert.equal(data.listings[0].sellerName,'New Seller');assert.equal(data.listings[0].version,1);
 assert.equal(data.threads[0].sellerName,'New Seller');assert.equal(data.threads[0].buyerName,'New Buyer');
 assert.equal(data.threads[0].buyerId,buyer.uid);assert.equal(syncActorName(data,{...buyer,name:'New Buyer'}),false);
});
