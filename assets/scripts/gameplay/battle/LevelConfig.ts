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

// 前三关使用统一的 50 像素网格组织高密度塔防棋盘：空位和障碍都占用标准建造单元，
// 同一路段旁优先成行、成列或成组排列，避免逐个手调坐标造成视觉散乱。
export const LEVEL_CONFIGS: readonly LevelConfig[] = [
  {
    id: 1, title: "第一次夜班", initialCoins: 170, initialLives: 9,
    enemyHealthScale: 0.9, enemySpeedScale: 0.88, availableTowers: ["sprout"],
    pathPoints: [[-20, 145], [105, 145], [105, 270], [295, 270], [295, 430], [120, 430], [120, 555], [410, 555]],
    towerSpots: [
      [20, 85], [70, 85], [120, 85], [170, 185], [370, 285],
      [120, 335], [170, 335], [220, 335], [370, 335],
      [120, 385], [170, 385], [220, 385], [370, 385],
      [70, 435], [70, 485], [170, 485], [220, 485], [270, 485], [320, 485], [370, 485],
      [70, 535], [70, 585],
    ],
    obstacles: [
      { spotIndex: 1, kind: "basket", hp: 42, reward: 18 }, { spotIndex: 3, kind: "crate", hp: 58, reward: 24 },
      { spotIndex: 4, kind: "plant", hp: 50, reward: 20 }, { spotIndex: 6, kind: "basket", hp: 46, reward: 20 },
      { spotIndex: 9, kind: "crate", hp: 64, reward: 26 }, { spotIndex: 11, kind: "plant", hp: 54, reward: 22 },
      { spotIndex: 13, kind: "crate", hp: 68, reward: 28 }, { spotIndex: 16, kind: "basket", hp: 50, reward: 22 },
      { spotIndex: 19, kind: "plant", hp: 62, reward: 24 }, { spotIndex: 21, kind: "crate", hp: 70, reward: 28 },
    ],
    waves: [wave(enemies("normal", 6), 0.98), wave(enemies("normal", 7), 0.86), wave(enemies("normal", 9), 0.72), wave(enemies("normal", 12), 0.64, "最后一波，扩建完整防线！")],
  },
  // 初始零钱刚好支持“豆包 + 棉棉”，首波加入疾行敌人用于验证减速价值。
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
      { spotIndex: 6, kind: "basket", hp: 66, reward: 24 }, { spotIndex: 8, kind: "crate", hp: 84, reward: 34 },
      { spotIndex: 10, kind: "plant", hp: 72, reward: 26 }, { spotIndex: 12, kind: "basket", hp: 70, reward: 26 },
      { spotIndex: 14, kind: "crate", hp: 92, reward: 38 }, { spotIndex: 16, kind: "plant", hp: 76, reward: 28 },
      { spotIndex: 18, kind: "basket", hp: 82, reward: 30 }, { spotIndex: 21, kind: "crate", hp: 96, reward: 38 },
    ],
    waves: [wave(mix(enemies("normal", 6), enemies("swift", 2)), 0.86), wave(mix(enemies("normal", 6), enemies("swift", 5)), 0.7), wave(mix(enemies("normal", 8), enemies("swift", 6)), 0.58), wave(mix(enemies("normal", 10), enemies("swift", 8)), 0.5, "用减速争取清障和扩建时间！")],
  },
  // 初始零钱刚好支持“布丁 + 豆包”，更密集的短间隔波次用于验证范围攻击价值。
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
    id: 4, title: "重重的纸袋", initialCoins: 240, initialLives: 7,
    enemyHealthScale: 1.15, enemySpeedScale: 1.05, availableTowers: ["sprout", "frost", "bloom"],
    pathPoints: [[-20, 115], [330, 115], [330, 240], [60, 240], [60, 390], [330, 390], [330, 555], [410, 555]],
    towerSpots: [[180, 178], [115, 315], [250, 315], [270, 472]],
    waves: [wave(mix(enemies("normal", 8), enemies("tank", 1)), 0.82), wave(mix(enemies("tank", 2), enemies("normal", 6)), 0.76), wave(mix(enemies("tank", 2), enemies("swift", 5), enemies("normal", 7)), 0.66, "重型纸袋怪需要集中火力！")],
  },
  {
    id: 5, title: "第一次抢购潮", initialCoins: 250, initialLives: 7,
    enemyHealthScale: 1.22, enemySpeedScale: 1.08, availableTowers: ["sprout", "frost", "bloom"],
    pathPoints: [[-20, 130], [120, 130], [120, 230], [260, 230], [260, 330], [90, 330], [90, 455], [290, 455], [290, 570], [410, 570]],
    towerSpots: [[50, 195], [190, 170], [330, 270], [35, 395], [200, 392], [350, 510]],
    waves: [wave(enemies("normal", 9), 0.82), wave(mix(enemies("swift", 5), enemies("normal", 5)), 0.7), wave(mix(enemies("tank", 2), enemies("normal", 7)), 0.72), wave(mix(enemies("normal", 11), enemies("swift", 5)), 0.54, "抢购潮来了，留好清场道具！")],
  },
  {
    id: 6, title: "雨夜来客", initialCoins: 260, initialLives: 7,
    enemyHealthScale: 1.29, enemySpeedScale: 1.09, availableTowers: ["sprout", "frost", "bloom"],
    pathPoints: [[190, -20], [190, 120], [60, 120], [60, 260], [320, 260], [320, 390], [80, 390], [80, 540], [410, 540]],
    towerSpots: [[125, 190], [255, 190], [190, 325], [375, 325], [200, 465]],
    waves: [wave(mix(enemies("normal", 8), enemies("swift", 4)), 0.76), wave(mix(enemies("tank", 2), enemies("normal", 8)), 0.7), wave(mix(enemies("swift", 8), enemies("tank", 2)), 0.62), wave(mix(enemies("normal", 12), enemies("tank", 3), enemies("swift", 4)), 0.54, "雨夜视线乱，优先守住弯道！")],
  },
  {
    id: 7, title: "仓库告急", initialCoins: 270, initialLives: 6,
    enemyHealthScale: 1.36, enemySpeedScale: 1.12, availableTowers: ["sprout", "frost", "bloom"],
    pathPoints: [[410, 135], [280, 135], [280, 240], [70, 240], [70, 365], [300, 365], [300, 500], [140, 500], [140, 595], [-20, 595]],
    towerSpots: [[350, 190], [180, 185], [20, 300], [185, 302], [355, 430], [205, 432]],
    waves: [wave(mix(enemies("tank", 2), enemies("normal", 8)), 0.72), wave(mix(enemies("swift", 9), enemies("normal", 5)), 0.6), wave(mix(enemies("tank", 3), enemies("swift", 6)), 0.62), wave(mix(enemies("normal", 12), enemies("tank", 4), enemies("swift", 5)), 0.5, "出口换到左边了，重新安排火力！")],
  },
  {
    id: 8, title: "深夜加急单", initialCoins: 280, initialLives: 6,
    enemyHealthScale: 1.44, enemySpeedScale: 1.15, availableTowers: ["sprout", "frost", "bloom"],
    pathPoints: [[100, -20], [100, 150], [300, 150], [300, 280], [70, 280], [70, 420], [280, 420], [280, 560], [410, 560]],
    towerSpots: [[200, 215], [350, 215], [185, 350], [175, 490]],
    waves: [wave(mix(enemies("normal", 10), enemies("swift", 4)), 0.68), wave(mix(enemies("tank", 3), enemies("normal", 8)), 0.64), wave(mix(enemies("swift", 10), enemies("tank", 2)), 0.52), wave(mix(enemies("normal", 14), enemies("tank", 4), enemies("swift", 4)), 0.48, "加急订单到达，别只守入口！")],
  },
  {
    id: 9, title: "天亮前一小时", initialCoins: 290, initialLives: 6,
    enemyHealthScale: 1.52, enemySpeedScale: 1.17, availableTowers: ["sprout", "frost", "bloom"],
    pathPoints: [[-20, 105], [320, 105], [320, 210], [180, 210], [180, 315], [60, 315], [60, 440], [250, 440], [250, 565], [410, 565]],
    towerSpots: [[90, 160], [250, 160], [375, 160], [120, 260], [150, 377], [315, 500]],
    waves: [wave(mix(enemies("normal", 11), enemies("tank", 2)), 0.66), wave(mix(enemies("swift", 9), enemies("normal", 8)), 0.5), wave(mix(enemies("tank", 4), enemies("swift", 6)), 0.56), wave(mix(enemies("normal", 15), enemies("swift", 8), enemies("tank", 3)), 0.44, "天亮前的客流最难守！")],
  },
  {
    id: 10, title: "月圆大抢购", initialCoins: 310, initialLives: 5,
    enemyHealthScale: 1.62, enemySpeedScale: 1.2, availableTowers: ["sprout", "frost", "bloom"],
    pathPoints: [[-20, 120], [350, 120], [350, 270], [80, 270], [80, 430], [300, 430], [300, 570], [410, 570]],
    towerSpots: [[170, 195], [300, 195], [25, 350], [190, 350], [190, 500]],
    waves: [wave(mix(enemies("normal", 10), enemies("swift", 3)), 0.64), wave(mix(enemies("tank", 3), enemies("normal", 7)), 0.58), wave(mix(enemies("swift", 8), enemies("tank", 3)), 0.48), wave(mix(enemies("normal", 13), enemies("tank", 4), enemies("swift", 3)), 0.46), wave(mix(enemies("normal", 14), enemies("swift", 8), enemies("tank", 4)), 0.38, "月圆大抢购，撑过最后一波！")],
  },
] as const;

export function getLevelConfig(levelId: number): LevelConfig {
  const index = Math.max(0, Math.min(LEVEL_CONFIGS.length - 1, Math.floor(levelId) - 1));
  return LEVEL_CONFIGS[index];
}
