const fs=require('fs'),path=require('path'),assert=require('assert/strict');const root=path.resolve(__dirname,'../..'),core=require('../config/validator.cjs'),sources={};for(const n of core.TABLE_NAMES)sources[n]=fs.readFileSync(path.join(root,'assets/resources/config',n+'.csv'),'utf8');core.installConfigs(sources);
const fixture=fs.mkdtempSync(path.join(process.env.CONFIG_WORK_DIR||path.join(path.parse(root).root,'gptwork'),'png-regression-'));for(const d of ['assets','source_assets/art','tools/art'])fs.cpSync(path.join(root,d),path.join(fixture,d),{recursive:true});
const check=()=>require('./check-resources.cjs').check(fixture,core,true),ui=()=>require('../ui/check-prefabs.cjs').check(fixture,core);let count=0;function test(n,f){f();console.log('PASS '+n);count++;}function mutation(file,edit,fn){const p=path.join(fixture,file),before=fs.readFileSync(p);try{fs.writeFileSync(p,edit(before));fn();}finally{fs.writeFileSync(p,before);}}
test('全部原生切片、源图签名和预制体引用有效',()=>{check();ui();});
test('拒绝恢复Graphics或关闭packable',()=>{for(const bad of ['import { Graphics } from "cc";','x.packable=false;','new SpriteFrame();'])mutation('assets/scripts/ui/PngSurface.ts',b=>b+'\n'+bad,()=>assert.throws(check,/不允许程序绘图/));});
const image=core.rows('ArtFrame')[0].assetPath.replace('/spriteFrame','.png');
test('拒绝不可打包的角色meta',()=>mutation('assets/art/'+image+'.meta',b=>{const m=JSON.parse(b);m.subMetas.f9941.userData.packable=false;return JSON.stringify(m);},()=>assert.throws(check,/导入设置/)));
test('地图源布局变化必须重烘焙',()=>mutation('tools/art/map-source.ts',b=>b+'\n// 修改地图\n',()=>assert.throws(check,/地图PNG已过期/)));
const skin=core.rows('VisualSkin').find(r=>r.mode==='sliced');
test('拒绝九宫边距与XLSX导出不一致',()=>mutation('assets/art/'+skin.path.replace('/spriteFrame','.png.meta'),b=>{const m=JSON.parse(b);m.subMetas.f9941.userData.borderLeft++;return JSON.stringify(m);},()=>assert.throws(ui,/九宫边距/)));
test('拒绝预制体组件指向其他节点',()=>mutation('assets/resources/ui/home.prefab',b=>{const a=JSON.parse(b),c=a.find(o=>o.image&&o.key);c.node={__id__:0};return JSON.stringify(a);},()=>assert.throws(ui,/组件所属节点/)));
console.log(count+'项资源回归通过；隔离证据：'+fixture);
