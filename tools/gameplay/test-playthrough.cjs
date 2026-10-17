/* 实际GameRoot隔离通关：冒险沿用原混合策略；挑战3倍速优先选匹配强化，不代替真人难度。 */
const fs=require('fs'),assert=require('assert/strict'),{root,cfg,load,setupGame}=require('./battle-test-harness.cjs'),createPolicy=require('./battle-test-policy.cjs'),policy=createPolicy(cfg),results=[];
for(let id=1;id<=26;id++){
 const g=setupGame(id),samples=policy.samples(g);let time=0,next=0,picks=0;
 while(g.screen==='playing'&&time<(id>20?1500:900)){
  if(g.challenge?.pending){assert.ok(g.challenge.choose(createPolicy.choosePerk(g.challenge),g.challengePort()));picks++;}
  if(time>=next){policy.act(g,'mixed',samples);next=time+.25;}
  g.update(1/30);time+=1/30;
  assert.ok(Number.isFinite(g.coins)&&g.coins>=0);assert.ok(g.towers.every(t=>Number.isFinite(t.cooldown)));
 }
 const result={id,screen:g.screen,wave:g.wave,seconds:Math.round(time),speed:g.gameSpeed,lives:g.lives,picks,coins:g.coins,towers:g.towers.length,spots:g.spots.length};results.push(result);console.log(JSON.stringify(result));
 assert.equal(g.screen,'win');if(id>20){assert.equal(picks,10);assert.ok(load(root+'/assets/scripts/services/ChallengeTopics.ts').clearedChallengeTopics().length===id-20);}
}
fs.writeFileSync(process.argv[3]||'G:/gptwork/challenge-epic-balance/playthrough-results.json',JSON.stringify({kind:'实际GameRoot、隔离存档、无渲染自动策略；冒险1倍，挑战3倍',results},null,2));
