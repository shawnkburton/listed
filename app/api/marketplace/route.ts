import {requireSameOrigin} from '@/lib/server/request-origin';
import {MAX_LISTING_REQUEST_BYTES} from '@/lib/listing-limits';
import {verifyVideoOwnership} from '@/lib/server/video-store';
import {marketStore} from '@/lib/server/market-store';
import {identity} from '@/lib/server/identity';
import {MarketError} from '@/lib/marketplace-domain';
export const runtime='nodejs';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'}});
function error(e:unknown){return reply({error:e instanceof MarketError?e.message:'We could not save or load your changes. Please try again.'},e instanceof MarketError?e.status:500);}
export async function GET(request:Request){try{const actor=request.headers.has('authorization')?await identity(request):undefined;if(actor)marketStore().syncActor(actor);return reply(marketStore().get(actor?.uid));}catch(e){return error(e);}}
export async function POST(request:Request){try{
 requireSameOrigin(request);
 if(!request.headers.get('content-type')?.includes('application/json'))throw new MarketError('Expected JSON.',415);
 const actor=await identity(request);
 const reader=request.body?.getReader();if(!reader)throw new MarketError('A request is required.');let size=0;const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>MAX_LISTING_REQUEST_BYTES){await reader.cancel();throw new MarketError('Listing photos are too large.',413);}chunks.push(value);}
 let command:unknown;try{command=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw new MarketError('Invalid request.');}
 if(command&&typeof command==='object'&&(command as {action?:string}).action==='saveListing')await verifyVideoOwnership((command as {property?:{videos?:unknown}}).property?.videos,actor.uid);
 return reply(marketStore().command(actor,command));
 }catch(e){return error(e);}}
