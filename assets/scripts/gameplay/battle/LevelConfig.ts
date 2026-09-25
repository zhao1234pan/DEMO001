import { EnemyKind, TowerKind } from "./GameConfig";

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
  availableTowers: TowerKind[];
  waves: WaveConfig[];
}

const enemies = (kind: EnemyKind, count: number): EnemyKind[] => Array.from({ length: count }, () => kind);
const mix = (...groups: EnemyKind[][]): EnemyKind[] => groups.reduce<EnemyKind[]>((result, group) => result.concat(group), []);
const wave = (list: EnemyKind[], spawnInterval = 0.72, announcement?: string): WaveConfig => ({ enemies: list, spawnInterval, announcement });

export const LEVEL_CONFIGS: readonly LevelConfig[] = [
  {
    id: 1, title: "第一次夜班", initialCoins: 260, initialLives: 10, enemyHealthScale: 0.82,
    availableTowers: ["sprout"],
    waves: [wave(enemies("normal", 5), 0.85), wave(enemies("normal", 7), 0.78), wave(enemies("normal", 9), 0.7, "最后一波来了！")],
  },
  {
    id: 2, title: "跑得太快啦", initialCoins: 270, initialLives: 10, enemyHealthScale: 0.9,
    availableTowers: ["sprout", "frost"],
    waves: [wave(enemies("normal", 6)), wave(mix(enemies("normal", 5), enemies("swift", 2))), wave(mix(enemies("swift", 4), enemies("normal", 6)), 0.64, "小心高速精怪！")],
  },
  {
    id: 3, title: "热食出炉", initialCoins: 300, initialLives: 10, enemyHealthScale: 0.96,
    availableTowers: ["sprout", "frost", "bloom"],
    waves: [wave(enemies("normal", 8)), wave(mix(enemies("normal", 6), enemies("swift", 3))), wave(mix(enemies("normal", 10), enemies("swift", 4)), 0.56, "精怪挤成一团了！")],
  },
  {
    id: 4, title: "重重的纸袋", initialCoins: 310, initialLives: 9, enemyHealthScale: 1.02,
    availableTowers: ["sprout", "frost", "bloom"],
    waves: [wave(mix(enemies("normal", 7), enemies("tank", 1))), wave(mix(enemies("tank", 2), enemies("swift", 4))), wave(mix(enemies("normal", 8), enemies("tank", 2), enemies("swift", 3)), 0.62)],
  },
  {
    id: 5, title: "第一次抢购潮", initialCoins: 320, initialLives: 9, enemyHealthScale: 1.08,
    availableTowers: ["sprout", "frost", "bloom"],
    waves: [wave(enemies("normal", 9)), wave(mix(enemies("swift", 5), enemies("normal", 7)), 0.58), wave(mix(enemies("tank", 2), enemies("normal", 10))), wave(mix(enemies("normal", 14), enemies("swift", 6)), 0.42, "抢购潮来了！")],
  },
  {
    id: 6, title: "雨夜来客", initialCoins: 330, initialLives: 9, enemyHealthScale: 1.14,
    availableTowers: ["sprout", "frost", "bloom"],
    waves: [wave(mix(enemies("normal", 8), enemies("swift", 3))), wave(mix(enemies("tank", 2), enemies("normal", 8))), wave(mix(enemies("swift", 6), enemies("tank", 2))), wave(mix(enemies("normal", 12), enemies("tank", 3)), 0.54)],
  },
  {
    id: 7, title: "仓库告急", initialCoins: 340, initialLives: 8, enemyHealthScale: 1.2,
    availableTowers: ["sprout", "frost", "bloom"],
    waves: [wave(mix(enemies("tank", 2), enemies("normal", 7))), wave(mix(enemies("swift", 7), enemies("normal", 6))), wave(mix(enemies("tank", 3), enemies("swift", 5))), wave(mix(enemies("normal", 12), enemies("tank", 3), enemies("swift", 4)), 0.5)],
  },
  {
    id: 8, title: "深夜加急单", initialCoins: 350, initialLives: 8, enemyHealthScale: 1.27,
    availableTowers: ["sprout", "frost", "bloom"],
    waves: [wave(mix(enemies("normal", 10), enemies("swift", 3))), wave(mix(enemies("tank", 3), enemies("normal", 8))), wave(mix(enemies("swift", 9), enemies("tank", 2)), 0.48), wave(mix(enemies("normal", 14), enemies("tank", 4)), 0.5, "加急订单到达！")],
  },
  {
    id: 9, title: "天亮前一小时", initialCoins: 360, initialLives: 8, enemyHealthScale: 1.34,
    availableTowers: ["sprout", "frost", "bloom"],
    waves: [wave(mix(enemies("normal", 11), enemies("tank", 2))), wave(mix(enemies("swift", 8), enemies("normal", 8))), wave(mix(enemies("tank", 4), enemies("swift", 5))), wave(mix(enemies("normal", 15), enemies("swift", 7), enemies("tank", 3)), 0.44)],
  },
  {
    id: 10, title: "月圆大抢购", initialCoins: 380, initialLives: 8, enemyHealthScale: 1.42,
    availableTowers: ["sprout", "frost", "bloom"],
    waves: [wave(mix(enemies("normal", 12), enemies("swift", 4))), wave(mix(enemies("tank", 4), enemies("normal", 8))), wave(mix(enemies("swift", 10), enemies("tank", 3)), 0.46), wave(mix(enemies("normal", 16), enemies("tank", 5))), wave(mix(enemies("normal", 18), enemies("swift", 10), enemies("tank", 5)), 0.38, "月圆抢购潮！")],
  },
] as const;

export function getLevelConfig(levelId: number): LevelConfig {
  const index = Math.max(0, Math.min(LEVEL_CONFIGS.length - 1, Math.floor(levelId) - 1));
  return LEVEL_CONFIGS[index];
}
