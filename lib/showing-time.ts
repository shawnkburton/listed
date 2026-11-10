export function pacificDay(at=Date.now()){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Vancouver',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at);
 return ['year','month','day'].map(type=>parts.find(p=>p.type===type)!.value).join('-');
}
export function showingISO(day:string,hour:string,minute:string,period:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!/^([1-9]|1[0-2])$/.test(hour)||!/^([0-5]\d)$/.test(minute)||!['AM','PM'].includes(period))return '';
 const time=`${String(Number(hour)%12+(period==='PM'?12:0)).padStart(2,'0')}:${minute}`,wall=`${day}T${time}`;
 const base=Date.parse(wall+'Z');if(!Number.isFinite(base))return '';
 // Check both Pacific offsets against Intl: reject nonexistent spring-forward times.
 // Repeated autumn times select the first occurrence.
 for(const offset of [7,8]){const candidate=new Date(base+offset*3600000);const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Vancouver',hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).formatToParts(candidate);const part=(type:string)=>parts.find(p=>p.type===type)!.value;
  if(`${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`===wall)return candidate.toISOString();
 }
 return '';
}
