import {createListingAnalyticsStore} from './listing-analytics-store';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync,chmodSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {applyCommand,syncActorName,emptyMarket,snapshot,type Actor,type MarketData} from '../marketplace-domain';
import type {SavedSellerPlan} from '../seller-agent';
export function createMarketStore(path:string){
 if(path!==':memory:')mkdirSync(dirname(path),{recursive:true,mode:0o700});
 const db=new DatabaseSync(path);if(path!==':memory:')chmodSync(path,0o600);
 db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS marketplace (id INTEGER PRIMARY KEY CHECK(id=1), body TEXT NOT NULL); CREATE TABLE IF NOT EXISTS seller_plans (listing_id TEXT PRIMARY KEY, seller_id TEXT NOT NULL, address TEXT NOT NULL, area TEXT NOT NULL, body TEXT NOT NULL);');
 db.prepare('INSERT OR IGNORE INTO marketplace VALUES (1,?)').run(JSON.stringify(emptyMarket()));
 const raw=()=>JSON.parse((db.prepare('SELECT body FROM marketplace WHERE id=1').get() as {body:string}).body) as MarketData;
 // Keep private plans outside the legacy listing document. Older app versions
 // can read that document without accidentally returning the private fields.
 const write=(data:MarketData)=>{
  for(const l of data.listings){
   if(l.sellerPlan)db.prepare('INSERT OR REPLACE INTO seller_plans VALUES (?,?,?,?,?)').run(l.id,l.sellerId,l.property.address,l.property.area,JSON.stringify(l.sellerPlan));
   else db.prepare('DELETE FROM seller_plans WHERE listing_id=?').run(l.id);
  }
  const publicStorage={...data,listings:data.listings.map(({sellerPlan,...l})=>l)};
  db.prepare('UPDATE marketplace SET body=? WHERE id=1').run(JSON.stringify(publicStorage));
 };
 const read=()=>{
  const data=raw();
  for(const l of data.listings){const plan=db.prepare('SELECT body FROM seller_plans WHERE listing_id=? AND seller_id=? AND address=? AND area=?').get(l.id,l.sellerId,l.property.address,l.property.area) as {body:string}|undefined;
   if(plan)l.sellerPlan=JSON.parse(plan.body) as SavedSellerPlan;
  }return data;
 };
 // Move any plans saved by the early local preview without losing existing plans.
 db.exec('BEGIN IMMEDIATE');try{const data=raw();if(data.listings.some(l=>l.sellerPlan))write(read());db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');db.close();throw e;}
 const analytics=createListingAnalyticsStore(db,read);
 return {
  analytics,
  syncActor(actor:Actor){db.exec('BEGIN IMMEDIATE');try{const data=read();if(syncActorName(data,actor))write(data);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}},
  get:(uid?:string)=>snapshot(read(),uid),
  command(actor:Actor,command:unknown){db.exec('BEGIN IMMEDIATE');try{const data=read();syncActorName(data,actor);const id=applyCommand(data,actor,command);write(data);db.exec('COMMIT');return {id,...snapshot(data,actor.uid)};}catch(e){db.exec('ROLLBACK');throw e;}},
  close:()=>db.close()
 };
}
let store:ReturnType<typeof createMarketStore>|undefined;
export function marketStore(){return store??=createMarketStore(resolve(process.env.LISTED_DATABASE_PATH||'.data/marketplace.sqlite'));}
