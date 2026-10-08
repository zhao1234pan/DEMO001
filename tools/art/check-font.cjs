/** 字体来源、子集签名和I18缺字门禁；文字增加后不能静默回退成系统字体。 */
const fs=require('fs'),path=require('path'),crypto=require('crypto');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
function check(root,core){
 const configured=core.rows('UiLayout').filter(r=>+r.fontSize>0);
 if(configured.some(r=>!r.fontPath))throw Error('文字节点未配置统一圆体字体');
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'source_assets/fonts/maoken-zhuyuan/subset.json')));
 const source=fs.readFileSync(path.join(root,manifest.source));if(hash(source)!==manifest.sourceSha256)throw Error('字体源文件已变更，请重新导出圆体子集');
 for(const fontPath of new Set(configured.map(r=>r.fontPath))){const file=path.join(root,'assets/resources',fontPath+'.ttf');if(hash(fs.readFileSync(file))!==manifest.fontSha256)throw Error('字体子集签名不一致，请重新导出字体');}
 const chars=new Set(manifest.characters),missing=new Set();for(const r of core.rows('I18'))for(const c of r.zhCN)if(!c.match(/\s/)&&!chars.has(c.codePointAt(0)))missing.add(c);
 if(missing.size)throw Error('圆体子集缺少新增文本字符，请先运行export-font.py：'+Array.from(missing).join(''));
 return{labels:configured.length,fonts:new Set(configured.map(r=>r.fontPath)).size,characters:chars.size};
}
module.exports={check};
