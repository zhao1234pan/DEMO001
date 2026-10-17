/* 真实GameRoot的长局与负面对照。真实秒数按3倍速update推进；不代替真人、渲染或设备性能。 */
const fs=require('fs'),assert=require('assert/strict'),{cfg,setupGame}=require('./battle-test-harness.cjs'),createPolicy=require('./battle-test-policy.cjs'),policy=createPolicy(cfg);
const input=process.argv[4]?JSON.parse(fs.readFileSync(process.argv[4],'utf8')):{},output=process.argv[3]||'G:/gptwork/challenge-epic-balance/final-balance.json';
const delta=input.delta??1/30;assert.ok(Number.isFinite(delta)&&delta>0&&delta<=.1,'测试帧步必须在有效追赶范围内');
const scenarios=input.scenarios??[{name:'八成铺图',cap:.82,tech:'strong',seed:42,expected:'win'},{name:'半图强化',cap:.55,tech:'strong',seed:42,expected:'lose'},{name:'不升级',cap:.82,tech:'strong',seed:42,upgrades:false,expected:'lose'},{name:'无额外科技',cap:.82,tech:'none',seed:42,expected:'lose'}],results=[];
for(const id of input.ids??[21,22,23,24,25,26])for(const scenario of scenarios){
 const g=setupGame(id,scenario.seed??42),limit=Math.floor(g.spots.length*(scenario.cap??1)),build=g.buildTower.bind(g);g.buildTower=(...args)=>g.towers.length<limit?build(...args):undefined;
 const samples=policy.samples(g);let time=0,next=0,picks=0,peak=0,spawned=0,lastWave=0;const waves=[],spawn=g.spawnEnemy.bind(g);g.spawnEnemy=k=>{spawned++;spawn(k);};
 while(g.screen==='playing'&&time<(input.maxSeconds??1500)){
  if(g.challenge.pending){if(scenario.tech==='none'){g.challenge.completedChoices.push(g.wave);g.challenge.pending=false;g.challenge.offers=[];}else assert.ok(g.challenge.choose(scenario.tech==='strong'?createPolicy.choosePerk(g.challenge):g.challenge.offers[0],g.challengePort()));picks++;}
  if(time>=next){policy.act(g,scenario.mode??'mixed',samples,scenario.upgrades!==false);next=time+.25;}
  g.update(delta);time+=delta;peak=Math.max(peak,g.enemies.length);assert.ok(Number.isFinite(g.coins)&&g.coins>=0);
  if(g.wave!==lastWave){lastWave=g.wave;waves.push({wave:g.wave,seconds:Math.round(time),towers:g.towers.length,lives:g.lives,coins:Math.round(g.coins)});}
 }
 const result={id,scenario:scenario.name,seed:scenario.seed??42,result:g.screen,wave:g.wave,realSeconds:Math.round(time),lives:g.lives,spawned,killed:g.defeated,peakEnemies:peak,towers:g.towers.length,spots:g.spots.length,occupancy:Number((g.towers.length/g.spots.length).toFixed(3)),upgraded:g.towers.filter(t=>t.level>1).length,maxLevel:g.towers.filter(t=>t.level===3).length,coins:Math.round(g.coins),picks,tech:g.challenge.selected,waves};
 results.push(result);console.log(JSON.stringify({...result,waves:undefined}));fs.writeFileSync(output,JSON.stringify({kind:'真实GameRoot、3倍速、隔离存档、无广告与道具、无渲染自动策略',input,scenarios,results},null,2));
 if(input.verify!==false){if(scenario.expected)assert.equal(g.screen,scenario.expected,id+' '+scenario.name);if(scenario.expected==='win'){assert.ok(time>=840&&time<=1020,'3倍速胜利应接近15分钟');assert.ok(result.occupancy>=.8&&result.occupancy<=.85);assert.ok(result.upgraded>=Math.floor(result.towers*.75));assert.equal(picks,10);}}
}
