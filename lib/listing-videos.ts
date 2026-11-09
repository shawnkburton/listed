export const MAX_VIDEO_BYTES=100*1024*1024;
export const MAX_LISTING_VIDEOS=3;
export const VIDEO_ACCEPT='video/mp4,video/quicktime,video/webm,.mp4,.m4v,.mov,.webm';
export const validVideoId=(id:unknown):id is string=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
export function videoFileError(file:{name:string;size:number}){
 if(!/\.(mp4|m4v|mov|webm)$/i.test(file.name))return 'Choose an MP4, MOV or WebM video.';
 if(!file.size)return 'This file is empty. Download it from iCloud first, then try again.';
 if(file.size>MAX_VIDEO_BYTES)return 'Choose a video up to 100 MB.';
}
