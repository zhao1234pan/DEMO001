import { rows, numeric, text, globalNumber, globalString, onConfigsReady } from "../../config/ConfigTables";
import type { EnemyKind, TowerKind } from "./GameConfig";

export type MapPoint = readonly [number, number];
export type ObstacleKind = "crate" | "basket" | "plant";

export interface ObstacleConfig {
  spotIndex: number;
  kind: ObstacleKind;
  hp: number;
  reward: number;
}

export interface WaveConfig {
  healthScale: number;
  enemies: EnemyKind[];
  spawnInterval: number;
  announcement?: string;
}

export interface LevelConfig {
  mode: "adventure" | "challenge";
  gridSize: number;
  id: number;
  theme?: "courtyard" | "rain" | "market" | "midnight";
  goal?: string;
  title: string;
  initialCoins: number;
  initialLives: number;
  enemyHealthScale: number;
  enemySpeedScale: number;
  availableTowers: TowerKind[];
  pathPoints: readonly MapPoint[];
  towerSpots: readonly MapPoint[];
  obstacles?: readonly ObstacleConfig[];
  waves: WaveConfig[];
}


export const LEVEL_CONFIGS: LevelConfig[] = [];
onConfigsReady(() => {
  const order = (field:string) => (a:Record<string,string>,b:Record<string,string>) => numeric(a,field)-numeric(b,field);
  LEVEL_CONFIGS.splice(0,LEVEL_CONFIGS.length,...rows("Level").sort(order("id")).map(row => {
    const map = rows("Map").find(r=>r.id===row.mapId)!;
    return { gridSize:numeric(map,"gridSize"),mode:row.mode as LevelConfig["mode"],id:numeric(row,"id"),title:text(row.title),goal:row.goal?text(row.goal):undefined,theme:map.theme as LevelConfig["theme"],
      initialCoins:numeric(row,"initialCoins"),initialLives:numeric(row,"initialLives"),enemyHealthScale:numeric(row,"enemyHealthScale"),enemySpeedScale:numeric(row,"enemySpeedScale"),availableTowers:row.availableTowers.split("|") as TowerKind[],
      pathPoints:rows("MapPoint").filter(r=>r.mapId===map.id).sort(order("order")).map(r=>[numeric(r,"x"),numeric(r,"y")] as MapPoint),
      towerSpots:rows("Spot").filter(r=>r.mapId===map.id).sort(order("spotIndex")).map(r=>[numeric(r,"x"),numeric(r,"y")] as MapPoint),
      obstacles:rows("Obstacle").filter(r=>r.mapId===map.id).map(r=>({spotIndex:numeric(r,"spotIndex"),kind:r.kind as ObstacleKind,hp:numeric(r,"hp"),reward:numeric(r,"reward")})),
      waves:rows("Wave").filter(r=>r.levelId===row.id).sort(order("order")).map(w=>({healthScale:numeric(w,"healthScale"),spawnInterval:numeric(w,"spawnInterval"),announcement:w.announcement?text(w.announcement):undefined,enemies:rows("WaveGroup").filter(g=>g.waveId===w.id).sort(order("order")).reduce<EnemyKind[]>((all,g)=>all.concat(Array.from({length:numeric(g,"count")},()=>g.enemy as EnemyKind)),[])})),
    };
  }));
});
export function getLevelConfig(id:number):LevelConfig { if(!LEVEL_CONFIGS.length)throw new Error("Config not loaded"); const safe=Math.floor(Number.isFinite(id)?id:1); return LEVEL_CONFIGS.find(l=>l.id===safe) ?? LEVEL_CONFIGS[0]; }
