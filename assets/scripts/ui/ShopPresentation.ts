import type {ShopCustomer,ShopState} from '../gameplay/shop/ShopSimulation';
export type ShopVisualPoint={x:number;y:number};
type Motion={phase:string;position:ShopVisualPoint;target:ShopVisualPoint;path:ShopVisualPoint[];at:number;pickupAt:number;duration?:number};
type CustomerPose={position:ShopVisualPoint;bob:number;scale:number;moving:boolean;pickup:number;progress:number};
/** 仅输出姿态；不持有经营服务，也不能发放商品、订单或金币。 */
export class ShopPresentation{
  private readonly customers=new Map<number,Motion>();
  private readonly workers=new Map<number,Motion>();
  private readonly visibleCustomers=new Map<number,ShopVisualPoint>();
  constructor(private readonly point:(key:string)=>ShopVisualPoint,private readonly value:(key:string)=>number){}
  reset():void{this.customers.clear();this.workers.clear();this.visibleCustomers.clear();}
  prune(ids:readonly number[]):void{for(const map of [this.customers,this.visibleCustomers])for(const id of map.keys())if(!ids.includes(id))map.delete(id);}
  /** 队尾所需地面与扩店地面共用滚动范围，不把满队列压回可见区域。 */
  contentExtra(state:ShopState,clearanceHeight:number):number{
    const count=state.customers.filter(c=>c.phase==='queue').length,tail=this.point('queue').y+this.point('queueStep').y*Math.max(0,count-1);
    return Math.max(0,Math.max(0,Math.ceil(state.shelves.length/2)-2)*this.value('shopRowHeight'),count?-tail-this.value('shopViewportHeight')/2+clearanceHeight:0);
  }
  private walkLane(x:number):ShopVisualPoint{return this.point(x<0?'walkLeft':'walkRight');}
  /** 全批次再处理交会，保证结果不依赖Prefab槽位或遍历顺序；收银与队列优先。 */
  customerPoses(state:ShopState,viewportHeight:number,clearance:{width:number;height:number}):Map<number,CustomerPose>{
    const poses=new Map(state.customers.map(c=>[c.id,this.customer(c,state,viewportHeight,clearance.height)])),placed:ShopVisualPoint[]=[];
    const priority={checkout:0,queue:1,browse:2,enter:3,exit:4};
    for(const c of state.customers.slice().sort((a,b)=>priority[a.phase]-priority[b.phase]||a.id-b.id)){
      const pose=poses.get(c.id)!,position={...pose.position};
      // 稀疏交会只沿地面向下让开，避免重新推到后墙；相邻队位本身已有安全间距。
      for(let pass=0;pass<=placed.length;pass++){
        const blocker=placed.find(p=>Math.abs(p.x-position.x)<clearance.width&&Math.abs(p.y-position.y)<clearance.height);
        if(!blocker)break;position.y=blocker.y-clearance.height;
      }
      const previous=this.visibleCustomers.get(c.id)??position;
      Object.assign(pose,this.posture(position,previous,state.elapsed+state.remainder,c.id));this.visibleCustomers.set(c.id,position);placed.push(position);
    }
    this.prune(state.customers.map(c=>c.id));return poses;
  }
  along(points:ShopVisualPoint[],fraction:number):ShopVisualPoint{
    const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)),total=lengths.reduce((a,b)=>a+b,0);let distance=Math.max(0,Math.min(1,fraction))*total;
    for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]&&lengths[i]>0){const t=distance/lengths[i];return{x:points[i].x+(points[i+1].x-points[i].x)*t,y:points[i].y+(points[i+1].y-points[i].y)*t};}distance-=lengths[i];}return points[points.length-1];
  }
  private aisle(start:ShopVisualPoint,target:ShopVisualPoint):ShopVisualPoint[]{const lane=this.point('entryLane');return[start,{x:lane.x,y:start.y},{x:lane.x,y:target.y},target];}
  private posture(position:ShopVisualPoint,previous:ShopVisualPoint,now:number,seed:number):{position:ShopVisualPoint;bob:number;scale:number;moving:boolean}{
    const moving=Math.hypot(position.x-previous.x,position.y-previous.y)>0.01,phase=now*this.value(moving?'walkBobFrequency':'idleBobFrequency')+seed;
    return{position,bob:moving?Math.abs(Math.sin(phase))*this.value('walkBobPixels'):0,scale:1+Math.sin(phase)*this.value('idleScaleAmplitude'),moving};
  }
  customer(c:ShopCustomer,state:ShopState,viewportHeight=this.value('shopViewportHeight'),clearanceHeight=0):CustomerPose{
    // 原始表定义基准营业区的前门位置；扩店和高屏时，前门随可滚动地面底边移动。
    const baseHeight=this.value('shopViewportHeight'),extra=viewportHeight-baseHeight,bottomShift=extra/2+Math.max(0,this.contentExtra(state,clearanceHeight)-extra/2);
    const portal=(key:string):ShopVisualPoint=>{const p=this.point(key);return{x:p.x,y:p.y-bottomShift};};
    const now=state.elapsed+state.remainder,s=this.point('shelf'+c.shelf),offset=this.point('browseOffset'),shelf={x:s.x+offset.x,y:s.y+offset.y},checkout=this.point(c.station===1?'checkout2':'checkout'),queue=this.point('queue'),step=this.point('queueStep'),index=state.customers.filter(x=>x.phase==='queue').findIndex(x=>x.id===c.id),target=c.phase==='queue'?{x:queue.x+step.x*index,y:queue.y+step.y*index}:checkout;
    const side=this.walkLane(c.phase==='exit'&&c.basket.length?checkout.x:shelf.x),lane={x:side.x,y:portal('entryLane').y},entry={x:side.x,y:portal('entry').y},exit={x:side.x,y:portal('exit').y};
    let m=this.customers.get(c.id);if(!m){const initial=c.phase==='browse'||c.phase==='exit'&&!c.basket.length?shelf:c.phase==='enter'?entry:target,path=c.phase==='exit'?[initial,{x:lane.x,y:initial.y},lane,exit]:[initial,target];m={phase:c.phase,position:initial,target,path,at:now-this.value('customerWalkSeconds'),pickupAt:-Infinity};this.customers.set(c.id,m);}
    const previous={...m.position};
    if(m.phase!==c.phase){const was=m.phase;m.phase=c.phase;m.at=now;m.target=target;m.path=this.aisle(m.position,target);
      // 实际订单可能选到另一货架，拿货后先经过该货架前方，再沿过道去收银。
      if(was==='browse'&&c.basket.length){
        // 先在货架侧通道走到队尾高度，再横向入队，不从队伍中间穿过。
        const pickupSide=this.walkLane(shelf.x);m.path=[...this.aisle(m.position,shelf),{x:pickupSide.x,y:shelf.y},{x:pickupSide.x,y:target.y},target];m.pickupAt=now;
      }
      if(c.phase==='exit'){m.path=[m.position,{x:lane.x,y:m.position.y},lane,exit];}
    }else if(c.phase==='queue'&&Math.hypot(m.target.x-target.x,m.target.y-target.y)>0.01){m.path=this.aisle(m.position,target);m.target=target;m.at=now;}
    const f=Math.max(0,Math.min(1,1-(c.remaining-state.remainder)/c.duration));let p:ShopVisualPoint;
    if(c.phase==='enter')p=this.along([entry,{x:lane.x,y:Math.min(lane.y,shelf.y)},{x:lane.x,y:shelf.y},shelf],f);
    else if(c.phase==='browse')p=shelf;
    // 离店途中改变窗口高度时也更新场外终点，避免旧终点落进新视口。
    else if(c.phase==='exit'){m.path.splice(-2,2,{x:lane.x,y:Math.min(lane.y,m.path[0].y)},exit);p=this.along(m.path,f);}
    else p=this.along(m.path,(now-m.at)/this.value('customerWalkSeconds'));
    m.position=p;return{...this.posture(p,previous,now,c.id),pickup:Math.max(0,1-(now-m.pickupAt)/this.value('pickupSeconds')),progress:c.phase==='checkout'?f:-1};
  }
  worker(index:number,target:ShopVisualPoint,now:number,duration=this.value('workerWalkSeconds')):{position:ShopVisualPoint;bob:number;scale:number;moving:boolean}{
    let m=this.workers.get(index);if(!m){const initial=this.point('worker'+index);m={phase:'work',position:initial,target:initial,path:[initial],at:now,pickupAt:-Infinity};this.workers.set(index,m);}
    const previous={...m.position};if(Math.hypot(m.target.x-target.x,m.target.y-target.y)>0.01){m.path=this.aisle(m.position,target);m.target={...target};m.at=now;m.duration=duration;}
    const p=this.along(m.path,(now-m.at)/(m.duration??duration));m.position=p;return this.posture(p,previous,now,index);
  }
}
