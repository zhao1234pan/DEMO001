/* 无浏览器的图鉴交互、局外余额和分辨率回归；不冒充真实引擎截图。 */
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),cp=require('child_process');
const root=path.resolve(__dirname,'../..'),ts=require(process.argv[2]||'typescript'),cache=new Map();
class Vec3{constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z});}}
class Color{static BLACK={r:0,g:0,b:0};static WHITE={r:255,g:255,b:255};static fromHEX(c,s){c.hex=s;return c;}clone(){return Object.assign(new Color(),this);}}
class Label{constructor(){this.string='';this.fontSize=13;this.lineHeight=18;}}
class Sprite{}
class UITransform{constructor(){this.width=0;this.height=0;this.anchorX=.5;this.anchorY=.5;}setContentSize(w,h){this.width=w;this.height=h;}convertToWorldSpaceAR(v){const t=this.node.world();return new Vec3(t.x+v.x*t.sx,t.y+v.y*t.sy);}convertToNodeSpaceAR(v){const t=this.node.world();return new Vec3((v.x-t.x)/t.sx,(v.y-t.y)/t.sy);}}
class Node{constructor(name){this.name=name;this.children=[];this.parent=null;this.active=true;this.isValid=true;this.position=new Vec3();this.scale=new Vec3(1,1,1);this.components=[];}get activeInHierarchy(){return this.active&&(!this.parent||this.parent.activeInHierarchy);}addChild(n){n.parent=this;this.children.push(n);}getChildByName(k){return this.children.find(n=>n.name===k)||null;}getComponent(c){return this.components.find(x=>x instanceof c)||null;}setPosition(x,y,z=0){this.position=new Vec3(x,y,z);}setScale(x,y,z=1){this.scale=new Vec3(x,y,z);}setSiblingIndex(i){const a=this.parent.children;a.splice(a.indexOf(this),1);a.splice(i,0,this);}destroy(){this.isValid=false;}world(){const p=this.parent?.world()||{x:0,y:0,sx:1,sy:1};return{x:p.x+this.position.x*p.sx,y:p.y+this.position.y*p.sy,sx:p.sx*this.scale.x,sy:p.sy*this.scale.y};}}
function instantiate(node){const n=new Node(node.name);n.active=node.active;n.setPosition(node.position.x,node.position.y);n.setScale(node.scale.x,node.scale.y);for(const c of node.components){const copy=Object.assign(new c.constructor(),c,{node:n});n.components.push(copy);}for(const child of node.children)n.addChild(instantiate(child));return n;}
const cc={Color,Label,Node,Sprite,UITransform,Vec3,instantiate},saved=new Map(),storageCalls=[];
const platform={PlatformService:{getNumber(k,d){storageCalls.push(k);return saved.has(k)?saved.get(k):d;},setNumber(k,v){saved.set(k,v);},setMaximumInteger(k,v){saved.set(k,v);},getString(k,d){return saved.get(k)??d;},setString(k,v){saved.set(k,v);}}};
function uiNode(n,p){for(const k of p.split('/').filter(Boolean))n=n.getChildByName(k);if(!n)throw Error(p);return n;}
function uiRect(n,coordinateRoot,w,h){const t=n.getComponent(UITransform),a=coordinateRoot.world(),b=n.world();return{x:(b.x-a.x)/a.sx+w/2-t.width*b.sx/a.sx/2,y:h/2-(b.y-a.y)/a.sy-t.height*b.sy/a.sy/2,width:t.width*b.sx/a.sx,height:t.height*b.sy/a.sy};}
const ui={uiNode,uiRect,uiText:(n,p,v)=>uiNode(n,p).getComponent(Label).string=v,uiColor:()=>{}};
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
 if(file.endsWith('/PlatformService.ts')||file.endsWith('\\PlatformService.ts'))return platform;
 if(file.endsWith('/PlatformSettings.ts')||file.endsWith('\\PlatformSettings.ts'))return{PlatformSettings:class{constructor(){this.capabilities={sidebar:false};}async refresh(){}}};
 if(/[\\/]UiPrefabs.ts$/.test(file))return ui;
 if(/[\\/](UiSkin|UiRoute|PngSurface).ts$/.test(file)){const key=path.basename(file,'.ts');return{[key]:class{}};}
 const mod={exports:{}};cache.set(file,mod);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2018,experimentalDecorators:true}}).outputText;
 new Function('require','module','exports',code)(id=>id==='cc'?cc:id==='cc/env'?{DEBUG:true}:id.startsWith('.')?load(path.resolve(path.dirname(file),id+'.ts')):require(id),mod,mod.exports);return mod.exports;}
