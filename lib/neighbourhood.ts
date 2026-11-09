import type {Area} from './domain';

export interface NeighbourhoodDescription {
  researchId:string; address:string; area:Area; text:string; reviewed:true;
}
export interface NeighbourhoodResearch {
  id:string; name:string; checkedAt:string; draft:string;
  sources:{label:string;url:string;supports:string}[];
}
// Versioned research keeps the citations for a saved draft stable. This registry is
// curated web research, not a live search or an automatic address-boundary service.
export const neighbourhoodResearch:NeighbourhoodResearch[]=[{
  id:'gonzales-2026-09-30',name:'Gonzales',checkedAt:'September 30, 2026',
  draft:'The Gonzales area brings together coastal recreation and natural parkland around the Victoria–Oak Bay border. Gonzales Beach is accessed from Crescent Road near the south end of Foul Bay Road. On Denison Road, Gonzales Hill Regional Park offers walking trails, Garry oak trees and seasonal wildflowers. Its rocky viewpoints overlook the ocean, and the historic Gonzales Observatory adds a distinctive local landmark.',
  sources:[
    {label:'Destination Greater Victoria · Gonzales Beach',url:'https://www.tourismvictoria.com/things-to-do/beaches-lakes/gonzales-beach',supports:'Beach access from Crescent Road near Foul Bay Road.'},
    {label:'CRD · Gonzales Hill Regional Park',url:'https://www.crd.ca/parks-recreation/find-park-or-trail/gonzales-hill-regional-park',supports:'Park location, walking trails, Garry oaks, wildflowers, viewpoints and the observatory.'},
  ],
}];
export function researchById(id:string){return neighbourhoodResearch.find(r=>r.id===id);}
export function suggestedNeighbourhood(address:string,area:string){
  const normalized=address.trim().toLowerCase().replace(/\broad\b/g,'rd').replace(/[.,]/g,'').replace(/\s+/g,' ');
  return area==='Oak Bay'&&/^(1920 crescent rd|202 denison rd)( oak bay( bc)?)?$/.test(normalized)?neighbourhoodResearch[0]:undefined;
}
export function sanitizeNeighbourhood(value:unknown,address:string,area:Area):NeighbourhoodDescription|undefined{
  if(value==null)return;
  if(typeof value!=='object')throw new Error('Review the neighbourhood description before saving.');
  const p=value as Record<string,unknown>;
  if(typeof p.researchId!=='string'||!researchById(p.researchId)||p.reviewed!==true||p.address!==address||p.area!==area)
    throw new Error('Review the neighbourhood description again for this address.');
  if(typeof p.text!=='string'||p.text.trim().length<30||p.text.trim().length>2000)
    throw new Error('Neighbourhood description must be 30–2000 characters.');
  // Source URLs, research dates, and claims of independent verification are never accepted from clients.
  return {researchId:p.researchId,address,area,text:p.text.trim(),reviewed:true};
}
