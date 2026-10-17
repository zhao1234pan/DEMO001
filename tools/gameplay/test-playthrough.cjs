/* 实际GameRoot隔离通关：冒险沿用原混合策略；挑战按已找到的可行构筑样本复验，不代替真人难度。 */
const fs=require('fs'),assert=require('assert/strict'),{root,cfg,load,setupGame}=require('./battle-test-harness.cjs'),createPolicy=require('./battle-test-policy.cjs'),policy=createPolicy(cfg),results=[];
const plan=JSON.parse(fs.readFileSync(process.argv[4]||__dirname+'/challenge-validation-plan.json','utf8'));
for(let id=1;id<=26;id++){
 const scenario=id>20?plan.levelScenarios[id][0]:{},g=setupGame(id,scenario.seed??42,id>20?3:1,scenario.roster),samples=policy.samples(g);let time=0,next=0,picks=0;
 if(scenario.cap){const build=g.buildTower.bind(g),limit=Math.floor(g.spots.length*scenario.cap);g.buildTower=(...args)=>g.towers.length<limit?build(...args):undefined;}
 while(g.screen==='playing'&&time<(id>20?1500:900)){
  if(g.challenge?.pending){assert.ok(g.challenge.choose(scenario.tech==='build'?createPolicy.chooseHordePerk(g.challenge):createPolicy.choosePerk(g.challenge),g.challengePort()));picks++;}
  if(time>=next){policy.act(g,scenario.mode??'mixed',samples);next=time+.25;}
  g.update(1/30);time+=1/30;
  assert.ok(Number.isFinite(g.coins)&&g.coins>=0);assert.ok(g.towers.every(t=>Number.isFinite(t.cooldown)));
 }
 const result={id,seed:scenario.seed??42,scenario:id>20?scenario.name:'原冒险策略',screen:g.screen,wave:g.wave,seconds:Math.round(time),speed:g.gameSpeed,lives:g.lives,picks,coins:g.coins,towers:g.towers.length,spots:g.spots.length};results.push(result);console.log(JSON.stringify(result));
 assert.equal(g.screen,'win');if(id>20){assert.equal(picks,10);assert.ok(load(root+'/assets/scripts/services/ChallengeTopics.ts').clearedChallengeTopics().length===id-20);}
}
fs.writeFileSync(process.argv[3]||'G:/gptwork/challenge-epic-balance/playthrough-results.json',JSON.stringify({kind:'实际GameRoot、隔离存档、无渲染自动策略；冒险1倍，挑战3倍',results},null,2));
