/* 客户端导表入口：原始 XLSX → 暂存 CSV → 全量校验 → 发布到 resources/config。 */
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../..'),hash=value=>crypto.createHash('sha256').update(value).digest('hex');
const input=path.join(root,'design/tables'),output=path.join(root,'assets/resources/config');
const tempRoot=process.env.CONFIG_WORK_DIR||path.join(path.parse(root).root,'gptwork','config-export');fs.mkdirSync(tempRoot,{recursive:true});const stage=fs.mkdtempSync(path.join(tempRoot,'run-'));
const source=path.join(root,'assets/scripts/config/ConfigTables.ts'),sourceHash=fs.readFileSync(path.join(__dirname,'validator-source.sha256'),'utf8').trim();
if(hash(fs.readFileSync(source))!==sourceHash)throw Error('配置校验器已修改，请先运行 regenerate-validator.cjs 更新导表校验器。');
const java=process.env.JAVA_HOME?path.join(process.env.JAVA_HOME,'bin',process.platform==='win32'?'java.exe':'java'):'java';
const run=cp.spawnSync(java,['-Dfile.encoding=UTF-8','--class-path',path.join(__dirname,'vendor/zz-excel2csv.jar'),path.join(__dirname,'ClientExport.java'),input,stage],{encoding:'utf8',cwd:stage,maxBuffer:8*1024*1024,windowsHide:true});
fs.writeFileSync(path.join(stage,'export.log'),(run.stdout||'')+(run.stderr||''));if(run.error||run.status!==0)throw Error('Excel 导出失败，未改动现有CSV。日志：'+path.join(stage,'export.log')+'\n'+(run.error||run.stderr));
const core=require('./validator.cjs'),schema=JSON.parse(fs.readFileSync(path.join(__dirname,'schema.json'),'utf8')),sources={};
for(const name of core.TABLE_NAMES){sources[name]=fs.readFileSync(path.join(stage,name+'.csv'),'utf8');const rows=core.parseCsv(sources[name]),fields=Object.keys(rows[0]||{}),expected=Object.keys(schema[name].fields);if(fields.join('|')!==expected.join('|'))throw Error(name+': 表头与运行时协议不一致');}
core.installConfigs(sources);
const keys=new Set(core.rows('I18').map(r=>r.key));
function inspect(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,entry.name);if(entry.isDirectory())inspect(p);else if(p.endsWith('.ts'))for(const match of fs.readFileSync(p,'utf8').matchAll(/\btext\("([^"]+)"/g))if(!keys.has(match[1]))throw Error('缺少I18：'+match[1]);}}
inspect(path.join(root,'assets/scripts'));
for(const row of core.rows('ArtAtlas'))if(!fs.existsSync(path.join(root,'assets/art',row.path.replace('/texture','.png'))))throw Error('缺少图集资源：'+row.path);
for(const row of core.rows('Audio'))if(!['.mp3','.wav'].some(ext=>fs.existsSync(path.join(root,'assets/resources',row.path+ext))))throw Error('缺少音频资源：'+row.path);
const names=fs.readdirSync(input).filter(f=>f.endsWith('.xlsx')&&!f.startsWith('~')).sort();if(names.length!==core.TABLE_NAMES.length||names.some(f=>!core.TABLE_NAMES.includes(path.basename(f,'.xlsx'))))throw Error('发现未接入的表格，请同步 schema 和运行时表清单');
const manifest={format:1,source:Object.fromEntries(names.map(name=>[name,hash(fs.readFileSync(path.join(input,name)))])),csv:Object.fromEntries(core.TABLE_NAMES.map(name=>[name+'.csv',hash(sources[name])]))};
const manifestText=JSON.stringify(manifest,null,2)+'\n';
if(process.argv.includes('--check')){for(const [name,value]of Object.entries(sources))if(!fs.existsSync(path.join(output,name+'.csv'))||fs.readFileSync(path.join(output,name+'.csv'),'utf8')!==value)throw Error(name+': CSV已过期，请运行导表');if(fs.readFileSync(path.join(output,'manifest.json'),'utf8')!==manifestText)throw Error('原始表格已变更，请重新导表');console.log('17张表校验通过，XLSX 与 CSV 一致。');}
else {fs.mkdirSync(output,{recursive:true});for(const [name,value]of Object.entries(sources))fs.writeFileSync(path.join(output,name+'.csv'),value);fs.writeFileSync(path.join(output,'manifest.json'),manifestText);console.log('17张客户端CSV已导出。原始表格、CSV和manifest请一并提交。');}
console.log('日志：'+stage);
