import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaults,type MapSearchArea,type Preferences,type Property} from '../lib/domain';
import {properties} from '../lib/properties';
import {rankProperties,type Recommendation} from '../lib/recommendations';
import {mapDistance,radiusFeed,validSearchArea} from '../lib/radius-search';
import {parseState,freshState} from '../lib/storage';
const area:MapSearchArea={latitude:0,longitude:0,radiusKm:1,includeOutside:true};
const home=(id:string,metres:number,extra:Partial<Property>={}):Property=>({...properties[0],id,price:1000000,beds:3,area:'Oak Bay',style:'Modern',location:{latitude:metres/111195,longitude:0,distanceMeters:0,precision:'test',score:100},...extra});
const ranked=(ps:Property[],prefs:Preferences=defaults):Recommendation[]=>rankProperties(ps,{version:1,visitorId:'test',preferences:prefs,events:[]});
test('radius makes local homes primary and caps outside discoveries at one per four local homes',()=>{
 const ps=[...Array.from({length:9},(_,i)=>home(`in-${i}`,100+i)),...Array.from({length:30},(_,i)=>home(`out-${i}`,1500+i))];
 const result=radiusFeed(ranked(ps),defaults,area);
 assert.equal(result.length,11);assert.deepEqual(result.filter(r=>r.outsideRadius).map(r=>result.indexOf(r)),[4,9]);
 assert.equal(result.filter(r=>!r.outsideRadius).length,9);assert.equal(new Set(result.map(r=>r.property.id)).size,11);
 assert.equal(radiusFeed(ranked(ps),defaults,{...area,includeOutside:false}).length,9);
 assert.equal(radiusFeed(ranked(ps),defaults,null).length,39);
});
test('sparse or empty radius never backfills with outside homes or unknown locations',()=>{
 const ps=[home('one',100),home('two',200),home('outside',2000),home('unknown',0,{location:undefined})];
 assert.deepEqual(radiusFeed(ranked(ps),defaults,area).map(r=>r.property.id).sort(),['one','two']);
 assert.equal(radiusFeed(ranked(ps.slice(2)),defaults,area).length,0);
 assert.equal(mapDistance(ps[3],area),null);assert.equal(mapDistance(home('bad',0,{location:{latitude:NaN,longitude:0,distanceMeters:0,precision:'test',score:100}}),area),null);
});
test('outside homes must satisfy all other criteria, even with soft budget and strong engagement',()=>{
 const prefs:Preferences={...defaults,maxPrice:1200000,minBeds:3,area:'Oak Bay',style:'Modern',strictBudget:false,discovery:50};
 const ps=[...Array.from({length:8},(_,i)=>home(`local-${i}`,100)),home('over-budget',2000,{price:1300000}),home('too-small',2000,{beds:2}),home('wrong-style',2000,{style:'Character'}),home('wrong-area',2000,{area:'Fairfield'}),home('eligible',2000)];
 const result=radiusFeed(ranked(ps,prefs),prefs,area);assert.deepEqual(result.filter(r=>r.outsideRadius).map(r=>r.property.id),['eligible']);
 assert.equal(result.find(r=>r.property.id==='eligible')?.discovery,true);assert.match(result.find(r=>r.property.id==='eligible')!.reasons[0],/outside your 1 km radius/);
});
test('map boundary, moved centre, saved radius validation and migration preserve other state',()=>{
 const boundary=home('boundary',1000),distance=mapDistance(boundary,area)!;
 assert.equal(radiusFeed(ranked([boundary]),defaults,{...area,radiusKm:distance/1000})[0]?.outsideRadius,false);
 assert.equal(radiusFeed(ranked([home('centre',0)]),defaults,{...area,latitude:1}).length,0);
 const state={...freshState(),searchArea:area,analyticsEnabled:false};const loaded=parseState(JSON.stringify(state));assert.deepEqual(loaded.searchArea,area);assert.equal(loaded.analyticsEnabled,false);
 for(const invalid of [{...area,latitude:91},{...area,longitude:200},{...area,radiusKm:0},{...area,radiusKm:101},{...area,includeOutside:'true'}])assert.equal(validSearchArea(invalid),null);
 const migrated=parseState(JSON.stringify({...state,searchArea:{...area,radiusKm:-2}}));assert.equal(migrated.searchArea,null);assert.deepEqual(migrated.preferences,state.preferences);assert.equal(parseState(JSON.stringify(freshState())).searchArea,null);
});
test('hidden homes, feature-filtered candidates and selected ordering are preserved before outside interleaving',()=>{
 const ps=[...Array.from({length:5},(_,i)=>home(`local-${i}`,100+i,{price:1000000+i*1000})),home('out',1500)];
 const recommendations=rankProperties(ps,{version:1,visitorId:'v',preferences:defaults,events:[{id:'hide',propertyId:'local-0',kind:'hide',at:Date.now(),visitorId:'v',sessionId:'s',provenance:'local'}]});
 const sorted=[...recommendations].sort((a,b)=>b.property.price-a.property.price);
 const result=radiusFeed(sorted,defaults,area);assert.deepEqual(result.map(r=>r.property.id),['local-4','local-3','local-2','local-1','out']);
 assert.equal(radiusFeed(sorted.filter(r=>r.property.id!=='out'),defaults,area).some(r=>r.outsideRadius),false);
});
