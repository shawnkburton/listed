import {test} from 'node:test';
import assert from 'node:assert/strict';
import {properties as catalog} from '../lib/properties';
const properties=catalog.filter(p=>p.source==='realtor');
import {distanceMeters,searchOrigin} from '../lib/geography';

test('twenty distinct real houses have matched assessment and listing provenance',()=>{
 assert.equal(properties.length,20);assert.equal(new Set(properties.map(p=>p.id)).size,20);
 for(const p of properties){assert.equal(p.source,'realtor');assert.equal(p.type,'House');assert.ok(p.listing&&p.assessment&&p.location);
 assert.ok(p.assessment.address.startsWith(p.address.toUpperCase()));assert.match(p.listing.url,/^https:\/\/www\.realtor\.ca\/real-estate\//);assert.match(p.assessment.url,/^https:\/\/www\.bcassessment\.ca\/Property\/Info\//);
 assert.equal(p.assessment.year,2026);assert.equal(p.assessment.valuationDate,'2025-07-01');assert.equal(p.assessment.land+p.assessment.buildings,p.assessment.total);
 assert.ok(p.listing.tax!==null&&p.listing.tax>0);assert.equal(p.listing.taxYear,null);assert.ok(p.listing.rooms.length>0);assert.ok(p.photos.length>=3);assert.ok(p.photos.every(url=>url.startsWith('https://cdn.realtor.ca/')));
 assert.ok(p.price>0&&p.beds>0&&p.sqft>0);assert.ok(p.location.score>=96);assert.equal(p.location.precision,'CIVIC_NUMBER');
 }
});
test('stored distances agree with the reference location and the original REALTOR.ca snapshot is nearest first',()=>{
 let previous=0;
 for(const p of properties){assert.equal(p.location!.distanceMeters,Math.round(distanceMeters(searchOrigin,p.location!)));assert.ok(p.location!.distanceMeters>=previous);previous=p.location!.distanceMeters;}
 assert.equal(properties[0].address,'342 Foul Bay Rd');assert.equal(previous,631);
});
test('bundled parcels cannot produce a misleading asking-versus-assessment percentage',()=>{
 const packageHome=properties.find(p=>p.address==='30 Beach Dr')!;assert.equal(packageHome.assessment!.comparable,false);assert.ok(packageHome.notes?.some(n=>n.includes('30 and 40')));
});
test('source disagreements and limited sale history remain explicit',()=>{
 const hollywood=properties.find(p=>p.address==='1821 Hollywood Cres')!;assert.equal(hollywood.year,1921);assert.equal(hollywood.assessment!.built,1922);assert.equal(hollywood.assessment!.sales.length,0);
 assert.deepEqual(properties[0].assessment!.sales,[{date:'May 17, 2023',price:1453000}]);
});
