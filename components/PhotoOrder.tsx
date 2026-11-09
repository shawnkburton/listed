'use client';
import {useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,X} from 'lucide-react';

export default function PhotoOrder({photos,onChange}:{photos:string[];onChange:(photos:string[])=>void}){
 const [message,setMessage]=useState('');const tiles=useRef<(HTMLDivElement|null)[]>([]);
 function move(from:number,to:number){
  if(from===to||to<0||to>=photos.length)return;
  const next=[...photos];const [photo]=next.splice(from,1);next.splice(to,0,photo);onChange(next);
  setMessage(`Photo ${from+1} moved to position ${to+1}.${to===0?' This is now the cover photo.':''} Save your listing to keep the new order.`);
  requestAnimationFrame(()=>tiles.current[to]?.focus());
 }
 return <>
  {photos.length>0&&<p className="subtle">Use the arrows to reorder photos, or choose Make cover. The first photo is the cover shown in the feed. Save your draft or update your published listing to keep changes.</p>}
  <div className="photo-order" role="group" aria-label="Listing photo order">{photos.map((photo,i)=><div className="photo-order-tile" key={i} ref={el=>{tiles.current[i]=el;}} tabIndex={-1} aria-label={`Photo ${i+1}${i===0?', cover photo':''}`}>
   <div className="photo-order-image"><img src={photo} alt={`Property photo ${i+1}`}/><span className="photo-order-position">{i===0?'1 · Cover':i+1}</span><button className="photo-order-remove" type="button" aria-label={`Remove photo ${i+1}`} onClick={()=>{onChange(photos.filter((_,n)=>n!==i));setMessage(`Photo ${i+1} removed.${i===0&&photos.length>1?' The next photo is now the cover.':''} Save your listing to keep changes.`);}}><X size={16}/></button></div>
   <div className="photo-order-actions"><button type="button" disabled={i===0} aria-label={`Move photo ${i+1} earlier`} onClick={()=>move(i,i-1)}><ArrowLeft size={16}/> Earlier</button><button type="button" disabled={i===photos.length-1} aria-label={`Move photo ${i+1} later`} onClick={()=>move(i,i+1)}>Later <ArrowRight size={16}/></button></div>
   <button type="button" className="photo-order-cover" disabled={i===0} aria-label={i===0?'Photo 1 is the cover':`Make photo ${i+1} the cover`} onClick={()=>move(i,0)}>{i===0?'Cover photo':'Make cover'}</button>
  </div>)}</div>
  <p className="photo-order-status subtle" role="status" aria-live="polite">{message}</p>
 </>;
}
