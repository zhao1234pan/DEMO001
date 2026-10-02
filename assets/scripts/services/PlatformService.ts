import { game, Game, sys } from "cc";
import { isDouyinRuntime, showDouyinRewardedVideo } from "../platform/douyin/DouyinRewardedVideo";
import { getDouyinTopOverlayRatio } from "../platform/douyin/DouyinLayout";
import { isDouyinSettingsRuntime } from "../platform/douyin/DouyinSettings";
import { getWechatTopOverlayRatio } from "../platform/wechat/WechatSettings";

export interface RewardResult { rewarded: boolean; simulated?: boolean; reason?: unknown; }

export class PlatformService {
  private static readonly lastNumbers = new Map<string, number>();
  private static readonly pendingNumbers = new Map<string, number>();
  private static readonly pendingMaximumBounds = new Map<string, number>();

  /** 布局只消费设计坐标，不让战斗层直接依赖平台SDK。与广告服务无关。 */
  static getTopOverlayInset(designWidth: number): number {
    const ratio = isDouyinSettingsRuntime() ? getDouyinTopOverlayRatio() : getWechatTopOverlayRatio();
    return ratio * designWidth;
  }

  static onHide(callback: () => void): void {
    game.on(Game.EVENT_HIDE, callback);
  }

  static offHide(callback: () => void): void {
    game.off(Game.EVENT_HIDE, callback);
  }

  static onShow(callback: () => void): void {
    game.on(Game.EVENT_SHOW, callback);
  }

  static offShow(callback: () => void): void {
    game.off(Game.EVENT_SHOW, callback);
  }

  static getNumber(key: string, fallback: number): number {
    // 写入失败后优先保留本次会话的新值，避免旧存档让解锁进度倒退。
    const pending = this.pendingNumbers.get(key);
    if (pending !== undefined) {
      const upperBound = this.pendingMaximumBounds.get(key);
      if (upperBound !== undefined) this.setMaximumInteger(key, pending, upperBound);
      return this.lastNumbers.get(key) ?? pending;
    }
    try {
      const value = this.readStoredNumber(key);
      if (value !== undefined) {
        this.lastNumbers.set(key, value);
        return value;
      }
      this.lastNumbers.delete(key);
      return fallback;
    } catch {
      return this.lastNumbers.get(key) ?? fallback;
    }
  }

  static setNumber(key: string, value: number): void {
    if (!Number.isFinite(value)) return;
    this.pendingMaximumBounds.delete(key);
    this.lastNumbers.set(key, value);
    this.pendingNumbers.set(key, value);
    try {
      sys.localStorage.setItem(key, String(value));
      this.pendingNumbers.delete(key);
    } catch {
      // 存储不可用时只保留会话进度，不中断结算，也不声称已经持久保存。
    }
  }

  static setMaximumInteger(key: string, value: number, upperBound: number): void {
    if (!Number.isFinite(value) || !Number.isFinite(upperBound) || upperBound < 0) return;
    const limit = Math.floor(upperBound);
    const normalize = (candidate: number): number => Math.max(0, Math.min(limit, Math.floor(candidate)));
    // 最高关卡只接纳有效整数；历史小数、越界值不能重新混入规范化后的进度。
    const replacing = this.pendingNumbers.has(key) && !this.pendingMaximumBounds.has(key);
    let maximum = normalize(value);
    for (const cached of [this.lastNumbers.get(key), this.pendingNumbers.get(key)]) {
      if (cached !== undefined && Number.isFinite(cached)) maximum = Math.max(maximum, normalize(cached));
    }
    this.lastNumbers.set(key, maximum);
    this.pendingNumbers.set(key, maximum);
    if (!replacing) this.pendingMaximumBounds.set(key, limit);
    try {
      // 必须先读出旧值再写入；读取失败时旧进度未知，只保留会话值，防止覆盖更高关卡。
      const stored = replacing ? undefined : this.readStoredNumber(key);
      if (stored !== undefined) maximum = Math.max(maximum, normalize(stored));
      this.lastNumbers.set(key, maximum);
      this.pendingNumbers.set(key, maximum);
      sys.localStorage.setItem(key, String(maximum));
      this.pendingNumbers.delete(key);
      this.pendingMaximumBounds.delete(key);
    } catch {
      // 下次读取会重试合并；恢复存储后同时保住旧档与本会话的新最高进度。
    }
  }

  private static readStoredNumber(key: string): number | undefined {
    const raw = sys.localStorage.getItem(key);
    const value = raw === null || raw.trim() === "" ? Number.NaN : Number(raw);
    return Number.isFinite(value) ? value : undefined;
  }

  /** Must only be called after an explicit player tap. */
  static showRewardedVideo(adUnitId: string): Promise<RewardResult> {
    if (!isDouyinRuntime()) {
      return new Promise((resolve) => setTimeout(() => resolve({ rewarded: true, simulated: true }), 450));
    }
    if (!adUnitId || adUnitId.includes("replace-")) {
      return Promise.resolve({ rewarded: false, reason: "missing-ad-unit" });
    }
    return showDouyinRewardedVideo(adUnitId);
  }
}
