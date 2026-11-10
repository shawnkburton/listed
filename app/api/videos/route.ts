import {requireSameOrigin} from '@/lib/server/request-origin';
import {identity} from '@/lib/server/identity';
import {uploadVideo} from '@/lib/server/video-store';
import {MarketError} from '@/lib/marketplace-domain';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){try{
 requireSameOrigin(request);
 const actor=await identity(request);return Response.json(await uploadVideo(request,actor.uid),{headers:{'Cache-Control':'no-store'}});
}catch(e){return Response.json({error:e instanceof MarketError?e.message:'The video could not be uploaded. Please try again.'},{status:e instanceof MarketError?e.status:500});}}
