import { numeric, rows, text } from "../../config/ConfigTables";
import { PlatformService } from "../../services/PlatformService";
import { TowerKind, EnemyKind, ENEMY_CONFIG } from "./GameConfig";
import { LevelConfig, WaveConfig } from "./LevelConfig";

export function loadoutRule(id:number){return rows("LevelLoadout").find(r=>numeric(r,"levelId")===id)!;}
export function loadoutCandidates(id:number,unlocked:number):TowerKind[]{
  const row=loadoutRule(id),pool=row.candidateStaff.split("|");
  return rows("Staff").filter(s=>pool.includes(s.key)&&numeric(s,"unlockLevel")<=unlocked)
    .sort((a,b)=>numeric(a,"displayOrder")-numeric(b,"displayOrder")).map(s=>s.key as TowerKind);
}
export function staffRole(kind:TowerKind):string{return text(rows("Staff").find(s=>s.key===kind)!.roleKey);}
export function requiredLoadoutSize(id:number,unlocked:number):number{return Math.min(numeric(loadoutRule(id),"slots"),loadoutCandidates(id,unlocked).length);}
export function validLoadout(id:number,unlocked:number,kinds:readonly TowerKind[]):boolean{
  const pool=loadoutCandidates(id,unlocked);return kinds.length===requiredLoadoutSize(id,unlocked)&&new Set(kinds).size===kinds.length&&kinds.every(k=>pool.includes(k));
}
const storageKey=(id:number)=>"night_store_loadout_v1_"+id;
export function defaultLoadout(id:number):TowerKind[]{return loadoutRule(id).defaultStaff.split("|") as TowerKind[];}
export function readLoadout(id:number,unlocked:number):TowerKind[]{
  let saved:unknown;try{saved=JSON.parse(PlatformService.getString(storageKey(id),"[]"));}catch{saved=[];}
  const pool=loadoutCandidates(id,unlocked),count=requiredLoadoutSize(id,unlocked),result:TowerKind[]=[];
  // 无效存档先保留合法成员，再用配置默认阵容补齐；只在真正开始时保存。
  for(const kind of [...(Array.isArray(saved)?saved:[]),...defaultLoadout(id),...pool])if(pool.includes(kind)&&!result.includes(kind)&&result.length<count)result.push(kind);
  return result;
}
export function saveLoadout(id:number,unlocked:number,kinds:readonly TowerKind[]):boolean{
  if(loadoutRule(id).enabled!=="1"||!validLoadout(id,unlocked,kinds))return false;
  PlatformService.setString(storageKey(id),JSON.stringify(kinds));return true;
}
export function resetLoadouts():void{for(const r of rows("LevelLoadout"))PlatformService.setString(storageKey(numeric(r,"levelId")),"[]");}
export interface EnemyPreview {kind:EnemyKind;count:number;name:string;imageKey:string;boss:string;}
export function wavePreview(wave:WaveConfig):EnemyPreview[]{
  const counts=new Map<EnemyKind,number>();for(const kind of wave.enemies)counts.set(kind,(counts.get(kind)??0)+1);
  return Array.from(counts,([kind,count])=>({kind,count,name:ENEMY_CONFIG[kind].name!,imageKey:rows("Collection").find(r=>r.kind===kind&&r.tab!=="staff")!.imageKey,boss:ENEMY_CONFIG[kind].boss??""}));
}
export function levelPreview(level:LevelConfig):EnemyPreview[]{return wavePreview({enemies:level.waves.reduce<EnemyKind[]>((all,w)=>all.concat(w.enemies),[]),healthScale:1,spawnInterval:1});}
export function bossWaveText(level:LevelConfig):string{return level.waves.map((w,i)=>wavePreview(w).filter(e=>e.boss).map(e=>text("ui.loadout.boss",i+1,e.name)).join("、")).filter(Boolean).join("\n");}
