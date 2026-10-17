export interface CrowdUnit {
  x:number;y:number;distance:number;crowdLane?:number;crowdRadius?:number;crowdLift?:number;
}
type Point=readonly[number,number];
/** 双列偏移折线与身体占位共用同一坐标；不把显示避让伪装成真实移动。 */
export class CrowdFlow {
  private readonly tracks:Point[][]=[];
  private readonly lengths:number[]=[];
  private readonly orders=new Map<CrowdUnit,number>();
  private readonly reservations=new Map<CrowdUnit,Map<number,Array<{left:number;right:number;top:number;bottom:number}>>>();
  constructor(private readonly path:readonly Point[],readonly offset:number,readonly gap:number){
    for(let i=1;i<path.length;i++)this.lengths.push(Math.hypot(path[i][0]-path[i-1][0],path[i][1]-path[i-1][1]));
    const normal=(i:number)=>{const a=path[i],b=path[i+1],l=this.lengths[i];return[-(b[1]-a[1])/l,(b[0]-a[0])/l];};
    for(const shift of [-offset,offset,0])this.tracks.push(path.map((p,i)=>{
      const a=normal(Math.max(0,i-1)),b=normal(Math.min(i,path.length-2)),den=1+a[0]*b[0]+a[1]*b[1];
      return[p[0]+(a[0]+b[0])*shift/den,p[1]+(a[1]+b[1])*shift/den] as Point;
    }));
  }
  position(distance:number,lane=0):{x:number;y:number;done:boolean}{
    const points=this.tracks[lane];let d=distance;
    for(let i=0;i<this.lengths.length;i++){const l=this.lengths[i];if(d<=l){const t=d/l,a=points[i],b=points[i+1];return{x:a[0]+(b[0]-a[0])*t,y:a[1]+(b[1]-a[1])*t,done:false};}d-=l;}
    const p=points[points.length-1];return{x:p[0],y:p[1],done:true};
  }
  // 偏移路线的内外弯长度不同；按当前路段及实际前后位置排优先级，避免互相认为对方在前。
  private order(unit:CrowdUnit):number{
    const cached=this.orders.get(unit);if(cached!==undefined)return cached;
    let d=unit.distance;const stride=this.lengths.reduce((a,b)=>a+b,0)*2;
    for(let i=0;i<this.lengths.length;i++){if(d<=this.lengths[i]){const a=this.path[i],b=this.path[i+1],result=i*stride+((unit.x-a[0])*(b[0]-a[0])+(unit.y-a[1])*(b[1]-a[1]))/this.lengths[i];this.orders.set(unit,result);return result;}d-=this.lengths[i];}const result=this.lengths.length*stride+d;this.orders.set(unit,result);return result;
  }
  private free(unit:CrowdUnit,p:{x:number;y:number},others:readonly CrowdUnit[]):boolean{
    return others.every(other=>{
      if(other===unit)return true;
      const clearance=(unit.crowdRadius??0)+(other.crowdRadius??0)+this.gap,clear=(q:{x:number;y:number})=>Math.abs(p.x-q.x)+1e-6>=clearance||Math.abs(p.y-(unit.crowdLift??0)-q.y+(other.crowdLift??0))+1e-6>=clearance;
      if(!clear(other))return false;
      // 跟随者不能提前占住前者转弯后的空间，否则两列会在内外弯互相卡死。
      if(this.order(other)>=this.order(unit)&&Math.hypot(p.x-other.x,p.y-other.y)<clearance*3){
        let cache=this.reservations.get(other);if(!cache){cache=new Map();this.reservations.set(other,cache);}let boxes=cache.get(clearance);
        if(!boxes){const end=other.distance+clearance*2+this.offset*2,points=[this.position(other.distance,other.crowdLane??0)];let vertex=0;for(const length of this.lengths){vertex+=length;if(vertex>other.distance&&vertex<end)points.push(this.position(vertex,other.crowdLane??0));}points.push(this.position(end,other.crowdLane??0));boxes=[];for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];boxes.push({left:Math.min(a.x,b.x)-clearance,right:Math.max(a.x,b.x)+clearance,top:Math.min(a.y,b.y)-clearance,bottom:Math.max(a.y,b.y)+clearance});}cache.set(clearance,boxes);}
        const py=p.y-(unit.crowdLift??0)+(other.crowdLift??0);
        for(const b of boxes)if(p.x>b.left+1e-6&&p.x<b.right-1e-6&&py>b.top+1e-6&&py<b.bottom-1e-6)return false;
      }
      return true;
    });
  }
  private put(unit:CrowdUnit,distance:number,lane:number):void{unit.crowdLane=lane;unit.distance=distance;Object.assign(unit,this.position(distance,lane));this.orders.delete(unit);this.reservations.delete(unit);}
  admit(unit:CrowdUnit,others:readonly CrowdUnit[],boss=false):boolean{
    const lanes=boss?[2]:[0,1].sort((a,b)=>others.filter(e=>e.crowdLane===a).length-others.filter(e=>e.crowdLane===b).length);
    for(const lane of lanes){this.put(unit,0,lane);if(this.free(unit,unit,others))return true;}return false;
  }
  advance(units:readonly CrowdUnit[],steps:ReadonlyMap<CrowdUnit,number>):void{
    this.orders.clear();this.reservations.clear();
    for(const unit of [...units].sort((a,b)=>this.order(b)-this.order(a))){
      const goal=unit.distance+(steps.get(unit)??0),lane=unit.crowdLane??0,stride=Math.max(this.gap,(unit.crowdRadius??0)/2);
      while(unit.distance<goal-1e-6){const end=Math.min(goal,unit.distance+stride),p=this.position(end,lane);if(this.free(unit,p,units)){this.put(unit,end,lane);if(p.done)break;continue;}
        let lo=unit.distance,hi=end;for(let i=0;i<8;i++){const mid=(lo+hi)/2;if(this.free(unit,this.position(mid,lane),units))lo=mid;else hi=mid;}this.put(unit,lo,lane);break;
      }
    }
  }
  /** 返场与复活重新寻找安全位置；容量不足者在场外排队，不叠到入口或同一进度。 */
  relocate(unit:CrowdUnit,distance:number,others:readonly CrowdUnit[]):void{
    const lanes=unit.crowdLane===2?[2]:[unit.crowdLane??0,1-(unit.crowdLane??0)],step=(unit.crowdRadius??0)+this.gap;
    for(let d=distance;;d-=step)for(const lane of lanes){this.put(unit,d,lane);if(this.free(unit,unit,others))return;}
  }
  restore(units:readonly CrowdUnit[]):void{this.orders.clear();this.reservations.clear();const placed:CrowdUnit[]=[];for(const u of [...units].sort((a,b)=>b.distance-a.distance)){this.relocate(u,u.distance,placed);placed.push(u);}}
}
