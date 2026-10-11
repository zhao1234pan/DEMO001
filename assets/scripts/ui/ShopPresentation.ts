import type {ShopCustomer,ShopState} from '../gameplay/shop/ShopSimulation';
export type ShopVisualPoint={x:number;y:number};
type Motion={phase:string;position:ShopVisualPoint;target:ShopVisualPoint;path:ShopVisualPoint[];at:number;pickupAt:number;duration?:number};
/** 仅输出姿态；不持有经营服务，也不能发放商品、订单或金币。 */
export class ShopPresentation{
  private readonly customers=new Map<number,Motion>();
  private readonly workers=new Map<number,Motion>();
  constructor(private readonly point:(key:string)=>ShopVisualPoint,private readonly value:(key:string)=>number){}
  reset():void{this.customers.clear();this.workers.clear();}
  prune(ids:readonly number[]):void{for(const id of this.customers.keys())if(!ids.includes(id))this.customers.delete(id);}
  along(points:ShopVisualPoint[],fraction:number):ShopVisualPoint{
    const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)),total=lengths.reduce((a,b)=>a+b,0);let distance=Math.max(0,Math.min(1,fraction))*total;
    for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]&&lengths[i]>0){const t=distance/lengths[i];return{x:points[i].x+(points[i+1].x-points[i].x)*t,y:points[i].y+(points[i+1].y-points[i].y)*t};}distance-=lengths[i];}return points[points.length-1];
  }
  private aisle(start:ShopVisualPoint,target:ShopVisualPoint):ShopVisualPoint[]{const lane=this.point('entryLane');return[start,{x:lane.x,y:start.y},{x:lane.x,y:target.y},target];}
  private posture(position:ShopVisualPoint,previous:ShopVisualPoint,now:number,seed:number):{position:ShopVisualPoint;bob:number;scale:number;moving:boolean}{
    const moving=Math.hypot(position.x-previous.x,position.y-previous.y)>0.01,phase=now*this.value(moving?'walkBobFrequency':'idleBobFrequency')+seed;
    return{position,bob:moving?Math.abs(Math.sin(phase))*this.value('walkBobPixels'):0,scale:1+Math.sin(phase)*this.value('idleScaleAmplitude'),moving};
  }
  customer(c:ShopCustomer,state:ShopState):{position:ShopVisualPoint;bob:number;scale:number;moving:boolean;pickup:number;progress:number}{
    const now=state.elapsed+state.remainder,entry=this.point('entry'),lane=this.point('entryLane'),s=this.point('shelf'+c.shelf),offset=this.point('browseOffset'),shelf={x:s.x+offset.x,y:s.y+offset.y},checkout=this.point(c.station===1?'checkout2':'checkout'),queue=this.point('queue'),step=this.point('queueStep'),index=state.customers.filter(x=>x.phase==='queue').findIndex(x=>x.id===c.id),target=c.phase==='queue'?{x:queue.x+step.x*index,y:queue.y+step.y*index}:checkout;
    let m=this.customers.get(c.id);if(!m){const initial=c.phase==='browse'?shelf:c.phase==='enter'?entry:target,path=c.phase==='exit'?[checkout,{x:lane.x,y:checkout.y},lane,this.point('exit')]:[initial,target];m={phase:c.phase,position:initial,target,path,at:now-this.value('customerWalkSeconds'),pickupAt:-Infinity};this.customers.set(c.id,m);}
    const previous={...m.position};
    if(m.phase!==c.phase){const was=m.phase;m.phase=c.phase;m.at=now;m.target=target;m.path=this.aisle(m.position,target);
      // 实际订单可能选到另一货架，拿货后先经过该货架前方，再沿过道去收银。
      if(was==='browse'&&c.basket.length){m.path=[...this.aisle(m.position,shelf),...this.aisle(shelf,target).slice(1)];m.pickupAt=now;}
      if(c.phase==='exit'){m.path=[m.position,{x:lane.x,y:m.position.y},lane,this.point('exit')];}
    }else if(c.phase==='queue'&&Math.hypot(m.target.x-target.x,m.target.y-target.y)>0.01){m.path=this.aisle(m.position,target);m.target=target;m.at=now;}
    const f=Math.max(0,Math.min(1,1-(c.remaining-state.remainder)/c.duration));let p:ShopVisualPoint;
    if(c.phase==='enter')p=this.along([entry,lane,{x:lane.x,y:shelf.y},shelf],f);
    else if(c.phase==='browse')p=shelf;
    else if(c.phase==='exit')p=this.along(m.path,f);
    else p=this.along(m.path,(now-m.at)/this.value('customerWalkSeconds'));
    m.position=p;return{...this.posture(p,previous,now,c.id),pickup:Math.max(0,1-(now-m.pickupAt)/this.value('pickupSeconds')),progress:c.phase==='checkout'?f:-1};
  }
  worker(index:number,target:ShopVisualPoint,now:number,duration=this.value('workerWalkSeconds')):{position:ShopVisualPoint;bob:number;scale:number;moving:boolean}{
    let m=this.workers.get(index);if(!m){const initial=this.point('worker'+index);m={phase:'work',position:initial,target:initial,path:[initial],at:now,pickupAt:-Infinity};this.workers.set(index,m);}
    const previous={...m.position};if(Math.hypot(m.target.x-target.x,m.target.y-target.y)>0.01){m.path=this.aisle(m.position,target);m.target={...target};m.at=now;m.duration=duration;}
    const p=this.along(m.path,(now-m.at)/(m.duration??duration));m.position=p;return this.posture(p,previous,now,index);
  }
}
