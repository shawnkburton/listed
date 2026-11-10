import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseAssessment,assessedLotSquareFeet,applyAssessment,sanitizeAssessmentImport} from '../lib/assessment-prefill';
import {applyCommand,emptyMarket} from '../lib/marketplace-domain';
import {properties} from '../lib/properties';
// Fictional address deliberately outside the preview catalog.
const copied=`901 EXAMPLE RD KELOWNA V1A 1A1
Area-Jurisdiction-Roll: 19-123-456
Total value
$1,234,000
2026 assessment as of July 1, 2025
Property information
Year built\t1998
Bedrooms\t4
Baths\t2.5
Land size\t.137 Acres
First floor area\t1,100
Second floor area\t
Basement finish area\t500
PID: 123-456-789`;
test('imports an address outside the catalog without relying on existing listings',()=>{
 const p=parseAssessment(copied);assert.equal(properties.some(x=>x.address===p.reference.address),false);
 assert.deepEqual(p.fields,{year:1998,beds:4,baths:2.5,lot:5968});
 assert.deepEqual(p.reference,{address:'901 EXAMPLE RD KELOWNA V1A 1A1',pid:'123-456-789',year:2026,value:1234000});
 assert.equal(Object.hasOwn(p.fields,'sqft'),false);
 assert.deepEqual(parseAssessment(copied.replaceAll('\t','\n')).fields,p.fields);
});
test('only explicit lot area converts; missing, duplicate and invalid fields never invent values',()=>{
 assert.equal(assessedLotSquareFeet('.137 Acres'),5968);assert.equal(assessedLotSquareFeet('2,874 Sq Ft'),2874);
 for(const value of ['74 x 133 Ft','','unknown','-500 Sq Ft','100000000 Acres'])assert.equal(assessedLotSquareFeet(value),undefined);
 const p=parseAssessment(copied.replace('Bedrooms\t4','Bedrooms\t').replace('Baths\t2.5','Baths\tunknown').replace('.137 Acres','74 x 133 Ft'));
 assert.deepEqual(p.fields,{year:1998});
 assert.equal(parseAssessment(copied+'\nBedrooms\t5').fields.beds,undefined);
 assert.throws(()=>parseAssessment('nothing recognized'),/complete property record/);
 assert.throws(()=>parseAssessment(copied+'\n'+copied),/one complete property record/);
 assert.throws(()=>parseAssessment('x'.repeat(50001)),/50,000/);
});
test('explicit selection preserves unchecked details, price, description and photos',()=>{
 const draft={...properties[0],price:5000000,beds:7,baths:3,year:1960,lot:999,sqft:2222,description:'My description',photos:['https://example.com/test.jpg']};
 const next=applyAssessment(draft,parseAssessment(copied),['year','lot']);
 assert.equal(next.year,1998);assert.equal(next.lot,5968);assert.equal(next.address,'901 EXAMPLE RD KELOWNA V1A 1A1');
 for(const k of ['price','beds','baths','sqft','description','photos'] as const)assert.deepEqual(next[k],draft[k]);
});
test('source references cannot inject unsafe URLs or claim independently verified data',()=>{
 for(const url of ['javascript:alert(1)','https://bcassessment.ca.evil.com/Property/Info/ABC','https://user@www.bcassessment.ca/Property/Info/ABC','https://www.bcassessment.ca/Property/Info/ABC?secret=test'])assert.throws(()=>parseAssessment(copied,url),/property record link/);
 const p=parseAssessment(copied,'https://www.bcassessment.ca/Property/Info/ABC==');
 assert.equal(p.reference.url,'https://www.bcassessment.ca/Property/Info/ABC==');
 assert.equal(sanitizeAssessmentImport(p.reference,'A different address'),undefined);
 const d=emptyMarket();applyCommand(d,{uid:'qa',name:'QA'},{action:'saveListing',status:'draft',property:{...applyAssessment(properties[0],p,['year']),assessment:{total:999},beds:7}});
 assert.deepEqual(d.listings[0].property.assessmentImport,p.reference);assert.equal(d.listings[0].property.assessment,undefined);assert.equal(d.listings[0].property.beds,7);
 assert.deepEqual(sanitizeAssessmentImport({...p.reference,url:'javascript:alert(1)',value:-1,pid:'fake',year:9999},p.reference.address),{address:p.reference.address});
});

test('assessment import cannot prefill future or more-than-500-year-old construction years',()=>{
 const current=new Date().getFullYear();
 for(const year of [current+1,current-501,0])assert.equal(parseAssessment(copied.replace('Year built\t1998',`Year built\t${year}`)).fields.year,undefined);
 for(const year of [current,current-500])assert.equal(parseAssessment(copied.replace('Year built\t1998',`Year built\t${year}`)).fields.year,year);
});
