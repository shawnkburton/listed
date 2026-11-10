import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyCommand,emptyMarket} from '../lib/marketplace-domain';
import {notificationsFor} from '../lib/notifications';
const buyer={uid:'buyer',name:'Buyer'},seller={uid:'seller',name:'Seller'};
function fixture(){const data=emptyMarket();const id=applyCommand(data,seller,{action:'saveListing',status:'published',authorized:true,property:{address:'123 Fictional Road',area:'Oak Bay',style:'Modern',type:'House',price:1500000,beds:3,baths:2,sqft:1800,year:2000,lot:5000,description:'A fictional home used in isolated notification tests.',photos:['https://example.com/photo.jpg']}},1000)!;const threadId=applyCommand(data,buyer,{action:'startConversation',listingId:id},2000)!;return {data,threadId};}
test('showing request, confirmation and cancellation alert the other participant, not the actor',()=>{
 const {data,threadId}=fixture();
 applyCommand(data,buyer,{action:'requestShowing',threadId,operationId:'showing',startsAt:new Date(86400000).toISOString()},3000);
 assert.equal(notificationsFor(data.threads,buyer.uid).length,0);
 assert.equal(notificationsFor(data.threads,seller.uid)[0].title,'Showing requested');
 assert.equal(notificationsFor(data.threads,seller.uid)[0].unread,true);
 applyCommand(data,seller,{action:'respondShowing',threadId,showingId:'showing',status:'confirmed'},4000);
 assert.equal(notificationsFor(data.threads,buyer.uid)[0].title,'Showing confirmed');
 assert.equal(notificationsFor(data.threads,seller.uid).length,0);
 applyCommand(data,seller,{action:'respondShowing',threadId,showingId:'showing',status:'cancelled'},5000);
 assert.equal(notificationsFor(data.threads,buyer.uid)[0].title,'Showing cancelled');
 assert.equal(notificationsFor(data.threads,buyer.uid)[0].unread,true);
 applyCommand(data,buyer,{action:'markRead',threadId,through:5000},6000);
 assert.equal(notificationsFor(data.threads,buyer.uid)[0].unread,false);
 assert.equal(notificationsFor(data.threads,'stranger').length,0);
});
test('message alerts survive late read acknowledgements and ignore own replies',()=>{
 const {data,threadId}=fixture();
 applyCommand(data,seller,{action:'sendMessage',threadId,operationId:'a',text:'First message'},3000);
 applyCommand(data,seller,{action:'sendMessage',threadId,operationId:'b',text:'Second message'},5000);
 applyCommand(data,buyer,{action:'markRead',threadId,through:3000},6000);
 const notes=notificationsFor(data.threads,buyer.uid);assert.equal(notes.length,2);assert.equal(notes[0].unread,true);assert.equal(notes[1].unread,false);
 assert.equal(notificationsFor(data.threads,seller.uid).length,0);
 applyCommand(data,buyer,{action:'markRead',threadId,through:2000},7000);assert.equal(data.threads[0].readAt.buyer,3000);
});
test('buyer cancellations and seller declines are visible with their status and Pacific time',()=>{
 for(const status of ['cancelled','declined'] as const){const {data,threadId}=fixture();applyCommand(data,buyer,{action:'requestShowing',threadId,operationId:'showing',startsAt:new Date(86400000).toISOString()},3000);const actor=status==='cancelled'?buyer:seller;
 applyCommand(data,actor,{action:'respondShowing',threadId,showingId:'showing',status},4000);
 const receiver=actor===buyer?seller:buyer,note=notificationsFor(data.threads,receiver.uid)[0];assert.equal(note.title,`Showing ${status}`);assert.match(note.detail,/Pacific/);assert.equal(note.unread,true);assert.equal(notificationsFor(data.threads,actor.uid).length,0);}
});
