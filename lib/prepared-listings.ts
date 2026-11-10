import type {Property} from './domain';
import {distanceMeters,searchOrigin} from './geography';
const denisonLocation={latitude:48.4117405,longitude:-123.3227556};

// Requested address imports. These are editable starting points, never published listings.
export const preparedListings = [{
 id:'202-denison-road',
 checkedAt:'September 30, 2026',
 property:{id:'',address:'202 Denison Road',area:'Oak Bay',style:'Coastal',type:'House',price:0,beds:5,baths:3,sqft:3788,year:1974,lot:0,daysListed:0,source:'seller',tags:['Seller listed'],photos:[],
 description:'A five-bedroom, three-bathroom home on Gonzales Hill in Oak Bay. The previous listing describes southwest-facing views across Gonzales Bay toward the Salish Sea and Olympic Mountains, with a main-floor primary bedroom, lower-level living space, and a double garage.',
 location:{...denisonLocation,distanceMeters:Math.round(distanceMeters(searchOrigin,denisonLocation)),precision:'CIVIC_NUMBER',score:100},
 assessmentImport:{address:'202 Denison Road',pid:'002-995-395',year:2026,value:2638000,url:'https://www.bcassessment.ca/Property/Info/QTAwMDBIUUE4WQ=='}
 } satisfies Property,
 notes:[
  'BC Assessment confirms 5 bedrooms, 3 bathrooms and year built 1974. Its 2026 assessed value is $2,638,000, valued July 1, 2025. This is a reference, not your asking price.',
  'The previous listing (MLS 985532) reports 3,788 sq ft. Assessment records show 1,924 sq ft on the first floor and 1,856 sq ft of finished basement; measurement definitions differ. Confirm the current floor area.',
  'The assessment gives lot dimensions of 96 × 105 ft, not a surveyed lot area. Lot area is left blank. The older REW record differs from the current assessment and was not used for bedroom or bathroom counts.',
  'The $3,000,000 sale on April 8, 2025 is historical. Asking price starts at $0. Annual taxes and room-by-room measurements were not verified.',
  'Review the description against the home today. Add your current photos or videos. The map pin uses the BC Address Geocoder’s exact civic-address match; confirm its placement before publishing.'
 ],
 sources:[{label:'BC Assessment record',url:'https://www.bcassessment.ca/Property/Info/QTAwMDBIUUE4WQ=='},{label:'Previous sold listing · Garry Oak Group',url:'https://garryoakgroup.com/recently-sold/?_pg=1'}]
}];
export function preparedListing(id:string){return preparedListings.find(p=>p.id===id);}
