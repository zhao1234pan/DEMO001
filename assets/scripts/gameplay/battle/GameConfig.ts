import { rows, numeric, text, globalNumber, globalString, onConfigsReady } from "../../config/ConfigTables";
// 引擎启动与画布比例为技术常量，玩法数据在 CSV 加载后填充。
export const GAME_CONFIG = { designWidth:750, designHeight:1334, prototypeLayoutWidth:390, prototypeLayoutHeight:1334*390/750, maxLevels:0, gameName:"", rewardAdUnitId:"" };
export type TowerKind = "sprout" | "frost" | "bloom" | "scope" | "spark" | "ember" | "mint" | "fan";
export type EnemyKind = "normal" | "swift" | "tank" | "shield" | "jelly" | "runner" | "postmaster" | "lantern" | "chef" | "clock";

export interface TowerConfig {
  name: string;
  spriteWidth:number; arcHeight:number; laneBend:number; projectile: TowerKind; shotSpeed: number; pierceLength: number; pierceWidth: number; pierceRatio: number; chainRadius: number; chainRatio: number; burnSeconds: number; markSeconds: number; slowBase: number; slowPerLevel: number;
  cost: number;
  color: string;
  range: number;
  rate: number;
  damage: number;
  shotColor: string;
  slow?: boolean;
  splash?: number;
  pierce?: boolean;
  chain?: number;
  burn?: number;
  shred?: boolean;
  targets?: number;
}

export interface EnemyConfig {
  name?: string;
  boss?: "mini" | "major";
  spriteHeight:number; spriteScale:number; clearRatio: number; legacyUnlock: number;
  hp: number;
  speed: number;
  reward: number;
  radius: number;
  color: string;
  damage: number;
}


export const TOWER_CONFIG = {} as Record<TowerKind,TowerConfig>;
export const ENEMY_CONFIG = {} as Record<EnemyKind,EnemyConfig>;
export const TOWER_KINDS: TowerKind[] = [];
export const ENEMY_KINDS: EnemyKind[] = [];
onConfigsReady(() => {
  GAME_CONFIG.maxLevels = globalNumber("maxLevels"); GAME_CONFIG.gameName = text(globalString("gameName")); GAME_CONFIG.rewardAdUnitId = globalString("rewardAdUnitId");
  for (const [name, target] of [["Staff",TOWER_CONFIG],["Enemy",ENEMY_CONFIG]] as const) for (const row of rows(name)) {
    const record: Record<string,any> = {}; for (const key of Object.keys(row)) { if(key === "id" || key === "key") continue; record[key] = ["name","color","shotColor","boss","projectile","roleKey"].includes(key) ? row[key] : numeric(row,key); }
    record.name = text(row.name); if(record.boss === "") delete record.boss;
    (target as Record<string,any>)[row.key] = record;
  }
  TOWER_KINDS.splice(0,TOWER_KINDS.length,...rows("Staff").map(r=>r.key as TowerKind)); ENEMY_KINDS.splice(0,ENEMY_KINDS.length,...rows("Enemy").map(r=>r.key as EnemyKind));
});
