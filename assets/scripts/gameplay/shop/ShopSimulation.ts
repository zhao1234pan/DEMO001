/** 独立经营时钟。订单锁价、库存预留与购买在同一存档中提交。 */
export interface ShopRules { [key:string]:number; }
export interface ShopGoods {key:string;goodsKey:string;unlockAfter:number;price:number;category:string;demand:number;attraction:number;}
export interface ShopEmployee {key:string;staffKey:string;cost:number;effect:string;value:number;unlockLevel:number;role:string;}
export interface ShopImprovement {key:string;group:string;tier:number;cost:number;value:number;minShelves:number;minSold:number;}
export interface ShopStage {key:string;shelves:number;checkouts:number;checkoutCap:number;restockCap:number;capacityCap:number;attractionCap:number;serviceCap:number;nameKey:string;}
export interface ShopResearch {key:string;goodsKey:string;tier:number;cost:number;priceRatio:number;minShelves:number;}
export interface ShopUniform {key:string;staffKey:string;cost:number;imageKey:string;}
export interface ShopCustomerType {key:string;imageKey:string;weight:number;doubleChance:number;tipChance:number;}
export interface ShopConfig {rules:ShopRules;goods:ShopGoods[];staff:ShopEmployee[];upgrades:ShopImprovement[];customers:ShopCustomerType[];stages:ShopStage[];research:ShopResearch[];uniforms:ShopUniform[];}
export interface ShopShelf {goods:string;stock:number;}
export interface ShopCustomer {id:number;kind:string;phase:'enter'|'browse'|'queue'|'checkout'|'exit';remaining:number;duration:number;shelf:number;basket:string[];quote:number;wants:string[];station:number;}
export interface ShopRestock {employee:string;shelf:number;goods:string;phase:'source'|'travel'|'unload';remaining:number;duration:number;amount:number;}
export interface ShopState {version:number;coins:number;lastMs:number;remainder:number;seed:number;elapsed:number;nextArrival:number;nextId:number;sold:number;income:number;hired:string[];upgrades:Record<string,number>;shelves:ShopShelf[];customers:ShopCustomer[];restockShelf:number;restockRemaining:number;restocks:ShopRestock[];research:Record<string,number>;sales:Record<string,number>;uniforms:string[];equipped:string[];}
function capacity(c:ShopConfig,s:ShopState):number{return c.rules.shelfCapacity+(c.upgrades.find(r=>r.group==='capacity'&&r.tier===s.upgrades.capacity)?.value??0);}
function stage(c:ShopConfig,s:ShopState):ShopStage{return c.stages.filter(r=>r.shelves<=s.shelves.length).slice(-1)[0];}
/** v1已有余额、库存、等级和锁价订单保留；旧免费补货改为一个待完成搬运任务。迁移只执行一次。 */
export function migrateShopState(c:ShopConfig,input:ShopState):ShopState {
 const s=JSON.parse(JSON.stringify(input)) as ShopState;if(s?.version!==1)return s;
 s.version=2;s.research={};s.sales={};s.uniforms=[];s.equipped=[];s.restocks=[];
 for(const customer of s.customers??[]){customer.wants=[];customer.station=customer.phase==='checkout'?0:-1;}
 if(s.restockShelf>=0&&s.shelves?.[s.restockShelf]){const shelf=s.shelves[s.restockShelf];s.restocks.push({employee:s.hired?.find(k=>c.staff.some(r=>r.key===k&&['cold','hot','porter'].includes(r.role)))??s.hired?.[0],shelf:s.restockShelf,goods:shelf.goods,phase:'unload',remaining:Math.max(c.rules.tickSeconds,s.restockRemaining),duration:Math.max(c.rules.tickSeconds,s.restockRemaining),amount:Math.max(0,c.rules.shelfCapacity-shelf.stock)});}
 return s;
}
export function validShopState(c:ShopConfig,s:ShopState):boolean {
 if(!s||s.version!==2||!Number.isSafeInteger(s.coins)||s.coins<0||s.coins>c.rules.coinLimit||!Number.isFinite(s.lastMs)||s.lastMs<0)return false;
 for(const k of ['elapsed','nextArrival','restockRemaining','remainder','income']as const)if(!Number.isFinite(s[k])||s[k]<0)return false;
 for(const k of ['seed','sold','nextId']as const)if(!Number.isSafeInteger(s[k])||s[k]<0)return false;
 if(s.remainder>=c.rules.tickSeconds||s.nextId<1||!Array.isArray(s.hired)||new Set(s.hired).size!==s.hired.length||s.hired.some(k=>!c.staff.some(r=>r.key===k))||c.staff.some(r=>!r.cost&&!s.hired.includes(r.key)))return false;
 const record=(x:unknown):x is Record<string,number>=>Boolean(x&&typeof x==='object'&&!Array.isArray(x));
 if(!record(s.upgrades)||Object.entries(s.upgrades).some(([g,t])=>!c.upgrades.some(r=>r.group===g&&r.tier===t)))return false;
 const count=c.upgrades.find(r=>r.group==='shelves'&&r.tier===s.upgrades.shelves)?.value??c.rules.initialShelves;
 if(!Array.isArray(s.shelves)||s.shelves.length!==count||s.shelves.some(x=>!x||!c.goods.some(g=>g.key===x.goods)||!Number.isInteger(x.stock)||x.stock<0||x.stock>capacity(c,s)))return false;
 if(!record(s.research)||Object.entries(s.research).some(([k,t])=>!c.research.some(r=>r.goodsKey===k&&r.tier===t))||!record(s.sales)||Object.entries(s.sales).some(([k,n])=>!c.goods.some(g=>g.key===k)||!Number.isSafeInteger(n)||n<0))return false;
 for(const list of [s.uniforms,s.equipped])if(!Array.isArray(list)||new Set(list).size!==list.length||list.some(k=>!c.uniforms.some(r=>r.key===k)))return false;
 if(s.equipped.some(k=>!s.uniforms.includes(k))||s.uniforms.some(k=>!s.hired.includes(c.uniforms.find(r=>r.key===k)!.staffKey)))return false;
 if(!Array.isArray(s.customers)||s.customers.length>c.rules.customerLimit||new Set(s.customers.map(x=>x?.id)).size!==s.customers.length)return false;
 const stations=s.customers.filter(x=>x?.phase==='checkout').map(x=>x.station);if(new Set(stations).size!==stations.length||stations.some(n=>!Number.isInteger(n)||n<0||n>=stage(c,s).checkouts))return false;
 if(!s.customers.every(x=>x&&Number.isSafeInteger(x.id)&&x.id>0&&x.id<s.nextId&&c.customers.some(r=>r.key===x.kind)&&['enter','browse','queue','checkout','exit'].includes(x.phase)&&Number.isFinite(x.remaining)&&Number.isFinite(x.duration)&&x.duration>0&&Number.isInteger(x.shelf)&&x.shelf>=0&&x.shelf<count&&Array.isArray(x.basket)&&x.basket.length<=2&&x.basket.every(k=>c.goods.some(g=>g.key===k))&&Array.isArray(x.wants)&&x.wants.length<=2&&new Set(x.wants).size===x.wants.length&&x.wants.every(k=>c.goods.some(g=>g.key===k))&&Number.isSafeInteger(x.quote)&&x.quote>=0&&(!['queue','checkout'].includes(x.phase)||x.basket.length>0)))return false;
 if(!Number.isInteger(s.restockShelf)||s.restockShelf< -1||s.restockShelf>=count||!Array.isArray(s.restocks)||new Set(s.restocks.map(j=>j.employee)).size!==s.restocks.length||new Set(s.restocks.map(j=>j.shelf)).size!==s.restocks.length)return false;
 return s.restocks.every(j=>j&&s.hired.includes(j.employee)&&Number.isInteger(j.shelf)&&j.shelf>=0&&j.shelf<count&&j.goods===s.shelves[j.shelf].goods&&['source','travel','unload'].includes(j.phase)&&Number.isFinite(j.remaining)&&j.remaining>=0&&Number.isFinite(j.duration)&&j.duration>0&&Number.isInteger(j.amount)&&j.amount>=0&&j.amount<=capacity(c,s));
}
export function newShopState(c:ShopConfig,now:number,coins=0,grant=true):ShopState {
 const s:ShopState={version:2,coins:Math.min(c.rules.coinLimit,coins+(grant?c.rules.welcomeCoins:0)),lastMs:now,remainder:0,seed:Math.floor(now)>>>0,elapsed:0,nextArrival:c.rules.arrivalSeconds,nextId:1,sold:0,income:0,hired:c.staff.filter(r=>!r.cost).map(r=>r.key),upgrades:{},shelves:[],customers:[],restockShelf:-1,restockRemaining:0,restocks:[],research:{},sales:{},uniforms:[],equipped:[]};
 const goods=c.goods.filter(g=>!g.unlockAfter);for(let i=0;i<c.rules.initialShelves;i++)s.shelves.push({goods:goods[i%goods.length].key,stock:c.rules.shelfCapacity});return s;
}
export class ShopSimulation {
 lastSale=0;
 constructor(readonly config:ShopConfig,readonly state:ShopState){}
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
 get arrivalSeconds():number{const unique=new Set(this.state.shelves.map(s=>s.goods)),variety=this.config.goods.filter(g=>unique.has(g.key)).reduce((sum,g)=>sum+g.attraction,0);return this.config.rules.arrivalSeconds/(1+variety*this.config.rules.stockBonusStep+this.value('attraction')+this.effect('arrival'));}
 price(key:string,tier=this.state.research[key]??0):number{const g=this.config.goods.find(g=>g.key===key)!;return Math.max(1,Math.round(g.price*(this.config.research.find(r=>r.goodsKey===key&&r.tier===tier)?.priceRatio??1)*(1+this.effect(g.category))));}
 unlockedGoods(cleared:number):ShopGoods[]{return this.config.goods.filter(g=>g.unlockAfter<=cleared);}
 canUpgrade(row:ShopImprovement):boolean{const s=this.state,cap=this.stage[(row.group+'Cap')as keyof ShopStage];return row.tier===(s.upgrades[row.group]??0)+1&&s.coins>=row.cost&&s.shelves.length>=row.minShelves&&s.sold>=row.minSold&&(row.group==='shelves'||typeof cap==='number'&&row.tier<=cap);}
 advance(now:number,cleared:number):number {
 const s=this.state;if(!Number.isFinite(now)||now<=s.lastMs)return 0;const income=s.income,total=Math.round(s.remainder*1000)+Math.min(Math.floor(now-s.lastMs),this.config.rules.offlineSeconds*1000),tick=this.config.rules.tickSeconds*1000,ticks=Math.floor(total/tick);s.lastMs=now;s.remainder=(total-ticks*tick)/1000;for(let i=0;i<ticks;i++)this.tick(this.config.rules.tickSeconds,cleared);return s.income-income;
 }
 private restock(dt:number):void {
 const s=this.state,r=this.config.rules;
 for(const j of s.restocks){j.remaining-=dt;if(j.remaining>0)continue;if(j.phase==='source'){j.phase='travel';j.duration=j.remaining=this.restockTime(r.walkRestockSeconds);}else if(j.phase==='travel'){j.phase='unload';j.duration=j.remaining=this.restockTime(r.restockSeconds);}else{const shelf=s.shelves[j.shelf];if(shelf.goods===j.goods)shelf.stock=Math.min(this.capacity,shelf.stock+j.amount);j.remaining=0;}}
 s.restocks=s.restocks.filter(j=>j.phase!=='unload'||j.remaining>0);
 const candidates=this.config.staff.filter(e=>s.hired.includes(e.key)&&['cold','hot','porter'].includes(e.role));
 // 未雇佣专业补货员时豆包兼岗；有收银订单时不离开岗位，避免同一个人同时完成两项任务。
 if(!candidates.length&&!s.customers.some(c=>c.phase==='checkout'))candidates.push(this.config.staff.find(e=>e.role==='cashier')!);
 for(const e of candidates){if(s.restocks.some(j=>j.employee===e.key))continue;const eligible=s.shelves.map((shelf,index)=>({shelf,index,category:this.config.goods.find(g=>g.key===shelf.goods)!.category})).filter(x=>x.shelf.stock<this.capacity*r.restockTrigger&&!s.restocks.some(j=>j.shelf===x.index));eligible.sort((a,b)=>a.shelf.stock-b.shelf.stock||Number(b.category===e.role)-Number(a.category===e.role));const target=eligible[0];if(target)s.restocks.push({employee:e.key,shelf:target.index,goods:target.shelf.goods,phase:'source',duration:this.restockTime(r.workerTaskSeconds),remaining:this.restockTime(r.workerTaskSeconds),amount:Math.min(this.carry,this.capacity-target.shelf.stock)});}
 s.restockShelf=s.restocks[0]?.shelf??-1;s.restockRemaining=Math.max(0,s.restocks[0]?.remaining??0);
 }
 private tick(dt:number,cleared:number):void {
 const s=this.state,r=this.config.rules;s.elapsed+=dt;this.restock(dt);
 for(const c of s.customers){if(c.phase==='queue')continue;c.remaining-=dt;if(c.remaining>0)continue;
 if(c.phase==='enter'){c.phase='browse';c.duration=c.remaining=r.browseSeconds/(1+(this.hasRole('guide')&&this.checkouts===1?r.guideSpeed:0));}
 else if(c.phase==='browse'){
 for(const key of c.wants){const available=s.shelves.map((shelf,index)=>({shelf,index})).filter(x=>x.shelf.goods===key&&x.shelf.stock>0);if(!available.length)continue;available.sort((a,b)=>b.shelf.stock-a.shelf.stock);const chosen=available[0];chosen.shelf.stock--;c.shelf=chosen.index;c.basket.push(key);}
 const type=this.config.customers.find(t=>t.key===c.kind)!;c.quote=c.basket.reduce((sum,k)=>sum+this.price(k),0)+(c.basket.length&&this.random()<Math.min(1,type.tipChance+this.effect('tip'))?r.tipCoins:0);
 if(c.basket.length)c.phase='queue';else{c.phase='exit';c.duration=c.remaining=r.exitSeconds;}
 }else if(c.phase==='checkout'){const paid=Math.min(c.quote,r.coinLimit-s.coins);s.coins+=paid;s.income+=paid;s.sold++;for(const k of c.basket)s.sales[k]=(s.sales[k]??0)+1;this.lastSale=paid;c.phase='exit';c.duration=c.remaining=r.exitSeconds;}
 }
 s.customers=s.customers.filter(c=>c.phase!=='exit'||c.remaining>0);
 for(let station=0;station<this.checkouts;station++){if(s.customers.some(c=>c.phase==='checkout'&&c.station===station))continue;if(station===0&&s.restocks.some(j=>this.config.staff.find(e=>e.key===j.employee)!.role==='cashier'))continue;const next=s.customers.find(c=>c.phase==='queue');if(next){next.phase='checkout';next.station=station;next.duration=next.remaining=this.checkoutSeconds;}}
 s.nextArrival-=dt;if(s.nextArrival<=0){s.nextArrival=this.arrivalSeconds;if(s.customers.length<r.customerLimit){const type=this.choose(this.config.customers,x=>x.weight),goods=this.unlockedGoods(cleared),first=this.choose(goods,g=>g.demand),wants=[first.key];if(this.random()<Math.min(r.serviceMaxChance,type.doubleChance+this.effect('double')+this.value('service'))&&goods.length>1)wants.push(this.choose(goods.filter(g=>g.key!==first.key),g=>g.demand).key);const shelf=Math.max(0,s.shelves.findIndex(x=>x.goods===first.key));s.customers.push({id:s.nextId++,kind:type.key,phase:'enter',remaining:r.enterSeconds,duration:r.enterSeconds,shelf,basket:[],quote:0,wants,station:-1});}}
 }
 hire(key:string,unlocked:number):boolean{const row=this.config.staff.find(r=>r.key===key),s=this.state;if(!row||s.hired.includes(key)||row.unlockLevel>unlocked||s.coins<row.cost)return false;s.coins-=row.cost;s.hired.push(key);return true;}
 upgrade(key:string,cleared:number):boolean{const row=this.config.upgrades.find(r=>r.key===key),s=this.state;if(!row||!this.canUpgrade(row))return false;s.coins-=row.cost;s.upgrades[row.group]=row.tier;if(row.group==='shelves'){const goods=this.unlockedGoods(cleared);while(s.shelves.length<row.value){const used=new Set(s.shelves.map(x=>x.goods)),good=goods.find(g=>!used.has(g.key))??goods[s.shelves.length%goods.length];s.shelves.push({goods:good.key,stock:this.capacity});}}return true;}
 assign(index:number,key:string,cleared:number):boolean{const shelf=this.state.shelves[index];if(!shelf||shelf.goods===key||!this.unlockedGoods(cleared).some(g=>g.key===key))return false;shelf.goods=key;shelf.stock=0;this.state.restocks=this.state.restocks.filter(j=>j.shelf!==index);this.state.restockShelf=this.state.restocks[0]?.shelf??-1;this.state.restockRemaining=this.state.restocks[0]?.remaining??0;return true;}
 research(key:string,cleared:number):boolean{const row=this.config.research.find(r=>r.key===key),s=this.state;if(!row||row.tier!==(s.research[row.goodsKey]??0)+1||s.coins<row.cost||s.shelves.length<row.minShelves||!this.unlockedGoods(cleared).some(g=>g.key===row.goodsKey))return false;s.coins-=row.cost;s.research[row.goodsKey]=row.tier;return true;}
 buyUniform(key:string):boolean{const row=this.config.uniforms.find(r=>r.key===key),s=this.state;if(!row||s.uniforms.includes(key)||!s.hired.includes(row.staffKey)||s.coins<row.cost)return false;s.coins-=row.cost;s.uniforms.push(key);s.equipped.push(key);return true;}
 equip(key:string):boolean{const s=this.state;if(!s.uniforms.includes(key))return false;s.equipped=s.equipped.includes(key)?s.equipped.filter(k=>k!==key):[...s.equipped,key];return true;}
}
