import { ENEMY_CONFIG, EnemyKind, TOWER_CONFIG, TowerKind } from "./GameConfig";
import { getLevelConfig, LEVEL_CONFIGS } from "./LevelConfig";
import { PlatformService } from "../../services/PlatformService";

export type CollectionTab = "enemies" | "bosses" | "staff";
export type CollectionImageKey = TowerKind | "enemy_normal" | "enemy_swift" | "enemy_tank" | "boss_silhouette";

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

export const COLLECTION_TABS: readonly { id: CollectionTab; label: string }[] = [
  { id: "enemies", label: "怪物" },
  { id: "bosses", label: "BOSS" },
  { id: "staff", label: "店员" },
];

const ENEMY_KINDS: readonly EnemyKind[] = ["normal", "swift", "tank"];
export const COLLECTION_ENEMY_KEYS: Readonly<Record<EnemyKind, string>> = {
  normal: "night_store_collection_enemy_normal",
  swift: "night_store_collection_enemy_swift",
  tank: "night_store_collection_enemy_tank",
};

function enemyStats(kind: EnemyKind): CollectionEntry["stats"] {
  const config = ENEMY_CONFIG[kind];
  return [
    { label: "基础耐久", value: String(config.hp) },
    { label: "基础移速", value: String(config.speed) },
    { label: "零钱奖励", value: String(config.reward) },
    { label: "漏怪扣耐久", value: String(config.damage) },
  ];
}

function staffStats(kind: TowerKind): CollectionEntry["stats"] {
  const config = TOWER_CONFIG[kind];
  return [
    { label: "上岗费用", value: String(config.cost) },
    { label: "一级伤害", value: String(config.damage) },
    { label: "攻击间隔", value: `${config.rate} 秒` },
    { label: "基础射程", value: String(config.range) },
  ];
}

function staffUnlockHint(kind: TowerKind): string {
  const firstLevel = LEVEL_CONFIGS.find((level) => level.availableTowers.includes(kind));
  return firstLevel ? `解锁第 ${firstLevel.id} 关后上岗` : "后续开放";
}

const ENEMY_STAT_NOTE = "耐久随关卡和波次变化\n移速受关卡影响";
const STAFF_STAT_NOTE = "升级提高伤害与射程，缩短攻击间隔";

export const COLLECTION_ENTRIES: readonly CollectionEntry[] = [
  {
    id: "enemy-normal", tab: "enemies", name: "小纸袋怪", imageKey: "enemy_normal", enemyKind: "normal",
    category: "普通精怪", traits: "移动稳定，常常结伴出现，适合交给豆包逐个赶走。",
    story: "地铁末班车离站后，它才把小短腿伸出纸袋。袋口总朝着便利店的暖光，像在等一份刚装好的夜宵。",
    stats: enemyStats("normal"), statNote: ENEMY_STAT_NOTE, unlockHint: "在冒险模式中遇见后解锁",
  },
  {
    id: "enemy-swift", tab: "enemies", name: "红汽水罐", imageKey: "enemy_swift", enemyKind: "swift",
    category: "疾行精怪", traits: "跑得快，耐久较低。棉棉的减速能让它在防线前多留一会儿。",
    story: "它总觉得末班车还没开走，顺着庭院一路小跑。跑到店门前才想起来：自己出门只是想听汽水开罐的声音。",
    stats: enemyStats("swift"), statNote: ENEMY_STAT_NOTE, unlockHint: "在冒险模式中遇见后解锁",
  },
  {
    id: "enemy-tank", tab: "enemies", name: "快递纸箱怪", imageKey: "enemy_tank", enemyKind: "tank",
    category: "重型精怪", traits: "移动较慢、耐久较高；漏进店里会扣除更多店铺耐久。",
    story: "箱子上没有收件地址，只有一张歪歪扭扭的“夜间送达”。它走得很认真，至今还没发现纸箱里的自己就是那件包裹。",
    stats: enemyStats("tank"), statNote: ENEMY_STAT_NOTE, unlockHint: "在冒险模式中遇见后解锁",
  },
  {
    id: "boss-fog-guest", tab: "bosses", name: "雾灯旅客", imageKey: "boss_silhouette",
    category: "神秘来客", traits: "后续开放。它的身影还藏在庭院外的夜雾里。",
    story: "留言簿上画着一盏提灯，旁边只写了“等雾散了再来”。没有店员见过落款的人。",
    stats: [{ label: "登场状态", value: "后续开放" }], statNote: "当前关卡尚无 BOSS。", unlockHint: "后续开放",
  },
  {
    id: "boss-midnight-leader", tab: "bosses", name: "夜宵团长", imageKey: "boss_silhouette",
    category: "神秘来客", traits: "后续开放。关于这位夜间访客，店里还没有完整记录。",
    story: "门缝里曾塞进一张很长的夜宵清单，每一项后面都画着笑脸。豆包把它夹在值班本里，留给未来的某个夜班。",
    stats: [{ label: "登场状态", value: "后续开放" }], statNote: "当前关卡尚无 BOSS。", unlockHint: "后续开放",
  },
  {
    id: "staff-doubao", tab: "staff", name: TOWER_CONFIG.sprout.name, imageKey: "sprout", staffKind: "sprout",
    category: "仓鼠 · 收银员", traits: "快速、稳定的单体驱赶。上岗费用低，方便逐步扩展防线。",
    story: "豆包会把每枚零钱朝同一个方向码好。客流再急，他也能一边报数一边守住收银台，最怕的是下班前少算一枚硬币。",
    stats: staffStats("sprout"), statNote: STAFF_STAT_NOTE, unlockHint: staffUnlockHint("sprout"),
  },
  {
    id: "staff-mianmian", tab: "staff", name: TOWER_CONFIG.frost.name, imageKey: "frost", staffKind: "frost",
    category: "垂耳兔 · 理货员", traits: "攻击附带减速，为其他店员争取输出时间，适合照看疾行精怪。",
    story: "棉棉能记住每件商品该在的格子。遇到匆忙的来客，她总会轻轻提醒：“慢一点，热食还没凉。”",
    stats: staffStats("frost"), statNote: STAFF_STAT_NOTE, unlockHint: staffUnlockHint("frost"),
  },
  {
    id: "staff-buding", tab: "staff", name: TOWER_CONFIG.bloom.name, imageKey: "bloom", staffKind: "bloom",
    category: "柯基 · 热食员", traits: "对目标及附近精怪造成范围伤害，适合应对密集精怪。",
    story: "布丁总把“刚出炉”喊得比广播还响。看到门外排起长队，他会先把围裙系紧，再把最后一份热食留给值夜的同伴。",
    stats: staffStats("bloom"), statNote: STAFF_STAT_NOTE, unlockHint: staffUnlockHint("bloom"),
  },
];

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
    if (entry.tab === "bosses") return false;
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
      for (const wave of level.waves) for (const kind of wave.enemies) if (this.encounter(kind)) added += 1;
    }
    return added;
  }
}
