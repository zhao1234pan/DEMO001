import {Node,Sprite} from "cc";
import {numeric,text} from "../config/ConfigTables";
import {challengeTopics,challengeTopicUnlocked,clearedChallengeTopics} from "../services/ChallengeTopics";
import {UiPrefabs,uiNode,uiText} from "./UiPrefabs";
/** 专题票据显示规则与解锁状态，不复用冒险模式的路线缩略卡。 */
export class ChallengeTopicsView{
  private page=0;
  constructor(private readonly root:Node,private readonly assets:UiPrefabs){}
  render(bind:(node:Node,action:()=>void)=>void,start:(id:number)=>void):void{
    const topics=challengeTopics(),tickets=uiNode(this.root,"Tickets").children,pages=Math.ceil(topics.length/tickets.length),cleared=clearedChallengeTopics();this.page=Math.max(0,Math.min(pages-1,this.page));
    tickets.forEach((ticket,i)=>{const row=topics[this.page*tickets.length+i];ticket.active=Boolean(row);if(!row)return;const unlocked=challengeTopicUnlocked(numeric(row,"levelId")),done=cleared.includes(row.key),previous=topics.find(r=>r.key===row.unlockAfter);
      this.assets.bindImage(uiNode(ticket,"Icon"),"ui:"+row.iconKey,!unlocked);uiText(ticket,"Title",text(row.titleKey));uiText(ticket,"Rule",text(row.ruleKey));uiText(ticket,"Number",text("topics.number",row.order));
      uiText(ticket,"Play/Text",unlocked?text(done?"topics.replay":"topics.play"):text("topics.locked",text(previous!.titleKey)));this.assets.bindSkin(uiNode(ticket,"Play/Artwork").getComponent(Sprite)!,unlocked?"button_green":"button_disabled");
      if(unlocked)bind(ticket,()=>start(numeric(row,"levelId")));
    });
    uiText(this.root,"Pagination",`${this.page+1}/${pages}`);uiNode(this.root,"Previous").active=this.page>0;uiNode(this.root,"Next").active=this.page<pages-1;if(this.page>0)bind(uiNode(this.root,"Previous"),()=>this.page--);if(this.page<pages-1)bind(uiNode(this.root,"Next"),()=>this.page++);
  }
}
