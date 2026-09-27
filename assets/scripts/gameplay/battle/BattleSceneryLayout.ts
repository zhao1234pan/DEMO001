import type { LevelConfig, MapPoint } from "./LevelConfig";

export type SceneDecorationKind = "planter" | "tree";

/** 坐标为完整透明画布的中心，不额外加脚底偏移；groupId仅表达环境组合，不是建造格。 */
export interface SceneDecoration {
  kind: SceneDecorationKind;
  position: MapPoint;
  width: number;
  height: number;
  groupId: number;
}

type DecorationAnchor = readonly [SceneDecorationKind, number, number];
type Bounds = readonly [number, number, number, number];

const DECORATION_SIZES: Readonly<Record<SceneDecorationKind, readonly [number, number]>> = {
  planter: [48, 48],
  tree: [40, 56],
};

// 根据十关真实空白矩形逐关排布，不用随机候选填数量。横排的树/花池以完整画布底边对齐；
// 纵向组合留8～16间距形成狭长绿化区。单件也可独立成组，不为凑两件挤占布阵空间。
const COURTYARD_GROUPS: Readonly<Record<number, readonly (readonly DecorationAnchor[])[]>> = {
  1: [
    [["tree", 196, 128], ["planter", 248, 132]],
    [["tree", 30, 298]],
    [["planter", 354, 484]],
  ],
  2: [
    [["tree", 54, 526], ["planter", 106, 530]],
    [["tree", 352, 380], ["planter", 352, 442]],
  ],
  // 密集纵向路线没有合法的40×56树位，仅在右上和左下各保留一个完整花池。
  3: [
    [["planter", 354, 108]],
    [["planter", 36, 576]],
  ],
  4: [
    [["tree", 56, 528], ["planter", 108, 532]],
    [["tree", 352, 370], ["planter", 352, 438]],
  ],
  5: [
    [["tree", 64, 550], ["planter", 116, 554]],
    [["tree", 354, 142], ["planter", 354, 204]],
  ],
  6: [
    [["tree", 52, 120], ["planter", 104, 124]],
    [["tree", 278, 132], ["planter", 330, 136]],
    [["planter", 30, 360]],
  ],
  7: [
    [["tree", 304, 304], ["planter", 356, 308]],
    [["tree", 32, 484], ["planter", 84, 488]],
  ],
  8: [
    [["tree", 64, 550], ["planter", 116, 554]],
    [["tree", 350, 380], ["planter", 354, 444]],
    [["planter", 120, 120]],
  ],
  9: [
    [["tree", 46, 550], ["planter", 98, 554]],
    [["tree", 330, 370], ["planter", 330, 432]],
    [["planter", 52, 196]],
  ],
  10: [
    [["tree", 64, 550], ["planter", 116, 554]],
    [["tree", 352, 370], ["planter", 352, 434]],
    [["tree", 52, 212]],
  ],
};

/** 纯布局函数：不依赖Cocos、时间或随机数，不修改关卡；后续路线变更使位置失效时只省略，不偷偷搬到别处。 */
export function selectSceneDecorations(level: LevelConfig, width: number): SceneDecoration[] {
  const result: SceneDecoration[] = [];
  if (!Number.isFinite(width) || width <= 0 || level.pathPoints.length < 2) return result;
  const groups = COURTYARD_GROUPS[level.id] ?? [];
  groups.forEach((anchors, index) => {
    for (const [kind, x, y] of anchors) {
      const [imageWidth, imageHeight] = DECORATION_SIZES[kind];
      const decoration: SceneDecoration = { kind, position: [x, y], width: imageWidth, height: imageHeight, groupId: index + 1 };
      const bounds = boundsOf(decoration);
      if (!fitsGameplay(level, width, bounds)) continue;
      if (result.some((other) => overlap(bounds, boundsOf(other), 4))) continue;
      result.push(decoration);
    }
  });
  return result;
}

function boundsOf(decoration: SceneDecoration): Bounds {
  const [x, y] = decoration.position;
  return [x - decoration.width / 2, y - decoration.height / 2, x + decoration.width / 2, y + decoration.height / 2];
}

function overlap(a: Bounds, b: Bounds, margin: number): boolean {
  return a[0] < b[2] + margin && a[2] > b[0] - margin && a[1] < b[3] + margin && a[3] > b[1] - margin;
}

function fitsGameplay(level: LevelConfig, width: number, bounds: Bounds): boolean {
  if (bounds[0] < 4 || bounds[2] > width - 4 || bounds[1] < 84 || bounds[3] > 602) return false;
  // 使用完整画布矩形到真实路径的距离：路缘半宽26，再留3净空，不能只检查装饰中心。
  for (let i = 1; i < level.pathPoints.length; i += 1) {
    if (segmentToBoundsDistance(level.pathPoints[i - 1], level.pathPoints[i], bounds) < 29) return false;
  }
  // 三级角色和地标文字采用保守联合画布；障碍所在格也保留升级后的完整角色净空。
  if (level.towerSpots.some(([x, y]) => overlap(bounds, [x - 30, y - 47, x + 30, y + 13], 4))) return false;
  return ![level.pathPoints[0], level.pathPoints[level.pathPoints.length - 1]]
    .some(([x, y]) => overlap(bounds, [x - 32, y - 40, x + 32, y + 34], 4));
}

function segmentToBoundsDistance(a: MapPoint, b: MapPoint, bounds: Bounds): number {
  // 先用参数区间判定线段穿过矩形；再比较端点到矩形、四角到线段，亦支持未来的斜线段。
  let enter = 0; let exit = 1; let intersects = true;
  for (let axis = 0; axis < 2; axis += 1) {
    const delta = b[axis] - a[axis]; const minimum = bounds[axis]; const maximum = bounds[axis + 2];
    if (Math.abs(delta) < 1e-8) {
      if (a[axis] < minimum || a[axis] > maximum) intersects = false;
    } else {
      const t1 = (minimum - a[axis]) / delta; const t2 = (maximum - a[axis]) / delta;
      enter = Math.max(enter, Math.min(t1, t2)); exit = Math.min(exit, Math.max(t1, t2));
      if (enter > exit) intersects = false;
    }
  }
  if (intersects) return 0;
  const pointToBounds = ([x, y]: MapPoint) => Math.hypot(
    Math.max(bounds[0] - x, x - bounds[2], 0), Math.max(bounds[1] - y, y - bounds[3], 0));
  let distance = Math.min(pointToBounds(a), pointToBounds(b));
  const dx = b[0] - a[0]; const dy = b[1] - a[1]; const lengthSquared = dx * dx + dy * dy;
  for (const x of [bounds[0], bounds[2]]) for (const y of [bounds[1], bounds[3]]) {
    const t = lengthSquared > 0 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / lengthSquared)) : 0;
    distance = Math.min(distance, Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t));
  }
  return distance;
}
