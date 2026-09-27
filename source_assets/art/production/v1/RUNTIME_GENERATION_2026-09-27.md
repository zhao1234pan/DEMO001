# 2026-09-27 首批运行美术生成与导出记录

## 本轮范围与工具

- 使用 Codex 内置图像生成（内置模式，未使用 API/CLI），完成豆包、布丁尾巴修正及四个公共物件；棉棉继续使用已认可的 `v2_simple_q` 源图。
- 用户已经认可简洁 Q 萌方向。本轮仅将方向落实为首批运行资源，不把概念图作为22点棋盘坐标依据。
- 六张新图均保留在本文件所在目录的子目录中；旧版源图保留，不覆盖。
- 图像工具默认生成副本位于 C 盘 `.codex/generated_images/01a0e0d3-5f49-7ad0-b310-c178eddd9c84/`。项目消费的副本均已复制到 G 盘；本轮未擅自删除工具原始输出。
- 辅助导出工具：`G:\gptwork\export-battle-art.cjs`，使用本机已有 Node.js 和 sharp。此工具不提交项目仓库。
- 创意造型修改由图像生成完成；导出工具只执行透明碎点清理、裁边、等比缩放与排图集，不绘制造型。

## 源图与实际显示尺寸

以下尺寸为图片像素；“主体显示”按750宽设计画布计算，包含描边和小范围烘焙阴影。

| 素材 | 源文件 | 源图尺寸 | 一级主体显示 |
| --- | --- | --- | --- |
| 豆包 | `characters/staff_lv1/spr_staff_doubao_idle_v3_runtime.png` | 1374×1145 | 73.5×72 |
| 棉棉 | `characters/staff_lv1/spr_staff_mianmian_idle_v2_simple_q.png` | 1374×1145 | 80×68.5 |
| 布丁 | `characters/staff_lv1/spr_staff_buding_idle_v3_runtime.png` | 1374×1145 | 62.5×72 |
| 底座 | `map_parts/spr_build_pad_v1.png` | 1565×1005 | 76×45.5 |
| 木箱 | `map_parts/spr_obstacle_crate_v1.png` | 1312×1199 | 69×64 |
| 购物篮 | `map_parts/spr_obstacle_basket_v1.png` | 1293×1217 | 66.5×64 |
| 盆栽 | `map_parts/spr_obstacle_plant_v1.png` | 1242×1266 | 55.5×70 |

豆包改为小型仓鼠尾巴，布丁改为短柯基尾巴；保留表情、制服、武器和已认可的贴纸轮廓。导出时去除与主体分离的透明碎点。角色主体与工具保持完整，棉棉因耳朵较宽按80宽约束等比缩小，未拉伸。

## 运行图集与表现接口

- `assets/art/gameplay/towers/atlas_staff_idle.png`：512×512，120225字节，依次豆包、棉棉、布丁。
- `assets/art/gameplay/maps/atlas_battle_props.png`：512×512，131634字节，依次底座、木箱、购物篮、盆栽。
- 两张PNG合计251859字节，约246KiB；高分辨率源图不进入运行包。最终构建压缩大小另以构建产物为准。
- 每个帧为192×192像素，对应96×96设计画布，按2倍像素密度导出。帧位置为 `(8,8)`、`(216,8)`、`(8,216)`、`(216,216)`；两帧间留16像素透明间距。
- 单位画布脚底位于第88设计像素，底部保留8设计像素透明边距，精灵锚点为 `(0.5, 8/96)`；底座以中心锚点绘制。
- 图集保留Alpha，纹理使用线性采样、边缘钳制、无mipmap。代码明确切帧且禁止再动态合图。
- `assets/art.meta` 将该目录设为本地 `battle_art` Bundle。图片与目录均配套稳定 `.meta`。
- `BattleArtView` 只处理加载、精灵节点池、脚底锚点、左右镜像、等级轻微缩放与受击着色；不修改伤害、关卡或存档逻辑。
- 地面底座固定低于单位层。单位按脚底Y排序；调用方的命中特效、血条、等级与UI继续位于精灵上方。
- 升级缩放最高1.2倍，且主体宽度不超过88设计像素，避免宽耳棉棉在相邻约96设计像素网格中相连。
- 加载未完成/失败时 `ready=false`，调用方继续旧程序图形。销毁后迟到的纹理会释放本模块引用，不残留战斗节点。

完整源图SHA-256、机械裁切包围盒、清理数量及帧信息见 [导出清单](./runtime_export_manifest.json)。

## 本轮检查与待验收

- 已查看所有新图和两张运行图集；确认角色尾巴、主体轮廓、透明背景和公共物件结构。
- 已查看 `G:\gptwork\art-runtime-size-preview.png`：750宽画布上的实际设计尺寸，三角色与四物件可区分，轮廓、工具和篮内物品清楚。
- 单模块写入后严格TypeScript检查通过。完整游戏加载、22点密度、8～12店员并排、上下文交互、异形屏及Web/抖音构建由本轮集成记录补充；这里不冒充已完成整局或真机验证。
- 本轮尚未制作敌人正式精灵、攻击关键姿势、升级配饰、正式UI皮肤、入口/便利店模块；敌人继续程序绘制。

