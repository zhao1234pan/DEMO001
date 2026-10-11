import {globalString,numeric,rows,TableRow} from "../config/ConfigTables";
import {PlatformService} from "./PlatformService";
export function challengeTopics():TableRow[]{return rows("ChallengeTopic").slice().sort((a,b)=>numeric(a,"order")-numeric(b,"order"));}
export function challengeTopic(levelId:number):TableRow|undefined{return challengeTopics().find(r=>numeric(r,"levelId")===levelId);}
/** 只接纳按配置顺序通关的已知专题，不把损坏或跳级的记录变成解锁。 */
export function clearedChallengeTopics():string[]{
  let value:unknown;try{value=JSON.parse(PlatformService.getString(globalString("challengeProgressSaveKey"),"[]"));}catch{return [];}
  if(!Array.isArray(value))return [];const result:string[]=[];
  for(const row of challengeTopics()){if(!value.includes(row.key)||(row.unlockAfter&&!result.includes(row.unlockAfter)))break;result.push(row.key);}return result;
}
export function challengeTopicUnlocked(levelId:number):boolean{const row=challengeTopic(levelId);return Boolean(row&&(!row.unlockAfter||clearedChallengeTopics().includes(row.unlockAfter)));}
export function completeChallengeTopic(levelId:number):boolean{
  const row=challengeTopic(levelId);if(!row||!challengeTopicUnlocked(levelId))return false;const cleared=clearedChallengeTopics();if(cleared.includes(row.key))return false;
  cleared.push(row.key);PlatformService.setString(globalString("challengeProgressSaveKey"),JSON.stringify(cleared));return true;
}
export function nextChallengeTopic(levelId:number):TableRow|undefined{const current=challengeTopic(levelId);return current?challengeTopics().find(r=>r.unlockAfter===current.key):undefined;}
export function resetChallengeTopics():void{PlatformService.setString(globalString("challengeProgressSaveKey"),"[]");}
