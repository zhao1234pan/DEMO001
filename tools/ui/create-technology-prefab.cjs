/* 科技树离线预制体骨架；尺寸与文字由原始UiLayout/I18回写。 */
const fs=require('fs'),crypto=require('crypto'),path=require('path'),{Prefab,setSkins}=require('./prefab-author.cjs'),core=require('../config/validator.cjs');
const root=path.resolve(__dirname,'../..');setSkins(core.parseCsv(fs.readFileSync(root+'/assets/resources/config/VisualSkin.csv','utf8')));
const p=new Prefab('technology','home'),source=structuredClone(p.a),node=structuredClone(p.a[1]),tr=structuredClone(p.t(p.a[1]));
node._name='technology';node._children=[];node._components=[{__id__:2}];node._prefab={__id__:4};node._parent=null;tr.node={__id__:1};tr.__prefab={__id__:3};
p.a=[{...source[0],_name:'technology'},node,tr,{__type__:'cc.CompPrefabInfo',fileId:crypto.randomUUID().slice(0,22)},{__type__:'cc.PrefabInfo',root:{__id__:1},asset:{__id__:0},fileId:crypto.randomUUID().slice(0,22)}];
const button=(host,name,x,y,w,h,key='button_green')=>{const n=p.add(host,name,x,y,w,h);p.skinNode(n,'Surface',key,0,0,w,h);p.label(n,'Text','',0,0,w-8,h-2,14);return n;};
p.skinNode('','Panel','window_cream',0,-12,364,612);button('','Back',-145,306,78,34);p.label('','Title','tech.title',0,276,250,34,24);p.label('','Balance','',0,244,320,24,14);p.label('','Summary','',0,219,320,22,12);
const branches=p.add('','Branches',0,0,350,340);
for(let col=0;col<4;col++){const b=p.add(branches,'Branch'+col,-132+col*88,0,82,335),portrait=p.add(b,'Portrait',0,182,45,45);const sp=p.component(portrait,source.find(o=>o.__type__==='cc.Sprite'));sp._spriteFrame=null;sp._color=p.color('#ffffff');p.label(b,'Title','',0,150,82,24,12);
 for(let rank=0;rank<5;rank++){if(rank)p.skinNode(b,'Link'+rank,'round_0',0,123-(rank-.5)*49,3,20);const n=button(b,'Node'+rank,0,123-rank*49,64,32,'button_disabled');p.label(n,'State','',0,-23,80,17,10);}
}
const details=p.add('','Details',0,-172,330,106);p.label(details,'Title','',0,32,320,24,17);p.label(details,'Description','',0,3,318,38,13);p.label(details,'Condition','',0,-29,320,22,11);
button('','Buy',87,-255,156,38,'button_gold');button('','Reset',-89,-255,154,38);button('','Previous',-130,-307,72,30);button('','Next',130,-307,72,30);p.label('','Pagination','',0,-307,100,28,14);button('','Legacy',0,-280,130,20,'round_0');p.font('Legacy/Text',10,'#6f7868');p.label('','Notice','',0,-337,350,24,11);
p.save();console.log('technology骨架已生成，继续导出UiLayout原始表');
