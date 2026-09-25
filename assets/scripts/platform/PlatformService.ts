import { game, Game, sys } from "cc";

declare const tt: any;

export interface RewardResult {
  rewarded: boolean;
  simulated?: boolean;
  reason?: unknown;
}

export class PlatformService {
  private static rewardAd: any = null;
  private static readonly isDouyin = typeof tt !== "undefined";

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
    if (!this.isDouyin) {
      return new Promise((resolve) => setTimeout(() => resolve({ rewarded: true, simulated: true }), 450));
    }
    if (!adUnitId || adUnitId.includes("replace-")) {
      return Promise.resolve({ rewarded: false, reason: "missing-ad-unit" });
    }
    if (!this.rewardAd) this.rewardAd = tt.createRewardedVideoAd({ adUnitId });

    return new Promise((resolve) => {
      let settled = false;
      const finish = (result: RewardResult): void => {
        if (settled) return;
        settled = true;
        this.rewardAd.offClose(onClose);
        this.rewardAd.offError(onError);
        resolve(result);
      };
      const onClose = (result?: { isEnded?: boolean }): void => finish({ rewarded: !result || result.isEnded === true });
      const onError = (error: unknown): void => finish({ rewarded: false, reason: error });
      this.rewardAd.onClose(onClose);
      this.rewardAd.onError(onError);
      this.rewardAd.show().catch(() => this.rewardAd.load().then(() => this.rewardAd.show()).catch(onError));
    });
  }
}
