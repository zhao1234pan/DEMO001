export const GAME_CONFIG = {
  designWidth: 750,
  designHeight: 1334,
  prototypeLayoutWidth: 390,
  prototypeLayoutHeight: 700,
  maxWaves: 10,
  initialCoins: 260,
  initialLives: 15,
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

export const TOWER_CONFIG: Record<TowerKind, TowerConfig> = {
  sprout: { name: "嫩芽", cost: 80, color: "#65bd67", range: 92, rate: 0.75, damage: 15, shotColor: "#f3f06a" },
  frost: { name: "露珠", cost: 110, color: "#58bcd6", range: 82, rate: 1.15, damage: 9, shotColor: "#d8fbff", slow: true },
  bloom: { name: "花炮", cost: 150, color: "#e789a8", range: 105, rate: 1.65, damage: 29, shotColor: "#ffb2cb", splash: 42 },
};

export const PATH_POINTS: ReadonlyArray<readonly [number, number]> = [
  [-20, 142], [92, 142], [92, 245], [292, 245], [292, 365],
  [112, 365], [112, 492], [332, 492], [414, 492],
];

export const TOWER_SPOTS: ReadonlyArray<readonly [number, number]> = [
  [48, 206], [156, 176], [248, 178], [346, 211], [218, 310],
  [51, 336], [347, 340], [61, 446], [188, 432], [278, 430], [354, 551],
];
