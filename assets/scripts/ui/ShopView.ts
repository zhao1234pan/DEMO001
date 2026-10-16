import {CollectionScrollState} from "./CollectionScrollState";
import {ShopPresentation} from "./ShopPresentation";
import { Node, Sprite, UITransform } from "cc";
import { numeric, rows, text, globalNumber, TableRow } from "../config/ConfigTables";
import { ShopService, shopClearedLevel, shopNumber } from "../services/ShopService";
import { UiPrefabs, uiNode, uiText, uiRect } from "./UiPrefabs";
import { ShopCustomer } from "../gameplay/shop/ShopSimulation";

type ShopTab="staff"|"upgrade"|"goods"|"research"|"uniform";
type Point={x:number;y:number};
/** 页面只投影经营状态，不通过动画或点击发放收益。 */
export class ShopView {
  private tab:ShopTab="staff";
  private mode:"closed"|"details"|"picker"|"shelves"="closed";
  private pickerReturn:"closed"|"shelves"="closed";
  private page=0;
  private readonly scroll=new CollectionScrollState();
  private targetShelf=0;
  private notification="";
  private notificationUntil=0;
  private lastSold=0;
  private readonly images=new Map<Node,string>();
  private readonly layout=new Map(rows("UiLayout").filter(r=>r.prefab==="shop").map(r=>[r.node,r]));
  private readonly points=new Map(rows("ShopPoint").map(r=>[r.key,r]));
  private readonly presentation=new ShopPresentation(key=>this.point(key),shopNumber);
  private saleAt=-Infinity;
  constructor(private readonly root:Node,private readonly assets:UiPrefabs){}
  get isOverlayOpen():boolean{return this.mode!=="closed";}
  open(fresh:boolean):void {this.mode="closed";this.pickerReturn="closed";this.page=0;this.targetShelf=0;this.presentation.reset();this.scroll.set(0);this.saleAt=-Infinity;this.lastSold=ShopService.shared.state?.sold??0;if(fresh)this.notify(text("shop.welcome",shopNumber("welcomeCoins")));}
  /** 页头和底栏贴可见安全区，营业场景与弹窗保留配置比例。 */
  fitViewport(top:number,bottom:number):void{
    const height=this.root.getComponent(UITransform)!.height;
    for(const path of ["Header","Back","Title","Wallet","SummaryPlate","Summary","ReceiptPlate","Receipt","Navigation"]){const r=this.layout.get(path)!;uiNode(this.root,path).setPosition(numeric(r,"x"),numeric(r,"y")+(path==="Navigation"?height-bottom:-top));}
    const floor=uiNode(this.root,"Floor").getComponent(UITransform)!,base=this.layout.get("Floor")!;floor.setContentSize(numeric(base,"width"),numeric(base,"height")+Math.max(0,bottom-top-height));
  }
  private details(tab:ShopTab):void{this.mode="details";this.tab=tab;this.page=0;}
  private notify(message:string):void {this.notification=message;this.notificationUntil=Date.now()+shopNumber("saveSeconds")*1000;}
  private image(node:Node,key:string):void {if(this.images.get(node)===key)return;this.images.set(node,key);this.assets.bindImage(node,key);}
  private skin(node:Node,key:string):void{this.assets.bindSkin(uiNode(node,"Artwork").getComponent(Sprite)!,key);}
  private point(key:string):Point {const r=this.points.get(key)!;return{x:numeric(r,"x"),y:numeric(r,"y")};}
  render(bind:(node:Node,action:()=>void)=>void):void {
    const service=ShopService.shared,sim=service.simulation;if(!sim)return;const state=sim.state;
    if(service.offlineIncome>0){this.lastSold=state.sold;this.saleAt=-Infinity;this.notify(text("shop.offline",service.offlineIncome));service.offlineIncome=0;}
    else if(state.sold!==this.lastSold){this.lastSold=state.sold;if(sim.lastSale>0){this.saleAt=state.elapsed+state.remainder;this.notify(text("shop.sold",sim.lastSale));}}
    if(sim.lastSale<=0)this.saleAt=-Infinity;
    uiText(this.root,"Wallet/Text",text("shop.balance",state.coins));uiText(this.root,"Summary",text("shop.stageSummary",text(sim.stage.nameKey),state.sold));uiText(this.root,"Receipt",Date.now()<this.notificationUntil?this.notification:"");uiNode(this.root,"ReceiptPlate").active=Date.now()<this.notificationUntil&&Boolean(this.notification);
    for(let i=0;i<shopNumber("maxShelves");i++){
      const node=uiNode(this.root,"Floor/Content/Shelf"+i),s=state.shelves[i],products=uiNode(node,"Products");node.active=Boolean(s)||i===state.shelves.length;products.active=Boolean(s);
      if(s){const good=rows("Goods").find(g=>g.key===s.goods)!;products.children.forEach((unit,j)=>{unit.active=j<Math.ceil(s.stock/sim.capacity*products.children.length);this.skin(unit,good.imageKey);});uiText(node,"Stock",text("shop.inventory",s.stock,sim.capacity));uiText(node,"Name",text(good.nameKey));this.skin(uiNode(node,"GoodMark"),good.imageKey);uiNode(node,"GoodMark").active=true;}
      else{uiText(node,"Stock","");uiText(node,"Name",text("shop.closedShelf"));uiNode(node,"GoodMark").active=false;}
      if(!this.isOverlayOpen)bind(node,()=>{this.targetShelf=i;this.pickerReturn="closed";if(s)this.mode="picker";else this.details("upgrade");});
    }
    const viewport=uiNode(this.root,"Floor").getComponent(UITransform)!.height,extra=viewport-shopNumber("shopViewportHeight");this.scroll.resize(shopNumber("shopViewportHeight")+Math.max(0,Math.ceil(state.shelves.length/2)-2)*shopNumber("shopRowHeight")+extra/2,viewport);uiNode(this.root,"Floor/Content").setPosition(0,this.scroll.offset);uiNode(this.root,"Floor/Content/Checkout2").active=sim.stage.checkouts>1;
    this.workers();
    for(let i=0;i<shopNumber("customerLimit");i++){
      const node=uiNode(this.root,"Floor/Content/Customer"+i),c=state.customers[i];node.active=Boolean(c);if(!c)continue;
      this.image(node,sim.config.customers.find(t=>t.key===c.kind)!.imageKey);const pose=this.presentation.customer(c,state,viewport);node.setPosition(pose.position.x,pose.position.y+pose.bob);node.setScale(pose.scale,1/pose.scale);
      const basket=uiNode(node,"Basket"),pickup=uiNode(node,"Pickup"),progress=uiNode(node,"CheckoutProgress");basket.active=c.basket.length>0;pickup.active=basket.active&&pose.pickup>0;
      if(pickup.active){const good=rows("Goods").find(g=>g.key===c.basket[0])!;this.skin(pickup,good.imageKey);const base=rows("UiLayout").find(r=>r.key==="shop:Floor/Content/Customer"+i+"/Pickup")!;pickup.setPosition(numeric(base,"x"),numeric(base,"y")+pose.pickup*shopNumber("pickupLift"));pickup.setScale(pose.pickup,pose.pickup);}
      progress.active=pose.progress>=0;uiNode(progress,"Fill").setScale(Math.max(0,pose.progress),1);
    }
    this.presentation.prune(state.customers.map(c=>c.id));this.saleFeedback();
    // 地面节点都以脚底为深度依据；角色走到货架前后时，遮挡关系随位置更新。
    uiNode(this.root,"Floor/Content").children.slice().sort((a,b)=>Number(!a.name.startsWith("FloorTile"))-Number(!b.name.startsWith("FloorTile"))||b.position.y-a.position.y).forEach((n,i)=>n.setSiblingIndex(i));
    const overlay=uiNode(this.root,"ShopOverlay");overlay.active=this.isOverlayOpen;
    if(!this.isOverlayOpen){
      for(const [path,tab]of [["Staff","staff"],["Upgrade","upgrade"],["Research","research"],["Uniform","uniform"]]as const)bind(uiNode(this.root,"Navigation/"+path),()=>this.details(tab));
      bind(uiNode(this.root,"Navigation/Goods"),()=>{this.mode="shelves";});return;
    }
    const details=uiNode(overlay,"Details"),picker=uiNode(overlay,"GoodsPicker"),shelves=uiNode(overlay,"ShelfPicker");
    details.active=this.mode==="details";picker.active=this.mode==="picker";shelves.active=this.mode==="shelves";
    if(picker.active){this.renderPicker(picker,bind);bind(uiNode(picker,"Back"),()=>{this.mode=this.pickerReturn;});bind(uiNode(picker,"Close"),()=>{this.mode="closed";});bind(uiNode(picker,"Panel"),()=>{});}
    else if(shelves.active){this.renderShelves(shelves,bind);bind(uiNode(shelves,"Back"),()=>{this.mode="closed";});bind(uiNode(shelves,"Close"),()=>{this.mode="closed";});bind(uiNode(shelves,"Panel"),()=>{});}
    else{this.renderDetails(details,bind);bind(uiNode(details,"Back"),()=>{this.mode="closed";});bind(uiNode(details,"Close"),()=>{this.mode="closed";});bind(uiNode(details,"Panel"),()=>{});}
    // 弹窗操作优先，其次面板空白、最后遮罩；底部入口不绑定，避免穿透到另一页。
    bind(uiNode(overlay,"Dim"),()=>{this.mode="closed";});
  }
  private renderShelves(root:Node,bind:(node:Node,action:()=>void)=>void):void {
    const sim=ShopService.shared.simulation!;
    const cards=Array.from(this.layout.values()).filter(r=>/^ShopOverlay\/ShelfPicker\/Shelf\d+$/.test(r.node)),columns=new Set(cards.map(r=>r.x)).size,gap=Math.abs(numeric(cards[columns],"y")-numeric(cards[0],"y")),shrink=(Math.ceil(cards.length/columns)-Math.ceil(sim.state.shelves.length/columns))*gap;
    const panel=uiNode(root,"Panel").getComponent(UITransform)!,base=this.layout.get("ShopOverlay/ShelfPicker/Panel")!;panel.setContentSize(numeric(base,"width"),numeric(base,"height")-shrink);
    for(const name of["Title","Back","Close"]){const r=this.layout.get("ShopOverlay/ShelfPicker/"+name)!;uiNode(root,name).setPosition(numeric(r,"x"),numeric(r,"y")-shrink/2);}
    uiNode(root,"Shelf0").parent!.children.filter(n=>/^Shelf\d+$/.test(n.name)).forEach((card,i)=>{
      const shelf=sim.state.shelves[i];card.active=Boolean(shelf);if(!shelf)return;const position=this.layout.get("ShopOverlay/ShelfPicker/"+card.name)!;card.setPosition(numeric(position,"x"),numeric(position,"y")-shrink/2);
      const good=rows("Goods").find(g=>g.key===shelf.goods)!;this.skin(uiNode(card,"Icon"),good.imageKey);
      uiText(card,"Name",text("shop.shelfPick",i+1,text(good.nameKey)));uiText(card,"Stock",text("shop.inventory",shelf.stock,sim.capacity));
      bind(uiNode(card,"Pick"),()=>{this.targetShelf=i;this.pickerReturn="shelves";this.mode="picker";});
    });
  }
  private renderPicker(root:Node,bind:(node:Node,action:()=>void)=>void):void {
    const service=ShopService.shared,sim=service.simulation!,s=sim.state;this.targetShelf=Math.min(this.targetShelf,s.shelves.length-1);uiText(root,"Title",text("shop.goodsTitle",this.targetShelf+1));
    rows("ShopGoods").forEach((r,i)=>{
      const card=uiNode(root,"Good"+i),g=rows("Goods").find(g=>g.key===r.goodsKey)!,unlocked=numeric(r,"unlockAfter")<=shopClearedLevel(),selected=s.shelves[this.targetShelf].goods===r.key;
      this.skin(card,"shop_goods_card_v2");this.skin(uiNode(card,"Icon"),g.imageKey);uiNode(card,"Icon/Artwork").getComponent(Sprite)!.grayscale=!unlocked;
      this.skin(uiNode(card,"Pick"),unlocked&&!selected?"button_green":"button_disabled");
      uiText(card,"Name",text(g.nameKey));uiText(card,"Price",text("shop.price",sim.price(r.key)));uiText(card,"Status",!unlocked?text("shop.goodsLocked",r.unlockAfter):selected?text("shop.picked"):text("shop.pickGoods"));
      if(unlocked&&!selected)bind(uiNode(card,"Pick"),()=>{if(service.assign(this.targetShelf,r.key))this.mode="closed";});
    });
  }
  private improvementValue(group:string,tier:number):string {
    const sim=ShopService.shared.simulation!,v=sim.value(group,tier),r=sim.config.rules,round=(n:number)=>Number(n.toFixed(1));
    if(group==="checkout")return text("shop.unit.seconds",round(r.checkoutSeconds/(1+v+sim.effect("checkout")+(sim.hasRole("pack")?r.packSpeed:0))));
    if(group==="restock")return text("shop.unit.restock",round((r.restockSeconds+r.walkRestockSeconds+r.workerTaskSeconds)/(1+v+sim.effect("restock")+(sim.hasRole("tidy")?r.tidySpeed:0))),r.restockCarry+Math.floor(v));
    if(group==="capacity")return text("shop.unit.capacity",r.shelfCapacity+v);
    if(group==="attraction"){const factor=r.arrivalSeconds/sim.arrivalSeconds-sim.value(group)+v;return text("shop.unit.arrival",round(r.arrivalSeconds/factor));}
    if(group==="service")return text("shop.unit.service",Math.round(Math.min(r.serviceMaxChance,sim.config.customers.reduce((sum,c)=>sum+c.weight*c.doubleChance,0)/sim.config.customers.reduce((sum,c)=>sum+c.weight,0)+sim.effect("double")+v)*100));
    const shelves=tier?v:r.initialShelves;return text("shop.unit.shelves",shelves,sim.config.stages.filter(s=>s.shelves<=shelves).slice(-1)[0].checkouts);
  }
  private renderDetails(root:Node,bind:(node:Node,action:()=>void)=>void):void {
    const service=ShopService.shared,sim=service.simulation!,state=sim.state,cleared=shopClearedLevel();
    uiText(root,"Title",text({staff:"shop.staffMenu",upgrade:"shop.upgradeMenu",goods:"shop.goodsMenu",research:"shop.researchMenu",uniform:"shop.uniformMenu"}[this.tab]));uiText(root,"Balance",text("shop.coins",state.coins));uiNode(root,"ShelfTabs").active=false;
    const all:TableRow[]=this.tab==="staff"?rows("ShopStaff"):this.tab==="upgrade"?["shelves","checkout","restock","capacity","attraction","service"].map(group=>rows("ShopUpgrade").find(r=>r.group===group&&numeric(r,"tier")===(state.upgrades[group]??0)+1)??rows("ShopUpgrade").filter(r=>r.group===group).slice(-1)[0]):this.tab==="uniform"?rows("ShopUniform"):this.tab==="goods"?state.shelves.map((s,i)=>({...rows("ShopGoods").find(g=>g.key===s.goods)!,shelf:String(i)})):rows("ShopGoods");
    const cards=uiNode(root,"Rows").children,pages=Math.max(1,Math.ceil(all.length/cards.length));this.page=Math.min(this.page,pages-1);uiText(root,"Pagination",text("shop.page",this.page+1,pages));uiNode(root,"Previous").active=true;uiNode(root,"Next").active=true;this.skin(uiNode(root,"Previous"),this.page>0?"button_green":"button_disabled");this.skin(uiNode(root,"Next"),this.page<pages-1?"button_green":"button_disabled");if(this.page>0)bind(uiNode(root,"Previous"),()=>this.page--);if(this.page<pages-1)bind(uiNode(root,"Next"),()=>this.page++);
    cards.forEach((card,i)=>{const row=all[this.page*cards.length+i];card.active=Boolean(row);if(!row)return;let image="",name="",description="",caption="",enabled=false,action=()=>{};
      if(this.tab==="staff"){
        const staff=rows("Staff").find(s=>s.key===row.staffKey)!,owned=state.hired.includes(row.key),unlocked=numeric(staff,"unlockLevel")<=cleared+1;image="skin:"+sim.config.uniforms.find(u=>u.staffKey===row.staffKey)!.imageKey;name=text(staff.name);description=text("shop.shift",text(row.roleKey))+"\n"+text(row.descriptionKey);caption=owned?text("shop.hired"):!unlocked?text("shop.locked",staff.unlockLevel):text("shop.coins",row.cost);enabled=!owned&&unlocked&&state.coins>=numeric(row,"cost");action=()=>{service.hire(row.key);};
      }else if(this.tab==="upgrade"){
        const current=state.upgrades[row.group]??0,max=current>=numeric(row,"tier"),model=sim.config.upgrades.find(r=>r.key===row.key)!,cap=sim.stage[(row.group+"Cap")as keyof typeof sim.stage],locked=row.group!=="shelves"&&typeof cap==="number"&&numeric(row,"tier")>cap||state.shelves.length<numeric(row,"minShelves"),nextStage=sim.config.stages.find(s=>s.shelves>=numeric(row,"minShelves")&&(row.group==="shelves"||Number(s[(row.group+"Cap")as keyof typeof s])>=numeric(row,"tier")));
        image="skin:"+row.imageKey;name=text("shop.tier",text(row.nameKey),current);description=this.improvementValue(row.group,current)+(max?"":"\n"+text("shop.compare","",this.improvementValue(row.group,numeric(row,"tier"))).trim());caption=max?text("shop.max"):locked?text("shop.needStage",text(nextStage!.nameKey)):state.sold<numeric(row,"minSold")?text("shop.needSold",state.sold,row.minSold):text("shop.coins",row.cost);enabled=!max&&sim.canUpgrade(model);action=()=>{service.upgrade(row.key);};
      }else if(this.tab==="uniform"){
        const staff=rows("Staff").find(s=>s.key===row.staffKey)!,owned=state.uniforms.includes(row.key),hired=state.hired.includes(row.staffKey);image="skin:"+row.imageKey;name=text(staff.name);description=text("shop.uniformDescription");caption=owned?text(state.equipped.includes(row.key)?"shop.uniformTakeOff":"shop.uniformWear"):!hired?text("shop.staffMenu"):text("shop.coins",row.cost);enabled=owned||hired&&state.coins>=numeric(row,"cost");action=()=>{if(owned)service.equip(row.key);else service.buyUniform(row.key);};
      }else{
        const good=rows("Goods").find(g=>g.key===row.goodsKey)!,unlocked=numeric(row,"unlockAfter")<=cleared;image="menu:"+good.imageKey;name=text(good.nameKey);
        if(this.tab==="goods"){const index=Number(row.shelf);name=text("shop.shelfPick",index+1,text(good.nameKey));description=text("shop.inventory",state.shelves[index].stock,sim.capacity);caption=text("shop.shelfChoose");enabled=true;action=()=>{this.targetShelf=index;this.mode="picker";};}
        else{const tier=state.research[row.key]??0,next=sim.config.research.find(r=>r.goodsKey===row.key&&r.tier===tier+1);name=text("shop.tier",text(good.nameKey),tier);description=text("shop.researchInfo",sim.price(row.key),sim.price(row.key,next?.tier??tier),state.sales[row.key]??0);caption=!unlocked?text("shop.goodsLocked",row.unlockAfter):!next?text("shop.max"):state.shelves.length<next.minShelves?text("shop.needStage",text(sim.config.stages.find(s=>s.shelves===next.minShelves)!.nameKey)):text("shop.coins",next.cost);enabled=Boolean(unlocked&&next&&state.shelves.length>=next.minShelves&&state.coins>=next.cost);action=()=>{service.research(next!.key);};}
      }
      this.image(uiNode(card,"Icon"),image);uiText(card,"Name",name);uiText(card,"Description",description);uiText(card,"Buy/Text",caption);this.skin(uiNode(card,"Buy"),enabled?"button_green":"button_disabled");if(enabled)bind(uiNode(card,"Buy"),action);
    });
  }
  private workers():void {
    const sim=ShopService.shared.simulation!,s=sim.state,now=s.elapsed+s.remainder;
    sim.config.staff.forEach((employee,i)=>{
      const node=uiNode(this.root,"Floor/Content/Worker"+i);node.active=s.hired.includes(employee.key);if(!node.active)return;this.image(node,s.equipped.includes(employee.key)?"skin:"+sim.config.uniforms.find(u=>u.staffKey===employee.staffKey)!.imageKey:"menu:"+employee.staffKey);
      let target=this.point("worker"+i),job="ready",carry=false;const restock=s.restocks.find(j=>j.employee===employee.key),check=s.customers.find(c=>c.phase==="checkout"&&c.station===(employee.role==="guide"?1:0));
      if(restock){job=restock.phase;carry=job!=="source";if(job==="source")target=this.point("stockroom");else{const p=this.point("shelf"+restock.shelf),o=this.point("restockOffset");target={x:p.x+o.x,y:p.y+o.y};}}
      else if(employee.role==="cashier"||employee.role==="guide"&&sim.checkouts>1){target=this.point(employee.role==="cashier"?"worker0":"cashier2");if(check)job="cashier";}
      else if(employee.role==="pack"){target=this.point("pack");if(s.customers.some(c=>c.phase==="checkout")){job="pack";carry=true;}}
      else if(employee.role==="guide"){const customer=s.customers.find(c=>c.phase==="browse");if(customer){const p=this.point("shelf"+customer.shelf),o=this.point("restockOffset");target={x:p.x+o.x,y:p.y+o.y};job="guide";}else target=this.point("welcome");}
      else if(employee.role==="tidy"){const shelf=Math.floor(now/(shopNumber("workerTaskSeconds")+shopNumber("walkRestockSeconds")))%s.shelves.length,p=this.point("shelf"+shelf),o=this.point("restockOffset");target={x:p.x+o.x,y:p.y+o.y};job="tidy";}
      else if(employee.role==="welcome"){target=this.point("welcome");if(s.customers.some(c=>c.phase==="enter"))job="welcome";}
      else target=this.point("stockroom");
      const pose=this.presentation.worker(i,target,now,restock?.duration??shopNumber("workerWalkSeconds"));node.setPosition(pose.position.x,pose.position.y+pose.bob);node.setScale(pose.scale,1/pose.scale);uiNode(node,"Carry").active=carry&&!s.equipped.includes(employee.key);const work=uiNode(node,"Work");work.active=job!=="ready";uiText(work,"Text",text(`shop.job.${job}`));
    });
  }
  private scrollHit(x:number,y:number,parent:Node,width:number,height:number):boolean {if(this.isOverlayOpen)return false;const r=uiRect(uiNode(this.root,"Floor"),parent,width,height);return x>=r.x&&x<=r.x+r.width&&y>=r.y&&y<=r.y+r.height;}
  beginScroll(x:number,y:number,parent:Node,width:number,height:number):void{this.scroll.end();if(this.scrollHit(x,y,parent,width,height)){const node=uiNode(this.root,"Floor"),scale=uiRect(node,parent,width,height).height/node.getComponent(UITransform)!.height;this.scroll.begin(y/scale);}}
  moveScroll(y:number,parent:Node,width:number,height:number):void{if(this.isOverlayOpen)return;const node=uiNode(this.root,"Floor"),scale=uiRect(node,parent,width,height).height/node.getComponent(UITransform)!.height;this.scroll.move(y/scale,globalNumber("touchTravelTolerance")/scale);}
  endScroll():void{this.scroll.end();}
  wheelScroll(x:number,y:number,amount:number,parent:Node,width:number,height:number):void{if(this.scrollHit(x,y,parent,width,height)){this.scroll.end();this.scroll.set(this.scroll.offset-amount*shopNumber("shopScrollWheel"));}}
  allowPress(node:Node,x:number,y:number,parent:Node,width:number,height:number):boolean {return !node.name.startsWith("Shelf")||this.scrollHit(x,y,parent,width,height);}
  private saleFeedback():void{
    const state=ShopService.shared.state!,effect=uiNode(this.root,"SaleEffect"),fraction=(state.elapsed+state.remainder-this.saleAt)/shopNumber("saleFlightSeconds");effect.active=fraction>=0&&fraction<1;if(!effect.active)return;
    const source=this.point("checkoutEffect"),floor=uiNode(this.root,"Floor"),start={x:source.x,y:source.y+floor.position.y+this.scroll.offset},anchor=this.point("walletEffect"),walletBase=rows("UiLayout").find(r=>r.key==="shop:Wallet")!,end={x:anchor.x,y:anchor.y+uiNode(this.root,"Wallet").position.y-numeric(walletBase,"y")},f=1-(1-fraction)**2;effect.setPosition(start.x+(end.x-start.x)*f,start.y+(end.y-start.y)*f+Math.sin(fraction*Math.PI)*shopNumber("saleArcHeight"));effect.setScale(1-fraction*shopNumber("saleShrinkRatio"),1-fraction*shopNumber("saleShrinkRatio"));uiNode(effect,"Amount").active=fraction<shopNumber("saleTextHideFraction");uiText(effect,"Amount",text("shop.sold",ShopService.shared.simulation!.lastSale));
  }
  private along(points:Point[],fraction:number):Point{return this.presentation.along(points,fraction);}

}
