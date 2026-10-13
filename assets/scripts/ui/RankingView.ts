import {DEBUG} from "cc/env";
import {Label,Node,Sprite} from "cc";
import {globalNumber,numeric,rows,text,TableRow} from "../config/ConfigTables";
import {shopClearedLevel} from "../services/ShopService";
import {clearedChallengeTopics} from "../services/ChallengeTopics";
import {UiPrefabs,uiColor,uiNode,uiText} from "./UiPrefabs";

/** 展示评分只读取真实进度，演示榜不保存名次，也不写入玩家金币或平台数据。 */
export function rankingProgress(){
  const maximum=globalNumber("maxLevels"),unlocked=Math.max(1,Math.min(maximum,shopClearedLevel()+1)),challenges=clearedChallengeTopics().length;
  return{unlocked,maximum,challenges,challengeMaximum:rows("ChallengeTopic").length,score:(unlocked-1)*globalNumber("rankingAdventureWeight")+challenges*globalNumber("rankingChallengeWeight")};
}
export class RankingView{
  private friends=false;
  constructor(private readonly root:Node,private readonly assets:UiPrefabs){}
  private skin(node:Node,key:string):void{this.assets.bindSkin(uiNode(node,"Artwork").getComponent(Sprite)!,key);}
  render(bind:(node:Node,action:()=>void)=>void,play:()=>void):void{
    const preview=DEBUG&&globalNumber("rankingPreview")===1;
    const entries=preview?rows("RankingEntry").filter(r=>!this.friends||r.friend==="1").slice().sort((a,b)=>numeric(b,"score")-numeric(a,"score")||numeric(a,"id")-numeric(b,"id")):[];
    uiText(this.root,"Summary",text(preview?"ranking.demo":"ranking.pending"));
    for(const[name,value]of [["All",false],["Friends",true]]as const){const selected=this.friends===value,node=uiNode(this.root,name);this.skin(node,selected?"button_green":"window_flat");const style=rows("UiLayout").find(r=>r.key===(selected?"ranking:All/Text":"ranking:Summary"))!,label=uiNode(node,"Text").getComponent(Label)!;uiColor(node,"Text",style.color);label.enableOutline=numeric(style,"outlineWidth")>0;label.outlineWidth=numeric(style,"outlineWidth");bind(node,()=>{this.friends=value;});}
    uiNode(this.root,"Top3").active=entries.length>0;uiNode(this.root,"Rows").active=entries.length>0;uiNode(this.root,"Empty").active=entries.length===0;
    uiNode(this.root,"Top3").children.forEach((card,i)=>{const index=i===0?1:i===1?0:2,row=entries[index];card.active=Boolean(row);if(row)this.entry(card,row,index+1);});
    uiNode(this.root,"Rows").children.forEach((card,i)=>{const index=i+uiNode(this.root,"Top3").children.length,row=entries[index];card.active=Boolean(row);if(row)this.entry(card,row,index+1);});
    const progress=rankingProgress();uiText(this.root,"Mine/Progress",text("ranking.progress",progress.unlocked,progress.maximum,progress.challenges,progress.challengeMaximum));uiText(this.root,"Mine/Score",String(progress.score));
    if(!entries.length)bind(uiNode(this.root,"Empty/Play"),play);
  }
  private entry(node:Node,row:TableRow,rank:number):void{this.skin(uiNode(node,"Icon"),row.portraitKey);uiText(node,"Number",String(rank));uiText(node,"Name",text(row.nameKey));uiText(node,"Score",String(numeric(row,"score")));}
}
