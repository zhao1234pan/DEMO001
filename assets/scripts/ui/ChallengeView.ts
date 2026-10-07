import { Node, Vec3, UITransform } from 'cc';
import { text, numeric } from '../config/ConfigTables';
import { UiPrefabs, uiNode, uiRect, uiText } from './UiPrefabs';
import { ChallengeRun, ChallengePort } from '../gameplay/battle/ChallengeRun';
import { GAME_CONFIG, TOWER_CONFIG, TowerKind } from '../gameplay/battle/GameConfig';
import { containsPoint } from '../gameplay/battle/BattleLayout';
/** 候选卡与已选卡共用原生预制体，只呈现各卡自身效果。 */
export class ChallengeView {
  private readonly panel:Node;private readonly cards:Node[];private readonly entry:Node;private page=0;private readonly entryPosition:Vec3;private signature='';
  constructor(private readonly parent:Node,private readonly assets:UiPrefabs){
    this.panel=assets.create('challenge_pick',parent);this.cards=uiNode(this.panel,'Cards').children.map(slot=>assets.create('challenge_card',slot));
    this.entry=uiNode(this.panel,'Entry');this.entryPosition=this.entry.position.clone();this.entry.setParent(parent);this.entry.setPosition(this.entryPosition);this.panel.active=false;this.entry.active=false;
  }
  render(run:ChallengeRun|null):void{
    this.entry.active=Boolean(run&&!run.pending&&!run.browsing);this.panel.active=Boolean(run&&(run.pending||run.browsing));
    if(!run){this.signature='';return;}uiText(this.entry,'Text',text('challenge.inventory',run.selected.length));
    if(!this.panel.active){this.signature='';return;}
    const key=JSON.stringify([run.pending,run.offers,run.selected,run.refreshLeft,run.refreshBusy,run.refreshFeedback,this.page]);if(this.signature===key)return;this.signature=key;
    if(run.pending)this.page=0;const list=run.pending?run.offers:run.selected.slice(this.page*this.cards.length,(this.page+1)*this.cards.length);
    uiText(this.panel,'Title',text(run.pending?'challenge.pick':'challenge.inventory',run.selected.length));
    uiText(this.panel,'Count',run.pending?text('challenge.pickCount',run.selected.length+1,run.choiceWaves.length):run.selected.length?'':text('challenge.empty'));
    this.cards.forEach((node,i)=>{
      const card=run.card(list[i]);node.active=Boolean(card);if(!card)return;
      uiText(node,'Title',card.name);uiText(node,'Description',card.description);this.assets.bindImage(uiNode(node,'Icon'),'ui:'+card.icon);
      uiNode(node,'Staff').active=Boolean(card.staff);
      const description=uiNode(node,'Description'),box=uiNode(node,card.staff?'StaffDescriptionBox':'GlobalDescriptionBox');description.setPosition(box.position);description.getComponent(UITransform)!.setContentSize(box.getComponent(UITransform)!.contentSize);
      if(card.staff){uiText(node,'Staff/Text',text('challenge.enhanceStaff',TOWER_CONFIG[card.staff as TowerKind].name));this.assets.bindImage(uiNode(node,'Staff/Icon'),'ui:'+card.staff);}
    });
    uiNode(this.panel,'Refresh').active=run.pending;uiNode(this.panel,'Refresh/Disabled').active=run.refreshBusy||run.refreshLeft<=0;
    uiText(this.panel,'Refresh/Text',text(run.refreshBusy?'challenge.refreshLoading':run.refreshLeft?'challenge.refresh':'challenge.refreshEmpty'));
    uiNode(this.panel,'RefreshCount').active=run.pending;
    uiText(this.panel,'RefreshCount',text('challenge.refreshCount',run.refreshLeft,numeric(run.rule,'adRefreshPerChoice')));
    uiText(this.panel,'Feedback',run.pending&&run.refreshFeedback?text(run.refreshFeedback):'');
    uiNode(this.panel,'Close').active=!run.pending;uiText(this.panel,'Close/Text',text('challenge.close'));
    uiNode(this.panel,'Previous').active=!run.pending&&this.page>0;uiNode(this.panel,'Next').active=!run.pending&&(this.page+1)*this.cards.length<run.selected.length;
    uiText(this.panel,'Page',run.pending?'':`${this.page+1} / ${Math.max(1,Math.ceil(run.selected.length/this.cards.length))}`);
  }
  layout(top:number,bottom:number):void{
    const H=GAME_CONFIG.prototypeLayoutHeight,scale=Math.min(1,(bottom-top)/H);
    this.panel.setScale(scale,scale,1);this.panel.setPosition(0,H/2-(top+bottom)/2);
    // 内容保持比例，遮罩单独铺满可见画布，长屏不会露出可点击的战斗栏。
    uiNode(this.panel,'Dim').getComponent(UITransform)!.setContentSize(GAME_CONFIG.prototypeLayoutWidth/scale,(bottom-top)/scale);
    this.entry.setPosition(this.entryPosition.x,this.entryPosition.y-top);
  }
  destroy():void{this.panel.destroy();this.entry.destroy();}
  front():void{this.entry.setSiblingIndex(this.parent.children.length-1);this.panel.setSiblingIndex(this.parent.children.length-1);}
  private hit(node:Node,x:number,y:number):boolean{return node.activeInHierarchy&&containsPoint(uiRect(node,this.parent,GAME_CONFIG.prototypeLayoutWidth,GAME_CONFIG.prototypeLayoutHeight),x,y);}
  press(x:number,y:number,run:ChallengeRun,port:ChallengePort,refresh:()=>void):boolean{
    if(!run.pending&&!run.browsing){if(this.hit(this.entry,x,y)){run.browsing=true;this.page=0;return true;}return false;}
    if(run.refreshBusy)return true;
    if(run.pending){for(let i=0;i<this.cards.length;i++)if(this.hit(this.cards[i],x,y)){run.choose(run.offers[i],port);return true;}
      if(run.refreshLeft>0&&this.hit(uiNode(this.panel,'Refresh'),x,y))refresh();
    }else{if(this.hit(uiNode(this.panel,'Close'),x,y))run.browsing=false;else if(this.hit(uiNode(this.panel,'Previous'),x,y))this.page--;else if(this.hit(uiNode(this.panel,'Next'),x,y))this.page++;}
    return true;
  }
}
