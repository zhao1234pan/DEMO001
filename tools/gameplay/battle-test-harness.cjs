/* 直接执行实际GameRoot算法，隔离内存存档，关闭渲染；不代替真人难度与真机验收。 */
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const root=path.resolve(__dirname,'../..'),ts=require(process.argv[2]||'typescript'),cache=new Map(),saved=new Map();
const noop=()=>{},Dummy=class{},cc={Component:Dummy,_decorator:{ccclass:()=>x=>x},Color:class{}};
const platform={PlatformService:{getNumber:(k,d)=>saved.get(k)??d,setNumber:(k,v)=>saved.set(k,v),setMaximumInteger:(k,v,max)=>saved.set(k,Math.min(max,Math.max(saved.get(k)??1,v))),getString:(k,d)=>saved.get(k)??d,setString:(k,v)=>saved.set(k,v)}};
function load(file){file=path.resolve(file);if(cache.has(file))return cache.get(file).exports;
 if(/[\\/]PlatformService.ts$/.test(file))return platform;
 if(/[\\/]ShopService.ts$/.test(file))return {ShopService:{shared:{update:noop}}};
 if(!/[\\/](ConfigTables|CrowdFlow|GameRoot|GameConfig|LevelConfig|StaffEvolution|ChallengeRun|ChallengeTopics|LevelLoadout|TutorialGuide|CollectionData|BattleLayout).ts$/.test(file))return new Proxy({},{get:()=>Dummy});
 const mod={exports:{}};cache.set(file,mod);const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2018,module:ts.ModuleKind.CommonJS,experimentalDecorators:true}}).outputText;
 new Function('require','module','exports',code)(id=>id==='cc'?cc:id==='cc/env'?{DEBUG:true}:id.startsWith('.')?load(path.resolve(path.dirname(file),id+'.ts')):require(id),mod,mod.exports);return mod.exports;}
const core=load(root+'/assets/scripts/config/ConfigTables.ts');core.installConfigs(Object.fromEntries(core.TABLE_NAMES.map(k=>[k,fs.readFileSync(root+'/assets/resources/config/'+k+'.csv','utf8')])));
const {GameRoot}=load(root+'/assets/scripts/gameplay/battle/GameRoot.ts'),cfg=load(root+'/assets/scripts/gameplay/battle/GameConfig.ts');

function setupGame(id,seed=42,speed=id>20?3:1){const g=new GameRoot();g.audio={play:noop};g.drawStaticMap=noop;g.render=noop;g.evolutionMenuItems=()=>load(root+"/assets/scripts/gameplay/battle/StaffEvolution.ts").evolutionChoices(g.evolutionTower.kind).map(evolution=>({evolution}));g.unlockedLevel=Math.min(20,id);g.booted=true;g.resetLevel(id);g.level=structuredClone(g.level);g.gameSpeed=speed;if(g.challenge){g.challenge.seed=seed;g.challenge.pending=false;g.challenge.offers=[];g.challenge.offer(g.challengePort());}return g;}
module.exports={root,core,cfg,load,GameRoot,setupGame};
