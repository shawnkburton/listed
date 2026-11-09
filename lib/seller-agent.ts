import type {Property} from './domain';
import {suggestedNeighbourhood} from './neighbourhood';

export const sellerRoles={unknown:'Choose your role',sole:'Sole registered owner',joint:'One of multiple owners',company:'Representing a company',estate:'Executor or administrator',attorney:'Acting under a power of attorney',trust:'Trustee or court-appointed representative',other:'Another arrangement / unsure'} as const;
export const sellerTimelines={unknown:'Choose a timeline',exploring:'Just exploring',soon:'Within a month',season:'Within 1–3 months',later:'More than 3 months away'} as const;
export interface SellerPlan {
  role:keyof typeof sellerRoles;
  timeline:keyof typeof sellerTimelines;
  highlights:string;
  notes:string;
}
export interface SavedSellerPlan {answers:SellerPlan;updatedAt:number}
export const emptySellerPlan=():SellerPlan=>({role:'unknown',timeline:'unknown',highlights:'',notes:''});
export function sanitizeSellerPlan(input:unknown):SellerPlan {
  if(!input||typeof input!=='object')throw Error('Your seller plan is required.');
  const p=input as Record<string,unknown>;
  if(typeof p.role!=='string'||!Object.hasOwn(sellerRoles,p.role))throw Error('Choose a valid seller role.');
  if(typeof p.timeline!=='string'||!Object.hasOwn(sellerTimelines,p.timeline))throw Error('Choose a valid selling timeline.');
  if(typeof p.highlights!=='string'||p.highlights.trim().length>1200)throw Error('Keep property highlights under 1,200 characters.');
  if(typeof p.notes!=='string'||p.notes.trim().length>2000)throw Error('Keep private notes under 2,000 characters.');
  return {role:p.role as SellerPlan['role'],timeline:p.timeline as SellerPlan['timeline'],highlights:p.highlights.trim(),notes:p.notes.trim()};
}

// Provider selection is keyed by jurisdiction. Missing coverage must stay missing,
// never fall back to BC authorities for a property in another province.
export function sellerSources(country:string,province:string){
  if(country!=='CA'||province!=='BC')return undefined;
  return {
    label:'British Columbia',checkedAt:'October 3, 2026',
    assessment:{label:'BC Assessment',url:'https://www.bcassessment.ca/'},
    title:{label:'LTSA title search',url:'https://ltsa.ca/property-owners/how-can-i/search-for-a-title/'},
    guidance:{label:'BCFSA listing checklist',url:'https://www.bcfsa.ca/industry-resources/real-estate-professional-resources/knowledge-base/practice-resources/listing-information-checklist'},
  };
}
export function authorityPreparation(role:SellerPlan['role']):string[] {
  const common=['Obtain a current title for the correct parcel and identify every registered owner.','Have any title restrictions or competing interests reviewed by a BC real-estate lawyer.'];
  const specific:Record<SellerPlan['role'],string[]>={
    unknown:['Choose how you are connected to the property so we can tailor your preparation.'],
    sole:['Confirm your verified identity matches the registered owner.','Prepare signed permission to advertise the home; this does not authorize Listed to sign a sale contract.'],
    joint:['Arrange identity checks and listing consent from every owner, or professional review of a representative’s authority.'],
    company:['Obtain company records and evidence of the representative’s signing authority for legal review.'],
    estate:['Have a lawyer review the grant of probate or administration and the representative’s authority.'],
    attorney:['Have a lawyer or qualified notary validate the power of attorney, its current effectiveness and permitted actions.'],
    trust:['Have a lawyer review the trust documents or court order and identify who may give instructions.'],
    other:['Ask a BC real-estate lawyer to identify who can authorize the listing and what evidence is needed.'],
  };
  return role==='unknown'?specific[role]:[...common,...specific[role]];
}

export interface SellerTask {id:string;title:string;detail:string;complete:boolean;action:'plan'|'listing'|'neighbourhood'}
export function sellerTasks(property:Property,plan:SellerPlan):SellerTask[]{
  const research=suggestedNeighbourhood(property.address,property.area);
  return [
    {id:'plan',title:'Set your selling plan',detail:'Choose your role and preferred timeline.',complete:plan.role!=='unknown'&&plan.timeline!=='unknown',action:'plan'},
    {id:'facts',title:'Review the home’s details',detail:'Add an address and floor area; confirm the bedrooms, bathrooms and year in the editor.',complete:!!property.address.trim()&&property.sqft>0,action:'listing'},
    {id:'price',title:'Set an asking price',detail:'Compare current local evidence before choosing a price. An assessment is not an asking-price recommendation.',complete:property.price>0,action:'listing'},
    {id:'description',title:'Describe your home',detail:'Add at least 30 characters describing the layout and features.',complete:property.description.trim().length>=30,action:'listing'},
    {id:'photos',title:'Add your photographs',detail:'At least one photo is needed for this preview. Add up to 25 and put your strongest image first.',complete:property.photos.length>0,action:'listing'},
    {id:'map',title:'Check the map pin',detail:'Place the property accurately so it appears in map and radius searches.',complete:!!property.location,action:'listing'},
    {id:'neighbourhood',title:'Describe the neighbourhood',detail:research?'Gonzales research is available for you to review and edit.':'Automatic research for this address is not available yet. Only use an existing research pack if it applies.',complete:!!property.neighbourhood,action:'neighbourhood'},
  ];
}
// A deterministic starting draft. Only supplied facts and explicitly included
// highlights are used; private notes never become marketing copy.
export function draftSellerDescription(property:Property,highlights:string):string {
  const facts=[property.beds>0?`${property.beds} bedrooms`:null,property.baths>0?`${property.baths} bathrooms`:null,property.sqft>0?`${property.sqft.toLocaleString('en-CA')} sq ft of interior space`:null].filter(Boolean);
  const lines=[`${property.type==='Townhome'?'A townhome':'A home'} at ${property.address}, ${property.area}${facts.length?`, with ${facts.join(', ')}`:''}.`];
  if(property.year>0&&property.year<=new Date().getFullYear())lines.push(`Built in ${property.year}.`);
  if(property.lot>0)lines.push(`The recorded lot size is ${property.lot.toLocaleString('en-CA')} sq ft.`);
  if(highlights.trim())lines.push(highlights.trim());
  return lines.join('\n\n');
}
export type SellerQuestion='next'|'documents'|'price'|'verification';
export function sellerAnswer(question:SellerQuestion,property:Property,plan:SellerPlan):string {
  if(question==='documents')return authorityPreparation(plan.role).join('\n\n');
  if(question==='verification')return 'Identity, ownership and authority are separate checks. Stripe Identity and LTSA are not connected to Listed yet, and no identity or ownership checks have been performed by this assistant. Your Microsoft or Google sign-in and the listing authorization checkbox do not establish these checks.';
  if(question==='price')return 'Start with recent comparable sales and current competing listings in the same area, then review differences in size, condition and location with a qualified professional. Listed has no live comparable-sales feed connected and cannot provide a supported price recommendation yet. Keep the asking price separate from assessed value and previous sale prices.';
  const next=sellerTasks(property,plan).find(t=>!t.complete);
  const timing=plan.timeline==='soon'?'Since you are aiming to list within a month, start arranging any professional review now. ':plan.timeline==='exploring'?'You can keep your listing as a private draft while you explore. ':'';
  return timing+(next?`${next.title}. ${next.detail}`:'The preparation fields are filled in. Review your listing and sources before publishing. Identity, ownership and authority checks remain outstanding; this checklist does not certify the property or seller.');
}
