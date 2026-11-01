/* 复用Cocos微信生产构建，再调用验签后的Tap官方转换器；不上传、不提审、不发布。 */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../../..'),pin=require('./official-converter.json'),sha=buffer=>crypto.createHash('sha256').update(buffer).digest('hex');
function scratchPath(value){
 const absolute=path.resolve(value),parent=path.resolve(path.parse(absolute).root,'gptwork');
 assert.ok(absolute.toLowerCase().startsWith((parent+path.sep).toLowerCase()),'输出必须是非系统盘gptwork内的子目录');
 assert.ok(!absolute.toLowerCase().startsWith(root.toLowerCase()+path.sep),'构建缓存不得放在工程中');
 if(process.platform==='win32')assert.notEqual(path.parse(absolute).root.toLowerCase(),(process.env.SystemDrive||'C:').toLowerCase()+path.sep,'构建缓存不得放在系统盘');
 for(let current=absolute;;current=path.dirname(current)){
  if(fs.existsSync(current))assert.ok(!fs.lstatSync(current).isSymbolicLink(),'输出目录祖先不得包含链接或目录联接');
  if(current===path.dirname(current))break;
 }
 return absolute;
}
function csvVersion(){
 const core=require('../../config/validator.cjs'),rows=core.parseCsv(fs.readFileSync(path.join(root,'assets/resources/config/Global.csv'),'utf8'));
 const version=rows.find(r=>r.key==='version')?.value;assert.match(version,/^\d+\.\d+\.\d+$/,'版本来自原表导出的Global.csv');return version;
}
function execute(command,args,options={}){
 const result=cp.spawnSync(command,args,{cwd:root,windowsHide:true,encoding:'utf8',maxBuffer:16*1024*1024,...options});
 if(result.error)throw result.error;assert.equal(result.status,0,result.stderr||result.stdout||'子进程执行失败');return result;
}
async function build({creator,python,workDir}){
 assert.ok(creator&&python&&workDir,'用法：node build.cjs --creator <CocosCreator.exe> --python <python.exe> --work-dir <F:/gptwork/任务目录>');
 const work=scratchPath(workDir);fs.mkdirSync(work,{recursive:true});
 // 每次使用新目录，官方转换器内部的清理只可能作用于本次临时产物。
 const run=fs.mkdtempSync(path.join(work,'tap-build-')),archive=path.join(run,'official-converter.zip');
 const response=await fetch(pin.url);assert.ok(response.ok,'官方下载失败：'+response.status);const bytes=Buffer.from(await response.arrayBuffer());assert.equal(sha(bytes),pin.sha256,'官方工具签名变化，停止执行');fs.writeFileSync(archive,bytes);
 const pluginFolder=path.join(run,'plugin');execute(python,[path.join(__dirname,'extract.py'),archive,pluginFolder]);
 const config=JSON.parse(fs.readFileSync(path.join(root,'settings/builds/wechatgame.json'),'utf8'));
 config.debug=false;config.buildPath=path.join(run,'wechat-build');config.taskName='wechatgame';
 const configFile=path.join(run,'build.json');fs.writeFileSync(configFile,JSON.stringify(config,null,2)+'\n');
 const stdout=fs.openSync(path.join(run,'build.stdout.log'),'w'),stderr=fs.openSync(path.join(run,'build.stderr.log'),'w');
 const result=cp.spawnSync(creator,['--project',root,'--build','configPath='+configFile],{cwd:root,windowsHide:true,env:{...process.env,PATH:path.dirname(process.execPath)+path.delimiter+process.env.PATH},stdio:['ignore',stdout,stderr]});fs.closeSync(stdout);fs.closeSync(stderr);
 fs.writeFileSync(path.join(run,'build.exit.txt'),String(result.status));if(result.error)throw result.error;
 const log=fs.readFileSync(path.join(run,'build.stdout.log'),'utf8');assert.ok([0,36].includes(result.status),'Creator构建失败：'+result.status);assert.ok(log.includes('build Task (wechatgame) Finished')&&!/Run build plugin[^\n]*failed|配置检查未通过，构建已停止/.test(log),'构建未完成或配置门禁失败');
 const source=path.join(config.buildPath,'wechatgame'),target=path.join(run,'TapBuild');assert.ok(fs.existsSync(path.join(source,'game.js')));assert.ok(!fs.existsSync(target)&&target.startsWith(run+path.sep));
 const {convertWechatToTap}=require(path.join(pluginFolder,pin.directory,pin.entry));
 const version=csvVersion();await convertWechatToTap({source,target,useSubpackage:false,gameVersion:version});
 const gameConfig=JSON.parse(fs.readFileSync(path.join(target,'game/game.json'),'utf8'));assert.equal(gameConfig.productVersion,version);assert.equal(gameConfig.deviceOrientation,'portrait');assert.ok(!fs.existsSync(path.join(target,'game/index.html')));
 const zip=path.join(target,'game.zip'),record={version,sourceCommit:execute('git',['rev-parse','HEAD']).stdout.trim(),converter:pin,creatorExit:result.status,config,archive:zip,archiveBytes:fs.statSync(zip).size,archiveSha256:sha(fs.readFileSync(zip)),reviewOrPublish:false};
 fs.writeFileSync(path.join(run,'build-record.json'),JSON.stringify(record,null,2)+'\n');console.log(JSON.stringify(record,null,2));return record;
}
if(require.main===module){const args=process.argv.slice(2),options={};for(let i=0;i<args.length;i+=2){const key={'--creator':'creator','--python':'python','--work-dir':'workDir'}[args[i]];assert.ok(key&&args[i+1],'构建参数缺失或未知');options[key]=args[i+1];}build(options).catch(error=>{console.error(error);process.exitCode=1;});}
module.exports={scratchPath,csvVersion};
