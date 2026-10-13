import {Node,Sprite} from "cc";
import {numeric,text} from "../config/ConfigTables";
import {challengeTopics,challengeTopicUnlocked,clearedChallengeTopics} from "../services/ChallengeTopics";
import {UiPrefabs,uiNode,uiText} from "./UiPrefabs";
/** 四格专题卡片只改变表现，真实顺序和解锁继续读取挑战进度。 */
export class ChallengeTopicsView{
  private page=0;
  constructor(private readonly root:Node,private readonly assets:UiPrefabs){}
  render(bind:(node:Node,action:()=>void)=>void,start:(id:number)=>void):void{
    const topics=challengeTopics(),tickets=uiNode(this.root,"Tickets").children,pages=Math.ceil(topics.length/tickets.length),cleared=clearedChallengeTopics();this.page=Math.max(0,Math.min(pages-1,this.page));
    tickets.forEach((ticket,i)=>{
      const row=topics[this.page*tickets.length+i];ticket.active=Boolean(row);if(!row)return;
      const unlocked=challengeTopicUnlocked(numeric(row,"levelId")),done=cleared.includes(row.key),previous=topics.find(r=>r.key===row.unlockAfter),art=uiNode(ticket,"Icon/Artwork").getComponent(Sprite)!;
      this.assets.bindSkin(art,row.thumbnailKey);art.grayscale=!unlocked;uiNode(ticket,"Lock").active=!unlocked;uiNode(ticket,"Done").active=done;
      uiText(ticket,"Title",text(row.titleKey));uiText(ticket,"Rule",text(row.ruleKey));uiText(ticket,"Number",text("topics.number",String(numeric(row,"order")).padStart(2,"0")));
      uiNode(ticket,"Rule").active=unlocked;uiNode(ticket,"Play").active=unlocked;uiNode(ticket,"LockedNote").active=!unlocked;
      uiText(ticket,"Play/Text",text(done?"topics.replay":"topics.play"));uiText(ticket,"LockedNote",previous?text("topics.locked",text(previous.titleKey)):"");
      if(unlocked)bind(ticket,()=>start(numeric(row,"levelId")));
    });
    uiText(this.root,"Pagination",text("topics.page",this.page+1,pages));
    for(const[name,available,step]of [["Previous",this.page>0,-1],["Next",this.page<pages-1,1]]as const){const node=uiNode(this.root,name);this.assets.bindSkin(uiNode(node,"Artwork").getComponent(Sprite)!,available?"button_green":"button_disabled");if(available)bind(node,()=>{this.page+=step;});}
  }
}
