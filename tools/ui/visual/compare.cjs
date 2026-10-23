/* 只比较既有本地PNG；不截屏、不访问浏览器、不自动更新参考图。 */
const fs=require('fs'),path=require('path'),{pathToFileURL}=require('url');
async function compare(reference,actual,out){
 const {PNG}=require('pngjs'),{default:pixelmatch}=await import(pathToFileURL(require.resolve('pixelmatch')).href),a=PNG.sync.read(fs.readFileSync(reference)),b=PNG.sync.read(fs.readFileSync(actual));
 if(a.width!==b.width||a.height!==b.height)throw Error('参考与实际PNG尺寸不同；请先明确游戏画面区域，不静默拉伸图片');
 const diff=new PNG({width:a.width,height:a.height}),changed=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:.1,includeAA:false});fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'diff.png'),PNG.sync.write(diff));
 const result={reference:path.resolve(reference),actual:path.resolve(actual),referenceWidth:a.width,referenceHeight:a.height,changedPixels:changed,ratio:changed/(a.width*a.height),note:'变化比例不是还原度／美观分数；必须人工对照原设计，不自动接受新基线'};fs.writeFileSync(path.join(out,'comparison.json'),JSON.stringify(result,null,2));return result;
}
module.exports={compare};
if(require.main===module)compare(...process.argv.slice(2)).then(r=>console.log(JSON.stringify(r))).catch(e=>{console.error(e.message);process.exitCode=1;});
