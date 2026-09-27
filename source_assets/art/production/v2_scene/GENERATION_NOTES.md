# 第二批场景素材生成与导出记录

- 日期：2026-09-27。
- 需求：沿用已经认可的简洁Q萌风格，补齐林间出怪入口、便利店终点、非交互低对比灌木；不重画角色、怪物，不改变关卡坐标。
- 生成方式：内置 `image_gen`，三种素材各独立调用一次；未使用CLI/API回退。生成后逐张检查，未进行创意二次编辑。
- 输入图角色：以下两图仅作风格参考，生成前均已用图片查看工具检查；不是需要修改的目标。
  - `../v1/map_parts/spr_obstacle_crate_v1.png`
  - `../v1/characters/staff_lv1/spr_staff_doubao_idle_v3_runtime.png`
- 原图按工具输出原样保留在本目录，真实Alpha；工具默认副本不属于项目依赖。

## 资源与运行尺寸

| 素材 | 项目源文件 | 原图尺寸 | 图集切片x/y/w/h | 逻辑画布 | 裁边后主体逻辑尺寸 |
| --- | --- | --- | --- | --- | --- |
| 林间入口 | spr_scene_forest_entry_v1.png | 1341×1173 | 0/0/256/224 | 64×56 | 56×33 |
| 便利店终点 | spr_scene_mini_store_v1.png | 1341×1173 | 256/0/256/224 | 64×56 | 56×40 |
| 低对比灌木 | spr_scene_foliage_cluster_v1.png | 1484×1060 | 0/224/192/160 | 48×40 | 40×20.25 |

- 运行文件：`assets/art/gameplay/maps/atlas_battle_scenery.png`，512×512、142327字节（约139KiB），使用既有本地`battle_art` Bundle。
- PNG及meta同步保存，`flipVertical=false`；SpriteFrame使用原PNG左上坐标、显式rect/originalSize/零offset，禁止整图翻转。
- 每边至少16纹理像素安全留白，约4逻辑像素；入口与商店画布中心为路径点(x,y+6)，灌木中心为配置点。地图文字、路径、碰撞及装饰位置筛选不烘焙进图片。
- 机械导出：`G:/gptwork/export-scenery-art.cjs`，只清理游离透明杂点、裁透明边、等比缩放及打包，不重画结构。源图不覆盖。
- 可追溯裁边、源图与图集SHA-256见同目录`runtime_export_manifest.json`。
- 尺寸验收图：`G:/gptwork/scenery-runtime-size-preview.png`，首排逻辑尺寸，次排750宽设计尺寸；源图、512图集与缩小预览均已目视检查。Cocos实屏和抖音真机由主任务继续验收，此处不宣称通过。

## 代码侧检查

- 新增`BattleSceneryView.ts`及meta，严格TypeScript/ES2018检查通过。
- `G:/gptwork/test-scenery-view.cjs`七项回归通过：异步最新快照与幂等加载、节点复用、销毁引用归还、晚到纹理回调、加载失败、图集尺寸异常、销毁后调用。
- 上述回归使用Cocos显示替身，只验证状态和生命周期；不替代实际GPU切片、地图遮挡、触控与真机性能验收。

## 原始工具输出来源

默认目录：`C:/Users/49837/.codex/generated_images/01a0e0d3-5f49-7ad0-b310-c178eddd9c84`。

- `exec-553e99ff-4598-45a0-af47-0a755fce9e24.png` → `spr_scene_forest_entry_v1.png`
- `exec-9460e653-5224-4732-bd0c-530f68e720c6.png` → `spr_scene_mini_store_v1.png`
- `exec-f5407c43-2cec-4fb0-9cdb-3505503c5d91.png` → `spr_scene_foliage_cluster_v1.png`

## 完整最终提示词

以下按实际调用原文记录，图像输入均为上述两张风格参考图。

### spr_scene_forest_entry_v1.png

