# 三类敌人正式源图与运行导出记录

## 生成范围

- 日期：2026-09-27。
- 工具：Codex 内置图像生成，三类敌人分别独立调用；未使用外部 API 或 CLI。
- 已认可风格：简洁 Q 萌、2D 轻俯视、深色轮廓、奶油贴纸外边，与店员和现有地图公共件一致。
- 当前形象映射：`normal`为小纸袋怪，`swift`为红汽水罐，`tank`为快递纸箱怪；本轮不改生命、速度、伤害、半径等配置。
- 本目录的PNG为保留的生成源文件。工具默认C盘生成副本已复制到本目录，游戏仅消费G盘图集；未擅自删除工具原始输出。
- 旧世界观文档中的果冻/汽水泡泡映射属于较早设定，本轮以本映射及用户参考图为准，由主任务同步产品文档。

## 资源清单

| 类型 | 源文件 | 源图尺寸 | 实际主体设计尺寸 |
| --- | --- | --- | --- |
| 普通 | `spr_enemy_paper_bag_v1.png` | 1145×1374 | 约41.14×52 |
| 疾行 | `spr_enemy_soda_can_v1.png` | 1206×1305 | 约35.43×48 |
| 重型 | `spr_enemy_parcel_box_v1.png` | 1375×1144 | 约86.86×68 |

主体尺寸包括轮廓和烘焙小阴影；形状和高宽比保持等比，重型最大宽度仍小于当前约92～96设计像素道路。轻微步态不改变碰撞判定。

## 机械生产与图集

- 工具：`G:\gptwork\export-enemy-art.cjs`，使用 Node.js 与已有 sharp，辅助工具不进入项目Git。
- 工序：按Alpha主体连通性清理孤立碎点，裁切无效透明留白，等比缩放，不重新绘制造型。
- 运行图片：`assets/art/gameplay/enemies/atlas_enemies.png`，512×512、71899字节（约70.2KiB）。
- 图集属于现有本地 `battle_art` Bundle；运行加载路径为 `gameplay/enemies/atlas_enemies/texture`。
- 每帧168×168像素，显示画布96×96设计像素。脚底在第88设计像素，沿用 `(0.5, 8/96)` 锚点。
- 三列两行，帧左上位置为第一行 `(4,4)`、`(172,4)`、`(340,4)`；第二行对应Y=172。
- 第一行为普通、疾行、重型常态；第二行为对应的暖白命中态。各帧主体边缘保留透明像素，避免采样到邻帧。
- 暖白命中态由常态Alpha逐像素生成，RGB固定为 `(255,247,221)`，不改变外轮廓、透明度或脚底；用于短时间受击闪白，不是新角色变体。
- 图集meta设置 `flipVertical=false`，代码使用与源图一致的左上原点切片；禁止翻转整幅图集。
- 源图SHA-256、完整裁边尺寸、碎点数量与帧坐标见 [导出清单](./runtime_export_manifest.json)。

## 运行表现

- `BattleArtView.drawEnemy(key, state)` 使用已有节点池和单位层，按脚底Y排序。
- 通过行进距离（若提供）或战斗年龄实现轻微左右摆动、跳步与压缩，不随路径方向把整个怪物旋转。
- 受击切换到对应暖白帧；血条、减速圈由调用方上层图形负责，避免烘焙到图片。
- 一张图集加载失败时沿用既有程序绘制降级路径。正式体验应检查实际贴图成功加载，不能把降级球形外观误认为新美术。

## 验证记录与边界

- 已查看三张新源图、512图集及 `G:\gptwork\enemy-runtime-size-preview.png` 实际设计尺寸检查图；三种轮廓和明暗层级清楚。
- 严格 TypeScript 检查通过。
- 游戏内出生位置、血条、密集波次、攻击闪白、完整Web/抖音构建结果由主任务集成记录补充；本文件不将源图验收冒充整局或真机通过。
- 本轮未生产逐帧行走、死亡动画；现有轻量程序步态与离场反馈继续使用。

## 最终提示词原文

### 普通小纸袋怪

```text
Use case: stylized-concept. Asset type: one production-ready transparent 2D enemy sprite for a cute forest convenience-store tower-defense mobile game. Style: simple chibi sticker game unit, gentle top-down 3/4 camera, thick clean dark warm-brown outline, thin cream outer sticker edge, large flat color blocks with one soft shadow, warm upper-left light. No fine texture, no lettering, no UI, no background, no scenery, no pedestal, no detached effects or floating decorative specks. Genuine transparent alpha background. Full body centered with generous transparent padding; feet connect visibly to the body; small muted ground shadow. Friendly mischievous enemy, never scary or grotesque. Subject: a small walking kraft-paper grocery bag creature, narrow upright tan-brown paper bag with a simple folded top and slightly scalloped bottom, two large black oval eyes and a tiny curious mouth, tiny dark feet, two very short arms attached to its sides. Body mostly plain warm kraft tan with one darker side panel. Silhouette must read as a paper bag, not a box and not a jelly blob. Front facing slightly to the right. Only 3 main colors. Designed to remain readable at 52 design pixels high. Do not include handles, hat, clothing, label or contents.
```

### 疾行红汽水罐

```text
Use case: stylized-concept. Asset type: one production-ready transparent 2D enemy sprite for a cute forest convenience-store tower-defense mobile game. Style: simple chibi sticker game unit, gentle top-down 3/4 camera, thick clean dark warm-brown outline, thin cream outer sticker edge, large flat color blocks with one soft shadow, warm upper-left light. No fine texture, no lettering, no UI, no background, no scenery, no pedestal, no detached effects or floating decorative specks. Genuine transparent alpha background. Full body centered with generous transparent padding; feet connect visibly to the body; small muted ground shadow. Friendly mischievous enemy, never scary or grotesque. Subject: a slim lively bright-red soda can creature with a silver top, large visible pull tab, one simple white lightning-shaped color patch on the red cylinder, two expressive black eyes, playful determined smile, tiny attached arms and short running legs, one foot slightly forward. No readable brand, no commercial logo, no text. Front facing slightly to the right, compact upright silhouette. Four main colors: red, cream, charcoal, silver. Designed to remain readable at 48 design pixels high, slimmer than the paper bag and much smaller than a box monster. No speed lines, bubbles, splash or smoke.
```

### 重型快递纸箱怪

```text
Use case: stylized-concept. Asset type: one production-ready transparent 2D enemy sprite for a cute forest convenience-store tower-defense mobile game. Style: simple chibi sticker game unit, gentle top-down 3/4 camera, thick clean dark warm-brown outline, thin cream outer sticker edge, large flat color blocks with one soft shadow, warm upper-left light. No fine texture, no lettering, no UI, no background, no scenery, no pedestal, no detached effects or floating decorative specks. Genuine transparent alpha background. Full body centered with generous transparent padding; feet connect visibly to the body; small muted ground shadow. Friendly mischievous enemy, never scary or grotesque. Subject: a squat sturdy walking cardboard delivery parcel box creature. Broad near-square warm tan kraft box, a narrow tan packing tape strip over its top seam, visible simple top and right side, cute determined thick eyebrows above two black oval eyes, small grumpy curved mouth, tiny attached side arms and sturdy short dark feet. Broad square silhouette unmistakably different from a narrow paper bag or cylindrical soda can. No shipping label, no stamps, no text, no symbols, no cargo, no horns. Only 3 main colors. Front facing slightly to the right. Designed to be a heavy slow enemy at 68 design pixels high, broader but still compact.
```
