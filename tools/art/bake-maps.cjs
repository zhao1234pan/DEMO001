/* 离线地图烘焙：只在美术导出时运行，客户端仅加载PNG。 */
const fs=require('fs'),path=require('path'),vm=require('vm'),crypto=require('crypto');
const root=path.resolve(__dirname,'../..'),ts=require(process.argv[2]||'typescript'),sharp=require('sharp');
class Color {constructor(r=255,g=255,b=255,a=255){Object.assign(this,{r,g,b,a});}static fromHEX(c,h){h=h.replace('#','');Object.assign(c,{r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16),a:h.length===8?parseInt(h.slice(6,8),16):255});return c;}}
const color=c=>`rgba(${c.r},${c.g},${c.b},${c.a/255})`;
class Recorder {
 static LineCap={ROUND:'round'};static LineJoin={ROUND:'round'};
 constructor(){this.clear();this.lineWidth=1;this.fillColor=new Color();this.strokeColor=new Color();this.lineCap='butt';this.lineJoin='miter';}
 clear(){this.ops=[];this.d='';this.shape='';this.drawn=false;}
 begin(){if(this.drawn){this.d='';this.shape='';this.drawn=false;}}
 moveTo(x,y){this.begin();this.d+=`M${x} ${y} `;}lineTo(x,y){this.begin();this.d+=`L${x} ${y} `;}
 quadraticCurveTo(...p){this.d+='Q'+p.join(' ')+' ';}close(){this.d+='Z';}
 rect(x,y,w,h){this.roundRect(x,y,w,h,0);}roundRect(x,y,w,h,r){this.begin();this.shape=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}"`;}
 stroke(){this.emit(false);}fill(){this.emit(true);}
 emit(fill){this.ops.push((this.shape||`<path d="${this.d}"`)+` fill="${fill?color(this.fillColor):'none'}" stroke="${fill?'none':color(this.strokeColor)}" stroke-width="${this.lineWidth}" stroke-linecap="${this.lineCap}" stroke-linejoin="${this.lineJoin}"/>`);this.drawn=true;}
}
const cache={};function load(file){file=path.resolve(file);if(cache[file])return cache[file].exports;const m={exports:{}};cache[file]=m;const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2018,module:ts.ModuleKind.CommonJS}}).outputText;
 const req=id=>id==='cc'?{Color,Graphics:Recorder}:id.startsWith('.')?load(path.resolve(path.dirname(file),id+'.ts')):require(id);
 vm.runInThisContext('(function(require,module,exports){'+source+'\n})',{filename:file})(req,m,m.exports);return m.exports;}
const core=load(root+'/assets/scripts/config/ConfigTables.ts');const levels=load(root+'/assets/scripts/gameplay/battle/LevelConfig.ts');const{BattleMapView}=load(__dirname+'/map-source.ts');
const sources={};for(const name of core.TABLE_NAMES){const p=root+'/assets/resources/config/'+name+'.csv';if(fs.existsSync(p))sources[name]=fs.readFileSync(p,'utf8');}
core.installConfigs(sources);
(async()=>{const output=[];for(const level of levels.LEVEL_CONFIGS){const g=new Recorder();new BattleMapView(g,390).draw(level,0,694,true);g.ops.shift();const key='map_'+level.id,svg=`<svg xmlns="http://www.w3.org/2000/svg" width="780" height="1388" viewBox="0 0 390 694">${g.ops.join('')}</svg>`;
 const dir=root+'/assets/art/gameplay/maps';fs.mkdirSync(dir,{recursive:true});await sharp(Buffer.from(svg)).png().toFile(dir+'/'+key+'.png');const source=root+'/source_assets/art/production/png_maps';fs.mkdirSync(source,{recursive:true});fs.writeFileSync(source+'/'+key+'.svg',svg);
 output.push({key,path:'gameplay/maps/'+key+'/spriteFrame',group:'gameplay/maps',mode:'simple',width:780,height:1388,left:0,right:0,top:0,bottom:0,padding:0,note:'第'+level.id+'关，路线来自Map/MapPoint/Spot/Theme'});}
 fs.writeFileSync(root+'/source_assets/art/production/png_maps/catalog.json',JSON.stringify(output,null,2));fs.writeFileSync(root+'/source_assets/art/production/png_maps/manifest.json',JSON.stringify({source:require('./check-resources.cjs').signature(root,core)},null,2));console.log('地图PNG',output.length);
})();
