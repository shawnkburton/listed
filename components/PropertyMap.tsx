'use client';
import {useEffect,useRef,useState} from 'react';
import type {MapSearchArea,Property} from '@/lib/domain';
import {searchOrigin} from '@/lib/geography';
import 'leaflet/dist/leaflet.css';

export default function PropertyMap({homes,onOpen,area,onCentreChange}:{homes:Property[];onOpen:(p:Property)=>void;area?:MapSearchArea;onCentreChange?:(centre:{latitude:number;longitude:number})=>void}){
 const container=useRef<HTMLDivElement>(null),open=useRef(onOpen);open.current=onOpen;
 const mapRef=useRef<import('leaflet').Map|null>(null),centreChange=useRef(onCentreChange);centreChange.current=onCentreChange;
 const chooseCentre=(lat:number,lng:number)=>centreChange.current?.({latitude:Math.max(-85,Math.min(85,lat)),longitude:((lng+180)%360+360)%360-180});
 const [failed,setFailed]=useState(false);
 // The map changes only when the visible inventory changes, not on every local impression.
 const latest=useRef(homes);latest.current=homes;const ids=homes.map(p=>`${p.id}:${p.location?.latitude}:${p.location?.longitude}:${p.price}`).join(',');
 useEffect(()=>{
  let cancelled=false,map:import('leaflet').Map|undefined,resize:ResizeObserver|undefined;
  setFailed(false);
  import('leaflet').then(L=>{
   if(cancelled||!container.current)return;
   map=L.map(container.current,{scrollWheelZoom:false}).setView([area?.latitude??searchOrigin.latitude,area?.longitude??searchOrigin.longitude],14);mapRef.current=map;
   resize=new ResizeObserver(()=>map?.invalidateSize());resize.observe(container.current);
   const tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'}).addTo(map);
   tiles.on('tileerror',()=>{if(!cancelled)setFailed(true);});
   const origin:[number,number]=[area?.latitude??searchOrigin.latitude,area?.longitude??searchOrigin.longitude];
   const centre=L.marker(origin,{draggable:!!area,icon:L.divIcon({className:'origin-marker',html:'<span>★</span>',iconSize:[28,28]}),title:area?'Drag search centre':searchOrigin.address}).addTo(map).bindTooltip(area?'Search centre — drag to move':searchOrigin.address);
   const circle=area?L.circle(origin,{radius:area.radiusKm*1000,color:'#426c28',weight:2,fillColor:'#b9e878',fillOpacity:.15,interactive:false}).addTo(map):undefined;
   if(area){centre.on('dragend',()=>{const p=centre.getLatLng();chooseCentre(p.lat,p.lng);});map.on('click',e=>chooseCentre(e.latlng.lat,e.latlng.lng));}
   const bounds=L.latLngBounds([origin]);
   latest.current.forEach((p,index)=>{
    if(!p.location)return;const position:[number,number]=[p.location.latitude,p.location.longitude];bounds.extend(position);
    const label=document.createElement('span');label.textContent=`${p.address} · ${p.price>0?`$${(p.price/1000000).toFixed(2)}M`:'Price not set'}`;
    L.marker(position,{icon:L.divIcon({className:'home-map-marker',html:`<span>${index+1}</span>`,iconSize:[27,27]}),title:`Open ${p.address}`,keyboard:true}).addTo(map!).bindTooltip(label).on('click',()=>open.current(p));
   });
   map.fitBounds((circle?.getBounds()||bounds).pad(.15),{maxZoom:16});L.control.scale({imperial:false}).addTo(map);
  }).catch(()=>{if(!cancelled)setFailed(true);});
  return()=>{cancelled=true;resize?.disconnect();map?.remove();mapRef.current=null;};
 },[ids,area?.latitude,area?.longitude,area?.radiusKm]);
 return <section className="map-panel" aria-label="Nearby property map"><div className="map-caption"><strong>{area?`${area.radiusKm} km search radius`:'Explore the neighbourhood'}</strong>{area?<button className="text-button" onClick={()=>{const p=mapRef.current?.getCenter();if(p)chooseCentre(p.lat,p.lng);}}>Use map centre</button>:<span>★ {searchOrigin.address}</span>}</div><div ref={container} className="property-map" aria-label="Interactive map of nearby houses"/>{failed&&<p role="status" className="map-warning">The base map could not load. You can still explore homes in the feed. Check your connection and reopen the map to try again.</p>}<p className="map-footnote">{area?'Drag the star or tap an empty spot to move your search centre. You can also pan, then choose Use map centre. Tap a numbered pin to explore a home. The circle uses straight-line distance.':'Select a marker to open a home. Distances are straight-line estimates from BC Address Geocoder locations, not walking routes.'}</p></section>;
}
