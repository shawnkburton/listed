import {test} from 'node:test';
import assert from 'node:assert/strict';
import {neighbourhoodResearch,suggestedNeighbourhood} from '../lib/neighbourhood';
import {preparedListing} from '../lib/prepared-listings';
import {applyCommand,emptyMarket,snapshot,MarketError} from '../lib/marketplace-domain';
const research=neighbourhoodResearch[0];
const home=preparedListing('202-denison-road')!.property;
const neighbourhood={researchId:research.id,address:home.address,area:home.area,text:research.draft,reviewed:true};
const actor={uid:'neighbourhood-test-seller',name:'Test Seller'};
const command={action:'saveListing',status:'draft',property:{...home,neighbourhood},authorized:false};

test('neighbourhood suggestions require a known address and area, not a street fragment',()=>{
 for(const address of ['1920 Crescent Rd','1920 Crescent Road, Oak Bay, BC','202 Denison Road'])assert.equal(suggestedNeighbourhood(address,'Oak Bay')?.id,research.id);
 for(const address of ['1926 Crescent Rd','1920 Crescent Rd Vancouver','19200 Crescent Rd','123 Test St',''])assert.equal(suggestedNeighbourhood(address,'Oak Bay'),undefined);
 assert.equal(suggestedNeighbourhood('1920 Crescent Rd','Saanich'),undefined);
});
test('reviewed research remains private in drafts and is included on publication without replacing home description',()=>{
 const d=emptyMarket(),id=applyCommand(d,actor,command)!;
 assert.equal(snapshot(d).listings.length,0);
 assert.deepEqual(snapshot(d,actor.uid).listings[0].property.neighbourhood,neighbourhood);
 const edited={...neighbourhood,text:research.draft+' Seller-added local context for review.'};
 applyCommand(d,actor,{...command,id,version:1,status:'published',authorized:true,property:{...home,price:3000000,photos:['https://example.com/test.jpg'],neighbourhood:edited}});
 assert.deepEqual(snapshot(d).listings[0].property.neighbourhood,edited);
 assert.equal(snapshot(d).listings[0].property.description,home.description);
 applyCommand(d,actor,{...command,id,version:2,property:{...home,neighbourhood:undefined}});
 assert.equal(snapshot(d,actor.uid).listings[0].property.neighbourhood,undefined);
});
test('server rejects stale address, unreviewed text, unknown research and invalid length',()=>{
 for(const change of [{address:'1920 Crescent Rd'},{area:'Saanich'},{reviewed:false},{researchId:'invented'},{text:'short'},{text:'x'.repeat(2001)}]){
  assert.throws(()=>applyCommand(emptyMarket(),actor,{...command,property:{...home,neighbourhood:{...neighbourhood,...change}}}),MarketError);
 }
});
test('server discards forged sources, research dates and verification claims',()=>{
 const d=emptyMarket();
 applyCommand(d,actor,{...command,property:{...home,neighbourhood:{...neighbourhood,sources:[{url:'javascript:alert(1)'}],checkedAt:'2099-01-01',verified:true}}});
 assert.deepEqual(snapshot(d,actor.uid).listings[0].property.neighbourhood,neighbourhood);
});
