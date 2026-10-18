/* 原生Cocos美术状态夹具截图；独立浏览器来源，不读取正式存档，不代表完整试玩。 */
const fs=require('node:fs/promises'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{
const root=path.resolve(__dirname,'../..'),out=root+'/美术导出/叮咚夜班-1.20.0/UI效果图',evidence=root+'/docs/evidence/monster-variety-wave-supply-20261018';
const csv=(await fs.readFile(root+'/assets/resources/config/UiPrefab.csv','utf8')).trim().split(/\r?\n/).slice(1).map(l=>{const[id,key]=l.split(',');return{id:Number(id),key};});
const browser=await chromium.launch({channel:process.env.ART_BROWSER_CHANNEL||'msedge',headless:true});const context=await browser.newContext({viewport:{width:750,height:1334},deviceScaleFactor:1});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://127.0.0.1:4346/?art-export=1.20.0');
let ready=false;for(let i=0;i<120;i++){ready=await page.evaluate(async()=>{try{const cc=await System.import('cc'),scene=cc.director.getScene();if(!scene)return false;const walk=n=>{for(const c of n.components??n._components??[])if(c.booted&&c.uiPrefabs)return true;return n.children.some(walk);};return walk(scene);}catch{return false;}});if(ready)break;await page.waitForTimeout(250);}if(!ready){await page.screenshot({path:evidence+'/boot-error.png'});throw Error('美术导出等待启动超时：'+errors.join('\n'));}
await page.evaluate(async()=>{const cc=await System.import('cc'),walk=n=>{for(const c of n.components??n._components??[])if(c.booted&&c.uiPrefabs)return c;for(const child of n.children){const found=walk(child);if(found)return found;}return null;},game=walk(cc.director.getScene());globalThis.__artGame=game;game.enabled=false;globalThis.__artOriginal=game.contentRoot.children.map(n=>({node:n,active:n.active}));for(const child of game.contentRoot.children)child.active=false;const host=new cc.Node('美术导出夹具');host.layer=cc.Layers.Enum.UI_2D;host.addComponent(cc.UITransform).setContentSize(390,693.68);game.contentRoot.addChild(host);globalThis.__artHost=host;globalThis.__artCc=cc;});
await fs.mkdir(out,{recursive:true});const results=[];
for(const item of csv){
 await page.evaluate(item=>{const g=globalThis.__artGame,host=globalThis.__artHost,cc=globalThis.__artCc;for(const n of [...host.children]){n.removeFromParent();n.destroy();}const n=g.uiPrefabs.create(item.key,host);globalThis.__artCurrent=n;n.active=true;
  const find=(p)=>{let a=n;for(const name of p.split('/').filter(Boolean)){a=a?.getChildByName(name);}return a;};const txt=(p,t)=>{const node=find(p),l=node?.getComponent(cc.Label);if(l)l.string=t;};
  if(item.key==='battle_hud'){g.battleUi.supplyProgress(null);const box=find('Header/SupplyProgress');if(box){box.active=true;find('Header/SupplyProgress/Fill').setScale(.62,1,1);txt('Header/SupplyProgress/Text','补给 8/20 · 还差116经验');}txt('Header/wave','12/30 波');txt('Header/coin','368');txt('Header/lives','10');}
  if(item.key==='challenge_card'){txt('Title','三连发');txt('Description','每2轮发射3连弹，造成48%伤害；第11、21波各增加1发。');g.uiPrefabs.bindImage(find('Icon'),'ui:perk_S01');}
  if(item.key==='enemy_preview_card'){txt('Name','泡芙团子');const icon=find('Icon');if(icon)g.uiPrefabs.bindImage(icon,'menu:enemy_puff');}
  if(item.key==='collection_card'){const icon=find('Icon');if(icon)g.uiPrefabs.bindImage(icon,'menu:enemy_pudding');}
  if(item.key==='challenge_pick'){txt('Count','第 8 / 20 次补给');for(const slot of find('Cards')?.children??[]){const card=g.uiPrefabs.create('challenge_card',slot);const get=p=>{let a=card;for(const k of p.split('/'))a=a?.getChildByName(k);return a;};get('Title')?.getComponent(cc.Label)&&(get('Title').getComponent(cc.Label).string='零用补给');get('Description')?.getComponent(cc.Label)&&(get('Description').getComponent(cc.Label).string='立即获得40金币。可重复选择。');const icon=get('Icon');if(icon)g.uiPrefabs.bindImage(icon,'ui:perk_R01');}}
  const size=n.getComponent(cc.UITransform)?.contentSize;if(size&&size.width<200&&size.height<200)n.setScale(2,2,1);
 },item);
 await page.waitForTimeout(140);const file=`${String(item.id).padStart(2,'0')}-${item.key}.png`;await page.screenshot({path:out+'/'+file});results.push({key:item.key,file,width:750,height:1334,type:'原生Cocos预制体美术状态夹具截图，不是完整游玩'});console.log(item.key+' captured');
}
await fs.mkdir(out+'/组件',{recursive:true});for(const item of results){await fs.rename(out+'/'+item.file,out+'/组件/'+item.file);item.file='组件/'+item.file;}
await page.evaluate(()=>{const g=globalThis.__artGame;globalThis.__artHost.destroy();for(const item of globalThis.__artOriginal)item.node.active=item.active;g.screen='home';g.unlockedLevel=20;g.collection.setGmPreview('all');});
const states=[['首页','home'],['冒险选关','levels'],['设置','settings'],['挑战专题','challenge_topics'],['排行榜','ranking'],['店员图鉴','staff'],['怪物图鉴','enemies'],['商品图鉴','goods'],['冒险配队','loadout'],['挑战配队','challenge_loadout'],['便利店','shop'],['便利店员工','shop_staff'],['便利店商品','shop_goods'],['便利店升级','shop_upgrade'],['图鉴详情','detail'],['游戏说明','notice']];
for(let i=0;i<states.length;i++){
 const [name,state]=states[i];await page.evaluate(state=>{const g=globalThis.__artGame,m=g.menu;g.screen='home';m.dialog=null;
  if(['staff','enemies','goods'].includes(state))m.showCollection(20,state);
  else if(state==='loadout'||state==='challenge_loadout')m.showPreparation(20,state==='loadout'?5:21);
  else if(state.startsWith('shop')){m.show(20,'home');g.render();m.actions.get(m.pages.get('home').getChildByName('Store'))?.();if(state!=='shop')m.shop.details(state.slice(5));m.dirty=true;}
  else if(state==='detail'){m.showCollection(20,'enemies');g.render();m.actions.get(m.collectionCards[0])?.();m.dirty=true;}
  else if(state==='notice'){m.show(20,'settings');m.notice('夜班补给','击退来客积攒经验，经验条满时获得补给。每局最多20次。');}
  else m.show(20,state);g.render();},state);
 await page.waitForTimeout(160);const file=`完整-${String(i+1).padStart(2,'0')}-${name}.png`;await page.screenshot({path:out+'/'+file});results.push({key:state,file,width:750,height:1334,type:'完整界面原生渲染，美术状态夹具'});
}
await page.evaluate(()=>{const g=globalThis.__artGame;g.menu.hide();g.resetLevel(21);g.screen='playing';const r=g.challenge;r.choose(r.offers[0],g.challengePort());g.wave=12;g.inWave=true;r.supplyXp=40;g.coins=368;
 for(const [i,key] of ['puff','pudding','biscuit','soda','coffee','tea','berrymilk','tin','juice','peach','grape','blue','ricebox','deliverybag'].entries()){const before=g.enemies.length;g.spawnEnemy(key);if(g.enemies.length>before){const e=g.enemies.at(-1);e.distance=g.pathLength*(.08+i*.025);g.crowdFlow.relocate(e,e.distance,g.enemies);}}g.render();});
await page.waitForTimeout(180);await page.screenshot({path:out+'/完整-17-挑战经验条与新怪物.png'});results.push({key:'experience-battle',file:'完整-17-挑战经验条与新怪物.png',width:750,height:1334,type:'战斗美术状态夹具，非实际完整试玩'});
const transition=await page.evaluate(()=>{const g=globalThis.__artGame;g.challenge.supplyXp=80;g.update(.05);const first={pending:g.challenge.pending,timer:g.challengeSupplyTimer,progress:g.challenge.supplyProgress()};for(let i=0;i<40;i++)g.update(.05);return{first,after:{pending:g.challenge.pending,wave:g.wave,progress:g.challenge.supplyProgress(),offers:g.challenge.offers}};});
await page.waitForTimeout(300);await page.screenshot({path:out+'/完整-18-经验满送达补给.png'});results.push({key:'experience-supply',file:'完整-18-经验满送达补给.png',width:750,height:1334,type:'经验送达与三选一状态夹具'});
for(const [i,name,screen] of [[19,'暂停','pause'],[20,'挑战胜利','win'],[21,'挑战失败','lose'],[22,'复活提示','retry']]){await page.evaluate(screen=>{const g=globalThis.__artGame;g.challenge.pending=false;g.challenge.browsing=false;g.challenge.offers=[];g.paused=screen==='pause';g.screen=screen==='pause'?'playing':screen;g.wave=30;g.render();},screen);await page.waitForTimeout(140);const file=`完整-${i}-${name}.png`;await page.screenshot({path:out+'/'+file});results.push({key:screen,file,width:750,height:1334,type:'结算／暂停美术状态夹具，不是通关结果'});}
await fs.writeFile(evidence+'/ui-capture.json',JSON.stringify({version:'1.20.0',origin:'http://127.0.0.1:4346/',isolatedContext:true,errors,transition,results},null,2));await browser.close();if(errors.length)throw Error('截图发生运行错误：'+errors.join('\n'));

})().catch(error=>{console.error(error);process.exitCode=1;});


