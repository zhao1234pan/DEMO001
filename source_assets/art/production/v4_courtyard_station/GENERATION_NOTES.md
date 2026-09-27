# 庭院定稿：地铁入口与立体装饰生成记录

- 日期：2026-09-27。用户选定B便利店庭院，要求出怪入口改地铁口，并优化扁平灌木的融合感。
- 范围：新地铁入口、固定矮石花池、圆团小树；沿用商店切片。只替换用户授权的场景图集，不重画角色/UI，不修改关卡和玩法。
- 使用imagegen技能内置image_gen模式，三素材各一次独立生成；小树初稿树冠偏尖长，另做一次“只收圆树冠”的定向编辑。合计四次调用，未用CLI/API回退，没有整屏假实机图。
- 新图和参考图都已用图片查看工具检查。源图保持工具原始输出，复制到本目录，原文件不覆盖。小树第一版作为历史稿保留，运行使用第二版。
- 参考输入1：../v2_scene/spr_scene_mini_store_v1.png；输入2：../v1/characters/staff_lv1/spr_staff_doubao_idle_v3_runtime.png。两者仅参考圆润造型、材质和左上光源，不作为编辑目标，不照搬白贴纸边。
- 新环境无白色贴纸描边、无烘焙文字或真实品牌；地铁顶标只用通用列车图符。固定米灰石花池/石围边和可清除的棕色盆栽有外观区别，是否不可交互由代码保证。

## 图集与占位合同

| 类型 | 运行源文件 | 图集切片x/y/w/h | 完整逻辑画布 | 主体逻辑尺寸 | 主体相对画布中心包围盒 |
| --- | --- | --- | --- | --- | --- |
| 地铁入口 | spr_scene_subway_entry_v1.png | 0/0/256/224 | 64×56 | 54.25×42 | [-27.25,-21,27,21] |
| 便利店终点 | 沿用原图集商店切片 | 256/0/256/224 | 64×56 | 原值不变 | 原值不变 |
| 矮石花池 | spr_scene_courtyard_planter_v1.png | 0/224/192/192 | 48×48 | 40×30 | [-20,-15,20,15] |
| 圆团小树 | spr_scene_courtyard_round_tree_v2.png | 192/224/160/224 | 40×56 | 30×40.25 | [-15,-20.25,15,20] |

- 上述包围盒包括自带接触影，右/下为排他边界；完整画布仍须用于装饰净空筛选，不能以透明区域为由截掉画布或放宽避让。
- 全部切片按4倍逻辑尺寸导出，等比缩放，不拉宽拉高。主体未超56×42、40×34、30×44目标盒；每边至少16纹理像素安全透明留白。
- 入口保留原中心位置path+(0,6)和64×56完整画布。其主体下边为路径点y+27，不把贴图强行上移让门槛压在路径点上；路线到入口由地图层小门槛/前坪接驳，需实际画面检查方向。
- 花池与树均居中锚点、无额外Y偏移。原图自带紧贴底座的小接触影，不额外叠组级大阴影或深色地斑。
- 运行文件：assets/art/gameplay/maps/atlas_battle_scenery.png，512×512、200061字节（约195.4KiB）。这只是PNG体积，不是发布包或纹理内存。
- 图集SHA-256：f2e5621f6fe359d62f30420f3c9528f1fd8ada80f443c1a70a96608eddfdb44c。
- 原meta字节未改：UUID ec0de4b8-94b7-4dd4-8b2c-3a46bb4e4537，flipVertical=false；meta SHA-256为1f2edaff8f00ea16f03420f94fbc74c0b2150830cb7219875a4ee7cb8289d868。

## 商店不变与机械导出

- 替换前基线图集SHA-256：fe2da7628718c661ba509fb56502d4ef9560035b0f41db18eb2ae796af73cd34；临时备份只在G:/gptwork/courtyard-station-v4-baseline。
- 商店[256,0,256,224]不重生成、不缩放、不做Alpha混合，直接逐行复制RGBA。新旧57344像素、229376通道逐字节相同。
- 商店切片原始RGBA SHA-256（前后一致）：2e244e08919f7ebc0dc7cdf84aa4366f38248c3cf6bb82446806670fbd4fc42f。
- 辅助工具：G:/gptwork/export-courtyard-station.cjs。仅清理游离Alpha点、裁透明边、等比缩放和PNG打包，不代替创意改图。
- 原图尺寸、源图SHA、裁边、透明比例、导出包围盒、工具SHA见同目录runtime_export_manifest.json。
- 小树历史v1未运行，原文件1060×1484，SHA-256：9e8dac18097e86667052f24900898144cf6d1868ec25cd1a2a0d405927a5df19。
- 机械尺寸预览：G:/gptwork/courtyard-station-runtime-size-preview.png。列顺序为地铁入口/商店/花池/小树，行顺序为逻辑像素/750设计像素/放大检查。这不是游戏截图，不代替Cocos实屏或手机验收。
- 已逐张检查源图、最终图集及尺寸预览：地铁列车图符与下行楼梯可辨；花池有石材厚度，小树有可见树干、圆团树冠；未发现假透明、白边、错切。完整实屏遮挡、十关位置与GPU方向由主任务继续验证，不在此提前写通过。