## 最终提示词原文

以下保留传给内置工具的完整原文，便于追溯；编辑目标仅为对应旧版角色源图。

### 豆包尾巴修正

编辑输入：`G:\DEMO001\source_assets\art\production\v1\characters\staff_lv1\spr_staff_doubao_idle_v2_simple_q.png`

```text
Use case: precise-object-edit. Asset type: transparent 2D tower-defense character sprite, hamster shop clerk Doubao. Image 1 is the edit target. Change ONLY the large ring-striped tail behind the character into a very small round hamster nub tail, plain warm tan with no rings. Preserve the approved character face, cute compact body, round ears, orange cap and uniform, green coin launcher, 3/4 facing right, dark thick outline and thin cream sticker border, pose, soft colors and overall composition. Clean the isolated speck outside the left edge. Genuinely transparent background with alpha, no floor plane or scene, no text, no projectile. Preserve the existing small soft ground shadow. Single full character, margins on all sides. Do not redesign.
```

### 布丁尾巴修正

编辑输入：`G:\DEMO001\source_assets\art\production\v1\characters\staff_lv1\spr_staff_buding_idle_v2_simple_q.png`

```text
Use case: precise-object-edit. Asset type: transparent 2D tower-defense character sprite, corgi hot-food clerk Buding. Image 1 is the edit target. Change ONLY the large ring-striped tail into a tiny short corgi bobtail, plain orange with a small cream tip and no rings. Preserve the approved face, pointed ears, compact cute body, white chef hat, orange and white uniform, black soup pot and its flame emblem, pose, 3/4 facing right, dark thick outline and thin cream sticker border, soft colors and composition. Clean any detached stray pixels. Genuinely transparent background with alpha, no scene, no text, no projectile or flame outside the pot. Preserve existing small soft ground shadow. Single full character with margins. Do not redesign.
```

### 建造底座

```text
Use case: stylized-concept. Asset type: single transparent 2D tower-defense build pad sprite for a cute forest convenience-store mobile game. A low small circular stone plinth seen from a gentle top-down 3/4 game angle: muted sage-green flat lawn center, a simple pale warm beige stone ring made of 6 broad pieces, dark muted brown-green clean outline, one simple shadow at lower right. Shape broad and low, width to height about 1.6, gently elliptical top. Cute minimal flat vector-like painted sticker game art, large color blocks, 3 main colors, left upper lighting, no tiny texture, no leaves or decoration. No plus sign, no symbols, no text, no characters, no surrounding terrain. Entire isolated object centered with transparent alpha background and generous clear padding. Game runtime width only 76 pixels so keep silhouette very readable and visual contrast subdued.
```

### 木箱

```text
Use case: stylized-concept. Asset type: single transparent 2D tower-defense removable obstacle sprite for a cute forest convenience-store mobile game. One compact closed wooden delivery crate, slight top-down 3/4 angle showing front and right side and narrow top, two large diagonal brace planks on the front. Rounded corners, warm medium tan brown with darker brown thick clean contour, simple flat 3-color blocks and one shadow, tiny soft grounding shadow. Cute minimal sticker-like game art matching compact chibi animal clerks; thin cream outer edge, no wood grain or fine texture, no nails or lettering. Object alone centered, no character, no foliage, no terrain, no stand, no label, no text. Genuinely transparent alpha background, full object visible with padding. Must remain readable when only 64 pixels high.
```

### 购物篮

```text
Use case: stylized-concept. Asset type: single transparent 2D tower-defense removable obstacle sprite for a cute forest convenience-store mobile game. One small warm tan shopping basket with a single broad arched handle, containing exactly two large simplified groceries: one red apple and one green leafy vegetable. Gentle top-down 3/4 view, broad rounded compact silhouette. Dark warm brown thick clean contour and a thin cream outer sticker edge, 4 flat major color blocks, one soft shadow, left upper light. Minimal cute mobile game prop. No fine wicker texture, only 2 broad basket bands, no microdetails, no lettering, no terrain, no stand, no characters. Genuinely transparent alpha background, whole object centered with padding. Must remain clear at 64 pixels high.
```

### 盆栽

```text
Use case: stylized-concept. Asset type: single transparent 2D tower-defense removable obstacle sprite for a cute forest convenience-store mobile game. One small terracotta plant pot with a compact round green shrub consisting of 3 large rounded leaf masses, no individual tiny leaves. Gentle top-down 3/4 view, orange-brown pot, medium forest green and light green foliage, dark brown-green thick clean outline with a thin cream sticker outer border. Simple cute flat game art, 3 main color blocks, a single subtle shadow and soft ground shadow, left upper lighting. No flowers, no face, no text, no labels, no terrain, no stand, no characters. Genuinely transparent alpha background, whole object centered with clear padding. Must remain readable at 64 pixels high.
```


