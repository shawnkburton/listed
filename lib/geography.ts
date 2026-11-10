export const searchOrigin={address:'1920 Crescent Rd, Oak Bay',latitude:48.4118258,longitude:-123.3257722};
export function distanceMeters(a:{latitude:number;longitude:number},b:{latitude:number;longitude:number}){
 const rad=(v:number)=>v*Math.PI/180;
 const dlat=rad(b.latitude-a.latitude),dlon=rad(b.longitude-a.longitude);
 return 6371000*2*Math.asin(Math.sqrt(Math.sin(dlat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dlon/2)**2));
}
