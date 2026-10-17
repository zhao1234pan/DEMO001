/* 真实GameRoot的长局与负面对照。真实秒数按3倍速update推进；不代替真人、渲染或设备性能。 */
const fs=require('fs'),assert=require('assert/strict'),{cfg,core,root,setupGame}=require('./battle-test-harness.cjs'),createPolicy=require('./battle-test-policy.cjs'),policy=createPolicy(cfg);
const input=JSON.parse(fs.readFileSync(process.argv[4]||__dirname+'/challenge-validation-plan.json','utf8')),output=process.argv[3]||'G:/gptwork/challenge-difficulty/final-balance.json';
// 数值复调用同一测试策略加载历史表，前后对照不写回工程或玩家存档。
if(input.configRef){assert.match(input.configRef,/^[0-9a-f]{7,40}$/);const cp=require('child_process');core.installConfigs(Object.fromEntries(core.TABLE_NAMES.map(n=>[n,cp.execFileSync('git',['show',input.configRef+':assets/resources/config/'+n+'.csv'],{cwd:root,encoding:'utf8',windowsHide:true})])));}
const delta=input.delta??1/30;assert.ok(Number.isFinite(delta)&&delta>0&&delta<=.1,'测试帧步必须在有效追赶范围内');
// 默认方案是调参中已找到的可行样本，不代表所有选法；负面对照另行指定。
const scenarios=input.scenarios??[{name:'最终全图构筑',cap:1,tech:'strong',seed:42,expected:'win'}],results=[];
for(const id of input.ids??[21,22,23,24,25,26])for(const scenario of input.levelScenarios?.[id]??scenarios){
 const g=setupGame(id,scenario.seed??42,3,scenario.roster),limit=Math.floor(g.spots.length*(scenario.cap??1)),build=g.buildTower.bind(g);g.buildTower=(...args)=>g.towers.length<limit?build(...args):undefined;
 const samples=policy.samples(g);let time=0,next=0,picks=0,peak=0,spawned=0,lastWave=0;const waves=[],spawn=g.spawnEnemy.bind(g);g.spawnEnemy=k=>{const ok=spawn(k);if(ok)spawned++;return ok;};
 let minClearance=Infinity,peakElites=0,carryovers=0,peakKillsPerSecond=0,nextCrowdSample=0;const recentKills=[];
 const killsByPhase={},defeat=g.defeatEnemyAt.bind(g);g.defeatEnemyAt=i=>{const e=g.enemies[i],phase=killsByPhase[g.wave]??={count:0,progressTotal:0,nearEntry:0};phase.count++;phase.progressTotal+=e.distance/g.pathLength;if(e.distance/g.pathLength<=.2)phase.nearEntry++;return defeat(i);};
 while(g.screen==='playing'&&time<(input.maxSeconds??1500)){
  if(g.challenge.pending){if(scenario.tech==='none'){g.challenge.completedChoices.push(g.wave);g.challenge.pending=false;g.challenge.offers=[];}else assert.ok(g.challenge.choose(scenario.tech==='build'?createPolicy.chooseHordePerk(g.challenge):scenario.tech==='strong'?createPolicy.choosePerk(g.challenge):g.challenge.offers[0],g.challengePort()));picks++;}
  if(time>=next){policy.act(g,scenario.mode??'mixed',samples,scenario.upgrades!==false);next=time+.25;}
  const prior=new Set(g.enemies);g.update(delta);time+=delta;peak=Math.max(peak,g.enemies.length);assert.ok(Number.isFinite(g.coins)&&g.coins>=0);
  peakElites=Math.max(peakElites,g.enemies.filter(e=>e.elite).length);recentKills.push({time,killed:g.defeated});while(recentKills.length>1&&recentKills[0].time<time-1)recentKills.shift();peakKillsPerSecond=Math.max(peakKillsPerSecond,g.defeated-recentKills[0].killed);
  if(g.wave!==lastWave&&g.enemies.some(e=>prior.has(e)))carryovers++;
  if(time>=nextCrowdSample){nextCrowdSample=time+.5;for(let i=0;i<g.enemies.length;i++){const a=g.enemies[i];assert.ok(Number.isFinite(a.x)&&Number.isFinite(a.y));for(let j=0;j<i;j++){const b=g.enemies[j],clear=Math.max(Math.abs(a.x-b.x),Math.abs(a.y-a.crowdLift-b.y+b.crowdLift))-a.crowdRadius-b.crowdRadius;minClearance=Math.min(minClearance,clear);assert.ok(clear+.001>=Number(g.challenge.rule.crowdGap),'实际怪潮身体重叠');}}}
  if(g.wave!==lastWave){lastWave=g.wave;waves.push({wave:g.wave,seconds:Math.round(time),towers:g.towers.length,lives:g.lives,coins:Math.round(g.coins)});}
 }
 const result={id,scenario:scenario.name,seed:scenario.seed??42,roster:g.level.availableTowers,result:g.screen,wave:g.wave,realSeconds:Math.round(time),lives:g.lives,spawned,killed:g.defeated,peakEnemies:peak,peakElites,carryovers,peakKillsPerSecond,minBodyClearance:Number.isFinite(minClearance)?Number(minClearance.toFixed(3)):null,towers:g.towers.length,spots:g.spots.length,occupancy:Number((g.towers.length/g.spots.length).toFixed(3)),upgraded:g.towers.filter(t=>t.level>1).length,maxLevel:g.towers.filter(t=>t.level===3).length,coins:Math.round(g.coins),picks,tech:g.challenge.selected,killsByPhase:Object.fromEntries(Object.entries(killsByPhase).map(([k,p])=>[k,{count:p.count,meanProgress:Number((p.progressTotal/p.count).toFixed(3)),entryKillRatio:Number((p.nearEntry/p.count).toFixed(3))}])),waves};
 results.push(result);console.log(JSON.stringify({...result,waves:undefined}));fs.writeFileSync(output,JSON.stringify({kind:'真实GameRoot、3倍速、隔离存档、无广告与道具、无渲染自动策略',input,scenarios,results},null,2));
  if(input.verify!==false){if(scenario.expected)assert.equal(g.screen,scenario.expected,id+' '+scenario.name);if(scenario.expected==='win'){assert.ok(time>=840&&time<=1020,'3倍速胜利应接近15分钟');assert.ok(result.occupancy>=.8&&result.occupancy<=(scenario.cap??1));assert.ok(result.upgraded>=Math.floor(result.towers*.75));assert.equal(picks,10);}}
}
