/** 原始UiLayout设计后补齐详情滚动容器；保留既有节点和资源UUID，可重复执行。 */
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'../..');
const {Prefab,setSkins}=require('./prefab-author.cjs'),core=require('../config/validator.cjs');
setSkins(core.parseCsv(fs.readFileSync(root+'/assets/resources/config/VisualSkin.csv','utf8')));
const p=new Prefab('detail');
if(!p.a[1]._children.some(r=>p.a[r.__id__]._name==='ScrollViewport')){
 const viewport=p.add('','ScrollViewport',0,-5,300,490),content=p.add(viewport,'Content',0,0,300,490);
 const source=JSON.parse(fs.readFileSync(root+'/assets/resources/ui/collection.prefab','utf8'));
 const template=source.find(n=>n.__type__==='cc.Node'&&n._name==='ScrollViewport');
 for(const ref of template._components){const c=source[ref.__id__];if(c.__type__!=='cc.UITransform')p.component(viewport,c);}
 const moved=new Set(['PictureBackground','Portrait','Unknown','Known','Level1','Level2','Level3','Base1','Base2','Uniform']);
 for(const ref of [...p.a[1]._children]){
  const n=p.a[ref.__id__];if(!moved.has(n._name))continue;
  p.a[1]._children=p.a[1]._children.filter(r=>r.__id__!==ref.__id__);content._children.push(ref);n._parent={__id__:p.ix(content)};
 }
 p.label('','ScrollHint','ui.detail.scrollHint',0,-283,280,22,12);
 p.save();console.log('详情滚动容器已补齐，请继续导出UiLayout原表');
}else console.log('详情滚动容器已存在');
