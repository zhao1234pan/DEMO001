/* 构建门禁：拒绝程序绘图、失效原生切片、过期地图图片。 */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
function signature(root,core){const input={};for(const n of ['Theme','Map','MapPoint','Spot'])input[n]=core.rows(n);input.Level=core.rows('Level').map(r=>({id:r.id,mapId:r.mapId}));input.layout=fs.readFileSync(path.join(root,'tools/art/map-source.ts'),'utf8');return crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex');}
function check(root,core,strict=true){
 for(const level of core.rows("Level"))if(!core.rows("VisualSkin").some(r=>r.key==="map_"+level.id))throw Error("关卡缺少地图PNG引用："+level.id);
 for(const row of core.rows('ArtFrame')){
  if(!/^[-a-zA-Z0-9_/]+\/spriteFrame$/.test(row.assetPath)||row.assetPath.includes('..'))throw Error('非法原生切片路径');
  const p=path.join(root,'assets/art',row.assetPath.replace('/spriteFrame','.png')),b=fs.readFileSync(p),meta=JSON.parse(fs.readFileSync(p+'.meta','utf8')),sf=meta.subMetas?.f9941?.userData;
  if(b.readUInt32BE(16)!==Number(row.width)||b.readUInt32BE(20)!==Number(row.height)||!sf||sf.packable!==true||sf.trimType!=='none')throw Error('原生图片尺寸或导入设置错误：'+row.assetPath);
 }
 function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(/\.(ts|prefab|scene)$/.test(p)){const s=fs.readFileSync(p,'utf8');if(/\bGraphics\b|new\s+SpriteFrame\s*\(|packable\s*=\s*false|(?:getContext\(['"]2d|createElement\(['"]canvas)/.test(s))throw Error('不允许程序绘图或手工切片：'+p);}}}walk(path.join(root,'assets'));
 if(strict){const file=path.join(root,'source_assets/art/production/png_maps/manifest.json');if(!fs.existsSync(file)||JSON.parse(fs.readFileSync(file,'utf8')).source!==signature(root,core))throw Error('地图PNG已过期：导出CSV后运行 tools/art/bake-maps.cjs');}
 return {frames:core.rows('ArtFrame').length,skins:core.rows('VisualSkin').length};
}
module.exports={check,signature};
