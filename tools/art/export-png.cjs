/* 作者工具：SVG源文件/归档源图集 → 独立PNG；不在游戏或构建中自动覆盖美术。 */
const fs=require('fs'),path=require('path'),sharp=require('sharp');
const root=path.resolve(__dirname,'../..'),core=require('../config/validator.cjs'),sources={};for(const n of core.TABLE_NAMES)sources[n]=fs.readFileSync(path.join(root,'assets/resources/config',n+'.csv'),'utf8');core.installConfigs(sources);
(async()=>{
 const mode=process.argv[2];if(!['skins','characters'].includes(mode))throw Error('参数应为 skins 或 characters；会覆盖对应PNG，请先提交手改美术。');
 if(core.rows('ArtCut').length){require('child_process').execFileSync(process.execPath,[path.join(__dirname,'import-redesign.cjs')],{stdio:'inherit'});return;}
 if(mode==='skins')for(const row of core.rows('VisualSkin').filter(r=>r.group!=='gameplay/maps')){const svg=path.join(root,'source_assets/art/production/png_skins',row.path.replace('/spriteFrame','.svg'));await sharp(svg).png().toFile(path.join(root,'assets/art',row.path.replace('/spriteFrame','.png')));}
 else for(const row of core.rows('ArtFrame')){const atlas=core.rows('ArtAtlas').find(a=>a.key===row.atlas),src=path.join(root,'source_assets/art/atlases',atlas.path.replace('/texture','.png'));await sharp(src).extract({left:+row.x,top:+row.y,width:+row.width,height:+row.height}).png().toFile(path.join(root,'assets/art',row.assetPath.replace('/spriteFrame','.png')));}
 console.log('PNG导出完成；保留既有.meta与UUID，请执行配置检查和编辑器构建。');
})();
