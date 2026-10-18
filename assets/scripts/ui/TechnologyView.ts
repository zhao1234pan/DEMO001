import {Node,Sprite} from 'cc';
import {numeric,rows,text} from '../config/ConfigTables';
import {ShopService,shopClearedLevel} from '../services/ShopService';
import {PlatformService} from '../services/PlatformService';
import {UiPrefabs,uiNode,uiText} from './UiPrefabs';
/** 配置驱动科技树；选节点只查看，确认研究才扣局外金币。 */
export class TechnologyView{
 private page=0;private selected='';private resetArmed=false;private notice='';private readonly images=new Map<Node,string>();
 constructor(private readonly root:Node,private readonly assets:UiPrefabs){}
 render(bind:(n:Node,a:()=>void)=>void,back:()=>void,legacy:()=>void):void{
  const service=ShopService.shared,state=service.state;if(!state)return;
  const branches=rows('TechnologyBranch').slice().sort((a,b)=>numeric(a,'order')-numeric(b,'order')),slots=uiNode(this.root,'Branches').children,owned=state.technology??[],has=(key:string)=>owned.some(r=>r.key===key),cleared=Math.max(shopClearedLevel(),PlatformService.getNumber('night_store_best_level',0)),pages=Math.ceil(branches.length/slots.length);
  this.page=Math.min(pages-1,Math.max(0,this.page));const visible=branches.slice(this.page*slots.length,(this.page+1)*slots.length),nodes=rows('TechnologyNode');
  if(!visible.some(b=>nodes.some(n=>n.branchKey===b.key&&n.key===this.selected)))this.selected=nodes.find(n=>n.branchKey===visible[0].key)!.key;
  const condition=(row:Record<string,string>)=>has(row.key)?text('tech.done'):row.prerequisite&&!has(row.prerequisite)?text('tech.needPrevious',text(nodes.find(r=>r.key===row.prerequisite)!.nameKey)):numeric(row,'unlockLevel')>cleared?text('tech.needLevel',row.unlockLevel):state.coins<numeric(row,'cost')?text('tech.needCoins',numeric(row,'cost')-state.coins):text('tech.ready');
  slots.forEach((slot,i)=>{const branch=visible[i];slot.active=Boolean(branch);if(!branch)return;uiText(slot,'Title',text(branch.titleKey));const portrait=uiNode(slot,'Portrait');if(this.images.get(portrait)!==branch.iconKey){this.assets.bindImage(portrait,branch.iconKey);this.images.set(portrait,branch.iconKey);}
   const branchNodes=nodes.filter(r=>r.branchKey===branch.key).sort((a,b)=>numeric(a,'tier')-numeric(b,'tier'));
   branchNodes.forEach((row,j)=>{const n=uiNode(slot,'Node'+j),available=!has(row.key)&&(!row.prerequisite||has(row.prerequisite))&&numeric(row,'unlockLevel')<=cleared;this.assets.bindSkin(uiNode(n,'Surface/Artwork').getComponent(Sprite)!,this.selected===row.key?'button_gold':has(row.key)?'button_green':'button_disabled');uiText(n,'Text',text('tech.rank',row.tier));uiText(n,'State',text(has(row.key)?'tech.owned':available?'tech.available':'tech.locked'));bind(n,()=>{this.selected=row.key;this.resetArmed=false;this.notice='';});});
  });
  const selected=nodes.find(n=>n.key===this.selected)!,canBuy=!has(selected.key)&&(!selected.prerequisite||has(selected.prerequisite))&&numeric(selected,'unlockLevel')<=cleared&&state.coins>=numeric(selected,'cost');
  uiText(this.root,'Balance',text('tech.balance',state.coins));uiText(this.root,'Summary',text('tech.summary',owned.length,nodes.length));uiText(this.root,'Details/Title',text(selected.nameKey));uiText(this.root,'Details/Description',text(selected.descriptionKey));uiText(this.root,'Details/Condition',condition(selected));uiText(this.root,'Buy/Text',has(selected.key)?text('tech.done'):text('tech.buy',selected.cost));this.assets.bindSkin(uiNode(this.root,'Buy/Surface/Artwork').getComponent(Sprite)!,canBuy?'button_gold':'button_disabled');if(canBuy)bind(uiNode(this.root,'Buy'),()=>{this.notice=text(service.researchTechnology(selected.key)?'tech.bought':'tech.failed');this.resetArmed=false;});
  const refund=owned.reduce((n,r)=>n+r.paid,0);uiText(this.root,'Reset/Text',this.resetArmed?text('tech.confirmReset',refund):text('tech.reset'));bind(uiNode(this.root,'Reset'),()=>{if(!owned.length){this.notice=text('tech.empty');return;}if(!this.resetArmed){this.resetArmed=true;this.notice=text('tech.refundHint',refund);return;}const returned=service.resetTechnology();this.notice=text(returned?'tech.refunded':'tech.failed',returned);this.resetArmed=false;});
  uiText(this.root,'Back/Text',text('tech.back'));bind(uiNode(this.root,'Back'),back);uiText(this.root,'Legacy/Text',text('tech.legacy'));bind(uiNode(this.root,'Legacy'),legacy);uiText(this.root,'Pagination',text('tech.page',this.page+1,pages));uiText(this.root,'Notice',this.notice);
  for(const[name,step,available]of [['Previous',-1,this.page>0],['Next',1,this.page<pages-1]]as const){uiText(this.root,name+'/Text',text(name==='Previous'?'tech.previous':'tech.next'));this.assets.bindSkin(uiNode(this.root,name+'/Surface/Artwork').getComponent(Sprite)!,available?'button_green':'button_disabled');if(available)bind(uiNode(this.root,name),()=>{this.page+=step;this.resetArmed=false;this.notice='';});}
 }
}
