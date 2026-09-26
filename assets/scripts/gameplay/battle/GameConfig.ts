export const GAME_CONFIG = {
  designWidth: 750,
  designHeight: 1334,
  prototypeLayoutWidth: 390,
  // 逻辑画布必须与 750×1334 保持完全相同的宽高比，禁止横纵分别缩放造成图形和触控变形。
  prototypeLayoutHeight: 1334 * 390 / 750,
  maxLevels: 10,
  rewardAdUnitId: "replace-with-douyin-ad-unit-id",
} as const;

export type TowerKind = "sprout" | "frost" | "bloom";
export type EnemyKind = "normal" | "swift" | "tank";

export interface TowerConfig {
  name: string;
  cost: number;
  color: string;
  range: number;
  rate: number;
  damage: number;
  shotColor: string;
  slow?: boolean;
  splash?: number;
}

// 一级店员先按“单体效率、控制价值、群体效率”分工；升级倍率由 GameRoot 统一计算，
// 防止某名店员只靠基础面板就同时压过另外两种定位。
export const TOWER_CONFIG: Record<TowerKind, TowerConfig> = {
  sprout: { name: "豆包", cost: 85, color: "#d59b58", range: 88, rate: 0.72, damage: 12, shotColor: "#ffe072" },
  frost: { name: "棉棉", cost: 110, color: "#d6c2e9", range: 86, rate: 1.08, damage: 8, shotColor: "#e8f8ff", slow: true },
  bloom: { name: "布丁", cost: 150, color: "#e9aa62", range: 100, rate: 1.52, damage: 23, shotColor: "#ffbd72", splash: 38 },
};

export interface EnemyConfig {
  hp: number;
  speed: number;
  reward: number;
  radius: number;
  color: string;
  damage: number;
}

// 敌人基础值不含关卡和波次倍率。奖励刻意低于旧原型，避免前两波滚出过量经济。
export const ENEMY_CONFIG: Record<EnemyKind, EnemyConfig> = {
  normal: { hp: 58, speed: 38, reward: 8, radius: 15, color: "#9a77bd", damage: 1 },
  swift: { hp: 44, speed: 62, reward: 11, radius: 13, color: "#e5aa54", damage: 1 },
  tank: { hp: 190, speed: 25, reward: 22, radius: 19, color: "#8a705c", damage: 2 },
};
