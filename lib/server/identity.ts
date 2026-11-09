import {MarketError,type Actor} from '../marketplace-domain';
// Firebase validates the credential; a UID supplied by the browser is never accepted.
// https://firebase.google.com/docs/reference/rest/auth#section-get-account-info
const endpoint='https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=AIzaSyBUJWhlfTUVOxXMxUOdscmHGAkTIiaSCA4';
export async function identity(request:Request,fetcher:typeof fetch=fetch):Promise<Actor>{
 const header=request.headers.get('authorization');if(!header?.startsWith('Bearer ')||header.length>10000)throw new MarketError('Please sign in to continue.',401);
 const token=header.slice(7);let claims:Record<string,unknown>;try{claims=JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));}catch{throw new MarketError('Please sign in again.',401);}
 if(claims.aud!=='dwell-d6c55'||claims.iss!=='https://securetoken.google.com/dwell-d6c55')throw new MarketError('Please use your Listed account.',401);
 let response:Response;try{response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:header.slice(7)}),cache:'no-store',signal:AbortSignal.timeout(10000)});}catch{throw new MarketError('Sign-in verification is unavailable. Please try again.',503);}
 if(!response.ok)throw new MarketError(response.status>=500?'Sign-in verification is unavailable.':'Your sign-in has expired. Please sign in again.',response.status>=500?503:401);
 const data=await response.json();const account=data.users?.[0];if(!account?.localId||account.disabled||claims.sub!==account.localId)throw new MarketError('Please sign in again.',401);
 return {uid:account.localId,name:typeof account.displayName==='string'?account.displayName.slice(0,80):'Listed member'};
}
