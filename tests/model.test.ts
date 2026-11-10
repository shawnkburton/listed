import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults, type BuyerState, type EngagementEvent, type EventKind} from '../lib/domain';
import {properties} from './fixtures/sample-properties';
import {activeIds,learnedAffinities,rankProperties,validPreferences} from '../lib/recommendations';
import {interestFor,type VerifiedSignal} from '../lib/interest';
import {parseState as parseCatalogState} from '../lib/storage';
const parseState=(raw:string|null)=>parseCatalogState(raw,properties);
const criteria={...defaults,area:'Oak Bay' as const,style:'Modern' as const,maxPrice:1800000,minBeds:3};
const now=Date.now();
const event=(kind:EventKind,propertyId='saanich-01',extra:Partial<EngagementEvent>={}):EngagementEvent=>({id:crypto.randomUUID(),kind,propertyId,visitorId:'buyer',sessionId:'session',at:now,provenance:'local',...extra});
const state=(events:EngagementEvent[]=[]):BuyerState=>({version:1,visitorId:'buyer',preferences:{...criteria},events});
test('stated criteria prioritize stated criteria and reserves a fourth-slot discovery',()=>{const r=rankProperties(properties,state(),now);assert.equal(r[0].discovery,false);assert.equal(r[1].discovery,false);assert.equal(r[2].discovery,false);assert.equal(r[3].discovery,true);assert.equal(r[3].property.area,'Saanich');assert.ok(r.every(r=>r.property.price<=1800000));});
test('hard budget applies even when adventurous and heavily trained above budget',()=>{const s=state([event('save','saanich-03')]);s.preferences.discovery=50;assert.ok(rankProperties(properties,s,now).every(r=>r.property.price<=1800000));});
test('focused mode returns only complete matches',()=>{const s=state();s.preferences.discovery=0;const r=rankProperties(properties,s,now);assert.ok(r.length>0);assert.ok(r.every(r=>!r.discovery));});
test('soft budget permits labelled over-budget discovery',()=>{const s=state();s.preferences.strictBudget=false;const r=rankProperties(properties,s,now).find(r=>r.property.id==='saanich-03')!;assert.ok(r.discovery);assert.ok(r.tradeoffs.includes('Above budget'));});
test('save changes affinity without letting repeated actions farm it',()=>{const once=learnedAffinities(properties,[event('save')],now);const many=learnedAffinities(properties,Array.from({length:500},()=>event('save')),now);assert.equal(once.Saanich,4);assert.equal(many.Saanich,4);});
test('unsave and unlike reverse their preference contribution',()=>{const ev=[event('save'),event('like'),event('unsave'),event('unlike')];assert.equal(learnedAffinities(properties,ev,now).Saanich,0);assert.equal(activeIds(ev,'save','unsave').size,0);});
test('learning changes the relative order of similar candidates',()=>{const s=state([event('save','oak-06')]);const r=rankProperties(properties,s,now);assert.ok(r.findIndex(r=>r.property.id==='oak-06')<r.findIndex(r=>r.property.id==='oak-02'));assert.ok(r.find(r=>r.property.id==='oak-06')!.reasons.some(r=>r.includes('Your activity')));});
test('learning can be paused',()=>{const base=state(),s=state([event('save','oak-06')]);s.preferences.learning=false;assert.deepEqual(rankProperties(properties,s,now).map(r=>r.property.id),rankProperties(properties,base,now).map(r=>r.property.id));});
test('hide excludes exactly the selected property and undo restores it',()=>{const s=state([event('hide','oak-01',{reason:'style'})]);assert.ok(!rankProperties(properties,s,now).some(r=>r.property.id==='oak-01'));s.events.push(event('unhide','oak-01'));assert.ok(rankProperties(properties,s,now).some(r=>r.property.id==='oak-01'));});
test('hide location supplies a negative area signal; price does not rewrite preferences',()=>{assert.ok(learnedAffinities(properties,[event('hide','saanich-01',{reason:'location'})],now).Saanich<0);const s=state([event('hide','saanich-01',{reason:'price'})]);rankProperties(properties,s,now);assert.deepEqual(s.preferences,criteria);});
test('stale and future activity cannot shape learned preferences',()=>{const a=learnedAffinities(properties,[event('save','saanich-01',{at:now-100*86400000}),event('save','oak-01',{at:now+1000})],now);assert.equal(a.Saanich,0);assert.equal(a['Oak Bay'],0);});
test('empty catalog and no full matches are safe',()=>{assert.deepEqual(rankProperties([],state(),now),[]);const s=state();s.preferences.maxPrice=100;assert.deepEqual(rankProperties(properties,s,now),[]);s.preferences.strictBudget=false;assert.equal(rankProperties(properties,s,now).length,properties.length);});
test('interest never rises from absent data or repeated activity by one buyer',()=>{const signals:VerifiedSignal[]=Array.from({length:100},()=>({propertyId:'oak-01',buyerId:'one',kind:'save',at:now,verified:true}));assert.equal(interestFor(properties[0],properties,[],now).high,false);assert.equal(interestFor(properties[0],properties,signals,now).high,false);});
function verifiedFixture():VerifiedSignal[]{return ['oak-01','oak-02','oak-03','oak-05'].flatMap((id,index)=>Array.from({length:20},(_,i)=>[{propertyId:id,buyerId:`buyer-${i}`,kind:'view' as const,at:now,verified:true as const},...(i<(index===0?10:2)?[{propertyId:id,buyerId:`buyer-${i}`,kind:'save' as const,at:now,verified:true as const}]:[])]).flat());}
test('high interest requires enough unique buyers and elevated rate against comparable peers',()=>{const r=interestFor(properties[0],properties,verifiedFixture(),now);assert.equal(r.high,true);assert.equal(r.engaged,10);assert.equal(r.viewers,20);assert.equal(r.peerCount,3);assert.equal(r.baseline,.1);assert.equal(r.rate,.5);});
test('duplicates cannot inflate unique saves or engagement',()=>{const fixture=verifiedFixture();const r=interestFor(properties[0],properties,[...fixture,...fixture,...fixture],now);assert.equal(r.saves,10);assert.equal(r.engaged,10);});
test('insufficient peer evidence suppresses the badge',()=>{const signals=verifiedFixture().filter(s=>s.propertyId!=='oak-05');assert.equal(interestFor(properties[0],properties,signals,now).high,false);});
test('expired, future, and unverified signals never qualify',()=>{const signals=verifiedFixture();assert.equal(interestFor(properties[0],properties,signals.map(s=>({...s,at:now-8*86400000})),now).high,false);assert.equal(interestFor(properties[0],properties,signals.map(s=>({...s,at:now+1000})),now).high,false);assert.equal(interestFor(properties[0],properties,signals.map(s=>({...s,verified:false} as unknown as VerifiedSignal)),now).high,false);});
test('engagement must belong to a counted viewer',()=>{const signals=verifiedFixture().filter(s=>s.propertyId!=='oak-01'||s.kind!=='view');assert.equal(interestFor(properties[0],properties,signals,now).engaged,0);});
test('invalid stored data recovers safely and rejects unknown properties',()=>{assert.equal(parseState('bad JSON').version,1);assert.deepEqual(parseState('{"version":100}').preferences,defaults);const s=state([event('save','unknown'),event('save','oak-01')]);assert.equal(parseState(JSON.stringify(s)).events.length,1);});
test('preferences reject malformed and unsupported values',()=>{assert.equal(validPreferences({...defaults,maxPrice:-1}),null);assert.equal(validPreferences({...defaults,discovery:100}),null);assert.equal(validPreferences({...defaults,area:'<script>'}),null);});

