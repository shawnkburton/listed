import type {NeighbourhoodDescription} from './neighbourhood';
export const areas = ['Oak Bay', 'Saanich', 'Fairfield', 'Victoria'] as const;
export const styles = ['Modern', 'Character', 'Coastal', 'Townhome'] as const;
export type Area = typeof areas[number];
export type Style = typeof styles[number];
export interface AssessmentImport {address:string;pid?:string;year?:number;value?:number;url?:string}
export interface Property {
  id: string; address: string; area: Area; price: number; beds: number; baths: number; sqft: number;
  style: Style; type: 'House' | 'Townhome'; tags: string[]; photos: string[]; description: string;
  year: number; lot: number; daysListed: number; source: 'sample' | 'realtor' | 'seller' | 'imported';
  videos?: string[]; // Server-owned video IDs; files are stored outside public/.
  neighbourhood?: NeighbourhoodDescription;
  assessmentImport?: AssessmentImport; // Seller-provided reference, not verified assessment data.
  listing?: {id:string;mls:string;url:string;brokerage:string;title:string;lot:string;tax:number|null;taxYear:number|null;observedAt:string;photoCredit:string;rooms:{level:string;name:string;size:string|null}[]};
  assessment?: {url:string;address:string;year:number;valuationDate:string;total:number;land:number;buildings:number;previousTotal:number|null;built:number|null;beds:number|null;baths:number|null;lot:string;firstFloor:number|null;secondFloor:number|null;finishedBasement:number|null;pid:string;sales:{date:string;price:number}[];salesCoverage:string;comparable:boolean};
  location?: {latitude:number;longitude:number;distanceMeters:number;precision:string;score:number};
  notes?: string[];
}
export interface Preferences {
  area: Area | ''; style: Style | ''; maxPrice: number; minBeds: number; discovery: number;
  strictBudget: boolean; learning: boolean;
}
export const defaults: Preferences = { area:'', style:'', maxPrice:0, minBeds:0, discovery:25, strictBudget:true, learning:true };
export const eventKinds = ['impression','open','photo','like','unlike','save','unsave','share','hide','unhide'] as const;
export type EventKind = typeof eventKinds[number];
export type HideReason = 'price' | 'location' | 'style' | 'size' | 'other';
export interface EngagementEvent {
  id: string; propertyId: string; visitorId: string; sessionId: string; kind: EventKind;
  at: number; reason?: HideReason; photoIndex?: number; provenance: 'local';
}
export interface MapSearchArea {latitude:number;longitude:number;radiusKm:number;includeOutside:boolean}
export interface BuyerState { searchArea?:MapSearchArea|null; analyticsEnabled?:boolean; version:1; preferencesVersion?:2; visitorId:string; preferences:Preferences; events:EngagementEvent[] }
export interface PropertyRepository { list(): Promise<Property[]>; get(id:string): Promise<Property | undefined> }
export interface BuyerRepository { load(): BuyerState; save(state:BuyerState): boolean }
// Seller, conversation and showing contracts live in marketplace-domain.ts.
// Transactions remain a future module.
export type AccountMode = 'buyer' | 'seller';
export interface Transaction { id:string; propertyId:string; buyerId:string; sellerId:string; status:'offer'|'conditions'|'closing'|'completed' }
