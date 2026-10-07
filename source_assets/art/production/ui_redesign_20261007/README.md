# 用户新版UI源资源

2026-10-07。用户原始十一份设计在references；全部15张选定生成源PNG在本目录，使用内置imagegen生成，无API/CLI替代。inputs.json记录可移植的源文件映射，catalog.json记录37张新增运行资产分类与九宫；当前项目204张运行PNG。

[实际生成指令](prompts.json)从当前任务工具调用逐字提取，18次调用包含店员透明度、怪物透明度和书册纸张三次修订；selected=true对应最终源图，sourceSha256可校验文件。记录保留原始prompt，输入引用只保留文件名，不要求其他电脑存在本机路径。修订前输出不作为运行资源，最终源图都已纳入仓库。

| 源图 | 用途/切分 |
| --- | --- |
| home_background.png | 首页城市便利店背景，无交互按钮/数值 |
| loading_background.png | 首选蓝色加载背景，品牌与动物；进度为独立PNG+Label |
| skin_sheet.png、book_frame.png | 12种通用面板/按钮/横幅与书册；九宫按VisualSkin |
| icon_sheet.png、goods_sheet.png | 12种通用图标、九种商品，4×3/3×3 |
| staff_sheet.png、enemy_sheet.png、boss_sheet.png | 8名店员/6小怪/4首领，4×2/3×2/2×2 |
| evoA.png、evoB.png | 各8名店员的两条进化分支，4×2 |
| perksA.png、perksB.png | 32张挑战独立图标，两个4×4 |
| ground_tile.png、scenery_sheet.png | 庭院地面与8个场景物件，场景4×2 |

风格依据：蓝天城市便利店、薄荷绿庭院、金橙/奶油面板、暖棕描边、圆润动物和商品。PNG透明区保持alpha，业务文案为Label/I18；加载品牌Logo属于用户参考的美术标志。备选loading参考仅归档未启用。

前版Prefab基线在prefab_baseline，供布局作者工具重复生成。tools/art/import-redesign.cjs读取本目录、切片并保留既有UUID，九宫尺寸按VisualSkin；tools/ui/apply-redesign.cjs还原基线后应用布局，随后需重新导表。正常构建不重导美术。

[最终UI和测试记录](../../../../docs/UI_REDESIGN_VERIFICATION.md)。已完成图集分组准备，本轮没有性能对比结论。

## 1.7.1 切图复核

本轮保留15张原始源PNG、原始参考和18条实际生图指令，未重新生成角色。ArtCut原始表中的120项选区取代均等网格切图；PNG、完整选区、源图与输出SHA记录在cut-manifest.json。83项角色/道具/场景图统一256×256画布；37项新版皮肤的实际尺寸、九宫及适配信息同步catalog.json。工具及替换步骤见docs/PNG_RESOURCE_WORKFLOW.md，逐页证据见docs/verification/ui-asset-audit。
