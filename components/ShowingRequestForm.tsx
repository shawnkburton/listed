'use client';
import {useState} from 'react';
import {CalendarDays,ChevronLeft,ChevronRight} from 'lucide-react';
import {pacificDay,showingISO} from '@/lib/showing-time';

export default function ShowingRequestForm({busy,onRequest}:{busy:boolean;onRequest:(startsAt:string)=>Promise<boolean>}){
 const today=pacificDay(),last=pacificDay(Date.now()+180*86400000);
 const [day,setDay]=useState(''),[hour,setHour]=useState(''),[minute,setMinute]=useState(''),[period,setPeriod]=useState(''),[open,setOpen]=useState(false),[month,setMonth]=useState(today.slice(0,7)),[error,setError]=useState('');
 const first=new Date(month+'-01T12:00:00Z'),offset=first.getUTCDay(),count=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
 const shift=(delta:number)=>setMonth(new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+delta,1,12)).toISOString().slice(0,7));
 const label=(value:string)=>new Intl.DateTimeFormat('en-CA',{timeZone:'UTC',dateStyle:'long'}).format(new Date(value+'T12:00:00Z'));
 async function submit(e:React.FormEvent){e.preventDefault();if(busy)return;setError('');
  if(!day||!hour||!minute||!period){setError('Choose a date, hour, minutes and AM or PM.');return;}
  const startsAt=showingISO(day,hour,minute,period);
  if(!startsAt){setError('That Pacific time does not exist on this date. Choose another time.');return;}
  if(Date.parse(startsAt)<=Date.now()+15*60000||Date.parse(startsAt)>=Date.now()+180*86400000){setError('Choose a time more than 15 minutes ahead and within 180 days.');return;}
  if(await onRequest(startsAt)){setDay('');setHour('');setMinute('');setPeriod('');setOpen(false);}
 }
 return <form className="showing-request-form" onSubmit={submit} noValidate><div className="showing-date-field"><span id="showing-date-label">Preferred date</span><button type="button" className="showing-date-button" aria-labelledby="showing-date-label showing-date-value" aria-expanded={open} disabled={busy} onClick={()=>setOpen(!open)}><CalendarDays size={22}/><span id="showing-date-value">{day?label(day):'Choose a date'}</span></button>
 {open&&<div className="showing-calendar" role="group" aria-label="Showing date calendar"><div className="calendar-heading"><button type="button" aria-label="Previous month" disabled={busy||month<=today.slice(0,7)} onClick={()=>shift(-1)}><ChevronLeft/></button><strong aria-live="polite">{new Intl.DateTimeFormat('en-CA',{timeZone:'UTC',month:'long',year:'numeric'}).format(first)}</strong><button type="button" aria-label="Next month" disabled={busy||month>=last.slice(0,7)} onClick={()=>shift(1)}><ChevronRight/></button></div><div className="calendar-days">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(w=><span key={w} className="calendar-weekday">{w}</span>)}{Array.from({length:offset},(_,i)=><span key={`blank-${i}`}/>)}{Array.from({length:count},(_,i)=>{const value=`${month}-${String(i+1).padStart(2,'0')}`;return <button key={value} type="button" aria-label={label(value)} aria-pressed={day===value} aria-current={value===today?'date':undefined} disabled={busy||value<today||value>last} onClick={()=>{setDay(value);setOpen(false);setError('');}}>{i+1}</button>;})}</div></div>}</div>
 <fieldset className="showing-time-fields" disabled={busy}><legend>Preferred time (Pacific)</legend><label>Hour<select value={hour} onChange={e=>setHour(e.target.value)}><option value="">Hour</option>{Array.from({length:12},(_,i)=><option key={i+1} value={i+1}>{i+1}</option>)}</select></label><label>Minutes<select value={minute} onChange={e=>setMinute(e.target.value)}><option value="">Minutes</option>{Array.from({length:60},(_,i)=>{const v=String(i).padStart(2,'0');return <option key={v} value={v}>{v}</option>;})}</select></label><label>AM/PM<select value={period} onChange={e=>setPeriod(e.target.value)}><option value="">AM/PM</option><option>AM</option><option>PM</option></select></label></fieldset>
 {error&&<p className="account-error" role="alert">{error}</p>}<button type="submit" className="primary" disabled={busy}>{busy?'Sending request…':'Request showing'}</button><p className="subtle">Choose each time field, then request your showing. All times use Pacific time.</p></form>;
}
