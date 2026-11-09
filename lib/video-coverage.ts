// Accumulate distinct, actually played intervals. Seeking and background time add nothing.
export class VideoCoverage {
 private intervals:[number,number][]=[];
 private previous:{position:number;wall:number}|undefined;
 resetPosition(){this.previous=undefined;}
 sample(position:number,wall:number,playing:boolean,visible:boolean,rate:number){
  const previous=this.previous;this.previous=playing&&visible?{position,wall}:undefined;
  if(!this.previous||!previous)return;
  const delta=position-previous.position,elapsed=(wall-previous.wall)/1000;
  if(delta<=0||elapsed<=0||elapsed>2||delta>elapsed*Math.max(1,rate)+.25)return;
  const rows=[...this.intervals,[previous.position,position] as [number,number]].sort((a,b)=>a[0]-b[0]);
  this.intervals=[];for(const row of rows){const last=this.intervals.at(-1);if(last&&row[0]<=last[1])last[1]=Math.max(last[1],row[1]);else this.intervals.push([...row]);}
 }
 fraction(duration:number){return Number.isFinite(duration)&&duration>0?Math.min(1,this.intervals.reduce((n,[a,b])=>n+b-a,0)/duration):0;}
}
