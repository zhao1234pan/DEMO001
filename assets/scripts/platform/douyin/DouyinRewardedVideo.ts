export interface DouyinRewardResult {
  rewarded: boolean;
  reason?: unknown;
}

interface RewardedVideoAd {
  load(): Promise<void>;
  show(): Promise<void>;
  onClose(callback: (result?: { isEnded?: boolean }) => void): void;
  offClose(callback: (result?: { isEnded?: boolean }) => void): void;
  onError(callback: (error: unknown) => void): void;
  offError(callback: (error: unknown) => void): void;
}

interface DouyinApi {
  createRewardedVideoAd(options: { adUnitId: string }): RewardedVideoAd;
}

declare const tt: DouyinApi | undefined;

let rewardAd: RewardedVideoAd | null = null;
let activeAdUnitId = "";

export function isDouyinRuntime(): boolean {
  return typeof tt !== "undefined";
}

export function showDouyinRewardedVideo(adUnitId: string): Promise<DouyinRewardResult> {
  if (!isDouyinRuntime()) return Promise.resolve({ rewarded: false, reason: "unsupported-runtime" });
  if (!rewardAd || activeAdUnitId !== adUnitId) {
    rewardAd = tt!.createRewardedVideoAd({ adUnitId });
    activeAdUnitId = adUnitId;
  }

  const ad = rewardAd;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: DouyinRewardResult): void => {
      if (settled) return;
      settled = true;
      ad.offClose(onClose);
      ad.offError(onError);
      resolve(result);
    };
    const onClose = (result?: { isEnded?: boolean }): void => finish({ rewarded: !result || result.isEnded === true });
    const onError = (error: unknown): void => finish({ rewarded: false, reason: error });
    ad.onClose(onClose);
    ad.onError(onError);
    ad.show().catch(() => ad.load().then(() => ad.show()).catch(onError));
  });
}
