/** 所有按钮共用绘制/命中坐标，避免美术改尺寸后热区仍留在旧位置。单位为390宽逻辑像素。 */
export interface HitRect { x: number; y: number; width: number; height: number; }
export const BATTLE_UI = {
  headerHeight: 72,
  speed: { x: 268, y: 12, width: 50, height: 48 },
  pause: { x: 328, y: 12, width: 50, height: 48 },
  gmClose: { x: 292, y: 124, width: 50, height: 48 },
  contextWidth: 96,
  contextHeight: 48,
  minimumHit: 50,
};

export function containsPoint(rect: HitRect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

/** 安全区已由Cocos换算为设计坐标（左下原点），禁止二次除DPR。 */
export function computeBattleLayout(width: number, height: number, safe: HitRect, overlayTop: number) {
  const boardWidth = 390; const boardHeight = 1334 * boardWidth / 750;
  const left = Math.max(0, safe.x); const bottom = Math.max(0, safe.y);
  const right = Math.min(width, safe.x + safe.width);
  const top = Math.min(height - Math.max(0, overlayTop), safe.y + safe.height);
  const safeWidth = Math.max(1, right - left); const safeHeight = Math.max(1, top - bottom);
  // 常规长屏固定宽度、上下延展；安全高度不足时等比容纳整个棋盘，绝不分别拉伸两轴。
  const scale = Math.min(safeWidth / boardWidth, safeHeight / boardHeight);
  const extraHeight = Math.max(0, safeHeight / scale - boardHeight);
  return {
    scale, centerX: (left + right - width) / 2, centerY: (bottom + top - height) / 2,
    top: -extraHeight / 2, bottom: boardHeight + extraHeight / 2,
    hitSize: Math.max(BATTLE_UI.minimumHit, 88 * boardWidth / 750 / scale),
  };
}
