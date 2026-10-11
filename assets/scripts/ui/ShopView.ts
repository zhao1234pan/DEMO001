import { Node, Sprite } from "cc";
import { numeric, rows, text } from "../config/ConfigTables";
import { ShopService, shopClearedLevel, shopNumber } from "../services/ShopService";
import { UiPrefabs, uiNode, uiText } from "./UiPrefabs";
import { ShopCustomer } from "../gameplay/shop/ShopSimulation";

type ShopTab="staff"|"upgrade"|"goods";
type Point={x:number;y:number};
/** 页面只投影经营状态，不通过动画或点击发放收益。 */
export class ShopView {
  private tab:ShopTab="staff";
  private mode:"closed"|"menu"|"details"="closed";
  private page=0;
  private targetShelf=0;
  private notification="";
  private notificationUntil=0;
  private lastSold=0;
  private readonly images=new Map<Node,string>();
  private readonly points=new Map(rows("ShopPoint").map(r=>[r.key,r]));
  private readonly motions=new Map<number,{phase:string;start:Point;at:number;position:Point}>();
  constructor(private readonly root:Node,private readonly assets:UiPrefabs){}
  get isOverlayOpen():boolean{return this.mode!=="closed";}
  open(fresh:boolean):void {this.mode="closed";this.page=0;this.targetShelf=0;this.motions.clear();this.lastSold=ShopService.shared.state?.sold??0;if(fresh)this.notify(text("shop.welcome",shopNumber("welcomeCoins")));}
  private details(tab:ShopTab):void{this.mode="details";this.tab=tab;this.page=0;}
  private notify(message:string):void {this.notification=message;this.notificationUntil=Date.now()+shopNumber("saveSeconds")*1000;}
  private image(node:Node,key:string):void {if(this.images.get(node)===key)return;this.images.set(node,key);this.assets.bindImage(node,key);}
  private skin(node:Node,key:string):void{this.assets.bindSkin(uiNode(node,"Artwork").getComponent(Sprite)!,key);}
  private point(key:string):Point {const r=this.points.get(key)!;return{x:numeric(r,"x"),y:numeric(r,"y")};}
  render(bind:(node:Node,action:()=>void)=>void):void {
    const service=ShopService.shared,sim=service.simulation;if(!sim)return;const state=sim.state;
    if(service.offlineIncome>0){this.notify(text("shop.offline",service.offlineIncome));service.offlineIncome=0;}
    else if(state.sold!==this.lastSold){this.lastSold=state.sold;this.notify(text("shop.sold",sim.lastSale));}
    uiText(this.root,"Wallet/Text",text("shop.balance",state.coins));uiText(this.root,"Summary",text("shop.summary",state.sold));uiText(this.root,"Receipt",Date.now()<this.notificationUntil?this.notification:"");
    for(let i=0;i<shopNumber("maxShelves");i++){
      const node=uiNode(this.root,"Floor/Shelf"+i),s=state.shelves[i],products=uiNode(node,"Products");products.active=Boolean(s);
      if(s){const good=rows("Goods").find(g=>g.key===s.goods)!;products.children.forEach((unit,j)=>{unit.active=j<s.stock;this.skin(unit,good.imageKey);});uiText(node,"Stock",text("shop.inventory",s.stock,shopNumber("shelfCapacity")));uiText(node,"Name",text(good.nameKey));}
      else{uiText(node,"Stock","");uiText(node,"Name",text("shop.closedShelf"));}
      if(!this.isOverlayOpen)bind(node,()=>{this.targetShelf=i;this.details(s?"goods":"upgrade");});
    }
    this.workers();
    for(let i=0;i<shopNumber("customerLimit");i++){const node=uiNode(this.root,"Floor/Customer"+i),c=state.customers[i];node.active=Boolean(c);if(!c)continue;this.image(node,sim.config.customers.find(t=>t.key===c.kind)!.imageKey);const p=this.customerPosition(c);node.setPosition(p.x,p.y);const basket=uiNode(node,"Basket");basket.active=c.basket.length>0;if(basket.active){const good=rows("Goods").find(g=>g.key===c.basket[0])!;this.skin(basket,good.imageKey);}}
    for(const id of this.motions.keys())if(!state.customers.some(c=>c.id===id))this.motions.delete(id);
    // 地面节点都以脚底为深度依据；角色走到货架前后时，遮挡关系随位置更新。
    uiNode(this.root,"Floor").children.slice().sort((a,b)=>b.position.y-a.position.y).forEach((n,i)=>n.setSiblingIndex(i));
    const overlay=uiNode(this.root,"ShopOverlay");overlay.active=this.isOverlayOpen;uiNode(this.root,"ManageButton").active=!this.isOverlayOpen;
    if(!this.isOverlayOpen){bind(uiNode(this.root,"ManageButton"),()=>{this.mode="menu";});return;}
    const menu=uiNode(overlay,"Menu"),details=uiNode(overlay,"Details");menu.active=this.mode==="menu";details.active=this.mode==="details";
    if(menu.active){for(const [path,tab]of [["Staff","staff"],["Upgrade","upgrade"],["Goods","goods"]]as const)bind(uiNode(menu,path),()=>this.details(tab));bind(uiNode(menu,"Close"),()=>{this.mode="closed";});bind(uiNode(menu,"Panel"),()=>{});}
    else{this.renderDetails(details,bind);bind(uiNode(details,"Back"),()=>{this.mode="menu";});bind(uiNode(details,"Close"),()=>{this.mode="closed";});bind(uiNode(details,"Panel"),()=>{});}
    // 面板空白先截获点击，遮罩最后处理，防止穿透到货架或首页返回按钮。
    bind(uiNode(overlay,"Dim"),()=>{this.mode="closed";});
  }
  private renderDetails(root:Node,bind:(node:Node,action:()=>void)=>void):void{
    const service=ShopService.shared,sim=service.simulation!,state=sim.state,cleared=shopClearedLevel();this.targetShelf=Math.min(this.targetShelf,state.shelves.length-1);
    uiText(root,"Title",text(this.tab==="staff"?"shop.staffMenu":this.tab==="upgrade"?"shop.upgradeMenu":"shop.goodsMenu"));uiText(root,"Balance",text("shop.coins",state.coins));
    const shelfTabs=uiNode(root,"ShelfTabs");shelfTabs.active=this.tab==="goods";shelfTabs.children.forEach((node,i)=>{node.active=i<state.shelves.length;uiText(node,"Text",text("shop.shelfNumber",i+1));this.skin(node,i===this.targetShelf?"button_gold":"button_green");if(node.active)bind(node,()=>{this.targetShelf=i;});});
    const all=this.tab==="staff"?rows("ShopStaff"):this.tab==="upgrade"?["checkout","restock","shelves"].map(group=>rows("ShopUpgrade").find(r=>r.group===group&&numeric(r,"tier")===(state.upgrades[group]??0)+1)??rows("ShopUpgrade").filter(r=>r.group===group).slice(-1)[0]):rows("ShopGoods");
    const cards=uiNode(root,"Rows").children,pages=Math.max(1,Math.ceil(all.length/cards.length));this.page=Math.min(this.page,pages-1);uiText(root,"Pagination",`${this.page+1}/${pages}`);
    uiNode(root,"Previous").active=this.page>0;uiNode(root,"Next").active=this.page<pages-1;bind(uiNode(root,"Previous"),()=>this.page--);bind(uiNode(root,"Next"),()=>this.page++);
    cards.forEach((card,i)=>{const row=all[this.page*cards.length+i];card.active=Boolean(row);if(!row)return;let image="",name="",description="",caption="",enabled=false,action=()=>{};
      if(this.tab==="staff"){
        const staff=rows("Staff").find(s=>s.key===row.staffKey)!,owned=state.hired.includes(row.key),unlocked=numeric(staff,"unlockLevel")<=cleared+1;image="menu:"+row.staffKey;name=text(staff.name);description=text(row.descriptionKey);caption=owned?text("shop.hired"):!unlocked?text("shop.locked",staff.unlockLevel):text("shop.hire",row.cost);enabled=!owned&&unlocked&&state.coins>=numeric(row,"cost");action=()=>{if(!service.hire(row.key))this.notify(text("shop.purchaseDenied"));};
      }else if(this.tab==="upgrade"){
        const max=(state.upgrades[row.group]??0)>=numeric(row,"tier");image="menu:"+(row.group==="checkout"?"goods_cola":row.group==="restock"?"goods_bread":"goods_rice");name=text("shop.tier",text(row.nameKey),state.upgrades[row.group]??0);description=text(row.descriptionKey);caption=max?text("shop.max"):text("shop.upgrade",row.cost);enabled=!max&&state.coins>=numeric(row,"cost");action=()=>{if(!service.upgrade(row.key))this.notify(text("shop.purchaseDenied"));};
      }else{
        const good=rows("Goods").find(g=>g.key===row.goodsKey)!,unlocked=numeric(row,"unlockAfter")<=cleared,current=state.shelves[this.targetShelf].goods===row.key;image="menu:"+good.imageKey;name=text(good.nameKey);description=text("shop.price",row.price);caption=!unlocked?text("shop.goodsLocked",row.unlockAfter):current?text("shop.currentGoods"):text("shop.pickGoods");enabled=unlocked&&!current;action=()=>{service.assign(this.targetShelf,row.key);};
      }
      this.image(uiNode(card,"Icon"),image);uiText(card,"Name",name);uiText(card,"Description",description);uiText(card,"Buy/Text",caption);this.skin(uiNode(card,"Buy"),enabled?"button_gold":"button_disabled");if(enabled)bind(uiNode(card,"Buy"),action);
    });
  }
  private workers():void {
    const sim=ShopService.shared.simulation!,s=sim.state,rotation=Math.floor(s.elapsed/shopNumber("staffRotateSeconds"));
    for(let i=0;i<shopNumber("visibleStaff");i++){const node=uiNode(this.root,"Floor/Worker"+i);node.active=i<s.hired.length;if(!node.active)continue;const key=s.hired[(i+rotation)%s.hired.length];this.image(node,"menu:"+sim.config.staff.find(r=>r.key===key)!.staffKey);let p=this.point("worker"+i);if(i===1&&s.restockShelf>=0){const target=this.point("shelf"+s.restockShelf),offset=this.point("restockOffset");p={x:target.x+offset.x,y:target.y+offset.y};}node.setPosition(p.x,p.y);}
  }
  private along(points:Point[],f:number):Point{
    const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)),total=lengths.reduce((a,b)=>a+b,0);let distance=Math.max(0,Math.min(1,f))*total;
    for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]&&lengths[i]>0){const t=distance/lengths[i];return{x:points[i].x+(points[i+1].x-points[i].x)*t,y:points[i].y+(points[i+1].y-points[i].y)*t};}distance-=lengths[i];}return points[points.length-1];
  }
  private customerPosition(c:ShopCustomer):Point {
    const s=ShopService.shared.state!,entry=this.point("entry"),lane=this.point("entryLane"),atShelf=this.point("shelf"+Math.min(c.shelf,s.shelves.length-1)),offset=this.point("browseOffset"),shelf={x:atShelf.x+offset.x,y:atShelf.y+offset.y},checkout=this.point("checkout"),checkoutLane=this.point("checkoutLane"),exit=this.point("exit"),queue=this.point("queue"),step=this.point("queueStep"),now=s.elapsed+s.remainder;
    const f=Math.max(0,Math.min(1,1-(c.remaining-s.remainder)/c.duration));let motion=this.motions.get(c.id);
    const index=s.customers.filter(x=>x.phase==="queue").findIndex(x=>x.id===c.id),target=c.phase==="queue"?{x:queue.x+step.x*index,y:queue.y+step.y*index}:checkout;
    if(!motion){motion={phase:c.phase,start:c.phase==="exit"?checkout:c.phase==="queue"?shelf:target,at:now,position:target};this.motions.set(c.id,motion);}
    if(motion.phase!==c.phase){motion.start=motion.position;motion.at=now;motion.phase=c.phase;}
    let p:Point;
    if(c.phase==="enter")p=this.along([entry,lane,{x:lane.x,y:shelf.y},shelf],f);
    else if(c.phase==="browse")p=shelf;
    else if(c.phase==="exit")p=this.along([motion.start,{x:lane.x,y:motion.start.y},lane,exit],f);
    else p=this.along([motion.start,{x:lane.x,y:motion.start.y},{x:lane.x,y:target.y},target],(now-motion.at)/shopNumber("customerWalkSeconds"));
    motion.position=p;return p;
  }
}
