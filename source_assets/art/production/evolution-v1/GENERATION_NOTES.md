# 店员进化美术生成与导出记录

2026-10-02，配套客户端1.2.0。使用内置image_gen工具生成六个透明角色，参照项目原始atlas_staff_idle.png中的豆包、棉棉、布丁身份与画风；未使用外部CLI生成。

| 形态 | 最终源图 | 轮廓区别 |
| --- | --- | --- |
| 豆包重投 | sprout_heavy.png | 单个大投掷器与宽护腕 |
| 豆包连投 | sprout_burst.png | 双投掷器与双侧腰包 |
| 棉棉深冷 | frost_deep.png | 单粗口冷风器与厚领 |
| 棉棉双向冷风 | frost_dual.png | 双风器与分叉围巾 |
| 布丁集中爆破 | bloom_focus.png | 深烤锅 |
| 布丁广域爆破 | bloom_wide.png | 宽烤盘与双把手 |

准确提示词集保存在[prompts.json](prompts.json)，包含六次生成和双向冷风的一次修订：通过同一内置工具移除待机图中的外喷风效。表内文件为最终版本，保留真实透明通道；没有以伪透明棋盘格替代Alpha。

Sharp仅计算Alpha包围盒、裁边、按比例缩放并拼装图集，没有绘制或创造角色内容。图集1024×512，每格256×256，主体最长边不超过234，脚底落在格内y=235。实际主体矩形、源图SHA-256和图集SHA-256见[manifest.json](manifest.json)。

最终运行图集：assets/art/gameplay/towers/atlas_staff_evolution.png；同名.meta随Git提交。六源图和本记录保存在source_assets，构建仅使用运行图集。ArtAtlas、ArtFrame、StaffForm原始XLSX经过导表生成引用，不在代码硬写资源路径。

核验包括源图和图集透明度、切片边界、四视口图鉴以及完整Cocos战斗精灵。图片本身不含UI文字、价格或属性；这些信息来自I18和数值表。采用静态待机形态和现有后坐/镜像表现，未新增骨骼或多帧动画。
