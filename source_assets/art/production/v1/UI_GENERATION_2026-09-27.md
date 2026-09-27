# 2026-09-27 战斗道具UI图标生产记录

## 交付范围

- 生成方式：Codex内置图像生成，每个图标单独生成；未使用CLI/API备用模式。
- 风格：简洁Q萌贴纸、深褐轮廓、奶油细边、少量大色块；无文字、按钮底板或背景。
- 只补冷气喷罐、清场扫帚、零钱硬币三个道具图标；本任务不改广告逻辑。
- 三张源图均保留真实透明Alpha，生成结果的透明蒙版作为准入依据；运行导出仅机械裁边、去独立碎点与等比缩小，不重绘造型。

## 源文件

| 帧名 | 源文件 | 原始尺寸 | 运行主体尺寸（设计像素） |
| --- | --- | --- | --- |
| freeze | `ui_icons/spr_ui_freeze_v1.png` | 1254×1254 | 39×64 |
| clear | `ui_icons/spr_ui_clear_v1.png` | 1230×1278 | 48×64 |
| cash | `ui_icons/spr_ui_cash_v1.png` | 1536×1024 | 64×43 |

尺寸和SHA-256记录见`ui_icons/runtime_ui_export_manifest.json`。源文件在`source_assets/`，不需要Cocos `.meta`。

## 运行图集与接入约定

- 文件：`assets/art/ui/icons/atlas_battle_ui.png`，512×512，PNG为67463字节，约65.9 KiB。
- 继承现有`assets/art/`的`battle_art`资源包；纹理加载路径`ui/icons/atlas_battle_ui/texture`。
- 3个帧均为192×192纹理像素，对应96×96设计画布的两倍采样；主体最大边64设计像素，居中后四边至少16设计像素透明区，满足至少8像素留边。
- 所有帧坐标使用PNG左上原点；`flipVertical=false`，不能再次上下翻转。

| 帧名 | x | y | 宽 | 高 |
| --- | ---: | ---: | ---: | ---: |
| freeze | 8 | 8 | 192 | 192 |
| clear | 216 | 8 | 192 | 192 |
| cash | 8 | 216 | 192 | 192 |

`assets/art/ui.meta`、`assets/art/ui/icons.meta`及图集 `.meta`须与资源成对提交。图标仅是视觉层，交互热区由UI代码独立管理，不能将透明主体边界直接当成按钮热区。

## 检查记录

- 已检查三张源图真实透明通道、裁剪范围及导出图集。
- 已查看96设计画布、64设计主体的绿色底小尺寸预览，三类轮廓可以区分；图集中无按钮底板、文字或图标外光晕。
- 机械导出工具仅保存在`G:\gptwork\export-battle-ui.cjs`，预览位于`G:\gptwork\ui-runtime-size-preview.png`。
- 本记录不宣称UI代码已绑定、浏览器动态验收或抖音真机通过；接入由主任务完成。

## 最终提示词原文

以下为实际传入内置图像生成的完整提示词，保留原文便于追溯。

### freeze

```text
Use case: stylized-concept. Asset type: production raster UI icon for an original cozy forest convenience-store tower-defense game, designed to read clearly at 64 design pixels. Create exactly one compact centered object on a genuinely transparent RGBA background, not a checkerboard image. Simple cute chibi sticker illustration: thick smooth dark cocoa-brown outline, very thin cream sticker rim hugging the silhouette, large rounded shapes, four flat colors, only one simple shadow shape, no texture or gradients. The whole object must be visible with wide transparent space all around. Slight 3/4 view. No text, numerals, typography, logo, watermark, button, card, border panel, floor, scene, scenery, cast shadow outside the silhouette, extra decorative specks, sparkle particles or disconnected tiny details. Clean production sprite, strong silhouette. Subject: one squat rounded cyan-blue cold-air spray can with a friendly rounded nozzle and one large simple cream snowflake symbol centered on the can. Use cyan, deep blue, cream and cocoa brown. The can itself communicates freezing; do not draw loose spray or cloud. Cute chunky proportions, large single symbol.
```

### clear

```text
Use case: stylized-concept. Asset type: production raster UI icon for an original cozy forest convenience-store tower-defense game, designed to read clearly at 64 design pixels. Create exactly one compact centered object on a genuinely transparent RGBA background, not a checkerboard image. Simple cute chibi sticker illustration: thick smooth dark cocoa-brown outline, very thin cream sticker rim hugging the silhouette, large rounded shapes, four flat colors, only one simple shadow shape, no texture or gradients. The whole object must be visible with wide transparent space all around. Slight 3/4 view. No text, numerals, typography, logo, watermark, button, card, border panel, floor, scene, scenery, cast shadow outside the silhouette, extra decorative specks, sparkle particles or disconnected tiny details. Clean production sprite, strong silhouette. Subject: one cute chunky cleaning broom tilted diagonally, with a short thick rounded orange handle and broad cream bristles held by an orange collar. Bristles are one simple soft fan shape with just two short internal lines. Use orange, warm ochre, cream and cocoa brown. Show the broom alone, no dust cloud, no motion lines, no loose objects. Rounded toy-like proportions.
```

### cash

```text
Use case: stylized-concept. Asset type: production raster UI icon for an original cozy forest convenience-store tower-defense game, designed to read clearly at 64 design pixels. Create exactly one compact centered object on a genuinely transparent RGBA background, not a checkerboard image. Simple cute chibi sticker illustration: thick smooth dark cocoa-brown outline, very thin cream sticker rim hugging the silhouette, large rounded shapes, four flat colors, only one simple shadow shape, no texture or gradients. The whole object must be visible with wide transparent space all around. Slight 3/4 view. No text, numerals, typography, logo, watermark, button, card, border panel, floor, scene, scenery, cast shadow outside the silhouette, extra decorative specks, sparkle particles or disconnected tiny details. Clean production sprite, strong silhouette. Subject: one compact cluster of exactly three chunky golden coins, two in a tiny low stack and the third leaning upright against them, all visibly touching as one silhouette. The upright coin has one simple shallow embossed paw-pad symbol, no currency text or numbers. Use warm gold, amber, cream and cocoa brown. Broad smooth bevels represented by flat shapes; no scattered coins, no sparkle, no realistic metal reflections.
```
