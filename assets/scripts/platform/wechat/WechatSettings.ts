interface WechatSettingsApi {
  getWindowInfo?(): { windowWidth?: number; screenWidth?: number };
  getMenuButtonBoundingClientRect?(): { bottom: number; width: number; height: number };
}
declare const wx: WechatSettingsApi | undefined;

export function isWechatSettingsRuntime(): boolean {
  return typeof wx !== "undefined" && wx !== null;
}

/** 仅查询窗口和胶囊尺寸；旧版缺接口时沿用引擎安全区，不改用更广的系统信息接口。 */
export function getWechatTopOverlayRatio(): number {
  if (typeof wx === "undefined" || wx === null) return 0;
  try {
    const info = wx.getWindowInfo?.();
    const menu = wx.getMenuButtonBoundingClientRect?.();
    const width = info?.windowWidth ?? info?.screenWidth ?? 0;
    if (!menu || !Number.isFinite(width) || width <= 0
      || !Number.isFinite(menu.width) || menu.width <= 0
      || !Number.isFinite(menu.height) || menu.height <= 0
      || !Number.isFinite(menu.bottom) || menu.bottom < 0) return 0;
    return (menu.bottom + 8) / width;
  } catch {
    return 0;
  }
}
