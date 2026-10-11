import {ShopPresentation} from "./ShopPresentation";
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
  private readonly presentation=new ShopPresentation(key=>this.point(key),shopNumber);
  private saleAt=-Infinity;
  constructor(private readonly root:Node,private readonly assets:UiPrefabs){}
  get isOverlayOpen():boolean{return this.mode!=="closed";}
  open(fresh:boolean):void {this.mode="closed";this.page=0;this.targetShelf=0;this.presentation.reset();this.saleAt=-Infinity;this.lastSold=ShopService.shared.state?.sold??0;if(fresh)this.notify(text("shop.welcome",shopNumber("welcomeCoins")));}
  private details(tab:ShopTab):void{this.mode="details";this.tab=tab;this.page=0;}
  private notify(message:string):void {this.notification=message;this.notificationUntil=Date.now()+shopNumber("saveSeconds")*1000;}
  private image(node:Node,key:string):void {if(this.images.get(node)===key)return;this.images.set(node,key);this.assets.bindImage(node,key);}
  private skin(node:Node,key:string):void{this.assets.bindSkin(uiNode(node,"Artwork").getComponent(Sprite)!,key);}
  private point(key:string):Point {const r=this.points.get(key)!;return{x:numeric(r,"x"),y:numeric(r,"y")};}
  render(bind:(node:Node,action:()=>void)=>void):void {
    const service=ShopService.shared,sim=service.simulation;if(!sim)return;const state=sim.state;
    if(service.offlineIncome>0){this.lastSold=state.sold;this.saleAt=-Infinity;this.notify(text("shop.offline",service.offlineIncome));service.offlineIncome=0;}
    else if(state.sold!==this.lastSold){this.lastSold=state.sold;this.saleAt=state.elapsed+state.remainder;this.notify(text("shop.sold",sim.lastSale));}
    uiText(this.root,"Wallet/Text",text("shop.balance",state.coins));uiText(this.root,"Summary",text("shop.summary",state.sold));uiText(this.root,"Receipt",Date.now()<this.notificationUntil?this.notification:"");
    for(let i=0;i<shopNumber("maxShelves");i++){
      const node=uiNode(this.root,"Floor/Shelf"+i),s=state.shelves[i],products=uiNode(node,"Products");products.active=Boolean(s);
      if(s){const good=rows("Goods").find(g=>g.key===s.goods)!;products.children.forEach((unit,j)=>{unit.active=j<s.stock;this.skin(unit,good.imageKey);});uiText(node,"Stock",text("shop.inventory",s.stock,shopNumber("shelfCapacity")));uiText(node,"Name",text(good.nameKey));}
      else{uiText(node,"Stock","");uiText(node,"Name",text("shop.closedShelf"));}
      if(!this.isOverlayOpen)bind(node,()=>{this.targetShelf=i;this.details(s?"goods":"upgrade");});
    }
    this.workers();
    for(let i=0;i<shopNumber("customerLimit");i++){
      const node=uiNode(this.root,"Floor/Customer"+i),c=state.customers[i];node.active=Boolean(c);if(!c)continue;
      this.image(node,sim.config.customers.find(t=>t.key===c.kind)!.imageKey);const pose=this.presentation.customer(c,state);node.setPosition(pose.position.x,pose.position.y+pose.bob);node.setScale(pose.scale,1/pose.scale);
      const basket=uiNode(node,"Basket"),pickup=uiNode(node,"Pickup"),progress=uiNode(node,"CheckoutProgress");basket.active=c.basket.length>0;pickup.active=basket.active&&pose.pickup>0;
      if(pickup.active){const good=rows("Goods").find(g=>g.key===c.basket[0])!;this.skin(pickup,good.imageKey);const base=rows("UiLayout").find(r=>r.key==="shop:Floor/Customer"+i+"/Pickup")!;pickup.setPosition(numeric(base,"x"),numeric(base,"y")+pose.pickup*shopNumber("pickupLift"));pickup.setScale(pose.pickup,pose.pickup);}
      progress.active=pose.progress>=0;uiNode(progress,"Fill").setScale(Math.max(0,pose.progress),1);
    }
    this.presentation.prune(state.customers.map(c=>c.id));this.saleFeedback();
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
    const sim=ShopService.shared.simulation!,s=sim.state,now=s.elapsed+s.remainder,rotation=Math.floor(s.elapsed/shopNumber("staffRotateSeconds")),restocker=s.hired.length>1?1:0;
    for(let i=0;i<shopNumber("visibleStaff");i++){
      const node=uiNode(this.root,"Floor/Worker"+i);node.active=i<s.hired.length;if(!node.active)continue;
      const key=s.hired[(i+rotation)%s.hired.length];this.image(node,"menu:"+sim.config.staff.find(r=>r.key===key)!.staffKey);let target=this.point("worker"+i);const restocking=i===restocker&&s.restockShelf>=0;
      if(restocking){const shelf=this.point("shelf"+s.restockShelf),offset=this.point("restockOffset");target={x:shelf.x+offset.x,y:shelf.y+offset.y};}
      const pose=this.presentation.worker(i,target,now);node.setPosition(pose.position.x,pose.position.y+pose.bob);node.setScale(pose.scale,1/pose.scale);uiNode(node,"Carry").active=restocking;
      const checking=i===0&&!restocking&&s.customers.some(c=>c.phase==="checkout"),work=uiNode(node,"Work");work.active=(restocking&&!pose.moving)||checking;uiText(work,"Text",text(restocking?"shop.restocking":"shop.checkingOut"));
    }
  }
  private saleFeedback():void{
    const state=ShopService.shared.state!,effect=uiNode(this.root,"SaleEffect"),fraction=(state.elapsed+state.remainder-this.saleAt)/shopNumber("saleFlightSeconds");effect.active=fraction>=0&&fraction<1;if(!effect.active)return;
    const start=this.point("checkoutEffect"),end=this.point("walletEffect"),f=1-(1-fraction)**2;effect.setPosition(start.x+(end.x-start.x)*f,start.y+(end.y-start.y)*f+Math.sin(fraction*Math.PI)*shopNumber("saleArcHeight"));effect.setScale(1-fraction*shopNumber("saleShrinkRatio"),1-fraction*shopNumber("saleShrinkRatio"));uiNode(effect,"Amount").active=fraction<shopNumber("saleTextHideFraction");uiText(effect,"Amount",text("shop.sold",ShopService.shared.simulation!.lastSale));
  }
  private along(points:Point[],fraction:number):Point{return this.presentation.along(points,fraction);}

}
