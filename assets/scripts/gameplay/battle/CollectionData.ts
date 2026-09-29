import { rows, numeric, text, globalNumber, globalString, onConfigsReady } from "../../config/ConfigTables";
import { ENEMY_CONFIG, ENEMY_KINDS, EnemyKind, TOWER_CONFIG, TowerKind } from "./GameConfig";
import { getLevelConfig, LEVEL_CONFIGS } from "./LevelConfig";
import { PlatformService } from "../../services/PlatformService";

export type CollectionTab = "enemies" | "bosses" | "staff";
export type CollectionImageKey = TowerKind | `enemy_${EnemyKind}`;

export interface CollectionEntry {
  readonly id: string;
  readonly tab: CollectionTab;
  readonly name: string;
  readonly imageKey: CollectionImageKey;
  readonly category: string;
  readonly traits: string;
  readonly story: string;
  readonly stats: readonly { readonly label: string; readonly value: string }[];
  readonly statNote: string;
  readonly unlockHint: string;
  readonly enemyKind?: EnemyKind;
  readonly staffKind?: TowerKind;
}

export const COLLECTION_TABS: { id:CollectionTab; label:string }[] = [];
export const COLLECTION_ENEMY_KEYS = {} as Record<EnemyKind,string>;
function enemyStats(kind: EnemyKind): CollectionEntry["stats"] {
  const config = ENEMY_CONFIG[kind];
  return [
    { label: text("ui.CollectionData.001"), value: String(config.hp) },
    { label: text("ui.CollectionData.002"), value: String(config.speed) },
    { label: text("ui.CollectionData.003"), value: String(config.reward) },
    { label: text("ui.CollectionData.004"), value: String(config.damage) },
  ];
}

function staffStats(kind: TowerKind): CollectionEntry["stats"] {
  const config = TOWER_CONFIG[kind];
  return [
    { label: text("ui.CollectionData.005"), value: String(config.cost) },
    { label: text("ui.CollectionData.006"), value: String(config.damage) },
    { label: text("ui.CollectionData.007"), value: text("ui.CollectionData.008", config.rate) },
    { label: text("ui.CollectionData.009"), value: String(config.range) },
  ];
}

function staffUnlockHint(kind: TowerKind): string {
  const firstLevel = LEVEL_CONFIGS.find((level) => level.availableTowers.includes(kind));
  return firstLevel ? text("ui.CollectionData.010", firstLevel.id) : text("ui.CollectionData.011");
}


export const COLLECTION_ENTRIES: CollectionEntry[] = [];
onConfigsReady(()=>{
  COLLECTION_TABS.splice(0,COLLECTION_TABS.length,{id:"enemies",label:text("ui.CollectionData.012")},{id:"bosses",label:text("ui.boss")},{id:"staff",label:text("ui.CollectionData.013")});
  for(const kind of ENEMY_KINDS) COLLECTION_ENEMY_KEYS[kind]="night_store_collection_enemy_"+kind;
  COLLECTION_ENTRIES.splice(0,COLLECTION_ENTRIES.length,...rows("Collection").map(row=>{
    const staff=row.tab==="staff",kind=row.kind;
    return {id:row.key,tab:row.tab as CollectionTab,name:staff?TOWER_CONFIG[kind as TowerKind].name:ENEMY_CONFIG[kind as EnemyKind].name!,imageKey:row.imageKey as CollectionImageKey,category:text(row.category),traits:entryTraits(row.traits,kind,staff),story:text(row.story),
      stats:staff?staffStats(kind as TowerKind):enemyStats(kind as EnemyKind),statNote:staff?text("ui.CollectionData.014"):text("ui.CollectionData.015"),unlockHint:staff?staffUnlockHint(kind as TowerKind):text("ui.CollectionData.016"),...(staff?{staffKind:kind as TowerKind}:{enemyKind:kind as EnemyKind})};
  }));
});
/** 调用方只传正式解锁关，并仅在正式战斗出怪时记录遭遇；GM 与美术评审不接入本服务。 */
export class CollectionProgress {
  private readonly enemies = new Set<EnemyKind>();
  private readonly staff = new Set<TowerKind>();

  constructor(unlockedLevel = 1) {
    this.refresh(unlockedLevel);
  }

  /** 在进入图鉴或正式进度改变时刷新；逐帧绘制只调用 isUnlocked，不读取存储。 */
  refresh(unlockedLevel?: number): void {
    for (const kind of ENEMY_KINDS) {
      if (PlatformService.getNumber(COLLECTION_ENEMY_KEYS[kind], 0) === 1) this.enemies.add(kind);
    }
    if (unlockedLevel !== undefined) this.migrate(unlockedLevel);
  }

  readState(): { readonly enemies: readonly EnemyKind[]; readonly staff: readonly TowerKind[] } {
    return { enemies: [...this.enemies], staff: [...this.staff] };
  }

  isUnlocked(entry: CollectionEntry): boolean {
    if (entry.tab === "staff") return entry.staffKind !== undefined && this.staff.has(entry.staffKind);
    return entry.enemyKind !== undefined && this.enemies.has(entry.enemyKind);
  }

  encounter(kind: EnemyKind): boolean {
    if (!ENEMY_KINDS.includes(kind) || this.enemies.has(kind)) return false;
    this.enemies.add(kind);
    PlatformService.setMaximumInteger(COLLECTION_ENEMY_KEYS[kind], 1, 1);
    return true;
  }

  migrate(unlockedLevel: number): number {
    const highest = getLevelConfig(unlockedLevel).id;
    let added = 0;
    for (const level of LEVEL_CONFIGS) {
      if (level.id > highest) continue;
      for (const kind of level.availableTowers) this.staff.add(kind);
      // 最高已解锁关可能尚未开始；旧档只从此前已完成关卡补入怪物记录。
      if (level.id === highest) continue;
      for (const wave of level.waves) for (const kind of wave.enemies) if (ENEMY_CONFIG[kind].legacyUnlock === 1 && this.encounter(kind)) added += 1;
    }
    return added;
  }
}

function entryTraits(key:string,kind:string,staff:boolean):string {
  if(!staff)return text(key,ENEMY_CONFIG[kind as EnemyKind].damage);
  const c=TOWER_CONFIG[kind as TowerKind];
  if(c.pierce)return text(key,c.pierceLength,c.pierceRatio*100);
  if(c.chain)return text(key,c.chain,c.chainRatio*100);
  if(c.burn)return text(key,c.burnSeconds);
  if(c.shred)return text(key,c.markSeconds,Math.round((globalNumber("markDamageRatio")-1)*100));
  if(c.targets && c.targets>1)return text(key,c.targets);
  return text(key);
}
