import {test} from 'node:test';
import assert from 'node:assert/strict';
import {preparedListing} from '../lib/prepared-listings';
import {applyCommand,emptyMarket,snapshot} from '../lib/marketplace-domain';
test('prepared address imports save privately without turning past sale or assessment into asking price',()=>{
 const draft=structuredClone(preparedListing('202-denison-road')!.property);
 const market=emptyMarket();
 applyCommand(market,{uid:'import-test-seller',name:'Test Seller'},{action:'saveListing',status:'draft',property:draft,authorized:false});
 assert.equal(snapshot(market).listings.length,0);
 assert.equal(snapshot(market,'another-account').listings.length,0);
 const saved=snapshot(market,'import-test-seller').listings[0];
 assert.equal(saved.status,'draft');assert.equal(saved.property.price,0);
 assert.equal(saved.property.assessmentImport?.value,2638000);
 assert.equal(saved.property.assessmentImport?.pid,'002-995-395');
 assert.equal(saved.property.location?.latitude,48.4117405);
 assert.equal(saved.property.location?.longitude,-123.3227556);
 assert.equal(saved.property.lot,0);assert.deepEqual(saved.property.photos,[]);
 assert.throws(()=>applyCommand(emptyMarket(),{uid:'import-test-seller',name:'Test Seller'},{action:'saveListing',status:'published',property:draft,authorized:false}));
});

test('account-free import is in the public catalog and does not imply a budget match',async()=>{
 const {properties,propertyRepository}=await import('../lib/properties');
 const {rankProperties}=await import('../lib/recommendations');
 const {defaults}=await import('../lib/domain');
 const {matchesOtherCriteria}=await import('../lib/radius-search');
 assert.equal(new Set(properties.map(p=>p.id)).size,properties.length);
 const p=await propertyRepository.get('import-202-denison-road');
 assert.ok(p);assert.equal(p.source,'imported');assert.equal(p.price,0);assert.ok(p.location);
 const state={version:1 as const,visitorId:'guest',preferences:{...defaults,maxPrice:1800000},events:[]};
 assert.equal(rankProperties(properties,state).some(r=>r.property.id===p.id),false);
 assert.equal(matchesOtherCriteria(p,state.preferences),false);
 const shown=rankProperties(properties,{...state,preferences:defaults}).find(r=>r.property.id===p.id);
 assert.ok(shown);assert.ok(shown.reasons.includes('Asking price not set; budget match unknown'));
});
