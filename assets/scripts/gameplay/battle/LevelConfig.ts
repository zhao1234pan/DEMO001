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
// x=45..345、y=135..585；每格至少有一个正交邻格，按连续地台组织，不为数量补孤立格。
// 格位中心最低为 y=135，为三级店员头顶预留顶栏净空，不能用缩小顶排角色掩盖遮挡。
export const LEVEL_CONFIGS: readonly LevelConfig[] = [
  {
    id: 1, title: "第一次夜班", initialCoins: 170, initialLives: 9,
    enemyHealthScale: 0.9, enemySpeedScale: 0.88, availableTowers: ["sprout"],
    // 入口短排、中场双排、两侧纵列与末段横排；避免旧边缘散点。
    pathPoints: [[40, 185], [95, 185], [95, 285], [295, 285], [295, 435], [95, 435], [95, 565], [350, 565]],
    towerSpots: [
      [145, 235], [195, 235], [245, 235], [295, 235],
      [95, 335], [145, 335], [195, 335], [245, 335], [95, 385], [145, 385], [195, 385], [245, 385],
      [345, 335], [345, 385], [345, 435],
      [45, 435], [45, 485], [45, 535],
      [145, 485], [195, 485], [245, 485], [295, 485],
    ],
    obstacles: [
      { spotIndex: 0, kind: "basket", hp: 42, reward: 18 }, { spotIndex: 2, kind: "crate", hp: 58, reward: 24 },
      { spotIndex: 4, kind: "plant", hp: 50, reward: 20 }, { spotIndex: 6, kind: "basket", hp: 46, reward: 20 },
      { spotIndex: 7, kind: "crate", hp: 64, reward: 26 }, { spotIndex: 9, kind: "plant", hp: 54, reward: 22 },
      { spotIndex: 10, kind: "crate", hp: 68, reward: 28 }, { spotIndex: 11, kind: "basket", hp: 50, reward: 22 },
      { spotIndex: 13, kind: "plant", hp: 62, reward: 24 }, { spotIndex: 21, kind: "crate", hp: 70, reward: 28 },
    ],
    waves: [wave(enemies("normal", 6), 0.98), wave(enemies("normal", 7), 0.86), wave(enemies("normal", 9), 0.72), wave(enemies("normal", 12), 0.64, "最后一波，扩建完整防线！")],
  },
  // 初始零钱支持“豆包 + 棉棉”并保留 15 零钱，首波加入疾行敌人用于验证减速价值。
  {
    id: 2, title: "跑得太快啦", initialCoins: 210, initialLives: 8,
    enemyHealthScale: 1, enemySpeedScale: 1.02, availableTowers: ["sprout", "frost"],
    // 上排布防、中场双排清障、下方折角补防，三块地台各有开放格。
    pathPoints: [[40, 125], [345, 125], [345, 235], [45, 235], [45, 385], [295, 385], [295, 535], [350, 535]],
    towerSpots: [
      [145, 185], [195, 185], [245, 185], [295, 185],
      [95, 285], [145, 285], [195, 285], [245, 285], [295, 285], [345, 285], [95, 335], [145, 335], [195, 335], [245, 335], [295, 335],
      [45, 435], [95, 435], [145, 435], [195, 435], [245, 435], [245, 485], [245, 535],
    ],
    obstacles: [
      { spotIndex: 2, kind: "plant", hp: 62, reward: 22 }, { spotIndex: 4, kind: "crate", hp: 78, reward: 30 },
      { spotIndex: 6, kind: "basket", hp: 66, reward: 24 }, { spotIndex: 8, kind: "crate", hp: 84, reward: 34 },
      { spotIndex: 10, kind: "plant", hp: 72, reward: 26 }, { spotIndex: 16, kind: "basket", hp: 70, reward: 26 },
      { spotIndex: 17, kind: "crate", hp: 92, reward: 38 }, { spotIndex: 18, kind: "plant", hp: 76, reward: 28 },
      { spotIndex: 19, kind: "basket", hp: 82, reward: 30 }, { spotIndex: 20, kind: "crate", hp: 96, reward: 38 },
    ],
    waves: [wave(mix(enemies("normal", 6), enemies("swift", 2)), 0.86), wave(mix(enemies("normal", 6), enemies("swift", 5)), 0.7), wave(mix(enemies("normal", 8), enemies("swift", 6)), 0.58), wave(mix(enemies("normal", 10), enemies("swift", 8)), 0.5, "用减速争取清障和扩建时间！")],
  },
  // 初始零钱支持“布丁 + 豆包”并保留 15 零钱，更密集的短间隔波次用于验证范围攻击价值。
  {
    id: 3, title: "热食出炉", initialCoins: 250, initialLives: 8,
    enemyHealthScale: 1.06, enemySpeedScale: 1.02, availableTowers: ["sprout", "frost", "bloom"],
    // 三列连续防线保留不同路段价值；中间纵路留出125宽间距，避免全列变成双路高伤强点。
    pathPoints: [[40, 125], [95, 125], [95, 535], [220, 535], [220, 135], [295, 135], [295, 565], [350, 565]],
    towerSpots: [
      [45, 235], [45, 285], [45, 335], [45, 385], [45, 435], [45, 485], [45, 535],
      [145, 135], [145, 185], [145, 235], [145, 285], [145, 335], [145, 385], [145, 435], [145, 485],
      [345, 185], [345, 235], [345, 285], [345, 335], [345, 385], [345, 435], [345, 485],
    ],
    obstacles: [
      { spotIndex: 1, kind: "crate", hp: 88, reward: 32 }, { spotIndex: 2, kind: "basket", hp: 76, reward: 28 },
      { spotIndex: 3, kind: "plant", hp: 82, reward: 30 }, { spotIndex: 4, kind: "crate", hp: 104, reward: 40 },
      { spotIndex: 5, kind: "basket", hp: 84, reward: 30 }, { spotIndex: 10, kind: "plant", hp: 92, reward: 34 },
      { spotIndex: 11, kind: "crate", hp: 116, reward: 44 }, { spotIndex: 12, kind: "basket", hp: 90, reward: 34 },
      { spotIndex: 13, kind: "plant", hp: 98, reward: 36 }, { spotIndex: 14, kind: "crate", hp: 122, reward: 46 },
    ],
    waves: [wave(enemies("normal", 10), 0.62), wave(mix(enemies("normal", 11), enemies("swift", 3)), 0.54), wave(mix(enemies("normal", 14), enemies("swift", 4)), 0.46), wave(mix(enemies("normal", 17), enemies("swift", 5)), 0.4, "布丁适合守住密集路段！")],
  },
  {
    // 重型敌人从本关加入；中场双排覆盖折返路，清障后可扩成双层火力。
    id: 4, title: "重重的纸袋", initialCoins: 260, initialLives: 7,
    enemyHealthScale: 1.12, enemySpeedScale: 1.03, availableTowers: ["sprout", "frost", "bloom"],
    // 上方双排承接重型敌人，中场横排与下方折角形成第二、第三道防线。
    pathPoints: [[40, 125], [345, 125], [345, 285], [45, 285], [45, 385], [295, 385], [295, 565], [350, 565]],
    towerSpots: [
      [145, 185], [195, 185], [245, 185], [295, 185], [45, 235], [95, 235], [145, 235], [195, 235], [245, 235], [295, 235],
      [95, 335], [145, 335], [195, 335], [245, 335], [295, 335],
      [45, 435], [95, 435], [145, 435], [195, 435], [245, 435], [245, 485], [245, 535],
    ],
    obstacles: [
      { spotIndex: 0, kind: "basket", hp: 88, reward: 30 }, { spotIndex: 1, kind: "crate", hp: 114, reward: 40 },
      { spotIndex: 2, kind: "plant", hp: 96, reward: 32 }, { spotIndex: 4, kind: "crate", hp: 130, reward: 44 },
      { spotIndex: 10, kind: "basket", hp: 100, reward: 34 }, { spotIndex: 11, kind: "plant", hp: 108, reward: 36 },
      { spotIndex: 12, kind: "crate", hp: 140, reward: 46 }, { spotIndex: 13, kind: "basket", hp: 100, reward: 34 },
      { spotIndex: 15, kind: "plant", hp: 112, reward: 38 }, { spotIndex: 21, kind: "crate", hp: 144, reward: 48 },
    ],
    waves: [wave(mix(enemies("normal", 8), enemies("tank", 1)), 0.8), wave(mix(enemies("normal", 9), enemies("swift", 3)), 0.66), wave(mix(enemies("tank", 1), enemies("normal", 10), enemies("swift", 3)), 0.58), wave(mix(enemies("tank", 2), enemies("normal", 12), enemies("swift", 4)), 0.5, "重型纸袋怪需要集中火力！")],
  },
  {
    // 阶梯路线分成三段；中场保留开放转弯位，不能把所有高价值点都封住。
    id: 5, title: "第一次抢购潮", initialCoins: 270, initialLives: 7,
    enemyHealthScale: 1.16, enemySpeedScale: 1.04, availableTowers: ["sprout", "frost", "bloom"],
    // 阶梯路线两侧以短排和连续折角组织，逐段清障，不再跨屏零散补点。
    pathPoints: [[40, 125], [95, 125], [95, 235], [245, 235], [245, 335], [45, 335], [45, 435], [295, 435], [295, 565], [350, 565]],
    towerSpots: [
      [145, 185], [195, 185], [245, 185],
      [45, 235], [45, 285], [95, 285], [145, 285], [195, 285],
      [295, 235], [295, 285], [295, 335], [295, 385], [95, 385], [145, 385], [195, 385], [245, 385],
      [45, 485], [95, 485], [145, 485], [195, 485], [245, 485], [245, 535],
    ],
    obstacles: [
      { spotIndex: 3, kind: "plant", hp: 102, reward: 34 }, { spotIndex: 6, kind: "basket", hp: 98, reward: 32 },
      { spotIndex: 7, kind: "crate", hp: 142, reward: 46 }, { spotIndex: 8, kind: "plant", hp: 112, reward: 36 },
      { spotIndex: 13, kind: "crate", hp: 150, reward: 48 }, { spotIndex: 14, kind: "basket", hp: 110, reward: 36 },
      { spotIndex: 15, kind: "plant", hp: 116, reward: 38 }, { spotIndex: 19, kind: "crate", hp: 158, reward: 50 },
      { spotIndex: 20, kind: "basket", hp: 114, reward: 38 }, { spotIndex: 21, kind: "crate", hp: 164, reward: 52 },
    ],
    waves: [wave(mix(enemies("normal", 9), enemies("swift", 3)), 0.74), wave(mix(enemies("tank", 1), enemies("normal", 9), enemies("swift", 3)), 0.64), wave(mix(enemies("tank", 2), enemies("normal", 10), enemies("swift", 4)), 0.54), wave(mix(enemies("tank", 2), enemies("normal", 12), enemies("swift", 5)), 0.46, "抢购潮来了，留好清场道具！")],
  },
  {
    id: 6, title: "雨夜来客", initialCoins: 280, initialLives: 7,
    enemyHealthScale: 1.24, enemySpeedScale: 1.08, availableTowers: ["sprout", "frost", "bloom"],
    // 上中下三条防线，中场为五列双排；每块均可从开局空位开始清障。
    pathPoints: [[195, 125], [195, 185], [45, 185], [45, 285], [345, 285], [345, 435], [45, 435], [45, 565], [350, 565]],
    towerSpots: [
      [95, 235], [145, 235], [195, 235], [245, 235], [295, 235], [345, 235],
      [95, 335], [145, 335], [195, 335], [245, 335], [295, 335], [95, 385], [145, 385], [195, 385], [245, 385], [295, 385],
      [95, 485], [145, 485], [195, 485], [245, 485], [295, 485], [345, 485],
    ],
    obstacles: [
      { spotIndex: 1, kind: "crate", hp: 144, reward: 44 }, { spotIndex: 2, kind: "basket", hp: 110, reward: 34 },
      { spotIndex: 3, kind: "plant", hp: 118, reward: 38 }, { spotIndex: 7, kind: "crate", hp: 160, reward: 50 },
      { spotIndex: 8, kind: "basket", hp: 122, reward: 40 }, { spotIndex: 9, kind: "plant", hp: 128, reward: 42 },
      { spotIndex: 10, kind: "crate", hp: 172, reward: 54 }, { spotIndex: 15, kind: "basket", hp: 128, reward: 42 },
      { spotIndex: 19, kind: "plant", hp: 136, reward: 44 }, { spotIndex: 20, kind: "crate", hp: 180, reward: 56 },
    ],
    waves: [wave(mix(enemies("normal", 10), enemies("swift", 3), enemies("tank", 1)), 0.7), wave(mix(enemies("tank", 2), enemies("normal", 10), enemies("swift", 4)), 0.6), wave(mix(enemies("tank", 2), enemies("normal", 11), enemies("swift", 5)), 0.51), wave(mix(enemies("tank", 3), enemies("normal", 12), enemies("swift", 6)), 0.44, "先清出中场空地，再补终点防线！")],
  },
  {
    // 右上进、左下出；下方开放格用于漏怪补防，也为出售转移提供落点。
    id: 7, title: "仓库告急", initialCoins: 290, initialLives: 6,
    enemyHealthScale: 1.3, enemySpeedScale: 1.1, availableTowers: ["sprout", "frost", "bloom"],
    // 右上进入、左下守店，四组地台顺着折返路分布，末段单独保留补防排。
    pathPoints: [[350, 135], [295, 135], [295, 235], [45, 235], [45, 385], [345, 385], [345, 485], [145, 485], [145, 565], [40, 565]],
    towerSpots: [
      [45, 185], [95, 185], [145, 185], [195, 185], [245, 185],
      [95, 285], [145, 285], [195, 285], [245, 285], [95, 335], [145, 335], [195, 335], [245, 335],
      [95, 435], [145, 435], [195, 435], [245, 435], [295, 435],
      [195, 535], [245, 535], [295, 535], [345, 535],
    ],
    obstacles: [
      { spotIndex: 4, kind: "basket", hp: 120, reward: 36 }, { spotIndex: 7, kind: "plant", hp: 130, reward: 40 },
      { spotIndex: 8, kind: "crate", hp: 166, reward: 50 }, { spotIndex: 10, kind: "basket", hp: 126, reward: 40 },
      { spotIndex: 11, kind: "crate", hp: 180, reward: 56 }, { spotIndex: 12, kind: "plant", hp: 140, reward: 44 },
      { spotIndex: 14, kind: "basket", hp: 136, reward: 44 }, { spotIndex: 16, kind: "crate", hp: 192, reward: 58 },
      { spotIndex: 17, kind: "plant", hp: 146, reward: 46 }, { spotIndex: 18, kind: "crate", hp: 196, reward: 60 },
    ],
    waves: [wave(mix(enemies("normal", 10), enemies("swift", 3), enemies("tank", 1)), 0.68), wave(mix(enemies("tank", 2), enemies("normal", 10), enemies("swift", 5)), 0.57), wave(mix(enemies("tank", 2), enemies("normal", 10), enemies("swift", 5)), 0.49), wave(mix(enemies("tank", 3), enemies("normal", 12), enemies("swift", 7)), 0.42, "出口在左下，给终点留一份火力！")],
  },
  {
    id: 8, title: "深夜加急单", initialCoins: 300, initialLives: 6,
    enemyHealthScale: 1.38, enemySpeedScale: 1.12, availableTowers: ["sprout", "frost", "bloom"],
    // 顶部预留入口，四组连续地台按清障扩张展开，不把入口全做免费强点。
    pathPoints: [[45, 125], [45, 185], [345, 185], [345, 285], [45, 285], [45, 435], [295, 435], [295, 565], [350, 565]],
    towerSpots: [
      [195, 135], [245, 135], [295, 135], [345, 135],
      [45, 235], [95, 235], [145, 235], [195, 235], [245, 235],
      [95, 335], [145, 335], [195, 335], [245, 335], [295, 335], [95, 385], [145, 385], [195, 385],
      [45, 485], [95, 485], [145, 485], [195, 485], [245, 485],
    ],
    obstacles: [
      { spotIndex: 0, kind: "plant", hp: 140, reward: 42 }, { spotIndex: 1, kind: "basket", hp: 132, reward: 40 },
      { spotIndex: 2, kind: "crate", hp: 184, reward: 56 }, { spotIndex: 5, kind: "plant", hp: 150, reward: 46 },
      { spotIndex: 6, kind: "basket", hp: 140, reward: 44 }, { spotIndex: 7, kind: "crate", hp: 200, reward: 60 },
      { spotIndex: 8, kind: "plant", hp: 156, reward: 48 }, { spotIndex: 13, kind: "basket", hp: 146, reward: 46 },
      { spotIndex: 20, kind: "crate", hp: 210, reward: 64 }, { spotIndex: 21, kind: "crate", hp: 214, reward: 64 },
    ],
    waves: [wave(mix(enemies("normal", 11), enemies("swift", 4), enemies("tank", 1)), 0.65), wave(mix(enemies("tank", 2), enemies("normal", 11), enemies("swift", 5)), 0.55), wave(mix(enemies("tank", 3), enemies("normal", 11), enemies("swift", 6)), 0.47), wave(mix(enemies("tank", 3), enemies("normal", 13), enemies("swift", 8)), 0.4, "加急订单到达，别只守入口！")],
  },
  {
    // 入口与终点均位于可见战场内，不再沿用屏外占位端点。
    id: 9, title: "天亮前一小时", initialCoins: 310, initialLives: 6,
    enemyHealthScale: 1.46, enemySpeedScale: 1.15, availableTowers: ["sprout", "frost", "bloom"],
    // 上、中、下三组连续折角地台；十件障碍保留原耐久与总奖励。
    // 首横段与末横段各上移 5，路长不变；给入口标签和底部道具区同时留出净空。
    pathPoints: [[40, 120], [345, 120], [345, 235], [195, 235], [195, 335], [45, 335], [45, 435], [245, 435], [245, 570], [350, 570]],
    towerSpots: [
      [145, 185], [195, 185], [245, 185], [295, 185], [145, 235], [45, 285], [95, 285], [145, 285],
      [245, 285], [295, 285], [345, 285], [245, 335], [95, 385], [145, 385], [195, 385], [245, 385],
      [45, 485], [95, 485], [145, 485], [195, 485], [195, 535], [195, 585],
    ],
    obstacles: [
      { spotIndex: 1, kind: "basket", hp: 142, reward: 42 }, { spotIndex: 2, kind: "crate", hp: 194, reward: 58 },
      { spotIndex: 6, kind: "plant", hp: 156, reward: 46 }, { spotIndex: 7, kind: "basket", hp: 150, reward: 46 },
      { spotIndex: 8, kind: "crate", hp: 210, reward: 64 }, { spotIndex: 9, kind: "plant", hp: 166, reward: 50 },
      { spotIndex: 12, kind: "basket", hp: 158, reward: 48 }, { spotIndex: 13, kind: "crate", hp: 220, reward: 66 },
      { spotIndex: 14, kind: "plant", hp: 174, reward: 52 }, { spotIndex: 18, kind: "crate", hp: 232, reward: 70 },
    ],
    waves: [wave(mix(enemies("normal", 12), enemies("swift", 4), enemies("tank", 2)), 0.62), wave(mix(enemies("tank", 2), enemies("normal", 12), enemies("swift", 6)), 0.53), wave(mix(enemies("tank", 3), enemies("normal", 12), enemies("swift", 7)), 0.45), wave(mix(enemies("tank", 4), enemies("normal", 14), enemies("swift", 8)), 0.38, "天亮前的客流最难守！")],
  },
  {
    // 第十关增加一波形成高潮，单波规模仍不超过 26，给清障和扩建保留可读窗口。
    id: 10, title: "月圆大抢购", initialCoins: 330, initialLives: 6,
    enemyHealthScale: 1.54, enemySpeedScale: 1.18, availableTowers: ["sprout", "frost", "bloom"],
    // 上方双排、中场双排、下方折角；五波节奏与全部战斗参数保持不变。
    pathPoints: [[40, 125], [345, 125], [345, 285], [45, 285], [45, 435], [295, 435], [295, 565], [350, 565]],
    towerSpots: [
      [145, 185], [195, 185], [245, 185], [295, 185], [145, 235], [195, 235], [245, 235], [295, 235],
      [95, 335], [145, 335], [195, 335], [245, 335], [95, 385], [145, 385], [195, 385], [245, 385],
      [45, 485], [95, 485], [145, 485], [195, 485], [245, 485], [245, 535],
    ],
    obstacles: [
      // 高覆盖格分布在上、中两段；中场篮筐邻接两处开放格，保留首波前集火清障再补塔的机会。
      { spotIndex: 1, kind: "plant", hp: 166, reward: 48 }, { spotIndex: 3, kind: "crate", hp: 212, reward: 62 },
      { spotIndex: 5, kind: "basket", hp: 156, reward: 46 }, { spotIndex: 7, kind: "crate", hp: 226, reward: 68 },
      { spotIndex: 11, kind: "plant", hp: 176, reward: 52 }, { spotIndex: 13, kind: "basket", hp: 166, reward: 50 },
      { spotIndex: 15, kind: "crate", hp: 236, reward: 70 }, { spotIndex: 17, kind: "plant", hp: 184, reward: 54 },
      { spotIndex: 19, kind: "basket", hp: 176, reward: 54 }, { spotIndex: 20, kind: "crate", hp: 248, reward: 74 },
    ],
    waves: [wave(mix(enemies("normal", 10), enemies("swift", 3), enemies("tank", 1)), 0.62), wave(mix(enemies("tank", 2), enemies("normal", 10), enemies("swift", 4)), 0.54), wave(mix(enemies("tank", 2), enemies("normal", 12), enemies("swift", 5)), 0.47), wave(mix(enemies("tank", 3), enemies("normal", 13), enemies("swift", 7)), 0.4), wave(mix(enemies("tank", 4), enemies("normal", 14), enemies("swift", 8)), 0.36, "月圆大抢购，撑过最后一波！")],
  },
] as const;

export function getLevelConfig(levelId: number): LevelConfig {
  const index = Math.max(0, Math.min(LEVEL_CONFIGS.length - 1, Math.floor(levelId) - 1));
  return LEVEL_CONFIGS[index];
}
