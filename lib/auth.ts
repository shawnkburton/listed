import {basicProviderProfile,microsoftGraphProfile,cacheProfilePhoto,saveProfileReport,ProfileLookupError} from './provider-profile';
import {getApp,getApps,initializeApp} from 'firebase/app';
import {FacebookAuthProvider,GoogleAuthProvider,OAuthProvider,getAuth,getAdditionalUserInfo,reauthenticateWithPopup,reload,updateProfile,signInWithPopup,type UserCredential,type User} from 'firebase/auth';

// Public web configuration reused from Listed. Provider secrets stay in Firebase.
const firebaseConfig={apiKey:'AIzaSyBUJWhlfTUVOxXMxUOdscmHGAkTIiaSCA4',authDomain:'dwell-d6c55.firebaseapp.com',projectId:'dwell-d6c55',appId:'1:972061146855:web:89810cae01b2c341a3ec42'};
export const providers=[
 {id:'google',name:'Google',enabled:true},
 {id:'microsoft',name:'Microsoft',enabled:true},
 {id:'apple',name:'Apple',enabled:process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED==='true'},
 {id:'facebook',name:'Facebook',enabled:process.env.NEXT_PUBLIC_FACEBOOK_AUTH_ENABLED==='true'},
] as const;
export type ProviderId=typeof providers[number]['id'];
export function listedAuth(){return getAuth(getApps().length?getApp():initializeApp(firebaseConfig));}
export function providerFor(id:ProviderId){
 if(id==='google'){const p=new GoogleAuthProvider();p.setCustomParameters({prompt:'select_account'});return p;}
 if(id==='facebook')return new FacebookAuthProvider();
 const p=new OAuthProvider(id==='apple'?'apple.com':'microsoft.com');
 if(id==='apple'){p.addScope('email');p.addScope('name');}else {p.addScope('User.Read');p.setCustomParameters({prompt:'select_account'});}
 return p;
}
export interface ProfileSyncResult {user:User;provider:ProviderId;notice:string}
async function syncProviderProfile(result:UserCredential,id:ProviderId):Promise<ProfileSyncResult>{
 let profile=basicProviderProfile(getAdditionalUserInfo(result)?.profile);
 if(id==='microsoft')profile=await microsoftGraphProfile(OAuthProvider.credentialFromResult(result)?.accessToken);
 const current=listedAuth().currentUser;
 if(!current||current.uid!==result.user.uid)throw new ProfileLookupError('Your signed-in account changed. Please reopen your profile.');
 const patch:{displayName?:string;photoURL?:string}={};
 if(profile.displayName)patch.displayName=profile.displayName;
 if(profile.photoURL?.startsWith('https:'))patch.photoURL=profile.photoURL;
 if(Object.keys(patch).length)await updateProfile(current,patch);
 await reload(current);await current.getIdToken(true);
 const provider=providers.find(p=>p.id===id)!.name;
 if(profile.displayName&&current.displayName!==profile.displayName){
  const message=`${provider} returned “${profile.displayName}”, but Listed could not save that name. Please refresh again.`;
  saveProfileReport(current.uid,{provider,at:Date.now(),profile,status:'error',message});throw new ProfileLookupError(message);
 }
 cacheProfilePhoto(current.uid,profile.photoURL||current.photoURL||undefined);
 const notice=profile.displayName?`${provider} returned “${profile.displayName}”. That name is now saved in Listed.`:`${provider} did not return a new name. Your existing name has been kept.`;
 saveProfileReport(current.uid,{provider,at:Date.now(),profile,status:'synced',message:notice});
 return {user:current,provider:id,notice};
}

export async function refreshProviderProfile(user:User,id:ProviderId){
 if(!user.providerData.some(p=>p.providerId===providerFor(id).providerId))throw new ProfileLookupError('Use a provider already connected to your Listed account.');
 const provider=providerFor(id);if(id==='microsoft')provider.setCustomParameters({prompt:'login'});
 return syncProviderProfile(await reauthenticateWithPopup(user,provider),id);
}
export async function signIn(id:ProviderId):Promise<ProfileSyncResult>{
 if(!providers.find(p=>p.id===id)?.enabled)throw new Error('This sign-in option is not available yet.');
 const result=await signInWithPopup(listedAuth(),providerFor(id));
 try{return await syncProviderProfile(result,id);}catch(error){const message=error instanceof ProfileLookupError?error.message:'Your profile could not be refreshed. Try Refresh profile in your account menu.';saveProfileReport(result.user.uid,{provider:providers.find(p=>p.id===id)!.name,at:Date.now(),profile:{},status:'error',message});return {user:result.user,provider:id,notice:`You are signed in. ${error instanceof ProfileLookupError?error.message:'Your profile could not be refreshed. Try Refresh profile in your account menu.'}`};}
}
export function authMessage(error:unknown){
 if(error instanceof ProfileLookupError)return error.message;
 const code=typeof error==='object'&&error!==null&&'code' in error?String(error.code):'';
 const messages:Record<string,string>={
  'auth/user-mismatch':'Please choose the same Microsoft account you use for Listed.',
  'auth/popup-closed-by-user':'Sign-in was cancelled. You can try again or continue as a guest.',
  'auth/cancelled-popup-request':'Another sign-in window was opened. Please use the latest window.',
  'auth/popup-blocked':'Your browser blocked the sign-in window. Allow pop-ups for Listed and try again.',
  'auth/unauthorized-domain':'Sign-in is not enabled for this address yet. For this local preview, open localhost:3000.',
  'auth/operation-not-allowed':'This sign-in provider still needs to be enabled for Listed.',
  'auth/account-exists-with-different-credential':'This email already uses a different sign-in method. Please use the method you originally chose.',
  'auth/network-request-failed':'We could not reach the sign-in service. Check your connection and try again.',
  'auth/too-many-requests':'Too many sign-in attempts. Please wait a little and try again.',
 };
 return messages[code]||'Sign-in could not be completed. Please try again or continue as a guest.';
}
