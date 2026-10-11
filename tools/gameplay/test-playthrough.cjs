/* 直接执行实际GameRoot算法，隔离内存存档，关闭渲染；不代替真人难度与真机验收。 */
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),ts=require(process.argv[2]||'typescript'),cache=new Map(),saved=new Map();
const noop=()=>{},Dummy=class{},cc={Component:Dummy,_decorator:{ccclass:()=>x=>x},Color:class{}};
const platform={PlatformService:{getNumber:(k,d)=>saved.get(k)??d,setNumber:(k,v)=>saved.set(k,v),setMaximumInteger:(k,v,max)=>saved.set(k,Math.min(max,Math.max(saved.get(k)??1,v))),getString:(k,d)=>saved.get(k)??d,setString:(k,v)=>saved.set(k,v)}};
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
 if(/[\\/]PlatformService.ts$/.test(file))return platform;
 if(/[\\/]ShopService.ts$/.test(file))return {ShopService:{shared:{update:noop}}};
 if(!/[\\/](ConfigTables|GameRoot|GameConfig|LevelConfig|StaffEvolution|ChallengeRun|ChallengeTopics|LevelLoadout|TutorialGuide|CollectionData|BattleLayout).ts$/.test(file))return new Proxy({},{get:()=>Dummy});
 const mod={exports:{}};cache.set(file,mod);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2018,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
 new Function('require','module','exports',code)(id=>id==='cc'?cc:id==='cc/env'?{DEBUG:true}:id.startsWith('.')?load(path.resolve(path.dirname(file),id+'.ts')):require(id),mod,mod.exports);return mod.exports;}
const core=load(root+'/assets/scripts/config/ConfigTables.ts');core.installConfigs(Object.fromEntries(core.TABLE_NAMES.map(k=>[k,fs.readFileSync(root+'/assets/resources/config/'+k+'.csv','utf8')])));
const {GameRoot}=load(root+'/assets/scripts/gameplay/battle/GameRoot.ts'),cfg=load(root+'/assets/scripts/gameplay/battle/GameConfig.ts');
const originalPolicy="function samples(g){const a=[];for(let d=0;d<g.pathLength;d+=10)a.push({...g.pathPosition(d),p:d/g.pathLength});return a;}\nfunction score(g,p,k,a){const range=cfg.TOWER_CONFIG[k].range*(1+((p.level||1)-1)*.08);return a.reduce((v,q)=>v+(Math.hypot(q.x-p.x,q.y-p.y)<=range?1-.25*q.p:0),0)/(1+g.towers.filter(t=>Math.hypot(t.x-p.x,t.y-p.y)<range*.8).length*.13);}\nfunction choose(g,mode){const ks=g.level.availableTowers;if(mode==='single'||mode==='newbie')return ks.includes('sprout')?'sprout':ks.includes('scope')?'scope':ks[0];const weights={sprout:3,frost:1,bloom:3,scope:3,spark:2,ember:1.5,mint:1,fan:3};return [...ks].sort((a,b)=>(g.towers.filter(t=>t.kind===a).length+.5)/weights[a]-(g.towers.filter(t=>t.kind===b).length+.5)/weights[b])[0];}\nfunction act(g,mode,a){const kind=choose(g,mode),spots=g.spots.filter(s=>!s.obstacle&&!s.tower).sort((x,y)=>score(g,y,kind,a)-score(g,x,kind,a));const up=g.towers.filter(t=>t.level<3).sort((x,y)=>score(g,y,y.kind,a)/g.upgradeCost(y)-score(g,x,x.kind,a)/g.upgradeCost(x))[0];const threshold=mode==='spread'?18:6;\n if(up&&(g.towers.length>=threshold||!spots.length)&&g.coins>=g.upgradeCost(up)){g.selectedTower=up;g.upgradeSelected();if(g.evolutionTower){const choices=g.evolutionMenuItems();g.evolveSelected(choices[up.kind==='bloom'?1:0].evolution.key);}}\n else if(spots.length&&g.coins>=cfg.TOWER_CONFIG[kind].cost)g.buildTower(spots[0],kind);\n else if(up&&g.towers.length>=4&&mode!=='spread'&&g.coins>=g.upgradeCost(up)){g.selectedTower=up;g.upgradeSelected();if(g.evolutionTower){const choices=g.evolutionMenuItems();g.evolveSelected(choices[up.kind==='bloom'?1:0].evolution.key);}}\n if(mode==='newbie'){g.selectedObstacle=null;return;}\n const reachable=g.obstacles.map(o=>({o,n:g.towers.filter(t=>Math.hypot(t.x-o.x,t.y-o.y)<=cfg.TOWER_CONFIG[t.kind].range*(1+(t.level-1)*.08)).length})).filter(x=>x.n).sort((x,y)=>y.n*y.o.reward/y.o.hp-x.n*x.o.reward/x.o.hp);if(reachable.length){g.selectedObstacle=reachable[0].o;g.selectedSpot=g.selectedObstacle.spot;g.selectedTower=null;}\n}\n";
const policy=new Function('cfg',originalPolicy+';return {samples,act};')(cfg),results=[];
for(let id=1;id<=26;id++){
 const g=new GameRoot();g.audio={play:noop};g.drawStaticMap=noop;g.render=noop;g.evolutionMenuItems=()=>load(root+'/assets/scripts/gameplay/battle/StaffEvolution.ts').evolutionChoices(g.evolutionTower.kind).map(evolution=>({evolution}));g.unlockedLevel=Math.min(20,id);g.booted=true;g.resetLevel(id);if(g.challenge){g.challenge.seed=42;g.challenge.pending=false;g.challenge.offers=[];g.challenge.offer(g.challengePort());}
 const samples=policy.samples(g);let time=0,next=0,picks=0;
 while(g.screen==='playing'&&time<900){
  if(g.challenge?.pending){assert.ok(g.challenge.choose(g.challenge.offers[0],g.challengePort()));picks++;}
  if(time>=next){policy.act(g,'mixed',samples);next=time+.25;}
  g.update(1/30);time+=1/30;
  assert.ok(Number.isFinite(g.coins)&&g.coins>=0);assert.ok(g.towers.every(t=>Number.isFinite(t.cooldown)));
 }
 const result={id,screen:g.screen,wave:g.wave,seconds:Math.round(time),lives:g.lives,picks,coins:g.coins};results.push(result);console.log(JSON.stringify(result));
 assert.equal(g.screen,'win');if(id>20){assert.equal(picks,10);assert.ok(load(root+'/assets/scripts/services/ChallengeTopics.ts').clearedChallengeTopics().length===id-20);}
}
fs.writeFileSync(process.argv[3]||'G:/gptwork/shop-presentation/playthrough-results.json',JSON.stringify({kind:'实际GameRoot逻辑、隔离平台存档、无渲染自动策略',results},null,2));
