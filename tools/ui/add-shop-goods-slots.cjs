/** 根据已设计的UiLayout原表补充商品位节点；保留原Prefab与资源UUID。 */
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../..'),core=require('../config/validator.cjs'),{Prefab,setSkins}=require('./prefab-author.cjs');
const sourceDir=process.argv[2]||path.join(root,'assets/resources/config'),sources={};for(const name of core.TABLE_NAMES)sources[name]=fs.readFileSync(path.join(sourceDir,name+'.csv'),'utf8');core.installConfigs(sources);setSkins(core.rows('VisualSkin'));
const p=new Prefab('shop'),host='ShopOverlay/GoodsPicker';
for(const row of core.rows('UiLayout').filter(r=>r.prefab==='shop'&&/^ShopOverlay\/GoodsPicker\/(Slot\d+|Clear)$/.test(r.node))){
 if(p.n(host)._children.some(ref=>p.a[ref.__id__]._name===path.basename(row.node)))continue;
 const node=p.skinNode(host,path.basename(row.node),row.skinKey,+row.x,+row.y,+row.width,+row.height),label=core.rows('UiLayout').find(r=>r.key==='shop:'+row.node+'/Text');
 p.label(node,'Text','',+label.x,+label.y,+label.width,+label.height,+label.fontSize);
}
p.save();require('./config-layout.cjs').apply(root,core,true);console.log('商品位节点与原始布局同步');
