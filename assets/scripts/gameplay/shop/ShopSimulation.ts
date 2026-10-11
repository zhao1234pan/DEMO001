/** 经营只消费独立时钟；渲染、战斗波次和倍速均不能发放收入。 */
export interface ShopRules { [key: string]: number; }
export interface ShopGoods { key: string; goodsKey: string; unlockAfter: number; price: number; category: string; }
export interface ShopEmployee { key: string; staffKey: string; cost: number; effect: string; value: number; unlockLevel: number; }
export interface ShopImprovement { key: string; group: string; tier: number; cost: number; value: number; }
export interface ShopCustomerType { key: string; imageKey: string; weight: number; doubleChance: number; tipChance: number; }
export interface ShopConfig { rules: ShopRules; goods: ShopGoods[]; staff: ShopEmployee[]; upgrades: ShopImprovement[]; customers: ShopCustomerType[]; }
export interface ShopShelf { goods: string; stock: number; }
export interface ShopCustomer { id: number; kind: string; phase: "enter" | "browse" | "queue" | "checkout" | "exit"; remaining: number; duration: number; shelf: number; basket: string[]; quote: number; }
export interface ShopState { version: number; coins: number; lastMs: number; remainder: number; seed: number; elapsed: number; nextArrival: number; nextId: number; sold: number; income: number; hired: string[]; upgrades: Record<string, number>; shelves: ShopShelf[]; customers: ShopCustomer[]; restockShelf: number; restockRemaining: number; }
/** 存档验证与导表共用数据范围，损坏订单不能带进时间推进循环。 */
export function validShopState(c:ShopConfig,s:ShopState):boolean {
  if(!s||s.version!==1||!Number.isSafeInteger(s.coins)||s.coins<0||s.coins>c.rules.coinLimit||!Number.isFinite(s.lastMs)||s.lastMs<0)return false;
  for(const key of ["elapsed","nextArrival","restockRemaining","remainder","income"]as const)if(!Number.isFinite(s[key])||s[key]<0)return false;
  for(const key of ["seed","sold","nextId"]as const)if(!Number.isSafeInteger(s[key])||s[key]<0)return false;
  if(s.remainder>=c.rules.tickSeconds||s.nextId<1||!Array.isArray(s.hired)||new Set(s.hired).size!==s.hired.length||s.hired.some(k=>!c.staff.some(r=>r.key===k))||c.staff.some(r=>r.cost===0&&!s.hired.includes(r.key)))return false;
  if(!s.upgrades||typeof s.upgrades!=="object"||Array.isArray(s.upgrades)||Object.entries(s.upgrades).some(([group,tier])=>!c.upgrades.some(r=>r.group===group&&r.tier===tier)))return false;
  const capacity=c.upgrades.find(r=>r.group==="shelves"&&r.tier===(s.upgrades.shelves??0))?.value??c.rules.initialShelves;
  if(!Array.isArray(s.shelves)||s.shelves.length!==capacity||s.shelves.some(x=>!x||!c.goods.some(g=>g.key===x.goods)||!Number.isInteger(x.stock)||x.stock<0||x.stock>c.rules.shelfCapacity)||!Number.isInteger(s.restockShelf)||s.restockShelf< -1||s.restockShelf>=capacity)return false;
  if(!Array.isArray(s.customers)||s.customers.length>c.rules.customerLimit||new Set(s.customers.map(x=>x?.id)).size!==s.customers.length||s.customers.filter(x=>x?.phase==="checkout").length>1)return false;
  return s.customers.every(x=>x&&Number.isSafeInteger(x.id)&&x.id>0&&x.id<s.nextId&&c.customers.some(r=>r.key===x.kind)&&["enter","browse","queue","checkout","exit"].includes(x.phase)&&Number.isFinite(x.remaining)&&Number.isFinite(x.duration)&&x.duration>0&&Number.isInteger(x.shelf)&&x.shelf>=0&&x.shelf<capacity&&Array.isArray(x.basket)&&x.basket.length<=2&&x.basket.every(k=>c.goods.some(g=>g.key===k))&&Number.isSafeInteger(x.quote)&&x.quote>=0&&(!["queue","checkout"].includes(x.phase)||x.basket.length>0));
}
export function newShopState(config: ShopConfig, now: number, coins = 0, grant = true): ShopState {
  const s: ShopState = {version:1,coins:Math.min(config.rules.coinLimit,coins+(grant?config.rules.welcomeCoins:0)),lastMs:now,remainder:0,seed:Math.floor(now)>>>0,elapsed:0,nextArrival:config.rules.arrivalSeconds,nextId:1,sold:0,income:0,hired:config.staff.filter(r=>r.cost===0).map(r=>r.key),upgrades:{},shelves:[],customers:[],restockShelf:-1,restockRemaining:0};
  for(let i=0;i<config.rules.initialShelves;i++)s.shelves.push({goods:config.goods[i%config.goods.length].key,stock:config.rules.shelfCapacity});
  return s;
}
export class ShopSimulation {
  lastSale = 0;
  constructor(readonly config: ShopConfig, readonly state: ShopState) {}
  private random(): number { this.state.seed=(Math.imul(this.state.seed,1664525)+1013904223)>>>0;return this.state.seed/4294967296; }
  effect(key: string): number {return this.config.staff.filter(r=>this.state.hired.includes(r.key)&&r.effect===key).reduce((n,r)=>n+r.value,0);}
  efficiency(group:string):number {return this.effect(group)+(this.config.upgrades.find(r=>r.group===group&&r.tier===(this.state.upgrades[group]??0))?.value??0);}
  unlockedGoods(cleared:number):ShopGoods[]{return this.config.goods.filter(r=>r.unlockAfter<=cleared);}
  advance(now:number,cleared:number):number {
    const s=this.state;if(!Number.isFinite(now)||now<=s.lastMs)return 0;
    // 累计整数毫秒，确保高帧率拆分和一次离线推进产生完全一致的订单序列。
    const income=s.income,totalMs=Math.round(s.remainder*1000)+Math.min(Math.floor(now-s.lastMs),this.config.rules.offlineSeconds*1000),tickMs=this.config.rules.tickSeconds*1000,ticks=Math.floor(totalMs/tickMs);
    s.lastMs=now;s.remainder=(totalMs-ticks*tickMs)/1000;
    for(let i=0;i<ticks;i++)this.tick(this.config.rules.tickSeconds,cleared);
    return s.income-income;
  }
  private tick(dt:number,cleared:number):void {
    const s=this.state,r=this.config.rules;s.elapsed+=dt;
    // 全店共用一条补货队列。补货免费，库存不足会自动补齐，不要求玩家点货架。
    if(s.restockShelf<0){s.restockShelf=s.shelves.findIndex(x=>x.stock<r.shelfCapacity);if(s.restockShelf>=0)s.restockRemaining=(r.restockSeconds+r.walkRestockSeconds)/(1+this.efficiency("restock"));}
    if(s.restockShelf>=0){s.restockRemaining-=dt;if(s.restockRemaining<=0){s.shelves[s.restockShelf].stock=r.shelfCapacity;s.restockShelf=-1;s.restockRemaining=0;}}
    for(const c of s.customers){
      if(c.phase==="queue")continue;c.remaining-=dt;if(c.remaining>0)continue;
      if(c.phase==="enter"){c.phase="browse";c.duration=c.remaining=r.browseSeconds;}
      else if(c.phase==="browse"){
        const type=this.config.customers.find(t=>t.key===c.kind)!;const count=this.random()<Math.min(1,type.doubleChance+this.effect("double"))?2:1;let price=0;
        for(let i=0;i<count;i++){
          const available=s.shelves.map((x,index)=>({x,index})).filter(v=>v.x.stock>0&&this.unlockedGoods(cleared).some(g=>g.key===v.x.goods));if(!available.length)break;
          const chosen=available[Math.floor(this.random()*available.length)],good=this.config.goods.find(g=>g.key===chosen.x.goods)!;chosen.x.stock--;c.shelf=chosen.index;c.basket.push(good.key);price+=good.price*(1+this.effect(good.category));
        }
        // 拿货时一次取整并锁定价格，之后雇佣或升级不会重算已经入篮的订单。
        c.quote=Math.round(price)+(c.basket.length&&this.random()<Math.min(1,type.tipChance+this.effect("tip"))?r.tipCoins:0);
        if(c.basket.length)c.phase="queue";else{c.phase="exit";c.duration=c.remaining=r.exitSeconds;}
      }else if(c.phase==="checkout"){
        const paid=Math.min(c.quote,r.coinLimit-s.coins);s.coins+=paid;s.income+=paid;s.sold++;this.lastSale=paid;c.phase="exit";c.duration=c.remaining=r.exitSeconds;
      }
    }
    s.customers=s.customers.filter(c=>c.phase!=="exit"||c.remaining>0);
    if(!s.customers.some(c=>c.phase==="checkout")){
      const next=s.customers.find(c=>c.phase==="queue");if(next){next.phase="checkout";next.duration=next.remaining=r.checkoutSeconds/(1+this.efficiency("checkout"));}
    }
    s.nextArrival-=dt;
    if(s.nextArrival<=0){s.nextArrival=r.arrivalSeconds/(1+this.effect("arrival"));if(s.customers.length<r.customerLimit){const total=this.config.customers.reduce((n,c)=>n+c.weight,0);let value=this.random()*total;const type=this.config.customers.find(c=>(value-=c.weight)<0)??this.config.customers[0];s.customers.push({id:s.nextId++,kind:type.key,phase:"enter",remaining:r.enterSeconds,duration:r.enterSeconds,shelf:Math.floor(this.random()*s.shelves.length),basket:[],quote:0});}}
  }
  hire(key:string,unlocked:number):boolean {
    const row=this.config.staff.find(r=>r.key===key),s=this.state;if(!row||s.hired.includes(key)||row.unlockLevel>unlocked||s.coins<row.cost)return false;s.coins-=row.cost;s.hired.push(key);return true;
  }
  upgrade(key:string,cleared:number):boolean {
    const row=this.config.upgrades.find(r=>r.key===key),s=this.state;if(!row||row.tier!==(s.upgrades[row.group]??0)+1||s.coins<row.cost)return false;
    s.coins-=row.cost;s.upgrades[row.group]=row.tier;
    if(row.group==="shelves"){const goods=this.unlockedGoods(cleared);while(s.shelves.length<row.value){const good=goods[s.shelves.length%goods.length];s.shelves.push({goods:good.key,stock:this.config.rules.shelfCapacity});}}
    return true;
  }
  assign(shelf:number,key:string,cleared:number):boolean {const item=this.state.shelves[shelf];if(!item||!this.unlockedGoods(cleared).some(g=>g.key===key))return false;item.goods=key;item.stock=this.config.rules.shelfCapacity;return true;}
}
