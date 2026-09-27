# 地图评审灌木素材生成记录

- 日期：2026-09-27；用途：独立评审分支的林间草地（meadow）、便利店庭院（courtyard）、柔和绘本（storybook）三套真实关卡皮肤。不替换main已验收资源。
- 使用imagegen技能的内置image_gen模式；每种素材独立调用一次，共三次。不是整屏效果图，未使用CLI/API回退，未进行创意二次编辑。
- 输入图仅作风格与轮廓参考，生成前已逐张查看，不是编辑目标：
  - ../v2_scene/spr_scene_foliage_cluster_v1.png
  - ../v1/characters/staff_lv1/spr_staff_doubao_idle_v3_runtime.png
- 原图保持工具输出，复制到本目录；G盘是项目依赖位置，工具默认副本不作为运行依赖。
- 三种均为无白色贴纸边的低对比三团灌木。meadow偏暖黄绿，courtyard偏浅鼠尾草绿，storybook偏深浅苔绿；主要区别是色面和轮廓节奏，不把三张灌木本身当成三套完整地图风格。
- 仅作非交互环境，禁止花盆、障碍标记、人物与文字。真实Cocos截图及手机融合感由主任务验收，本文不提前宣称通过。

## 运行合同与机械导出

- 图集：assets/art/gameplay/maps/atlas_map_review_foliage.png，512×512，沿用battle_art Bundle，flipVertical=false。
- 三个128×128单元横排，meadow为[0,0,128,128]，courtyard为[128,0,128,128]，storybook为[256,0,128,128]。
- 完整运行画布固定48×40逻辑像素、居中锚点，与原环境灌木占位相同。主体等比适配约40×24逻辑目标盒，纹理取整误差不超过1像素，不扩大装饰碰撞筛选范围。
- 注意方形切片显示为非方形画布：导出已经按48×40画布反算纹理采样比例，运行不可改成48×48，否则改变主体比例。
- 机械工具：G:/gptwork/export-map-review-foliage.cjs。仅清游离Alpha像素、裁透明边、缩放、打包；不绘制或重构形象。每边至少8纹理像素透明留白。
- 原图尺寸/字节/SHA-256、裁边范围、主体尺寸、切片及图集SHA-256均见runtime_export_manifest.json。
- 缩小验收：G:/gptwork/map-review-foliage-size-preview.png；从左到右为meadow/courtyard/storybook，上中下为逻辑尺寸/750设计尺寸/放大检查，不是实机关卡截图。
- 图集实际为34928字节（约34.1KiB），SHA-256为3c5063809c8b4dd2623fe5d4ada00da9d90c4c93824fcd3df8a7f5c78359ddd5；这只是PNG体积，不代表发布包或纹理内存。
- 原图尺寸依次为1619×972、1635×962、1643×957；源图保留真实Alpha，完全透明像素比例依次约70.10%、68.00%、65.75%。机械导出分别清理415、641、377个游离像素，原文件保持原样。
- 导出主体逻辑尺寸依次约40.125×19.0625、40.125×18.125、40.125×19.0625；每边最少10纹理像素透明留白。
- 已逐张查看源图、运行图集和缩小预览：三团连通轮廓、无白边、无花盆或交互标记，低对比色面在小尺寸下可辨；只是环境模块检查，尚不代表完整地图融合感或真机通过。

## 原始输出与最终完整提示词

### spr_map_review_foliage_meadow_v1.png

原始工具文件：C:/Users/49837/.codex/generated_images/01a0e0d3-5f49-7ad0-b310-c178eddd9c84/exec-8fe3d4d1-f1a4-4c3a-92e9-1e1dd6ccaa8f.png。

```text
Use case: stylized-concept
Asset type: one original transparent 2D mobile tower-defense background foliage sprite, not a full map or screenshot.
Input images: Image 1 is a foliage shape reference only. Image 2 is a cute character style reference only; do not draw the character or copy its sticker border.
Primary request: a single connected cluster of three low plump rounded bushes, readable as a small environmental decoration, not a tappable obstacle. Big rounded leaf masses, front with a little top visible, light 3/4 overhead view.
Composition/framing: one compact connected low-wide silhouette with width about 1.7 times its height, centered, entire silhouette visible, generous transparent margin. At runtime the whole bush body is only about 40 by 24 logical pixels. Keep the silhouette simple and readable at that size.
Lighting/mood: gentle light from upper left, a single subtle lower-right shadow region. Calm background values, no glossy reflections.
Constraints: genuinely transparent alpha background, no checkerboard, no background color or scene, no ground patch, no border frame, NO white or cream sticker outline. A slim muted dark-green outline only, much quieter than the character outline. No trunk, branches, pot, planter, flowers, berries, rocks, characters, faces, text, symbols, logo, or watermark. No small leaf marks, no grain, noise, brush texture, stippling, sparkles, or detached floating details.
Style/medium: simple cute Q-style matte 2D illustration with smooth warm yellow-green flat color blocks, a softly uneven but clean natural cloud-shaped contour. Three modestly overlapping rounded shrubs with only two simple interior separations.
Color palette: warm muted meadow green and yellow-green, restrained olive-green shadow and dark olive-green contour. Keep all greens soft and low contrast, no neon and no turquoise. The bushes should blend with a light grassy field while the orange-and-cream characters remain more important.
```

