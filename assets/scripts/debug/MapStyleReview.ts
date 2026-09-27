import { DEBUG } from "cc/env";
import { director, Director, sys } from "cc";
import type { MapSkin } from "../gameplay/battle/BattleMapSkin";

export interface MapStyleReviewConfig { skin: MapSkin; levelId: number; stage: "empty" | "battle"; }

/** 仅本机Web调试版接受白名单参数，正式小游戏不读取URL，更不修改正式玩家存档。 */
export function readMapStyleReview(): MapStyleReviewConfig | null {
  if (!DEBUG || !sys.isBrowser || typeof window === "undefined") return null;
  if (!["127.0.0.1", "localhost"].includes(window.location.hostname)) return null;
  const params = new URLSearchParams(window.location.search);
  const skin = params.get("mapReview");
  if (skin !== "classic" && skin !== "meadow" && skin !== "courtyard" && skin !== "storybook") return null;
  const value = Number(params.get("level") ?? 7);
  const levelId = Number.isInteger(value) && value >= 1 && value <= 10 ? value : 7;
  return { skin, levelId, stage: params.get("stage") === "empty" ? "empty" : "battle" };
}

/** 在引擎完成本帧绘制后导出真实Canvas；不重绘、不拼贴UI，不把生成图当成运行截图。 */
export function installMapStyleCapture(config: MapStyleReviewConfig, isReady: () => boolean): () => void {
  if (!DEBUG || !sys.isBrowser || typeof window === "undefined") return () => {};
  let disposed = false;
  const reply = (payload: Record<string, unknown>): void => {
    if (!disposed) window.parent.postMessage({ type: "map-style-capture", skin: config.skin,
      levelId: config.levelId, stage: config.stage, ...payload }, window.location.origin);
  };
  const capture = (): void => {
    if (disposed) return;
    const canvas = document.getElementById("GameCanvas") as HTMLCanvasElement | null;
    if (!canvas || !isReady()) { reply({ error: "资源尚未就绪，请稍后再次保存。" }); return; }
    try {
      reply({ width: canvas.width, height: canvas.height, dataUrl: canvas.toDataURL("image/png"),
        renderer: "Cocos Creator 3.8.8 Web Mobile", fixture: "固定视觉布阵；非自然通关记录" });
    } catch { reply({ error: "引擎画布导出失败。" }); }
  };
  const listener = (event: MessageEvent): void => {
    if (event.origin !== window.location.origin || event.source !== window.parent) return;
    if (event.data?.type !== "capture-map-style") return;
    director.off(Director.EVENT_AFTER_DRAW, capture);
    director.once(Director.EVENT_AFTER_DRAW, capture);
  };
  window.addEventListener("message", listener);
  return () => { disposed = true; window.removeEventListener("message", listener); director.off(Director.EVENT_AFTER_DRAW, capture); };
}
