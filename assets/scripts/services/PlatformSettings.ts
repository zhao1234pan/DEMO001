import { text } from "../config/ConfigTables";
import {
  checkDouyinSidebar, hasDouyinSidebarApi, isDouyinSettingsRuntime, navigateDouyinSidebar,
} from "../platform/douyin/DouyinSettings";
import { isWechatSettingsRuntime } from "../platform/wechat/WechatSettings";

export interface PlatformSettingsCapabilities {
  runtime: "wechat" | "douyin" | "web";
  sidebar: boolean;
}
export interface PlatformActionResult { ok: boolean; message: string; }

const CALLBACK_TIMEOUT_MS = 8000;

/** 仅提供平台要求的侧边栏入口；不创建可选账号或政策功能。 */
export class PlatformSettings {
  private sidebarAvailable = false;
  private refreshRevision = 0;

  get capabilities(): Readonly<PlatformSettingsCapabilities> {
    const runtime = isDouyinSettingsRuntime() ? "douyin"
      : isWechatSettingsRuntime() ? "wechat" : "web";
    return {
      runtime,
      sidebar: runtime === "douyin" && this.sidebarAvailable && hasDouyinSidebarApi(),
    };
  }

  async refresh(): Promise<void> {
    const revision = ++this.refreshRevision;
    this.sidebarAvailable = false;
    if (this.capabilities.runtime !== "douyin" || !hasDouyinSidebarApi()) return;
    const available = await this.withCallback<boolean>((finish) => {
      checkDouyinSidebar(finish, () => finish(false));
    }, false);
    // 多次刷新时只接纳最后一次探测，过期回调不能重新显示已不可用的入口。
    if (revision === this.refreshRevision) this.sidebarAvailable = available;
  }

  openSidebar(): Promise<PlatformActionResult> {
    // 探测在展示入口前完成，此处同步发起跳转，保留本次点击的用户手势。
    if (!this.capabilities.sidebar) {
      return Promise.resolve({ ok: false, message: text("ui.PlatformSettings.0") });
    }
    const unavailable = { ok: false, message: text("ui.PlatformSettings.1") };
    return this.withCallback<PlatformActionResult>((finish) => {
      navigateDouyinSidebar(
        () => finish({ ok: true, message: text("ui.PlatformSettings.2") }),
        () => finish(unavailable),
      );
    }, unavailable);
  }

  private withCallback<T>(run: (finish: (value: T) => void) => void, fallback: T): Promise<T> {
    return new Promise<T>((resolve) => {
      let settled = false;
      const finish = (value: T): void => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };
      // 旧宿主可能既不成功也不失败；设置操作必须最终结束，晚到/重复回调只结算一次。
      const timer = setTimeout(() => finish(fallback), CALLBACK_TIMEOUT_MS);
      try { run(finish); } catch { finish(fallback); }
    });
  }
}
