'use client';
import {clientId} from '@/lib/client-id';
import {useCallback,useRef,type RefObject} from 'react';
import type {BuyerState} from '@/lib/domain';
import type {SellerListing} from '@/lib/marketplace-domain';
import type {AnalyticsKind} from '@/lib/listing-analytics';
type Extras={photoIndex?:number;reason?:string;videoId?:string;shareToken?:string};
export function useListingAnalytics(user:{uid:string;getIdToken:()=>Promise<string>}|null,listings:SellerListing[],state:RefObject<BuyerState|null>,session:RefObject<string>){
 const latest=useRef({user,listings});latest.current={user,listings};
 const queue=useRef<Promise<unknown>>(Promise.resolve());
 const request=useCallback((body:object)=>{
  // Serialize requests so the first guest cookie and like/unlike order are preserved.
  const account=latest.current.user;
  const next=queue.current.catch(()=>{}).then(async()=>{
   if(state.current?.analyticsEnabled===false)throw Error('Reporting disabled.');
   const response=await fetch('/api/analytics',{method:'POST',headers:{'Content-Type':'application/json',...(account?{Authorization:`Bearer ${await account.getIdToken()}`}:{})},body:JSON.stringify(body),signal:AbortSignal.timeout(10000),credentials:'same-origin'});
   const value=await response.json();if(!response.ok)throw Error(value.error||'Reporting unavailable.');return value;
  });queue.current=next.catch(()=>{});return next;
 },[state]);
 const send=useCallback((listingId:string,kind:AnalyticsKind,extras:Extras={})=>{
  const listing=latest.current.listings.find(l=>l.id===listingId&&l.status==='published');
  if(!listing||listing.sellerId===latest.current.user?.uid||!state.current||state.current.analyticsEnabled===false||!session.current)return;
  void request({listingId,kind,eventId:clientId(),session:session.current,version:listing.version,...extras}).catch(()=>{/* Analytics must never prevent browsing. */});
 },[request,session,state]);
 const createShare=useCallback(async(listingId:string)=>{
  if(state.current?.analyticsEnabled===false||!latest.current.listings.some(l=>l.id===listingId&&l.status==='published'))return '';
  const value=await request({action:'shareLink',listingId});return typeof value.token==='string'?value.token:'';
 },[request,state]);
 return {send,createShare};
}
