/* 配置导表同时检查真实Prefab资源。预览绑定同步更新I18与独立PNG；布局由UiLayout导表另行回写。 */
const fs=require('node:fs'),path=require('node:path');
function compressed(uuid){const h=uuid.replace(/-/g,''),chars='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let s=h.slice(0,5);for(let i=5;i<32;i+=3){const n=parseInt(h.slice(i,i+3),16);s+=chars[n>>6]+chars[n&63];}return s;}
function check(root,core,sync=false){
 require("../art/check-font.cjs").check(root,core);
 for(const skin of core.rows('VisualSkin')){
  const file=path.join(root,'assets/art',skin.path.replace('/spriteFrame','.png'));
  if(!fs.existsSync(file)||!fs.existsSync(file+'.meta'))throw Error('缺少PNG资源：'+skin.path);
  const b=fs.readFileSync(file),meta=JSON.parse(fs.readFileSync(file+'.meta','utf8')),sf=meta.subMetas?.f9941?.userData;
  if(b.readUInt32BE(16)!==Number(skin.width)||b.readUInt32BE(20)!==Number(skin.height)||!sf||sf.width!==Number(skin.width)||sf.height!==Number(skin.height)||sf.rawWidth!==Number(skin.width)||sf.rawHeight!==Number(skin.height)||sf.packable!==true||sf.trimType!=="none")throw Error('PNG尺寸或SpriteFrame不一致：'+skin.key);
  for(const side of ['Left','Right','Top','Bottom'])if(sf['border'+side]!==Number(skin[side.toLowerCase()])){if(!sync)throw Error('九宫边距不一致：'+skin.key);sf['border'+side]=Number(skin[side.toLowerCase()]);fs.writeFileSync(file+'.meta',JSON.stringify(meta,null,2)+'\n');}
 }
 const registry=core.rows('UiPrefab'),texts=new Map(core.rows('I18').map(r=>[r.key,r.zhCN])),frames=core.rows('ArtFrame');
 const type=name=>compressed(JSON.parse(fs.readFileSync(path.join(root,'assets/scripts/ui',name+'.ts.meta'),'utf8')).uuid);
 const textType=type('UiText'),imageType=type('UiImage'),skinType=type('UiSkin');
 const paths=new Set(),ids=new Set();let nodes=0,labels=0,images=0;
 for(const row of registry){
  if(paths.has(row.path))throw Error('重复预制体路径：'+row.path);paths.add(row.path);
  const file=path.join(root,'assets/resources',row.path+'.prefab');
  if(!fs.existsSync(file)||!fs.existsSync(file+'.meta'))throw Error('缺少预制体或meta：'+row.path);
  const meta=JSON.parse(fs.readFileSync(file+'.meta','utf8'));if(ids.has(meta.uuid))throw Error('重复Prefab UUID：'+row.path);ids.add(meta.uuid);
  const data=JSON.parse(fs.readFileSync(file,'utf8'));if(data[0]?.__type__!=='cc.Prefab'||data[data[0].data?.__id__]?.__type__!=='cc.Node')throw Error('非法Prefab根：'+row.path);
  const required={menu_shell:['Backdrop','Pages','Dialogs'],home:['Settings','Adventure/Note','Challenge','Collection','Sidebar','Footer'],levels:['Back','Cards','Previous/Disabled','Next/Disabled','Pagination','Note'],collection:['Dim','Back','ScrollViewport/Content/RowTemplate/Cards','ScrollViewport/Content/RowTemplate/Shelf','Tab-enemies','Tab-goods','Tab-staff'],settings:['Dim','Back','Music/On','Music/Off','Effects/On','Effects/Off','Version'],level_card:['Unlocked','Locked','Thumbnail','LockedThumbnail','Route/Projection','Route/ShopMarker','Theme','Title','Number','State','LockedState','Lock'],collection_card:['Unlocked','Locked','LockedPortraitBackground','Portrait','Name'],notice:['Dim','Close','Title','Body'],detail:['LayoutSpacing','Dim','Close','Title','Portrait','Known/Category','Known/Traits','Known/Stats',...Array.from({length:4},(_,i)=>'Known/Stat'+i),...Array.from({length:3},(_,i)=>'Level'+(i+1)+'/Text'),'Known/Note','Known/Story','Unknown/Hint'],battle_hud:['Header/Background','Header/Speed/Text','Header/Pause/Text','Header/CoinIcon','Header/title','Header/level','Header/wave','Header/coin','Header/lives','Footer/Gm/Text','Footer/Shop','Footer/Prop-freeze/Disabled','Footer/Prop-clear/Disabled','Footer/Prop-cash/Disabled','boss-status','ToastSlot','Boss/Portrait','Boss/Name','Boss/State','Boss/Fill'],button:['Text','Disabled'],sell_button:['Text'],build_card:['Icon','Title','Cost','Disabled'],floating_label:['Text'],guide_hint:['Text'],toast:['Text'],obstacle_info:['Text'],gm:['Reset/Text','Panel','Collection-enemies/Text','Collection-bosses/Text','Collection-staff/Text','Collection-all/Text','Collection-restore/Text','Dim','Close/Text','Home/Text','gm-title','gm-note','gm-current',...Array.from({length:Number(core.rows('Global').find(r=>r.key==='maxLevels').value)},(_,i)=>'Level'+(i+1)+'/Text')]};
  const extraBindings=row.key==='challenge_pick'?['Dim','Entry/Text','Title','Count','Cards/Slot0','Cards/Slot1','Cards/Slot2','Refresh/Text','Close/Text','Refresh/Disabled','Feedback','RefreshCount','Previous','Next','Page']:row.key==='challenge_loadout'?['Back','Title','SelectedTitle','Default/Text','Candidates/Slot0','Start/Text','Start/Disabled','Hint']:row.key==='challenge_staff_card'?['Icon/Portrait','Name','Role','Selected','SelectedRing']:row.key==='loading'?['Background','Track','Fill','Text','EndPaw','ProgressStart','ProgressEnd','TitlePawLeft','TitlePawRight']:row.key==='challenge_card'?['Icon','Title','Description','Staff/Icon','Staff/Text']:row.key==='loadout'?['Back','Title','Map/Route/Projection','Map/Thumbnail','EnemyTitle','Enemies/Slot0/Icon','Selected/Slot0/Name','Candidates/Slot0','Start/Text','Start/Disabled','Default/Text','Stats','Boss','Hint']:row.key==='loadout_card'?['Panel','Icon','Name','Role','Info','Selected']:row.key==='wave_preview'?['Title','Cards/Slot0']:row.key==='enemy_preview_card'?['Icon','Name','Count','Boss']:row.key==='battle_hud'?['PreviewEntry/Text','HomeGmAnchor','MenuGmAnchor']:row.key==='evolution_card'?['Icon','Title','Summary','Tradeoff','Cost','Disabled']:row.key==='detail'?['Level1/Icon','Level2/Icon','Level3/Icon','Base1/Text','Base2/Text']:row.key==='win'?['Summary','Unlocks/Slot0/Portrait','Unlocks/Slot1/Portrait','Unlocks/Slot2/Portrait','PrimaryAnchor','HomeAnchor','PanelAnchor']:[];
  const bindings=['pause','win','lose','retry'].includes(row.key)?['Dim','overlayTitle','overlayStats','overlayNote','Primary/overlayPrimary','Secondary/overlaySecondary','Home/overlayHome']:required[row.key]||[];
  for(const binding of bindings.concat(extraBindings)){let node=data[data[0].data.__id__];for(const name of binding.split('/'))node=node?._children?.map(r=>data[r.__id__]).find(n=>n._name===name);if(!node)throw Error('预制体缺少运行时节点：'+row.path+'/'+binding);}
  let changed=false;
  function refs(value){if(!value||typeof value!=='object')return;if('__id__'in value&&(!Number.isInteger(value.__id__)||value.__id__<0||value.__id__>=data.length))throw Error('悬空Prefab引用：'+row.path);Object.values(value).forEach(refs);}
  refs(data);
  for(const [index,o]of data.entries())if(o.node){const n=data[o.node.__id__];if(n?.__type__!=="cc.Node"||!n._components.some(r=>r.__id__===index))throw Error("组件所属节点引用错误："+row.path); }
  for(const object of data){
   if(object.__type__==='cc.Node'){nodes++;const rank=require('./repair-art-layout.cjs').rank;for(let i=1;i<object._children.length;i++)if(rank(data[object._children[i-1].__id__]._name,object._name)>rank(data[object._children[i].__id__]._name,object._name))throw Error('UI层级不符合背景到前景规范：'+row.path+'/'+object._name);const names=(object._children||[]).map(r=>data[r.__id__]._name);if(new Set(names).size!==names.length)throw Error('同层节点重名：'+row.path+'/'+object._name);}
   if(object.__type__==='cc.Label')labels++;
   if(object.__type__==='cc.Graphics')throw Error('禁止运行时绘制UI：'+row.path);
   if(object.__type__===skinType){
    const skin=core.rows('VisualSkin').find(r=>r.key===object.key);if(!skin)throw Error('缺少PNG皮肤：'+object.key);
    const image=path.join(root,'assets/art',skin.path.replace('/spriteFrame','.png'));
    const uuid=JSON.parse(fs.readFileSync(image+'.meta','utf8')).uuid+'@f9941';
    if(object.previewFrame?.__uuid__!==uuid || object.padding!==Number(skin.padding) || object.resizeMode!==skin.resizeMode){if(!sync)throw Error('PNG皮肤预览或边距过期：'+object.key);object.previewFrame={__uuid__:uuid,__expectedType__:'cc.SpriteFrame'};object.padding=Number(skin.padding);object.resizeMode=skin.resizeMode;changed=true;}
    const node=data[object.image?.__id__];if(node?._active!==true)throw Error('皮肤子节点不能独立禁用：'+row.path);if(!node?._components.some(r=>data[r.__id__].__type__==='cc.Sprite'))throw Error('PNG未绑定Sprite：'+object.key);
   }
   if(object.__type__===textType){
    if(!texts.has(object.key))throw Error('预制体缺少I18：'+row.path+'/'+object.key);
    const node=data[object.node.__id__],label=node._components.map(r=>data[r.__id__]).find(c=>c.__type__==='cc.Label');if(!label)throw Error('UiText未绑定Label：'+row.path);
    if(label._string!==texts.get(object.key)){if(!sync)throw Error('预制体文字预览已过期，请重新导表：'+row.path+'/'+object.key);label._string=texts.get(object.key);changed=true;}
   }
   if(object.__type__===imageType){
    const node=data[object.node.__id__];if(!node._components.some(r=>data[r.__id__].__type__==='cc.Sprite'))throw Error('UiImage未绑定Sprite：'+row.path);
    images++;const [domain,key]=object.frameKey.split(':'),frame=frames.find(r=>domain==='frame'?r.id===key:r[domain]===key);if(!frame)throw Error('预制体缺少独立PNG：'+object.frameKey);
    const image=path.join(root,'assets/art',frame.assetPath.replace('/spriteFrame','.png'));
    const uuid=JSON.parse(fs.readFileSync(image+'.meta','utf8')).uuid+'@f9941';
    if(object.previewFrame?.__uuid__!==uuid){if(!sync)throw Error('预制体图片预览已过期，请重新导表：'+row.path+'/'+object.frameKey);object.previewFrame={__uuid__:uuid,__expectedType__:'cc.SpriteFrame'};changed=true;}
    if('previewTexture'in object){delete object.previewTexture;delete object.previewRect;changed=true;}

   }
  }
  if(changed)fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n');
 }
 for(const key of ['challenge_pick','challenge_card','loadout','loadout_card','wave_preview','enemy_preview_card','menu_shell','home','levels','collection','settings','notice','detail','battle_hud','pause','win','lose','retry','level_card','collection_card','button','sell_button','build_card','toast','obstacle_info','floating_label','gm','guide_hint'])if(!registry.some(r=>r.key===key))throw Error('缺少运行时UI预制体键：'+key);
 return {prefabs:registry.length,nodes,labels,images};
}
module.exports={check};
if(require.main===module){const root=path.resolve(__dirname,'../..'),core=require('../config/validator.cjs'),sources={};for(const name of core.TABLE_NAMES)sources[name]=fs.readFileSync(path.join(root,'assets/resources/config',name+'.csv'),'utf8');core.installConfigs(sources);console.log(JSON.stringify(check(root,core,process.argv.includes('--sync')),null,2));}
