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
  enemies: EnemyKind[];
  spawnInterval: number;
  announcement?: string;
}

export interface LevelConfig {
  id: number;
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

const enemies = (kind: EnemyKind, count: number): EnemyKind[] => Array.from({ length: count }, () => kind);
const mix = (...groups: EnemyKind[][]): EnemyKind[] => groups.reduce<EnemyKind[]>((result, group) => result.concat(group), []);
const wave = (list: EnemyKind[], spawnInterval = 0.78, announcement?: string): WaveConfig => ({ enemies: list, spawnInterval, announcement });

// 十关使用统一的 50 像素网格组织高密度塔防棋盘：空位和障碍都占用标准建造单元，
// 同一路段旁优先成行、成列或成组排列，避免逐个手调坐标造成视觉散乱。
// 格位中心最低为 y=135，为三级店员头顶预留顶栏净空，不能用缩小顶排角色掩盖遮挡。
export const LEVEL_CONFIGS: readonly LevelConfig[] = [
  {
    id: 1, title: "第一次夜班", initialCoins: 170, initialLives: 9,
    enemyHealthScale: 0.9, enemySpeedScale: 0.88, availableTowers: ["sprout"],
    // 入口横段下移 50，让原顶排三格整体下移后仍有 60 的道路中心距。
    pathPoints: [[-20, 195], [105, 195], [105, 270], [295, 270], [295, 430], [120, 430], [120, 555], [410, 555]],
    towerSpots: [
      [20, 135], [70, 135], [120, 135], [170, 185], [370, 285],
      [120, 335], [170, 335], [220, 335], [370, 335],
      [120, 385], [170, 385], [220, 385], [370, 385],
      [70, 435], [70, 485], [170, 485], [220, 485], [270, 485], [320, 485], [370, 485],
      [70, 535], [70, 585],
    ],
    obstacles: [
      // 拐角格保持开放，与顶排构成一级豆包可达的清障链；邻格木箱保留扩张收益。
      { spotIndex: 1, kind: "basket", hp: 42, reward: 18 }, { spotIndex: 2, kind: "crate", hp: 58, reward: 24 },
      { spotIndex: 4, kind: "plant", hp: 50, reward: 20 }, { spotIndex: 6, kind: "basket", hp: 46, reward: 20 },
      { spotIndex: 9, kind: "crate", hp: 64, reward: 26 }, { spotIndex: 11, kind: "plant", hp: 54, reward: 22 },
      { spotIndex: 13, kind: "crate", hp: 68, reward: 28 }, { spotIndex: 16, kind: "basket", hp: 50, reward: 22 },
      { spotIndex: 19, kind: "plant", hp: 62, reward: 24 }, { spotIndex: 21, kind: "crate", hp: 70, reward: 28 },
    ],
    waves: [wave(enemies("normal", 6), 0.98), wave(enemies("normal", 7), 0.86), wave(enemies("normal", 9), 0.72), wave(enemies("normal", 12), 0.64, "最后一波，扩建完整防线！")],
  },
  // 初始零钱支持“豆包 + 棉棉”并保留 15 零钱，首波加入疾行敌人用于验证减速价值。
  {
    id: 2, title: "跑得太快啦", initialCoins: 210, initialLives: 8,
    enemyHealthScale: 1, enemySpeedScale: 1.02, availableTowers: ["sprout", "frost"],
    pathPoints: [[-20, 125], [320, 125], [320, 245], [75, 245], [75, 380], [300, 380], [300, 520], [410, 520]],
    towerSpots: [
      [20, 185], [70, 185], [120, 185], [170, 185], [220, 185], [270, 185], [370, 185],
      [20, 235], [370, 235],
      [20, 335], [120, 335], [170, 335], [220, 335], [270, 335], [320, 335],
      [20, 385], [370, 385],
      [120, 435], [170, 435], [220, 435],
      [320, 585], [370, 585],
    ],
    obstacles: [
      { spotIndex: 1, kind: "plant", hp: 62, reward: 22 }, { spotIndex: 3, kind: "crate", hp: 78, reward: 30 },
      // 右侧两格至少开放一格，让一级店员也能开始清障，不强迫先升级射程。
      { spotIndex: 0, kind: "basket", hp: 66, reward: 24 }, { spotIndex: 8, kind: "crate", hp: 84, reward: 34 },
      { spotIndex: 10, kind: "plant", hp: 72, reward: 26 }, { spotIndex: 12, kind: "basket", hp: 70, reward: 26 },
      { spotIndex: 14, kind: "crate", hp: 92, reward: 38 }, { spotIndex: 16, kind: "plant", hp: 76, reward: 28 },
      { spotIndex: 18, kind: "basket", hp: 82, reward: 30 }, { spotIndex: 21, kind: "crate", hp: 96, reward: 38 },
    ],
    waves: [wave(mix(enemies("normal", 6), enemies("swift", 2)), 0.86), wave(mix(enemies("normal", 6), enemies("swift", 5)), 0.7), wave(mix(enemies("normal", 8), enemies("swift", 6)), 0.58), wave(mix(enemies("normal", 10), enemies("swift", 8)), 0.5, "用减速争取清障和扩建时间！")],
  },
  // 初始零钱支持“布丁 + 豆包”并保留 15 零钱，更密集的短间隔波次用于验证范围攻击价值。
  {
    id: 3, title: "热食出炉", initialCoins: 250, initialLives: 8,
    enemyHealthScale: 1.06, enemySpeedScale: 1.02, availableTowers: ["sprout", "frost", "bloom"],
    pathPoints: [[-20, 125], [100, 125], [100, 520], [225, 520], [225, 180], [320, 180], [320, 575], [410, 575]],
    towerSpots: [
      [170, 135], [220, 135], [270, 135], [320, 135],
      [20, 185], [370, 185],
      [20, 285], [170, 285], [270, 285], [370, 285],
      [170, 335], [270, 335],
      [20, 385], [170, 385], [270, 385], [370, 385],
      [20, 485], [370, 485],
      [120, 585], [170, 585], [220, 585], [270, 585],
    ],
    obstacles: [
      { spotIndex: 1, kind: "crate", hp: 88, reward: 32 }, { spotIndex: 3, kind: "basket", hp: 76, reward: 28 },
      { spotIndex: 5, kind: "plant", hp: 82, reward: 30 }, { spotIndex: 7, kind: "crate", hp: 104, reward: 40 },
      { spotIndex: 9, kind: "basket", hp: 84, reward: 30 }, { spotIndex: 11, kind: "plant", hp: 92, reward: 34 },
      { spotIndex: 13, kind: "crate", hp: 116, reward: 44 }, { spotIndex: 15, kind: "basket", hp: 90, reward: 34 },
      { spotIndex: 17, kind: "plant", hp: 98, reward: 36 }, { spotIndex: 20, kind: "crate", hp: 122, reward: 46 },
    ],
    waves: [wave(enemies("normal", 10), 0.62), wave(mix(enemies("normal", 11), enemies("swift", 3)), 0.54), wave(mix(enemies("normal", 14), enemies("swift", 4)), 0.46), wave(mix(enemies("normal", 17), enemies("swift", 5)), 0.4, "布丁适合守住密集路段！")],
  },
  {
    // 重型敌人从本关加入；中场双排覆盖折返路，清障后可扩成双层火力。
    id: 4, title: "重重的纸袋", initialCoins: 260, initialLives: 7,
    enemyHealthScale: 1.12, enemySpeedScale: 1.03, availableTowers: ["sprout", "frost", "bloom"],
    pathPoints: [[-20, 115], [330, 115], [330, 240], [60, 240], [60, 390], [330, 390], [330, 555], [410, 555]],
    towerSpots: [
      [20, 185], [70, 185], [120, 185], [170, 185], [220, 185], [270, 185],
      [120, 285], [170, 285], [220, 285], [270, 285], [320, 285],
      [120, 335], [170, 335], [220, 335], [270, 335], [320, 335],
      [70, 435], [120, 435], [170, 435], [220, 435], [270, 435], [270, 485],
    ],
    obstacles: [
      { spotIndex: 1, kind: "basket", hp: 88, reward: 30 }, { spotIndex: 3, kind: "crate", hp: 114, reward: 40 },
      { spotIndex: 5, kind: "plant", hp: 96, reward: 32 }, { spotIndex: 7, kind: "crate", hp: 130, reward: 44 },
      { spotIndex: 10, kind: "basket", hp: 100, reward: 34 }, { spotIndex: 12, kind: "plant", hp: 108, reward: 36 },
      { spotIndex: 14, kind: "crate", hp: 140, reward: 46 }, { spotIndex: 16, kind: "basket", hp: 100, reward: 34 },
      { spotIndex: 19, kind: "plant", hp: 112, reward: 38 }, { spotIndex: 21, kind: "crate", hp: 144, reward: 48 },
    ],
    waves: [wave(mix(enemies("normal", 8), enemies("tank", 1)), 0.8), wave(mix(enemies("normal", 9), enemies("swift", 3)), 0.66), wave(mix(enemies("tank", 1), enemies("normal", 10), enemies("swift", 3)), 0.58), wave(mix(enemies("tank", 2), enemies("normal", 12), enemies("swift", 4)), 0.5, "重型纸袋怪需要集中火力！")],
  },
  {
    // 阶梯路线分成三段；中场保留开放转弯位，不能把所有高价值点都封住。
    id: 5, title: "第一次抢购潮", initialCoins: 270, initialLives: 7,
    enemyHealthScale: 1.16, enemySpeedScale: 1.04, availableTowers: ["sprout", "frost", "bloom"],
    pathPoints: [[-20, 130], [120, 130], [120, 230], [260, 230], [260, 330], [90, 330], [90, 455], [290, 455], [290, 570], [410, 570]],
    towerSpots: [
      // 旧顶排分别补入转弯旁的竖列，保留道路与其余格位，障碍随索引一起迁移。
      [170, 135], [70, 235], [20, 335],
      [20, 185], [70, 185], [170, 185], [220, 185], [270, 185],
      [320, 235], [70, 285], [120, 285], [170, 285], [320, 285], [320, 335],
      [20, 385], [170, 385], [220, 385], [270, 385], [20, 435],
      [120, 535], [170, 535], [220, 535],
    ],
    obstacles: [
      { spotIndex: 1, kind: "plant", hp: 102, reward: 34 }, { spotIndex: 3, kind: "basket", hp: 98, reward: 32 },
      { spotIndex: 6, kind: "crate", hp: 142, reward: 46 }, { spotIndex: 8, kind: "plant", hp: 112, reward: 36 },
      { spotIndex: 10, kind: "crate", hp: 150, reward: 48 }, { spotIndex: 13, kind: "basket", hp: 110, reward: 36 },
      { spotIndex: 7, kind: "plant", hp: 116, reward: 38 }, { spotIndex: 16, kind: "crate", hp: 158, reward: 50 },
      { spotIndex: 18, kind: "basket", hp: 114, reward: 38 }, { spotIndex: 20, kind: "crate", hp: 164, reward: 52 },
    ],
    waves: [wave(mix(enemies("normal", 9), enemies("swift", 3)), 0.74), wave(mix(enemies("tank", 1), enemies("normal", 9), enemies("swift", 3)), 0.64), wave(mix(enemies("tank", 2), enemies("normal", 10), enemies("swift", 4)), 0.54), wave(mix(enemies("tank", 2), enemies("normal", 12), enemies("swift", 5)), 0.46, "抢购潮来了，留好清场道具！")],
  },
  {
    id: 6, title: "雨夜来客", initialCoins: 280, initialLives: 7,
    enemyHealthScale: 1.24, enemySpeedScale: 1.08, availableTowers: ["sprout", "frost", "bloom"],
    pathPoints: [[190, -20], [190, 120], [60, 120], [60, 260], [320, 260], [320, 390], [80, 390], [80, 540], [410, 540]],
    towerSpots: [
      [120, 185], [170, 185], [220, 185], [270, 185],
      [70, 335], [120, 335], [170, 335], [220, 335], [270, 335],
      [170, 435], [220, 435], [270, 435], [320, 435],
      [170, 485], [220, 485], [270, 485], [320, 485], [370, 485],
      [120, 585], [170, 585], [220, 585], [270, 585],
    ],
    obstacles: [
      { spotIndex: 1, kind: "crate", hp: 144, reward: 44 }, { spotIndex: 3, kind: "basket", hp: 110, reward: 34 },
      { spotIndex: 5, kind: "plant", hp: 118, reward: 38 }, { spotIndex: 7, kind: "crate", hp: 160, reward: 50 },
      { spotIndex: 9, kind: "basket", hp: 122, reward: 40 }, { spotIndex: 12, kind: "plant", hp: 128, reward: 42 },
      { spotIndex: 14, kind: "crate", hp: 172, reward: 54 }, { spotIndex: 17, kind: "basket", hp: 128, reward: 42 },
      { spotIndex: 18, kind: "plant", hp: 136, reward: 44 }, { spotIndex: 20, kind: "crate", hp: 180, reward: 56 },
    ],
    waves: [wave(mix(enemies("normal", 10), enemies("swift", 3), enemies("tank", 1)), 0.7), wave(mix(enemies("tank", 2), enemies("normal", 10), enemies("swift", 4)), 0.6), wave(mix(enemies("tank", 2), enemies("normal", 11), enemies("swift", 5)), 0.51), wave(mix(enemies("tank", 3), enemies("normal", 12), enemies("swift", 6)), 0.44, "先清出中场空地，再补终点防线！")],
  },
  {
    // 右上进、左下出；下方开放格用于漏怪补防，也为出售转移提供落点。
    id: 7, title: "仓库告急", initialCoins: 290, initialLives: 6,
    enemyHealthScale: 1.3, enemySpeedScale: 1.1, availableTowers: ["sprout", "frost", "bloom"],
    pathPoints: [[410, 135], [280, 135], [280, 240], [70, 240], [70, 365], [300, 365], [300, 500], [140, 500], [140, 595], [-20, 595]],
    towerSpots: [
      // 入口右侧保持开放；迁移的篮筐和木箱各自邻接可用空位，避免形成孤立障碍。
      [370, 185], [220, 135], [370, 385], [70, 185], [120, 185], [170, 185], [220, 185],
      [20, 285], [120, 285], [170, 285], [220, 285], [270, 285], [320, 285],
      [70, 435], [120, 435], [170, 435], [220, 435], [370, 435], [370, 485],
      [20, 535], [70, 535], [220, 585],
    ],
    obstacles: [
      { spotIndex: 1, kind: "basket", hp: 120, reward: 36 }, { spotIndex: 3, kind: "plant", hp: 130, reward: 40 },
      { spotIndex: 5, kind: "crate", hp: 166, reward: 50 }, { spotIndex: 7, kind: "basket", hp: 126, reward: 40 },
      { spotIndex: 10, kind: "crate", hp: 180, reward: 56 }, { spotIndex: 12, kind: "plant", hp: 140, reward: 44 },
      { spotIndex: 14, kind: "basket", hp: 136, reward: 44 }, { spotIndex: 16, kind: "crate", hp: 192, reward: 58 },
      { spotIndex: 18, kind: "plant", hp: 146, reward: 46 }, { spotIndex: 2, kind: "crate", hp: 196, reward: 60 },
    ],
    waves: [wave(mix(enemies("normal", 10), enemies("swift", 3), enemies("tank", 1)), 0.68), wave(mix(enemies("tank", 2), enemies("normal", 10), enemies("swift", 5)), 0.57), wave(mix(enemies("tank", 2), enemies("normal", 10), enemies("swift", 5)), 0.49), wave(mix(enemies("tank", 3), enemies("normal", 12), enemies("swift", 7)), 0.42, "出口在左下，给终点留一份火力！")],
  },
  {
    id: 8, title: "深夜加急单", initialCoins: 300, initialLives: 6,
    enemyHealthScale: 1.38, enemySpeedScale: 1.12, availableTowers: ["sprout", "frost", "bloom"],
    pathPoints: [[100, -20], [100, 150], [300, 150], [300, 280], [70, 280], [70, 420], [280, 420], [280, 560], [410, 560]],
    towerSpots: [
      // 顶排移入中场左右竖列，不改变路线；中场植物可从开放格直接清除。
      [20, 285], [320, 385], [20, 435], [70, 185], [370, 185],
      [70, 235], [120, 235], [170, 235], [220, 235], [370, 235],
      [20, 335], [120, 335], [170, 335], [220, 335], [270, 335], [320, 335], [20, 385],
      [70, 485], [120, 485], [170, 485], [220, 485], [220, 535],
    ],
    obstacles: [
      { spotIndex: 1, kind: "plant", hp: 140, reward: 42 }, { spotIndex: 4, kind: "basket", hp: 132, reward: 40 },
      { spotIndex: 6, kind: "crate", hp: 184, reward: 56 }, { spotIndex: 8, kind: "plant", hp: 150, reward: 46 },
      { spotIndex: 10, kind: "basket", hp: 140, reward: 44 }, { spotIndex: 12, kind: "crate", hp: 200, reward: 60 },
      { spotIndex: 15, kind: "plant", hp: 156, reward: 48 }, { spotIndex: 17, kind: "basket", hp: 146, reward: 46 },
      { spotIndex: 19, kind: "crate", hp: 210, reward: 64 }, { spotIndex: 21, kind: "crate", hp: 214, reward: 64 },
    ],
    waves: [wave(mix(enemies("normal", 11), enemies("swift", 4), enemies("tank", 1)), 0.65), wave(mix(enemies("tank", 2), enemies("normal", 11), enemies("swift", 5)), 0.55), wave(mix(enemies("tank", 3), enemies("normal", 11), enemies("swift", 6)), 0.47), wave(mix(enemies("tank", 3), enemies("normal", 13), enemies("swift", 8)), 0.4, "加急订单到达，别只守入口！")],
  },
  {
    // 末段横路下移 20 像素，为右下两格保留标准道路间距，不用偏离网格的临时塔位凑数。
    id: 9, title: "天亮前一小时", initialCoins: 310, initialLives: 6,
    enemyHealthScale: 1.46, enemySpeedScale: 1.15, availableTowers: ["sprout", "frost", "bloom"],
    // 第二条横段下移 20，为篮筐补入 y=185 行让出 45 间距；两侧竖段一增一减，路长不变。
    pathPoints: [[-20, 105], [320, 105], [320, 230], [180, 230], [180, 315], [60, 315], [60, 440], [250, 440], [250, 585], [410, 585]],
    towerSpots: [
      [170, 185], [370, 135], [20, 185], [70, 185], [120, 185], [370, 185], [120, 235], [370, 235],
      [20, 285], [270, 285], [120, 385], [170, 385], [220, 385], [270, 385],
      [20, 485], [70, 485], [120, 485], [170, 485], [320, 485],
      [170, 535], [320, 535], [370, 535],
    ],
    obstacles: [
      { spotIndex: 0, kind: "basket", hp: 142, reward: 42 }, { spotIndex: 3, kind: "crate", hp: 194, reward: 58 },
      { spotIndex: 6, kind: "plant", hp: 156, reward: 46 }, { spotIndex: 8, kind: "basket", hp: 150, reward: 46 },
      { spotIndex: 9, kind: "crate", hp: 210, reward: 64 }, { spotIndex: 12, kind: "plant", hp: 166, reward: 50 },
      { spotIndex: 14, kind: "basket", hp: 158, reward: 48 }, { spotIndex: 16, kind: "crate", hp: 220, reward: 66 },
      { spotIndex: 18, kind: "plant", hp: 174, reward: 52 }, { spotIndex: 20, kind: "crate", hp: 232, reward: 70 },
    ],
    waves: [wave(mix(enemies("normal", 12), enemies("swift", 4), enemies("tank", 2)), 0.62), wave(mix(enemies("tank", 2), enemies("normal", 12), enemies("swift", 6)), 0.53), wave(mix(enemies("tank", 3), enemies("normal", 12), enemies("swift", 7)), 0.45), wave(mix(enemies("tank", 4), enemies("normal", 14), enemies("swift", 8)), 0.38, "天亮前的客流最难守！")],
  },
  {
    // 第十关增加一波形成高潮，单波规模仍不超过 26，给清障和扩建保留可读窗口。
    id: 10, title: "月圆大抢购", initialCoins: 330, initialLives: 6,
    enemyHealthScale: 1.54, enemySpeedScale: 1.18, availableTowers: ["sprout", "frost", "bloom"],
    pathPoints: [[-20, 120], [350, 120], [350, 270], [80, 270], [80, 430], [300, 430], [300, 570], [410, 570]],
    towerSpots: [
      [20, 185], [70, 185], [120, 185], [170, 185], [220, 185], [270, 185],
      [20, 335], [170, 335], [220, 335], [270, 335], [320, 335],
      [20, 385], [170, 385], [220, 385], [270, 385], [320, 385],
      [370, 435], [70, 485], [120, 485], [170, 485], [220, 485], [370, 485],
    ],
    obstacles: [
      { spotIndex: 1, kind: "plant", hp: 166, reward: 48 }, { spotIndex: 3, kind: "crate", hp: 212, reward: 62 },
      { spotIndex: 6, kind: "basket", hp: 156, reward: 46 }, { spotIndex: 8, kind: "crate", hp: 226, reward: 68 },
      { spotIndex: 10, kind: "plant", hp: 176, reward: 52 }, { spotIndex: 12, kind: "basket", hp: 166, reward: 50 },
      { spotIndex: 14, kind: "crate", hp: 236, reward: 70 }, { spotIndex: 16, kind: "plant", hp: 184, reward: 54 },
      { spotIndex: 18, kind: "basket", hp: 176, reward: 54 }, { spotIndex: 20, kind: "crate", hp: 248, reward: 74 },
    ],
    waves: [wave(mix(enemies("normal", 10), enemies("swift", 3), enemies("tank", 1)), 0.62), wave(mix(enemies("tank", 2), enemies("normal", 10), enemies("swift", 4)), 0.54), wave(mix(enemies("tank", 2), enemies("normal", 12), enemies("swift", 5)), 0.47), wave(mix(enemies("tank", 3), enemies("normal", 13), enemies("swift", 7)), 0.4), wave(mix(enemies("tank", 4), enemies("normal", 14), enemies("swift", 8)), 0.36, "月圆大抢购，撑过最后一波！")],
  },
] as const;

export function getLevelConfig(levelId: number): LevelConfig {
  const index = Math.max(0, Math.min(LEVEL_CONFIGS.length - 1, Math.floor(levelId) - 1));
  return LEVEL_CONFIGS[index];
}
