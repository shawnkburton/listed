import {requireSameOrigin} from '@/lib/server/request-origin';
import {identity} from '@/lib/server/identity';
import {marketStore} from '@/lib/server/market-store';
import {videoMeta,previewToken,validPreview,videoResponse} from '@/lib/server/video-store';
import {MarketError} from '@/lib/marketplace-domain';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
const failure=(e:unknown)=>Response.json({error:e instanceof MarketError?e.message:'Video unavailable.'},{status:e instanceof MarketError?e.status:500,headers:{'Cache-Control':'no-store'}});
export async function POST(request:Request,context:Context){try{
 requireSameOrigin(request);
 const actor=await identity(request),{id}=await context.params,meta=await videoMeta(id);
 if(!meta||meta.ownerId!==actor.uid)throw new MarketError('Video unavailable.',404);
 return Response.json({url:`/api/videos/${id}?preview=${previewToken(meta)}`},{headers:{'Cache-Control':'private, no-store'}});
}catch(e){return failure(e);}}
export async function GET(request:Request,context:Context){try{
 const {id}=await context.params,meta=await videoMeta(id);if(!meta)throw new MarketError('Video unavailable.',404);
 const published=marketStore().get().listings.some(l=>l.property.videos?.includes(id));
 if(!published&&!validPreview(meta,new URL(request.url).searchParams.get('preview')))throw new MarketError('Video unavailable.',404);
 return await videoResponse(meta,request);
}catch(e){return failure(e);}}
