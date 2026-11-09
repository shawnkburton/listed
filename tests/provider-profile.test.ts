import {test} from 'node:test';
import assert from 'node:assert/strict';
import {basicProviderProfile,microsoftGraphProfile,ProfileLookupError,profilePhoto,cacheProfilePhoto,cachedProfilePhoto,saveProfileReport,profileReport} from '../lib/provider-profile';
test('basic profiles import names and safe photos while preserving omitted Apple fields',()=>{
 assert.deepEqual(basicProviderProfile({name:' New Name ',picture:'https://example.com/avatar.jpg'}),{displayName:'New Name',photoURL:'https://example.com/avatar.jpg'});
 assert.deepEqual(basicProviderProfile({name:{firstName:'First',lastName:'Last'}}),{displayName:'First Last'});
 assert.deepEqual(basicProviderProfile({email:'relay@privaterelay.appleid.com'}),{});
 assert.deepEqual(basicProviderProfile({name:'Facebook Name',picture:{data:{url:'https://example.com/photo'}}}),{displayName:'Facebook Name',photoURL:'https://example.com/photo'});
 assert.equal(profilePhoto('javascript:alert(1)'),undefined);assert.equal(profilePhoto('data:image/svg+xml;base64,AAA'),undefined);
});
test('Microsoft current name is fetched directly and a missing photo does not block refresh',async()=>{
 const calls:{url:string;options:RequestInit|undefined}[]=[];
 const fetcher=(async(url,options)=>{calls.push({url:String(url),options});return calls.length===1?Response.json({displayName:'Updated Microsoft Name'}):new Response(null,{status:404});}) as typeof fetch;
 const profile=await microsoftGraphProfile('test-access-token',fetcher);
 assert.equal(profile.displayName,'Updated Microsoft Name');assert.equal(profile.photoURL,undefined);
 assert.equal(calls[0].url,'https://graph.microsoft.com/v1.0/me?$select=displayName,givenName,surname,mail,userPrincipalName');
 for(const call of calls){assert.equal(new URL(call.url).origin,'https://graph.microsoft.com');assert.equal((call.options?.headers as Record<string,string>).Authorization,'Bearer test-access-token');assert.equal(call.options?.redirect,'error');assert.equal(call.options?.cache,'no-store');}
});
test('Microsoft profile failures are explicit rather than silently claiming a cached name was refreshed',async()=>{
 await assert.rejects(microsoftGraphProfile(undefined),ProfileLookupError);
 await assert.rejects(microsoftGraphProfile('token',(async()=>new Response(null,{status:403})) as typeof fetch),/did not allow/);
 await assert.rejects(microsoftGraphProfile('token',(async()=>Response.json({})) as typeof fetch),/no display name/);
 await assert.rejects(microsoftGraphProfile('token',(async()=>{throw new Error('network');}) as typeof fetch),/existing Listed profile/);
});
test('available Microsoft photo is read with the same scoped credential and cache stays per account',async()=>{
 let calls=0;const profile=await microsoftGraphProfile('token',(async()=>++calls===1?Response.json({displayName:'Photo User'}):new Response(new Uint8Array([255,216,255]),{headers:{'Content-Type':'image/jpeg'}})) as typeof fetch);
 assert.equal(profile.photoURL,'data:image/jpeg;base64,/9j/');
 const values=new Map<string,string>();Object.assign(globalThis,{localStorage:{getItem:(k:string)=>values.get(k)||null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)}});
 try{cacheProfilePhoto('a',profile.photoURL);assert.equal(cachedProfilePhoto('a'),profile.photoURL);assert.equal(cachedProfilePhoto('b'),undefined);cacheProfilePhoto('a',undefined);assert.equal(cachedProfilePhoto('a'),undefined);assert.ok([...values.values()].every(v=>!v.includes('token')));}finally{Reflect.deleteProperty(globalThis,'localStorage');}
});

test('profile diagnostics retain returned identity details privately by account',()=>{
 const report={provider:'Microsoft',at:12345,profile:{displayName:'Updated Name',givenName:'Updated',surname:'Name',providerEmail:'test@example.com'},status:'synced' as const,message:'Saved'};
 saveProfileReport('diagnostic-user',report);assert.deepEqual(profileReport('diagnostic-user'),report);assert.equal(profileReport('different-user'),undefined);
 assert.deepEqual(basicProviderProfile(report.profile),report.profile);
});