const core=load(root+'/assets/scripts/config/ConfigTables.ts'),src={};for(const name of core.TABLE_NAMES)src[name]=fs.readFileSync(root+'/assets/resources/config/'+name+'.csv','utf8');core.installConfigs(src);
const {CollectionScrollState}=load(root+'/assets/scripts/ui/CollectionScrollState.ts'),{readWalletCoins}=load(root+'/assets/scripts/services/PlayerWallet.ts'),{computeBattleLayout}=load(root+'/assets/scripts/gameplay/battle/BattleLayout.ts');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,a+' != '+b);
function prefab(name){const a=JSON.parse(fs.readFileSync(root+'/assets/resources/ui/'+name+'.prefab'));function visit(o){const n=new Node(o._name);n.active=o._active;n.setPosition(o._lpos.x,o._lpos.y);n.setScale(o._lscale.x,o._lscale.y);for(const r of o._components){const c=a[r.__id__];let t;if(c.__type__==='cc.UITransform'){t=new UITransform();t.width=c._contentSize.width;t.height=c._contentSize.height;t.anchorX=c._anchorPoint.x;t.anchorY=c._anchorPoint.y;}else if(c.__type__==='cc.Label'){t=new Label();t.string=c._string;t.fontSize=c._fontSize;t.lineHeight=c._lineHeight;}else if(c.__type__==='cc.Sprite')t=new Sprite();if(t){t.node=n;n.components.push(t);}}for(const r of o._children)n.addChild(visit(a[r.__id__]));return n;}return visit(a[1]);}


const {ShopPresentation}=load(root+'/assets/scripts/ui/ShopPresentation.ts'),{shopNumber}=load(root+'/assets/scripts/services/ShopService.ts');const points=new Map(core.rows('ShopPoint').map(r=>[r.key,{x:Number(r.x),y:Number(r.y)}]));const controller=()=>new ShopPresentation(k=>points.get(k),shopNumber);
const customer=(id,phase)=>({id,kind:'normal',phase,remaining:2,duration:3,shelf:0,basket:['bread'],quote:3}),state=(customers,elapsed=10)=>({elapsed,remainder:0,shelves:[{goods:'bread',stock:6},{goods:'milk',stock:6}],customers});
test('排队前移从当前脚底位置起步，不瞬移到前一格',()=>{const p=controller(),a=customer(1,'queue'),b=customer(2,'queue'),s=state([a,b]);const before=p.customer(b,s).position;s.customers=[b];s.elapsed+=.25;assert.deepEqual(p.customer(b,s).position,before);s.elapsed+=shopNumber('customerWalkSeconds')/2;const mid=p.customer(b,s).position;assert.ok(mid.y>before.y&&mid.y<points.get('queue').y);s.elapsed+=shopNumber('customerWalkSeconds');assert.deepEqual(p.customer(b,s).position,points.get('queue'));});
test('切到队列或收银时不改业务状态，真实商品触发拿货动画',()=>{const p=controller(),c=customer(1,'browse'),s=state([c]);p.customer(c,s);c.phase='checkout';c.shelf=1;s.elapsed+=.25;const before=JSON.stringify(s),pose=p.customer(c,s);assert.equal(pose.pickup,1);assert.equal(JSON.stringify(s),before);s.elapsed+=shopNumber('pickupSeconds')+.01;assert.equal(p.customer(c,s).pickup,0);});
test('首次打开已有排队存档不会补播历史拿货',()=>{const p=controller(),c=customer(1,'queue'),s=state([c]);assert.equal(p.customer(c,s).pickup,0);});
test('重开页面时已成交离店者仍沿过道走向出口',()=>{const p=controller(),c=customer(1,'exit'),s=state([c]);const a=p.customer(c,s).position;c.remaining=0;const b=p.customer(c,s).position;assert.notDeepEqual(a,b);assert.deepEqual(b,{x:points.get('walkRight').x,y:points.get('exit').y});});
test('补货店员沿中央过道走动且保持目标精度',()=>{const p=controller(),base=points.get('worker1'),shelf=points.get('shelf1'),offset=points.get('restockOffset'),target={x:shelf.x+offset.x,y:shelf.y+offset.y};p.worker(1,base,0);assert.deepEqual(p.worker(1,target,1).position,base);const mid=p.worker(1,target,1+shopNumber('workerWalkSeconds')/2).position;assert.ok(mid.x===0||mid.y===base.y||mid.y===target.y);assert.deepEqual(p.worker(1,target,2+shopNumber('workerWalkSeconds')).position,target);});
test('收银进度受真实剩余时间约束，未收银时不显示',()=>{const p=controller(),c=customer(1,'checkout'),s=state([c]);c.remaining=1.5;assert.equal(p.customer(c,s).progress,.5);c.phase='queue';assert.equal(p.customer(c,s).progress,-1);});
test('打开关闭与顾客移除会清理表现缓存，重复帧不改变订单',()=>{const p=controller(),c=customer(1,'queue'),s=state([c]),before=JSON.stringify(s);for(let i=0;i<300;i++)p.customer(c,s);assert.equal(JSON.stringify(s),before);p.prune([]);assert.equal(p.customers.size,0);p.worker(0,points.get('worker0'),1);p.reset();assert.equal(p.workers.size,0);});