### spr_map_review_foliage_courtyard_v1.png

原始工具文件：C:/Users/49837/.codex/generated_images/01a0e0d3-5f49-7ad0-b310-c178eddd9c84/exec-a947ea43-575b-496e-80b7-18d6d4f2eef6.png。

```text
Use case: stylized-concept
Asset type: one original transparent 2D mobile tower-defense background foliage sprite, not a full map or screenshot.
Input images: Image 1 is a foliage shape reference only. Image 2 is a cute character style reference only; do not draw the character or copy its sticker border.
Primary request: a single connected cluster of three low plump rounded bushes, readable as a small environmental decoration, not a tappable obstacle. Big rounded leaf masses, front with a little top visible, light 3/4 overhead view.
Composition/framing: one compact connected low-wide silhouette with width about 1.7 times its height, centered, entire silhouette visible, generous transparent margin. At runtime the whole bush body is only about 40 by 24 logical pixels. Keep the silhouette simple and readable at that size.
Lighting/mood: gentle light from upper left, a single subtle lower-right shadow region. Calm background values, no glossy reflections.
Constraints: genuinely transparent alpha background, no checkerboard, no background color or scene, no ground patch, no border frame, NO white or cream sticker outline. A slim muted dark-green outline only, much quieter than the character outline. No trunk, branches, pot, planter, flowers, berries, rocks, characters, faces, text, symbols, logo, or watermark. No small leaf marks, no grain, noise, brush texture, stippling, sparkles, or detached floating details.
Style/medium: simple cute Q-style matte 2D illustration. Three tidily clipped round domes forming one low connected garden hedge, with a neat gently flattened bottom and clean curved outline. Not topiary shapes, not a pot, not individual small leaves.
Color palette: light muted sage/apple green, medium sage-green shadow, muted dark green contour. Calm pale-green garden foliage suited to a convenience-store paved courtyard. Only three main green color areas; smooth flat shapes and a very restrained simple soft shade.
```

### spr_map_review_foliage_storybook_v1.png

原始工具文件：C:/Users/49837/.codex/generated_images/01a0e0d3-5f49-7ad0-b310-c178eddd9c84/exec-e49f66ca-59c2-4c37-9a96-b3e0088fde2b.png。

```text
Use case: stylized-concept
Asset type: one original transparent 2D mobile tower-defense background foliage sprite, not a full map or screenshot.
Input images: Image 1 is a foliage shape reference only. Image 2 is a cute character style reference only; do not draw the character or copy its sticker border.
Primary request: a single connected cluster of three low plump rounded bushes, readable as a small environmental decoration, not a tappable obstacle. Big rounded leaf masses, front with a little top visible, light 3/4 overhead view.
Composition/framing: one compact connected low-wide silhouette with width about 1.7 times its height, centered, entire silhouette visible, generous transparent margin. At runtime the whole bush body is only about 40 by 24 logical pixels. Keep the silhouette simple and readable at that size.
Lighting/mood: gentle light from upper left, a single subtle lower-right shadow region. Calm background values, no glossy reflections.
Constraints: genuinely transparent alpha background, no checkerboard, no background color or scene, no ground patch, no border frame, NO white or cream sticker outline. A slim muted dark-green outline only, much quieter than the character outline. No trunk, branches, pot, planter, flowers, berries, rocks, characters, faces, text, symbols, logo, or watermark. No small leaf marks, no grain, noise, brush texture, stippling, sparkles, or detached floating details.
Style/medium: simple cute Q-style soft storybook 2D illustration, broad flat cut-paper silhouettes. Three overlapping softly irregular rounded bushes; quiet moss-green layers and at most two interior curved separations. Matte paper-cut appearance expressed by color shapes only, absolutely no paper grain or leaf texture.
Color palette: muted medium moss green, lighter moss-green upper-left plane, darker desaturated moss green lower-right plane, slim soft dark-green contour. Gentle earthy moss greens, lower contrast than the character; no teal, no black outline, no bright highlights.
```
