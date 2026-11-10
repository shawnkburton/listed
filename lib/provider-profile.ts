export interface BasicProfile {displayName?:string;photoURL?:string;givenName?:string;surname?:string;providerEmail?:string}
const name=(value:unknown)=>typeof value==='string'&&value.trim()?value.trim().slice(0,80):undefined;
export function profilePhoto(value:unknown){
 if(typeof value!=='string'||value.length>200000)return;
 if(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/.test(value))return value;
 try{const url=new URL(value);if(url.protocol==='https:'&&!url.username&&!url.password)return url.href;}catch{}
}
export function basicProviderProfile(value:unknown):BasicProfile{
 if(!value||typeof value!=='object')return {};
 const p=value as Record<string,any>;
 const displayName=name(p.displayName)||name(p.name)||name([p.name?.firstName,p.name?.lastName].filter(v=>typeof v==='string').join(' '));
 const photoURL=profilePhoto(p.picture?.data?.url??p.picture??p.photoURL);
 const givenName=name(p.givenName??p.given_name??p.first_name),surname=name(p.surname??p.family_name??p.last_name);
 const providerEmail=typeof p.mail==='string'?p.mail:typeof p.userPrincipalName==='string'?p.userPrincipalName:typeof p.providerEmail==='string'?p.providerEmail:undefined;
 return {...(displayName?{displayName}:{}),...(photoURL?{photoURL}:{}),...(givenName?{givenName}:{}),...(surname?{surname}:{}),...(providerEmail?{providerEmail:providerEmail.slice(0,254)}:{})};
}
export class ProfileLookupError extends Error {}
export async function microsoftGraphProfile(accessToken:string|undefined,fetcher:typeof fetch=fetch):Promise<BasicProfile>{
 if(!accessToken)throw new ProfileLookupError('Microsoft did not provide access to your profile. Please refresh your profile again.');
 const options={headers:{Authorization:`Bearer ${accessToken}`},cache:'no-store' as const,credentials:'omit' as const,redirect:'error' as const};
 let response:Response;
 try{response=await fetcher('https://graph.microsoft.com/v1.0/me?$select=displayName,givenName,surname,mail,userPrincipalName',{...options,signal:AbortSignal.timeout(10000)});}catch{throw new ProfileLookupError('We could not check your current Microsoft profile. Your existing Listed profile has been kept.');}
 if(!response.ok)throw new ProfileLookupError(response.status===403?'Microsoft did not allow profile access. Refresh again and allow access to your own basic profile.':'Microsoft profile lookup failed. Please try refreshing again.');
 const profile=basicProviderProfile(await response.json());
 if(!profile.displayName)throw new ProfileLookupError('Microsoft returned no display name. Your existing Listed name has been kept.');
 // A missing or unavailable photo never blocks sign-in or a successful name refresh.
 try{
  const photo=await fetcher('https://graph.microsoft.com/v1.0/me/photos/96x96/$value',{...options,signal:AbortSignal.timeout(5000)});
  const type=photo.headers.get('content-type')?.split(';')[0];
  if(photo.ok&&type&&['image/jpeg','image/png','image/webp'].includes(type)&&Number(photo.headers.get('content-length')||0)<=100000){
   const bytes=new Uint8Array(await photo.arrayBuffer());if(bytes.length<=100000){let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);profile.photoURL=`data:${type};base64,${btoa(binary)}`;}
  }
 }catch{}
 return profile;
}

// Photo cache only: names and email always come from the current Firebase account.
// Never persist access tokens or raw provider responses.
const prefix='listed-profile-photo:v1:';
export function cacheProfilePhoto(uid:string,url:string|undefined){try{if(url)localStorage.setItem(prefix+encodeURIComponent(uid),url);else localStorage.removeItem(prefix+encodeURIComponent(uid));}catch{}}
export function cachedProfilePhoto(uid:string){try{return profilePhoto(localStorage.getItem(prefix+encodeURIComponent(uid)));}catch{return undefined;}}

export interface ProfileSyncReport {provider:string;at:number;profile:BasicProfile;status:'synced'|'error';message:string}
const reports=new Map<string,ProfileSyncReport>();
export function saveProfileReport(uid:string,report:ProfileSyncReport){reports.set(uid,report);try{sessionStorage.setItem('listed-profile-sync:v1:'+encodeURIComponent(uid),JSON.stringify(report));}catch{}}
export function profileReport(uid:string):ProfileSyncReport|undefined{
 if(reports.has(uid))return reports.get(uid);
 try{const value=JSON.parse(sessionStorage.getItem('listed-profile-sync:v1:'+encodeURIComponent(uid))||'null');if(value&&typeof value.provider==='string'&&typeof value.message==='string'&&Number.isFinite(value.at)&&['synced','error'].includes(value.status))return {...value,profile:basicProviderProfile(value.profile)};}catch{}
}
