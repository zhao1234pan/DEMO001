interface DouyinLayoutApi {
  getSystemInfoSync?(): { windowWidth?: number; screenWidth?: number };
  getMenuButtonBoundingClientRect?(): { bottom: number; width: number; height: number };
}
declare const tt: DouyinLayoutApi | undefined;

/** 胶囊属于平台覆盖层，不一定包含在系统安全区里；返回相对于屏宽的顶部避让比例。 */
export function getDouyinTopOverlayRatio(): number {
  if (typeof tt === "undefined") return 0;
  try {
    const info = tt.getSystemInfoSync?.();
    const menu = tt.getMenuButtonBoundingClientRect?.();
    const width = info?.windowWidth ?? info?.screenWidth ?? 0;
    if (!menu || width <= 0 || menu.width <= 0 || menu.height <= 0 || !Number.isFinite(menu.bottom)) return 0;
    return Math.max(0, menu.bottom + 8) / width;
  } catch {
    // 旧基础库无胶囊查询接口时仍使用引擎安全区，不阻断游戏启动。
    return 0;
  }
}
