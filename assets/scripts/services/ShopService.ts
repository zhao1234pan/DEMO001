import { globalNumber, globalString, numeric, rows } from "../config/ConfigTables";
import { PlatformService } from "./PlatformService";
import { ShopConfig, ShopSimulation, ShopState, newShopState, validShopState, migrateShopState } from "../gameplay/shop/ShopSimulation";
export function shopRule(key:string):string {const r=rows("ShopRule").find(r=>r.key===key);if(!r)throw new Error("Missing shop rule: "+key);return r.value;}
export function shopNumber(key:string):number {return Number(shopRule(key));}
export function shopClearedLevel():number {return Math.max(0,Math.floor(PlatformService.getNumber("night_store_unlocked_level",1))-1);}
export function shopGoodsUnlocked(key:string):boolean {const row=rows("ShopGoods").find(r=>r.goodsKey===key);return Boolean(row&&numeric(row,"unlockAfter")<=shopClearedLevel());}
function config():ShopConfig {
  const rules:Record<string,number>={};for(const r of rows("ShopRule"))if(Number.isFinite(Number(r.value)))rules[r.key]=Number(r.value);
  return {rules,
    goods:rows("ShopGoods").map(r=>({key:r.key,goodsKey:r.goodsKey,unlockAfter:numeric(r,"unlockAfter"),price:numeric(r,"price"),category:r.category,demand:numeric(r,"demand"),attraction:numeric(r,"attraction")})),
    staff:rows("ShopStaff").map(r=>({key:r.key,staffKey:r.staffKey,cost:numeric(r,"cost"),role:r.role,effect:r.effect,value:numeric(r,"value"),unlockLevel:Number(rows("Staff").find(t=>t.key===r.staffKey)!.unlockLevel)})),
    upgrades:rows("ShopUpgrade").map(r=>({key:r.key,group:r.group,tier:numeric(r,"tier"),cost:numeric(r,"cost"),value:numeric(r,"value"),minShelves:numeric(r,"minShelves"),minSold:numeric(r,"minSold")})),
    stages:rows("ShopStage").map(r=>({key:r.key,shelves:numeric(r,"shelves"),checkouts:numeric(r,"checkouts"),checkoutCap:numeric(r,"checkoutCap"),restockCap:numeric(r,"restockCap"),capacityCap:numeric(r,"capacityCap"),attractionCap:numeric(r,"attractionCap"),serviceCap:numeric(r,"serviceCap"),nameKey:r.nameKey})),
    research:rows("ShopResearch").map(r=>({key:r.key,goodsKey:r.goodsKey,tier:numeric(r,"tier"),cost:numeric(r,"cost"),priceRatio:numeric(r,"priceRatio"),minShelves:numeric(r,"minShelves")})),
    uniforms:rows("ShopUniform").map(r=>({key:r.key,staffKey:r.staffKey,cost:numeric(r,"cost"),imageKey:r.imageKey})),
    customers:rows("ShopCustomer").map(r=>({key:r.key,imageKey:r.imageKey,weight:numeric(r,"weight"),doubleChance:numeric(r,"doubleChance"),tipChance:numeric(r,"tipChance")}))};
}
/** 全游戏仅一个实例，经营状态和钱包在同一JSON内写入，避免扣钱与交易结果分开落盘。 */
export class ShopService {
  static readonly shared=new ShopService();
  simulation:ShopSimulation|null=null;
  offlineIncome=0;
  private suspended=false;
  private savedAt=0;
  private constructor(){}
  get state():ShopState|null{return this.simulation?.state??null;}
  boot(now=Date.now()):void {
    if(this.simulation)return;const raw=PlatformService.getString(shopRule("saveKey"),"");if(!raw)return;
    const c=config();let state:ShopState;
    let recoveredCoins=PlatformService.getNumber(globalString("walletSaveKey"),globalNumber("walletInitialCoins"));
    try{state=migrateShopState(c,JSON.parse(raw));if(Number.isSafeInteger(state?.coins)&&state.coins>=0)recoveredCoins=Math.min(state.coins,c.rules.coinLimit);if(!validShopState(c,state))throw new Error("Invalid shop save");}
    catch{state=newShopState(c,now,Number.isSafeInteger(recoveredCoins)&&recoveredCoins>=0?recoveredCoins:0,false);}
    this.simulation=new ShopSimulation(c,state);this.offlineIncome=this.simulation.advance(now,shopClearedLevel());this.save(now);
  }
  open(now=Date.now()):boolean {
    this.boot(now);if(this.simulation)return false;
    const legacy=PlatformService.getNumber(globalString("walletSaveKey"),globalNumber("walletInitialCoins"));this.simulation=new ShopSimulation(config(),newShopState(config(),now,Number.isSafeInteger(legacy)&&legacy>=0?legacy:0));this.save(now);return true;
  }
  update(now=Date.now()):void {if(!this.simulation||this.suspended)return;const income=this.simulation.advance(now,shopClearedLevel());if(income||now-this.savedAt>=shopNumber("saveSeconds")*1000)this.save(now);}
  hide(now=Date.now()):void {this.update(now);this.save(now);this.suspended=true;}
  show(now=Date.now()):void {this.suspended=false;if(!this.simulation)return;this.offlineIncome+=this.simulation.advance(now,shopClearedLevel());this.save(now);}
  hire(key:string):boolean {this.update();const result=this.simulation?.hire(key,shopClearedLevel()+1)??false;if(result)this.save();return result;}
  upgrade(key:string):boolean {this.update();const result=this.simulation?.upgrade(key,shopClearedLevel())??false;if(result)this.save();return result;}
  assign(index:number,key:string):boolean {this.update();const result=this.simulation?.assign(index,key,shopClearedLevel())??false;if(result)this.save();return result;}
  research(key:string):boolean {this.update();const result=this.simulation?.research(key,shopClearedLevel())??false;if(result)this.save();return result;}
  buyUniform(key:string):boolean {this.update();const result=this.simulation?.buyUniform(key)??false;if(result)this.save();return result;}
  equip(key:string):boolean {this.update();const result=this.simulation?.equip(key)??false;if(result)this.save();return result;}
  save(now=Date.now()):void {if(this.state){PlatformService.setString(shopRule("saveKey"),JSON.stringify(this.state));this.savedAt=now;}}
  reset():void {this.simulation=null;this.offlineIncome=0;PlatformService.setString(shopRule("saveKey"),"");PlatformService.setNumber(globalString("walletSaveKey"),globalNumber("walletInitialCoins"));}
}
