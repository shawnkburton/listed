'use client';
import {useEffect,useRef,useState} from 'react';
import type {Property} from '@/lib/domain';
import {knownLocation,pinLocation} from '@/lib/listing-location';
import {searchOrigin} from '@/lib/geography';
import 'leaflet/dist/leaflet.css';

export default function ListingLocation({address,area,location,onChange,disabled=false}:{address:string;area:string;location:Property['location'];onChange:(location:Property['location'])=>void;disabled?:boolean}){
 const value=location||knownLocation(address,area);
 const [open,setOpen]=useState(false),[failed,setFailed]=useState(false),[error,setError]=useState('');
 const [latitude,setLatitude]=useState(''),[longitude,setLongitude]=useState('');
 const container=useRef<HTMLDivElement>(null),mapRef=useRef<import('leaflet').Map|null>(null);
 const change=useRef(onChange),locked=useRef(disabled);change.current=onChange;locked.current=disabled;
 useEffect(()=>{setLatitude(value?String(value.latitude):'');setLongitude(value?String(value.longitude):'');setError('');},[value?.latitude,value?.longitude,address,area]);
 useEffect(()=>{
  if(!open)return;
  let cancelled=false,map:import('leaflet').Map|undefined,resize:ResizeObserver|undefined;
  setFailed(false);
  import('leaflet').then(L=>{
   if(cancelled||!container.current)return;
   map=L.map(container.current,{scrollWheelZoom:false}).setView([value?.latitude??searchOrigin.latitude,value?.longitude??searchOrigin.longitude],value?17:13);mapRef.current=map;
   resize=new ResizeObserver(()=>map?.invalidateSize());resize.observe(container.current);
   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map).on('tileerror',()=>{if(!cancelled)setFailed(true);});
   const choose=(lat:number,lng:number)=>{if(locked.current)return;const pin=pinLocation({latitude:lat,longitude:((lng+180)%360+360)%360-180});if(pin)change.current(pin);};
   if(value){const marker=L.marker([value.latitude,value.longitude],{draggable:true,title:'Listing location — drag to move',icon:L.divIcon({className:'origin-marker',html:'<span>⌂</span>',iconSize:[28,28]})}).addTo(map);marker.on('dragend',()=>{const p=marker.getLatLng();choose(p.lat,p.lng);});}
   map.on('click',e=>choose(e.latlng.lat,e.latlng.lng));
  }).catch(()=>{if(!cancelled)setFailed(true);});
  return()=>{cancelled=true;resize?.disconnect();map?.remove();mapRef.current=null;};
 },[open,value?.latitude,value?.longitude]);
 function coordinates(){const pin=latitude.trim()&&longitude.trim()?pinLocation({latitude:Number(latitude),longitude:Number(longitude)}):undefined;if(!pin){setError('Enter valid latitude and longitude coordinates.');return;}setError('');onChange(pin);}
 return <section className="listing-location" aria-label="Listing map location"><h4>Map location</h4><p>{value?'This home has a map location. Check the pin before publishing.':'Add a pin so buyers can find this home on the map and in radius searches.'}</p>
 <button type="button" className="secondary" disabled={disabled} onClick={()=>setOpen(!open)}>{open?'Close location map':value?'Check or adjust map pin':'Place home on map'}</button>
 {open&&<><p className="subtle">Pan and zoom to your home, then tap its location. You can drag the pin or use the map centre. Changing the address or neighbourhood resets the pin.</p><div ref={container} className="property-map" aria-label="Choose the listing location"/>
 <button type="button" className="text-button" disabled={disabled} onClick={()=>{const p=mapRef.current?.getCenter();if(p)onChange(pinLocation({latitude:p.lat,longitude:p.wrap().lng}));}}>Place pin at map centre</button>
 {failed&&<p role="status">Map tiles could not load. You can enter coordinates below or try reopening the map.</p>}
 <details><summary>Enter coordinates</summary><div className="form-grid"><label>Latitude<input type="text" inputMode="decimal" value={latitude} onChange={e=>setLatitude(e.target.value)}/></label><label>Longitude<input type="text" inputMode="decimal" value={longitude} onChange={e=>setLongitude(e.target.value)}/></label></div><button type="button" className="secondary" disabled={disabled} onClick={coordinates}>Use coordinates</button>{error&&<p role="alert" className="account-error">{error}</p>}</details></>}
 {value&&<p className="subtle" role="status">Pin: {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)} · {value.precision==='SELLER_PIN'?'Seller placed':'Existing address reference'}. Save the listing to keep any adjustments.</p>}
 </section>;
}
