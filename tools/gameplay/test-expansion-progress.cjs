/* 扩关存档与真实出怪接线检查，不模拟整局胜负或数值平衡。 */
const assert=require('node:assert/strict'),{root,core,load,setupGame}=require('./battle-test-harness.cjs');
const {PlatformService}=load(root+'/assets/scripts/services/PlatformService.ts');
const {CollectionProgress,COLLECTION_ENEMY_KEYS}=load(root+'/assets/scripts/gameplay/battle/CollectionData.ts');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('旧到达记录不能当首通，保留已有解锁，可靠首通可接续下一关',()=>{
 const g=setupGame(1),key=core.globalString('adventureClearedSaveKey');PlatformService.setNumber(key,0);
 PlatformService.setNumber('night_store_unlocked_level',20);PlatformService.setNumber('night_store_best_level',30);assert.equal(g.readUnlockedLevel(),20);
 PlatformService.setNumber(key,20);assert.equal(g.readUnlockedLevel(),21);assert.equal(PlatformService.getNumber('night_store_unlocked_level',1),21);
 PlatformService.setNumber('night_store_unlocked_level',30);PlatformService.setNumber(key,0);assert.equal(g.readUnlockedLevel(),30);
});
test('失败不推进关卡或正式首通，胜利才开放下一关与30关完成记录',()=>{
 const key=core.globalString('adventureClearedSaveKey');
 for(const id of [5,20,30]){PlatformService.setNumber('night_store_unlocked_level',id);PlatformService.setNumber(key,id-1);PlatformService.setNumber('night_store_best_level',id-1);
  const g=setupGame(id);g.wave=1;g.inWave=true;g.queue=['normal'];g.spawnEnemy('normal');g.enemies[0].distance=g.pathLength;g.lives=1;g.update(.01);
  assert.equal(g.screen,'lose');assert.equal(g.readUnlockedLevel(),id);assert.equal(PlatformService.getNumber(key,0),id-1);assert.equal(PlatformService.getNumber('night_store_best_level',0),id-1);
  const h=setupGame(id);h.wave=h.level.waves.length;h.inWave=true;h.queue=[];h.enemies=[];h.update(.01);assert.equal(h.screen,'win');assert.equal(PlatformService.getNumber(key,0),id);assert.equal(h.readUnlockedLevel(),Math.min(30,id+1));
 }
});
test('GM胜利和不推进战斗的地图评审都不写正式首通',()=>{
 const key=core.globalString('adventureClearedSaveKey');for(const mode of ['gmSessionActive','mapReview']){PlatformService.setNumber('night_store_unlocked_level',1);PlatformService.setNumber(key,0);const g=setupGame(20);g[mode]=true;g.wave=g.level.waves.length;g.inWave=true;g.queue=[];g.update(.01);assert.equal(g.screen,mode==='mapReview'?'playing':'win');assert.equal(PlatformService.getNumber(key,0),0);assert.equal(PlatformService.getNumber('night_store_unlocked_level',1),1);}
});
test('冒险21–30和挑战31–40均以自身模式启动，不根据旧编号误判',()=>{for(let id=21;id<=40;id++){const g=setupGame(id);assert.equal(g.level.id,id);assert.equal(Boolean(g.challenge),id>30);assert.equal(g.level.waves.length,id>30?30:20);}});
test('六个新种类实际出生并记录图鉴，GM出生不写正式遭遇',()=>{
 const g=setupGame(30),keys=['mochi','popcorn','noodlecup','frostdonut','freezer','vending'];g.collection=new CollectionProgress(1);g.wave=20;g.inWave=true;
 for(const key of keys){const n=g.enemies.length;g.spawnEnemy(key);assert.equal(g.enemies.length,n+1);assert.equal(g.enemies.at(-1).kind,key);assert.equal(PlatformService.getNumber(COLLECTION_ENEMY_KEYS[key],0),1);}
 PlatformService.setNumber(COLLECTION_ENEMY_KEYS.vending,0);const c=setupGame(40);c.collection=new CollectionProgress(1);c.wave=1;assert.ok(c.spawnEnemy('vending'));assert.equal(PlatformService.getNumber(COLLECTION_ENEMY_KEYS.vending,0),1);
 PlatformService.setNumber(COLLECTION_ENEMY_KEYS.freezer,0);const h=setupGame(40);h.collection=new CollectionProgress(1);h.gmSessionActive=true;h.wave=1;h.spawnEnemy('freezer');assert.equal(PlatformService.getNumber(COLLECTION_ENEMY_KEYS.freezer,0),0);
});
console.log(passed+'项扩关进度与出怪检查通过');
