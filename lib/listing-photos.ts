import {MAX_LISTING_PHOTOS} from './listing-limits';
// Files are decoded and resized on this device; no external conversion service receives them.
export const MAX_PHOTO_INPUT_BYTES=20*1024*1024;
export const MAX_PHOTO_OUTPUT_BYTES=500000;
export const PHOTO_ACCEPT='.jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif';
export function validatePhotoFile(file:Pick<File,'name'|'size'|'type'>){
 if(!file.size)throw Error('This file is empty. If it is stored in iCloud, download it first and try again.');
 if(file.size>MAX_PHOTO_INPUT_BYTES)throw Error('Choose a photo under 20 MB.');
 if(!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)&&!/^image\/(jpeg|png|webp|hei[cf])$/i.test(file.type))throw Error('Choose a JPG, PNG, WebP, HEIC or HEIF photo.');
}
function readImage(blob:Blob):Promise<HTMLImageElement>{
 return new Promise((resolve,reject)=>{const url=URL.createObjectURL(blob),img=new Image();const finish=()=>{clearTimeout(timer);URL.revokeObjectURL(url);img.onload=null;img.onerror=null;};const timer=setTimeout(()=>{finish();reject(Error('The photo took too long to open. Try downloading it from iCloud first.'));},20000);
 img.onload=()=>{finish();resolve(img);};img.onerror=()=>{finish();reject(Error('This photo could not be opened. Try exporting it as JPEG from Photos or Preview.'));};img.src=url;});
}
function toBlob(canvas:HTMLCanvasElement,quality:number){return new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not prepare this photo. Please try again.')),'image/jpeg',quality));}
function dataURL(blob:Blob){return new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result));reader.onerror=()=>reject(Error('Could not read this photo. Please try again.'));reader.onabort=()=>reject(Error('Photo preparation was cancelled.'));reader.readAsDataURL(blob);});}
export async function prepareListingPhoto(file:File):Promise<string>{
 validatePhotoFile(file);
 const header=new TextDecoder('latin1').decode(await file.slice(0,64).arrayBuffer());
 const heic=/\.(heic|heif)$/i.test(file.name)||/^image\/hei[cf]/i.test(file.type)||(header.includes('ftyp')&&/(heic|heix|hevc|hevx|mif1|msf1)/.test(header));
 let img:HTMLImageElement;
 try{img=await readImage(file);}catch(e){
  if(!heic)throw e;
  try{const {heicTo}=await import('heic-to/csp');const converted=await heicTo({blob:file,type:'image/jpeg',quality:.9});img=await readImage(converted);}catch{throw Error('This HEIC photo could not be converted. In Photos or Preview, export it as JPEG and try again.');}
 }
 if(!img.naturalWidth||!img.naturalHeight)throw Error('This photo has no readable image.');
 const canvas=document.createElement('canvas'),context=canvas.getContext('2d');if(!context)throw Error('Your browser could not prepare the photo. Please try again.');
 let edge=Math.max(320,Math.min(2000,Math.max(img.naturalWidth,img.naturalHeight)));
 // Re-encoding also removes embedded EXIF/location metadata from uploaded photographs.
 while(edge>=320){const scale=Math.min(1,edge/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(img,0,0,canvas.width,canvas.height);
  for(const quality of [.88,.76,.64,.5]){const blob=await toBlob(canvas,quality);if(blob.size<=MAX_PHOTO_OUTPUT_BYTES)return dataURL(blob);}
  edge=Math.floor(edge*.75);
 }
 throw Error('This photo could not be reduced enough. Export a smaller JPEG and try again.');
}
// Process sequentially to avoid decoding several large phone photos at once.
export async function preparePhotoBatch(files:File[],slots:number,progress:(index:number,total:number)=>void,prepare=prepareListingPhoto){
 const photos:string[]=[],errors:string[]=[];
 for(let i=0;i<files.length;i++){
  if(photos.length>=slots){errors.push(`${files[i].name}: your listing has reached the ${MAX_LISTING_PHOTOS}-photo limit.`);continue;}
  progress(i+1,files.length);
  try{photos.push(await prepare(files[i]));}catch(e){errors.push(`${files[i].name}: ${e instanceof Error?e.message:'Could not add this photo.'}`);}
 }
 return {photos,errors};
}
