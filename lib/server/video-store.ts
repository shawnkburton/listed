import {createReadStream} from 'node:fs';
import {mkdir,open,readFile,readdir,rename,rm,stat,writeFile} from 'node:fs/promises';
import {dirname,join,resolve} from 'node:path';
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {Readable} from 'node:stream';
import {MarketError} from '../marketplace-domain';
import {MAX_VIDEO_BYTES,validVideoId,videoFileError} from '../listing-videos';
interface VideoMeta{id:string;ownerId:string;name:string;mime:string;bytes:number;key:string}
const active=new Set<string>();
export function videoDirectory(){return resolve(process.env.LISTED_VIDEO_DIRECTORY||join(dirname(process.env.LISTED_DATABASE_PATH||'.data/marketplace.sqlite'),'videos'));}
function sniff(bytes:Buffer){
 if(bytes.toString('ascii',4,8)==='ftyp'){
  const brand=bytes.toString('ascii',8,12);if(brand==='qt  ')return 'video/quicktime';
  if(/^(isom|iso[2-9]|mp4[12]|avc1|M4V |MSNV|dash)/.test(brand))return 'video/mp4';
 }
 if(bytes.subarray(0,4).equals(Buffer.from([0x1a,0x45,0xdf,0xa3]))&&bytes.subarray(0,4096).includes(Buffer.from('webm')))return 'video/webm';
 throw new MarketError('This file is not a supported MP4, MOV or WebM video. Export it as an MP4 video and try again.',415);
}
export async function videoMeta(id:unknown,dir=videoDirectory()):Promise<VideoMeta|undefined>{
 if(!validVideoId(id))return;
 try{return JSON.parse(await readFile(join(dir,`${id}.json`),'utf8'));}catch{return;}
}
export async function uploadVideo(request:Request,ownerId:string,dir=videoDirectory()){
 let name='';try{name=decodeURIComponent(request.headers.get('x-video-name')||'');}catch{throw new MarketError('Invalid video filename.');}
 const declared=Number(request.headers.get('content-length')||0);
 const invalid=videoFileError({name,size:declared||1});if(invalid)throw new MarketError(invalid,413);
 if(active.has(ownerId))throw new MarketError('Please wait for your other video upload to finish.',429);
 active.add(ownerId);const id=randomBytes(16).toString('hex'),temp=join(dir,`${id}.part`),file=join(dir,id);let bytes=0;
 try{
  await mkdir(dir,{recursive:true,mode:0o700});
  const all=await Promise.all((await readdir(dir)).filter(n=>n.endsWith('.json')).map(n=>videoMeta(n.slice(0,-5),dir)));
  const owned=all.filter(m=>m?.ownerId===ownerId);if(owned.reduce((sum,m)=>sum+(m?.bytes||0),0)+MAX_VIDEO_BYTES>1024*1024*1024||owned.length>=50)throw new MarketError('Your local video storage is full. Contact the preview administrator to free space.',413);
  const reader=request.body?.getReader();if(!reader)throw new MarketError('Choose a video to upload.');
  const handle=await open(temp,'wx',0o600);let prefix=Buffer.alloc(0);
  try{
   while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.length;if(bytes>MAX_VIDEO_BYTES){await reader.cancel();throw new MarketError('Choose a video up to 100 MB.',413);}if(prefix.length<4096)prefix=Buffer.concat([prefix,Buffer.from(value).subarray(0,4096-prefix.length)]);await handle.writeFile(value);}
  }finally{await handle.close();}
  if(!bytes)throw new MarketError('The video is empty.');const mime=sniff(prefix);
  const meta:VideoMeta={id,ownerId,name:name.slice(0,160),bytes,mime,key:randomBytes(32).toString('hex')};
  await rename(temp,file);await writeFile(join(dir,`${id}.json`),JSON.stringify(meta),{mode:0o600,flag:'wx'});
  return {id};
 }catch(e){await rm(temp,{force:true});await rm(file,{force:true});throw e;}finally{active.delete(ownerId);}
}
export async function verifyVideoOwnership(ids:unknown,ownerId:string,dir=videoDirectory()){
 if(ids===undefined)return;if(!Array.isArray(ids))throw new MarketError('Invalid videos.');
 for(const id of ids){const meta=await videoMeta(id,dir);if(!meta||meta.ownerId!==ownerId)throw new MarketError('A video is unavailable or belongs to another seller.',403);}
}
function signature(meta:VideoMeta,expires:string){return createHmac('sha256',meta.key).update(`${meta.id}:${expires}`).digest('hex');}
export function previewToken(meta:VideoMeta,now=Date.now()){const expires=String(now+3600000);return `${expires}.${signature(meta,expires)}`;}
export function validPreview(meta:VideoMeta,token:string|null,now=Date.now()){
 if(!token)return false;const [expires,sig]=token.split('.');if(!/^\d{13}$/.test(expires)||Number(expires)<now||Number(expires)>now+3600000||!sig||!/^[a-f0-9]{64}$/.test(sig))return false;
 return timingSafeEqual(Buffer.from(sig,'hex'),Buffer.from(signature(meta,expires),'hex'));
}
export function videoRange(range:string|null,size:number):{start:number;end:number}|undefined{
 if(!range)return;const m=/^bytes=(\d*)-(\d*)$/.exec(range);if(!m||(!m[1]&&!m[2]))throw new MarketError('Invalid video range.',416);
 const start=m[1]?Number(m[1]):Math.max(0,size-Number(m[2])),end=m[1]?(m[2]?Math.min(Number(m[2]),size-1):size-1):size-1;
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||start>=size||end<start)throw new MarketError('Invalid video range.',416);return {start,end};
}
export async function videoResponse(meta:VideoMeta,request:Request,dir=videoDirectory()){
 const file=join(dir,meta.id);const info=await stat(file);if(info.size!==meta.bytes)throw new MarketError('Video unavailable.',404);
 let range;try{range=videoRange(request.headers.get('range'),info.size);}catch{return new Response(null,{status:416,headers:{'Content-Range':`bytes */${info.size}`,'Cache-Control':'no-store'}});}
 const start=range?.start??0,end=range?.end??info.size-1;
 const body=Readable.toWeb(createReadStream(file,{start,end})) as ReadableStream<Uint8Array>;
 return new Response(body,{status:range?206:200,headers:{'Content-Type':meta.mime,'Content-Length':String(end-start+1),'Accept-Ranges':'bytes',...(range?{'Content-Range':`bytes ${start}-${end}/${info.size}`} : {}),'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'}});
}
