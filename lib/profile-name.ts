// Only use the fresh profile returned by a completed Microsoft OAuth exchange.
export function microsoftProfileName(profile:unknown):string|undefined{
 if(!profile||typeof profile!=='object')return;
 const p=profile as Record<string,unknown>;
 for(const value of [p.displayName,p.name])if(typeof value==='string'&&value.trim())return value.trim().slice(0,80);
}
