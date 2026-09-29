interface SidebarOptions {
  scene: "sidebar";
  success: (result?: { isExist?: boolean }) => void;
  fail: () => void;
}
interface DouyinSettingsApi {
  checkScene?(options: SidebarOptions): void;
  navigateToScene?(options: SidebarOptions): void;
}
declare const tt: DouyinSettingsApi | undefined;

export function isDouyinSettingsRuntime(): boolean {
  return typeof tt !== "undefined" && tt !== null;
}

export function hasDouyinSidebarApi(): boolean {
  return isDouyinSettingsRuntime()
    && typeof tt?.checkScene === "function"
    && typeof tt?.navigateToScene === "function";
}

/** 小游戏2.92.0起提供该接口；仅明确返回isExist=true才展示跳转入口。 */
export function checkDouyinSidebar(success: (exists: boolean) => void, fail: () => void): void {
  if (typeof tt === "undefined" || !hasDouyinSidebarApi()) { fail(); return; }
  tt.checkScene!({
    scene: "sidebar",
    success: (result) => success(result?.isExist === true),
    fail,
  });
}

/** 只在玩家点击后调用；不注册复访奖励，也不读取玩家资料。 */
export function navigateDouyinSidebar(success: () => void, fail: () => void): void {
  if (typeof tt === "undefined" || !hasDouyinSidebarApi()) { fail(); return; }
  tt.navigateToScene!({ scene: "sidebar", success, fail });
}