test('收银进度填充从左边开始，完整值仍在轨道内',()=>{const page=prefab('shop'),fill=uiNode(page,'Floor/Content/Customer0/CheckoutProgress/Fill'),art=uiNode(fill,'Artwork'),width=art.getComponent(UITransform).width;near(fill.position.x+art.position.x-width/2,-width/2);near(fill.position.x+art.position.x+width/2,width/2);});
test('加速搬运使用真实任务时长，完成时能到达货架',()=>{const p=controller(),base=points.get('worker1'),target=points.get('shelf7');p.worker(1,base,0);p.worker(1,target,1,.5);assert.deepEqual(p.worker(1,target,1.5,.5).position,target);});
test('进店从可见地面下方进入，各扩店与视口全路径避开后墙冰柜',()=>{
 const height=Number(core.rows('UiLayout').find(r=>r.key==='shop:Floor/Content/Customer0').height)*(1+shopNumber('idleScaleAmplitude'))+shopNumber('walkBobPixels');
 for(const count of [2,4,6,8])for(const viewport of [504,650,850])for(let shelf=0;shelf<count;shelf++){
  const p=controller(),c=customer(1,'enter'),s=state([c]);c.shelf=shelf;s.shelves=Array.from({length:count},()=>({goods:'bread',stock:6}));
  const scroll=new CollectionScrollState();scroll.resize(shopNumber('shopViewportHeight')+Math.max(0,Math.ceil(count/2)-2)*shopNumber('shopRowHeight')+(viewport-shopNumber('shopViewportHeight'))/2,viewport);
  const target=points.get('shelf'+shelf),offset=points.get('browseOffset'),y=target.y+offset.y;
  for(let n=0;n<=100;n++){c.remaining=c.duration*(1-n/100);const q=p.customer(c,s,viewport).position;
   if(n===0)assert.ok(q.y+height+scroll.maximum<-viewport/2,'整个角色必须在可见地面下方生成');
   assert.ok(q.y<=y+1e-8,'进店不得绕到货架上方或后墙');assert.ok(Math.abs(q.x-points.get(target.x<0?'walkLeft':'walkRight').x)<1e-8||Math.abs(q.y-y)<1e-8,'从中央走到货架前方');
   if(n===100){near(q.x,target.x+offset.x);near(q.y,y);}
  }
 }
});
test('双收银离店只向中央及前方走，满扩店滚到底也不在场内消失',()=>{
 for(const count of [2,4,6,8])for(const viewport of [504,650,850])for(const station of [0,1]){
  const p=controller(),c=customer(1,'exit'),s=state([c]);c.station=station;s.shelves=Array(count).fill({goods:'bread',stock:6});
  const checkout=points.get(station?'checkout2':'checkout');let previous=checkout;
  const scroll=new CollectionScrollState();scroll.resize(shopNumber('shopViewportHeight')+Math.max(0,Math.ceil(count/2)-2)*shopNumber('shopRowHeight')+(viewport-shopNumber('shopViewportHeight'))/2,viewport);
  for(let n=0;n<=100;n++){c.remaining=c.duration*(1-n/100);const q=p.customer(c,s,viewport).position;assert.ok(q.y<=previous.y+1e-8,'离店不可向后墙走');assert.ok(Math.abs(q.x-checkout.x)<=Math.abs(checkout.x)+1e-8);previous=q;}
  assert.ok(previous.y+60+scroll.maximum<-viewport/2,'离场终点需要完整越过底部裁切区');
 }
});
test('空手离店的重开与视口变大仍走向场外，不跳到收银台',()=>{
 const p=controller(),c=customer(1,'exit'),s=state([c]);c.basket=[];c.remaining=c.duration;
 assert.deepEqual(p.customer(c,s).position,{x:points.get('shelf0').x,y:points.get('shelf0').y+points.get('browseOffset').y});
 c.remaining=0;assert.ok(p.customer(c,s,850).position.y+60<-850/2);
});
const clearanceRow=core.rows('ShopPoint').find(r=>r.key==='customerClearance'),clearance={width:Number(clearanceRow.width),height:Number(clearanceRow.height)};
function separated(poses){const all=[...poses.values()];for(let a=0;a<all.length;a++)for(let b=a+1;b<all.length;b++)assert.ok(Math.abs(all[a].position.x-all[b].position.x)>=clearance.width-1e-8||Math.abs(all[a].position.y-all[b].position.y)>=clearance.height-1e-8,'顾客安全框不可重叠');}
test('满队列和连续前移保持身体间距，长队可滚动到完整队尾',()=>{
 for(const count of [2,4,6,8])for(const viewport of [504,650,850]){
  const p=controller(),customers=Array.from({length:shopNumber('customerLimit')},(_,i)=>customer(i+1,'queue')),s=state(customers);s.shelves=Array(count).fill({goods:'bread',stock:6});
  const original=JSON.stringify(s);separated(p.customerPoses(s,viewport,clearance));assert.equal(JSON.stringify(s),original);
  const scroll=new CollectionScrollState();scroll.resize(shopNumber('shopViewportHeight')+p.contentExtra(s,clearance.height)+(viewport-shopNumber('shopViewportHeight'))/2,viewport);
  const tail=points.get('queue').y+points.get('queueStep').y*(customers.length-1);assert.ok(tail+scroll.maximum>=-viewport/2);
  s.customers=s.customers.slice(1);for(let n=0;n<=100;n++){s.elapsed=10+n*shopNumber('customerWalkSeconds')/100;separated(p.customerPoses(s,viewport,clearance));}
 }
});
test('入队绕行队尾，进出交会和双收银整批姿态不重叠',()=>{
 const p=controller(),customers=[customer(1,'checkout'),customer(2,'checkout'),...Array.from({length:7},(_,i)=>customer(i+3,'queue')),customer(10,'browse'),customer(11,'enter'),customer(12,'exit')],s=state(customers);s.shelves=Array(8).fill({goods:'bread',stock:6});customers[0].station=0;customers[1].station=1;customers[9].shelf=0;customers[10].shelf=1;customers[11].station=0;
 p.customerPoses(s,650,clearance);customers[9].phase='queue';
 for(let n=0;n<=120;n++){s.elapsed=10+n/30;customers[10].remaining=customers[10].duration*(1-n/120);customers[11].remaining=customers[11].duration*(1-n/120);const before=JSON.stringify(s);separated(p.customerPoses(s,650,clearance));assert.equal(JSON.stringify(s),before);}
 const join=p.customers.get(10).path,side=points.get('walkLeft').x,tail=points.get('queue').y+7*points.get('queueStep').y;assert.ok(join.some(point=>point.x===side&&point.y===tail),'在侧通道走到队尾高度再横向入队');
});
test('顾客和随身道具留在安全框，三列地面不压货架',()=>{
 const page=prefab('shop'),c=uiNode(page,'Floor/Content/Customer0'),box=c.getComponent(UITransform),bag=uiNode(c,'Basket'),bt=bag.getComponent(UITransform),maxScale=1+shopNumber('idleScaleAmplitude');
 const bodyWidth=Math.max(box.width/2,bag.position.x+bt.width/2)*2*maxScale;assert.ok(bodyWidth<clearance.width);assert.ok(box.height*maxScale+shopNumber('walkBobPixels')<clearance.height);
 for(const side of [-1,1]){const shelf=uiNode(page,'Floor/Content/Shelf'+(side<0?0:1)),inner=Math.abs(shelf.position.x)-shelf.getComponent(UITransform).width*shelf.scale.x/2;assert.ok(Math.abs(points.get(side<0?'walkLeft':'walkRight').x)+bodyWidth/2<inner);}
});
console.log(passed+' 项商店表现模型测试通过');
