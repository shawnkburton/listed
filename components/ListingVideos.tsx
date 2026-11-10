'use client';
import {useEffect,useRef,useState} from 'react';
import {VideoCoverage} from '@/lib/video-coverage';
import {Upload,X} from 'lucide-react';
import {useAccount} from './Account';
import {MAX_LISTING_VIDEOS,VIDEO_ACCEPT,videoFileError} from '@/lib/listing-videos';

export function ListingVideo({id,privatePreview=false,onPlay,onComplete}:{id:string;privatePreview?:boolean;onPlay?:()=>void;onComplete?:()=>void}){
 const coverage=useRef(new VideoCoverage()),played=useRef(false),completed=useRef(false);
 useEffect(()=>{coverage.current=new VideoCoverage();played.current=false;completed.current=false;},[id]);
 const sample=(video:HTMLVideoElement)=>{if(privatePreview)return;const visible=document.visibilityState==='visible';if(visible&&!video.paused&&!played.current){played.current=true;onPlay?.();}coverage.current.sample(video.currentTime,performance.now(),!video.paused&&!video.seeking,visible,video.playbackRate);if(!completed.current&&coverage.current.fraction(video.duration)>=.9){completed.current=true;onComplete?.();}};
 const {user}=useAccount();const [url,setUrl]=useState(''),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{let cancelled=false;setError('');setUrl('');
  if(!privatePreview){setUrl(`/api/videos/${id}`);return;}
  void(async()=>{try{if(!user)throw Error('Sign in to preview your draft video.');const response=await fetch(`/api/videos/${id}`,{method:'POST',headers:{Authorization:`Bearer ${await user.getIdToken()}`},signal:AbortSignal.timeout(20000)});const data=await response.json();if(!response.ok)throw Error(data.error||'Video preview unavailable.');if(!cancelled)setUrl(data.url);}catch(e){if(!cancelled)setError(e instanceof Error?e.message:'Video preview unavailable.');}})();return()=>{cancelled=true;};
 },[id,privatePreview,user,retry]);
 return <div className="listing-video">{url&&<video key={url} src={url} controls playsInline preload="metadata" aria-label="Property video" onPlaying={e=>sample(e.currentTarget)} onTimeUpdate={e=>sample(e.currentTarget)} onSeeking={()=>coverage.current.resetPosition()} onPause={()=>coverage.current.resetPosition()} onError={()=>setError('This video could not be played. Retry, or export it as an MP4 with H.264 video and AAC audio for wider compatibility.')}/>} {!url&&!error&&<p role="status">Loading video preview…</p>}{error&&<p className="account-error" role="alert">{error} <button type="button" className="text-button" onClick={()=>setRetry(n=>n+1)}>Retry video</button></p>}</div>;
}
export default function VideoEditor({videos,onChange,onBusy}:{videos:string[];onChange:(ids:string[])=>void;onBusy:(busy:boolean)=>void}){
 const {user}=useAccount();const [busy,setBusy]=useState(false),[progress,setProgress]=useState(''),[errors,setErrors]=useState<string[]>([]);const xhr=useRef<XMLHttpRequest|null>(null),mounted=useRef(true),lock=useRef(false);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;xhr.current?.abort();};},[]);
 async function upload(files:File[]){
  if(!files.length||lock.current||!user)return;lock.current=true;setBusy(true);onBusy(true);setErrors([]);const added:string[]=[],failures:string[]=[];
  try{const token=await user.getIdToken();
   for(const [i,file] of files.entries()){
    if(!mounted.current)break;
    if(videos.length+added.length>=MAX_LISTING_VIDEOS){failures.push('You can attach up to three videos.');break;}
    const error=videoFileError(file);if(error){failures.push(`${file.name}: ${error}`);continue;}
    try{
     const result=await new Promise<{id:string}>((resolve,reject)=>{const request=new XMLHttpRequest();xhr.current=request;request.open('POST','/api/videos');request.setRequestHeader('Authorization',`Bearer ${token}`);request.setRequestHeader('X-Video-Name',encodeURIComponent(file.name));request.setRequestHeader('Content-Type',file.type||'application/octet-stream');request.timeout=180000;
      setProgress(`Uploading video ${i+1} of ${files.length}…`);
      request.upload.onprogress=e=>{if(mounted.current)setProgress(`Uploading video ${i+1} of ${files.length}${e.lengthComputable?`: ${Math.round(e.loaded/e.total*100)}%`:'…'}`);};
      request.onload=()=>{try{const data=JSON.parse(request.responseText);if(request.status>=200&&request.status<300)resolve(data);else reject(Error(data.error||'Upload failed.'));}catch{reject(Error('Upload failed. Please try again.'));}};
      request.onerror=()=>reject(Error('Upload interrupted. Check the connection and try again.'));request.ontimeout=()=>reject(Error('Upload timed out. Try a smaller file.'));request.onabort=()=>reject(Error('Upload cancelled.'));request.send(file);
     });added.push(result.id);
    }catch(e){failures.push(`${file.name}: ${e instanceof Error?e.message:'Upload failed.'}`);}
   }
   if(mounted.current){onChange([...videos,...added]);setErrors(failures);setProgress(added.length?`${added.length} video${added.length===1?'':'s'} attached. Save your listing to keep these attachments.`:'No videos were added.');}
  }catch(e){if(mounted.current)setErrors([e instanceof Error?e.message:'Please sign in again.']);}finally{lock.current=false;xhr.current=null;if(mounted.current){setBusy(false);onBusy(false);}}
 }
 return <section className="video-editor"><h4>Property videos</h4><p className="subtle">Add up to three MP4, MOV or WebM videos, up to 100 MB each. MP4 with H.264 video works across the most browsers. Videos are stored on this computer’s Listed server and become visible to visitors when you publish the listing.</p><label className="upload-label"><Upload size={16}/> Add videos<input type="file" aria-label="Add videos" accept={VIDEO_ACCEPT} multiple disabled={busy||videos.length>=MAX_LISTING_VIDEOS} onChange={e=>{const files=Array.from(e.currentTarget.files||[]);e.currentTarget.value='';void upload(files);}}/></label>{progress&&<p role="status" aria-live="polite">{progress}</p>}{errors.length>0&&<ul className="account-error" role="alert">{errors.map((e,i)=><li key={i}>{e}</li>)}</ul>}<div className="listing-videos">{videos.map((id,i)=><div key={id}><ListingVideo id={id} privatePreview/><button type="button" className="text-button" aria-label={`Remove video ${i+1}`} onClick={()=>onChange(videos.filter(v=>v!==id))}><X size={15}/> Remove video {i+1}</button></div>)}</div></section>;
}
