/* 扩关存档与真实出怪接线检查，不模拟整局胜负或数值平衡。 */
const assert=require('node:assert/strict'),{root,load,setupGame}=require('./battle-test-harness.cjs');
const {PlatformService}=load(root+'/assets/scripts/services/PlatformService.ts');
const {CollectionProgress,COLLECTION_ENEMY_KEYS}=load(root+'/assets/scripts/gameplay/battle/CollectionData.ts');
let passed=0;function test(name,fn){fn();passed++;console.log('PASS '+name);}
test('旧版已通关20关的存档自动接续21关，尚未通关不提前开放',()=>{
 const g=setupGame(1);PlatformService.setNumber('night_store_unlocked_level',20);PlatformService.setNumber('night_store_best_level',20);assert.equal(g.readUnlockedLevel(),21);assert.equal(PlatformService.getNumber('night_store_unlocked_level',1),21);
 PlatformService.setNumber('night_store_unlocked_level',20);PlatformService.setNumber('night_store_best_level',19);assert.equal(g.readUnlockedLevel(),20);
 PlatformService.setNumber('night_store_unlocked_level',30);PlatformService.setNumber('night_store_best_level',30);assert.equal(g.readUnlockedLevel(),30);
});
test('冒险21–30和挑战31–40均以自身模式启动，不根据旧编号误判',()=>{for(let id=21;id<=40;id++){const g=setupGame(id);assert.equal(g.level.id,id);assert.equal(Boolean(g.challenge),id>30);assert.equal(g.level.waves.length,id>30?30:20);}});
test('六个新种类实际出生并记录图鉴，GM出生不写正式遭遇',()=>{
 const g=setupGame(30),keys=['mochi','popcorn','noodlecup','frostdonut','freezer','vending'];g.collection=new CollectionProgress(1);g.wave=20;g.inWave=true;
 for(const key of keys){const n=g.enemies.length;g.spawnEnemy(key);assert.equal(g.enemies.length,n+1);assert.equal(g.enemies.at(-1).kind,key);assert.equal(PlatformService.getNumber(COLLECTION_ENEMY_KEYS[key],0),1);}
 PlatformService.setNumber(COLLECTION_ENEMY_KEYS.vending,0);const c=setupGame(40);c.collection=new CollectionProgress(1);c.wave=1;assert.ok(c.spawnEnemy('vending'));assert.equal(PlatformService.getNumber(COLLECTION_ENEMY_KEYS.vending,0),1);
 PlatformService.setNumber(COLLECTION_ENEMY_KEYS.freezer,0);const h=setupGame(40);h.collection=new CollectionProgress(1);h.gmSessionActive=true;h.wave=1;h.spawnEnemy('freezer');assert.equal(PlatformService.getNumber(COLLECTION_ENEMY_KEYS.freezer,0),0);
});
console.log(passed+'项扩关进度与出怪检查通过');