## 完整实际提示词与原始输出

### spr_scene_subway_entry_v1.png

原始工具文件：C:/Users/49837/.codex/generated_images/01a0e0d3-5f49-7ad0-b310-c178eddd9c84/exec-045611e0-6dc8-4a6d-bf80-75ff25bfdf3a.png。

```text
Use case: stylized-concept
Asset type: one original production-ready transparent 2D mobile tower-defense environment sprite, not a screenshot.
Input images: Image 1 convenience store and Image 2 hamster are ONLY references for the friendly chunky Q-style game rendering and left-upper lighting. Do not copy the shop or character subject. In particular, do NOT copy their white or cream sticker border.
Style/medium: simple cute Q-style 2D illustration, light 3/4 overhead view with front and some top surfaces visible, round softened corners, large clean matte color planes, one restrained shadow plane, subtle volume. Thin muted dark-green/brown outlines, visibly less bold than the character outline. Soft upper-left light.
Constraints: genuinely transparent alpha background, no checkerboard or fake solid transparency, no white/cream outer sticker edge, no landscape/backdrop rectangle, no characters, faces, labels, words, letters, numbers, watermarks or real-world brands. No realistic textures, leaf grain, speckling, tiny ornaments, or glossy 3D finish. All object edges fully visible with generous transparent margin. Only a small soft ground-contact shadow within the silhouette footprint.
Primary request: a compact friendly street-level subway stair entrance for a cozy convenience-store courtyard. A shallow rectangular stairwell with a clearly visible dark opening and FOUR broad steps descending away from the viewer into the ground. Two low warm beige-gray stone sidewalls and two short simple dark-green handrails. The nearest front threshold stays open, flush to the path; it is NOT a raised stair podium. A compact dark forest-green rounded sign spans the far/rear side, with ONE large white generic front-view train pictogram only, no text. The icon may show a rounded train front, two windows and two tiny wheels but no lettering.
Composition/framing: one low compact object, approximately 4:3 body proportion, centered; the near/front threshold lies on the bottom-center of the silhouette so it can join a game road. At runtime the canvas is only 64 by 56 logical pixels and the whole object must fit about 56 by 42; emphasize dark stairwell, green train sign and open threshold.
Color palette/materials: warm pale beige-gray stone like the reference shop's light wall, forest-green rail and sign, simple muted dark gray stair shadows.
Avoid: cave, tree hollow, archway, house, station building, roof canopy, whole train, railway tracks, ticket machine, real transit logo, arrows, big pavement plaza, trees or bushes. No decorative background.
```

### spr_scene_courtyard_planter_v1.png

原始工具文件：C:/Users/49837/.codex/generated_images/01a0e0d3-5f49-7ad0-b310-c178eddd9c84/exec-2acac254-433c-409a-9056-87abf2bfa8a5.png。

```text
Use case: stylized-concept
Asset type: one original production-ready transparent 2D mobile tower-defense environment sprite, not a screenshot.
Input images: Image 1 convenience store and Image 2 hamster are ONLY references for the friendly chunky Q-style game rendering and left-upper lighting. Do not copy the shop or character subject. In particular, do NOT copy their white or cream sticker border.
Style/medium: simple cute Q-style 2D illustration, light 3/4 overhead view with front and some top surfaces visible, round softened corners, large clean matte color planes, one restrained shadow plane, subtle volume. Thin muted dark-green/brown outlines, visibly less bold than the character outline. Soft upper-left light.
Constraints: genuinely transparent alpha background, no checkerboard or fake solid transparency, no white/cream outer sticker edge, no landscape/backdrop rectangle, no characters, faces, labels, words, letters, numbers, watermarks or real-world brands. No realistic textures, leaf grain, speckling, tiny ornaments, or glossy 3D finish. All object edges fully visible with generous transparent margin. Only a small soft ground-contact shadow within the silhouette footprint.
Primary request: one squat fixed courtyard stone planting bed, with TWO chunky round shrub masses of different heights growing together in it. The bed is wide and permanently built into the courtyard, not a movable flowerpot. A low thick warm beige-gray rounded rectangular stone surround with broad visible top rim and clearly visible front wall gives grounded weight and depth. Shrubs have plump rounded volume, one taller and one shorter; only a few broad light/shadow color planes, no individual tiny leaves.
Composition/framing: single connected compact low-wide object, whole silhouette about 40 units wide by 34 units high, centered. Runtime canvas 48 by 48 logical pixels. Stone bed must remain unmistakable at small size; top and front visible.
Color palette/materials: pale warm beige-gray matte stone, muted medium sage-green shrub crown with soft yellow-green upper-left planes and forest-green lower-right shade. Restrained background contrast.
Avoid: brown or terracotta pot, circular flowerpot, basket, wooden crate, flowers, berries, fence, path, separate detached plant, hanging leaves, signage, hazard markers, or gameplay icons.
```

