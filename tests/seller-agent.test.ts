import {test} from 'node:test';
import {DatabaseSync} from 'node:sqlite';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {applyCommand,emptyMarket,snapshot,MarketError} from '../lib/marketplace-domain';
import {createMarketStore} from '../lib/server/market-store';
import {authorityPreparation,draftSellerDescription,emptySellerPlan,sanitizeSellerPlan,sellerAnswer,sellerSources,sellerTasks} from '../lib/seller-agent';
const actor={uid:'seller',name:'Fictional Seller'};
const home={address:'123 Fictional Road',area:'Oak Bay',style:'Character',type:'House',price:1200000,beds:3,baths:2,sqft:1800,year:1980,lot:5000,description:'A fictional home for isolated automated tests.',photos:['https://example.com/test.jpg']};
const create={action:'saveListing',property:home,status:'published',authorized:true};
const answers={...emptySellerPlan(),role:'joint' as const,timeline:'season' as const,highlights:'A covered patio.',notes:'Private plans for moving.'};
function setup(){const data=emptyMarket();const id=applyCommand(data,actor,create)!;return {data,id};}
test('seller plans are private even for published listings and cannot forge verification',()=>{
 const {data,id}=setup();const before=structuredClone(data.listings[0].property);
 applyCommand(data,actor,{action:'saveSellerPlan',id,version:1,answers:{...answers,identityVerified:true},status:'archived',property:{price:99}},1234);
 assert.deepEqual(data.listings[0].property,before);assert.equal(data.listings[0].status,'published');
 assert.deepEqual(data.listings[0].sellerPlan,{answers,updatedAt:1234});
 for(const uid of [undefined,'buyer','another-seller'])assert.equal('sellerPlan' in snapshot(data,uid).listings[0],false);
 assert.deepEqual(snapshot(data,actor.uid).listings[0].sellerPlan?.answers,answers);
 assert.throws(()=>applyCommand(data,{uid:'buyer',name:'Buyer'},{action:'saveSellerPlan',id,version:2,answers}),/Only the seller/);
 assert.throws(()=>applyCommand(data,actor,{action:'saveSellerPlan',id,version:1,answers}),/another window/);
 assert.throws(()=>applyCommand(data,actor,{action:'saveSellerPlan',id:'missing',version:2,answers}),/not found/);
 assert.equal(data.listings[0].version,2);
});
test('ordinary listing edits preserve a plan; changing the address clears it',()=>{
 const {data,id}=setup();applyCommand(data,actor,{action:'saveSellerPlan',id,version:1,answers});
 applyCommand(data,actor,{...create,id,version:2,property:{...home,price:1300000},sellerPlan:{answers:{notes:'injected'}}});
 assert.deepEqual(data.listings[0].sellerPlan?.answers,answers);
 applyCommand(data,actor,{...create,id,version:3,property:{...home,address:'456 Different Road'},sellerPlan:{answers}});
 assert.equal(data.listings[0].sellerPlan,undefined);
});
test('invalid plans fail without mutating listing state',()=>{
 const {data,id}=setup();const before=JSON.stringify(data);
 for(const invalid of [null,{...answers,role:'__proto__'},{...answers,timeline:'whenever'},{...answers,highlights:'x'.repeat(1201)},{...answers,notes:123}]){
  assert.throws(()=>applyCommand(data,actor,{action:'saveSellerPlan',id,version:1,answers:invalid}),MarketError);
  assert.equal(JSON.stringify(data),before);
 }
 assert.equal(sanitizeSellerPlan({...answers,notes:'  trim me  '}).notes,'trim me');
});
test('private plans survive database restart and remain out of public API snapshots',()=>{
 const folder=mkdtempSync(join(tmpdir(),'listed-seller-agent-'));const file=join(folder,'test.sqlite');let store=createMarketStore(file);
 try{const {id}=store.command(actor,{...create,status:'draft'});store.command(actor,{action:'saveSellerPlan',id,version:1,answers});store.close();store=createMarketStore(file);
  assert.deepEqual(store.get(actor.uid).listings[0].sellerPlan?.answers,answers);assert.equal(store.get().listings.length,0);
  store.command(actor,{...create,id,version:2});assert.equal('sellerPlan' in store.get().listings[0],false);
  const legacy=new DatabaseSync(file);try{const raw=JSON.parse((legacy.prepare('SELECT body FROM marketplace WHERE id=1').get() as {body:string}).body);assert.equal('sellerPlan' in raw.listings[0],false);assert.equal(JSON.stringify(raw).includes(answers.notes),false);}finally{legacy.close();}
 }finally{store.close();rmSync(folder,{recursive:true,force:true});}
});
test('guidance distinguishes supplied fields from verification and does not invent local coverage',()=>{
 const {data}=setup();const p=data.listings[0].property;
 assert.equal(sellerTasks(p,emptySellerPlan()).find(t=>!t.complete)?.id,'plan');
 assert.match(sellerAnswer('verification',p,answers),/not connected/);
 assert.match(sellerAnswer('price',p,answers),/cannot provide a supported price/);
 assert.match(authorityPreparation('joint').join(' '),/every owner/);
 assert.match(authorityPreparation('estate').join(' '),/probate/);
 assert.match(authorityPreparation('attorney').join(' '),/power of attorney/);
 assert.equal(sellerSources('CA','ON'),undefined);assert.equal(sellerSources('US','BC'),undefined);
 assert.equal(sellerTasks(p,answers).find(t=>t.id==='neighbourhood')?.detail.includes('not available'),true);
 const copy=draftSellerDescription(p,answers.highlights);
 assert.match(copy,/1,800 sq ft/);assert.match(copy,/covered patio/);assert.equal(copy.includes(answers.notes),false);
 assert.doesNotMatch(copy,/ocean|mountain|1,200,000|verified/i);
 assert.doesNotMatch(draftSellerDescription({...p,year:9999,sqft:0,lot:0},''),/9999|0 sq ft/);
});
