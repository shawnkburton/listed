'use client';
import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react';
import {useAccount} from './Account';
import type {MarketSnapshot} from '@/lib/marketplace-domain';
type Result=MarketSnapshot&{id?:string};
const MarketContext=createContext<{data:MarketSnapshot;error:string;loading:boolean;reload:()=>Promise<void>;act:(command:unknown)=>Promise<Result>}>({data:{listings:[],threads:[]},error:'',loading:true,reload:async()=>{},act:async()=>{throw Error('Not ready.');}});
export function MarketProvider({children}:{children:React.ReactNode}){
 const {user}=useAccount();const [data,setData]=useState<MarketSnapshot>({listings:[],threads:[]}),[error,setError]=useState(''),[loading,setLoading]=useState(true);const generation=useRef(0),alive=useRef(true);
 useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;};},[]);
 const request=useCallback(async(command?:unknown):Promise<Result>=>{const headers:Record<string,string>={};if(user)headers.Authorization=`Bearer ${await user.getIdToken()}`;if(command)headers['Content-Type']='application/json';const response=await fetch('/api/marketplace',{method:command?'POST':'GET',headers,body:command?JSON.stringify(command):undefined,cache:'no-store',signal:AbortSignal.timeout(20000)});const result=await response.json();if(!response.ok)throw Error(result.error||'Please try again.');return result;},[user,user?.displayName]);
 const reload=useCallback(async()=>{const version=++generation.current;try{const result=await request();if(alive.current&&version===generation.current){setData(result);setError('');}}catch(e){if(alive.current&&version===generation.current)setError(e instanceof Error?e.message:'Could not load your workspace.');}finally{if(alive.current)setLoading(false);}},[request]);
 useEffect(()=>{void reload();const timer=setInterval(()=>{if(document.visibilityState==='visible')void reload();},15000);const focus=()=>{if(document.visibilityState==='visible')void reload();};document.addEventListener('visibilitychange',focus);window.addEventListener('focus',focus);return()=>{clearInterval(timer);window.removeEventListener('focus',focus);document.removeEventListener('visibilitychange',focus);};},[reload]);
 const act=useCallback(async(command:unknown)=>{generation.current++;const result=await request(command);generation.current++;if(alive.current){setData(result);setError('');}return result;},[request]);
 return <MarketContext.Provider value={{data,error,loading,reload,act}}>{children}</MarketContext.Provider>;
}
export const useMarket=()=>useContext(MarketContext);
