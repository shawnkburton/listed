'use client';
import {Bell,ArrowRight} from 'lucide-react';
import type {MarketNotification} from '@/lib/notifications';
export default function Notifications({items,onOpen}:{items:MarketNotification[];onOpen:(threadId:string)=>void}){
 const ordered=[...items].sort((a,b)=>Number(b.unread)-Number(a.unread)||b.at-a.at);
 return <div className="dialog-body notifications-panel"><p>Messages and showing updates appear here. Opening a conversation marks its updates as read.</p>{!items.length?<div className="workspace-empty"><Bell/><h3>You’re all caught up.</h3><p>New messages and showing updates will appear here.</p></div>:<div className="notification-list">{ordered.slice(0,50).map(n=><button key={n.id} className={n.unread?'unread':''} onClick={()=>onOpen(n.threadId)}><span className="notification-icon"><Bell size={18}/>{n.unread&&<i className="unread-dot"/>}</span><span><strong>{n.title}{n.unread&&<small>Unread</small>}</strong><span>{n.address}</span><span>{n.detail}</span><time>{new Intl.DateTimeFormat('en-CA',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Vancouver'}).format(n.at)} Pacific</time></span><ArrowRight size={16}/></button>)}</div>}<p className="subtle">Updates are checked every 15 seconds while Listed is visible, and when you return to it. These are in-app notifications; email and text alerts are not enabled.</p></div>;
}
