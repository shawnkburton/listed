'use client';
import type {Dispatch,SetStateAction} from 'react';
import {ArrowLeft,MapPin} from 'lucide-react';
import type {MapSearchArea,Preferences,Property} from '@/lib/domain';
import type {Recommendation} from '@/lib/recommendations';
import {mapDistance,radiusFeed,radiusOptions} from '@/lib/radius-search';
import {searchOrigin} from '@/lib/geography';
import PropertyMap from './PropertyMap';
export default function MapSearch({area,draft,setDraft,homes,preferences,onApply,onRemove,onClose,onOpen}:{area:MapSearchArea|null;draft:MapSearchArea;setDraft:Dispatch<SetStateAction<MapSearchArea>>;homes:Recommendation[];preferences:Preferences;onApply:(area:MapSearchArea)=>void;onRemove:()=>void;onClose:()=>void;onOpen:(p:Property)=>void}){
 const preview=radiusFeed(homes,preferences,draft),local=preview.filter(r=>!r.outsideRadius),outside=preview.filter(r=>r.outsideRadius);
 const unknown=homes.filter(r=>mapDistance(r.property,draft)===null);
 return <div className="dialog-body map-dialog radius-search">
  <p>Choose where you want to look. The circle shapes your <strong>For you</strong> feed; panning or zooming alone won’t change your search.</p>
  <div className="radius-controls"><label>Search radius<select aria-label="Search radius" value={draft.radiusKm} onChange={e=>setDraft({...draft,radiusKm:Number(e.target.value)})}>{radiusOptions.map(km=><option key={km} value={km}>{km<1?`${km*1000} m`:`${km} km`}</option>)}</select></label><button className="text-button" onClick={()=>setDraft({...draft,latitude:searchOrigin.latitude,longitude:searchOrigin.longitude})}>Reset centre to Crescent Road</button></div>
  <PropertyMap homes={local.map(r=>r.property)} area={draft} onCentreChange={centre=>setDraft(current=>({...current,...centre}))} onOpen={onOpen}/>
  <label className="radius-discovery"><input type="checkbox" checked={draft.includeOutside} onChange={e=>setDraft({...draft,includeOutside:e.target.checked})}/><span>Include occasional matches outside my radius<small>Up to one after every four homes inside the circle. Outside suggestions must match your budget, bedrooms, neighbourhood and style preferences.</small></span></label>
  <p className="radius-preview" role="status"><strong>{local.length} {local.length===1?'home':'homes'} inside the circle</strong>{outside.length>0?` + ${outside.length} outside-area ${outside.length===1?'suggestion':'suggestions'}`:'. No outside-area suggestions in this preview.'}</p>
  {!local.length&&<p className="map-empty"><MapPin size={20}/> No matching homes in this circle. Move the centre, increase the radius or adjust your feed preferences. We won’t fill your feed with distant homes.</p>}
  {unknown.length>0&&<details className="unmapped-homes"><summary>{unknown.length} {unknown.length===1?'home without a map location':'homes without map locations'}</summary><p>These homes can’t be placed inside or outside your radius yet. They remain available in Seller-listed homes and your saved collections.</p>{unknown.map(r=><button key={r.property.id} className="text-button" onClick={()=>onOpen(r.property)}>{r.property.address}</button>)}</details>}
  <div className="radius-actions"><button className="primary" onClick={()=>onApply(draft)}>Show these homes</button>{area&&<button className="text-button" onClick={onRemove}>Remove radius filter</button>}<button className="text-button" onClick={onClose}><ArrowLeft size={14}/> Cancel</button></div>
 </div>;
}
