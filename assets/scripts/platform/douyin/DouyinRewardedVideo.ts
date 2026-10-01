export interface DouyinRewardResult {
  rewarded: boolean;
  reason?: unknown;
}

interface AdCloseResult { isEnded?: boolean; count?: number; }
interface RewardedVideoAd {
  load(): Promise<void>;
  show(): Promise<void>;
  onClose(callback: (result?: AdCloseResult) => void): void;
  offClose(callback: (result?: AdCloseResult) => void): void;
  onError(callback: (error: unknown) => void): void;
  offError(callback: (error: unknown) => void): void;
}
interface DouyinApi { createRewardedVideoAd(options: { adUnitId: string }): RewardedVideoAd; }
declare const tt: DouyinApi | undefined;

let rewardAd: RewardedVideoAd | null = null;
let activeAdUnitId = "";
let requesting = false;

export function isDouyinRuntime(): boolean { return typeof tt !== "undefined"; }

export function showDouyinRewardedVideo(adUnitId: string): Promise<DouyinRewardResult> {
  if (!isDouyinRuntime()) return Promise.resolve({ rewarded: false, reason: "unsupported-runtime" });
  // 换局后旧广告可能仍在播放，不能让两个请求共享同一条关闭回调并同时领奖。
  if (requesting) return Promise.resolve({ rewarded: false, reason: "ad-busy" });
  try {
    if (!rewardAd || activeAdUnitId !== adUnitId) {
      rewardAd = tt!.createRewardedVideoAd({ adUnitId }); activeAdUnitId = adUnitId;
    }
  } catch (error) { return Promise.resolve({ rewarded: false, reason: error }); }
  const ad = rewardAd;
  requesting = true;
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result: DouyinRewardResult): void => {
      if (settled) return;
      settled = true; requesting = false;
      // 注销监听失败也必须结束等待；丢弃该实例，旧监听由 settled 阻止重复结算。
      try { ad.offClose(onClose); } catch { rewardAd = null; }
      try { ad.offError(onError); } catch { rewardAd = null; }
      resolve(result);
    };
    const onClose = (result?: AdCloseResult): void => {
      // 按平台协议优先读取完整观看次数；缺字段或空回调不能作为观看完成的证据。
      const rewarded = result?.count !== undefined
        ? Number.isInteger(result.count) && result.count > 0
        : result?.isEnded === true;
      finish({ rewarded });
    };
    const onError = (error: unknown): void => finish({ rewarded: false, reason: error });
    try {
      ad.onClose(onClose); ad.onError(onError);
      if (settled) return;
      ad.show().catch((error) => {
        if (settled) return;
        // 仅对尚未被 error/close 回调终结的加载失败重试一次。
        try { ad.load().then(() => { if (!settled) return ad.show(); }).catch(onError); }
        catch (loadError) { onError(loadError); }
      });
    } catch (error) { onError(error); }
  });
}