```text
Use case: stylized-concept
Asset type: one transparent 2D mobile tower-defense map sprite, forest monster entrance.
Input images: Image 1 crate and Image 2 hamster are style references ONLY, not subjects to copy or modify.
Primary request: an original tiny rounded wooden arch/tree-hollow entrance nestled between a few chunky dark forest-green bushes. The arch opening is very dark inside and wide enough to read as a passage where small monsters emerge. A very short earthy threshold, not a long road. It must look like a forest entry, never a shop or house.
Style/medium: extremely simple cute Q-style 2D game cutout, match the references' rounded shapes and clean dark outline, slim warm cream outer edge, big flat color areas with one simple shadow. Front-facing with a little top visible, light 3/4 overhead view. Warm brown wood and deep muted green foliage, light from upper left.
Composition/framing: one compact low wide silhouette, width slightly greater than height, centered, fully visible with transparent margin. Runtime canvas is only 64 by 56 logical pixels; silhouette and dark opening must remain obvious at this small size.
Constraints: genuinely transparent alpha background, no checkerboard pattern, no landscape/background rectangle, no characters, no faces, no text, no numbers, no labels, no logo, no watermarks. No roof, windows, awning, shop features, flower pots, small leaf texture, scattered leaves, sparkles, rocks, or detailed wood grain. Only entrance arch plus supporting rounded bushes. Thin soft ground contact shadow inside the silhouette.
```

### spr_scene_mini_store_v1.png

```text
Use case: stylized-concept
Asset type: one transparent 2D mobile tower-defense map sprite, protected convenience-store goal.
Input images: Image 1 crate and Image 2 hamster are style references ONLY, not subjects to copy or modify.
Primary request: an original tiny friendly convenience store building with a rounded orange-and-cream striped awning, warm yellow lit front window and a clearly visible central entrance door. Compact squat storefront, a shallow simple roof and only a little side wall visible. This is the unmistakable welcoming endpoint to protect, not a monster cave.
Style/medium: extremely simple cute Q-style 2D game cutout, match the references' rounded shapes and clean dark brown outline, slim warm cream outer edge, big flat color areas with one simple shadow. Light 3/4 overhead view, light from upper left. Forest green wall accent, cream wall, orange awning, restrained warm yellow window.
Composition/framing: one compact low wide building, width slightly greater than height, centered and fully visible with generous transparent margin. Runtime canvas is only 64 by 56 logical pixels. Prioritize awning, door and warm window; large simple geometry, minimal details.
Constraints: genuinely transparent alpha background, no checkerboard pattern, no landscape/background rectangle, no characters, no text anywhere including signboards, no numbers, no brand, no logo, no watermark. No signboard, no cash machine, shelves, goods, pavement plaza, flowers, bushes, or props. No realistic lighting glow extending outside the object, no texture or small ornaments. Thin soft contact shadow only.
```

### spr_scene_foliage_cluster_v1.png

```text
Use case: stylized-concept
Asset type: one transparent 2D mobile tower-defense map sprite, noninteractive background foliage cluster.
Input images: Image 1 crate and Image 2 hamster are style references ONLY, not subjects to copy or modify.
Primary request: one small group of three overlapping plump rounded forest bushes, dark muted teal-green and forest-green. Low and wide rounded silhouette. It is background woodland foliage, not a collectible, not a tower, not a potted plant, and not an obstacle players should tap.
Style/medium: extremely simple cute Q-style 2D game cutout, same clean rounded graphic vocabulary as references but quieter: subtle dark-green outline, low-contrast three green color regions, one restrained shadow, no bright cream sticker border on this background decoration. Light 3/4 overhead view, light from upper left.
Composition/framing: single connected compact cluster, width about 1.4 times height, centered fully visible with transparent margin. Runtime canvas is only 48 by 40 logical pixels. Use large smooth cloud-like foliage lobes, at most two short interior separating curves.
Constraints: genuinely transparent alpha background, no checkerboard pattern, no landscape/background rectangle, no ground patch, no trunk, no planter or pot, no rocks, no flowers, berries, small individual leaves, repeated leaf texture, highlights, characters, faces, text, symbols, logo, or watermark. Keep value contrast low so units and roads remain more visually important.
```
