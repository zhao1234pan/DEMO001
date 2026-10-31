/* 固定字号、长内容和极值钱包的真实配置/呈现算法回归；不替代引擎截图。 */
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),ts=require(process.argv[2]||'typescript');
const root=path.resolve(__dirname,'../..'),core=require('../config/validator.cjs'),sources={};
for(const name of core.TABLE_NAMES)sources[name]=fs.readFileSync(root+'/assets/resources/config/'+name+'.csv','utf8');core.installConfigs(sources);
const mod={exports:{}};new Function('require','module','exports',ts.transpileModule(fs.readFileSync(root+'/assets/scripts/ui/UiNumber.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2018}}).outputText)(()=>core,mod,mod.exports);
const {compactUiCoins,battleUiCoins}=mod.exports,rows=core.rows('UiLayout'),get=(p,n)=>rows.find(r=>r.prefab===p&&r.node===n);
let passed=0;const test=(n,f)=>{f();passed++;console.log('PASS '+n);};
test('常用界面固定字号，确认版首页/图鉴与隐藏错误模板保留独立规格',()=>{
 const fixed=new Set([10,12,14,16,18,20,24,28,32]);
 for(const r of rows){if(!+r.fontSize||['home','collection','collection_card'].includes(r.prefab)||r.prefab==='loading'&&r.node==='Error')continue;assert.ok(fixed.has(+r.fontSize),r.key);assert.notEqual(r.overflow,'2',r.key);assert.ok(+r.height>=+r.lineHeight,r.key);}
});
test('浅底正文清除描边，关键操作保留用户要求的白字细描边',()=>{
 for(const[p,n]of [['challenge_card','Description'],['shop','ShopOverlay/Details/Rows/Row0/Description'],['technology','Detail/Nodes/Node0/Description'],['detail','ScrollViewport/Content/Known/Story']]){const r=get(p,n);assert.equal(+r.outlineWidth,0);assert.ok(+r.fontSize>=14);}
 for(const[p,n]of [['challenge_card','SelectText'],['challenge_pick','Refresh/Text'],['win','Primary/overlayPrimary']]){const r=get(p,n);assert.equal(r.color,'#ffffff');assert.ok(+r.outlineWidth>0&&+r.outlineWidth<=1.2);}
});
test('经营图文与操作分列，科技状态与效果分列，避免内部相交',()=>{
 for(let i=0;i<3;i++){const prefix=`ShopOverlay/Details/Rows/Row${i}`,icon=get('shop',prefix+'/Icon'),name=get('shop',prefix+'/Name'),buy=get('shop',prefix+'/Buy');assert.ok(+icon.x+icon.width/2<=name.x-name.width/2);assert.ok(+name.x+name.width/2+8<=buy.x-buy.width/2);assert.ok(+buy.height>=44);assert.equal(get('shop',prefix+'/Surface').skinKey,'window_mint');}
 for(let i=0;i<5;i++){const prefix=`Detail/Nodes/Node${i}`,desc=get('technology',prefix+'/Description'),state=get('technology',prefix+'/State');assert.ok(+desc.x+desc.width/2<state.x-state.width/2);assert.equal(get('technology',prefix+'/Surface').skinKey,get('technology',prefix+'/Selected').skinKey);assert.ok(+state.fontSize>=12);}
});
test('详情滚动拥有PNG裁切和固定标题，关闭不在裁切子树内',()=>{
 const a=JSON.parse(fs.readFileSync(root+'/assets/resources/ui/detail.prefab','utf8')),viewport=a.find(n=>n.__type__==='cc.Node'&&n._name==='ScrollViewport');assert.ok(viewport._components.some(r=>a[r.__id__].__type__==='cc.Mask'));assert.ok(viewport._components.some(r=>a[r.__id__].maskKey==='round_10'));for(const name of ['Title','Close','ScrollHint'])assert.ok(a[1]._children.some(r=>a[r.__id__]._name===name));assert.equal(get('detail','ScrollViewport/Content/Known/Story').overflow,'3');
});
test('零值、单位边界与大额金币显示紧凑，精确数值不被改写',()=>{
 for(const[value,result]of [[0,'0'],[999,'999'],[1000,'1千'],[9999,'9.9千'],[10000,'1万'],[969560,'96.9万'],[100000000,'1亿'],[1000000000000,'1万亿'],[Number.MAX_SAFE_INTEGER,'9007万亿']])assert.equal(compactUiCoins(value),result);
 for(const value of [NaN,Infinity,-1])assert.equal(compactUiCoins(value),'0');const before=JSON.stringify(core.rows('Global'));for(let i=0;i<20;i++)compactUiCoins(969560);assert.equal(JSON.stringify(core.rows('Global')),before);
 assert.equal(battleUiCoins(35000),'35000');assert.equal(battleUiCoins(100000),'10万');
});
test('金币显示坏配置在导表阶段拒绝，不污染正式配置',()=>{
 const encode=(fields,rs)=>fields.join(',')+'\n'+rs.map(r=>fields.map(k=>'"'+String(r[k]).replaceAll('"','""')+'"').join(',')).join('\n');
 for(const[key,value]of [['uiCoinDisplayUnits','0:ui.coin.thousand'],['uiCoinDisplayUnits','1000:ui.coin.thousand|10000:ui.coin.tenThousand'],['uiCoinDisplayUnits','1000:ui.coin.missing'],['uiCoinDisplayDecimals','3'],['uiBattleCoinDigits','7']]){const rs=core.parseCsv(sources.Global);rs.find(r=>r.key===key).value=value;assert.throws(()=>core.installConfigs({...sources,Global:encode(Object.keys(rs[0]),rs)}),/Invalid (UI coin|UI battle|reference)/);core.installConfigs(sources);}
});
console.log(JSON.stringify({passed,scope:'固定字号/内部安全区/滚动结构/紧凑金币算法；非实际画面'}));
