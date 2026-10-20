/* 实际GameRoot隔离对照；固定操作策略不等同真人胜率，科技快照不是经营成长结论。 */
const fs=require('fs'),assert=require('assert/strict'),crypto=require('crypto');
const harness=require('./battle-test-harness.cjs'),{core,cfg,root,load,setupGame}=harness;
const createPolicy=require('./battle-test-policy.cjs'),policy=createPolicy(cfg);
const output=process.argv[3]||'G:/gptwork/battle-acceptance-20261020/baseline.json';
const input=process.argv[4]?JSON.parse(fs.readFileSync(process.argv[4],'utf8')):{};
const profiles=input.profiles??['none','partial','full'],delta=input.delta??1/30,results=[];
assert.ok(delta>0&&delta<=.1);
const levels=core.rows('Level').slice().sort((a,b)=>Number(a.id)-Number(b.id));
const topics=core.rows('ChallengeTopic'),nodes=core.rows('TechnologyNode');
const loadout=load(root+'/assets/scripts/gameplay/battle/LevelLoadout.ts');
const shop=load(root+'/assets/scripts/services/ShopService.ts').ShopService.shared;
const legacyPlan=JSON.parse(fs.readFileSync(__dirname+'/challenge-validation-plan.json','utf8'));
function scenarioFor(level){
 const topic=topics.find(t=>Number(t.levelId)===Number(level.id));
 return input.scenarios?.[level.id]??input.strategy??(topic?(legacyPlan.topicScenarios?.[topic.key]??legacyPlan.levelScenarios?.[Number(topic.order)+20])?.[0]:null)??{mode:'mixed',tech:'build',seed:42};
}
const report={kind:'真实GameRoot；隔离内存存档；无渲染、广告、道具、复活或战斗资源注入；部分科技=合法进度内每分支前3层的假定快照，不代表正常玩家持有量',input,delta,sourceHashes:Object.fromEntries(['assets/scripts/gameplay/battle/GameRoot.ts','assets/resources/config/Wave.csv','assets/resources/config/TechnologyNode.csv'].map(f=>[f,crypto.createHash('sha256').update(fs.readFileSync(root+'/'+f)).digest('hex')])),results};
for(const profile of profiles)for(const level of levels.filter(l=>!input.ids||input.ids.includes(Number(l.id)))){
 const id=Number(level.id),scenario=scenarioFor(level),technology=profile==='none'?[]:nodes.filter(n=>profile==='full'||Number(n.tier)<=3&&Number(n.unlockLevel)<=Math.min(cfg.GAME_CONFIG.maxLevels,id-1));
 shop.state={technology:technology.map(n=>({key:n.key,paid:Number(n.cost)}))};
 const roster=scenario.roster??loadout.defaultLoadout(id);
 assert.ok(loadout.validLoadout(id,Math.min(cfg.GAME_CONFIG.maxLevels,id),roster),'非法测试阵容：'+id+' '+roster);
 const g=setupGame(id,scenario.seed??42,level.mode==='challenge'?3:1,roster),samples=policy.samples(g),events=[];
 // 仅用于明确标注的隔离A/B，不回写配置；正式验收不传这些覆盖。
 if(input.healthRatio&&id>3){if(g.challenge)for(const w of g.level.waves){w.healthScale*=input.healthRatio;w.eliteBaseHealthScale*=input.healthRatio;w.bossHealthScale*=input.bossRatio??1;}else g.level.enemyHealthScale*=input.healthRatio;}
 if(input.openingRatio&&id>3&&!g.challenge)for(const [i,w]of g.level.waves.entries()){const ratio=1-(1-input.openingRatio)*Math.max(0,1-i/((input.openingWaves??8)-1));w.healthScale*=ratio;w.bossHealthScale/=ratio;}
 if(input.challengeOpeningRatio&&g.challenge)for(const [i,w]of g.level.waves.entries()){const ratio=1-(1-input.challengeOpeningRatio)*Math.max(0,1-i/19);w.healthScale*=ratio;w.eliteBaseHealthScale*=ratio;}
 let time=0,next=0,lastWave=0,picks=0,peak=0,stall=0,nonfinite=null;
 const limit=Math.floor(g.spots.length*(scenario.cap??1));
 while(g.screen==='playing'&&time<(input.maxSeconds??1800)){
  if(g.challenge?.pending){const key=scenario.tech==='strong'?createPolicy.choosePerk(g.challenge):createPolicy.chooseHordePerk(g.challenge);assert.ok(g.challenge.choose(key,g.challengePort()),'补给选择失败');picks++;}
  if(time>=next){policy.act(g,scenario.mode??'mixed',samples,scenario.upgrades!==false,limit);next=time+.25;}
  g.update(delta);time+=delta;peak=Math.max(peak,g.enemies.length);
  if(!Number.isFinite(g.coins)||g.coins<0||g.towers.some(t=>!Number.isFinite(t.cooldown))||g.enemies.some(e=>!Number.isFinite(e.hp)||!Number.isFinite(e.distance))){nonfinite={time,wave:g.wave};break;}
  if(g.wave!==lastWave){events.push({wave:g.wave,seconds:Number(time.toFixed(2)),lives:g.lives,coins:g.coins,towers:g.towers.length});lastWave=g.wave;stall=time;}
 }
 const row={id,mode:level.mode,roster:[...roster],profile,technology:technology.map(n=>n.key),scenario,seed:scenario.seed??42,result:nonfinite?'invalid':g.screen,wave:g.wave,totalWaves:g.level.waves.length,seconds:Number(time.toFixed(2)),lastWaveSeconds:Number((time-stall).toFixed(2)),speed:g.gameSpeed,lives:g.lives,picks,supplyLimit:g.challenge?.supplyLimit??0,coins:g.coins,killed:g.defeated,peakEnemies:peak,towers:g.towers.length,spots:g.spots.length,evolved:g.towers.filter(t=>t.evolutionKey).length,bosses:g.enemies.filter(e=>cfg.ENEMY_CONFIG[e.kind].boss).map(e=>({kind:e.kind,hp:Math.ceil(e.hp),progress:Number((e.distance/g.pathLength).toFixed(3))})),events,nonfinite};
 results.push(row);fs.writeFileSync(output,JSON.stringify(report,null,2));console.log(JSON.stringify({...row,technology:row.technology.length,events:undefined,scenario:undefined}));
}
shop.state=null;
assert.equal(results.length,profiles.length*levels.filter(l=>!input.ids||input.ids.includes(Number(l.id))).length);
assert.ok(results.every(r=>!r.nonfinite),'出现非法数值');
console.log('完成'+results.length+'局，胜利'+results.filter(r=>r.result==='win').length+'，策略失败'+results.filter(r=>r.result==='lose').length+'，超时'+results.filter(r=>r.result==='playing').length);
