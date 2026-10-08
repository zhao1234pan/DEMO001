// 修改校验算法后执行；配置数值不经过代码生成。
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const compiler=process.env.TYPESCRIPT_PATH||process.argv[2];if(!compiler)throw Error('请传入本机TypeScript模块路径，或设置TYPESCRIPT_PATH。');
const ts=require(compiler),sourcePath=path.resolve(__dirname,'../../assets/scripts/config/ConfigTables.ts'),source=fs.readFileSync(sourcePath,'utf8').replace(/\r\n/g,'\n');
fs.writeFileSync(path.join(__dirname,'validator.cjs'),'// 由 ConfigTables.ts 生成，共用运行时校验算法。禁止手改。\n'+ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2018,module:ts.ModuleKind.CommonJS}}).outputText);
fs.writeFileSync(path.join(__dirname,'validator-source.sha256'),crypto.createHash('sha256').update(source).digest('hex')+'\n');
