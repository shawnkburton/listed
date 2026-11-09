import type {Thread} from './marketplace-domain';
export interface MarketNotification {id:string;threadId:string;address:string;title:string;detail:string;at:number;unread:boolean}
const pacific=(value:string)=>new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Vancouver'}).format(new Date(value));
export function notificationsFor(threads:Thread[],uid:string):MarketNotification[]{
 const result:MarketNotification[]=[];
 for(const t of threads){
  if(t.buyerId!==uid&&t.sellerId!==uid)continue;
  const readAt=t.readAt[uid]||0,other=uid===t.buyerId?t.sellerName:t.buyerName;
  for(const message of t.messages)if(message.senderId!==uid)result.push({id:`message:${t.id}:${message.id}`,threadId:t.id,address:t.address,title:'New message',detail:`${other}: ${message.text.slice(0,160)}`,at:message.at,unread:message.at>readAt});
  for(const s of t.showings){
   const author=s.updatedBy||(s.status==='requested'?t.buyerId:s.status==='confirmed'||s.status==='declined'?t.sellerId:undefined);
   if(author===uid)continue;
   result.push({id:`showing:${t.id}:${s.id}:${s.status}:${s.updatedAt}`,threadId:t.id,address:t.address,title:{requested:'Showing requested',confirmed:'Showing confirmed',declined:'Showing declined',cancelled:'Showing cancelled'}[s.status],detail:`${pacific(s.startsAt)} Pacific`,at:s.updatedAt,unread:s.updatedAt>readAt});
  }
 }
 return result.sort((a,b)=>b.at-a.at||a.id.localeCompare(b.id));
}
