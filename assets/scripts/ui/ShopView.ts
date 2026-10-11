import { Node, Sprite } from "cc";
import { numeric, rows, text } from "../config/ConfigTables";
import { ShopService, shopClearedLevel, shopNumber } from "../services/ShopService";
import { UiPrefabs, uiNode, uiText } from "./UiPrefabs";
import { ShopCustomer } from "../gameplay/shop/ShopSimulation";
type ShopTab="staff"|"upgrade"|"goods";
/** 页面只投影经营状态，不通过动画或点击发放收益。 */
export class ShopView {
  private tab:ShopTab="staff";
  private page=0;
  private targetShelf=-1;
  private notification="";
  private notificationUntil=0;
  private lastSold=0;
  private readonly images=new Map<Node,string>();
  private readonly points=new Map(rows("ShopPoint").map(r=>[r.key,r]));
  constructor(private readonly root:Node,private readonly assets:UiPrefabs){}
  open(fresh:boolean):void {this.tab="staff";this.page=0;this.targetShelf=-1;this.lastSold=ShopService.shared.state?.sold??0;if(fresh)this.notify(text("shop.welcome",shopNumber("welcomeCoins")));}
  private notify(message:string):void {this.notification=message;this.notificationUntil=Date.now()+shopNumber("saveSeconds")*1000;}
  private image(node:Node,key:string):void {if(this.images.get(node)===key)return;this.images.set(node,key);this.assets.bindImage(node,key);}
  private point(key:string):{x:number;y:number} {const r=this.points.get(key)!;return{x:numeric(r,"x"),y:numeric(r,"y")};}
  render(bind:(node:Node,action:()=>void)=>void):void {
    const service=ShopService.shared,sim=service.simulation;if(!sim)return;const state=sim.state,cleared=shopClearedLevel();
    if(service.offlineIncome>0){this.notify(text("shop.offline",service.offlineIncome));service.offlineIncome=0;}
    else if(state.sold!==this.lastSold){this.lastSold=state.sold;this.notify(text("shop.sold",sim.lastSale));}
    uiText(this.root,"Wallet/Text",text("shop.balance",state.coins));uiText(this.root,"Summary",text("shop.summary",state.sold));uiText(this.root,"Receipt",Date.now()<this.notificationUntil?this.notification:"");
    state.shelves.forEach((s,i)=>{const node=uiNode(this.root,"Floor/Shelf"+i),good=rows("Goods").find(g=>g.key===s.goods)!;node.active=true;uiNode(node,"Icon").active=true;this.assets.bindSkin(uiNode(node,"Icon/Artwork").getComponent(Sprite)!,good.imageKey);uiText(node,"Stock",text("shop.inventory",s.stock,shopNumber("shelfCapacity")));uiText(node,"Name",text(good.nameKey));bind(node,()=>{this.targetShelf=i;this.tab="goods";this.page=0;});});
    for(let i=state.shelves.length;i<shopNumber("maxShelves");i++){const node=uiNode(this.root,"Floor/Shelf"+i);node.active=true;uiNode(node,"Icon").active=false;uiText(node,"Stock",text("shop.closedShelf"));uiText(node,"Name","");bind(node,()=>{this.tab="upgrade";this.page=0;this.targetShelf=-1;});}
    this.workers();
    const slots=uiNode(this.root,"Floor/Customers").children;
    slots.forEach((node,i)=>{const c=state.customers[i];node.active=Boolean(c);if(!c)return;this.image(node,sim.config.customers.find(t=>t.key===c.kind)!.imageKey);const p=this.customerPosition(c);node.setPosition(p.x,p.y);const basket=uiNode(node,"Basket");basket.active=c.basket.length>0;if(basket.active){const good=rows("Goods").find(g=>g.key===c.basket[0])!;this.assets.bindSkin(uiNode(basket,"Artwork").getComponent(Sprite)!,good.imageKey);}});
    for(const [path,tab]of [["StaffTab","staff"],["UpgradeTab","upgrade"],["GoodsTab","goods"]]as const){bind(uiNode(this.root,path),()=>{this.tab=tab;this.page=0;this.targetShelf=-1;});}
    const all=this.tab==="staff"?rows("ShopStaff"):this.tab==="upgrade"?["checkout","restock","shelves"].map(group=>rows("ShopUpgrade").find(r=>r.group===group&&numeric(r,"tier")===(state.upgrades[group]??0)+1)??rows("ShopUpgrade").filter(r=>r.group===group).slice(-1)[0]):rows("ShopGoods");
    const cards=uiNode(this.root,"Slots").children,pages=Math.max(1,Math.ceil(all.length/cards.length));this.page=Math.min(this.page,pages-1);uiText(this.root,"Pagination",`${this.page+1}/${pages}`);
    uiNode(this.root,"Previous").active=this.page>0;uiNode(this.root,"Next").active=this.page<pages-1;bind(uiNode(this.root,"Previous"),()=>this.page--);bind(uiNode(this.root,"Next"),()=>this.page++);
    cards.forEach((card,i)=>{const row=all[this.page*cards.length+i];card.active=Boolean(row);if(!row)return;let image="",name="",description="",caption="",enabled=false,action=()=>{};
      if(this.tab==="staff"){
        const staff=rows("Staff").find(s=>s.key===row.staffKey)!,owned=state.hired.includes(row.key),unlocked=numeric(staff,"unlockLevel")<=cleared+1;image="menu:"+row.staffKey;name=text(staff.name);description=text(row.descriptionKey);caption=owned?text("shop.hired"):!unlocked?text("shop.locked",staff.unlockLevel):text("shop.hire",row.cost);enabled=!owned&&unlocked&&state.coins>=numeric(row,"cost");action=()=>{if(!service.hire(row.key))this.notify(text("shop.purchaseDenied"));};
      }else if(this.tab==="upgrade"){
        const max=(state.upgrades[row.group]??0)>=numeric(row,"tier");image="menu:"+(row.group==="checkout"?"goods_cola":row.group==="restock"?"goods_bread":"goods_rice");name=text("shop.tier",text(row.nameKey),state.upgrades[row.group]??0);description=text(row.descriptionKey);caption=max?text("shop.max"):text("shop.upgrade",row.cost);enabled=!max&&state.coins>=numeric(row,"cost");action=()=>{if(!service.upgrade(row.key))this.notify(text("shop.purchaseDenied"));};
      }else{
        const good=rows("Goods").find(g=>g.key===row.goodsKey)!,unlocked=numeric(row,"unlockAfter")<=cleared;image="menu:"+good.imageKey;name=text(good.nameKey);description=text("shop.price",row.price);caption=!unlocked?text("shop.goodsLocked",row.unlockAfter):this.targetShelf>=0?text("shop.pickGoods"):text("shop.goodsUnlocked");enabled=unlocked&&this.targetShelf>=0;action=()=>{service.assign(this.targetShelf,row.key);this.targetShelf=-1;};
      }
      this.image(uiNode(card,"Icon"),image);uiText(card,"Name",name);uiText(card,"Description",description);uiText(card,"Buy/Text",caption);this.assets.bindSkin(uiNode(card,"Buy/Artwork").getComponent(Sprite)!,enabled?"button_gold":"button_disabled");if(enabled)bind(uiNode(card,"Buy"),action);
    });
  }
  private workers():void {
    const sim=ShopService.shared.simulation!,s=sim.state,workers=uiNode(this.root,"Floor/Workers").children,rotation=Math.floor(s.elapsed/shopNumber("staffRotateSeconds"));
    workers.forEach((node,i)=>{node.active=i<Math.min(shopNumber("visibleStaff"),workers.length,s.hired.length);if(!node.active)return;const key=s.hired[(i+rotation)%s.hired.length];this.image(node,"menu:"+sim.config.staff.find(r=>r.key===key)!.staffKey);let p=this.point("worker"+i);if(i===1&&s.restockShelf>=0){const target=this.point("shelf"+s.restockShelf),offset=this.point("restockOffset");p={x:target.x+offset.x,y:target.y+offset.y};}node.setPosition(p.x,p.y);});
  }
  private customerPosition(c:ShopCustomer):{x:number;y:number} {
    const s=ShopService.shared.state!,entry=this.point("entry"),atShelf=this.point("shelf"+Math.min(c.shelf,s.shelves.length-1)),offset=this.point("browseOffset"),shelf={x:atShelf.x+offset.x,y:atShelf.y+offset.y},checkout=this.point("checkout"),exit=this.point("exit"),queue=this.point("queue"),step=this.point("queueStep");
    const f=Math.max(0,Math.min(1,1-(c.remaining-s.remainder)/c.duration)),lerp=(a:{x:number;y:number},b:{x:number;y:number})=>({x:a.x+(b.x-a.x)*f,y:a.y+(b.y-a.y)*f});
    if(c.phase==="enter")return lerp(entry,shelf);if(c.phase==="browse")return shelf;if(c.phase==="checkout")return checkout;if(c.phase==="exit")return lerp(checkout,exit);
    const i=s.customers.filter(x=>x.phase==="queue").findIndex(x=>x.id===c.id);return{x:queue.x+step.x*i,y:queue.y+step.y*i};
  }
}
