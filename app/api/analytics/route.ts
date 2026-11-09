import {requireSameOrigin} from '@/lib/server/request-origin';
import {identity} from '@/lib/server/identity';
import {marketStore} from '@/lib/server/market-store';
import {MarketError} from '@/lib/marketplace-domain';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 requireSameOrigin(request);
 if(!request.headers.get('content-type')?.includes('application/json'))throw new MarketError('Expected JSON.',415);
 if(/bot|crawler|spider|headless|preview|lighthouse/i.test(request.headers.get('user-agent')||''))return Response.json({recorded:false});
 const reader=request.body?.getReader();if(!reader)throw new MarketError('Missing event.');let size=0;const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>4096){await reader.cancel();throw new MarketError('Event too large.',413);}chunks.push(value);}
 let input;try{input=JSON.parse(Buffer.concat(chunks).toString());}catch{throw new MarketError('Invalid event.');}
 const actor=request.headers.has('authorization')?await identity(request):undefined;
 const analytics=marketStore().analytics;const cookies=request.headers.get('cookie')||'';
 const value=cookies.split(';').map(v=>v.trim()).find(v=>v.startsWith(analytics.cookieName+'='))?.slice(analytics.cookieName.length+1);
 const guest=analytics.guest(value);const result=input?.action==='shareLink'?analytics.share(input.listingId,actor,guest.key):analytics.ingest(input,actor,guest.key);
 return Response.json(result,{headers:{'Cache-Control':'private, no-store',...(guest.cookie?{'Set-Cookie':`${analytics.cookieName}=${guest.cookie}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000${new URL(request.url).protocol==='https:'?'; Secure':''}`}:{})}});
}catch(e){return Response.json({error:e instanceof MarketError?e.message:'Activity could not be recorded.'},{status:e instanceof MarketError?e.status:500,headers:{'Cache-Control':'no-store'}});}}
