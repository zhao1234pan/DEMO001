/* 构建门禁：拒绝程序绘图、失效原生切片、过期地图图片。 */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
function signature(root,core){const input={};for(const n of ['Theme','Map','MapPoint','Spot'])input[n]=core.rows(n);input.Level=core.rows('Level').map(r=>({id:r.id,mapId:r.mapId}));input.layout=fs.readFileSync(path.join(root,'tools/art/map-source.ts'),'utf8');return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');}
function check(root,core,strict=true){
 for(const level of core.rows("Level"))if(!core.rows("VisualSkin").some(r=>r.key==="map_"+level.id))throw Error("关卡缺少地图PNG引用："+level.id);
 for(const row of core.rows('ArtFrame')){
  if(!/^[-a-zA-Z0-9_/]+\/spriteFrame$/.test(row.assetPath)||row.assetPath.includes('..'))throw Error('非法原生切片路径');
  const p=path.join(root,'assets/art',row.assetPath.replace('/spriteFrame','.png')),b=fs.readFileSync(p),meta=JSON.parse(fs.readFileSync(p+'.meta','utf8')),sf=meta.subMetas?.f9941?.userData;
  if(b.readUInt32BE(16)!==Number(row.canvasWidth)||b.readUInt32BE(20)!==Number(row.canvasHeight)||!sf||sf.width!==Number(row.canvasWidth)||sf.height!==Number(row.canvasHeight)||sf.rawWidth!==Number(row.canvasWidth)||sf.rawHeight!==Number(row.canvasHeight)||sf.packable!==true||sf.trimType!=='none')throw Error('原生图片尺寸或导入设置错误：'+row.assetPath);
 }
 function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|prefab|scene)$/.test(p)){const s=fs.readFileSync(p,'utf8');if(/\bGraphics\b|new\s+SpriteFrame\s*\(|packable\s*=\s*false|(?:getContext\(['"]2d|createElement\(['"]canvas)/.test(s))throw Error('不允许程序绘图或手工切片：'+p);}}}walk(path.join(root,'assets'));
 if(strict){const file=path.join(root,'source_assets/art/production/png_maps/manifest.json');if(!fs.existsSync(file)||JSON.parse(fs.readFileSync(file,'utf8')).source!==signature(root,core))throw Error('地图PNG已过期：导出CSV后运行 tools/art/bake-maps.cjs');}
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'source_assets/art/production/ui_redesign_20261007/cut-manifest.json'),'utf8'));
 for(const row of core.rows('ArtCut')){
  const source=fs.readFileSync(path.join(root,row.source));if(crypto.createHash('sha256').update(source).digest('hex')!==row.sha256)throw Error('切图源文件已变化：'+row.key);
  const target=core.rows(row.target==='skin'?'VisualSkin':'ArtFrame').find(r=>r.id===row.targetId),file='assets/art/'+(target.path||target.assetPath).replace('/spriteFrame','.png'),record=manifest.records.find(r=>r.key===row.key),b=fs.readFileSync(path.join(root,file));
  if(!record||record.target!==file||record.cut!==crypto.createHash('sha256').update(JSON.stringify(row)).digest('hex')||record.sha256!==crypto.createHash('sha256').update(b).digest('hex'))throw Error('切图PNG或配置已过期：'+row.key);
  if(+row.padding){const a=require('./png-alpha.cjs').alpha(b);for(let y=0;y<a.h;y++)for(let x=0;x<a.w;x++)if((x<+row.padding||x>=a.w-row.padding||y<+row.padding||y>=a.h-row.padding)&&a.get(x,y))throw Error('PNG透明留白不足：'+row.key);}
 }
 for(const row of core.rows('ArtFrame'))if(+row.canvasWidth!==+row.canvasHeight)throw Error('替换角色画布必须为正方形：'+row.id);
 const families=new Map();for(const row of core.rows('ArtFrame')){const group=path.dirname(path.dirname(row.assetPath)),size=row.canvasWidth+'x'+row.canvasHeight;if(families.has(group)&&families.get(group)!==size)throw Error('同族角色画布不一致：'+group);families.set(group,size);}
 return {frames:core.rows('ArtFrame').length,skins:core.rows('VisualSkin').length};
}
module.exports={check,signature};
