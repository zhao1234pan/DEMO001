/* 作者测量：阈值8排除几乎透明的边缘噪声，不删除像素、不改源图。 */
const {alpha}=require('./png-alpha.cjs');
function contentBounds(buffer){
 const a=alpha(buffer);let x0=a.w,y0=a.h,x1=-1,y1=-1;
 for(let y=0;y<a.h;y++)for(let x=0;x<a.w;x++)if(a.get(x,y)>=8){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(x1<0)throw Error('图片没有可见内容');
 return {contentX:x0,contentY:y0,contentWidth:x1-x0+1,contentHeight:y1-y0+1};
}
module.exports={contentBounds};
if(require.main===module){const fs=require('fs');for(const file of process.argv.slice(2))console.log(JSON.stringify({file,...contentBounds(fs.readFileSync(file))}));}
