import {identity} from '@/lib/server/identity';
import {marketStore} from '@/lib/server/market-store';
import {MarketError} from '@/lib/marketplace-domain';
import type {AnalyticsRange} from '@/lib/listing-analytics';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{
 const actor=await identity(request),{id}=await context.params,range=(new URL(request.url).searchParams.get('range')||'7') as AnalyticsRange;
 return Response.json(marketStore().analytics.dashboard(id,actor,range),{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return Response.json({error:e instanceof MarketError?e.message:'Could not load listing performance.'},{status:e instanceof MarketError?e.status:500,headers:{'Cache-Control':'private, no-store'}});}}
