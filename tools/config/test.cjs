// 使用隔离副本验证失败不会覆盖正式CSV，不修改玩家数据或原始工作簿。
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),core=require('./validator.cjs');
const temp=process.env.CONFIG_WORK_DIR||path.join(path.parse(root).root,'gptwork','config-export');
fs.mkdirSync(temp,{recursive:true});
const fixture=fs.mkdtempSync(path.join(temp,'regression-'));
for(const dir of ['tools/config','design/tables','assets/scripts','assets/resources/config','assets/resources/audio','assets/art']) {
  const src=path.join(root,dir);if(fs.existsSync(src))fs.cpSync(src,path.join(fixture,dir),{recursive:true});
}
let passed=0;
function test(name,fn){fn();passed++;console.log('PASS '+name);}
function run(){return cp.spawnSync(process.execPath,[path.join(fixture,'tools/config/export.cjs'),'--check'],{encoding:'utf8',windowsHide:true,timeout:120000});}
function digest(){return fs.readFileSync(path.join(fixture,'assets/resources/config/manifest.json'),'utf8');}
test('CSV 保留引号、逗号与换行',()=>assert.equal(core.parseCsv('id,text\r\n1,"a,b\n""c"""\r\n')[0].text,'a,b\n"c"'));
test('完整原始表与CSV一致',()=>{const r=run();assert.equal(r.status,0,r.stderr);});
const csv=path.join(fixture,'assets/resources/config/I18.csv'),originalCsv=fs.readFileSync(csv),manifest=digest();
test('手改CSV会阻止构建且不覆盖文件',()=>{fs.appendFileSync(csv,'\n');const r=run();assert.notEqual(r.status,0);assert.match(r.stderr,/CSV已过期/);assert.equal(digest(),manifest);assert.equal(fs.readFileSync(csv).length,originalCsv.length+1);fs.writeFileSync(csv,originalCsv);});
const xlsx=path.join(fixture,'design/tables/I18.xlsx'),originalXlsx=fs.readFileSync(xlsx);
test('工作簿版本改变必须重新导表',()=>{fs.appendFileSync(xlsx,Buffer.from([0]));const r=run();assert.notEqual(r.status,0);assert.match(r.stderr,/原始表格已变更/);assert.equal(digest(),manifest);fs.writeFileSync(xlsx,originalXlsx);});
const code=path.join(fixture,'assets/scripts/config/ConfigTables.ts');
test('未同步校验器会阻止导出',()=>{fs.appendFileSync(code,'\n');const r=run();assert.notEqual(r.status,0);assert.match(r.stderr,/配置校验器已修改/);assert.equal(digest(),manifest);});
console.log(passed+'项通过；隔离证据：'+fixture);
