/** 地图评审仅切换二维表现；默认 classic 沿用已验收版本，不影响玩法数据。 */
export type MapSkin = "classic" | "meadow" | "courtyard" | "storybook";

export const MAP_SKINS: readonly MapSkin[] = ["classic", "meadow", "courtyard", "storybook"];
export const MAP_SKIN_LABELS: Readonly<Record<MapSkin, string>> = {
  classic: "当前版本",
  meadow: "林间草地",
  courtyard: "便利店庭院",
  storybook: "柔和绘本",
};

/** 调试参数也必须校验，未知值不能令正式地图走进不存在的配色分支。 */
export function isMapSkin(value: unknown): value is MapSkin {
  return typeof value === "string" && (MAP_SKINS as readonly string[]).includes(value);
}
