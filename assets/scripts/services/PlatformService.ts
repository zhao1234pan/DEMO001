import { game, Game, sys } from "cc";
import { isDouyinRuntime, showDouyinRewardedVideo } from "../platform/douyin/DouyinRewardedVideo";

export interface RewardResult { rewarded: boolean; simulated?: boolean; reason?: unknown; }

export class PlatformService {
  static onHide(callback: () => void): void {
    game.on(Game.EVENT_HIDE, callback);
  }

  static offHide(callback: () => void): void {
    game.off(Game.EVENT_HIDE, callback);
  }

  static getNumber(key: string, fallback: number): number {
    const raw = sys.localStorage.getItem(key);
    const value = raw === null ? Number.NaN : Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  static setNumber(key: string, value: number): void {
    sys.localStorage.setItem(key, String(value));
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
