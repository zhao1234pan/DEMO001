/** 独立经营时钟。订单锁价、库存预留与购买在同一存档中提交。 */
export interface ShopRules { [key:string]:number; }
export interface ShopGoods {key:string;goodsKey:string;unlockAfter:number;price:number;category:string;demand:number;attraction:number;}
export interface ShopEmployee {key:string;staffKey:string;cost:number;effect:string;value:number;unlockLevel:number;role:string;}
export interface ShopImprovement {key:string;group:string;tier:number;cost:number;value:number;minShelves:number;minSold:number;}
export interface ShopStage {key:string;shelves:number;checkouts:number;checkoutCap:number;restockCap:number;capacityCap:number;attractionCap:number;serviceCap:number;nameKey:string;}
export interface ShopResearch {key:string;goodsKey:string;tier:number;cost:number;priceRatio:number;minShelves:number;}
export interface ShopUniform {key:string;staffKey:string;cost:number;imageKey:string;}
export interface ShopTechnology {key:string;prerequisite:string;cost:number;unlockLevel:number;}
export interface ShopCustomerType {key:string;imageKey:string;weight:number;doubleChance:number;tipChance:number;}
export interface ShopConfig {rules:ShopRules;goods:ShopGoods[];staff:ShopEmployee[];upgrades:ShopImprovement[];customers:ShopCustomerType[];stages:ShopStage[];research:ShopResearch[];uniforms:ShopUniform[];technology?:ShopTechnology[];}
export interface ShopShelfGood {goods:string;stock:number;}
export interface ShopShelf extends ShopShelfGood {extraGoods?:Array<ShopShelfGood|null>;}
/** 首位沿用v3字段；额外商品位是可选扩展，旧存档无需清空或重新发放库存。 */
export function shelfSlot(shelf:ShopShelf,index:number):ShopShelfGood|undefined{return index===0?shelf:shelf.extraGoods?.[index-1]??undefined;}
export function shelfGoods(shelf:ShopShelf):ShopShelfGood[]{return[shelf,...(shelf.extraGoods??[]).filter((g):g is ShopShelfGood=>Boolean(g))];}
export function shelfStock(shelf:ShopShelf):number{return shelfGoods(shelf).reduce((sum,g)=>sum+g.stock,0);}
export function shelfGoodCapacity(shelf:ShopShelf,good:ShopShelfGood,total:number):number{const all=shelfGoods(shelf),index=all.indexOf(good);return Math.floor(total/all.length)+(index<total%all.length?1:0);}
export interface ShopCustomer {id:number;kind:string;phase:'enter'|'browse'|'queue'|'checkout'|'exit';remaining:number;duration:number;shelf:number;basket:string[];quote:number;wants:string[];station:number;}
export interface ShopRestock {employee:string;shelf:number;goods:string;phase:'source'|'travel'|'unload';remaining:number;duration:number;amount:number;}
export interface ShopState {version:number;offlineCreditRemainder:number;coins:number;lastMs:number;remainder:number;seed:number;elapsed:number;nextArrival:number;nextId:number;sold:number;income:number;hired:string[];upgrades:Record<string,number>;shelves:ShopShelf[];customers:ShopCustomer[];restockShelf:number;restockRemaining:number;restocks:ShopRestock[];research:Record<string,number>;sales:Record<string,number>;uniforms:string[];equipped:string[];technology?:Array<{key:string;paid:number}>;}
function capacity(c:ShopConfig,s:ShopState):number{return c.rules.shelfCapacity+(c.upgrades.find(r=>r.group==='capacity'&&r.tier===s.upgrades.capacity)?.value??0);}
function stage(c:ShopConfig,s:ShopState):ShopStage{return c.stages.filter(r=>r.shelves<=s.shelves.length).slice(-1)[0];}
/** 迁移只补齐新增状态，保留余额、所有权、库存、锁价订单及时间戳。 */
export function migrateShopState(c:ShopConfig,input:ShopState):ShopState {
 const s=JSON.parse(JSON.stringify(input)) as ShopState;
 if(s?.version===1){
  s.version=2;s.research={};s.sales={};s.uniforms=[];s.equipped=[];s.restocks=[];
  for(const customer of s.customers??[]){customer.wants=[];customer.station=customer.phase==='checkout'?0:-1;}
  if(s.restockShelf>=0&&s.shelves?.[s.restockShelf]){const shelf=s.shelves[s.restockShelf];s.restocks.push({employee:s.hired?.find(k=>c.staff.some(r=>r.key===k&&['cold','hot','porter'].includes(r.role)))??s.hired?.[0],shelf:s.restockShelf,goods:shelf.goods,phase:'unload',remaining:Math.max(c.rules.tickSeconds,s.restockRemaining),duration:Math.max(c.rules.tickSeconds,s.restockRemaining),amount:Math.max(0,c.rules.shelfCapacity-shelf.stock)});}
 }
 if(s?.version===2){s.version=3;s.offlineCreditRemainder=0;}
 // 科技扩展保持v3经营存档；只清理损坏的科技所有权，不清空商品、库存或余额。
 if(s?.version===3){const input=Array.isArray(s.technology)?s.technology:[],accepted:Array<{key:string;paid:number}>=[];
  let pending=(c.technology??[]).slice();while(pending.length){const remaining:ShopTechnology[]=[];for(const row of pending){const matches=input.filter(v=>v?.key===row.key&&Number.isSafeInteger(v.paid)&&v.paid>0&&v.paid<=c.rules.coinLimit);if(matches.length!==1)continue;if(row.prerequisite&&!accepted.some(v=>v.key===row.prerequisite)){remaining.push(row);continue;}accepted.push({key:row.key,paid:matches[0].paid});}if(remaining.length===pending.length)break;pending=remaining;}s.technology=accepted;}
 return s;
}
export function validShopState(c:ShopConfig,s:ShopState):boolean {
 if(!s||s.version!==3||!Number.isFinite(s.offlineCreditRemainder)||s.offlineCreditRemainder<0||s.offlineCreditRemainder>=1||!Number.isSafeInteger(s.coins)||s.coins<0||s.coins>c.rules.coinLimit||!Number.isFinite(s.lastMs)||s.lastMs<0)return false;
 if(s.technology!==undefined&&(!Array.isArray(s.technology)||new Set(s.technology.map(r=>r?.key)).size!==s.technology.length||s.technology.some(r=>{const row=c.technology?.find(n=>n.key===r?.key);return !row||!Number.isSafeInteger(r.paid)||r.paid<=0||r.paid>c.rules.coinLimit||Boolean(row.prerequisite&&!s.technology!.some(v=>v.key===row.prerequisite));})))return false;
 for(const k of ['elapsed','nextArrival','restockRemaining','remainder','income']as const)if(!Number.isFinite(s[k])||s[k]<0)return false;
 for(const k of ['seed','sold','nextId']as const)if(!Number.isSafeInteger(s[k])||s[k]<0)return false;
 if(s.remainder>=c.rules.tickSeconds||s.nextId<1||!Array.isArray(s.hired)||new Set(s.hired).size!==s.hired.length||s.hired.some(k=>!c.staff.some(r=>r.key===k))||c.staff.some(r=>!r.cost&&!s.hired.includes(r.key)))return false;
 const record=(x:unknown):x is Record<string,number>=>Boolean(x&&typeof x==='object'&&!Array.isArray(x));
 if(!record(s.upgrades)||Object.entries(s.upgrades).some(([g,t])=>!c.upgrades.some(r=>r.group===g&&r.tier===t)))return false;
 const count=c.upgrades.find(r=>r.group==='shelves'&&r.tier===s.upgrades.shelves)?.value??c.rules.initialShelves;
 if(!Array.isArray(s.shelves)||s.shelves.length!==count||s.shelves.some(x=>{
  if(!x||x.extraGoods!==undefined&&(!Array.isArray(x.extraGoods)||x.extraGoods.length>c.rules.shelfGoodsSlots-1||x.extraGoods.some(g=>g!==null&&(!g||typeof g!=='object'))))return true;
  const goods=shelfGoods(x);return goods.some(g=>!c.goods.some(r=>r.key===g.goods)||!Number.isInteger(g.stock)||g.stock<0)||new Set(goods.map(g=>g.goods)).size!==goods.length||shelfStock(x)>capacity(c,s);
 }))return false;
 if(!record(s.research)||Object.entries(s.research).some(([k,t])=>!c.research.some(r=>r.goodsKey===k&&r.tier===t))||!record(s.sales)||Object.entries(s.sales).some(([k,n])=>!c.goods.some(g=>g.key===k)||!Number.isSafeInteger(n)||n<0))return false;
 for(const list of [s.uniforms,s.equipped])if(!Array.isArray(list)||new Set(list).size!==list.length||list.some(k=>!c.uniforms.some(r=>r.key===k)))return false;
 if(s.equipped.some(k=>!s.uniforms.includes(k))||s.uniforms.some(k=>!s.hired.includes(c.uniforms.find(r=>r.key===k)!.staffKey)))return false;
 if(!Array.isArray(s.customers)||s.customers.length>c.rules.customerLimit||new Set(s.customers.map(x=>x?.id)).size!==s.customers.length)return false;
 const stations=s.customers.filter(x=>x?.phase==='checkout').map(x=>x.station);if(new Set(stations).size!==stations.length||stations.some(n=>!Number.isInteger(n)||n<0||n>=stage(c,s).checkouts))return false;
 if(!s.customers.every(x=>x&&Number.isSafeInteger(x.id)&&x.id>0&&x.id<s.nextId&&c.customers.some(r=>r.key===x.kind)&&['enter','browse','queue','checkout','exit'].includes(x.phase)&&Number.isFinite(x.remaining)&&Number.isFinite(x.duration)&&x.duration>0&&Number.isInteger(x.shelf)&&x.shelf>=0&&x.shelf<count&&Array.isArray(x.basket)&&x.basket.length<=2&&x.basket.every(k=>c.goods.some(g=>g.key===k))&&Array.isArray(x.wants)&&x.wants.length<=2&&new Set(x.wants).size===x.wants.length&&x.wants.every(k=>c.goods.some(g=>g.key===k))&&Number.isSafeInteger(x.quote)&&x.quote>=0&&(!['queue','checkout'].includes(x.phase)||x.basket.length>0)))return false;
 if(!Number.isInteger(s.restockShelf)||s.restockShelf< -1||s.restockShelf>=count||!Array.isArray(s.restocks)||new Set(s.restocks.map(j=>j.employee)).size!==s.restocks.length||new Set(s.restocks.map(j=>j.shelf)).size!==s.restocks.length)return false;
 return s.restocks.every(j=>j&&s.hired.includes(j.employee)&&Number.isInteger(j.shelf)&&j.shelf>=0&&j.shelf<count&&shelfGoods(s.shelves[j.shelf]).some(g=>g.goods===j.goods)&&['source','travel','unload'].includes(j.phase)&&Number.isFinite(j.remaining)&&j.remaining>=0&&Number.isFinite(j.duration)&&j.duration>0&&Number.isInteger(j.amount)&&j.amount>=0&&j.amount<=capacity(c,s));
}
export function newShopState(c:ShopConfig,now:number,coins=0,grant=true):ShopState {
 const s:ShopState={version:3,offlineCreditRemainder:0,coins:Math.min(c.rules.coinLimit,coins+(grant?c.rules.welcomeCoins:0)),lastMs:now,remainder:0,seed:Math.floor(now)>>>0,elapsed:0,nextArrival:c.rules.arrivalSeconds,nextId:1,sold:0,income:0,hired:c.staff.filter(r=>!r.cost).map(r=>r.key),upgrades:{},shelves:[],customers:[],restockShelf:-1,restockRemaining:0,restocks:[],research:{},sales:{},uniforms:[],equipped:[],technology:[]};
 const goods=c.goods.filter(g=>!g.unlockAfter);for(let i=0;i<c.rules.initialShelves;i++)s.shelves.push({goods:goods[i%goods.length].key,stock:c.rules.shelfCapacity});return s;
}
export class ShopSimulation {
 lastSale=0;
 constructor(readonly config:ShopConfig,readonly state:ShopState){}
 /** 金币与已购节点属于同一状态，服务层整份保存，避免跨存档扣钱或重复退款。 */
 researchTechnology(key:string,cleared:number):boolean{const row=this.config.technology?.find(r=>r.key===key),owned=this.state.technology??[];if(!row||owned.some(r=>r.key===key)||row.unlockLevel>cleared||row.prerequisite&&!owned.some(r=>r.key===row.prerequisite)||this.state.coins<row.cost)return false;this.state.coins-=row.cost;this.state.technology=[...owned,{key,paid:row.cost}];return true;}
 resetTechnology():number{const owned=this.state.technology??[],refund=owned.reduce((n,r)=>n+r.paid,0);if(!owned.length||this.state.coins+refund>this.config.rules.coinLimit)return 0;this.state.coins+=refund;this.state.technology=[];return refund;}
 private items():Array<{shelf:ShopShelf;good:ShopShelfGood;index:number}>{const all:Array<{shelf:ShopShelf;good:ShopShelfGood;index:number}>=[];this.state.shelves.forEach((shelf,index)=>shelfGoods(shelf).forEach(good=>all.push({shelf,good,index})));return all;}
 private random():number{this.state.seed=(Math.imul(this.state.seed,1664525)+1013904223)>>>0;return this.state.seed/4294967296;}
 private choose<T>(list:T[],weight:(r:T)=>number):T{let n=this.random()*list.reduce((sum,r)=>sum+weight(r),0);return list.find(r=>(n-=weight(r))<0)??list[list.length-1];}
 effect(key:string):number{return this.config.staff.filter(r=>this.state.hired.includes(r.key)&&r.effect===key).reduce((n,r)=>n+r.value,0);}
 hasRole(role:string):boolean{return this.config.staff.some(r=>r.role===role&&this.state.hired.includes(r.key));}
 value(group:string,tier=this.state.upgrades[group]??0):number{return this.config.upgrades.find(r=>r.group===group&&r.tier===tier)?.value??0;}
 efficiency(group:string):number{return this.effect(group)+this.value(group);}
 get stage():ShopStage{return stage(this.config,this.state);}
 get capacity():number{return capacity(this.config,this.state);}
 get checkouts():number{return this.stage.checkouts>1&&this.hasRole('guide')?this.stage.checkouts:1;}
 get carry():number{return this.config.rules.restockCarry+Math.floor(this.value('restock'));}
 get checkoutSeconds():number{return this.config.rules.checkoutSeconds/(1+this.efficiency('checkout')+(this.hasRole('pack')?this.config.rules.packSpeed:0));}
 private restockTime(seconds:number):number{return seconds/(1+this.efficiency('restock')+(this.hasRole('tidy')?this.config.rules.tidySpeed:0));}
 get restockSeconds():number{return this.restockTime(this.config.rules.restockSeconds+this.config.rules.walkRestockSeconds+this.config.rules.workerTaskSeconds);}
 get arrivalSeconds():number{const unique=new Set(this.items().map(x=>x.good.goods)),variety=this.config.goods.filter(g=>unique.has(g.key)).reduce((sum,g)=>sum+g.attraction,0);return this.config.rules.arrivalSeconds/(1+variety*this.config.rules.stockBonusStep+this.value('attraction')+this.effect('arrival'));}
 price(key:string,tier=this.state.research[key]??0):number{const g=this.config.goods.find(g=>g.key===key)!;return Math.max(1,Math.round(g.price*(this.config.research.find(r=>r.goodsKey===key&&r.tier===tier)?.priceRatio??1)*(1+this.effect(g.category))));}
 unlockedGoods(cleared:number):ShopGoods[]{return this.config.goods.filter(g=>g.unlockAfter<=cleared);}
 private upgradeUnlocked(row:ShopImprovement,checkCustomers=true):boolean {
  const s=this.state,cap=this.stage[(row.group+'Cap')as keyof ShopStage];
  return row.tier===(s.upgrades[row.group]??0)+1&&s.shelves.length>=row.minShelves&&(!checkCustomers||s.sold>=row.minSold)&&(row.group==='shelves'||typeof cap==='number'&&row.tier<=cap);
 }
 canUpgrade(row:ShopImprovement):boolean{return this.upgradeUnlocked(row)&&this.state.coins>=row.cost;}
 /** 优先以当前设备改进为预算，阶段已满再参考其他经营消费；不补差价或扣回旧钱。 */
 offlineBudget(cleared:number):number {
  const s=this.state,c=this.config,goods=new Set(this.unlockedGoods(cleared).map(g=>g.key));
  // 预算允许提前储备扩店费；客流门槛只在购买时检查，避免被动接待改变预算而让拆段登录获利。
  const equipment=c.upgrades.filter(r=>this.upgradeUnlocked(r,false)).map(r=>r.cost);
  const costs=equipment.length?equipment:[];
  if(!equipment.length)costs.push(...c.research.filter(r=>goods.has(r.goodsKey)&&r.tier===(s.research[r.goodsKey]??0)+1&&r.minShelves<=s.shelves.length).map(r=>r.cost));
  if(!equipment.length)costs.push(...c.staff.filter(r=>r.cost>0&&!s.hired.includes(r.key)&&r.unlockLevel<=cleared+1).map(r=>r.cost));
  if(!equipment.length)costs.push(...c.uniforms.filter(r=>s.hired.includes(r.staffKey)&&!s.uniforms.includes(r.key)).map(r=>r.cost));
  if(!equipment.length)costs.push(...(c.technology??[]).filter(r=>r.unlockLevel<=cleared&&!(s.technology??[]).some(v=>v.key===r.key)&&(!r.prerequisite||(s.technology??[]).some(v=>v.key===r.prerequisite))).map(r=>r.cost));
  return costs.sort((a,b)=>a-b).slice(0,c.rules.offlineBudgetPurchases).reduce((sum,cost)=>sum+cost,0)||c.rules.offlineCompleteBudget;
 }
 /** 离线订单仍按同一经营算法推进，只有新增利润折算；短段预算按时间分摊，零头持久化避免反复切后台吃掉金币。 */
 advanceOffline(now:number,cleared:number):number {
  const s=this.state,r=this.config.rules;
  if(!Number.isFinite(now)||now<=s.lastMs)return 0;
  const fraction=Math.min(now-s.lastMs,r.offlineSeconds*1000)/(r.offlineSeconds*1000),gross=this.advance(now,cleared),budget=this.offlineBudget(cleared)*fraction;
  const credit=Math.min(gross*r.offlineIncomeRatio,budget)+s.offlineCreditRemainder;
  const whole=Math.floor(credit),net=Math.min(gross,whole);
  s.coins-=gross-net;s.income-=gross-net;s.offlineCreditRemainder=credit-whole;
  this.lastSale=0;
  return net;
 }
 advance(now:number,cleared:number):number {
 const s=this.state;if(!Number.isFinite(now)||now<=s.lastMs)return 0;const income=s.income,total=Math.round(s.remainder*1000)+Math.min(Math.floor(now-s.lastMs),this.config.rules.offlineSeconds*1000),tick=this.config.rules.tickSeconds*1000,ticks=Math.floor(total/tick);s.lastMs=now;s.remainder=(total-ticks*tick)/1000;for(let i=0;i<ticks;i++)this.tick(this.config.rules.tickSeconds,cleared);return s.income-income;
 }
 private restock(dt:number):void {
 const s=this.state,r=this.config.rules;
 for(const j of s.restocks){j.remaining-=dt;if(j.remaining>0)continue;if(j.phase==='source'){j.phase='travel';j.duration=j.remaining=this.restockTime(r.walkRestockSeconds);}else if(j.phase==='travel'){j.phase='unload';j.duration=j.remaining=this.restockTime(r.restockSeconds);}else{const shelf=s.shelves[j.shelf],good=shelfGoods(shelf).find(g=>g.goods===j.goods);if(good)good.stock+=Math.min(j.amount,Math.max(0,this.capacity-shelfStock(shelf)));j.remaining=0;}}
 s.restocks=s.restocks.filter(j=>j.phase!=='unload'||j.remaining>0);
 const candidates=this.config.staff.filter(e=>s.hired.includes(e.key)&&['cold','hot','porter'].includes(e.role));
 // 未雇佣专业补货员时豆包兼岗；有收银订单时不离开岗位，避免同一个人同时完成两项任务。
 if(!candidates.length&&!s.customers.some(c=>c.phase==='checkout'))candidates.push(this.config.staff.find(e=>e.role==='cashier')!);
 for(const e of candidates){if(s.restocks.some(j=>j.employee===e.key))continue;const eligible=this.items().map(x=>({...x,limit:shelfGoodCapacity(x.shelf,x.good,this.capacity),category:this.config.goods.find(g=>g.key===x.good.goods)!.category})).filter(x=>shelfStock(x.shelf)<this.capacity&&x.good.stock<x.limit*r.restockTrigger&&!s.restocks.some(j=>j.shelf===x.index));eligible.sort((a,b)=>a.good.stock-b.good.stock||Number(b.category===e.role)-Number(a.category===e.role));const target=eligible[0];if(target)s.restocks.push({employee:e.key,shelf:target.index,goods:target.good.goods,phase:'source',duration:this.restockTime(r.workerTaskSeconds),remaining:this.restockTime(r.workerTaskSeconds),amount:Math.min(this.carry,target.limit-target.good.stock,this.capacity-shelfStock(target.shelf))});}
 s.restockShelf=s.restocks[0]?.shelf??-1;s.restockRemaining=Math.max(0,s.restocks[0]?.remaining??0);
 }
 private tick(dt:number,cleared:number):void {
 const s=this.state,r=this.config.rules;s.elapsed+=dt;this.restock(dt);
 for(const c of s.customers){if(c.phase==='queue')continue;c.remaining-=dt;if(c.remaining>0)continue;
 if(c.phase==='enter'){c.phase='browse';c.duration=c.remaining=r.browseSeconds/(1+(this.hasRole('guide')&&this.checkouts===1?r.guideSpeed:0));}
 else if(c.phase==='browse'){
 for(const key of c.wants){const available=this.items().filter(x=>x.good.goods===key&&x.good.stock>0);if(!available.length)continue;available.sort((a,b)=>b.good.stock-a.good.stock);const chosen=available[0];chosen.good.stock--;c.shelf=chosen.index;c.basket.push(key);}
 const type=this.config.customers.find(t=>t.key===c.kind)!;c.quote=c.basket.reduce((sum,k)=>sum+this.price(k),0)+(c.basket.length&&this.random()<Math.min(1,type.tipChance+this.effect('tip'))?r.tipCoins:0);
 if(c.basket.length)c.phase='queue';else{c.phase='exit';c.duration=c.remaining=r.exitSeconds;}
 }else if(c.phase==='checkout'){const paid=Math.min(c.quote,r.coinLimit-s.coins);s.coins+=paid;s.income+=paid;s.sold++;for(const k of c.basket)s.sales[k]=(s.sales[k]??0)+1;this.lastSale=paid;c.phase='exit';c.duration=c.remaining=r.exitSeconds;}
 }
 s.customers=s.customers.filter(c=>c.phase!=='exit'||c.remaining>0);
 for(let station=0;station<this.checkouts;station++){if(s.customers.some(c=>c.phase==='checkout'&&c.station===station))continue;if(station===0&&s.restocks.some(j=>this.config.staff.find(e=>e.key===j.employee)!.role==='cashier'))continue;const next=s.customers.find(c=>c.phase==='queue');if(next){next.phase='checkout';next.station=station;next.duration=next.remaining=this.checkoutSeconds;}}
 s.nextArrival-=dt;if(s.nextArrival<=0){s.nextArrival=this.arrivalSeconds;if(s.customers.length<r.customerLimit){const type=this.choose(this.config.customers,x=>x.weight),goods=this.unlockedGoods(cleared),first=this.choose(goods,g=>g.demand),wants=[first.key];if(this.random()<Math.min(r.serviceMaxChance,type.doubleChance+this.effect('double')+this.value('service'))&&goods.length>1)wants.push(this.choose(goods.filter(g=>g.key!==first.key),g=>g.demand).key);const shelf=Math.max(0,s.shelves.findIndex(x=>shelfGoods(x).some(g=>g.goods===first.key)));s.customers.push({id:s.nextId++,kind:type.key,phase:'enter',remaining:r.enterSeconds,duration:r.enterSeconds,shelf,basket:[],quote:0,wants,station:-1});}}
 }
 hire(key:string,unlocked:number):boolean{const row=this.config.staff.find(r=>r.key===key),s=this.state;if(!row||s.hired.includes(key)||row.unlockLevel>unlocked||s.coins<row.cost)return false;s.coins-=row.cost;s.hired.push(key);return true;}
 upgrade(key:string,cleared:number):boolean{const row=this.config.upgrades.find(r=>r.key===key),s=this.state;if(!row||!this.canUpgrade(row))return false;s.coins-=row.cost;s.upgrades[row.group]=row.tier;if(row.group==='shelves'){const goods=this.unlockedGoods(cleared);while(s.shelves.length<row.value){const used=new Set(s.shelves.map(x=>x.goods)),good=goods.find(g=>!used.has(g.key))??goods[s.shelves.length%goods.length];s.shelves.push({goods:good.key,stock:this.capacity});}}return true;}
 assign(index:number,key:string,cleared:number,slot=0):boolean{
  const shelf=this.state.shelves[index];if(!shelf||!Number.isInteger(slot)||slot<0||slot>=this.config.rules.shelfGoodsSlots||!key&&!slot)return false;
  const previous=shelfSlot(shelf,slot),previousKey=previous?.goods;if(!key&&!previous||previousKey===key||key&&(!this.unlockedGoods(cleared).some(g=>g.key===key)||shelfGoods(shelf).some(g=>g.goods===key)))return false;
  if(slot===0){shelf.goods=key;shelf.stock=0;}else{if(!shelf.extraGoods)shelf.extraGoods=Array(this.config.rules.shelfGoodsSlots-1).fill(null);shelf.extraGoods[slot-1]=key?{goods:key,stock:0}:null;}
  this.state.restocks=this.state.restocks.filter(j=>j.shelf!==index||j.goods!==previousKey);this.state.restockShelf=this.state.restocks[0]?.shelf??-1;this.state.restockRemaining=this.state.restocks[0]?.remaining??0;return true;
 }
 research(key:string,cleared:number):boolean{const row=this.config.research.find(r=>r.key===key),s=this.state;if(!row||row.tier!==(s.research[row.goodsKey]??0)+1||s.coins<row.cost||s.shelves.length<row.minShelves||!this.unlockedGoods(cleared).some(g=>g.key===row.goodsKey))return false;s.coins-=row.cost;s.research[row.goodsKey]=row.tier;return true;}
 buyUniform(key:string):boolean{const row=this.config.uniforms.find(r=>r.key===key),s=this.state;if(!row||s.uniforms.includes(key)||!s.hired.includes(row.staffKey)||s.coins<row.cost)return false;s.coins-=row.cost;s.uniforms.push(key);s.equipped.push(key);return true;}
 equip(key:string):boolean{const s=this.state;if(!s.uniforms.includes(key))return false;s.equipped=s.equipped.includes(key)?s.equipped.filter(k=>k!==key):[...s.equipped,key];return true;}
}
