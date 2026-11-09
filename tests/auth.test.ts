import {test} from 'node:test';
import assert from 'node:assert/strict';
import {localBuyerRepository,freshState,storageKey,STORAGE_KEY} from '../lib/storage';
import {providerFor,providers,authMessage} from '../lib/auth';

test('guest and different accounts retain isolated preferences and events across switching',()=>{
 const memory=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>memory.get(k)||null,setItem:(k:string,v:string)=>memory.set(k,v)},configurable:true});
 try{
 const guest=localBuyerRepository(),a=localBuyerRepository('account-a'),b=localBuyerRepository('account-b');
 const g=freshState();g.preferences.minBeds=2;guest.save(g);
 const av=freshState();av.preferences.minBeds=5;a.save(av);
 assert.equal(guest.load().preferences.minBeds,2);assert.equal(a.load().preferences.minBeds,5);
 assert.equal(b.load().events.length,0);assert.notEqual(b.load().visitorId,av.visitorId);
 assert.equal(guest.load().visitorId,g.visitorId);assert.equal(a.load().visitorId,av.visitorId);
 assert.equal(storageKey(),STORAGE_KEY);assert.notEqual(storageKey('guest'),STORAGE_KEY);
 }finally{Reflect.deleteProperty(globalThis,'localStorage');}
});
test('provider IDs reuse existing identity service and request limited profile scopes',()=>{
 assert.equal(providerFor('google').providerId,'google.com');
 assert.equal(providerFor('microsoft').providerId,'microsoft.com');
 assert.equal(providerFor('apple').providerId,'apple.com');
 assert.equal(providerFor('facebook').providerId,'facebook.com');
 assert.deepEqual(providerFor('microsoft').getScopes(),['User.Read']);
 assert.deepEqual(providerFor('apple').getScopes(),['email','name']);
 assert.deepEqual(providers.filter(p=>p.enabled).map(p=>p.id),['google','microsoft']);
});
test('authentication failures explain recovery without exposing raw provider messages',()=>{
 assert.match(authMessage({code:'auth/popup-blocked'}),/Allow pop-ups/);
 assert.match(authMessage({code:'auth/unauthorized-domain'}),/localhost/);
 assert.match(authMessage({code:'auth/account-exists-with-different-credential'}),/originally chose/);
 assert.doesNotMatch(authMessage({code:'secret',message:'private token'}),/private token/);
});
