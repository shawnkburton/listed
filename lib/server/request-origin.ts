import {MarketError} from '../marketplace-domain';

// Next's request URL can contain its internal bind address (0.0.0.0).
// Host is the browser-facing authority. Never trust arbitrary forwarded hosts.
export function requireSameOrigin(request:Request){
 const origin=request.headers.get('origin');
 if(request.headers.get('sec-fetch-site')==='cross-site')throw new MarketError('Please use the Listed app to make changes.',403);
 if(!origin)return; // Native clients still require a verified bearer token.
 const url=new URL(request.url),host=request.headers.get('host');
 let expected=url.origin;
 if(host){
  if(!/^[a-z\d.\-[\]:]+$/i.test(host))throw new MarketError('Invalid request address.',403);
  try{expected=new URL(`${url.protocol}//${host}`).origin;}catch{throw new MarketError('Invalid request address.',403);}
 }
 // Set explicitly when a trusted HTTPS reverse proxy uses an internal HTTP URL.
 const publicOrigin=process.env.LISTED_PUBLIC_ORIGIN;
 if(origin!==expected&&(!publicOrigin||origin!==new URL(publicOrigin).origin))throw new MarketError('Please use the Listed app to make changes.',403);
}