test('empty criteria include an expensive published seller home without false preference claims',()=>{
 const seller={...properties[0],id:'seller-e67a1782-8804-4f9c-bcff-5bb25c775c68',price:5000000,source:'seller' as const};
 const s={...state(),preferences:{...defaults}};
 const r=rankProperties([...properties,seller],s,now);assert.equal(r.length,properties.length+1);
 const item=r.find(x=>x.property.id===seller.id)!;assert.equal(item.discovery,false);assert.deepEqual(item.tradeoffs,[]);assert.equal(item.reasons.some(r=>/as you asked|stated budget|preferred area/.test(r)),false);
 s.preferences.maxPrice=1800000;assert.equal(rankProperties([...properties,seller],s,now).some(x=>x.property.id===seller.id),false);
});
test('old preset criteria migrate once without losing likes and saves; custom criteria stay',()=>{
 const old=state([event('like','oak-01'),event('save','oak-01')]);
 const migrated=parseState(JSON.stringify(old));assert.deepEqual(migrated.preferences,defaults);assert.equal(migrated.events.length,2);assert.equal(migrated.preferencesVersion,2);
 const custom={...old,preferences:{...old.preferences,maxPrice:2500000}};assert.equal(parseState(JSON.stringify(custom)).preferences.maxPrice,2500000);
 const explicit={...old,preferencesVersion:2};assert.deepEqual(parseState(JSON.stringify(explicit)).preferences,old.preferences);
});