### spr_scene_courtyard_round_tree_v1.png

原始工具文件：C:/Users/49837/.codex/generated_images/01a0e0d3-5f49-7ad0-b310-c178eddd9c84/exec-424eb39d-4cd4-4215-9d1d-74dbcf2571a3.png。

```text
Use case: stylized-concept
Asset type: one original production-ready transparent 2D mobile tower-defense environment sprite, not a screenshot.
Input images: Image 1 convenience store and Image 2 hamster are ONLY references for the friendly chunky Q-style game rendering and left-upper lighting. Do not copy the shop or character subject. In particular, do NOT copy their white or cream sticker border.
Style/medium: simple cute Q-style 2D illustration, light 3/4 overhead view with front and some top surfaces visible, round softened corners, large clean matte color planes, one restrained shadow plane, subtle volume. Thin muted dark-green/brown outlines, visibly less bold than the character outline. Soft upper-left light.
Constraints: genuinely transparent alpha background, no checkerboard or fake solid transparency, no white/cream outer sticker edge, no landscape/backdrop rectangle, no characters, faces, labels, words, letters, numbers, watermarks or real-world brands. No realistic textures, leaf grain, speckling, tiny ornaments, or glossy 3D finish. All object edges fully visible with generous transparent margin. Only a small soft ground-contact shadow within the silhouette footprint.
Primary request: one compact small courtyard tree with a single round, plump cloud-shaped crown, subtly narrower underneath, one short visible warm brown trunk, and a low circular warm beige-gray stone curb around its small planting opening. The curb is a fixed ground surround with visible thickness, NOT a raised flowerpot. The tree is upright and slightly taller than the companion low planting bed, with clear top/front volume but only broad clean color blocks.
Composition/framing: one connected tall compact silhouette, about 30 units wide by 44 units high, centered in a 40 by 56 logical-pixel runtime canvas. Keep the trunk short but unmistakably visible below the crown, and show the low stone surround around the base.
Color palette/materials: warm pale beige-gray stone matching the courtyard planting bed, muted sage/forest green crown, soft yellow-green upper-left plane, one darker lower-right plane. Warm muted brown short trunk.
Avoid: terracotta/brown planter, tall pot, multiple trees, bush group, tiny leaves, detailed bark, branches beyond crown, fruit, flowers, grass patch, rocks scattered around, path, fence, or decorative symbols.
```

### spr_scene_courtyard_round_tree_v2.png（运行小树，针对性编辑）

编辑输入为本目录spr_scene_courtyard_round_tree_v1.png，编辑前已查看。原始工具文件：C:/Users/49837/.codex/generated_images/01a0e0d3-5f49-7ad0-b310-c178eddd9c84/exec-68917701-bd58-4e4b-a695-b8c02f3db2b1.png。

```text
Use case: precise-object-edit
Asset type: transparent 2D mobile tower-defense environment sprite.
Input image: Image 1 is the edit target, the existing small courtyard tree.
Primary request: change ONLY the foliage crown shape. Make it a single plump ROUND cloud-shaped crown, widest around its upper-middle and gently narrowing underneath toward the trunk. It should read as a cute ball-canopy tree, not a tall pointed conifer or triangular pyramid. Use only a few large rounded contour lobes and the same broad flat color planes.
Invariants: preserve the existing short visible brown trunk, low pale beige-gray circular stone curb, soft small lower-right contact shadow, light 3/4 camera, upper-left light, green palette, thin muted dark outline and matte simple game style. Do not add or alter the base, do not add leaves or ornaments. Keep genuine transparent alpha and full silhouette with margin. No white/cream sticker border, no text, no symbols, no background.
Composition: compact tree, crown roughly round in outline above the clearly visible trunk, entire sprite stays taller than wide and readable inside 40 by 56 logical pixels.
```
